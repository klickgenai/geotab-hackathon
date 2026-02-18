/**
 * Fleet Insurability Score Engine
 * Computes a 0-100 fleet-level score for insurance underwriting.
 *
 * Components:
 *   Safe Driving:  35% -- event frequency, severity, trends
 *   Compliance:    25% -- HOS, seatbelt, speed compliance
 *   Maintenance:   20% -- fault codes, age, mileage
 *   Driver Quality: 20% -- tenure, training, risk distribution
 *
 * Grade scale: A+ (95-100), A (90-94), B+ (85-89), B (75-84), C+ (70-74),
 *              C (60-69), D (50-59), F (<50)
 *
 * Premium impact: (score - 50) * 0.3% per point above/below 50.
 */

import { seedDrivers, seedVehicles, seedSafetyEvents, seedFleetKPIs, seedTripDays, type SeedSafetyEvent } from '../data/seed-data.js';

export interface InsuranceScoreResult {
  overallScore: number;
  grade: string;
  components: {
    safeDriving: ComponentScore;
    compliance: ComponentScore;
    maintenance: ComponentScore;
    driverQuality: ComponentScore;
  };
  premiumImpact: {
    percentChange: number;
    estimatedAnnualSavings: number;
    benchmarkPremium: number;
  };
  percentile: number;
  trend: 'improving' | 'stable' | 'declining';
  recommendations: string[];
}

export interface ComponentScore {
  score: number;
  weight: number;
  weightedScore: number;
  details: Record<string, number | string>;
}

