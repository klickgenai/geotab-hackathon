import { randomUUID } from "crypto";
import { fillerCache } from "./filler-cache.js";
import { PulseSTTPipeline, type STTCallbacks } from "./stt-pipeline.js";
import { TTSSentencePipeline } from "./tts-pipeline.js";
import { TTSWebSocket, type TTSStreamCallbacks } from "./tts-synthesize.js";
import { extractActionItem, extractTextActions, type ActionItem } from "./action-extractor.js";
import { streamAgentResponseWithHistory } from "../agents/fleetshield-agent.js";

export type SessionState = "idle" | "listening" | "thinking" | "speaking";

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
  onActionItem: (item: ActionItem) => void;
  onSessionEnded: (summary: SessionSummary) => void;
  onError: (error: Error) => void;
  onMicStatus?: (status: "suppressed" | "ready") => void;
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

  constructor(callbacks: VoiceSessionCallbacks, driverContext?: DriverVoiceContext) {
    this.sessionId = randomUUID();
    this.callbacks = callbacks;
    this.driverContext = driverContext;
    this.startedAt = Date.now();
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
        onError: (err) => console.error("[TTS-WS] Session error:", err.message),
      };
      this.ttsWebSocket = new TTSWebSocket(apiKey, ttsCallbacks, {
        voiceId: "sophia",
        sampleRate: 24000,
        speed: 1.0,
      });
      this.ttsWebSocket.connect().catch((err) => {
        console.error("[TTS-WS] Eager connect failed (will retry on first use):", err.message);
      });
    }

    // Pre-warm the first STT connection so it's ready when user speaks
    this.preWarmSTT();

    this.setState("listening");
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
        console.error(`[VoiceSession ${this.sessionId}] STT error:`, err.message);
        this.callbacks.onError(err);
      },
    };

    this.sttPipeline = new PulseSTTPipeline(apiKey, sttCallbacks);
    this.sttPipeline.connect().then(() => {
      console.log(`[VoiceSession ${this.sessionId}] STT pre-warmed and ready`);
    }).catch((err) => {
      console.error(`[VoiceSession ${this.sessionId}] STT pre-warm failed:`, err.message);
      // Will retry on next speech_start
      this.sttPipeline = null;
    });
  }

  /** Called when client detects speech started */
  async onSpeechStart(): Promise<void> {
    this.audioFrameCount = 0;
    this.audioBuffer = [];
    this.sttConnecting = false;

    const apiKey = process.env.SMALLEST_API_KEY!;

    // If pre-warmed pipeline is ready, use it directly
    if (this.sttPipeline?.isConnected()) {
      this.sttPipeline.resetUtterance();
      console.log(`[VoiceSession ${this.sessionId}] Speech started — using pre-warmed STT`);
      return;
    }

    // No pre-warmed connection — need to connect now (buffer audio while waiting)
    console.log(`[VoiceSession ${this.sessionId}] Speech started — STT not pre-warmed, connecting now...`);
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
        console.log(`[VoiceSession ${this.sessionId}] Flushing ${this.audioBuffer.length} buffered audio frames`);
        for (const buf of this.audioBuffer) {
          this.sttPipeline.sendAudio(buf);
        }
        this.audioBuffer = [];
      }
    } catch (err) {
      console.error(`[VoiceSession ${this.sessionId}] STT connect failed during speech:`, (err as Error).message);
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
    if (this.audioFrameCount % 10 === 1) {
      console.log(`[VoiceSession ${this.sessionId}] Audio frame #${this.audioFrameCount}, size=${pcmBuffer.length}bytes, connecting=${this.sttConnecting}, hasPipeline=${!!this.sttPipeline}`);
    }
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
        console.log(`[VoiceSession ${this.sessionId}] False trigger (${this.audioFrameCount} frames, no STT response) — connection preserved`);
        return; // Pipeline stays alive, no pre-warm needed
      }
    }

    console.log(`[VoiceSession ${this.sessionId}] Speech ended — collecting transcript (${this.audioFrameCount} total frames sent)`);
    const gainAtEnd = this.sttPipeline.getGain();
    const text = await this.sttPipeline.endUtterance();
    // endUtterance() disconnects the pipeline — it's now dead
    this.sttPipeline = null;

    // Pre-warm the NEXT STT connection immediately (during thinking + TTS time)
    this.preWarmSTT();

    if (text) {
      console.log(`[VoiceSession ${this.sessionId}] Transcript: "${text}"`);
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
      console.log(`[VoiceSession ${this.sessionId}] No speech detected (consecutive: ${this.consecutiveEmptySpeech}, gain: ${gainAtEnd.toFixed(1)}x)`);
      if (this.consecutiveEmptySpeech >= 2 && !this.micSuppressedNotified) {
        console.log(`[VoiceSession ${this.sessionId}] Mic suppression detected — notifying client`);
        this.callbacks.onMicStatus?.("suppressed");
        this.micSuppressedNotified = true;
      }
    }
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

    const apiKey = process.env.SMALLEST_API_KEY;
    if (!apiKey) {
      this.callbacks.onError(new Error("SMALLEST_API_KEY required"));
      return;
    }

    const messages = this.buildMessages();

    try {
      console.log(`[VoiceSession ${this.sessionId}] Starting Claude stream with ${messages.length} messages`);
      const streamResult = await streamAgentResponseWithHistory(messages);
      console.log(`[VoiceSession ${this.sessionId}] Claude stream created, processing chunks...`);

      let fillerSent = false;
      let fullResponseText = "";

      this.ttsPipeline = new TTSSentencePipeline(
        apiKey,
        {
          onAudioChunk: (audioBuffer, sentenceText) => {
            if (this.state !== "speaking") this.setState("speaking");
            this.callbacks.onAudioChunk(audioBuffer, sentenceText);
          },
          onDone: () => {
            this.setState("listening");
            // Pre-warm STT when TTS finishes (in case the earlier pre-warm expired)
            this.preWarmSTT();
          },
          onError: (err) => {
            console.error("[TTS] Error:", err.message);
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
          if (!fillerSent) {
            fillerSent = true;
            const filler = fillerCache.getSmartFiller();
            if (filler?.audio) {
              this.callbacks.onFillerAudio(filler.audio, filler.text);
            }
          }
          fullResponseText += textDelta;
          this.ttsPipeline.feedText(textDelta);
        }

        if (chunk.type === "tool-call") {
          const toolName: string = (chunk as any).toolName ?? "";
          if (!fillerSent) {
            fillerSent = true;
            const filler = fillerCache.getSmartFiller(toolName);
            if (filler?.audio) {
              this.callbacks.onFillerAudio(filler.audio, filler.text);
            }
          }
        }

        if (chunk.type === "tool-result") {
          const toolResult = chunk as any;
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

      if (this.ttsPipeline && !localAbort.signal.aborted) {
        this.ttsPipeline.finish();
      }

      if (fullResponseText) {
        this.conversationHistory.push({ role: "assistant", content: fullResponseText });
        this.transcript.push({ role: "assistant", text: fullResponseText, timestamp: Date.now() });
        this.callbacks.onTranscript("assistant", fullResponseText);

        // Also extract text-based actions for dashboard highlighting
        const textActions = extractTextActions(fullResponseText);
        for (const action of textActions) {
          this.actionItems.push(action);
          this.callbacks.onActionItem(action);
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") {
        console.log(`[VoiceSession ${this.sessionId}] Response aborted (interrupt)`);
      } else {
        console.error(`[VoiceSession ${this.sessionId}] Stream error:`, err);
        this.callbacks.onError(err as Error);
      }
      this.setState("listening");
    }
  }

  /** Interrupt current response — user started speaking again */
  interrupt(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    if (this.ttsPipeline) {
      this.ttsPipeline.abort();
      this.ttsPipeline = null;
    }

    this.setState("listening");
  }

  /** End the session and return summary */
  end(): SessionSummary {
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
        content: `You are Ava, a friendly AI co-driver for FleetShield AI. You are speaking with ${dc.firstName} (full name: ${dc.name}), driving ${dc.vehicleName}.

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

IMPORTANT: You are speaking out loud via voice. Do NOT use markdown formatting — no headers, bold, bullets, numbered lists, or code blocks. Speak naturally in conversational sentences. Keep responses concise (2-4 sentences unless asked for detail). Address the driver by their first name.`,
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
