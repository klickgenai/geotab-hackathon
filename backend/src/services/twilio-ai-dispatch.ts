/**
 * Twilio AI Dispatch Service — Tasha calls a real phone and has an AI-mediated conversation.
 *
 * Flow:
 * 1. Driver says "call dispatch" → backend initiates Twilio outbound call
 * 2. Dispatcher picks up → Twilio Media Stream connects
 * 3. Dispatcher audio → mulaw decode → STT (Pulse) → text
 * 4. Text → Claude AI → response text
 * 5. Response → TTS (Waves) → mulaw encode → Twilio → dispatcher hears Tasha
 * 6. After 3-4 exchanges, Tasha wraps up → summary relayed to driver
 *
 * Reuses existing: audio-convert.ts, tts-synthesize.ts
 */

import Twilio from 'twilio';
import WebSocket from 'ws';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { mulawToLinear16, linear16ToMulaw, resample } from '../voice/audio-convert.js';
import { PulseSTTPipeline, type STTCallbacks } from '../voice/stt-pipeline.js';
import { synthesizeSpeech } from '../voice/tts-synthesize.js';
import { addDispatchMessage } from '../data/driver-session.js';

export type AICallState = 'initiating' | 'ringing' | 'greeting' | 'on_call' | 'wrapping_up' | 'complete' | 'failed';

export interface AICallTranscriptEntry {
  role: 'tasha' | 'dispatcher';
  text: string;
  timestamp: string;
}

export interface AICallResult {
  callId: string;
  state: AICallState;
  transcript: AICallTranscriptEntry[];
  summary?: string;
  duration?: number;
}

interface DriverContext {
  driverName: string;
  employeeNo: string;
  vehicleName: string;
  safetyScore: number;
  loadDetails: string;
  driverId?: string;
}

function log(callId: string, msg: string): void {
  console.log(`[AI-DISPATCH ${callId.slice(-6)}] ${msg}`);
}

// ─── Session Registry ──────────────────────────────────────

const activeAICalls = new Map<string, TwilioAIDispatchCall>();

export function getAICallSession(callId: string): TwilioAIDispatchCall | undefined {
  return activeAICalls.get(callId);
}

export function getAICallSessionByCallSid(callSid: string): TwilioAIDispatchCall | undefined {
  for (const session of activeAICalls.values()) {
    if (session.callSid === callSid) return session;
  }
  return undefined;
}

// ─── Main Class ────────────────────────────────────────────

export class TwilioAIDispatchCall {
  readonly callId: string;
  callSid: string | null = null;
  private streamSid: string | null = null;
  private twilioWs: WebSocket | null = null;
  private state: AICallState = 'initiating';
  private startTime = 0;
  private endTime = 0;
  private callEnded = false; // Idempotent guard for endCall()

  private driverContext: DriverContext;
  private intent: string;
  private transcript: AICallTranscriptEntry[] = [];
  private conversationHistory: Array<{ role: string; content: string }> = [];
  private exchangeCount = 0;
  private summary: string | null = null;

  // Audio buffer approach — accumulate voiced audio, then batch STT on silence
  private audioBuffer: Buffer[] = [];
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private audioChunkCount = 0;
  private totalMediaPackets = 0;
  private loggedAudioStart = false;

  // Prevent overlapping TTS and processing
  private isSpeaking = false;
  private processingAudio = false;

  // Safety: max call duration (2 minutes)
  private maxCallTimer: ReturnType<typeof setTimeout> | null = null;

  // Callbacks for frontend status updates
  private onStateChange?: (result: AICallResult) => void;

