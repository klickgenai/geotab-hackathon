import { tool } from 'ai';
import { z } from 'zod';
import { calculateDriverRisk, calculateAllDriverRisks } from '../scoring/driver-risk-engine.js';
import { predictWellness } from '../scoring/wellness-predictor.js';
import { calculateInsuranceScore } from '../scoring/insurance-score-engine.js';
import { seedDrivers } from '../data/seed-data.js';

export const getCoachingRecommendations = tool({
  description: 'Get prioritized coaching and intervention recommendations for drivers or the fleet. Each recommendation includes expected score improvement and dollar impact. Use when asked about coaching, training, interventions, "what should we do?", or "how do we improve?"',
  parameters: z.object({
    driverId: z.string().optional().describe('Specific driver ID for targeted recommendations'),
    driverName: z.string().optional().describe('Search by name'),
    focus: z.enum(['risk', 'wellness', 'score', 'all']).optional().describe('Focus area (default: all)'),
  }),
  execute: async ({ driverId, driverName, focus }) => {
    if (!driverId && driverName) {
      const match = seedDrivers.find((d) => d.name.toLowerCase().includes(driverName.toLowerCase()));
      if (match) driverId = match.id;
    }

    if (driverId) {
      return getDriverRecommendations(driverId);
    }

    return getFleetRecommendations(focus || 'all');
  },
});

function getDriverRecommendations(driverId: string) {
  const risk = calculateDriverRisk(driverId);
  const wellness = predictWellness(driverId);
  if (!risk || !wellness) return { error: 'Driver not found' };

  const actions: CoachingAction[] = [];

  // Risk-based recommendations
  if (risk.tier === 'critical' || risk.tier === 'high') {
    actions.push({
      priority: 1,
      action: 'Immediate ride-along with safety supervisor',
      expectedScoreImprovement: 15,
      expectedCostSavings: Math.round(risk.annualizedCost * 0.35),
      timeline: '1 week',
      category: 'risk',
    });
  }

  if (risk.components.eventFrequency.eventsPerThousandMiles > 5) {
    actions.push({
      priority: 2,
      action: 'Enroll in Smith System defensive driving course',
      expectedScoreImprovement: 10,
      expectedCostSavings: Math.round(risk.annualizedCost * 0.25),
      timeline: '2 weeks',
      category: 'risk',
    });
  }

  if (risk.topEventTypes[0]?.type === 'speeding') {
    actions.push({
      priority: 2,
      action: 'Implement speed governor at 68 mph',
      expectedScoreImprovement: 8,
      expectedCostSavings: 3500,
      timeline: 'Immediate',
      category: 'risk',
    });
  }

  if (wellness.burnoutRisk === 'high') {
    actions.push({
      priority: 1,
      action: 'Mandatory wellness check-in + schedule review',
      expectedScoreImprovement: 0,
      expectedCostSavings: wellness.retentionCost,
      timeline: 'This week',
      category: 'wellness',
    });
    actions.push({
      priority: 2,
      action: 'Reduce weekly hours to max 55 and ensure 10hr rest minimum',
      expectedScoreImprovement: 5,
      expectedCostSavings: Math.round(wellness.retentionCost * 0.5),
      timeline: '2 weeks',
      category: 'wellness',
    });
  }

  if (wellness.consecutiveLongDays >= 5) {
    actions.push({
      priority: 1,
      action: 'Schedule 34-hour restart within next 48 hours',
      expectedScoreImprovement: 3,
      expectedCostSavings: 5000,
      timeline: 'Immediate',
      category: 'wellness',
    });
  }

  if (actions.length === 0) {
    actions.push({
      priority: 3,
      action: 'Continue monitoring -- no interventions needed',
      expectedScoreImprovement: 0,
      expectedCostSavings: 0,
      timeline: 'Ongoing',
      category: 'risk',
    });
  }

  return {
    driverId,
    driverName: risk.driverName,
    currentRiskScore: risk.riskScore,
    currentRiskTier: risk.tier,
    burnoutRisk: wellness.burnoutRisk,
    totalPotentialSavings: actions.reduce((s, a) => s + a.expectedCostSavings, 0),
    actions: actions.sort((a, b) => a.priority - b.priority),
  };
}

function getFleetRecommendations(focus: string) {
  const insuranceScore = calculateInsuranceScore();
  const allRisks = calculateAllDriverRisks();
  const highRisk = allRisks.filter((r) => r.tier === 'high' || r.tier === 'critical');

  const actions: CoachingAction[] = [];

  // Fleet-level actions
  if (highRisk.length > 0) {
    actions.push({
      priority: 1,
      action: `Create intervention plans for ${highRisk.length} high-risk drivers (${highRisk.map((d) => d.driverName).join(', ')})`,
      expectedScoreImprovement: 5,
      expectedCostSavings: highRisk.reduce((s, d) => s + Math.round(d.annualizedCost * 0.35), 0),
      timeline: '2 weeks',
      category: 'risk',
    });
  }

  if (insuranceScore.components.compliance.score < 70) {
    actions.push({
      priority: 2,
      action: 'Fleet-wide compliance refresh training (speeding, seatbelt, HOS)',
      expectedScoreImprovement: 8,
      expectedCostSavings: Math.round(insuranceScore.premiumImpact.estimatedAnnualSavings * 0.15),
      timeline: '1 month',
      category: 'score',
    });
  }

  actions.push({
    priority: 2,
    action: 'Implement monthly driver scorecards with peer benchmarking',
    expectedScoreImprovement: 3,
    expectedCostSavings: 8000,
    timeline: '1 month',
    category: 'score',
  });

  actions.push({
    priority: 3,
    action: 'Share FleetShield AI report with insurance broker for premium renegotiation',
    expectedScoreImprovement: 0,
    expectedCostSavings: insuranceScore.premiumImpact.estimatedAnnualSavings,
    timeline: 'Next renewal',
    category: 'score',
  });

  return {
    currentFleetScore: insuranceScore.overallScore,
    currentGrade: insuranceScore.grade,
    highRiskDrivers: highRisk.length,
    totalPotentialSavings: actions.reduce((s, a) => s + a.expectedCostSavings, 0),
    actions: actions.sort((a, b) => a.priority - b.priority),
  };
}

export interface CoachingAction {
  priority: number;
  action: string;
  expectedScoreImprovement: number;
  expectedCostSavings: number;
  timeline: string;
  category: string;
}
