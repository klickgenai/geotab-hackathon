import { randomUUID } from "crypto";
import { fillerCache } from "./filler-cache.js";
import { PulseSTTPipeline, type STTCallbacks } from "./stt-pipeline.js";
import { TTSSentencePipeline } from "./tts-pipeline.js";
import { TTSWebSocket, type TTSStreamCallbacks } from "./tts-synthesize.js";
import { extractActionItem, extractTextActions, type ActionItem } from "./action-extractor.js";
import { streamAgentResponseWithHistory } from "../agents/fleetshield-agent.js";
import { createDispatchBridge, removeDispatchBridge, type DispatchEvent } from "./dispatch-bridge.js";

export type SessionState = "idle" | "listening" | "thinking" | "speaking" | "dispatching" | "dispatch_reporting";

export interface DriverVoiceContext {
  firstName: string;
  name: string;
  safetyScore: number;
  streakDays: number;
  weeklyRank: number;
  totalDrivers: number;
  vehicleName: string;
  currentLoad: {
    id: string;
    status: string;
    origin: string;
    destination: string;
    commodity: string;
  } | null;
  riskProfile: string;
  burnoutRisk: string;
  riskScore: number;
  burnoutProbability: number;
  todayEvents: number;
  avgDailyHours: number;
  avgRestHours: number;
  totalDrivingHours: number;
  daysWorked: number;
}

interface TranscriptEntry {
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

interface VoiceSessionCallbacks {
  onStateChange: (state: SessionState) => void;
  onTranscript: (role: "user" | "assistant", text: string) => void;
  onFillerAudio: (audioBuffer: Buffer, text: string) => void;
  onAudioChunk: (audioBuffer: Buffer, sentenceText: string) => void;
  onToolResult?: (toolName: string, result: unknown) => void;
  onActionItem: (item: ActionItem) => void;
  onSessionEnded: (summary: SessionSummary) => void;
  onError: (error: Error) => void;
  onMicStatus?: (status: "suppressed" | "ready") => void;
  onDispatchProgress?: (event: DispatchEvent) => void;
  onDispatchCallRequested?: () => void;
}

export interface SessionSummary {
  sessionId: string;
  transcript: TranscriptEntry[];
  actionItems: ActionItem[];
  startedAt: number;
  endedAt: number;
}

export interface PreFetchedContext {
  fleetOverview?: Record<string, unknown>;
  driverData?: Array<Record<string, unknown>>;
}

export class VoiceSession {
  readonly sessionId: string;
  private state: SessionState = "idle";
  private conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [];
  private transcript: TranscriptEntry[] = [];
  private actionItems: ActionItem[] = [];
  private callbacks: VoiceSessionCallbacks;
  private sttPipeline: PulseSTTPipeline | null = null;
  private ttsPipeline: TTSSentencePipeline | null = null;
  private ttsWebSocket: TTSWebSocket | null = null;
  private abortController: AbortController | null = null;
  private startedAt: number;
  private preFetchedContext: PreFetchedContext = {};
  private driverContext: DriverVoiceContext | undefined;
  private audioBuffer: Buffer[] = [];         // Buffer audio while STT connects
  private sttConnecting = false;              // True while awaiting STT connection
  private consecutiveEmptySpeech = 0;         // Tracks consecutive speech attempts with no transcript
  private micSuppressedNotified = false;      // True after we've notified client of mic suppression
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private silenceNudgeCount = 0;
  private thinkingTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(callbacks: VoiceSessionCallbacks, driverContext?: DriverVoiceContext) {
    this.sessionId = randomUUID();
    this.callbacks = callbacks;
    this.driverContext = driverContext;
    this.startedAt = Date.now();

    // Create dispatch bridge for this session and wire progress events
    const bridge = createDispatchBridge(this.sessionId);
    bridge.on('dispatch_progress', (event: DispatchEvent) => {
      // Update session state based on dispatch phase
      if (event.type === 'dispatch_status') {
        if (event.phase === 'connecting' || event.phase === 'on_call' || event.phase === 'wrapping_up') {
          this.setState('dispatching');
        } else if (event.phase === 'complete') {
          this.setState('dispatch_reporting');
        } else if (event.phase === 'error' || event.phase === 'cancelled') {
          // Will transition to listening after tool result is processed
        }
      }
      // Forward to WebSocket
      this.callbacks.onDispatchProgress?.(event);
    });
  }

