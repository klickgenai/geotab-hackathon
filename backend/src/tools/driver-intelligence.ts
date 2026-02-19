/**
 * Driver Intelligence Tools
 * Enhanced voice AI tools for the driver portal: HOS status, pre-shift briefing,
 * safety coaching, and voice-driven incident reporting.
 */

import { tool } from 'ai';
import { z } from 'zod';
import {
  seedDrivers,
  seedTripDays,
  seedSafetyEvents,
  type SafetyEventType,
} from '../data/seed-data.js';
import {
  getDriverSession,
  getDriverLoad,
  addDispatchMessage,
} from '../data/driver-session.js';
import { calculateDriverRisk } from '../scoring/driver-risk-engine.js';
import { predictWellness } from '../scoring/wellness-predictor.js';
import { calculatePreShiftRisk, detectDangerousZones } from '../scoring/predictive-safety.js';

// ─── Helpers ────────────────────────────────────────────────

function resolveDriverId(driverId?: string, driverName?: string): string | null {
  if (driverId) {
    const exists = seedDrivers.find((d) => d.id === driverId);
    return exists ? driverId : null;
  }
  if (driverName) {
    const match = seedDrivers.find((d) =>
      d.name.toLowerCase().includes(driverName.toLowerCase()),
    );
    return match?.id || null;
  }
  return null;
}

// ─── Tool 1: HOS Status ────────────────────────────────────

