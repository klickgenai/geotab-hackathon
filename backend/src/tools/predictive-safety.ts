import { tool } from 'ai';
import { z } from 'zod';
import {
  calculatePreShiftRisk,
  calculateAllPreShiftRisks,
  getFleetRiskForecast,
  detectDeteriorating,
  detectDangerousZones,
} from '../scoring/predictive-safety.js';
import { seedDrivers } from '../data/seed-data.js';

export const getPreShiftRisk = tool({
  description: 'Get pre-shift risk assessment for a driver or all drivers. Evaluates fatigue, behavior trends, recent severity, and workload to produce a 0-100 risk score (higher = more dangerous today). Use when asked about shift readiness, pre-shift safety, "who should not drive today?", or predictive risk.',
  parameters: z.object({
    driverId: z.string().optional().describe('Specific driver ID (e.g., "d3"). If omitted, returns all drivers ranked by pre-shift risk.'),
    driverName: z.string().optional().describe('Search by driver name (partial match). Ignored if driverId is provided.'),
    top: z.number().optional().describe('Return only the top N highest-risk drivers (default: all)'),
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
      const result = calculatePreShiftRisk(driverId);
      if (!result) return { error: `Driver ${driverId} not found` };
      return result;
    }

    const all = calculateAllPreShiftRisks();
    const limited = top ? all.slice(0, top) : all;
    return {
      totalDrivers: all.length,
      drivers: limited.map((r) => ({
        driverId: r.driverId,
        driverName: r.driverName,
        riskScore: r.riskScore,
        riskLevel: r.riskLevel,
        topFactor: r.factors.sort((a, b) => b.impact - a.impact)[0]?.name || 'None',
        recommendation: r.recommendation,
      })),
      highRiskCount: all.filter((r) => r.riskLevel === 'high' || r.riskLevel === 'critical').length,
      fleetAvgRisk: Math.round(all.reduce((s, r) => s + r.riskScore, 0) / all.length),
    };
  },
});

export const getFleetForecast = tool({
  description: 'Get fleet-wide predictive risk forecast including expected events this week, high-risk driver count, top risk factors, and actionable recommendations. Use when asked about fleet forecast, predicted incidents, "what should we expect this week?", or fleet-level predictive safety.',
  parameters: z.object({}),
  execute: async () => {
    const forecast = getFleetRiskForecast();
    const trends = detectDeteriorating();
    const decliningDrivers = trends.filter(
      (t) => t.trendDirection === 'declining' || t.trendDirection === 'rapidly_declining',
    );

    return {
      ...forecast,
      deterioratingDrivers: decliningDrivers.length,
      topDeteriorating: decliningDrivers.slice(0, 5).map((t) => ({
        driverId: t.driverId,
        driverName: t.driverName,
        trendDirection: t.trendDirection,
        weekOverWeekChange: t.weekOverWeekChange,
      })),
      generatedAt: new Date().toISOString(),
    };
  },
});
