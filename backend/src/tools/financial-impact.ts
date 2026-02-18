import { tool } from 'ai';
import { z } from 'zod';
import { calculateInsuranceScore } from '../scoring/insurance-score-engine.js';
import { calculateAllDriverRisks } from '../scoring/driver-risk-engine.js';
import { getFleetWellnessSummary } from '../scoring/wellness-predictor.js';
import { seedVehicles, seedDrivers } from '../data/seed-data.js';

export const getFinancialImpact = tool({
  description: 'Quantify the financial impact of fleet risk in dollars. Calculates insurance premium savings, driver retention savings, accident cost avoidance, and total ROI. Every number is tied to a specific data point. Use when asked about money, savings, ROI, cost, financial impact, or "how much can we save?"',
  parameters: z.object({
    category: z.enum(['all', 'insurance', 'retention', 'accidents', 'fuel']).optional()
      .describe('Focus on a specific cost category (default: all)'),
  }),
  execute: async ({ category }) => {
    const insuranceScore = calculateInsuranceScore();
    const driverRisks = calculateAllDriverRisks();
    const wellnessSummary = getFleetWellnessSummary();

    const fleetSize = seedVehicles.length;
    const driverCount = seedDrivers.length;

    // === INSURANCE SAVINGS ===
    const insurance = {
      currentBenchmarkPremium: insuranceScore.premiumImpact.benchmarkPremium,
      fleetScore: insuranceScore.overallScore,
      grade: insuranceScore.grade,
      premiumReductionPercent: Math.abs(insuranceScore.premiumImpact.percentChange),
      annualSavings: insuranceScore.premiumImpact.estimatedAnnualSavings,
      methodology: 'Each score point above 50 reduces premium by 0.3%. Based on $9,500/vehicle industry benchmark.',
    };

    // === RETENTION SAVINGS ===
    const retention = {
      driversAtRisk: wellnessSummary.highBurnoutRisk,
      replacementCostPerDriver: 35000,
      totalRetentionCostAtRisk: wellnessSummary.totalRetentionCostAtRisk,
      earlyInterventionSavingsRate: 0.6, // 60% of at-risk drivers retained with intervention
      annualSavings: Math.round(wellnessSummary.totalRetentionCostAtRisk * 0.6),
      methodology: 'Average driver replacement cost $35K (recruiting + training + productivity loss). Early intervention retains ~60%.',
    };

    // === ACCIDENT COST AVOIDANCE ===
    const highRiskDrivers = driverRisks.filter((d) => d.tier === 'high' || d.tier === 'critical');
    const totalRiskCost = driverRisks.reduce((s, d) => s + d.annualizedCost, 0);
    const reducibleCost = Math.round(totalRiskCost * 0.4); // 40% reduction with coaching
    const accidents = {
      highRiskDriverCount: highRiskDrivers.length,
      totalAnnualizedRiskCost: totalRiskCost,
      coachingEffectivenessRate: 0.4,
      annualSavings: reducibleCost,
      nuclearVerdictExposure: highRiskDrivers.length * 2500000, // $2.5M avg nuclear verdict
      methodology: 'Based on annualized claims cost by risk tier. Targeted coaching reduces events ~40%. Nuclear verdict exposure: $2.5M per high-risk driver.',
    };

    // === FUEL SAVINGS (from reduced idling) ===
    const fuel = {
      currentIdlingPercent: 13.1,
      targetIdlingPercent: 8,
      gallonsSavedPerYear: Math.round(fleetSize * 365 * 0.8 * (13.1 - 8) / 100),
      costPerGallon: 3.85,
      annualSavings: Math.round(fleetSize * 365 * 0.8 * (13.1 - 8) / 100 * 3.85),
      methodology: 'Reducing idling from 13.1% to 8% target. 0.8 gal/hr idle rate, $3.85/gal avg diesel.',
    };

    // === TOTAL ROI ===
    const totalSavings = insurance.annualSavings + retention.annualSavings + accidents.annualSavings + fuel.annualSavings;
    const roi = {
      totalAnnualSavings: totalSavings,
      breakdown: {
        insurance: insurance.annualSavings,
        retention: retention.annualSavings,
        accidents: accidents.annualSavings,
        fuel: fuel.annualSavings,
      },
      perVehicleSavings: Math.round(totalSavings / fleetSize),
      perDriverSavings: Math.round(totalSavings / driverCount),
      fleetSize,
      driverCount,
    };

    if (category === 'insurance') return { insurance, roi: { totalAnnualSavings: insurance.annualSavings } };
    if (category === 'retention') return { retention, roi: { totalAnnualSavings: retention.annualSavings } };
    if (category === 'accidents') return { accidents, roi: { totalAnnualSavings: accidents.annualSavings } };
    if (category === 'fuel') return { fuel, roi: { totalAnnualSavings: fuel.annualSavings } };

    return { insurance, retention, accidents, fuel, roi };
  },
});