  /** Initialize and set to listening state */
  async startListening(): Promise<void> {
    if (!process.env.SMALLEST_API_KEY) throw new Error("SMALLEST_API_KEY required for voice");
    const apiKey = process.env.SMALLEST_API_KEY;

    // Eagerly create + connect the shared TTS WebSocket for this session
    if (!this.ttsWebSocket) {
      const ttsCallbacks: TTSStreamCallbacks = {
        onAudioChunk: () => {},
        onRequestComplete: () => {},
        onError: () => { /* silently handled */ },
      };
      this.ttsWebSocket = new TTSWebSocket(apiKey, ttsCallbacks, {
        voiceId: "sophia",
        sampleRate: 24000,
        speed: 1.0,
      });
      this.ttsWebSocket.connect().catch(() => {
        // silently handled — will retry on first use
      });
    }

    // Pre-warm the first STT connection so it's ready when user speaks
    this.preWarmSTT();

    this.setState("listening");
    this.startSilenceTimer();
  }

  /**
   * Pre-warm a fresh Pulse STT connection in the background.
   * Called after each utterance completes so the next one is ready instantly.
   */
  private preWarmSTT(): void {
    const apiKey = process.env.SMALLEST_API_KEY;
    if (!apiKey) return;

    // Don't pre-warm if we already have a connected pipeline
    if (this.sttPipeline?.isConnected()) return;

    // Clean up any dead pipeline
    if (this.sttPipeline) {
      this.sttPipeline.disconnect();
      this.sttPipeline = null;
    }

    const sttCallbacks: STTCallbacks = {
      onInterim: (text) => {
        this.callbacks.onTranscript("user", text);
      },
      onFinal: () => {},
      onError: (err) => {
        this.callbacks.onError(err);
      },
    };

    this.sttPipeline = new PulseSTTPipeline(apiKey, sttCallbacks);
    this.sttPipeline.connect().then(() => {
      // silently handled — STT pre-warmed and ready
    }).catch(() => {
      // Will retry on next speech_start
      this.sttPipeline = null;
    });
  }

  /** Called when client detects speech started */
  async onSpeechStart(): Promise<void> {
    this.audioFrameCount = 0;
    this.audioBuffer = [];
    this.sttConnecting = false;

    // Reset silence tracking
    this.clearSilenceTimer();
    this.silenceNudgeCount = 0;

    const apiKey = process.env.SMALLEST_API_KEY!;

    // If pre-warmed pipeline is ready, use it directly
    if (this.sttPipeline?.isConnected()) {
      this.sttPipeline.resetUtterance();
      return;
    }

    // No pre-warmed connection — need to connect now (buffer audio while waiting)
    this.sttConnecting = true;

    // Clean up any dead pipeline
    if (this.sttPipeline) {
      this.sttPipeline.disconnect();
    }

    const sttCallbacks: STTCallbacks = {
      onInterim: (text) => this.callbacks.onTranscript("user", text),
      onFinal: () => {},
      onError: (err) => this.callbacks.onError(err),
    };

    this.sttPipeline = new PulseSTTPipeline(apiKey, sttCallbacks);
    try {
      await this.sttPipeline.connect();
      this.sttPipeline.resetUtterance();
      this.sttConnecting = false;

      // Flush buffered audio
      if (this.audioBuffer.length > 0) {
        for (const buf of this.audioBuffer) {
          this.sttPipeline.sendAudio(buf);
        }
        this.audioBuffer = [];
      }
    } catch (err) {
      this.sttConnecting = false;
      this.audioBuffer = [];
      this.sttPipeline = null;
      this.callbacks.onError(err as Error);
    }
  }