  constructor(
    intent: string,
    driverContext: DriverContext,
    onStateChange?: (result: AICallResult) => void,
  ) {
    this.callId = `AI-DISPATCH-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.intent = intent;
    this.driverContext = driverContext;
    this.onStateChange = onStateChange;
    log(this.callId, `Created: intent="${intent.slice(0, 80)}" driver=${driverContext.driverName}`);
  }

  getResult(): AICallResult {
    return {
      callId: this.callId,
      state: this.state,
      transcript: [...this.transcript],
      summary: this.summary ?? undefined,
      duration: this.endTime > 0 ? this.endTime - this.startTime : Date.now() - this.startTime,
    };
  }

  get currentState(): AICallState {
    return this.state;
  }

  /**
   * Initiate outbound call via Twilio REST API.
   */
  async startCall(): Promise<{ callId: string; status: string }> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    const ngrokUrl = process.env.NGROK_URL;
    const dispatcherPhone = process.env.DISPATCH_PHONE_NUMBER || process.env.DISPATCHER_PHONE;

    if (!accountSid || !authToken || !fromNumber || !ngrokUrl || !dispatcherPhone) {
      throw new Error('Missing Twilio env vars');
    }

    const client = Twilio(accountSid, authToken);
    this.startTime = Date.now();
    this.setState('ringing');

    const wsUrl = ngrokUrl.replace(/^https?/, 'wss') + '/twilio-media';
    const statusUrl = ngrokUrl + '/api/twilio/call-status';

    log(this.callId, `Calling ${dispatcherPhone} from ${fromNumber}, WS: ${wsUrl}`);

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${wsUrl}">
      <Parameter name="callId" value="${this.callId}" />
      <Parameter name="mode" value="ai" />
    </Stream>
  </Connect>
</Response>`;

    const call = await client.calls.create({
      to: dispatcherPhone,
      from: fromNumber,
      twiml,
      statusCallback: statusUrl,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
    });

    this.callSid = call.sid;
    activeAICalls.set(this.callId, this);
    log(this.callId, `Call SID: ${call.sid}`);

    // Safety: end call after 2 minutes max
    this.maxCallTimer = setTimeout(() => {
      log(this.callId, 'Max call duration reached (2 min), wrapping up');
      this.speakToPhone("I appreciate your help. I'll relay everything back to the driver. Thanks!")
        .then(() => this.endCall('max_duration'))
        .catch(() => this.endCall('max_duration'));
    }, 120000);

    return { callId: this.callId, status: 'ringing' };
  }

  /**
   * Handle Twilio Media Stream WebSocket connection.
   */
  handleMediaStream(ws: WebSocket, bufferedMessages?: string[]): void {
    this.twilioWs = ws;
    log(this.callId, 'Media stream connected');

    const processMessage = (raw: string) => {
      try {
        const msg = JSON.parse(raw);
        switch (msg.event) {
          case 'connected':
            log(this.callId, 'Twilio stream: connected');
            break;
          case 'start':
            this.streamSid = msg.start.streamSid;
            log(this.callId, `Twilio stream: started, streamSid=${this.streamSid}`);
            this.setState('greeting');
            setTimeout(() => this.sendGreeting(), 500);
            break;
          case 'media':
            this.handleIncomingAudio(msg.media.payload);
            break;
          case 'stop':
            log(this.callId, 'Twilio stream: stopped');
            this.endCall('stream_stopped');
            break;
        }
      } catch {
        // Malformed message — ignore
      }
    };

    if (bufferedMessages) {
      for (const raw of bufferedMessages) {
        processMessage(raw);
      }
    }

    ws.on('message', (data: WebSocket.Data) => {
      processMessage(data.toString());
    });

    ws.on('close', () => {
      log(this.callId, 'WebSocket closed');
      this.endCall('ws_closed');
    });

    ws.on('error', (err) => {
      log(this.callId, `WebSocket error: ${err.message}`);
    });
  }

  /**
   * Handle Twilio status webhook.
   */
  handleStatusUpdate(status: string): void {
    log(this.callId, `Status update: ${status}`);
    switch (status) {
      case 'ringing':
        this.setState('ringing');
        break;
      case 'in-progress':
        break;
      case 'completed':
      case 'failed':
      case 'busy':
      case 'no-answer':
      case 'canceled':
        this.endCall(status);
        break;
    }
  }

  /**
   * Hang up the call.
   */
  hangup(): void {
    this.endCall('user_hangup');

    if (this.callSid) {
      try {
        const client = Twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
        client.calls(this.callSid).update({ status: 'completed' }).catch(() => {});
      } catch {}
    }
  }

  // ─── Audio Pipeline ──────────────────────────────────────

