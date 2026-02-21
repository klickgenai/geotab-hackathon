/**
 * deployMission tool — Vercel AI SDK tool for launching background missions.
 * Returns immediately; mission runs asynchronously.
 */

import { tool } from 'ai';
import { z } from 'zod';
import {
  MISSION_META,
  createMissionBridge,
  makeMissionCallbacks,
  setActiveMission,
  runMission,
} from '../missions/index.js';

export const deployMission = tool({
  description: `Deploy an autonomous background agent to perform a thorough fleet analysis. The agent works in the background and delivers a comprehensive report when done. Use this ONLY after the operator has confirmed they want the analysis. Available mission types: coaching_sweep (coaching sweep), wellness_check (wellness check), safety_investigation (safety investigation), insurance_optimization (insurance optimization), preshift_sweep (pre-shift sweep).`,
  parameters: z.object({
    missionType: z.enum([
      'coaching_sweep',
      'wellness_check',
      'safety_investigation',
      'insurance_optimization',
      'preshift_sweep',
    ]).describe('The type of mission to deploy'),
    params: z.object({
      topN: z.number().optional().describe('Number of top drivers to analyze (default 5)'),
      driverId: z.string().optional().describe('Specific driver ID to investigate'),
      driverName: z.string().optional().describe('Driver name to search for'),
    }).optional().describe('Optional mission parameters'),
  }),
  execute: async ({ missionType, params }) => {
    const meta = MISSION_META[missionType];
    const missionId = `mission-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Create bridge for event streaming
    createMissionBridge(missionId);
    const callbacks = makeMissionCallbacks(missionId);

    // Register in active missions
    setActiveMission(missionId, {
      type: missionType,
      displayName: meta.displayName,
      startedAt: new Date().toISOString(),
      phase: 'queued',
      step: 0,
      totalSteps: 1,
      message: 'Queued...',
    });

    // Fire-and-forget (async, don't await)
    runMission({ type: missionType, params, sessionId: missionId }, callbacks).catch(() => {
      // Error handled inside runMission
    });

    return {
      missionId,
      type: missionType,
      displayName: meta.displayName,
      description: meta.description,
      status: 'running',
      estimatedSeconds: meta.estimatedSeconds,
    };
  },
});
