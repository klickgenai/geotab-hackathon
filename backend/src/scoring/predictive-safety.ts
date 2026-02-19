/**
 * Predictive Safety Engine
 * Pre-shift risk scoring, driver deterioration detection, and dangerous corridor mapping.
 *
 * Pre-Shift Risk Score (0-100, higher = more dangerous today):
 *   Fatigue Factor:    0-30  -- rest hours, consecutive days, night driving
 *   Behavior Trend:    0-25  -- events per day vs 30-day average
 *   Recent Severity:   0-25  -- critical/high events in last 48hrs or 7 days
 *   Workload Factor:   0-20  -- driving hours and distance per day
 *
 * Risk levels: low (0-25), elevated (26-50), high (51-75), critical (76-100)
 */

import {
  seedDrivers,
  seedSafetyEvents,
  seedTripDays,
  type SafetyEventType,
} from '../data/seed-data.js';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface RiskFactor {
  name: string;
  impact: number; // 0-30
  description: string;
}

export interface PreShiftRisk {
  driverId: string;
  driverName: string;
  riskScore: number; // 0-100
  riskLevel: 'low' | 'elevated' | 'high' | 'critical';
  factors: RiskFactor[];
  recommendation: string;
}

export interface DriverTrend {
  driverId: string;
  driverName: string;
  trendDirection: 'improving' | 'stable' | 'declining' | 'rapidly_declining';
  weekOverWeekChange: number; // % change in event rate
  details: string;
}

export interface DangerousZone {
  id: string;
  latitude: number;
  longitude: number;
  radius: number; // km
  eventCount: number;
  topEventType: SafetyEventType;
  affectedDrivers: string[];
  description: string;
}

// ---------------------------------------------------------------------------
// Pre-Shift Risk
// ---------------------------------------------------------------------------