export const getHOSStatus = tool({
  description:
    'Get a driver\'s Hours of Service (HOS) compliance status including remaining drive time, on-duty time, required breaks, and cycle status. Use when a driver asks "how many hours do I have left?", "can I keep driving?", "HOS status", "do I need a break?", or asks about driving hours.',
  parameters: z.object({
    driverId: z
      .string()
      .optional()
      .describe('Driver ID (e.g., "d1"). If not provided, tries to find by name.'),
    driverName: z
      .string()
      .optional()
      .describe('Search by driver name (partial match). Ignored if driverId is provided.'),
  }),
  execute: async ({ driverId, driverName }) => {
    const resolvedId = resolveDriverId(driverId, driverName);
    if (!resolvedId) return { error: 'Driver not found. Please provide a valid driver ID or name.' };

    const driver = seedDrivers.find((d) => d.id === resolvedId);
    if (!driver) return { error: 'Driver not found.' };

    const now = Date.now();
    const todayStr = new Date().toISOString().split('T')[0];

    // Get today's trip data
    const todayTrips = seedTripDays.filter(
      (t) => t.driverId === resolvedId && t.date === todayStr,
    );
    const todayDrivingHours = todayTrips.reduce((sum, t) => sum + t.drivingHours, 0);
    const todayOnDutyHours = todayDrivingHours + todayTrips.reduce((sum, t) => sum + t.idlingMinutes / 60, 0);

    // 8-day cycle: get last 8 days of trip data
    const eightDaysAgo = now - 8 * 86400000;
    const cycleTrips = seedTripDays.filter(
      (t) => t.driverId === resolvedId && new Date(t.date).getTime() > eightDaysAgo,
    );
    const cycleDrivingHours = cycleTrips.reduce((sum, t) => sum + t.drivingHours, 0);
    const cycleOnDutyHours = cycleDrivingHours + cycleTrips.reduce((sum, t) => sum + t.idlingMinutes / 60, 0);

    // US DOT HOS rules
    const DRIVE_LIMIT = 11; // 11-hour driving limit
    const ON_DUTY_WINDOW = 14; // 14-hour on-duty window
    const CYCLE_LIMIT = 70; // 70-hour/8-day cycle
    const BREAK_AFTER = 8; // 30-min break required after 8hrs driving

    const remainingDriveTime = Math.max(0, Math.round((DRIVE_LIMIT - todayDrivingHours) * 10) / 10);
    const remainingOnDutyTime = Math.max(0, Math.round((ON_DUTY_WINDOW - todayOnDutyHours) * 10) / 10);
    const cycleHoursUsed = Math.round(cycleOnDutyHours * 10) / 10;
    const cycleHoursRemaining = Math.max(0, Math.round((CYCLE_LIMIT - cycleOnDutyHours) * 10) / 10);

    // Break calculation
    const hoursSinceBreak = todayDrivingHours; // Simplified: assume no break taken today
    const nextBreakDue = hoursSinceBreak >= BREAK_AFTER
      ? 'NOW - 30-minute break required'
      : `In ${Math.round((BREAK_AFTER - hoursSinceBreak) * 10) / 10} hours of driving`;

    // 10-hour off-duty required after hitting 11hr drive or 14hr on-duty
    const needsMandatoryRest = remainingDriveTime <= 0 || remainingOnDutyTime <= 0;
    const nextMandatoryRest = needsMandatoryRest
      ? 'NOW - 10 consecutive hours off-duty required'
      : `After ${Math.min(remainingDriveTime, remainingOnDutyTime)} more hours on duty`;

    // Generate warnings
    const warnings: string[] = [];
    if (remainingDriveTime <= 0) {
      warnings.push('VIOLATION RISK: Drive time limit reached. Stop driving immediately.');
    } else if (remainingDriveTime <= 1) {
      warnings.push(`URGENT: Only ${remainingDriveTime} hour(s) of drive time remaining.`);
    } else if (remainingDriveTime <= 2) {
      warnings.push(`CAUTION: ${remainingDriveTime} hours of drive time remaining. Plan your stop.`);
    }

    if (remainingOnDutyTime <= 0) {
      warnings.push('VIOLATION RISK: On-duty window expired. Go off-duty immediately.');
    } else if (remainingOnDutyTime <= 1) {
      warnings.push(`URGENT: Only ${remainingOnDutyTime} hour(s) left in on-duty window.`);
    }

    if (cycleHoursRemaining <= 5) {
      warnings.push(`CYCLE WARNING: Only ${cycleHoursRemaining} hours remaining in 70-hour/8-day cycle.`);
    }

    if (hoursSinceBreak >= BREAK_AFTER) {
      warnings.push('BREAK REQUIRED: 30-minute break needed before continuing to drive.');
    } else if (hoursSinceBreak >= BREAK_AFTER - 1) {
      warnings.push(`BREAK SOON: 30-minute break required in ${Math.round((BREAK_AFTER - hoursSinceBreak) * 60)} minutes.`);
    }

    if (warnings.length === 0) {
      warnings.push('All HOS limits within compliance. Drive safe!');
    }

    return {
      driverId: resolvedId,
      driverName: driver.name,
      today: {
        drivingHours: Math.round(todayDrivingHours * 10) / 10,
        onDutyHours: Math.round(todayOnDutyHours * 10) / 10,
      },
      limits: {
        driveLimit: DRIVE_LIMIT,
        onDutyWindow: ON_DUTY_WINDOW,
        cycleLimit: CYCLE_LIMIT,
      },
      remainingDriveTime,
      remainingOnDutyTime,
      cycleHoursUsed,
      cycleHoursRemaining,
      nextBreakDue,
      nextMandatoryRest,
      warnings,
    };
  },
});

// ─── Tool 2: Pre-Shift Briefing ────────────────────────────

const WEATHER_CONDITIONS = [
  'Clear skies',
  'Partly cloudy',
  'Light rain',
  'Heavy rain',
  'Fog',
  'Snow flurries',
  'Overcast',
  'Thunderstorms',
];

const EVENT_TYPE_FOCUS: Record<string, string> = {
  harsh_braking: 'Watch your following distance -- leave at least 4 seconds of space ahead.',
  speeding: 'Stay within posted limits today. Set cruise control on highways.',
  distracted_driving: 'Phone on silent and in the mount. Eyes on the road.',
  drowsy_driving: 'If you feel drowsy, pull over for a 20-minute power nap. No pushing through.',
  lane_departure: 'Keep checking mirrors every 5-8 seconds. Stay centered in your lane.',
  tailgating: 'Maintain a 4-second gap at all times. Increase in wet or low-visibility conditions.',
  harsh_acceleration: 'Smooth starts from stops. Easy on the throttle -- save fuel, save brakes.',
  seatbelt: 'Buckle up before you start the engine. Every trip, every time.',
  rolling_stop: 'Full stop for 3 seconds at every stop sign. No exceptions.',
  idle_excessive: 'Turn off the engine for stops longer than 2 minutes. Save fuel and reduce emissions.',
};

