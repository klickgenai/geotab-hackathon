import { tool } from 'ai';
import { z } from 'zod';
import { calculateGreenDashboard } from '../scoring/green-score-engine.js';

export const getGreenFleetMetrics = tool({
  description: 'Get fleet sustainability and environmental impact metrics including carbon footprint, fuel efficiency, idle waste, EV readiness, green scores, and actionable recommendations. Use this when the user asks about sustainability, carbon emissions, CO2, fuel efficiency, green fleet, EV transition, idle waste, or environmental impact.',
  parameters: z.object({
    focus: z.enum(['overview', 'carbon', 'efficiency', 'idle', 'ev', 'recommendations', 'drivers']).optional()
      .describe('Specific sustainability area to focus on (default: overview with all metrics)'),
  }),
  execute: async ({ focus }) => {
    const dashboard = calculateGreenDashboard();

    switch (focus) {
      case 'carbon':
        return {
          carbonFootprint: dashboard.carbonFootprint,
          fleetScore: dashboard.fleetScore,
          trend: dashboard.monthlyTrend,
          generatedAt: new Date().toISOString(),
        };
      case 'efficiency':
        return {
          fuelEfficiency: dashboard.fuelEfficiency,
          topDrivers: dashboard.driverGreenRankings.slice(0, 5),
          generatedAt: new Date().toISOString(),
        };
      case 'idle':
        return {
          idleWaste: dashboard.idleWaste,
          recommendations: dashboard.recommendations.filter(r => r.category === 'idle'),
          generatedAt: new Date().toISOString(),
        };
      case 'ev':
        return {
          evReadiness: dashboard.evReadiness,
          recommendations: dashboard.recommendations.filter(r => r.category === 'ev'),
          generatedAt: new Date().toISOString(),
        };
      case 'recommendations':
        return {
          recommendations: dashboard.recommendations,
          totalSavingsOpportunity: dashboard.recommendations.reduce((s, r) => s + r.projectedSavings, 0),
          totalCO2ReductionOpportunity: dashboard.recommendations.reduce((s, r) => s + r.projectedCO2Reduction, 0),
          generatedAt: new Date().toISOString(),
        };
      case 'drivers':
        return {
          driverGreenRankings: dashboard.driverGreenRankings,
          generatedAt: new Date().toISOString(),
        };
      default:
        return {
          fleetScore: dashboard.fleetScore,
          carbonFootprint: dashboard.carbonFootprint,
          fuelEfficiency: dashboard.fuelEfficiency,
          idleWaste: { ...dashboard.idleWaste, topOffenders: dashboard.idleWaste.topOffenders.slice(0, 3) },
          evReadiness: { totalCandidates: dashboard.evReadiness.totalCandidates, projectedAnnualSavings: dashboard.evReadiness.projectedAnnualSavings, projectedCO2Reduction: dashboard.evReadiness.projectedCO2Reduction },
          topRecommendations: dashboard.recommendations.slice(0, 3),
          generatedAt: new Date().toISOString(),
        };
    }
  },
});
