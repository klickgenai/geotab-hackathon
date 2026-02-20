/**
 * TTS synthesis using Smallest AI Waves lightning-v3.1.
 *
 * Two modes:
 * 1. REST (synthesizeSpeech) — used for one-off synthesis (filler cache pre-gen)
 * 2. WebSocket (TTSWebSocket) — persistent connection for real-time voice sessions
 */

import WebSocket from "ws";

// ─── REST API (kept for filler cache and one-off use) ────────────────────────

const WAVES_TTS_URL = "https://waves-api.smallest.ai/api/v1/lightning-v3.1/get_speech";

export interface TTSSynthesizeOptions {
  text: string;
  voiceId?: string;
  sampleRate?: number;
  speed?: number;
  addWavHeader?: boolean;
}

/**
 * Synchronous TTS — sends full text, waits for full audio.
 * Used by filler cache at startup. For real-time voice, use TTSWebSocket.
 */
export async function synthesizeSpeech(
  apiKey: string,
  options: TTSSynthesizeOptions
): Promise<Buffer> {
  const {
    text,
    voiceId = "sophia",
    sampleRate = 24000,
    speed = 1.0,
    addWavHeader = false,
  } = options;

  const response = await fetch(WAVES_TTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      voice_id: voiceId,
      sample_rate: sampleRate,
      speed,
      add_wav_header: addWavHeader,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`TTS synthesis failed (${response.status}): ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ─── WebSocket Streaming TTS ─────────────────────────────────────────────────

const WAVES_WS_URL = "wss://waves-api.smallest.ai/api/v1/lightning-v3.1/get_speech/stream";

export interface TTSStreamCallbacks {
  /** Called for each audio chunk as it arrives (raw PCM, no header) */
  onAudioChunk: (pcmBuffer: Buffer, requestId: string) => void;
  /** Called when a single TTS request finishes all its chunks */
  onRequestComplete: (requestId: string) => void;
  /** Called on error */
  onError: (error: Error) => void;
}

/**
 * Persistent WebSocket connection to Waves lightning-v3.1 TTS.
 * Keeps one connection open for the entire voice session.
 * Send text → receive audio chunks in real-time.
 */
export class TTSWebSocket {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private voiceId: string;
  private sampleRate: number;
  private speed: number;
  private callbacks: TTSStreamCallbacks;
  private connected = false;
  private connectPromise: Promise<void> | null = null;

  constructor(
    apiKey: string,
    callbacks: TTSStreamCallbacks,
    options?: { voiceId?: string; sampleRate?: number; speed?: number }
  ) {
    this.apiKey = apiKey;
    this.callbacks = callbacks;
    this.voiceId = options?.voiceId ?? "sophia";
    this.sampleRate = options?.sampleRate ?? 24000;
    this.speed = options?.speed ?? 1.0;
  }

  /** Open WebSocket connection. Resolves when ready to send. */
  async connect(): Promise<void> {
    if (this.connected && this.ws?.readyState === WebSocket.OPEN) return;
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = new Promise<void>((resolve, reject) => {
      const url = `${WAVES_WS_URL}?timeout=60`;

      this.ws = new WebSocket(url, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      const timeout = setTimeout(() => {
        if (!this.connected) {
          this.disconnect();
          reject(new Error("TTS WebSocket connection timeout"));
        }
      }, 5000);

      this.ws.on("open", () => {
        clearTimeout(timeout);
        this.connected = true;
        this.connectPromise = null;
        resolve();
      });

      this.ws.on("message", (data: WebSocket.Data) => {
        try {
          const raw = data.toString();
          const msg = JSON.parse(raw);

          if (msg.status === "chunk" && msg.data?.audio) {
            // Decode base64 audio chunk → raw PCM buffer
            const pcmBuffer = Buffer.from(msg.data.audio, "base64");
            this.callbacks.onAudioChunk(pcmBuffer, msg.request_id || "");
          } else if (msg.status === "comp" || msg.status === "complete" || msg.done === true) {
            this.callbacks.onRequestComplete(msg.request_id || "");
          } else if (msg.error) {
            this.callbacks.onError(new Error(`TTS WS error: ${msg.error}`));
          }
          // silently handled — unknown message types ignored
        } catch {
          // silently handled — binary data or non-JSON
        }
      });

      this.ws.on("error", (err) => {
        clearTimeout(timeout);
        this.callbacks.onError(err);
        if (!this.connected) {
          this.connectPromise = null;
          reject(err);
        }
      });

      this.ws.on("close", () => {
        this.connected = false;
        this.connectPromise = null;
      });
    });

    return this.connectPromise;
  }

  /** Send text for synthesis. Audio chunks arrive via callbacks. */
  synthesize(text: string): void {
    if (!this.ws || !this.connected || this.ws.readyState !== WebSocket.OPEN) {
      this.callbacks.onError(new Error("TTS WebSocket not connected"));
      return;
    }

    this.ws.send(JSON.stringify({
      text,
      voice_id: this.voiceId,
      sample_rate: this.sampleRate,
      speed: this.speed,
    }));
  }

  /** Send text and collect all chunks into a single buffer (convenience). */
  async synthesizeAll(text: string): Promise<Buffer> {
    await this.connect();

    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const origChunkCb = this.callbacks.onAudioChunk;
      const origCompleteCb = this.callbacks.onRequestComplete;
      const origErrorCb = this.callbacks.onError;

      this.callbacks.onAudioChunk = (pcm, reqId) => {
        chunks.push(pcm);
        origChunkCb(pcm, reqId);
      };

      this.callbacks.onRequestComplete = (reqId) => {
        this.callbacks.onAudioChunk = origChunkCb;
        this.callbacks.onRequestComplete = origCompleteCb;
        this.callbacks.onError = origErrorCb;
        resolve(Buffer.concat(chunks));
      };

      this.callbacks.onError = (err) => {
        this.callbacks.onAudioChunk = origChunkCb;
        this.callbacks.onRequestComplete = origCompleteCb;
        this.callbacks.onError = origErrorCb;
        reject(err);
      };

      this.synthesize(text);
    });
  }

  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  disconnect(): void {
    if (this.ws) {
      try { this.ws.close(); } catch { /* ignore */ }
      this.ws = null;
      this.connected = false;
      this.connectPromise = null;
    }
  }
}