export const getPreShiftBriefing = tool({
  description:
    'Get a personalized pre-shift safety briefing for a driver including risk assessment, focus areas, weather conditions, route hazards, and motivational message. Use when a driver says "give me my briefing", "pre-shift check", "what should I watch for today?", or starts their shift.',
  parameters: z.object({
    driverId: z
      .string()
      .optional()
      .describe('Driver ID (e.g., "d1"). If not provided, tries to find by name.'),
    driverName: z
      .string()
      .optional()
      .describe('Search by driver name (partial match). Ignored if driverId is provided.'),
  }),
  execute: async ({ driverId, driverName }) => {
    const resolvedId = resolveDriverId(driverId, driverName);
    if (!resolvedId) return { error: 'Driver not found. Please provide a valid driver ID or name.' };

    const driver = seedDrivers.find((d) => d.id === resolvedId);
    if (!driver) return { error: 'Driver not found.' };

    // Gather all intelligence
    const preShiftRisk = calculatePreShiftRisk(resolvedId);
    const driverRisk = calculateDriverRisk(resolvedId);
    const wellness = predictWellness(resolvedId);
    const session = getDriverSession(resolvedId);
    const dangerousZones = detectDangerousZones();

    const riskScore = preShiftRisk?.riskScore ?? 25;
    const riskLevel = preShiftRisk?.riskLevel ?? 'low';

    // Deterministic weather based on day of year
    const now = new Date();
    const dayOfYear = Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000,
    );
    const weatherIndex = dayOfYear % WEATHER_CONDITIONS.length;
    const weatherCondition = WEATHER_CONDITIONS[weatherIndex];
    // Temperature: simulate seasonal (25-85F based on day of year, peak at day 200)
    const tempBase = Math.sin((dayOfYear / 365) * Math.PI) * 30 + 55;
    const temperature = Math.round(tempBase + (dayOfYear % 5) - 2);

    // Focus areas from driver's top event types
    const focusAreas: string[] = [];
    if (driverRisk?.topEventTypes) {
      for (const eventType of driverRisk.topEventTypes.slice(0, 3)) {
        const focusTip = EVENT_TYPE_FOCUS[eventType.type];
        if (focusTip) {
          focusAreas.push(focusTip);
        }
      }
    }
    if (focusAreas.length === 0) {
      focusAreas.push('Maintain safe following distances and stay alert at intersections.');
    }

    // Weather-specific focus
    if (['Heavy rain', 'Thunderstorms'].includes(weatherCondition)) {
      focusAreas.push('Reduce speed by 10 mph in heavy rain. Use headlights and increase following distance.');
    } else if (weatherCondition === 'Fog') {
      focusAreas.push('Use low-beam headlights in fog. Reduce speed and increase following distance significantly.');
    } else if (weatherCondition === 'Snow flurries') {
      focusAreas.push('Watch for black ice. Gentle braking and steering inputs. Increase following distance to 6 seconds.');
    }

    // Route hazards from dangerous zones
    const routeHazards: string[] = [];
    const driverZones = dangerousZones.filter((z) => z.affectedDrivers.includes(resolvedId));
    for (const zone of driverZones.slice(0, 3)) {
      routeHazards.push(
        `High-incident area near (${zone.latitude}, ${zone.longitude}): ${zone.eventCount} events, mostly ${zone.topEventType.replace(/_/g, ' ')}. Stay alert.`,
      );
    }
    if (routeHazards.length === 0) {
      routeHazards.push('No known hazard zones on your typical routes. Stay vigilant at all intersections and highway merges.');
    }

    // Greeting with first name and streak reference
    const streakDays = session?.streakDays ?? 0;
    let greeting: string;
    if (streakDays >= 30) {
      greeting = `Good morning, ${driver.firstName}! You're on an incredible ${streakDays}-day clean streak. Let's keep it going today.`;
    } else if (streakDays >= 14) {
      greeting = `Hey ${driver.firstName}! ${streakDays} days strong on your safety streak. Great work -- let's make it ${streakDays + 1}.`;
    } else if (streakDays >= 7) {
      greeting = `Morning, ${driver.firstName}. You've got a solid ${streakDays}-day streak building. Keep the momentum going today.`;
    } else if (streakDays >= 1) {
      greeting = `Good morning, ${driver.firstName}. You're ${streakDays} days into a new streak. Every safe day counts -- let's build on it.`;
    } else {
      greeting = `Good morning, ${driver.firstName}. Today's a fresh start. Focus on the fundamentals and let's have a safe day.`;
    }

    // Today's challenge
    const challenges = [
      'Zero harsh braking events -- anticipate stops 3 seconds earlier.',
      'Maintain a 4-second following distance all day -- no exceptions.',
      'Complete your entire route without a single speeding alert.',
      'Keep idle time under 5 minutes total today.',
      'Perfect lane discipline -- check mirrors every 5-8 seconds.',
      'Smooth acceleration from every stop -- easy on the throttle.',
      'Zero phone distractions -- everything set up before you roll.',
    ];
    const challengeIndex = (dayOfYear + parseInt(resolvedId.replace(/\D/g, '') || '0', 10)) % challenges.length;
    const todayChallenge = challenges[challengeIndex];

    // Motivational message based on streak and risk
    let motivational: string;
    if (riskLevel === 'low' && streakDays >= 14) {
      motivational = `You're in the top tier of safe drivers, ${driver.firstName}. Your consistency is what separates the pros from the rest. Keep it up!`;
    } else if (riskLevel === 'low') {
      motivational = `Solid foundation, ${driver.firstName}. You're driving safe and building a reputation for it. One more clean day adds up.`;
    } else if (riskLevel === 'elevated') {
      motivational = `You've got the skills, ${driver.firstName}. Today just needs a little extra focus on the areas we flagged. You've got this.`;
    } else if (riskLevel === 'high') {
      motivational = `Today's about resetting, ${driver.firstName}. Take it slow, focus on the basics, and don't rush. One safe shift at a time.`;
    } else {
      motivational = `${driver.firstName}, today we're focused on getting you home safe. Take extra breaks, stay alert, and reach out if you need anything.`;
    }

    // Streak status
    let streakStatus: string;
    if (streakDays >= 30) {
      streakStatus = `${streakDays}-day streak! You're earning the "Road Guardian" badge.`;
    } else if (streakDays >= 14) {
      streakStatus = `${streakDays}-day streak. ${30 - streakDays} more days to earn "Road Guardian" badge!`;
    } else if (streakDays >= 7) {
      streakStatus = `${streakDays}-day streak. ${14 - streakDays} more days for "Smooth Operator" badge!`;
    } else {
      streakStatus = `${streakDays}-day streak. ${7 - streakDays} more clean days to earn "Safe Starter" badge!`;
    }

    // Fatigue/wellness warning if applicable
    const wellnessWarnings: string[] = [];
    if (wellness) {
      if (wellness.burnoutRisk === 'high') {
        wellnessWarnings.push('Wellness alert: Your fatigue indicators are elevated. Take mandatory breaks and consider a shorter route today.');
      }
      if (wellness.consecutiveLongDays >= 4) {
        wellnessWarnings.push(`You've had ${wellness.consecutiveLongDays} long days in a row. Take it easy today.`);
      }
      if (wellness.avgRestHours < 8) {
        wellnessWarnings.push(`Your average rest has been ${wellness.avgRestHours} hours. Try to get more rest tonight.`);
      }
    }

    return {
      driverId: resolvedId,
      driverName: driver.name,
      riskLevel,
      riskScore,
      greeting,
      focusAreas,
      weather: {
        condition: weatherCondition,
        temperature: `${temperature}°F`,
        advisory: ['Heavy rain', 'Thunderstorms', 'Fog', 'Snow flurries'].includes(weatherCondition)
          ? `Weather advisory: ${weatherCondition} expected. Adjust driving accordingly.`
          : null,
      },
      routeHazards,
      todayChallenge,
      motivational,
      streakStatus,
      wellnessWarnings,
      riskFactors: preShiftRisk?.factors ?? [],
      recommendation: preShiftRisk?.recommendation ?? 'Clear for standard operations.',
    };
  },
});