  /** Feed raw PCM audio from the browser mic (only during speech) */
  private audioFrameCount = 0;
  feedAudio(pcmBuffer: Buffer): void {
    this.audioFrameCount++;
    // Buffer audio while STT is connecting
    if (this.sttConnecting) {
      this.audioBuffer.push(Buffer.from(pcmBuffer));
      return;
    }
    if (this.sttPipeline) {
      this.sttPipeline.sendAudio(pcmBuffer);
    }
  }

  /** Called when client detects speech ended */
  async onSpeechEnd(): Promise<void> {
    if (!this.sttPipeline) return;

    // Short burst with no Pulse response = false trigger (echo artifact).
    // Try to preserve the connection instead of the expensive disconnect/reconnect cycle.
    if (!this.sttPipeline.hadResponse() && this.sttPipeline.isConnected() && this.audioFrameCount <= 5) {
      const preserved = this.sttPipeline.cancelUtterance();
      if (preserved) {
        return; // Pipeline stays alive, no pre-warm needed
      }
    }

    const gainAtEnd = this.sttPipeline.getGain();
    const text = await this.sttPipeline.endUtterance();
    // endUtterance() disconnects the pipeline — it's now dead
    this.sttPipeline = null;

    // Pre-warm the NEXT STT connection immediately (during thinking + TTS time)
    this.preWarmSTT();

    if (text) {
      // Reset suppression tracking on successful transcript
      if (this.micSuppressedNotified) {
        this.callbacks.onMicStatus?.("ready");
        this.micSuppressedNotified = false;
      }
      this.consecutiveEmptySpeech = 0;
      this.callbacks.onTranscript("user", text);
      await this.handleUserMessage(text);
    } else {
      this.consecutiveEmptySpeech++;
      if (this.consecutiveEmptySpeech >= 2 && !this.micSuppressedNotified) {
        this.callbacks.onMicStatus?.("suppressed");
        this.micSuppressedNotified = true;
      }
      // Restart silence timer
      this.startSilenceTimer();
    }
  }

  /**
   * Check if the user message is a short social/conversational phrase
   * (e.g. "thank you", "okay", "goodbye") that doesn't need a data filler.
   */
  private isShortSocialPhrase(text: string): boolean {
    const normalized = text.toLowerCase().trim().replace(/[.!?,]+$/g, '');
    const socialPhrases = [
      'thank you', 'thanks', 'thank', 'thx',
      'okay', 'ok', 'alright', 'got it', 'cool', 'nice',
      'goodbye', 'bye', 'see you', 'later', 'good night',
      'yes', 'no', 'yeah', 'yep', 'nope', 'sure',
      'hi', 'hello', 'hey', 'good morning', 'good afternoon',
      'that makes sense', 'understood', 'perfect', 'great', 'awesome',
      'sounds good', 'no problem', 'never mind', 'forget it',
    ];
    return socialPhrases.some((p) => normalized === p || normalized.startsWith(p + ' '));
  }

