/**
 * WebSocket Voice Client for FleetShield AI
 * Connects to the backend voice pipeline (Smallest AI STT/TTS).
 * Handles mic capture, VAD, audio playback.
 */

export type VoiceState = 'disconnected' | 'connecting' | 'listening' | 'thinking' | 'speaking';

export interface VoiceCallbacks {
  onStateChange: (state: VoiceState) => void;
  onTranscript: (role: 'user' | 'assistant', text: string) => void;
  onToolResult?: (toolName: string, result: any) => void;
  onError: (error: string) => void;
  onPlaybackComplete?: () => void;
}

export class VoiceClient {
  private ws: WebSocket | null = null;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private playbackContext: AudioContext | null = null;
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying = false;
  private state: VoiceState = 'disconnected';
  private backendState: VoiceState = 'disconnected';
  private playbackComplete = true;
  private callbacks: VoiceCallbacks;
  private driverId: string | undefined;
  private isSpeaking = false;
  private silenceFrames = 0;
  private speechFrames = 0;
  private vadGracePeriod = false;
  private activeSource: AudioBufferSourceNode | null = null;
  private lastSpeechStartTime = 0;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 3;
  private readonly RECONNECT_DELAY = 1000;
  private visibilityHandler: (() => void) | null = null;
  private consecutiveEmptyTranscripts = 0;
  private readonly SILENCE_THRESHOLD = 0.01;
  private readonly SPEECH_START_FRAMES = 3;
  private readonly SILENCE_END_FRAMES = 20;

  constructor(callbacks: VoiceCallbacks, driverId?: string) {
    this.callbacks = callbacks;
    this.driverId = driverId;
  }

  async connect(): Promise<void> {
    this.setState('connecting');
    this.reconnectAttempts = 0;

    try {
      // Get mic access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });

      await this.connectWebSocket();

      // Set up audio capture
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        // Only process mic audio when in listening state — prevents echo feedback
        if (this.state !== 'listening') return;
        // Skip during VAD grace period (let echo cancellation settle)
        if (this.vadGracePeriod) return;

        const inputData = e.inputBuffer.getChannelData(0);

        // Simple VAD
        let energy = 0;
        for (let i = 0; i < inputData.length; i++) {
          energy += inputData[i] * inputData[i];
        }
        energy = Math.sqrt(energy / inputData.length);

        if (energy > this.SILENCE_THRESHOLD) {
          this.speechFrames++;
          this.silenceFrames = 0;

          if (!this.isSpeaking && this.speechFrames >= this.SPEECH_START_FRAMES) {
            // Debounce rapid double-tap: ignore speech_start within 200ms of previous
            const now = Date.now();
            if (now - this.lastSpeechStartTime < 200) return;
            this.lastSpeechStartTime = now;

            this.isSpeaking = true;
            // Clear any playing audio on barge-in
            this.clearPlayback();
            this.sendControl('speech_start');
          }
        } else {
          this.silenceFrames++;
          this.speechFrames = 0;

          if (this.isSpeaking && this.silenceFrames >= this.SILENCE_END_FRAMES) {
            this.isSpeaking = false;
            this.sendControl('speech_end');
          }
        }

        // Send audio as PCM16
        if (this.isSpeaking && this.ws?.readyState === WebSocket.OPEN) {
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcm16[i] = Math.max(-32768, Math.min(32767, Math.round(inputData[i] * 32767)));
          }
          this.ws.send(pcm16.buffer);
        }
      };

      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      this.playbackContext = new AudioContext({ sampleRate: 24000 });