// ─── Tool 3: Safety Coaching ────────────────────────────────

const COACHING_TIPS: Record<string, string> = {
  harsh_braking: 'Try gradually easing off the accelerator 3-4 seconds earlier. Watch following distance.',
  speeding: 'Set cruise control on highways. Plan 10 extra minutes per trip to avoid rushing.',
  distracted_driving: 'Secure your phone in a mount before departure. Use voice commands only.',
  drowsy_driving: 'Take a 20-minute power nap if you feel drowsy. Don\'t push through fatigue.',
  lane_departure: 'Adjust mirrors before departure. Check lane position every 5-8 seconds.',
  tailgating: 'Maintain a 4-second following distance at all speeds. Increase in wet conditions.',
  harsh_acceleration: 'Accelerate smoothly from stops. Anticipate green lights.',
  seatbelt: 'Always buckle up before starting the engine. Make it automatic.',
  rolling_stop: 'Come to a complete stop for 3 full seconds at all stop signs.',
  idle_excessive: 'Turn off engine for stops longer than 2 minutes.',
};

export const getSafetyCoaching = tool({
  description:
    'Get personalized safety coaching recommendations based on a driver\'s event patterns, improvement areas, and progress. Use when a driver asks "how can I improve?", "coaching tips", "what am I doing wrong?", or wants safety advice.',
  parameters: z.object({
    driverId: z
      .string()
      .optional()
      .describe('Driver ID (e.g., "d1"). If not provided, tries to find by name.'),
    driverName: z
      .string()
      .optional()
      .describe('Search by driver name (partial match). Ignored if driverId is provided.'),
  }),
  execute: async ({ driverId, driverName }) => {
    const resolvedId = resolveDriverId(driverId, driverName);
    if (!resolvedId) return { error: 'Driver not found. Please provide a valid driver ID or name.' };

    const driver = seedDrivers.find((d) => d.id === resolvedId);
    if (!driver) return { error: 'Driver not found.' };

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 86400000;
    const fourteenDaysAgo = now - 14 * 86400000;
    const thirtyDaysAgo = now - 30 * 86400000;

    // Get events for different periods
    const events30 = seedSafetyEvents.filter(
      (e) => e.driverId === resolvedId && new Date(e.dateTime).getTime() > thirtyDaysAgo,
    );
    const events7 = seedSafetyEvents.filter(
      (e) => e.driverId === resolvedId && new Date(e.dateTime).getTime() > sevenDaysAgo,
    );
    const eventsPrev7 = seedSafetyEvents.filter((e) => {
      const t = new Date(e.dateTime).getTime();
      return e.driverId === resolvedId && t > fourteenDaysAgo && t <= sevenDaysAgo;
    });

    // Group by type for last 30 days
    const typeCounts: Record<string, number> = {};
    for (const event of events30) {
      typeCounts[event.type] = (typeCounts[event.type] || 0) + 1;
    }

    // Sort by frequency, get top 3
    const sortedTypes = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // Build improvement areas with specific tips
    const improvementAreas = sortedTypes.map(([type, count]) => ({
      eventType: type,
      displayName: type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      count,
      percentage: events30.length > 0 ? Math.round((count / events30.length) * 100) : 0,
    }));

    const specificTips = sortedTypes.map(([type, count]) => ({
      eventType: type,
      displayName: type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      tip: COACHING_TIPS[type] || 'Focus on awareness and defensive driving techniques.',
      eventCount30d: count,
    }));

    // Weekly progress: this week vs last week
    const weeklyChange = events7.length - eventsPrev7.length;
    const weeklyChangePercent = eventsPrev7.length > 0
      ? Math.round(((events7.length - eventsPrev7.length) / eventsPrev7.length) * 100)
      : events7.length > 0 ? 100 : 0;

    const weeklyProgress = {
      thisWeek: events7.length,
      lastWeek: eventsPrev7.length,
      change: weeklyChange,
      changePercent: weeklyChangePercent,
      trend: weeklyChange < 0 ? 'improving' : weeklyChange > 0 ? 'worsening' : 'stable',
    };

    // Monthly progress: 30-day average events per week vs this week
    const monthlyAvgPerWeek = events30.length > 0 ? Math.round((events30.length / 30) * 7 * 10) / 10 : 0;
    const monthlyProgress = {
      avgEventsPerWeek: monthlyAvgPerWeek,
      thisWeekEvents: events7.length,
      comparedToAverage: events7.length < monthlyAvgPerWeek ? 'below average (good!)' :
        events7.length > monthlyAvgPerWeek ? 'above average (needs work)' : 'at average',
    };

    // Session data for gamification
    const session = getDriverSession(resolvedId);
    const streakDays = session?.streakDays ?? 0;
    const safetyScore = session?.safetyScore ?? 0;

    // Badge progress hints
    const badgeHints: string[] = [];
    if (streakDays < 7) {
      badgeHints.push(`${7 - streakDays} more clean days for your "Safe Starter" badge!`);
    } else if (streakDays < 14) {
      badgeHints.push(`${14 - streakDays} more days for your "Smooth Operator" badge!`);
    } else if (streakDays < 30) {
      badgeHints.push(`${30 - streakDays} more days for your "Road Guardian" badge!`);
    } else {
      badgeHints.push('You\'ve earned "Road Guardian" status! Keep the streak alive!');
    }
    if (safetyScore >= 90) {
      badgeHints.push('Your safety score is in the elite zone (90+). You\'re a role model for the fleet.');
    } else if (safetyScore >= 80) {
      badgeHints.push(`${90 - safetyScore} more points to reach the elite 90+ safety score zone!`);
    }

    // Encouragement based on trend
    let encouragement: string;
    if (weeklyProgress.trend === 'improving') {
      encouragement = `Great progress, ${driver.firstName}! You had ${Math.abs(weeklyChange)} fewer events this week than last week. Keep up the momentum!`;
    } else if (weeklyProgress.trend === 'stable' && events7.length <= 2) {
      encouragement = `Solid week, ${driver.firstName}. You're keeping events low and consistent. That's what great drivers do.`;
    } else if (weeklyProgress.trend === 'stable') {
      encouragement = `Steady performance this week, ${driver.firstName}. Focus on the tips above to start trending down.`;
    } else {
      encouragement = `This week was tougher, ${driver.firstName}, but every day is a chance to improve. Focus on one tip at a time -- small changes add up fast.`;
    }

    return {
      driverId: resolvedId,
      driverName: driver.name,
      safetyScore,
      streakDays,
      totalEvents30d: events30.length,
      improvementAreas,
      specificTips,
      weeklyProgress,
      monthlyProgress,
      badgeHints,
      encouragement,
    };
  },
});