export function calculatePreShiftRisk(driverId: string): PreShiftRisk | null {
  const driver = seedDrivers.find((d) => d.id === driverId);
  if (!driver) return null;

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 86400000;
  const thirtyDaysAgo = now - 30 * 86400000;
  const fortyEightHoursAgo = now - 48 * 3600000;

  // Last 7 days of trip data
  const trips7 = seedTripDays
    .filter((t) => t.driverId === driverId && new Date(t.date).getTime() > sevenDaysAgo)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Last 30 days of trip data (for baseline)
  const trips30 = seedTripDays
    .filter((t) => t.driverId === driverId && new Date(t.date).getTime() > thirtyDaysAgo);

  // Last 7 days of events
  const events7 = seedSafetyEvents.filter(
    (e) => e.driverId === driverId && new Date(e.dateTime).getTime() > sevenDaysAgo,
  );

  // Last 30 days of events (for baseline)
  const events30 = seedSafetyEvents.filter(
    (e) => e.driverId === driverId && new Date(e.dateTime).getTime() > thirtyDaysAgo,
  );

  // Events in last 48 hours
  const events48h = seedSafetyEvents.filter(
    (e) => e.driverId === driverId && new Date(e.dateTime).getTime() > fortyEightHoursAgo,
  );

  const factors: RiskFactor[] = [];

  // === FATIGUE FACTOR (0-30) ===
  let fatigueFactor = 0;

  // Average rest hours in last 7 days
  const avgRest7 = trips7.length > 0
    ? trips7.reduce((s, t) => s + t.restHoursBetweenShifts, 0) / trips7.length
    : 10;
  if (avgRest7 < 7) fatigueFactor += 15;
  else if (avgRest7 < 8) fatigueFactor += 10;
  else if (avgRest7 < 9) fatigueFactor += 5;

  // Consecutive days worked
  const consecutiveDays = trips7.length; // approximate from 7-day window
  if (consecutiveDays > 6) fatigueFactor += 10;
  else if (consecutiveDays > 5) fatigueFactor += 7;
  else if (consecutiveDays > 4) fatigueFactor += 3;

  // Night driving hours increasing (compare first half vs second half of 7 days)
  const firstHalf = trips7.slice(Math.floor(trips7.length / 2));
  const secondHalf = trips7.slice(0, Math.floor(trips7.length / 2));
  const firstNightAvg = firstHalf.length > 0
    ? firstHalf.reduce((s, t) => s + t.nightDrivingHours, 0) / firstHalf.length
    : 0;
  const secondNightAvg = secondHalf.length > 0
    ? secondHalf.reduce((s, t) => s + t.nightDrivingHours, 0) / secondHalf.length
    : 0;
  if (secondNightAvg > firstNightAvg + 0.5) fatigueFactor += 5;

  fatigueFactor = Math.min(30, fatigueFactor);
  factors.push({
    name: 'Fatigue Factor',
    impact: fatigueFactor,
    description: `Avg rest: ${avgRest7.toFixed(1)}hrs, ${consecutiveDays} days worked in last 7, night driving ${secondNightAvg > firstNightAvg + 0.5 ? 'increasing' : 'stable'}`,
  });

  // === BEHAVIOR TREND (0-25) ===
  const eventsPerDay7 = trips7.length > 0 ? events7.length / trips7.length : 0;
  const eventsPerDay30 = trips30.length > 0 ? events30.length / trips30.length : 0;
  const trendRatio = eventsPerDay30 > 0 ? eventsPerDay7 / eventsPerDay30 : 1;

  let behaviorTrend = 0;
  if (trendRatio > 2.0) behaviorTrend = 25;
  else if (trendRatio > 1.5) behaviorTrend = 20;
  else if (trendRatio > 1.2) behaviorTrend = 15;
  else if (trendRatio > 1.0) behaviorTrend = 8;
  else behaviorTrend = 0;

  factors.push({
    name: 'Behavior Trend',
    impact: behaviorTrend,
    description: `${eventsPerDay7.toFixed(1)} events/day (7d) vs ${eventsPerDay30.toFixed(1)} events/day (30d avg) -- ${trendRatio > 1.2 ? 'worsening' : trendRatio < 0.8 ? 'improving' : 'stable'}`,
  });

  // === RECENT SEVERITY (0-25) ===
  let recentSeverity = 0;
  const hasCritical48h = events48h.some((e) => e.severity === 'critical');
  const hasHigh48h = events48h.some((e) => e.severity === 'high');
  const hasCritical7d = events7.some((e) => e.severity === 'critical');
  const hasHigh7d = events7.some((e) => e.severity === 'high');

  if (hasCritical48h) recentSeverity = 25;
  else if (hasHigh48h) recentSeverity = 20;
  else if (hasCritical7d) recentSeverity = 15;
  else if (hasHigh7d) recentSeverity = 10;

  factors.push({
    name: 'Recent Severity',
    impact: recentSeverity,
    description: hasCritical48h
      ? 'Critical event in last 48 hours'
      : hasHigh48h
      ? 'High-severity event in last 48 hours'
      : hasCritical7d
      ? 'Critical event in last 7 days'
      : hasHigh7d
      ? 'High-severity event in last 7 days'
      : 'No high/critical events recently',
  });

  // === WORKLOAD FACTOR (0-20) ===
  let workloadFactor = 0;
  const avgDrivingHours7 = trips7.length > 0
    ? trips7.reduce((s, t) => s + t.drivingHours, 0) / trips7.length
    : 0;
  const avgDistance7 = trips7.length > 0
    ? trips7.reduce((s, t) => s + t.totalDistance, 0) / trips7.length
    : 0;

  if (avgDrivingHours7 > 11) workloadFactor += 12;
  else if (avgDrivingHours7 > 10) workloadFactor += 8;
  else if (avgDrivingHours7 > 9) workloadFactor += 4;

  if (avgDistance7 > 600) workloadFactor += 8;
  else if (avgDistance7 > 500) workloadFactor += 5;
  else if (avgDistance7 > 400) workloadFactor += 2;

  workloadFactor = Math.min(20, workloadFactor);
  factors.push({
    name: 'Workload Factor',
    impact: workloadFactor,
    description: `Avg ${avgDrivingHours7.toFixed(1)}hrs/day, ${avgDistance7.toFixed(0)}km/day over last 7 days`,
  });

  // === TOTAL RISK SCORE ===
  const riskScore = Math.min(100, fatigueFactor + behaviorTrend + recentSeverity + workloadFactor);
  const riskLevel: PreShiftRisk['riskLevel'] =
    riskScore >= 76 ? 'critical' :
    riskScore >= 51 ? 'high' :
    riskScore >= 26 ? 'elevated' :
    'low';

  // Recommendation
  let recommendation: string;
  if (riskLevel === 'critical') {
    recommendation = 'Do not assign shift until safety review is completed. Schedule immediate driver check-in and consider mandatory rest period.';
  } else if (riskLevel === 'high') {
    recommendation = 'Assign shorter route only. Require check-in at midpoint. Monitor telematics in real-time during shift.';
  } else if (riskLevel === 'elevated') {
    recommendation = 'Standard shift with additional monitoring. Schedule coaching session within 48 hours.';
  } else {
    recommendation = 'Clear for standard operations. Continue routine monitoring.';
  }

  return {
    driverId,
    driverName: driver.name,
    riskScore,
    riskLevel,
    factors,
    recommendation,
  };
}