  /** Handle a complete user utterance */
  async handleUserMessage(text: string): Promise<void> {
    this.conversationHistory.push({ role: "user", content: text });
    this.transcript.push({ role: "user", text, timestamp: Date.now() });

    this.setState("thinking");

    // Abort any previous response
    if (this.abortController) {
      this.abortController.abort();
    }
    const localAbort = new AbortController();
    this.abortController = localAbort;

    // Set thinking timeout guard — auto-recover if stuck
    // Use longer timeout (45s) to accommodate dispatch calls which involve multiple AI turns
    this.clearThinkingTimeout();
    this.thinkingTimeout = setTimeout(() => {
      if (this.state === "thinking" || this.state === "dispatching") {
        this.transitionToListeningWithPause();
      }
    }, 45000);

    const apiKey = process.env.SMALLEST_API_KEY;
    if (!apiKey) {
      this.callbacks.onError(new Error("SMALLEST_API_KEY required"));
      return;
    }

    const messages = this.buildMessages();
    const isSocial = this.isShortSocialPhrase(text);

    try {
      const streamResult = await streamAgentResponseWithHistory(messages);

      let fillerSent = false;
      let fullResponseText = "";

      // Voice tag parser state: buffer text to extract <voice>...</voice>
      let voiceBuffer = "";
      let voiceExtracted = false;  // True once <voice> content has been sent to TTS
      let streamingDetailDirectly = false; // True once past voice tag, streaming detail text
      let noVoiceTagFallback = false; // True when no <voice> tag found — keep feeding ALL text to TTS

      // Set up continuation filler timer for long processing
      let continuationTimer: ReturnType<typeof setTimeout> | null = null;
      let patienceTimer: ReturnType<typeof setTimeout> | null = null;

      const sendContinuationFiller = () => {
        if (localAbort.signal.aborted || this.state === "speaking") return;
        const filler = fillerCache.getSmartFiller(undefined, "continuation");
        if (filler?.audio) {
          this.callbacks.onFillerAudio(filler.audio, filler.text);
        }
      };

      const sendPatienceFiller = () => {
        if (localAbort.signal.aborted || this.state === "speaking") return;
        const filler = fillerCache.getSmartFiller(undefined, "patience");
        if (filler?.audio) {
          this.callbacks.onFillerAudio(filler.audio, filler.text);
        }
      };

      this.ttsPipeline = new TTSSentencePipeline(
        apiKey,
        {
          onAudioChunk: (audioBuffer, sentenceText) => {
            // Clear continuation timers once we start speaking
            if (continuationTimer) { clearTimeout(continuationTimer); continuationTimer = null; }
            if (patienceTimer) { clearTimeout(patienceTimer); patienceTimer = null; }

            if (this.state !== "speaking") this.setState("speaking");
            this.callbacks.onAudioChunk(audioBuffer, sentenceText);
          },
          onDone: () => {
            this.clearThinkingTimeout();
            // Variable post-speech pause (200-500ms) before transitioning to listening
            this.transitionToListeningWithPause();
          },
          onError: (err) => {
            this.callbacks.onError(err);
          },
        },
        "sophia",
        this.ttsWebSocket ?? undefined
      );

      for await (const chunk of streamResult.fullStream) {
        if (localAbort.signal.aborted) break;

        if (chunk.type === "text-delta") {
          const textDelta: string = chunk.textDelta ?? "";
          // Only send fillers for substantive queries, not social phrases
          if (!fillerSent && !isSocial) {
            fillerSent = true;
            const filler = fillerCache.getSmartFiller(undefined, "initial");
            if (filler?.audio) {
              this.callbacks.onFillerAudio(filler.audio, filler.text);
            }
            continuationTimer = setTimeout(sendContinuationFiller, 3000);
            patienceTimer = setTimeout(sendPatienceFiller, 6000);
          }

          fullResponseText += textDelta;

          // Parse <voice> tags: only send voice content to TTS
          if (streamingDetailDirectly) {
            // In fallback mode (no voice tags), keep feeding ALL text to TTS
            if (noVoiceTagFallback && this.ttsPipeline) {
              this.ttsPipeline.feedText(textDelta);
            }
            // Otherwise: past the voice tag — don't feed detail text to TTS
          } else {
            voiceBuffer += textDelta;

            // Check if voice closing tag is present
            const closeIdx = voiceBuffer.indexOf("</voice>");
            if (closeIdx !== -1) {
              const openIdx = voiceBuffer.indexOf("<voice>");
              if (openIdx !== -1) {
                const voiceContent = voiceBuffer.slice(openIdx + 7, closeIdx).trim();
                if (voiceContent) {
                  // Feed ONLY the voice summary to TTS
                  this.ttsPipeline.feedText(voiceContent);
                  voiceExtracted = true;
                }
              }
              voiceBuffer = "";
              streamingDetailDirectly = true;
            } else if (voiceBuffer.length > 500 || (!voiceBuffer.includes("<") && voiceBuffer.length > 80)) {
              // No voice tag coming — feed everything to TTS as fallback
              this.ttsPipeline.feedText(voiceBuffer);
              voiceBuffer = "";
              streamingDetailDirectly = true;
              noVoiceTagFallback = true; // Keep feeding all remaining text to TTS
            }
          }
        }

        if (chunk.type === "tool-call") {
          const toolName: string = (chunk as any).toolName ?? "";
          if (!fillerSent) {
            fillerSent = true;
            const filler = fillerCache.getSmartFiller(toolName, "initial");
            if (filler?.audio) {
              this.callbacks.onFillerAudio(filler.audio, filler.text);
            }
            continuationTimer = setTimeout(sendContinuationFiller, 3000);
            patienceTimer = setTimeout(sendPatienceFiller, 6000);
          }

          // Dispatch call handling: Tasha contacts Mike autonomously via AI delegation
          if (toolName === "initiateDispatcherCall") {
            const args = (chunk as any).args;
            if (args && typeof args === "object") {
              // Inject sessionId so dispatch progress streams to the driver's UI
              args.sessionId = this.sessionId;
            }
          }
        }

        if (chunk.type === "tool-result") {
          const toolResult = chunk as any;
          // Forward tool result to frontend for visual rendering
          this.callbacks.onToolResult?.(toolResult.toolName ?? "", toolResult.result);

          const actionItem = extractActionItem({
            toolName: toolResult.toolName ?? "",
            args: (toolResult.args ?? {}) as Record<string, unknown>,
            result: toolResult.result,
          });
          if (actionItem) {
            this.actionItems.push(actionItem);
            this.callbacks.onActionItem(actionItem);
          }
        }
      }

      // Flush any remaining voice buffer
      if (voiceBuffer && !voiceExtracted) {
        // Never got a voice tag — speak whatever we have
        const clean = voiceBuffer.replace(/<\/?voice>/g, "");
        if (clean.trim()) {
          this.ttsPipeline.feedText(clean);
        }
      }

      // Clean up timers
      if (continuationTimer) clearTimeout(continuationTimer);
      if (patienceTimer) clearTimeout(patienceTimer);

      if (this.ttsPipeline && !localAbort.signal.aborted) {
        this.ttsPipeline.finish();
      }

      if (fullResponseText) {
        // Strip voice tags from display text — show only the detailed visual content
        const displayText = fullResponseText
          .replace(/<voice>[\s\S]*?<\/voice>/g, "")
          .replace(/<\/?voice>/g, "")
          .trimStart();

        this.conversationHistory.push({ role: "assistant", content: fullResponseText });
        this.transcript.push({ role: "assistant", text: fullResponseText, timestamp: Date.now() });
        // Send the clean display text (without voice tags) to the frontend
        this.callbacks.onTranscript("assistant", displayText || fullResponseText);

        const textActions = extractTextActions(fullResponseText);
        for (const action of textActions) {
          this.actionItems.push(action);
          this.callbacks.onActionItem(action);
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") {
        // silently handled — response aborted via interrupt
      } else {
        this.callbacks.onError(err as Error);
      }
      this.clearThinkingTimeout();
      this.transitionToListeningWithPause();
    }
  }

  /**
   * Transition to listening with a natural pause.
   * Randomized 200-500ms delay mimics natural breathing gap between turns.
   */
  private transitionToListeningWithPause(): void {
    const pause = 200 + Math.random() * 300;
    setTimeout(() => {
      if (this.state !== "idle") {
        this.setState("listening");
        // Pre-warm STT after the pause
        this.preWarmSTT();
        // Start silence monitoring
        this.startSilenceTimer();
      }
    }, pause);
  }

  /**
   * Start silence timer — sends gentle nudges if user is quiet.
   */
  private startSilenceTimer(): void {
    this.clearSilenceTimer();

    // First nudge after 20s of silence
    this.silenceTimer = setTimeout(() => {
      if (this.state !== "listening") return;
      this.silenceNudgeCount++;

      const nudgeText = this.silenceNudgeCount <= 1
        ? "I'm still here if you need anything."
        : "Just let me know when you're ready.";

      // Send as a spoken nudge via TTS
      const apiKey = process.env.SMALLEST_API_KEY;
      if (apiKey) {
        this.sendNudgeAudio(apiKey, nudgeText);
      }

      // Second nudge after another 25s
      if (this.silenceNudgeCount < 2) {
        this.silenceTimer = setTimeout(() => {
          if (this.state !== "listening") return;
          this.silenceNudgeCount++;
          const secondNudge = "Just let me know when you're ready.";
          if (apiKey) {
            this.sendNudgeAudio(apiKey, secondNudge);
          }
        }, 25000);
      }
    }, 20000);
  }

  private async sendNudgeAudio(apiKey: string, text: string): Promise<void> {
    try {
      const { synthesizeSpeech } = await import("./tts-synthesize.js");
      const buffer = await synthesizeSpeech(apiKey, {
        text,
        voiceId: "sophia",
        sampleRate: 24000,
        speed: 1.0,
        addWavHeader: true,
      });
      this.callbacks.onAudioChunk(buffer, text);
    } catch {
      // silently handled
    }
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private clearThinkingTimeout(): void {
    if (this.thinkingTimeout) {
      clearTimeout(this.thinkingTimeout);
      this.thinkingTimeout = null;
    }
  }

  /** Interrupt current response — user started speaking again */
  interrupt(): void {
    // During dispatch, don't interrupt — the AI-to-AI call is running
    if (this.state === "dispatching") {
      return;
    }

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    if (this.ttsPipeline) {
      this.ttsPipeline.abort();
      this.ttsPipeline = null;
    }

    this.clearThinkingTimeout();
    this.setState("listening");
  }

  /** End the session and return summary */
  end(): SessionSummary {
    this.clearSilenceTimer();
    this.clearThinkingTimeout();

    // Clean up dispatch bridge
    removeDispatchBridge(this.sessionId);

    if (this.sttPipeline) {
      this.sttPipeline.flush();
      this.sttPipeline.disconnect();
      this.sttPipeline = null;
    }

    if (this.abortController) {
      this.abortController.abort();
    }

    if (this.ttsPipeline) {
      this.ttsPipeline.abort();
      this.ttsPipeline = null;
    }

    if (this.ttsWebSocket) {
      this.ttsWebSocket.disconnect();
      this.ttsWebSocket = null;
    }

    this.setState("idle");

    const summary: SessionSummary = {
      sessionId: this.sessionId,
      transcript: this.transcript,
      actionItems: this.actionItems,
      startedAt: this.startedAt,
      endedAt: Date.now(),
    };

    this.callbacks.onSessionEnded(summary);
    return summary;
  }

  getState(): SessionState {
    return this.state;
  }

  getActionItems(): ActionItem[] {
    return this.actionItems;
  }

  private setState(state: SessionState): void {
    if (this.state !== state) {
      this.state = state;
      this.callbacks.onStateChange(state);
    }
  }

  private buildMessages(): Array<{ role: "user" | "assistant" | "system"; content: string }> {
    const messages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [];

    // Inject personalized driver context as system message
    if (this.driverContext) {
      const dc = this.driverContext;
      const isHighRisk = dc.riskProfile === 'high' || dc.riskProfile === 'critical';
      const isBurnout = dc.burnoutRisk === 'high';
      const isTopPerformer = dc.weeklyRank <= 5 && dc.safetyScore >= 85;

      let tone = '';
      if (isHighRisk || isBurnout) {
        tone = 'Be empathetic and supportive. Acknowledge challenges without being preachy. Focus on small, actionable steps.';
      } else if (isTopPerformer) {
        tone = 'Be encouraging and celebratory. Recognize their achievements. Motivate them to keep up the great work.';
      } else {
        tone = 'Be friendly and conversational. Give practical advice. Be encouraging about their progress.';
      }

      const loadInfo = dc.currentLoad
        ? `Current load: ${dc.currentLoad.id} (${dc.currentLoad.status.replace(/_/g, ' ')}) — ${dc.currentLoad.commodity} from ${dc.currentLoad.origin} to ${dc.currentLoad.destination}.`
        : 'No active load assigned right now.';

      messages.push({
        role: "system",
        content: `You are Tasha, a friendly AI co-driver for FleetShield AI. You are speaking with ${dc.firstName} (full name: ${dc.name}), driving ${dc.vehicleName}.

Driver profile:
- Safety score: ${dc.safetyScore}/100
- Safe driving streak: ${dc.streakDays} days without a high/critical event
- Weekly rank: #${dc.weeklyRank} out of ${dc.totalDrivers} drivers
- Risk profile: ${dc.riskProfile}, Burnout risk: ${dc.burnoutRisk}
- Today's events: ${dc.todayEvents}
- Average daily hours: ${dc.avgDailyHours}h, Average rest: ${dc.avgRestHours}h
- Days worked (last 30): ${dc.daysWorked}, Total driving hours: ${dc.totalDrivingHours}h
${loadInfo}

${tone}

DISPATCH DELEGATION:
You handle ALL dispatch communication on the driver's behalf. The driver NEVER talks to dispatch directly — you do. When the driver needs dispatch help (load questions, delivery extensions, ETA changes, mechanical issues, schedule changes, route questions), use the initiateDispatcherCall tool. Be PROACTIVE: if the driver mentions a problem that clearly needs dispatch involvement, contact Mike without being asked. Before calling, say something brief like "Let me check with Mike at dispatch for you." After the call completes, summarize the outcome naturally — for example: "Good news — I checked with Mike and he confirmed your delivery extension to 6 PM. The receiver has been notified." Never say "I simulated" or "I generated a call" — you genuinely contacted dispatch. If the driver asks "what did dispatch say?", reference the conversation details from the tool result.

IMPORTANT: You are speaking out loud via voice. Do NOT use markdown formatting — no headers, bold, bullets, numbered lists, or code blocks. Speak naturally in conversational sentences. Keep responses concise (2-4 sentences unless asked for detail). Address the driver by their first name.`,
      });
    }

    // For operator voice mode (no driver context), add voice-specific system prompt
    if (!this.driverContext) {
      messages.push({
        role: "system",
        content: `You are Tasha, the FleetShield AI voice assistant for fleet operators.

VOICE + VISUAL RESPONSE FORMAT:
You have TWO output channels: voice (spoken aloud) and visual (shown on screen).

1. Start EVERY response with a <voice> tag containing a 3-4 sentence spoken summary. This is read aloud via TTS. Keep it natural, conversational, no markdown. End with </voice>.
2. After the </voice> tag, write a DETAILED visual response with full markdown formatting — headers, bold, tables, bullet points, numbers, analysis. This is displayed on screen as a rich card. Be thorough here.
3. For social phrases (thanks, hello, bye), just use <voice>Your friendly reply</voice> with no detailed section after.

Example for a data query:
<voice>Here are your top three riskiest drivers. Marcus has the highest risk score at 82.</voice>

## Top 3 Highest Risk Drivers

| Rank | Driver | Risk Score | Key Issues |
| ... detailed table ... |

### Recommendations
- ... detailed bullets ...

IMPORTANT: Always include the <voice> tag first. The visual section should have ALL the detail the user needs — scores, names, tables, recommendations. Do NOT put markdown inside <voice> tags.`,
      });
    }

    // Inject pre-fetched fleet context if available and no driver context
    if (!this.driverContext && this.preFetchedContext.fleetOverview) {
      const overview = this.preFetchedContext.fleetOverview;
      const contextParts: string[] = [];

      if (overview.totalDrivers || overview.total_drivers) {
        contextParts.push(`Fleet has ${overview.totalDrivers ?? overview.total_drivers} drivers`);
      }
      if (overview.averageScore ?? overview.average_score) {
        contextParts.push(`Average fleet score: ${overview.averageScore ?? overview.average_score}`);
      }

      if (contextParts.length > 0) {
        messages.push({
          role: "system",
          content: `Current fleet context (pre-fetched, no need to call tools for this): ${contextParts.join(". ")}`,
        });
      }
    }

    messages.push(...this.conversationHistory);

    return messages;
  }
}
