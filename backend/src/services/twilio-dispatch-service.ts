/**
 * Twilio Dispatch Service — Real phone call audio bridge.
 *
 * Pure human-to-human audio bridge: no STT/TTS/Claude on the call.
 * Driver speaks into browser mic → PCM → mulaw → Twilio → dispatcher phone.
 * Dispatcher speaks into phone → Twilio → mulaw → WAV → browser speaker.
 */

import Twilio from 'twilio';
import WebSocket from 'ws';
import { browserPcmToMulaw, mulawToBrowserAudio } from '../voice/audio-convert.js';

export type DispatchCallState = 'idle' | 'ringing' | 'connected' | 'completed' | 'failed';

export interface DispatchCallInfo {
  callId: string;
  callSid: string | null;
  state: DispatchCallState;
  startTime: number;
  endTime: number;
}

// ─── Session Registry ──────────────────────────────────────

const activeCallSessions = new Map<string, TwilioDispatchSession>();

export function getCallSession(callId: string): TwilioDispatchSession | undefined {
  return activeCallSessions.get(callId);
}

export function getCallSessionByCallSid(callSid: string): TwilioDispatchSession | undefined {
  for (const session of activeCallSessions.values()) {
    if (session.callSid === callSid) return session;
  }
  return undefined;
}

// ─── Twilio Dispatch Session ──────────────────────────────

export class TwilioDispatchSession {
  readonly callId: string;
  callSid: string | null = null;
  private streamSid: string | null = null;
  private twilioWs: WebSocket | null = null;
  private state: DispatchCallState = 'idle';
  private startTime = 0;
  private endTime = 0;

  // Callbacks to push audio/state back to the browser WS handler
  private onStateChange: (state: DispatchCallState) => void;
  private onPhoneAudio: (wavBuffer: Buffer) => void;
  private onCallEnded: (reason: string) => void;

  constructor(callbacks: {
    onStateChange: (state: DispatchCallState) => void;
    onPhoneAudio: (wavBuffer: Buffer) => void;
    onCallEnded: (reason: string) => void;
  }) {
    this.callId = `DISPATCH-${Date.now()}`;
    this.onStateChange = callbacks.onStateChange;
    this.onPhoneAudio = callbacks.onPhoneAudio;
    this.onCallEnded = callbacks.onCallEnded;
  }

  get currentState(): DispatchCallState {
    return this.state;
  }

  getInfo(): DispatchCallInfo {
    return {
      callId: this.callId,
      callSid: this.callSid,
      state: this.state,
      startTime: this.startTime,
      endTime: this.endTime,
    };
  }

  /**
   * Initiate outbound call via Twilio REST API.
   */
  async startCall(): Promise<{ callSid: string; status: string }> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID!;
    const authToken = process.env.TWILIO_AUTH_TOKEN!;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER!;
    const ngrokUrl = process.env.NGROK_URL!;
    const dispatcherPhone = process.env.DISPATCHER_PHONE!;

    if (!accountSid || !authToken || !fromNumber || !ngrokUrl || !dispatcherPhone) {
      throw new Error('Missing Twilio env vars (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, NGROK_URL, DISPATCHER_PHONE)');
    }

    const client = Twilio(accountSid, authToken);
    this.startTime = Date.now();
    this.setState('ringing');

    const wsUrl = ngrokUrl.replace(/^https?/, 'wss') + '/twilio-media';
    const statusUrl = ngrokUrl + '/api/twilio/call-status';

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Please hold while I connect you with Tasha from FleetShield.</Say>
  <Pause length="1"/>
  <Connect>
    <Stream url="${wsUrl}">
      <Parameter name="callId" value="${this.callId}" />
    </Stream>
  </Connect>
  <Say voice="Polly.Joanna">The call has ended. Thank you.</Say>
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
    activeCallSessions.set(this.callId, this);
    activeCallSessions.set(call.sid, this);

    return { callSid: call.sid, status: call.status };
  }

  /**
   * Handle Twilio Media Stream WebSocket connection.
   */
  handleMediaStream(ws: WebSocket, bufferedMessages?: string[]): void {
    this.twilioWs = ws;

    const processMessage = (raw: string) => {
      try {
        const msg = JSON.parse(raw);
        switch (msg.event) {
          case 'connected':
            break;
          case 'start':
            this.streamSid = msg.start.streamSid;
            this.setState('connected');
            break;
          case 'media':
            // Incoming audio from the dispatcher's phone → convert and send to browser
            this.handlePhoneAudio(msg.media.payload);
            break;
          case 'stop':
            this.endCall('stream_stopped');
            break;
        }
      } catch {
        // silently handled
      }
    };

    // Process buffered messages
    if (bufferedMessages) {
      for (const raw of bufferedMessages) {
        processMessage(raw);
      }
    }

    ws.on('message', (data: WebSocket.Data) => {
      processMessage(data.toString());
    });

    ws.on('close', () => {
      this.endCall('ws_closed');
    });

    ws.on('error', () => {
      // silently handled
    });
  }

  /**
   * Forward browser mic PCM audio to Twilio as mulaw.
   */
  sendBrowserAudio(pcm16k: Buffer): void {
    if (!this.twilioWs || this.twilioWs.readyState !== WebSocket.OPEN || !this.streamSid) return;

    const mulawBase64 = browserPcmToMulaw(pcm16k);
    const mulawBuf = Buffer.from(mulawBase64, 'base64');

    // Send in Twilio-friendly chunks (160 bytes = 20ms of mulaw 8kHz)
    const chunkSize = 160;
    for (let i = 0; i < mulawBuf.length; i += chunkSize) {
      const chunk = mulawBuf.subarray(i, Math.min(i + chunkSize, mulawBuf.length));
      this.twilioWs.send(JSON.stringify({
        event: 'media',
        streamSid: this.streamSid,
        media: {
          payload: chunk.toString('base64'),
        },
      }));
    }
  }

  /**
   * Convert mulaw from Twilio → WAV and send to browser.
   */
  private handlePhoneAudio(mulawBase64: string): void {
    const wavBuffer = mulawToBrowserAudio(mulawBase64);
    this.onPhoneAudio(wavBuffer);
  }

  /**
   * Handle Twilio status webhook.
   */
  handleStatusUpdate(status: string): void {
    switch (status) {
      case 'ringing':
        this.setState('ringing');
        break;
      case 'in-progress':
        this.setState('connected');
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

  private endCall(reason: string): void {
    if (this.state === 'completed' || this.state === 'failed') return;

    this.endTime = Date.now();
    const failed = reason === 'failed' || reason === 'no-answer' || reason === 'busy';
    this.setState(failed ? 'failed' : 'completed');
    this.onCallEnded(reason);

    // Clean up after 5 minutes
    setTimeout(() => {
      if (this.callSid) activeCallSessions.delete(this.callSid);
      activeCallSessions.delete(this.callId);
    }, 300000);
  }

  private setState(state: DispatchCallState): void {
    if (this.state !== state) {
      this.state = state;
      this.onStateChange(state);
    }
  }
}