export function calculateInsuranceScore(): InsuranceScoreResult {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 86400000;
  const sixtyDaysAgo = now - 60 * 86400000;

  // Recent data
  const events30 = seedSafetyEvents.filter((e) => new Date(e.dateTime).getTime() > thirtyDaysAgo);
  const eventsPrev30 = seedSafetyEvents.filter((e) => {
    const t = new Date(e.dateTime).getTime();
    return t > sixtyDaysAgo && t <= thirtyDaysAgo;
  });

  const trips30 = seedTripDays.filter((t) => new Date(t.date).getTime() > thirtyDaysAgo);
  const kpis30 = seedFleetKPIs.filter((k) => new Date(k.date).getTime() > thirtyDaysAgo);
  const totalDistance = kpis30.reduce((s, k) => s + k.totalDistance, 0);
  const totalDistanceMiles = totalDistance * 0.621371;

  // === SAFE DRIVING (35%) ===
  const eventRate = totalDistanceMiles > 0 ? (events30.length / totalDistanceMiles) * 1000 : 0;
  const severityScore = computeSeverityScore(events30);
  const trendDelta = events30.length - eventsPrev30.length;
  const trendScore = trendDelta <= -5 ? 95 : trendDelta <= 0 ? 80 : trendDelta <= 5 ? 65 : 40;

  const safeDrivingRaw = Math.max(0, Math.min(100,
    100 - eventRate * 15 // Lower rate = higher score
    + severityScore * 0.3
    + trendScore * 0.2
  ));
  const safeDrivingScore = clamp(safeDrivingRaw, 0, 100);

  // === COMPLIANCE (25%) ===
  const driverCount = seedDrivers.length;
  const seatbeltEvents = events30.filter((e) => e.type === 'seatbelt').length;
  const speedingEvents = events30.filter((e) => e.type === 'speeding').length;
  const avgDailyHours = trips30.length > 0
    ? trips30.reduce((s, t) => s + t.drivingHours, 0) / trips30.length
    : 0;
  const hosViolations = trips30.filter((t) => t.drivingHours > 11).length;

  // Normalize per driver for fleet-fair scoring
  const seatbeltRate = seatbeltEvents / Math.max(driverCount, 1);
  const speedRate = speedingEvents / Math.max(driverCount, 1);
  const hosRate = hosViolations / Math.max(driverCount, 1);
  const seatbeltScore = clamp(100 - seatbeltRate * 25, 0, 100);
  const speedScore = clamp(100 - speedRate * 20, 0, 100);
  const hosScore = clamp(100 - hosRate * 15, 0, 100);
  const complianceScore = clamp((seatbeltScore * 0.3 + speedScore * 0.4 + hosScore * 0.3), 0, 100);

  // === MAINTENANCE (20%) ===
  const avgAge = seedVehicles.reduce((s, v) => s + (new Date().getFullYear() - v.year), 0) / seedVehicles.length;
  const avgOdometer = seedVehicles.reduce((s, v) => s + v.odometer, 0) / seedVehicles.length;
  const ageScore = Math.max(0, 100 - (avgAge - 1) * 12);
  const mileageScore = Math.max(0, 100 - (avgOdometer / 400000) * 50);
  const maintenanceScore = clamp((ageScore * 0.5 + mileageScore * 0.5), 0, 100);

  // === DRIVER QUALITY (20%) ===
  const avgTenure = seedDrivers.reduce((s, d) => s + d.tenureYears, 0) / seedDrivers.length;
  const riskDist = {
    low: seedDrivers.filter((d) => d.riskProfile === 'low').length / seedDrivers.length,
    moderate: seedDrivers.filter((d) => d.riskProfile === 'moderate').length / seedDrivers.length,
    high: seedDrivers.filter((d) => d.riskProfile === 'high').length / seedDrivers.length,
    critical: seedDrivers.filter((d) => d.riskProfile === 'critical').length / seedDrivers.length,
  };
  const tenureScore = Math.min(100, avgTenure * 15);
  const riskScore = (riskDist.low * 100 + riskDist.moderate * 60 + riskDist.high * 30 + riskDist.critical * 10);
  const driverQualityScore = clamp((tenureScore * 0.4 + riskScore * 0.6), 0, 100);

  // === WEIGHTED TOTAL ===
  const overallScore = Math.round(
    safeDrivingScore * 0.35 +
    complianceScore * 0.25 +
    maintenanceScore * 0.20 +
    driverQualityScore * 0.20,
  );

  // Grade
  const grade = scoreToGrade(overallScore);

  // Premium impact: each point above 50 saves 0.3% of benchmark premium
  const benchmarkPremium = seedVehicles.length * 14200; // $14,200/vehicle avg Class 8 commercial
  const percentChange = -((overallScore - 50) * 0.3);
  const estimatedAnnualSavings = Math.round(benchmarkPremium * Math.abs(percentChange) / 100);

  // Percentile (simulated based on score)
  const percentile = Math.min(99, Math.max(1, Math.round(overallScore * 1.1 - 10)));

  // Trend
  const trend = trendDelta <= -3 ? 'improving' : trendDelta >= 3 ? 'declining' : 'stable';

  // Recommendations
  const recommendations: string[] = [];
  if (speedingEvents > 10) recommendations.push('Implement speed governor policy to reduce speeding events');
  if (seatbeltEvents > 5) recommendations.push('Enforce seatbelt compliance training program');
  if (hosViolations > 5) recommendations.push('Review scheduling to prevent HOS violations');
  if (riskDist.critical > 0) recommendations.push('Create intervention plan for critical-risk drivers');
  if (riskDist.high > 0.1) recommendations.push('Implement targeted coaching for high-risk drivers');
  if (avgAge > 4) recommendations.push('Consider fleet renewal for vehicles over 4 years old');
  if (recommendations.length === 0) recommendations.push('Maintain current safety programs -- fleet performing well');

  return {
    overallScore,
    grade,
    components: {
      safeDriving: {
        score: Math.round(safeDrivingScore),
        weight: 0.35,
        weightedScore: Math.round(safeDrivingScore * 0.35),
        details: {
          eventRate: Math.round(eventRate * 100) / 100,
          totalEvents: events30.length,
          severityScore: Math.round(severityScore),
          trendDelta,
        },
      },
      compliance: {
        score: Math.round(complianceScore),
        weight: 0.25,
        weightedScore: Math.round(complianceScore * 0.25),
        details: {
          seatbeltViolations: seatbeltEvents,
          speedingEvents,
          hosViolations,
          avgDailyHours: Math.round(avgDailyHours * 10) / 10,
        },
      },
      maintenance: {
        score: Math.round(maintenanceScore),
        weight: 0.20,
        weightedScore: Math.round(maintenanceScore * 0.20),
        details: {
          avgVehicleAge: Math.round(avgAge * 10) / 10,
          avgOdometer: Math.round(avgOdometer),
          fleetSize: seedVehicles.length,
        },
      },
      driverQuality: {
        score: Math.round(driverQualityScore),
        weight: 0.20,
        weightedScore: Math.round(driverQualityScore * 0.20),
        details: {
          avgTenure: Math.round(avgTenure * 10) / 10,
          lowRiskPercent: `${Math.round(riskDist.low * 100)}%`,
          highRiskPercent: `${Math.round((riskDist.high + riskDist.critical) * 100)}%`,
          totalDrivers: seedDrivers.length,
        },
      },
    },
    premiumImpact: {
      percentChange: Math.round(percentChange * 10) / 10,
      estimatedAnnualSavings,
      benchmarkPremium,
    },
    percentile,
    trend,
    recommendations,
  };
}

function computeSeverityScore(events: SeedSafetyEvent[]): number {
  if (events.length === 0) return 100;
  const weights = { low: 1, medium: 3, high: 7, critical: 15 };
  const totalWeight = events.reduce((s, e) => s + weights[e.severity], 0);
  const avgWeight = totalWeight / events.length;
  return Math.max(0, 100 - avgWeight * 10);
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

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}
