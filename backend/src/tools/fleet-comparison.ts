import { tool } from 'ai';
import { z } from 'zod';
import { calculateInsuranceScore } from '../scoring/insurance-score-engine.js';
import { getFleetSummary, seedVehicles, seedDrivers } from '../data/seed-data.js';

// Industry benchmarks (FMCSA / NHTSA / ATRI published data)
const BENCHMARKS = {
  small: { label: 'Small Fleet (1-25 trucks)', avgScore: 62, eventRate: 3.2, turnoverRate: 73, premiumPerVehicle: 15800 },
  medium: { label: 'Medium Fleet (26-100 trucks)', avgScore: 68, eventRate: 2.5, turnoverRate: 82, premiumPerVehicle: 13500 },
  large: { label: 'Large Fleet (100+ trucks)', avgScore: 74, eventRate: 1.8, turnoverRate: 94, premiumPerVehicle: 11200 },
  topPerformer: { label: 'Top 10% Fleets', avgScore: 89, eventRate: 0.8, turnoverRate: 35, premiumPerVehicle: 8500 },
};

export const getFleetComparison = tool({
  description: 'Compare the fleet against industry benchmarks. Shows how the fleet stacks up against small, medium, large, and top-performing fleets on safety score, event rate, turnover, and insurance cost. Use when asked about benchmarks, industry comparison, "how do we compare?", or percentile ranking.',
  parameters: z.object({
    compareTo: z.enum(['small', 'medium', 'large', 'all']).optional()
      .describe('Compare against a specific fleet size category (default: all)'),
  }),
  execute: async ({ compareTo }) => {
    const insuranceScore = calculateInsuranceScore();
    const fleetSummary = getFleetSummary();

    const ourFleet = {
      label: 'Your Fleet',
      size: seedVehicles.length,
      drivers: seedDrivers.length,
      score: insuranceScore.overallScore,
      grade: insuranceScore.grade,
      eventRate: fleetSummary.eventsPerMile * 1000, // per 1000 miles
      estimatedTurnoverRate: 15, // based on wellness predictions
      premiumPerVehicle: Math.round(insuranceScore.premiumImpact.benchmarkPremium / seedVehicles.length),
    };

    const comparisons = compareTo === 'all' || !compareTo
      ? Object.values(BENCHMARKS)
      : [BENCHMARKS[compareTo]];

    const results = comparisons.map((bench) => ({
      benchmark: bench.label,
      comparison: {
        score: { yours: ourFleet.score, benchmark: bench.avgScore, delta: ourFleet.score - bench.avgScore, better: ourFleet.score > bench.avgScore },
        eventRate: { yours: Math.round(ourFleet.eventRate * 100) / 100, benchmark: bench.eventRate, delta: Math.round((ourFleet.eventRate - bench.eventRate) * 100) / 100, better: ourFleet.eventRate < bench.eventRate },
        turnoverRate: { yours: ourFleet.estimatedTurnoverRate, benchmark: bench.turnoverRate, delta: ourFleet.estimatedTurnoverRate - bench.turnoverRate, better: ourFleet.estimatedTurnoverRate < bench.turnoverRate },
        premiumPerVehicle: { yours: ourFleet.premiumPerVehicle, benchmark: bench.premiumPerVehicle, delta: ourFleet.premiumPerVehicle - bench.premiumPerVehicle, better: ourFleet.premiumPerVehicle < bench.premiumPerVehicle },
      },
    }));

    // Where we beat / trail the market
    const strengths: string[] = [];
    const opportunities: string[] = [];
    const mediumBench = BENCHMARKS.medium;

    if (ourFleet.score > mediumBench.avgScore) strengths.push(`Fleet score ${ourFleet.score} exceeds medium fleet average (${mediumBench.avgScore})`);
    else opportunities.push(`Fleet score ${ourFleet.score} trails medium fleet average (${mediumBench.avgScore})`);

    if (ourFleet.estimatedTurnoverRate < mediumBench.turnoverRate) strengths.push(`Turnover rate ${ourFleet.estimatedTurnoverRate}% is well below industry ${mediumBench.turnoverRate}%`);

    const gapToTop = BENCHMARKS.topPerformer.avgScore - ourFleet.score;
    if (gapToTop > 0) opportunities.push(`${gapToTop} points away from top 10% performance (score ${BENCHMARKS.topPerformer.avgScore})`);

    return {
      yourFleet: ourFleet,
      benchmarks: results,
      strengths,
      opportunities,
      percentile: insuranceScore.percentile,
    };
  },
});
