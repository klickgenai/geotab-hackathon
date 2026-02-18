/**
 * What-If Insurance Simulator
 * Models the impact of safety interventions on insurance premiums.
 */

import { calculateInsuranceScore } from './insurance-score-engine.js';
import { seedVehicles } from '../data/seed-data.js';

export interface WhatIfScenario {
  id: string;
  name: string;
  description: string;
  adjustments: {
    harshBrakingReduction?: number;
    speedingReduction?: number;
    idlingReduction?: number;
    nightDrivingReduction?: number;
    complianceImprovement?: number;
    maintenanceScoreBoost?: number;
  };
}

export interface WhatIfResult {
  scenarioId: string;
  scenarioName: string;
  currentScore: number;
  projectedScore: number;
  scoreDelta: number;
  currentGrade: string;
  projectedGrade: string;
  currentPremium: number;
  projectedPremium: number;
  annualSavings: number;
  implementationDifficulty: 'easy' | 'moderate' | 'hard';
  timeToImpact: string;
  recommendations: string[];
}

function scoreToGrade(score: number): string {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'C+';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function scoreToPremium(score: number): number {
  const benchmarkPremium = seedVehicles.length * 14200;
  const percentChange = (score - 50) * 0.3;
  return Math.round(benchmarkPremium * (1 - percentChange / 100));
}

export function getDefaultScenarios(): WhatIfScenario[] {
  return [
    {
      id: 'harsh-braking',
      name: 'Reduce Harsh Braking 20%',
      description: 'Install forward collision warning systems and conduct defensive driving training to reduce harsh braking events by 20%.',
      adjustments: { harshBrakingReduction: 20 },
    },
    {
      id: 'speed-compliance',
      name: 'Speed Compliance Program',
      description: 'Implement speed governors and real-time alerts to reduce speeding events by 30%. Add speed coaching program.',
      adjustments: { speedingReduction: 30, complianceImprovement: 10 },
    },
    {
      id: 'anti-idle',
      name: 'Anti-Idle Initiative',
      description: 'Deploy APU systems and idle-shutdown technology. Train drivers on anti-idle practices to cut idling by 40%.',
      adjustments: { idlingReduction: 40 },
    },
    {
      id: 'night-driving',
      name: 'Night Driving Limits',
      description: 'Restructure scheduling to reduce night driving by 50%. Implement fatigue detection cameras.',
      adjustments: { nightDrivingReduction: 50 },
    },
    {
      id: 'full-package',
      name: 'Full Safety Package',
      description: 'Comprehensive program: collision avoidance, speed governance, anti-idle, night limits, quarterly maintenance boost, and compliance training.',
      adjustments: {
        harshBrakingReduction: 25,
        speedingReduction: 35,
        idlingReduction: 30,
        nightDrivingReduction: 40,
        complianceImprovement: 15,
        maintenanceScoreBoost: 10,
      },
    },
  ];
}

export function simulateWhatIf(scenarios: WhatIfScenario[]): WhatIfResult[] {
  const currentInsurance = calculateInsuranceScore();
  const currentScore = currentInsurance.overallScore;
  const currentPremium = scoreToPremium(currentScore);

  return scenarios.map((scenario) => {
    const adj = scenario.adjustments;

    // Calculate projected score improvements
    let scoreBoost = 0;

    // Harsh braking reduction improves safe driving component
    if (adj.harshBrakingReduction) {
      scoreBoost += (adj.harshBrakingReduction / 100) * 0.35 * 15; // Up to 5.25 points
    }

    // Speeding reduction improves compliance component
    if (adj.speedingReduction) {
      scoreBoost += (adj.speedingReduction / 100) * 0.25 * 18; // Up to 4.5 points
    }

    // Idling reduction improves maintenance perception
    if (adj.idlingReduction) {
      scoreBoost += (adj.idlingReduction / 100) * 0.20 * 8; // Up to 1.6 points
    }

    // Night driving reduction improves safe driving
    if (adj.nightDrivingReduction) {
      scoreBoost += (adj.nightDrivingReduction / 100) * 0.35 * 6; // Up to 2.1 points
    }

    // Direct compliance improvement
    if (adj.complianceImprovement) {
      scoreBoost += (adj.complianceImprovement / 100) * 0.25 * 20; // Up to 5 points
    }

    // Maintenance score boost
    if (adj.maintenanceScoreBoost) {
      scoreBoost += (adj.maintenanceScoreBoost / 100) * 0.20 * 20; // Up to 4 points
    }

    const projectedScore = Math.min(100, Math.round(currentScore + scoreBoost));
    const projectedPremium = scoreToPremium(projectedScore);
    const annualSavings = Math.max(0, currentPremium - projectedPremium);

    // Determine difficulty
    const adjustmentCount = Object.values(adj).filter((v) => v && v > 0).length;
    const maxAdjustment = Math.max(...Object.values(adj).filter((v): v is number => typeof v === 'number' && v > 0), 0);
    const difficulty: WhatIfResult['implementationDifficulty'] =
      adjustmentCount >= 4 || maxAdjustment >= 40 ? 'hard' :
      adjustmentCount >= 2 || maxAdjustment >= 25 ? 'moderate' : 'easy';

    const timeToImpact =
      difficulty === 'hard' ? '6-12 months' :
      difficulty === 'moderate' ? '3-6 months' : '1-3 months';

    const recommendations: string[] = [];
    if (adj.harshBrakingReduction) recommendations.push('Install forward collision warning on all vehicles');
    if (adj.speedingReduction) recommendations.push('Deploy speed governors set to posted speed limits');
    if (adj.idlingReduction) recommendations.push('Install APU systems on Class 8 tractors');
    if (adj.nightDrivingReduction) recommendations.push('Restructure dispatch scheduling to minimize night shifts');
    if (adj.complianceImprovement) recommendations.push('Quarterly compliance refresher training');
    if (adj.maintenanceScoreBoost) recommendations.push('Implement preventive maintenance scheduling system');

    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      currentScore,
      projectedScore,
      scoreDelta: projectedScore - currentScore,
      currentGrade: scoreToGrade(currentScore),
      projectedGrade: scoreToGrade(projectedScore),
      currentPremium,
      projectedPremium,
      annualSavings,
      implementationDifficulty: difficulty,
      timeToImpact,
      recommendations,
    };
  });
}