      // Handle tab visibility — pause VAD when hidden
      this.visibilityHandler = () => {
        if (document.hidden) {
          // Tab hidden — stop processing
          if (this.isSpeaking) {
            this.isSpeaking = false;
            this.sendControl('speech_end');
          }
        }
      };
      document.addEventListener('visibilitychange', this.visibilityHandler);

    } catch (err) {
      this.callbacks.onError((err as Error).message);
      this.setState('disconnected');
    }
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:3000/ws`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.ws!.send(JSON.stringify({ type: 'start_session', ...(this.driverId ? { driverId: this.driverId } : {}) }));
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          this.handleMessage(JSON.parse(event.data));
        }
      };

      this.ws.onerror = () => {
        this.callbacks.onError('WebSocket connection failed');
        reject(new Error('WebSocket connection failed'));
      };

      this.ws.onclose = () => {
        // Auto-reconnect if unexpected close while active
        if (this.state !== 'disconnected' && this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
          this.reconnectAttempts++;
          console.log(`[VoiceClient] Connection lost, reconnecting (attempt ${this.reconnectAttempts})...`);
          setTimeout(() => {
            this.connectWebSocket().catch(() => {
              this.callbacks.onError('Failed to reconnect');
              this.setState('disconnected');
            });
          }, this.RECONNECT_DELAY * this.reconnectAttempts);
        } else if (this.state !== 'disconnected') {
          this.setState('disconnected');
        }
      };
    });
  }

  private handleMessage(msg: any) {
    switch (msg.type) {
      case 'state_change':
        this.backendState = msg.state as VoiceState;
        this.reconcileState();
        break;
      case 'transcript':
        this.callbacks.onTranscript(msg.role, msg.text);
        // Track empty transcripts
        if (msg.role === 'user' && (!msg.text || !msg.text.trim())) {
          this.consecutiveEmptyTranscripts++;
          if (this.consecutiveEmptyTranscripts >= 3) {
            this.callbacks.onError('Microphone not capturing speech. Please check your mic.');
            this.consecutiveEmptyTranscripts = 0;
          }
        } else if (msg.role === 'user') {
          this.consecutiveEmptyTranscripts = 0;
        }
        break;
      case 'tool_result':
        this.callbacks.onToolResult?.(msg.toolName, msg.result);
        break;
      case 'filler_audio':
      case 'audio_chunk':
        this.playbackComplete = false;
        this.queueAudio(msg.audio);
        this.reconcileState();
        break;
      case 'error':
        this.callbacks.onError(msg.message || 'Voice error');
        break;
    }
  }

  /**
   * Reconcile effective state from backend state + playback status.
   * We stay in 'speaking' until playback finishes, even if backend says 'listening'.
   */
  private reconcileState() {
    let effectiveState = this.backendState;

    // If we have audio playing/queued, stay in speaking regardless of backend
    if (!this.playbackComplete && (this.backendState === 'listening' || this.backendState === 'speaking')) {
      effectiveState = 'speaking';
    }

    // Only transition to listening when both backend says so AND playback is done
    if (this.backendState === 'listening' && this.playbackComplete) {
      effectiveState = 'listening';
      // Reset VAD state with grace period
      if (this.state !== 'listening') {
        this.resetVADState();
      }
    }

    if (effectiveState !== this.state) {
      this.setState(effectiveState);
    }
  }

  /**
   * Reset VAD state and add grace period before activating.
   * Grace period lets browser echo cancellation settle after TTS playback.
   */
  private resetVADState() {
    this.isSpeaking = false;
    this.speechFrames = 0;
    this.silenceFrames = 0;
    this.vadGracePeriod = true;
    setTimeout(() => {
      this.vadGracePeriod = false;
    }, 300);
  }

  private queueAudio(base64Audio: string) {
    try {
      const binary = atob(base64Audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      this.audioQueue.push(bytes.buffer);
      if (!this.isPlaying) this.playNext();
    } catch {}
  }

  private async playNext() {
    if (this.audioQueue.length === 0 || !this.playbackContext) {
      this.isPlaying = false;
      // All audio played — mark playback complete
      this.playbackComplete = true;
      this.activeSource = null;
      this.callbacks.onPlaybackComplete?.();
      this.reconcileState();
      return;
    }

    this.isPlaying = true;
    const buffer = this.audioQueue.shift()!;

    // Resume AudioContext if suspended (browser autoplay policy)
    if (this.playbackContext.state === 'suspended') {
      try { await this.playbackContext.resume(); } catch {}
    }

    try {
      const audioBuffer = await this.playbackContext.decodeAudioData(buffer.slice(0));
      const source = this.playbackContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.playbackContext.destination);
      this.activeSource = source;
      source.onended = () => {
        this.activeSource = null;
        this.playNext();
      };
      source.start();
    } catch {
      // If decode fails (raw PCM), try manual decoding
      try {
        const pcm = new Int16Array(buffer);
        const audioBuffer = this.playbackContext.createBuffer(1, pcm.length, 24000);
        const channel = audioBuffer.getChannelData(0);
        for (let i = 0; i < pcm.length; i++) {
          channel[i] = pcm[i] / 32768;
        }
        const source = this.playbackContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.playbackContext.destination);
        this.activeSource = source;
        source.onended = () => {
          this.activeSource = null;
          this.playNext();
        };
        source.start();
      } catch {
        this.playNext();
      }
    }
  }

  /**
   * Clear playback queue and stop active audio.
   * Used for barge-in when user starts speaking during TTS playback.
   */
  clearPlayback() {
    this.audioQueue = [];
    if (this.activeSource) {
      try { this.activeSource.stop(); } catch {}
      this.activeSource = null;
    }
    this.isPlaying = false;
    this.playbackComplete = true;
  }

  private sendControl(type: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type }));
    }
  }

  private setState(state: VoiceState) {
    this.state = state;
    this.callbacks.onStateChange(state);
  }

  getState(): VoiceState {
    return this.state;
  }

  disconnect() {
    // Remove visibility listener
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.playbackContext) {
      this.playbackContext.close();
      this.playbackContext = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.ws) {
      try { this.ws.send(JSON.stringify({ type: 'end_session' })); } catch {}
      this.ws.close();
      this.ws = null;
    }
    this.clearPlayback();
    this.isSpeaking = false;
    this.setState('disconnected');
    this.backendState = 'disconnected';
  }
}