// ─── Tool 4: Incident Report ───────────────────────────────

const INCIDENT_KEYWORDS: Record<string, string[]> = {
  near_miss: ['close call', 'near miss', 'almost', 'barely', 'swerved to avoid', 'nearly hit', 'close one'],
  minor_incident: ['minor', 'scratch', 'dent', 'fender', 'bumped', 'small damage', 'scraped'],
  major_incident: ['accident', 'crash', 'collision', 'totaled', 'rollover', 'flipped', 'major damage', 'ambulance', 'injury'],
  hazard: ['hazard', 'debris', 'pothole', 'road damage', 'spill', 'obstacle', 'construction', 'road blocked'],
  mechanical: ['mechanical', 'broke down', 'engine', 'tire', 'flat', 'brakes failed', 'warning light', 'overheating', 'transmission'],
  weather: ['weather', 'ice', 'snow', 'flooding', 'visibility', 'fog', 'storm', 'wind', 'rain'],
};

const SEVERITY_KEYWORDS: Record<string, string[]> = {
  critical: ['injury', 'injuries', 'ambulance', 'fire', 'rollover', 'totaled', 'critical', 'emergency', 'trapped'],
  high: ['major', 'significant damage', 'collision', 'crash', 'blocked road', 'tow truck', 'cannot drive'],
  medium: ['moderate', 'dent', 'scraped', 'minor damage', 'close call', 'swerved'],
  low: ['near miss', 'small', 'barely', 'pothole', 'debris', 'minor hazard'],
};