  /**
   * Handle incoming audio from dispatcher's phone (mulaw 8kHz).
   * Buffer voiced chunks, detect silence, then batch-transcribe.
   *
   * KEY: Twilio sends audio every 20ms continuously (even silence).
   * We only reset the silence timer on VOICED packets, so during actual
   * silence the timer expires and triggers STT processing.
   */
  private handleIncomingAudio(mulawBase64: string): void {
    this.totalMediaPackets++;

    // Log first audio arrival and periodic updates
    if (!this.loggedAudioStart) {
      log(this.callId, `First audio packet received (speaking=${this.isSpeaking}, proc=${this.processingAudio}, state=${this.state})`);
      this.loggedAudioStart = true;
    }
    if (this.totalMediaPackets % 500 === 0) {
      log(this.callId, `Audio: pkts=${this.totalMediaPackets} voiced=${this.audioChunkCount} buf=${this.audioBuffer.length} speaking=${this.isSpeaking} proc=${this.processingAudio}`);
    }

    // Don't process while Tasha is speaking or we're processing previous utterance
    if (this.isSpeaking || this.processingAudio) return;
    if (this.callEnded) return;
    if (this.state === 'wrapping_up' || this.state === 'complete' || this.state === 'failed') return;

    const mulawBuf = Buffer.from(mulawBase64, 'base64');
    const pcm8k = mulawToLinear16(mulawBuf);
    const pcm16k = resample(pcm8k, 8000, 16000);

    // Check energy level for voice activity
    const energy = this.calculateEnergy(pcm16k);

    // Phone audio through mulaw has lower dynamic range — use low threshold
    if (energy > 50) {
      // ── VOICED PACKET ──
      this.audioChunkCount++;
      this.audioBuffer.push(pcm16k);

      if (this.audioChunkCount === 1) {
        log(this.callId, `Voice activity started! energy=${energy.toFixed(0)}`);
      }

      // Reset silence timer on VOICED packets only (not every packet!)
      // This is the key fix — previously the timer was cleared on EVERY packet
      // including silent ones, so it never fired.
      if (this.silenceTimer) clearTimeout(this.silenceTimer);

      // Arm silence detection after a few voiced packets
      if (this.audioChunkCount > 3) {
        this.silenceTimer = setTimeout(() => {
          if (this.processingAudio || this.isSpeaking) return; // Extra guard
          log(this.callId, `Silence detected after ${this.audioChunkCount} voiced chunks, ${this.audioBuffer.length} buffered, processing...`);
          this.processBufferedAudio();
        }, 1200); // 1.2s silence = end of speech
      }
    } else {
      // ── SILENT PACKET ──
      // Buffer trailing silence if we already have voice activity
      // (helps STT capture trailing syllables)
      if (this.audioChunkCount > 0 && this.audioBuffer.length > 0) {
        this.audioBuffer.push(pcm16k);
      }
      // DO NOT reset the silence timer here — let it fire!
    }
  }

  /**
   * Calculate RMS energy of a PCM buffer.
   */
  private calculateEnergy(pcm: Buffer): number {
    let sum = 0;
    for (let i = 0; i < pcm.length - 1; i += 2) {
      const sample = pcm.readInt16LE(i);
      sum += sample * sample;
    }
    const numSamples = pcm.length / 2;
    return numSamples > 0 ? Math.sqrt(sum / numSamples) : 0;
  }

