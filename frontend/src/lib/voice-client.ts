/**
 * WebSocket Voice Client for FleetShield AI
 * Connects to the backend voice pipeline (Smallest AI STT/TTS).
 * Handles mic capture, VAD, audio playback.
 */

export type VoiceState = 'disconnected' | 'connecting' | 'listening' | 'thinking' | 'speaking';

export interface VoiceCallbacks {
  onStateChange: (state: VoiceState) => void;
  onTranscript: (role: 'user' | 'assistant', text: string) => void;
  onError: (error: string) => void;
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
  private callbacks: VoiceCallbacks;
  private driverId: string | undefined;
  private isSpeaking = false;
  private silenceFrames = 0;
  private speechFrames = 0;
  private readonly SILENCE_THRESHOLD = 0.01;
  private readonly SPEECH_START_FRAMES = 3;
  private readonly SILENCE_END_FRAMES = 20;

  constructor(callbacks: VoiceCallbacks, driverId?: string) {
    this.callbacks = callbacks;
    this.driverId = driverId;
  }

  async connect(): Promise<void> {
    this.setState('connecting');

    try {
      // Get mic access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });

      // Connect WebSocket
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:3000/ws`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.ws!.send(JSON.stringify({ type: 'start_session', ...(this.driverId ? { driverId: this.driverId } : {}) }));
      };

      this.ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          this.handleMessage(JSON.parse(event.data));
        }
      };

      this.ws.onerror = () => {
        this.callbacks.onError('WebSocket connection failed');
        this.setState('disconnected');
      };

      this.ws.onclose = () => {
        this.setState('disconnected');
      };

      // Set up audio capture
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (this.state === 'disconnected' || this.state === 'connecting') return;

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
            this.isSpeaking = true;
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
    } catch (err) {
      this.callbacks.onError((err as Error).message);
      this.setState('disconnected');
    }
  }

  private handleMessage(msg: any) {
    switch (msg.type) {
      case 'state_change':
        this.setState(msg.state as VoiceState);
        break;
      case 'transcript':
        this.callbacks.onTranscript(msg.role, msg.text);
        break;
      case 'filler_audio':
      case 'audio_chunk':
        this.queueAudio(msg.audio);
        break;
      case 'error':
        this.callbacks.onError(msg.message || 'Voice error');
        break;
    }
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
      return;
    }

    this.isPlaying = true;
    const buffer = this.audioQueue.shift()!;

    try {
      const audioBuffer = await this.playbackContext.decodeAudioData(buffer.slice(0));
      const source = this.playbackContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.playbackContext.destination);
      source.onended = () => this.playNext();
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
        source.onended = () => this.playNext();
        source.start();
      } catch {
        this.playNext();
      }
    }
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
      this.ws.send(JSON.stringify({ type: 'end_session' }));
      this.ws.close();
      this.ws = null;
    }
    this.audioQueue = [];
    this.isPlaying = false;
    this.isSpeaking = false;
    this.setState('disconnected');
  }
}
