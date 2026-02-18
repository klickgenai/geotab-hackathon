import { tool } from 'ai';
import { z } from 'zod';
import { predictWellness, predictAllWellness, getFleetWellnessSummary } from '../scoring/wellness-predictor.js';
import { seedDrivers } from '../data/seed-data.js';

export const getDriverWellness = tool({
  description: 'Predict driver wellness and burnout risk. Analyzes telematics patterns (shift irregularity, consecutive long days, rest compression, event escalation, night driving creep) to detect burnout signals. Returns burnout probability, retention cost at risk ($35K per driver), and wellness recommendations. Use when asked about driver wellness, burnout, retention, fatigue, or "who might quit?"',
  parameters: z.object({
    driverId: z.string().optional().describe('Specific driver ID. If omitted, returns fleet-wide wellness summary.'),
    driverName: z.string().optional().describe('Search by driver name (partial match).'),
    showAllDrivers: z.boolean().optional().describe('If true, return wellness for all drivers ranked by burnout risk.'),
  }),
  execute: async ({ driverId, driverName, showAllDrivers }) => {
    if (!driverId && driverName) {
      const match = seedDrivers.find((d) =>
        d.name.toLowerCase().includes(driverName.toLowerCase()),
      );
      if (match) driverId = match.id;
    }

    if (driverId) {
      const result = predictWellness(driverId);
      if (!result) return { error: `Driver ${driverId} not found` };
      return result;
    }

    if (showAllDrivers) {
      const all = predictAllWellness();
      return {
        totalDrivers: all.length,
        drivers: all.map((r) => ({
          driverId: r.driverId,
          driverName: r.driverName,
          burnoutProbability: r.burnoutProbability,
          burnoutRisk: r.burnoutRisk,
          wellnessScore: r.overallWellnessScore,
          retentionCost: r.retentionCost,
          topSignal: r.signals.find((s) => s.severity === 'critical')?.name || 'Normal',
        })),
      };
    }

    return getFleetWellnessSummary();
  },
});