  /**
   * Process accumulated audio buffer through STT (batch approach).
   * Creates a fresh STT pipeline per utterance for reliability.
   *
   * KEY FIX: Audio must be paced (not burst-sent) so Pulse has time to
   * start processing before the "end" signal. Without pacing, short
   * utterances (< 4s) produce zero interims and empty transcripts.
   */
  private async processBufferedAudio(): Promise<void> {
    if (this.processingAudio) return;
    if (this.audioBuffer.length === 0) return;

    this.processingAudio = true;

    // Grab and clear the buffer atomically
    const chunks = [...this.audioBuffer];
    this.audioBuffer = [];
    const chunkCount = this.audioChunkCount;
    this.audioChunkCount = 0;

    const combined = Buffer.concat(chunks);
    const durationSec = (combined.length / 32000).toFixed(1);
    log(this.callId, `Processing audio: ${combined.length} bytes (${durationSec}s), ${chunkCount} voiced chunks`);

    // Skip very short audio (< 0.3s at 16kHz 16-bit = 9600 bytes)
    if (combined.length < 9600) {
      log(this.callId, 'Audio too short (<0.3s), skipping');
      this.processingAudio = false;
      return;
    }

    const apiKey = process.env.SMALLEST_API_KEY;
    if (!apiKey) {
      log(this.callId, 'No SMALLEST_API_KEY, cannot run STT');
      this.processingAudio = false;
      return;
    }

    // Try STT — retry once on empty result if we had significant voiced audio
    let transcribedText = await this.attemptSTT(combined, durationSec, apiKey, 1);

    if (!transcribedText && chunkCount > 20) {
      log(this.callId, `Retry: no transcript despite ${chunkCount} voiced chunks — retrying with slower pacing...`);
      transcribedText = await this.attemptSTT(combined, durationSec, apiKey, 2);
    }

    if (transcribedText && transcribedText.length > 0) {
      await this.handleDispatcherSpeech(transcribedText);
    } else {
      log(this.callId, 'No speech detected in audio — resuming listening');
    }

    this.processingAudio = false;
    this.loggedAudioStart = false;
  }