export function calculateAllPreShiftRisks(): PreShiftRisk[] {
  return seedDrivers
    .map((d) => calculatePreShiftRisk(d.id))
    .filter((r): r is PreShiftRisk => r !== null)
    .sort((a, b) => b.riskScore - a.riskScore);
}

export function getFleetRiskForecast(): {
  highRiskDrivers: number;
  predictedEventsThisWeek: number;
  topRiskFactors: string[];
  recommendations: string[];
} {
  const allRisks = calculateAllPreShiftRisks();

  const highRiskDrivers = allRisks.filter(
    (r) => r.riskLevel === 'high' || r.riskLevel === 'critical',
  ).length;

  // Predicted events: sum of (riskScore / 100) * baseline events per driver per week
  // Baseline: 7 days of recent events / driver count
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 86400000;
  const recentEvents = seedSafetyEvents.filter(
    (e) => new Date(e.dateTime).getTime() > sevenDaysAgo,
  );
  const baselineEventsPerWeek = recentEvents.length;
  // Weight by risk: higher-risk drivers contribute proportionally more
  const totalRiskWeight = allRisks.reduce((s, r) => s + r.riskScore, 0);
  const avgRisk = allRisks.length > 0 ? totalRiskWeight / allRisks.length : 50;
  const predictedEventsThisWeek = Math.round(baselineEventsPerWeek * (avgRisk / 50) * 1.05);

  // Aggregate top risk factors across all drivers
  const factorCounts: Record<string, number> = {};
  for (const risk of allRisks) {
    for (const factor of risk.factors) {
      if (factor.impact > 5) {
        factorCounts[factor.name] = (factorCounts[factor.name] || 0) + factor.impact;
      }
    }
  }
  const topRiskFactors = Object.entries(factorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name]) => name);

  // Fleet recommendations
  const recommendations: string[] = [];
  const criticalDrivers = allRisks.filter((r) => r.riskLevel === 'critical');
  const highDrivers = allRisks.filter((r) => r.riskLevel === 'high');

  if (criticalDrivers.length > 0) {
    recommendations.push(
      `Immediately review ${criticalDrivers.length} critical-risk driver(s): ${criticalDrivers.map((d) => d.driverName).join(', ')}`,
    );
  }
  if (highDrivers.length > 0) {
    recommendations.push(
      `Schedule coaching for ${highDrivers.length} high-risk driver(s) before next shift`,
    );
  }
  if (topRiskFactors.includes('Fatigue Factor')) {
    recommendations.push('Fleet-wide fatigue management: enforce minimum 10-hour rest periods');
  }
  if (topRiskFactors.includes('Workload Factor')) {
    recommendations.push('Review route assignments to balance workload across drivers');
  }
  if (topRiskFactors.includes('Behavior Trend')) {
    recommendations.push('Deploy additional telematics coaching alerts for trending drivers');
  }
  if (recommendations.length === 0) {
    recommendations.push('Fleet risk within normal parameters. Maintain current safety programs.');
  }

  return {
    highRiskDrivers,
    predictedEventsThisWeek,
    topRiskFactors,
    recommendations,
  };
}

// ---------------------------------------------------------------------------
// Driver Deterioration Detection
// ---------------------------------------------------------------------------

