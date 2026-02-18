/**
 * Driver Wellness / Burnout Predictor
 * Detects burnout signals from telematics patterns.
 *
 * Signals:
 *   1. Shift Irregularity -- std dev of shift start times
 *   2. Consecutive Long Days -- days with >10hrs driving in a row
 *   3. Rest Compression -- shrinking rest between shifts
 *   4. Harsh Event Escalation -- increasing event count week-over-week
 *   5. Night Driving Creep -- increasing night hours
 *
 * Retention cost: $35K * burnout_probability
 */

import { seedDrivers, seedTripDays, seedSafetyEvents, type SeedDriver } from '../data/seed-data.js';

export interface WellnessResult {
  driverId: string;
  driverName: string;
  burnoutProbability: number; // 0-1
  burnoutRisk: 'low' | 'moderate' | 'high';
  retentionCost: number;
  signals: WellnessSignal[];
  overallWellnessScore: number; // 0-100 (higher = healthier)
  recommendations: string[];
  daysSinceLastRest: number;
  avgRestHours: number;
  consecutiveLongDays: number;
}

export interface WellnessSignal {
  name: string;
  severity: 'normal' | 'warning' | 'critical';
  value: number;
  threshold: number;
  description: string;
}

const REPLACEMENT_COST = 35000; // Average cost to replace a commercial driver

