/**
 * Dispatch Bridge - Per-session EventEmitter connecting tool execution to WebSocket.
 * When Tasha's initiateDispatcherCall tool fires, the dispatch bridge streams
 * real-time progress events to the driver's UI via WebSocket.
 */

import { EventEmitter } from 'events';

// ─── Types ──────────────────────────────────────────────────

export type DispatchPhase =
  | 'connecting'      // "Let me reach Mike..."
  | 'on_call'         // Active AI-to-AI conversation
  | 'wrapping_up'     // Final exchange
  | 'complete'        // Outcome ready
  | 'error'           // Something went wrong
  | 'cancelled';      // Driver cancelled mid-call

export interface DispatchStatusEvent {
  type: 'dispatch_status';
  phase: DispatchPhase;
  message: string;
}

export interface DispatchMessageEvent {
  type: 'dispatch_message';
  role: 'dispatcher' | 'ava';
  text: string;
  turnNumber: number;
}

export interface DispatchOutcomeEvent {
  type: 'dispatch_outcome';
  outcome: string;
  summary: string;
  details: Record<string, unknown>;
}

export type DispatchEvent = DispatchStatusEvent | DispatchMessageEvent | DispatchOutcomeEvent;

export interface DispatchProgressCallback {
  onStatus: (phase: DispatchPhase, message: string) => void;
  onMessage: (role: 'dispatcher' | 'ava', text: string, turnNumber: number) => void;
  onOutcome: (outcome: string, summary: string, details: Record<string, unknown>) => void;
}

// ─── Bridge Registry (per session) ──────────────────────────

const bridges = new Map<string, EventEmitter>();

export function createDispatchBridge(sessionId: string): EventEmitter {
  const existing = bridges.get(sessionId);
  if (existing) {
    existing.removeAllListeners();
  }
  const emitter = new EventEmitter();
  emitter.setMaxListeners(20);
  bridges.set(sessionId, emitter);
  return emitter;
}

export function getDispatchBridge(sessionId: string): EventEmitter | undefined {
  return bridges.get(sessionId);
}

export function removeDispatchBridge(sessionId: string): void {
  const bridge = bridges.get(sessionId);
  if (bridge) {
    bridge.removeAllListeners();
    bridges.delete(sessionId);
  }
}

/**
 * Create typed progress callbacks that emit events on the session's bridge.
 */
export function makeDispatchProgressCallbacks(sessionId: string): DispatchProgressCallback {
  const bridge = bridges.get(sessionId);

  return {
    onStatus(phase, message) {
      const event: DispatchStatusEvent = { type: 'dispatch_status', phase, message };
      bridge?.emit('dispatch_progress', event);
    },
    onMessage(role, text, turnNumber) {
      const event: DispatchMessageEvent = { type: 'dispatch_message', role, text, turnNumber };
      bridge?.emit('dispatch_progress', event);
    },
    onOutcome(outcome, summary, details) {
      const event: DispatchOutcomeEvent = { type: 'dispatch_outcome', outcome, summary, details };
      bridge?.emit('dispatch_progress', event);
    },
  };
}
