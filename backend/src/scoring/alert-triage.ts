/**
 * Intelligent Alert Triage Engine
 * Transforms raw safety events into prioritized, clustered, actionable insights.
 *
 * Pipeline:
 *   1. Cluster events by (driverId + eventType + 2-hour window)
 *   2. Score urgency: base severity + repeat offender + recency + pattern bonus
 *   3. Categorize: mechanical | compliance | behavioral | pattern
 *   4. Generate human-readable titles and suggested actions
 *
 * Urgency scale: 0-100 (higher = more urgent)
 * Priority tiers: critical (75-100), high (50-74), medium (25-49), low (0-24)
 */

import {
  seedDrivers,
  seedSafetyEvents,
  type SafetyEventType,
  type SeedSafetyEvent,
} from '../data/seed-data.js';
import { calculatePreShiftRisk } from './predictive-safety.js';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface TriagedAlert {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  urgencyScore: number; // 0-100
  title: string;
  description: string;
  category: 'behavioral' | 'mechanical' | 'compliance' | 'pattern';
  relatedEvents: string[]; // event IDs
  affectedDriver: { id: string; name: string };
  affectedVehicle: string;
  suggestedAction: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEVERITY_BASE: Record<string, number> = {
  critical: 40,
  high: 30,
  medium: 20,
  low: 10,
};

const CATEGORY_MAP: Record<SafetyEventType, TriagedAlert['category']> = {
  harsh_braking: 'behavioral',
  harsh_acceleration: 'behavioral',
  speeding: 'compliance',
  seatbelt: 'compliance',
  distracted_driving: 'behavioral',
  drowsy_driving: 'behavioral',
  lane_departure: 'behavioral',
  tailgating: 'behavioral',
  rolling_stop: 'compliance',
  idle_excessive: 'mechanical',
};

const ACTION_MAP: Record<SafetyEventType, string> = {
  harsh_braking: 'Review dashcam footage and coach on following distance and anticipatory braking techniques.',
  harsh_acceleration: 'Coach on smooth acceleration patterns. Consider setting acceleration threshold alerts.',
  speeding: 'Review speed governor settings. Discuss route-specific speed limits and consequences.',
  seatbelt: 'Mandatory seatbelt compliance reminder. If repeated, escalate to formal write-up per company policy.',
  distracted_driving: 'Conduct distracted driving intervention. Review phone policy and install phone-blocking technology if available.',
  drowsy_driving: 'URGENT: Review recent rest hours and schedule. Mandate 34-hour restart if HOS allows. Consider fatigue management program.',
  lane_departure: 'Assess vehicle lane-departure warning system. If functional, coach driver on attentiveness. Check for fatigue patterns.',
  tailgating: 'Coach on safe following distance (7-second rule for trucks). Review recent close-call footage.',
  rolling_stop: 'Review intersection safety procedures. Coach on full-stop compliance at all stop signs and red lights.',
  idle_excessive: 'Review idling policy. Check for mechanical issues (stuck PTO, HVAC problems). Coach on anti-idle practices.',
};

// ---------------------------------------------------------------------------
// Event Clustering
// ---------------------------------------------------------------------------

interface EventCluster {
  driverId: string;
  eventType: SafetyEventType;
  events: SeedSafetyEvent[];
  windowStart: number;
  windowEnd: number;
}

function clusterEvents(events: SeedSafetyEvent[]): EventCluster[] {
  const TWO_HOURS = 2 * 3600000;
  const clusters: EventCluster[] = [];

  // Group by driverId + eventType first
  const groups: Record<string, SeedSafetyEvent[]> = {};
  for (const event of events) {
    const key = `${event.driverId}_${event.type}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(event);
  }

  // Within each group, cluster by 2-hour windows
  for (const [, groupEvents] of Object.entries(groups)) {
    const sorted = [...groupEvents].sort(
      (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
    );

    let currentCluster: SeedSafetyEvent[] = [sorted[0]];
    let windowStart = new Date(sorted[0].dateTime).getTime();

    for (let i = 1; i < sorted.length; i++) {
      const eventTime = new Date(sorted[i].dateTime).getTime();
      if (eventTime - windowStart <= TWO_HOURS) {
        currentCluster.push(sorted[i]);
      } else {
        // Close current cluster and start new one
        clusters.push({
          driverId: currentCluster[0].driverId,
          eventType: currentCluster[0].type,
          events: currentCluster,
          windowStart,
          windowEnd: new Date(currentCluster[currentCluster.length - 1].dateTime).getTime(),
        });
        currentCluster = [sorted[i]];
        windowStart = eventTime;
      }
    }

    // Push last cluster
    if (currentCluster.length > 0) {
      clusters.push({
        driverId: currentCluster[0].driverId,
        eventType: currentCluster[0].type,
        events: currentCluster,
        windowStart,
        windowEnd: new Date(currentCluster[currentCluster.length - 1].dateTime).getTime(),
      });
    }
  }

  return clusters;
}

// ---------------------------------------------------------------------------
// Urgency Scoring
// ---------------------------------------------------------------------------

function scoreCluster(cluster: EventCluster): number {
  const now = Date.now();

  // Base severity: use highest severity in cluster
  const severities = cluster.events.map((e) => SEVERITY_BASE[e.severity] || 10);
  const baseSeverity = Math.max(...severities);

  // Repeat offender multiplier: >3 same-type events in 24hrs from this driver
  const twentyFourHoursAgo = now - 24 * 3600000;
  const sameType24h = seedSafetyEvents.filter(
    (e) =>
      e.driverId === cluster.driverId &&
      e.type === cluster.eventType &&
      new Date(e.dateTime).getTime() > twentyFourHoursAgo,
  );
  const repeatBonus = sameType24h.length > 3 ? 20 : 0;

  // Recency bonus
  const mostRecentTime = cluster.windowEnd;
  const ageMs = now - mostRecentTime;
  const recencyBonus = ageMs < 3600000 ? 15 : ageMs < 4 * 3600000 ? 10 : 0;

  // Pattern bonus: driver is already high/critical risk
  let patternBonus = 0;
  const driver = seedDrivers.find((d) => d.id === cluster.driverId);
  if (driver && (driver.riskProfile === 'high' || driver.riskProfile === 'critical')) {
    patternBonus = 15;
  }

  // Cluster size bonus (multi-event clusters are more concerning)
  const clusterBonus = cluster.events.length > 1 ? Math.min(10, cluster.events.length * 2) : 0;

  return Math.min(100, baseSeverity + repeatBonus + recencyBonus + patternBonus + clusterBonus);
}

// ---------------------------------------------------------------------------
// Alert Generation
// ---------------------------------------------------------------------------

function generateTitle(cluster: EventCluster, driverName: string): string {
  const eventTypePretty = cluster.eventType.replace(/_/g, ' ');
  const count = cluster.events.length;

  if (count === 1) {
    const severity = cluster.events[0].severity;
    return `Driver ${driverName}: ${severity} ${eventTypePretty} event`;
  }

  // Timespan
  const spanMs = cluster.windowEnd - cluster.windowStart;
  let timespan: string;
  if (spanMs < 3600000) {
    timespan = `${Math.round(spanMs / 60000)} minutes`;
  } else if (spanMs < 86400000) {
    timespan = `${(spanMs / 3600000).toFixed(1)} hours`;
  } else {
    timespan = `${(spanMs / 86400000).toFixed(1)} days`;
  }

  return `Driver ${driverName}: ${count} ${eventTypePretty} events in ${timespan}`;
}

function generateDescription(cluster: EventCluster, urgencyScore: number): string {
  const severityCounts: Record<string, number> = {};
  for (const e of cluster.events) {
    severityCounts[e.severity] = (severityCounts[e.severity] || 0) + 1;
  }
  const severityBreakdown = Object.entries(severityCounts)
    .map(([sev, count]) => `${count} ${sev}`)
    .join(', ');

  const latestEvent = cluster.events[cluster.events.length - 1];
  return `${cluster.events.length} ${cluster.eventType.replace(/_/g, ' ')} event(s) detected. Severity breakdown: ${severityBreakdown}. Latest at ${new Date(latestEvent.dateTime).toLocaleString()}. Urgency: ${urgencyScore}/100.`;
}

function categorizeCluster(cluster: EventCluster): TriagedAlert['category'] {
  // Multi-event clusters get categorized as 'pattern'
  if (cluster.events.length >= 3) {
    return 'pattern';
  }
  return CATEGORY_MAP[cluster.eventType] || 'behavioral';
}

function generateAction(cluster: EventCluster): string {
  const baseAction = ACTION_MAP[cluster.eventType] || 'Review event details and schedule coaching session.';

  if (cluster.events.length >= 3) {
    return `PATTERN DETECTED: ${cluster.events.length} occurrences. ${baseAction} Escalate to safety manager for formal intervention.`;
  }

  return baseAction;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getTriagedAlerts(limit?: number): TriagedAlert[] {
  // Use events from last 7 days for triage
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 86400000;
  const recentEvents = seedSafetyEvents.filter(
    (e) => new Date(e.dateTime).getTime() > sevenDaysAgo,
  );

  const clusters = clusterEvents(recentEvents);

  const alerts: TriagedAlert[] = clusters.map((cluster, index) => {
    const driver = seedDrivers.find((d) => d.id === cluster.driverId);
    const driverName = driver?.name || 'Unknown';
    const urgencyScore = scoreCluster(cluster);

    const priority: TriagedAlert['priority'] =
      urgencyScore >= 75 ? 'critical' :
      urgencyScore >= 50 ? 'high' :
      urgencyScore >= 25 ? 'medium' :
      'low';

    return {
      id: `alert_${index + 1}`,
      priority,
      urgencyScore,
      title: generateTitle(cluster, driverName),
      description: generateDescription(cluster, urgencyScore),
      category: categorizeCluster(cluster),
      relatedEvents: cluster.events.map((e) => e.id),
      affectedDriver: { id: cluster.driverId, name: driverName },
      affectedVehicle: cluster.events[0].vehicleId,
      suggestedAction: generateAction(cluster),
      timestamp: new Date(cluster.windowEnd).toISOString(),
    };
  });

  // Sort by urgency (highest first)
  alerts.sort((a, b) => b.urgencyScore - a.urgencyScore);

  // Re-assign stable IDs after sorting
  alerts.forEach((a, i) => { a.id = `alert_${i + 1}`; });

  return limit ? alerts.slice(0, limit) : alerts;
}

export function getDailyBriefing(): {
  criticalCount: number;
  highCount: number;
  topAlerts: TriagedAlert[];
  fleetRiskSummary: string;
} {
  const allAlerts = getTriagedAlerts();

  const criticalCount = allAlerts.filter((a) => a.priority === 'critical').length;
  const highCount = allAlerts.filter((a) => a.priority === 'high').length;
  const mediumCount = allAlerts.filter((a) => a.priority === 'medium').length;
  const topAlerts = allAlerts.slice(0, 10);

  // Build fleet risk summary
  const uniqueDriversAtRisk = new Set(
    allAlerts
      .filter((a) => a.priority === 'critical' || a.priority === 'high')
      .map((a) => a.affectedDriver.id),
  );

  const categoryCounts: Record<string, number> = {};
  for (const alert of allAlerts) {
    categoryCounts[alert.category] = (categoryCounts[alert.category] || 0) + 1;
  }
  const topCategory = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])[0];

  const fleetRiskSummary =
    `Today's briefing: ${criticalCount} critical, ${highCount} high, and ${mediumCount} medium priority alerts across the fleet. ` +
    `${uniqueDriversAtRisk.size} driver(s) require immediate attention. ` +
    `Most common alert category: ${topCategory ? topCategory[0] : 'none'} (${topCategory ? topCategory[1] : 0} alerts). ` +
    `Total alerts triaged: ${allAlerts.length}.`;

  return {
    criticalCount,
    highCount,
    topAlerts,
    fleetRiskSummary,
  };
}