export function detectDeteriorating(): DriverTrend[] {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 86400000;
  const fourteenDaysAgo = now - 14 * 86400000;

  return seedDrivers.map((driver) => {
    const eventsLast7 = seedSafetyEvents.filter(
      (e) => e.driverId === driver.id && new Date(e.dateTime).getTime() > sevenDaysAgo,
    );
    const eventsPrev7 = seedSafetyEvents.filter((e) => {
      const t = new Date(e.dateTime).getTime();
      return e.driverId === driver.id && t > fourteenDaysAgo && t <= sevenDaysAgo;
    });

    const tripsLast7 = seedTripDays.filter(
      (t) => t.driverId === driver.id && new Date(t.date).getTime() > sevenDaysAgo,
    );
    const tripsPrev7 = seedTripDays.filter((t) => {
      const d = new Date(t.date).getTime();
      return t.driverId === driver.id && d > fourteenDaysAgo && d <= sevenDaysAgo;
    });

    // Normalize by days worked to get event rate
    const rateLast7 = tripsLast7.length > 0 ? eventsLast7.length / tripsLast7.length : 0;
    const ratePrev7 = tripsPrev7.length > 0 ? eventsPrev7.length / tripsPrev7.length : 0;

    const weekOverWeekChange = ratePrev7 > 0
      ? Math.round(((rateLast7 - ratePrev7) / ratePrev7) * 100)
      : rateLast7 > 0 ? 100 : 0;

    let trendDirection: DriverTrend['trendDirection'];
    if (weekOverWeekChange > 50) trendDirection = 'rapidly_declining';
    else if (weekOverWeekChange > 15) trendDirection = 'declining';
    else if (weekOverWeekChange < -15) trendDirection = 'improving';
    else trendDirection = 'stable';

    const details =
      `${eventsLast7.length} events in last 7 days (${rateLast7.toFixed(1)}/day) vs ` +
      `${eventsPrev7.length} events prior 7 days (${ratePrev7.toFixed(1)}/day). ` +
      `${weekOverWeekChange > 0 ? '+' : ''}${weekOverWeekChange}% change.`;

    return {
      driverId: driver.id,
      driverName: driver.name,
      trendDirection,
      weekOverWeekChange,
      details,
    };
  }).sort((a, b) => b.weekOverWeekChange - a.weekOverWeekChange);
}

// ---------------------------------------------------------------------------
// Dangerous Corridor Detection
// ---------------------------------------------------------------------------

export function detectDangerousZones(): DangerousZone[] {
  // Grid-based clustering: round lat/lng to 0.05 degree cells
  const cellSize = 0.05;
  const cellMap: Record<string, {
    events: typeof seedSafetyEvents;
    latSum: number;
    lngSum: number;
  }> = {};

  for (const event of seedSafetyEvents) {
    const cellLat = Math.round(event.latitude / cellSize) * cellSize;
    const cellLng = Math.round(event.longitude / cellSize) * cellSize;
    const key = `${cellLat.toFixed(2)}_${cellLng.toFixed(2)}`;

    if (!cellMap[key]) {
      cellMap[key] = { events: [], latSum: 0, lngSum: 0 };
    }
    cellMap[key].events.push(event);
    cellMap[key].latSum += event.latitude;
    cellMap[key].lngSum += event.longitude;
  }

  // Convert to zones, sort by event count, return top 10
  const zones: DangerousZone[] = Object.entries(cellMap)
    .map(([key, cell], index) => {
      const avgLat = cell.latSum / cell.events.length;
      const avgLng = cell.lngSum / cell.events.length;

      // Find top event type
      const typeCounts: Record<string, number> = {};
      const driverSet = new Set<string>();
      for (const e of cell.events) {
        typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
        driverSet.add(e.driverId);
      }
      const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

      return {
        id: `zone_${index + 1}`,
        latitude: Math.round(avgLat * 10000) / 10000,
        longitude: Math.round(avgLng * 10000) / 10000,
        radius: Math.round(cellSize * 111 / 2 * 10) / 10, // approx km (1 degree ~ 111 km)
        eventCount: cell.events.length,
        topEventType: topType[0] as SafetyEventType,
        affectedDrivers: Array.from(driverSet),
        description: `${cell.events.length} events in area near (${avgLat.toFixed(2)}, ${avgLng.toFixed(2)}). Most common: ${topType[0].replace(/_/g, ' ')} (${topType[1]} occurrences). ${driverSet.size} drivers affected.`,
      };
    })
    .sort((a, b) => b.eventCount - a.eventCount)
    .slice(0, 10);

  // Re-assign stable IDs after sorting
  zones.forEach((z, i) => { z.id = `zone_${i + 1}`; });

  return zones;
}
