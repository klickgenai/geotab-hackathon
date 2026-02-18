import { tool } from 'ai';
import { z } from 'zod';
import { calculateInsuranceScore } from '../scoring/insurance-score-engine.js';

export const getFleetInsuranceScore = tool({
  description: 'Calculate the Fleet Insurability Score -- a comprehensive 0-100 score that tells insurance underwriters how safe this fleet is. Returns overall score, letter grade, component breakdown (Safe Driving, Compliance, Maintenance, Driver Quality), premium impact in dollars, industry percentile, trend, and recommendations. This is the hero metric of FleetShield AI.',
  parameters: z.object({
    includeDetails: z.boolean().optional().describe('Include full component details (default: true)'),
  }),
  execute: async ({ includeDetails }) => {
    const score = calculateInsuranceScore();
    if (includeDetails === false) {
      return {
        overallScore: score.overallScore,
        grade: score.grade,
        premiumImpact: score.premiumImpact,
        percentile: score.percentile,
        trend: score.trend,
      };
    }
    return score;
  },
});
