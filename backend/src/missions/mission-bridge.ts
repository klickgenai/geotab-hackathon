/**
 * Mission Bridge - Per-mission EventEmitter + global result store.
 * Connects mission execution to SSE/WebSocket consumers.
 */

import { EventEmitter } from 'events';
import type { MissionProgress, MissionFinding, MissionResult } from './mission-types.js';
import { addDriverActionItem } from '../data/driver-session.js';

// ─── Bridge Registry (per mission) ──────────────────────────

const bridges = new Map<string, EventEmitter>();

// ─── Global Mission Store ──────────────────────────────────

const activeMissions = new Map<string, {
  type: string;
  displayName: string;
  startedAt: string;
  phase: string;
  step: number;
  totalSteps: number;
  message: string;
}>();

const completedMissions = new Map<string, MissionResult>();

// ─── Bridge CRUD ──────────────────────────────────────────

export function createMissionBridge(missionId: string): EventEmitter {
  const existing = bridges.get(missionId);
  if (existing) existing.removeAllListeners();
  const emitter = new EventEmitter();
  emitter.setMaxListeners(20);
  bridges.set(missionId, emitter);
  return emitter;
}

export function getMissionBridge(missionId: string): EventEmitter | undefined {
  return bridges.get(missionId);
}

export function removeMissionBridge(missionId: string): void {
  const bridge = bridges.get(missionId);
  if (bridge) {
    bridge.removeAllListeners();
    bridges.delete(missionId);
  }
}

// ─── Mission Store ────────────────────────────────────────

export function setActiveMission(missionId: string, info: {
  type: string;
  displayName: string;
  startedAt: string;
  phase: string;
  step: number;
  totalSteps: number;
  message: string;
}): void {
  activeMissions.set(missionId, info);
}

export function updateActiveMission(missionId: string, update: Partial<{
  phase: string;
  step: number;
  totalSteps: number;
  message: string;
}>): void {
  const mission = activeMissions.get(missionId);
  if (mission) Object.assign(mission, update);
}

export function completeActiveMission(missionId: string, result: MissionResult): void {
  activeMissions.delete(missionId);
  completedMissions.set(missionId, result);
  // Clean up old completed missions (keep last 50)
  if (completedMissions.size > 50) {
    const oldest = completedMissions.keys().next().value;
    if (oldest) completedMissions.delete(oldest);
  }
  // Sync mission results to driver action items
  if (result.status === 'complete') {
    syncMissionToDrivers(result);
  }
}

function syncMissionToDrivers(result: MissionResult): void {
  try {
    if (result.type === 'coaching_sweep') {
      const plans = (result.data.driverPlans as Array<Record<string, unknown>>) || [];
      for (const plan of plans) {
        const driverId = plan.driverId as string;
        const actions = (plan.coachingActions as string[]) || [];
        const tier = plan.tier as string;
        const priority = tier === 'critical' ? 'urgent' as const : tier === 'high' ? 'high' as const : 'medium' as const;
        for (const action of actions) {
          addDriverActionItem(driverId, action, 'mission', {
            category: 'coaching', priority, missionId: result.missionId,
          });
        }
      }
    } else if (result.type === 'wellness_check') {
      for (const finding of result.findings) {
        if (finding.category === 'burnout_critical' || finding.category === 'burnout_moderate') {
          const data = finding.data as Record<string, unknown> | undefined;
          const driverId = data?.driverId as string;
          const interventions = (data?.interventions as string[]) || [];
          const isCritical = finding.category === 'burnout_critical';
          if (driverId) {
            if (interventions.length > 0) {
              for (const intervention of interventions) {
                addDriverActionItem(driverId, intervention, 'mission', {
                  category: 'wellness', priority: isCritical ? 'urgent' : 'high', missionId: result.missionId,
                });
              }
            } else {
              addDriverActionItem(driverId, finding.detail, 'mission', {
                category: 'wellness', priority: isCritical ? 'urgent' : 'high', missionId: result.missionId,
              });
            }
          }
        }
      }
    } else if (result.type === 'safety_investigation') {
      const driverId = result.data.driverId as string;
      if (driverId && result.recommendations.length > 0) {
        for (const rec of result.recommendations) {
          addDriverActionItem(driverId, rec, 'mission', {
            category: 'safety', priority: 'high', missionId: result.missionId,
          });
        }
      }
    }
  } catch {
    // Don't let sync failures break mission completion
  }
}

export function getActiveMissions() {
  return Array.from(activeMissions.entries()).map(([missionId, info]) => ({ missionId, ...info }));
}

export function getCompletedMission(missionId: string): MissionResult | undefined {
  return completedMissions.get(missionId);
}

export function getAllMissions(): {
  active: Array<{ missionId: string; type: string; displayName: string; startedAt: string; phase: string; step: number; totalSteps: number; message: string }>;
  completed: MissionResult[];
} {
  return {
    active: Array.from(activeMissions.entries()).map(([missionId, info]) => ({ missionId, ...info })),
    completed: Array.from(completedMissions.values()).sort((a, b) =>
      new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    ),
  };
}

// ─── Typed Callbacks ──────────────────────────────────────

export interface MissionCallbacks {
  onProgress: (progress: MissionProgress) => void;
  onFinding: (finding: MissionFinding) => void;
  onComplete: (result: MissionResult) => void;
  onError: (error: string) => void;
}

export function makeMissionCallbacks(missionId: string): MissionCallbacks {
  const bridge = bridges.get(missionId);

  return {
    onProgress(progress) {
      updateActiveMission(missionId, {
        phase: progress.phase,
        step: progress.step,
        totalSteps: progress.totalSteps,
        message: progress.message,
      });
      bridge?.emit('mission_progress', progress);
    },
    onFinding(finding) {
      bridge?.emit('mission_finding', finding);
    },
    onComplete(result) {
      completeActiveMission(missionId, result);
      bridge?.emit('mission_complete', result);
      // Clean up bridge after a delay (allow consumers to receive the event)
      setTimeout(() => removeMissionBridge(missionId), 5000);
    },
    onError(error) {
      bridge?.emit('mission_error', error);
    },
  };
}
