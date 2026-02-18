import { tool } from 'ai';
import { z } from 'zod';
import { calculateDriverRisk, calculateAllDriverRisks } from '../scoring/driver-risk-engine.js';
import { seedDrivers } from '../data/seed-data.js';

export const getDriverRiskScore = tool({
  description: 'Calculate the risk score for a specific driver or all drivers. Returns risk score (0-100, lower is safer), risk tier, component breakdown, top event types, annualized cost, and recommendations. Use when asked about driver risk, safety, or "who is the riskiest driver?"',
  parameters: z.object({
    driverId: z.string().optional().describe('Specific driver ID (e.g., "d3"). If omitted, returns all drivers ranked by risk.'),
    driverName: z.string().optional().describe('Search by driver name (partial match). Ignored if driverId is provided.'),
    top: z.number().optional().describe('Return only the top N riskiest drivers (default: all)'),
  }),
  execute: async ({ driverId, driverName, top }) => {
    // Resolve by name if needed
    if (!driverId && driverName) {
      const match = seedDrivers.find((d) =>
        d.name.toLowerCase().includes(driverName.toLowerCase()),
      );
      if (match) driverId = match.id;
    }

    if (driverId) {
      const result = calculateDriverRisk(driverId);
      if (!result) return { error: `Driver ${driverId} not found` };
      return result;
    }

    const all = calculateAllDriverRisks();
    const limited = top ? all.slice(0, top) : all;
    return {
      totalDrivers: all.length,
      drivers: limited.map((r) => ({
        driverId: r.driverId,
        driverName: r.driverName,
        riskScore: r.riskScore,
        tier: r.tier,
        annualizedCost: r.annualizedCost,
        topIssue: r.recommendations[0],
      })),
      fleetAvgRisk: Math.round(all.reduce((s, r) => s + r.riskScore, 0) / all.length),
      totalAnnualizedCost: all.reduce((s, r) => s + r.annualizedCost, 0),
    };
  },
});