export const reportIncident = tool({
  description:
    'Report a safety incident or near-miss. Creates an incident record from the driver\'s description. Use when a driver says "report an incident", "I had a close call", "there was an accident", "I need to report something", or describes a safety event.',
  parameters: z.object({
    driverId: z
      .string()
      .optional()
      .describe('Driver ID (e.g., "d1"). If not provided, tries to find by name.'),
    driverName: z
      .string()
      .optional()
      .describe('Search by driver name (partial match). Ignored if driverId is provided.'),
    description: z
      .string()
      .describe('Description of the incident as reported by the driver.'),
    type: z
      .enum(['near_miss', 'minor_incident', 'major_incident', 'hazard', 'mechanical', 'weather', 'other'])
      .optional()
      .describe('Type of incident. AI will classify if not provided.'),
    severity: z
      .enum(['low', 'medium', 'high', 'critical'])
      .optional()
      .describe('Severity level. AI will assess if not provided.'),
    location: z
      .string()
      .optional()
      .describe('Location of the incident if mentioned.'),
  }),
  execute: async ({ driverId, driverName, description, type, severity, location }) => {
    const resolvedId = resolveDriverId(driverId, driverName);
    if (!resolvedId) return { error: 'Driver not found. Please provide a valid driver ID or name.' };

    const driver = seedDrivers.find((d) => d.id === resolvedId);
    if (!driver) return { error: 'Driver not found.' };

    // Generate unique incident ID
    const incidentId = `INC-${Date.now().toString(36).toUpperCase()}`;

    // Auto-classify type if not provided
    let classifiedType = type || 'other';
    if (!type) {
      const descLower = description.toLowerCase();
      for (const [incType, keywords] of Object.entries(INCIDENT_KEYWORDS)) {
        if (keywords.some((kw) => descLower.includes(kw))) {
          classifiedType = incType as typeof classifiedType;
          break;
        }
      }
    }

    // Auto-classify severity if not provided
    let classifiedSeverity = severity || 'medium';
    if (!severity) {
      const descLower = description.toLowerCase();
      for (const [sev, keywords] of Object.entries(SEVERITY_KEYWORDS)) {
        if (keywords.some((kw) => descLower.includes(kw))) {
          classifiedSeverity = sev as typeof classifiedSeverity;
          break;
        }
      }
    }

    // Format type for display
    const typeDisplay = classifiedType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const severityDisplay = classifiedSeverity.charAt(0).toUpperCase() + classifiedSeverity.slice(1);

    // Notify dispatch
    const dispatchMessage = `INCIDENT REPORT (${incidentId}): ${typeDisplay} [${severityDisplay} severity] reported by ${driver.name}. ${location ? `Location: ${location}. ` : ''}Description: ${description}`;
    addDispatchMessage(resolvedId, {
      from: 'system',
      text: dispatchMessage,
      read: false,
    });

    // Generate next steps based on type and severity
    const nextSteps: string[] = [];
    if (classifiedSeverity === 'critical' || classifiedSeverity === 'high') {
      nextSteps.push('Dispatch has been notified immediately.');
      nextSteps.push('Ensure your safety and the safety of others first.');
      nextSteps.push('Do not move the vehicle unless there is immediate danger.');
      nextSteps.push('Take photos of the scene when it is safe to do so.');
      if (classifiedSeverity === 'critical') {
        nextSteps.push('If there are injuries, confirm emergency services have been called (911).');
      }
    } else if (classifiedType === 'mechanical') {
      nextSteps.push('Dispatch has been notified.');
      nextSteps.push('Pull over to a safe location if not already stopped.');
      nextSteps.push('Turn on hazard lights.');
      nextSteps.push('Do not attempt repairs unless trained and it is safe to do so.');
      nextSteps.push('A maintenance team will contact you shortly.');
    } else if (classifiedType === 'hazard') {
      nextSteps.push('Report logged and forwarded to dispatch.');
      nextSteps.push('Other drivers on this route will be notified.');
      nextSteps.push('Continue with caution.');
    } else {
      nextSteps.push('Incident logged and dispatch has been notified.');
      nextSteps.push('Continue your route if safe to do so.');
      nextSteps.push('A safety coordinator may follow up with you.');
    }

    return {
      incidentId,
      driverId: resolvedId,
      driverName: driver.name,
      classification: {
        type: classifiedType,
        typeDisplay,
        severity: classifiedSeverity,
        severityDisplay,
        autoClassified: !type || !severity,
      },
      description,
      location: location || 'Not specified',
      timestamp: new Date().toISOString(),
      confirmation: `Incident ${incidentId} has been recorded and dispatch has been notified.`,
      nextSteps,
    };
  },
});