  /**
   * Single STT attempt with paced audio sending.
   * @param attempt 1 = normal pacing, 2 = slower retry pacing
   */
  private async attemptSTT(combined: Buffer, durationSec: string, apiKey: string, attempt: number): Promise<string> {
    try {
      let transcribedText = '';
      let gotInterim = false;

      log(this.callId, `STT attempt ${attempt}: creating pipeline...`);

      const pipeline = new PulseSTTPipeline(apiKey, {
        onInterim: (text: string) => {
          if (text.trim()) {
            gotInterim = true;
            log(this.callId, `STT interim: "${text.trim()}"`);
          }
        },
        onFinal: (text: string) => {
          if (text.trim()) {
            transcribedText = text.trim();
            log(this.callId, `STT final callback: "${transcribedText}"`);
          }
        },
        onError: (err: Error) => {
          log(this.callId, `STT error: ${err.message}`);
        },
      });

      // Connect with timeout (5s max)
      log(this.callId, 'Connecting STT pipeline...');
      const connectTimeout = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('STT connect timeout (5s)')), 5000),
      );
      await Promise.race([pipeline.connect(), connectTimeout]);
      log(this.callId, 'STT pipeline connected, sending audio...');

      pipeline.resetUtterance();

      // ── PACED SENDING ──
      // Send audio in 100ms chunks with delays to simulate near-real-time streaming.
      // Without pacing, Pulse receives all audio as a burst and may not process
      // it before the "end" signal arrives (especially for short utterances).
      const sendChunkSize = 3200; // 100ms at 16kHz 16-bit
      const pacingDelayMs = attempt === 1 ? 8 : 15; // ms delay every N chunks
      const pacingInterval = attempt === 1 ? 3 : 2; // delay every N chunks
      let chunksSent = 0;

      for (let i = 0; i < combined.length; i += sendChunkSize) {
        const chunk = combined.subarray(i, Math.min(i + sendChunkSize, combined.length));
        pipeline.sendAudio(chunk);
        chunksSent++;

        // Pace: small delay every few chunks so Pulse can start processing
        if (chunksSent % pacingInterval === 0) {
          await new Promise(r => setTimeout(r, pacingDelayMs));
        }
      }
      log(this.callId, `Sent ${chunksSent} chunks to STT (pacing: ${pacingDelayMs}ms every ${pacingInterval} chunks)`);

      // ── POST-SEND WAIT ──
      // Give Pulse time to finish processing the audio before sending "end".
      // Scale wait by audio duration: at least 800ms, up to 2500ms.
      const postSendWait = Math.max(800, Math.min(2500, parseFloat(durationSec) * 300));
      log(this.callId, `Waiting ${postSendWait.toFixed(0)}ms for STT processing before endUtterance...`);
      await new Promise(r => setTimeout(r, postSendWait));

      // ── END UTTERANCE ──
      const sttTimeout = Math.max(8000, Math.min(20000, parseFloat(durationSec) * 2500));
      log(this.callId, `Calling endUtterance (timeout ${(sttTimeout / 1000).toFixed(0)}s)...`);
      const endPromise = pipeline.endUtterance();
      const timeoutPromise = new Promise<string>((resolve) => setTimeout(() => resolve(''), sttTimeout));
      const finalText = await Promise.race([endPromise, timeoutPromise]);
      if (finalText && finalText.trim()) {
        transcribedText = finalText.trim();
      }

      // Clean up
      try { pipeline.disconnect(); } catch {}

      log(this.callId, `STT attempt ${attempt} result: "${transcribedText}" (gotInterim=${gotInterim})`);
      return transcribedText;
    } catch (err) {
      log(this.callId, `STT attempt ${attempt} error: ${err}`);
      return '';
    }
  }

  /**
   * Process transcribed dispatcher text through Claude.
   */
  private async handleDispatcherSpeech(text: string): Promise<void> {
    log(this.callId, `Dispatcher said: "${text}"`);

    // Add to transcript
    this.transcript.push({
      role: 'dispatcher',
      text,
      timestamp: new Date().toISOString(),
    });
    this.notifyStateChange();

    this.exchangeCount++;
    this.conversationHistory.push({ role: 'user', content: text });

    // Generate Tasha's response via Claude
    try {
      const dc = this.driverContext;

      const shouldWrapUp = this.exchangeCount >= 3;
      const systemPrompt = `You are Tasha, the FleetShield AI dispatch coordinator. You are on a REAL phone call with a human dispatcher. Be professional, concise, and clear.

Context:
- Calling on behalf of: ${dc.driverName} (Employee #${dc.employeeNo})
- Vehicle: ${dc.vehicleName}
- ${dc.loadDetails}
- Driver's issue: "${this.intent}"
- Safety score: ${dc.safetyScore}/100
- Exchange ${this.exchangeCount} of this call

Your goals:
1. Listen to dispatcher's response and reply naturally
2. Get actionable next steps (ETA, instructions, resources)
3. Confirm what you'll relay back to the driver
${shouldWrapUp ? '4. WRAP UP NOW. Thank the dispatcher and say you will relay info to the driver. Example: "Perfect, thanks for your help. I\'ll let the driver know right away."' : ''}

CRITICAL RULES:
- Keep responses SHORT (1-2 sentences max). This is a phone call, not an essay.
- Do NOT make up information you don't have.
- Be warm but professional. Use natural phone cadence.
- Do NOT use any markdown, formatting, or special characters.
- Speak naturally as if on a real phone call.
- NEVER use asterisks, bullet points, or numbered lists.`;

      const result = await generateText({
        model: anthropic('claude-sonnet-4-20250514'),
        maxTokens: 120,
        system: systemPrompt,
        messages: this.conversationHistory.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      });

      const responseText = result.text.trim();
      log(this.callId, `Tasha response (exchange ${this.exchangeCount}): "${responseText}"`);

      if (responseText) {
        this.conversationHistory.push({ role: 'assistant', content: responseText });
        this.transcript.push({
          role: 'tasha',
          text: responseText,
          timestamp: new Date().toISOString(),
        });
        this.notifyStateChange();

        // Speak the response via TTS → mulaw → Twilio
        await this.speakToPhone(responseText);

        // Decide whether to wrap up
        const isWrapUpPhrase = /\b(let .* know|relay|pass .* along|have a good|thanks for your help|appreciate|bye)\b/i.test(responseText);
        if (this.exchangeCount >= 4 || (shouldWrapUp && isWrapUpPhrase)) {
          log(this.callId, `Wrapping up after ${this.exchangeCount} exchanges`);
          this.setState('wrapping_up');
          // Give 2s for the audio to finish playing, then end
          setTimeout(() => this.endCall('completed'), 2000);
        } else {
          this.setState('on_call');
        }
      }
    } catch (err) {
      log(this.callId, `Claude error: ${err}`);
      await this.speakToPhone("I'm having a brief issue. Let me get back to you. Thanks for your help.");
      setTimeout(() => this.endCall('completed'), 2000);
    }
  }

  /**
   * Send Tasha's initial greeting when call connects.
   * Keep it SHORT — under 8 seconds of speech.
   */
  private async sendGreeting(): Promise<void> {
    const dc = this.driverContext;

    // Shorten the intent to 1 sentence max (Claude sometimes generates verbose intents)
    let shortIntent = this.intent;
    if (shortIntent.length > 80) {
      // Take just the first sentence
      const firstSentence = shortIntent.split(/[.!?]/)[0].trim();
      shortIntent = firstSentence.length > 10 ? firstSentence : shortIntent.slice(0, 80);
    }

    const greeting = `Hi, this is Tasha from FleetShield. I'm calling about driver ${dc.driverName}. ${shortIntent}. Can you help?`;

    log(this.callId, `Greeting (${greeting.length} chars): "${greeting}"`);

    this.conversationHistory.push({ role: 'assistant', content: greeting });
    this.transcript.push({
      role: 'tasha',
      text: greeting,
      timestamp: new Date().toISOString(),
    });

    this.setState('on_call');
    this.notifyStateChange();

    await this.speakToPhone(greeting);

    // Reset audio state after greeting — clean slate for dispatcher's response
    this.audioBuffer = [];
    this.audioChunkCount = 0;
    this.loggedAudioStart = false;
    log(this.callId, 'Greeting sent, now listening for dispatcher response');
  }

  /**
   * Convert text to speech and send to Twilio as mulaw audio.
   */
  private async speakToPhone(text: string): Promise<void> {
    if (!this.twilioWs || this.twilioWs.readyState !== WebSocket.OPEN || !this.streamSid) {
      log(this.callId, 'Cannot speak: WebSocket not open');
      return;
    }

    this.isSpeaking = true;
    // Clear any buffered audio from while we were processing (prevents echo)
    this.audioBuffer = [];
    this.audioChunkCount = 0;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    try {
      const apiKey = process.env.SMALLEST_API_KEY;
      if (!apiKey) {
        this.isSpeaking = false;
        return;
      }

      // Limit text length for reasonable TTS duration
      const ttsText = text.slice(0, 400);
      if (text.length > 400) {
        log(this.callId, `TTS text truncated from ${text.length} to 400 chars`);
      }

      log(this.callId, `TTS synthesizing: "${ttsText.slice(0, 60)}..."`);

      // Synthesize speech at 24kHz
      const pcm24k = await synthesizeSpeech(apiKey, {
        text: ttsText,
        voiceId: 'sophia',
        sampleRate: 24000,
        speed: 1.0,
        addWavHeader: false,
      });

      // Downsample 24kHz → 8kHz for Twilio
      const pcm8k = resample(pcm24k, 24000, 8000);

      // Encode to mulaw
      const mulawBuf = linear16ToMulaw(pcm8k);

      const durationMs = Math.floor((mulawBuf.length / 8000) * 1000);
      log(this.callId, `TTS sending ${mulawBuf.length} bytes mulaw (${(durationMs / 1000).toFixed(1)}s)`);

      // Send in Twilio-friendly chunks (160 bytes = 20ms of mulaw 8kHz)
      const chunkSize = 160;
      for (let i = 0; i < mulawBuf.length; i += chunkSize) {
        if (!this.twilioWs || this.twilioWs.readyState !== WebSocket.OPEN) {
          log(this.callId, 'WebSocket closed mid-TTS, aborting');
          break;
        }

        const chunk = mulawBuf.subarray(i, Math.min(i + chunkSize, mulawBuf.length));
        this.twilioWs.send(JSON.stringify({
          event: 'media',
          streamSid: this.streamSid,
          media: {
            payload: chunk.toString('base64'),
          },
        }));

        // Yield periodically to not block the event loop
        if (i % (chunkSize * 50) === 0 && i > 0) {
          await new Promise(r => setTimeout(r, 1));
        }
      }

      // Wait for audio to finish playing on the phone
      // Use 300ms buffer (phone network latency)
      log(this.callId, `Waiting ${durationMs + 300}ms for playback`);
      await new Promise(r => setTimeout(r, durationMs + 300));
    } catch (err) {
      log(this.callId, `TTS error: ${err}`);
    }

    // Clear any audio that arrived during TTS (it's echo from our own speech)
    this.audioBuffer = [];
    this.audioChunkCount = 0;
    this.isSpeaking = false;
    this.loggedAudioStart = false;
    log(this.callId, 'TTS done, listening again');
  }

  // ─── State Management ────────────────────────────────────

  private setState(state: AICallState): void {
    if (this.state !== state) {
      log(this.callId, `State: ${this.state} → ${state}`);
      this.state = state;
      this.notifyStateChange();
    }
  }

  private notifyStateChange(): void {
    try {
      this.onStateChange?.(this.getResult());
    } catch (err) {
      log(this.callId, `onStateChange error: ${err}`);
    }
  }

  /**
   * End the call. Idempotent — safe to call multiple times.
   */
  private async endCall(reason: string): Promise<void> {
    // Idempotent guard — prevent double processing
    if (this.callEnded) return;
    this.callEnded = true;

    log(this.callId, `Ending call: reason=${reason}`);
    this.endTime = Date.now();

    // Clean up timers
    if (this.silenceTimer) { clearTimeout(this.silenceTimer); this.silenceTimer = null; }
    if (this.maxCallTimer) { clearTimeout(this.maxCallTimer); this.maxCallTimer = null; }

    const failed = reason === 'failed' || reason === 'no-answer' || reason === 'busy';

    if (!failed && this.transcript.length > 0) {
      try {
        this.summary = await this.generateAISummary();
      } catch (err) {
        log(this.callId, `Summary generation failed: ${err}`);
        this.summary = this.generateSimpleSummary();
      }
      this.setState('complete');
    } else if (failed) {
      this.summary = 'Could not reach dispatch. Please try again or call directly.';
      this.setState('failed');
    } else {
      this.summary = 'Call ended.';
      this.setState('complete');
    }

    // Save dispatch call result to driver messages
    if (this.driverContext.driverId && this.summary) {
      try {
        addDispatchMessage(this.driverContext.driverId, {
          from: 'dispatch',
          text: `[Tasha → Dispatch Call] ${this.summary}`,
          read: false,
        });
        log(this.callId, 'Saved dispatch result to driver messages');
      } catch (err) {
        log(this.callId, `Failed to save dispatch message: ${err}`);
      }
    }

    const durationSec = Math.floor((this.endTime - this.startTime) / 1000);
    log(this.callId, `Call ended: ${this.transcript.length} entries, ${this.exchangeCount} exchanges, ${durationSec}s, summary=${!!this.summary}`);
    this.notifyStateChange();

    // Clean up after 10 minutes
    setTimeout(() => {
      activeAICalls.delete(this.callId);
    }, 600000);
  }

  /**
   * Generate an AI-powered summary of the dispatch call.
   */
  private async generateAISummary(): Promise<string> {
    if (this.transcript.length === 0) return 'Call ended with no conversation.';

    const dispatcherMessages = this.transcript
      .filter(t => t.role === 'dispatcher')
      .map(t => t.text);

    if (dispatcherMessages.length === 0) return 'Dispatcher did not respond.';

    try {
      const transcriptText = this.transcript
        .map(t => `${t.role === 'tasha' ? 'Tasha' : 'Dispatcher'}: ${t.text}`)
        .join('\n');

      const result = await generateText({
        model: anthropic('claude-sonnet-4-20250514'),
        maxTokens: 200,
        system: 'Summarize this dispatch call in 2-3 sentences for a truck driver. Focus on what was resolved and any action items. Be concise and clear. Do not use markdown.',
        messages: [{ role: 'user', content: `Driver's request: "${this.intent}"\n\nCall transcript:\n${transcriptText}` }],
      });

      return result.text.trim() || this.generateSimpleSummary();
    } catch {
      return this.generateSimpleSummary();
    }
  }

  private generateSimpleSummary(): string {
    const lastDispatcher = this.transcript.filter(t => t.role === 'dispatcher').pop();
    const lastTasha = this.transcript.filter(t => t.role === 'tasha').pop();

    return `Tasha called dispatch about: "${this.intent.slice(0, 100)}". ${lastDispatcher ? `Dispatch said: "${lastDispatcher.text.slice(0, 200)}"` : ''} ${lastTasha ? `Tasha confirmed: "${lastTasha.text.slice(0, 150)}"` : ''}`.trim();
  }
}
