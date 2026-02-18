/**
 * Driver Risk Score Engine
 * Per-driver risk scoring (0-100, lower = better / safer).
 *
 * Components:
 *   Event Frequency: 40% -- events per 1000 miles
 *   Severity:        25% -- weighted severity of events
 *   Pattern:         20% -- recurring event types, time-of-day patterns
 *   Trend:           15% -- improving or worsening over time
 *
 * Risk tiers: low (0-25), moderate (26-50), high (51-75), critical (76-100)
 */

import {
  seedDrivers,
  seedSafetyEvents,
  seedTripDays,
  type SeedDriver,
  type SeedSafetyEvent,
  type SeedTripDay,
} from '../data/seed-data.js';

export interface DriverRiskResult {
  driverId: string;
  driverName: string;
  riskScore: number;
  tier: 'low' | 'moderate' | 'high' | 'critical';
  components: {
    eventFrequency: { score: number; weight: number; eventsPerThousandMiles: number };
    severity: { score: number; weight: number; weightedAvg: number };
    pattern: { score: number; weight: number; topPatterns: string[] };
    trend: { score: number; weight: number; direction: string; delta: number };
  };
  topEventTypes: { type: string; count: number }[];
  annualizedCost: number;
  recommendations: string[];
}

export function calculateDriverRisk(driverId: string): DriverRiskResult | null {
  const driver = seedDrivers.find((d) => d.id === driverId);
  if (!driver) return null;

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 86400000;
  const sixtyDaysAgo = now - 60 * 86400000;

  const events30 = seedSafetyEvents.filter(
    (e) => e.driverId === driverId && new Date(e.dateTime).getTime() > thirtyDaysAgo,
  );
  const eventsPrev30 = seedSafetyEvents.filter((e) => {
    const t = new Date(e.dateTime).getTime();
    return e.driverId === driverId && t > sixtyDaysAgo && t <= thirtyDaysAgo;
  });
  const trips30 = seedTripDays.filter(
    (t) => t.driverId === driverId && new Date(t.date).getTime() > thirtyDaysAgo,
  );

  const totalDistanceKm = trips30.reduce((s, t) => s + t.totalDistance, 0);
  const totalDistanceMiles = totalDistanceKm * 0.621371;

  // === EVENT FREQUENCY (40%) ===
  const eventsPerThousandMiles = totalDistanceMiles > 0 ? (events30.length / totalDistanceMiles) * 1000 : 0;
  // Scale: 0 events/1000mi = 0 risk, 10+ = 100 risk
  const frequencyScore = Math.min(100, eventsPerThousandMiles * 10);

  // === SEVERITY (25%) ===
  const severityWeights = { low: 1, medium: 3, high: 7, critical: 15 };
  const totalSeverity = events30.reduce((s, e) => s + severityWeights[e.severity], 0);
  const avgSeverity = events30.length > 0 ? totalSeverity / events30.length : 0;
  // Scale: avg 1 = low risk, avg 8+ = high risk
  const severityScore = Math.min(100, avgSeverity * 12);

  // === PATTERN (20%) ===
  const typeCounts: Record<string, number> = {};
  events30.forEach((e) => { typeCounts[e.type] = (typeCounts[e.type] || 0) + 1; });
  const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
  const topType = sortedTypes[0];
  // Pattern score: concentration in one type = higher risk (habitual behavior)
  const concentration = topType && events30.length > 0 ? topType[1] / events30.length : 0;
  const diversityPenalty = sortedTypes.length <= 2 && events30.length > 5 ? 20 : 0;
  const patternScore = Math.min(100, concentration * 60 + diversityPenalty);

  const topPatterns: string[] = [];
  if (concentration > 0.4 && topType) topPatterns.push(`Habitual ${topType[0].replace(/_/g, ' ')}`);
  const nightTrips = trips30.filter((t) => t.nightDrivingHours > 2);
  if (nightTrips.length > trips30.length * 0.3) topPatterns.push('Frequent night driving');
  const longDays = trips30.filter((t) => t.drivingHours > 10);
  if (longDays.length > trips30.length * 0.4) topPatterns.push('Excessive driving hours');
  if (topPatterns.length === 0) topPatterns.push('No significant patterns');

  // === TREND (15%) ===
  const delta = events30.length - eventsPrev30.length;
  // Positive delta = worsening = higher risk
  const trendScore = delta >= 10 ? 100 : delta >= 5 ? 75 : delta >= 0 ? 40 : delta >= -5 ? 20 : 0;
  const direction = delta > 3 ? 'worsening' : delta < -3 ? 'improving' : 'stable';

  // === TOTAL RISK ===
  const riskScore = Math.round(
    frequencyScore * 0.40 +
    severityScore * 0.25 +
    patternScore * 0.20 +
    trendScore * 0.15,
  );

  const tier = riskScore <= 25 ? 'low' : riskScore <= 50 ? 'moderate' : riskScore <= 75 ? 'high' : 'critical';

  // Cost estimate: based on expected annual claims cost
  // Low: $2K, Moderate: $8K, High: $25K, Critical: $65K
  const costMap = { low: 2000, moderate: 8000, high: 25000, critical: 65000 };
  const annualizedCost = costMap[tier];

  // Recommendations
  const recommendations: string[] = [];
  if (frequencyScore > 60) recommendations.push('Enroll in advanced defensive driving course');
  if (severityScore > 60) recommendations.push('Review driving footage for high-severity events');
  if (patternScore > 50 && topType) recommendations.push(`Targeted coaching on ${topType[0].replace(/_/g, ' ')}`);
  if (trendScore > 60) recommendations.push('Schedule driver wellness check-in -- performance declining');
  if (longDays.length > 5) recommendations.push('Review route assignments to reduce excessive hours');
  if (recommendations.length === 0) recommendations.push('Continue current performance -- no interventions needed');

  return {
    driverId,
    driverName: driver.name,
    riskScore,
    tier,
    components: {
      eventFrequency: { score: Math.round(frequencyScore), weight: 0.40, eventsPerThousandMiles: Math.round(eventsPerThousandMiles * 100) / 100 },
      severity: { score: Math.round(severityScore), weight: 0.25, weightedAvg: Math.round(avgSeverity * 100) / 100 },
      pattern: { score: Math.round(patternScore), weight: 0.20, topPatterns },
      trend: { score: Math.round(trendScore), weight: 0.15, direction, delta },
    },
    topEventTypes: sortedTypes.slice(0, 5).map(([type, count]) => ({ type, count })),
    annualizedCost,
    recommendations,
  };
}

/** Calculate risk for all drivers, sorted by risk (highest first) */
export function calculateAllDriverRisks(): DriverRiskResult[] {
  return seedDrivers
    .map((d) => calculateDriverRisk(d.id))
    .filter((r): r is DriverRiskResult => r !== null)
    .sort((a, b) => b.riskScore - a.riskScore);
}