export function predictWellness(driverId: string): WellnessResult | null {
  const driver = seedDrivers.find((d) => d.id === driverId);
  if (!driver) return null;

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 86400000;

  const trips30 = seedTripDays
    .filter((t) => t.driverId === driverId && new Date(t.date).getTime() > thirtyDaysAgo)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const events30 = seedSafetyEvents.filter(
    (e) => e.driverId === driverId && new Date(e.dateTime).getTime() > thirtyDaysAgo,
  );

  const signals: WellnessSignal[] = [];

  // 1. SHIFT IRREGULARITY
  // (Simulated via driving hours variance)
  const hours = trips30.map((t) => t.drivingHours);
  const avgHours = hours.length > 0 ? hours.reduce((s, h) => s + h, 0) / hours.length : 0;
  const stdDev = hours.length > 1
    ? Math.sqrt(hours.reduce((s, h) => s + (h - avgHours) ** 2, 0) / (hours.length - 1))
    : 0;
  const irregularity = stdDev / Math.max(avgHours, 1);
  signals.push({
    name: 'Shift Irregularity',
    severity: irregularity > 0.35 ? 'critical' : irregularity > 0.2 ? 'warning' : 'normal',
    value: Math.round(irregularity * 100) / 100,
    threshold: 0.35,
    description: `Schedule variance ratio: ${(irregularity * 100).toFixed(0)}% (threshold: 35%)`,
  });

  // 2. CONSECUTIVE LONG DAYS (>10 hrs)
  let maxConsecutive = 0;
  let currentStreak = 0;
  for (const trip of trips30) {
    if (trip.drivingHours > 10) {
      currentStreak++;
      maxConsecutive = Math.max(maxConsecutive, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  signals.push({
    name: 'Consecutive Long Days',
    severity: maxConsecutive >= 5 ? 'critical' : maxConsecutive >= 3 ? 'warning' : 'normal',
    value: maxConsecutive,
    threshold: 5,
    description: `${maxConsecutive} consecutive days with >10hrs driving (threshold: 5)`,
  });

  // 3. REST COMPRESSION
  const restHours = trips30.map((t) => t.restHoursBetweenShifts);
  const avgRest = restHours.length > 0 ? restHours.reduce((s, r) => s + r, 0) / restHours.length : 10;
  const recentRest = restHours.slice(-7);
  const recentAvgRest = recentRest.length > 0 ? recentRest.reduce((s, r) => s + r, 0) / recentRest.length : 10;
  const restTrend = avgRest - recentAvgRest; // Positive = rest shrinking
  signals.push({
    name: 'Rest Compression',
    severity: recentAvgRest < 7 ? 'critical' : recentAvgRest < 9 ? 'warning' : 'normal',
    value: Math.round(recentAvgRest * 10) / 10,
    threshold: 7,
    description: `Recent avg rest: ${recentAvgRest.toFixed(1)}hrs (min: 7hrs). Trend: ${restTrend > 1 ? 'compressing' : 'stable'}`,
  });

  // 4. HARSH EVENT ESCALATION
  const week1Events = events30.filter((e) => {
    const t = new Date(e.dateTime).getTime();
    return t > now - 7 * 86400000;
  }).length;
  const week2Events = events30.filter((e) => {
    const t = new Date(e.dateTime).getTime();
    return t > now - 14 * 86400000 && t <= now - 7 * 86400000;
  }).length;
  const escalation = week2Events > 0 ? (week1Events - week2Events) / week2Events : 0;
  signals.push({
    name: 'Event Escalation',
    severity: escalation > 0.5 ? 'critical' : escalation > 0.2 ? 'warning' : 'normal',
    value: Math.round(escalation * 100),
    threshold: 50,
    description: `Week-over-week event change: ${escalation > 0 ? '+' : ''}${(escalation * 100).toFixed(0)}% (threshold: 50%)`,
  });

  // 5. NIGHT DRIVING CREEP
  const nightHours = trips30.map((t) => t.nightDrivingHours);
  const earlyNight = nightHours.slice(0, Math.floor(nightHours.length / 2));
  const lateNight = nightHours.slice(Math.floor(nightHours.length / 2));
  const earlyAvg = earlyNight.length > 0 ? earlyNight.reduce((s, h) => s + h, 0) / earlyNight.length : 0;
  const lateAvg = lateNight.length > 0 ? lateNight.reduce((s, h) => s + h, 0) / lateNight.length : 0;
  const nightCreep = lateAvg - earlyAvg;
  signals.push({
    name: 'Night Driving Creep',
    severity: nightCreep > 1.5 ? 'critical' : nightCreep > 0.5 ? 'warning' : 'normal',
    value: Math.round(nightCreep * 10) / 10,
    threshold: 1.5,
    description: `Night driving increase: ${nightCreep > 0 ? '+' : ''}${nightCreep.toFixed(1)}hrs/day (threshold: 1.5hrs)`,
  });

  // 6. EXCESSIVE DAILY HOURS
  const overworkedDays = trips30.filter((t) => t.drivingHours > 11).length;
  const overworkedPercent = trips30.length > 0 ? overworkedDays / trips30.length : 0;
  signals.push({
    name: 'Excessive Daily Hours',
    severity: overworkedPercent > 0.4 ? 'critical' : overworkedPercent > 0.15 ? 'warning' : 'normal',
    value: Math.round(overworkedPercent * 100),
    threshold: 40,
    description: `${(overworkedPercent * 100).toFixed(0)}% of days exceed 11hrs driving (threshold: 40%)`,
  });

  // === BURNOUT PROBABILITY ===
  const criticalCount = signals.filter((s) => s.severity === 'critical').length;
  const warningCount = signals.filter((s) => s.severity === 'warning').length;
  const burnoutProbability = Math.min(0.95, (criticalCount * 0.22 + warningCount * 0.12 + 0.03));

  const burnoutRisk = burnoutProbability > 0.5 ? 'high' : burnoutProbability > 0.25 ? 'moderate' : 'low';
  const retentionCost = Math.round(REPLACEMENT_COST * burnoutProbability);
  const overallWellnessScore = Math.round((1 - burnoutProbability) * 100);

  // Days since last rest day (day off)
  const today = new Date();
  let daysSinceRest = 0;
  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(today.getTime() - i * 86400000).toISOString().split('T')[0];
    const worked = trips30.some((t) => t.date === checkDate);
    if (!worked && i > 0) break;
    if (worked) daysSinceRest++;
  }

  // Recommendations
  const recommendations: string[] = [];
  if (burnoutRisk === 'high') {
    recommendations.push('URGENT: Schedule immediate check-in with driver');
    recommendations.push('Review and reduce weekly driving hours');
  }
  if (maxConsecutive >= 5) recommendations.push('Mandate 34-hour restart period');
  if (recentAvgRest < 8) recommendations.push('Adjust scheduling to ensure minimum 10hr rest periods');
  if (nightCreep > 1) recommendations.push('Reduce night driving assignments');
  if (escalation > 0.3) recommendations.push('Review recent driving footage for fatigue indicators');
  if (daysSinceRest > 6) recommendations.push(`Driver has worked ${daysSinceRest} consecutive days -- schedule day off`);
  if (recommendations.length === 0) recommendations.push('Wellness indicators normal -- continue monitoring');

  return {
    driverId,
    driverName: driver.name,
    burnoutProbability: Math.round(burnoutProbability * 100) / 100,
    burnoutRisk,
    retentionCost,
    signals,
    overallWellnessScore,
    recommendations,
    daysSinceLastRest: daysSinceRest,
    avgRestHours: Math.round(avgRest * 10) / 10,
    consecutiveLongDays: maxConsecutive,
  };
}

/** Predict wellness for all drivers, sorted by burnout probability (highest first) */
export function predictAllWellness(): WellnessResult[] {
  return seedDrivers
    .map((d) => predictWellness(d.id))
    .filter((r): r is WellnessResult => r !== null)
    .sort((a, b) => b.burnoutProbability - a.burnoutProbability);
}

/** Summary: fleet-wide wellness stats */
export function getFleetWellnessSummary() {
  const all = predictAllWellness();
  const highRisk = all.filter((r) => r.burnoutRisk === 'high');
  const moderateRisk = all.filter((r) => r.burnoutRisk === 'moderate');
  const totalRetentionCost = all.reduce((s, r) => s + r.retentionCost, 0);

  return {
    totalDrivers: all.length,
    highBurnoutRisk: highRisk.length,
    moderateBurnoutRisk: moderateRisk.length,
    lowBurnoutRisk: all.length - highRisk.length - moderateRisk.length,
    totalRetentionCostAtRisk: totalRetentionCost,
    avgWellnessScore: Math.round(all.reduce((s, r) => s + r.overallWellnessScore, 0) / all.length),
    driversAtRisk: highRisk.map((r) => ({
      id: r.driverId,
      name: r.driverName,
      burnoutProbability: r.burnoutProbability,
      retentionCost: r.retentionCost,
      topSignal: r.signals.find((s) => s.severity === 'critical')?.name || 'Multiple warnings',
    })),
  };
}
