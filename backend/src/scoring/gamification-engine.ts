/**
 * Gamification Engine for FleetShield AI Driver Portal
 * Pure scoring engine that calculates points, badges, levels,
 * daily challenges, and rewards from seed data.
 *
 * Points and badges are deterministic based on 90 days of
 * seeded safety events and trip days.
 */

import {
  seedDrivers,
  seedSafetyEvents,
  seedTripDays,
  type SeedDriver,
  type SeedSafetyEvent,
  type SeedTripDay,
} from '../data/seed-data.js';

// ─── Interfaces ──────────────────────────────────────────────

export interface GamificationState {
  driverId: string;
  driverName: string;
  totalPoints: number;
  level: number;
  levelTitle: string;
  pointsToNextLevel: number;
  levelProgress: number; // 0-1
  currentStreak: number;
  streakMultiplier: number;
  badges: Badge[];
  recentPoints: PointTransaction[];
  dailyChallenge: DailyChallenge | null;
  weeklyStats: { pointsEarned: number; challengesCompleted: number; badgesEarned: number };
  rewards: RewardItem[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  earned: boolean;
  earnedDate?: string;
  progress: number; // 0-1
  requirement: string;
}

export interface PointTransaction {
  id: string;
  points: number;
  reason: string;
  timestamp: string;
  type: 'earned' | 'bonus' | 'deduction' | 'challenge' | 'badge';
}

export interface DailyChallenge {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  progress: number; // 0-1
  target: number;
  current: number;
  pointsReward: number;
  completed: boolean;
  expiresAt: string; // end of day
}

export interface RewardItem {
  id: string;
  name: string;
  icon: string;
  pointsCost: number;
  category: string;
  available: boolean; // based on current points
  levelRequired: number;
}

// ─── Level System ────────────────────────────────────────────

interface LevelDef {
  level: number;
  minPoints: number;
  title: string;
}

const LEVELS: LevelDef[] = [
  { level: 1, minPoints: 0, title: 'Rookie' },
  { level: 2, minPoints: 200, title: 'Road Ready' },
  { level: 3, minPoints: 500, title: 'Safe Hauler' },
  { level: 4, minPoints: 1200, title: 'Shield Bearer' },
  { level: 5, minPoints: 2500, title: 'Road Guardian' },
  { level: 6, minPoints: 5000, title: 'Fleet Champion' },
  { level: 7, minPoints: 10000, title: 'Legend' },
];

function getLevelInfo(points: number): { level: number; title: string; pointsToNext: number; progress: number } {
  let currentLevel = LEVELS[0];
  for (const lvl of LEVELS) {
    if (points >= lvl.minPoints) {
      currentLevel = lvl;
    }
  }

  const nextLevel = LEVELS.find((l) => l.level === currentLevel.level + 1);
  if (!nextLevel) {
    // Max level
    return { level: currentLevel.level, title: currentLevel.title, pointsToNext: 0, progress: 1 };
  }

  const range = nextLevel.minPoints - currentLevel.minPoints;
  const earned = points - currentLevel.minPoints;
  const progress = Math.min(1, earned / range);

  return {
    level: currentLevel.level,
    title: currentLevel.title,
    pointsToNext: nextLevel.minPoints - points,
    progress,
  };
}

// ─── Streak Multiplier ──────────────────────────────────────

function getStreakMultiplier(streak: number): number {
  if (streak >= 30) return 3.0;
  if (streak >= 14) return 2.0;
  if (streak >= 7) return 1.5;
  return 1.0;
}

// ─── Streak Calculation (same as calculateStreakDays in driver-session.ts) ─

function calculateStreakDays(driverId: string): number {
  const events = seedSafetyEvents
    .filter((e) => e.driverId === driverId && (e.severity === 'high' || e.severity === 'critical'))
    .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

  if (events.length === 0) return 90; // No critical/high events in 90 days

  const lastBadEvent = new Date(events[0].dateTime);
  const daysSince = Math.floor((Date.now() - lastBadEvent.getTime()) / 86400000);
  return daysSince;
}

// ─── Simple Hash Function (deterministic) ───────────────────

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// ─── Points Calculation ─────────────────────────────────────

function calculatePoints(driver: SeedDriver): { totalPoints: number; transactions: PointTransaction[] } {
  const transactions: PointTransaction[] = [];
  let totalPoints = 0;
  let txId = 1;

  const now = Date.now();
  const driverEvents = seedSafetyEvents.filter((e) => e.driverId === driver.id);
  const driverTrips = seedTripDays.filter((t) => t.driverId === driver.id);

  // Build a set of dates with medium/high/critical events
  const unsafeDays = new Set<string>();
  const mediumDays = new Set<string>();
  const highDays = new Set<string>();
  const criticalDays = new Set<string>();

  for (const ev of driverEvents) {
    const dateStr = ev.dateTime.split('T')[0];
    if (ev.severity === 'medium' || ev.severity === 'high' || ev.severity === 'critical') {
      unsafeDays.add(dateStr);
    }
    if (ev.severity === 'medium') mediumDays.add(dateStr + '|' + ev.id);
    if (ev.severity === 'high') highDays.add(dateStr + '|' + ev.id);
    if (ev.severity === 'critical') criticalDays.add(dateStr + '|' + ev.id);
  }

  // Build set of all dates in last 90 days
  const allDates: string[] = [];
  for (let day = 0; day < 90; day++) {
    const d = new Date(now - day * 86400000);
    allDates.push(d.toISOString().split('T')[0]);
  }

  // +10 per safe driving day (no medium/high/critical severity events that day)
  const safeDayDates: string[] = [];
  for (const dateStr of allDates) {
    if (!unsafeDays.has(dateStr)) {
      // Check if driver had trips that day
      const hadTrip = driverTrips.some((t) => t.date === dateStr);
      if (hadTrip) {
        safeDayDates.push(dateStr);
      }
    }
  }

  for (const dateStr of safeDayDates) {
    const pts = 10;
    totalPoints += pts;
    if (txId <= 20) { // Only keep recent 20 for display
      transactions.push({
        id: `pt-${driver.id}-${txId++}`,
        points: pts,
        reason: 'Safe driving day',
        timestamp: new Date(dateStr + 'T18:00:00Z').toISOString(),
        type: 'earned',
      });
    }
  }

  // +5 per trip day (completed trips from seedTripDays)
  for (const trip of driverTrips) {
    totalPoints += 5;
    if (txId <= 25) {
      transactions.push({
        id: `pt-${driver.id}-${txId++}`,
        points: 5,
        reason: `Completed ${trip.trips} trips`,
        timestamp: new Date(trip.date + 'T17:00:00Z').toISOString(),
        type: 'earned',
      });
    }
  }

  // Deductions: -5 per medium event, -15 per high event, -30 per critical event
  const mediumEvents = driverEvents.filter((e) => e.severity === 'medium');
  const highEvents = driverEvents.filter((e) => e.severity === 'high');
  const criticalEvents = driverEvents.filter((e) => e.severity === 'critical');

  for (const ev of mediumEvents) {
    totalPoints -= 5;
    if (txId <= 30) {
      transactions.push({
        id: `pt-${driver.id}-${txId++}`,
        points: -5,
        reason: `Medium severity: ${ev.type.replace(/_/g, ' ')}`,
        timestamp: ev.dateTime,
        type: 'deduction',
      });
    }
  }

  for (const ev of highEvents) {
    totalPoints -= 15;
    if (txId <= 35) {
      transactions.push({
        id: `pt-${driver.id}-${txId++}`,
        points: -15,
        reason: `High severity: ${ev.type.replace(/_/g, ' ')}`,
        timestamp: ev.dateTime,
        type: 'deduction',
      });
    }
  }

  for (const ev of criticalEvents) {
    totalPoints -= 30;
    if (txId <= 40) {
      transactions.push({
        id: `pt-${driver.id}-${txId++}`,
        points: -30,
        reason: `Critical severity: ${ev.type.replace(/_/g, ' ')}`,
        timestamp: ev.dateTime,
        type: 'deduction',
      });
    }
  }

  // +25 for completed daily challenges (simulate ~60% completion for low-risk, less for high-risk)
  const challengeCompletionRate = driver.riskProfile === 'low' ? 0.65
    : driver.riskProfile === 'moderate' ? 0.45
    : driver.riskProfile === 'high' ? 0.25
    : 0.15; // critical

  const numChallengesCompleted = Math.floor(90 * challengeCompletionRate);
  const challengePoints = numChallengesCompleted * 25;
  totalPoints += challengePoints;

  if (numChallengesCompleted > 0) {
    // Show a few representative transactions
    for (let i = 0; i < Math.min(5, numChallengesCompleted); i++) {
      transactions.push({
        id: `pt-${driver.id}-${txId++}`,
        points: 25,
        reason: 'Daily challenge completed',
        timestamp: new Date(now - (i * 2 + 1) * 86400000).toISOString(),
        type: 'challenge',
      });
    }
  }

  // +50 for each earned badge (calculated separately, but add to points)
  const badges = calculateBadges(driver);
  const earnedBadges = badges.filter((b) => b.earned);
  for (const badge of earnedBadges) {
    totalPoints += 50;
    transactions.push({
      id: `pt-${driver.id}-${txId++}`,
      points: 50,
      reason: `Badge earned: ${badge.name}`,
      timestamp: badge.earnedDate || new Date(now - 30 * 86400000).toISOString(),
      type: 'badge',
    });
  }

  // Apply streak multiplier as a bonus on top of base safe-day points
  const streak = calculateStreakDays(driver.id);
  const multiplier = getStreakMultiplier(streak);
  if (multiplier > 1.0) {
    const safeDayBase = safeDayDates.length * 10;
    const bonusPoints = Math.floor(safeDayBase * (multiplier - 1.0));
    totalPoints += bonusPoints;
    transactions.push({
      id: `pt-${driver.id}-${txId++}`,
      points: bonusPoints,
      reason: `Streak bonus (x${multiplier}, ${streak} days)`,
      timestamp: new Date().toISOString(),
      type: 'bonus',
    });
  }

  // Ensure minimum 0
  totalPoints = Math.max(0, totalPoints);

  // Sort transactions by timestamp descending
  transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return { totalPoints, transactions };
}

// ─── Badge Definitions & Calculation ────────────────────────

interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: string;
  check: (driver: SeedDriver, events: SeedSafetyEvent[], trips: SeedTripDay[], leaderboardRank: number, totalDrivers: number) => { earned: boolean; progress: number; earnedDate?: string };
}

function getLeaderboardRank(driverId: string): { rank: number; total: number } {
  // Compute a simple rank based on risk profile and streak
  const drivers = seedDrivers.length > 0 ? seedDrivers : [];
  const scores = drivers.map((d) => ({
    id: d.id,
    score: calculateSimpleScore(d),
  }));
  scores.sort((a, b) => b.score - a.score);
  const idx = scores.findIndex((s) => s.id === driverId);
  return { rank: idx + 1, total: scores.length };
}

function calculateSimpleScore(driver: SeedDriver): number {
  const events30 = seedSafetyEvents.filter(
    (e) => e.driverId === driver.id && new Date(e.dateTime) > new Date(Date.now() - 30 * 86400000),
  );
  const trips30 = seedTripDays.filter(
    (t) => t.driverId === driver.id && new Date(t.date) > new Date(Date.now() - 30 * 86400000),
  );
  const totalDistance = trips30.reduce((sum, t) => sum + t.totalDistance, 0);
  if (totalDistance === 0) return 85;
  const severityWeights: Record<string, number> = { low: 1, medium: 2, high: 4, critical: 8 };
  const weightedEvents = events30.reduce((sum, e) => sum + (severityWeights[e.severity] || 1), 0);
  const weightedRate = (weightedEvents / totalDistance) * 1000;
  return Math.max(0, Math.min(100, Math.round(100 - weightedRate * 3)));
}

const BADGE_DEFS: BadgeDef[] = [
  {
    id: 'safe_day_1',
    name: 'First Safe Day',
    description: 'Complete 1 day with no medium or higher severity events',
    icon: '\u{1F6E1}\uFE0F',
    requirement: '1 day no medium+ events',
    check: (driver, events, trips) => {
      const unsafeDays = new Set<string>();
      events.forEach((e) => {
        if (e.severity !== 'low') unsafeDays.add(e.dateTime.split('T')[0]);
      });
      const tripDates = new Set(trips.map((t) => t.date));
      let safeDayCount = 0;
      for (const date of tripDates) {
        if (!unsafeDays.has(date)) safeDayCount++;
      }
      const earned = safeDayCount >= 1;
      return { earned, progress: Math.min(1, safeDayCount / 1), earnedDate: earned ? new Date(Date.now() - 80 * 86400000).toISOString() : undefined };
    },
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Achieve a 7-day streak with no high/critical events',
    icon: '\u2694\uFE0F',
    requirement: '7-day streak',
    check: (driver) => {
      const streak = calculateStreakDays(driver.id);
      const earned = streak >= 7;
      return { earned, progress: Math.min(1, streak / 7), earnedDate: earned ? new Date(Date.now() - 60 * 86400000).toISOString() : undefined };
    },
  },
  {
    id: 'streak_14',
    name: 'Fortnight Fighter',
    description: 'Achieve a 14-day streak with no high/critical events',
    icon: '\u{1F5E1}\uFE0F',
    requirement: '14-day streak',
    check: (driver) => {
      const streak = calculateStreakDays(driver.id);
      const earned = streak >= 14;
      return { earned, progress: Math.min(1, streak / 14), earnedDate: earned ? new Date(Date.now() - 45 * 86400000).toISOString() : undefined };
    },
  },
  {
    id: 'streak_30',
    name: 'Monthly Master',
    description: 'Achieve a 30-day streak with no high/critical events',
    icon: '\u{1F451}',
    requirement: '30-day streak',
    check: (driver) => {
      const streak = calculateStreakDays(driver.id);
      const earned = streak >= 30;
      return { earned, progress: Math.min(1, streak / 30), earnedDate: earned ? new Date(Date.now() - 20 * 86400000).toISOString() : undefined };
    },
  },
  {
    id: 'no_speeding_14',
    name: 'Speed Angel',
    description: 'No speeding events for 14 consecutive days',
    icon: '\u{1F607}',
    requirement: 'No speeding for 14 days',
    check: (driver, events) => {
      const speedingEvents = events
        .filter((e) => e.type === 'speeding')
        .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
      let daysSinceLastSpeeding = 90;
      if (speedingEvents.length > 0) {
        daysSinceLastSpeeding = Math.floor((Date.now() - new Date(speedingEvents[0].dateTime).getTime()) / 86400000);
      }
      const earned = daysSinceLastSpeeding >= 14;
      return { earned, progress: Math.min(1, daysSinceLastSpeeding / 14), earnedDate: earned ? new Date(Date.now() - 30 * 86400000).toISOString() : undefined };
    },
  },
  {
    id: 'no_harsh_brake_14',
    name: 'Smooth Operator',
    description: 'No harsh braking events for 14 consecutive days',
    icon: '\u{1F3B5}',
    requirement: 'No harsh braking for 14 days',
    check: (driver, events) => {
      const brakeEvents = events
        .filter((e) => e.type === 'harsh_braking')
        .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
      let daysSinceLast = 90;
      if (brakeEvents.length > 0) {
        daysSinceLast = Math.floor((Date.now() - new Date(brakeEvents[0].dateTime).getTime()) / 86400000);
      }
      const earned = daysSinceLast >= 14;
      return { earned, progress: Math.min(1, daysSinceLast / 14), earnedDate: earned ? new Date(Date.now() - 25 * 86400000).toISOString() : undefined };
    },
  },
  {
    id: 'no_distracted_14',
    name: 'Focus Master',
    description: 'No distracted driving events for 14 consecutive days',
    icon: '\u{1F3AF}',
    requirement: 'No distracted driving for 14 days',
    check: (driver, events) => {
      const distractedEvents = events
        .filter((e) => e.type === 'distracted_driving')
        .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
      let daysSinceLast = 90;
      if (distractedEvents.length > 0) {
        daysSinceLast = Math.floor((Date.now() - new Date(distractedEvents[0].dateTime).getTime()) / 86400000);
      }
      const earned = daysSinceLast >= 14;
      return { earned, progress: Math.min(1, daysSinceLast / 14), earnedDate: earned ? new Date(Date.now() - 28 * 86400000).toISOString() : undefined };
    },
  },
  {
    id: 'top_5',
    name: 'Elite Five',
    description: 'Reach top 5 on the safety leaderboard',
    icon: '\u2B50',
    requirement: 'Reach top 5 in leaderboard',
    check: (driver, _events, _trips, rank, total) => {
      const earned = rank <= 5 && total > 0;
      return { earned, progress: total > 0 ? Math.min(1, Math.max(0, (total - rank + 1) / (total - 4))) : 0, earnedDate: earned ? new Date(Date.now() - 15 * 86400000).toISOString() : undefined };
    },
  },
  {
    id: 'top_1',
    name: 'Number One',
    description: 'Reach #1 on the safety leaderboard',
    icon: '\u{1F3C6}',
    requirement: 'Reach #1 in leaderboard',
    check: (driver, _events, _trips, rank, total) => {
      const earned = rank === 1 && total > 0;
      return { earned, progress: total > 0 ? Math.min(1, Math.max(0, (total - rank + 1) / total)) : 0, earnedDate: earned ? new Date(Date.now() - 10 * 86400000).toISOString() : undefined };
    },
  },
  {
    id: 'perfect_week',
    name: 'Perfect Week',
    description: 'Complete 5 out of 5 daily challenges in one week',
    icon: '\u{1F48E}',
    requirement: 'Complete 5/5 daily challenges in a week',
    check: (driver) => {
      // Simulate based on risk profile
      const completionRate = driver.riskProfile === 'low' ? 0.65
        : driver.riskProfile === 'moderate' ? 0.45
        : 0.2;
      // With ~65% daily completion for low-risk, probability of 5/5 in a week is ~0.65^5 ~ 0.116
      // Over 12+ weeks, low-risk drivers likely earned this
      const earned = completionRate >= 0.6;
      return { earned, progress: earned ? 1 : completionRate / 0.6, earnedDate: earned ? new Date(Date.now() - 35 * 86400000).toISOString() : undefined };
    },
  },
  {
    id: 'night_safe_7',
    name: 'Night Owl',
    description: 'Complete 7 safe night shifts (2+ night hours with no events)',
    icon: '\u{1F989}',
    requirement: '7 safe night shifts',
    check: (driver, events, trips) => {
      // Count days with nightDrivingHours > 2 and no events that day
      const eventDays = new Set<string>();
      events.forEach((e) => {
        if (e.severity !== 'low') eventDays.add(e.dateTime.split('T')[0]);
      });
      let safeNightCount = 0;
      for (const trip of trips) {
        if (trip.nightDrivingHours > 2 && !eventDays.has(trip.date)) {
          safeNightCount++;
        }
      }
      const earned = safeNightCount >= 7;
      return { earned, progress: Math.min(1, safeNightCount / 7), earnedDate: earned ? new Date(Date.now() - 40 * 86400000).toISOString() : undefined };
    },
  },
  {
    id: 'fuel_efficient_7',
    name: 'Eco Driver',
    description: 'Maintain below-average idling for 7 days',
    icon: '\u{1F33F}',
    requirement: 'Below-average idling for 7 days',
    check: (driver, _events, trips) => {
      // Calculate average idling across all drivers
      const allTrips = seedTripDays;
      const avgIdling = allTrips.length > 0
        ? allTrips.reduce((sum, t) => sum + t.idlingMinutes, 0) / allTrips.length
        : 30;
      // Count consecutive days below average for this driver
      const sorted = [...trips].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      let consecutiveLowIdle = 0;
      let maxConsecutive = 0;
      for (const trip of sorted) {
        if (trip.idlingMinutes < avgIdling) {
          consecutiveLowIdle++;
          maxConsecutive = Math.max(maxConsecutive, consecutiveLowIdle);
        } else {
          consecutiveLowIdle = 0;
        }
      }
      const earned = maxConsecutive >= 7;
      return { earned, progress: Math.min(1, maxConsecutive / 7), earnedDate: earned ? new Date(Date.now() - 22 * 86400000).toISOString() : undefined };
    },
  },
];

function calculateBadges(driver: SeedDriver): Badge[] {
  const events = seedSafetyEvents.filter((e) => e.driverId === driver.id);
  const trips = seedTripDays.filter((t) => t.driverId === driver.id);
  const { rank, total } = getLeaderboardRank(driver.id);

  return BADGE_DEFS.map((def) => {
    const result = def.check(driver, events, trips, rank, total);
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      icon: def.icon,
      earned: result.earned,
      earnedDate: result.earnedDate,
      progress: result.progress,
      requirement: def.requirement,
    };
  });
}

// ─── Daily Challenge System ─────────────────────────────────

interface ChallengeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  pointsReward: number;
  targetEventType?: string; // if checking for absence of this event type
  checkProgress: (driverId: string) => { current: number; target: number };
  weakAreas?: string[]; // event types this challenge helps with
}

const CHALLENGE_POOL: ChallengeDef[] = [
  {
    id: 'no_harsh_braking',
    name: 'Smooth Sailing',
    description: 'Zero harsh braking events today',
    icon: '\u{1F6A2}',
    pointsReward: 25,
    targetEventType: 'harsh_braking',
    weakAreas: ['harsh_braking'],
    checkProgress: (driverId) => {
      const todayEvents = getTodayEvents(driverId, 'harsh_braking');
      return { current: todayEvents === 0 ? 1 : 0, target: 1 };
    },
  },
  {
    id: 'speed_compliance',
    name: 'Speed Keeper',
    description: 'Stay within speed limits all day',
    icon: '\u{1F3CE}\uFE0F',
    pointsReward: 25,
    targetEventType: 'speeding',
    weakAreas: ['speeding'],
    checkProgress: (driverId) => {
      const todayEvents = getTodayEvents(driverId, 'speeding');
      return { current: todayEvents === 0 ? 1 : 0, target: 1 };
    },
  },
  {
    id: 'no_distraction',
    name: 'Eyes on Road',
    description: 'No distracted driving events',
    icon: '\u{1F440}',
    pointsReward: 25,
    targetEventType: 'distracted_driving',
    weakAreas: ['distracted_driving'],
    checkProgress: (driverId) => {
      const todayEvents = getTodayEvents(driverId, 'distracted_driving');
      return { current: todayEvents === 0 ? 1 : 0, target: 1 };
    },
  },
  {
    id: 'rest_champion',
    name: 'Rest Well',
    description: 'Take at least 8 hours rest between shifts',
    icon: '\u{1F634}',
    pointsReward: 25,
    weakAreas: ['drowsy_driving'],
    checkProgress: (driverId) => {
      const todayTrip = getTodayTrip(driverId);
      if (!todayTrip) return { current: 0, target: 8 };
      return { current: Math.min(todayTrip.restHoursBetweenShifts, 8), target: 8 };
    },
  },
  {
    id: 'fuel_efficient',
    name: 'Eco Mode',
    description: 'Keep idling under 15 minutes total',
    icon: '\u{1F331}',
    pointsReward: 25,
    weakAreas: ['idle_excessive'],
    checkProgress: (driverId) => {
      const todayTrip = getTodayTrip(driverId);
      if (!todayTrip) return { current: 15, target: 15 }; // No trip = goal met
      return { current: Math.max(0, 15 - todayTrip.idlingMinutes), target: 15 };
    },
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Start your shift before 7 AM',
    icon: '\u{1F305}',
    pointsReward: 25,
    checkProgress: (driverId) => {
      // Simulate based on hash
      const hash = simpleHash(driverId + 'earlybird');
      const started = hash % 3 !== 0; // ~66% chance
      return { current: started ? 1 : 0, target: 1 };
    },
  },
  {
    id: 'perfect_delivery',
    name: 'On Time',
    description: 'Complete delivery within scheduled window',
    icon: '\u{1F4E6}',
    pointsReward: 25,
    checkProgress: (driverId) => {
      // Simulate based on driver profile
      const driver = seedDrivers.find((d) => d.id === driverId);
      const onTime = driver && (driver.riskProfile === 'low' || driver.riskProfile === 'moderate');
      return { current: onTime ? 1 : 0, target: 1 };
    },
  },
  {
    id: 'zero_events',
    name: 'Clean Sheet',
    description: 'Zero safety events of any severity',
    icon: '\u2728',
    pointsReward: 25,
    checkProgress: (driverId) => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEvents = seedSafetyEvents.filter(
        (e) => e.driverId === driverId && new Date(e.dateTime) >= todayStart,
      ).length;
      return { current: todayEvents === 0 ? 1 : 0, target: 1 };
    },
  },
  {
    id: 'night_safe',
    name: 'Night Guardian',
    description: 'Complete a night shift with zero events',
    icon: '\u{1F319}',
    pointsReward: 25,
    weakAreas: ['drowsy_driving', 'lane_departure'],
    checkProgress: (driverId) => {
      const todayTrip = getTodayTrip(driverId);
      if (!todayTrip || todayTrip.nightDrivingHours < 1) return { current: 0, target: 1 };
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEvents = seedSafetyEvents.filter(
        (e) => e.driverId === driverId && new Date(e.dateTime) >= todayStart,
      ).length;
      return { current: todayEvents === 0 ? 1 : 0, target: 1 };
    },
  },
  {
    id: 'short_following',
    name: 'Space Keeper',
    description: 'No tailgating events today',
    icon: '\u{1F4CF}',
    pointsReward: 25,
    targetEventType: 'tailgating',
    weakAreas: ['tailgating'],
    checkProgress: (driverId) => {
      const todayEvents = getTodayEvents(driverId, 'tailgating');
      return { current: todayEvents === 0 ? 1 : 0, target: 1 };
    },
  },
];

function getTodayEvents(driverId: string, eventType?: string): number {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return seedSafetyEvents.filter((e) => {
    if (e.driverId !== driverId) return false;
    if (new Date(e.dateTime) < todayStart) return false;
    if (eventType && e.type !== eventType) return false;
    return true;
  }).length;
}

function getTodayTrip(driverId: string): SeedTripDay | undefined {
  const todayStr = new Date().toISOString().split('T')[0];
  return seedTripDays.find((t) => t.driverId === driverId && t.date === todayStr);
}

function selectDailyChallenge(driverId: string): DailyChallenge | null {
  const todayStr = new Date().toISOString().split('T')[0];
  const hashKey = driverId + todayStr;
  const hash = simpleHash(hashKey);

  // Find driver's weak areas
  const driverEvents = seedSafetyEvents.filter((e) => e.driverId === driverId);
  const eventTypeCounts: Record<string, number> = {};
  driverEvents.forEach((e) => {
    eventTypeCounts[e.type] = (eventTypeCounts[e.type] || 0) + 1;
  });

  // Sort challenge pool: prioritize challenges that match driver's weak areas
  const sortedChallenges = [...CHALLENGE_POOL].sort((a, b) => {
    const aRelevance = (a.weakAreas || []).reduce((sum, area) => sum + (eventTypeCounts[area] || 0), 0);
    const bRelevance = (b.weakAreas || []).reduce((sum, area) => sum + (eventTypeCounts[area] || 0), 0);
    return bRelevance - aRelevance; // Higher relevance first
  });

  // Use hash to pick from top-weighted pool (top half gets 70% chance)
  const topHalf = Math.ceil(sortedChallenges.length / 2);
  const useTopHalf = (hash % 10) < 7;
  const pool = useTopHalf ? sortedChallenges.slice(0, topHalf) : sortedChallenges.slice(topHalf);
  const selectedIndex = hash % pool.length;
  const challenge = pool[selectedIndex];

  const progress = challenge.checkProgress(driverId);
  const progressFraction = progress.target > 0 ? progress.current / progress.target : 0;

  // End of day
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return {
    id: challenge.id,
    name: challenge.name,
    description: challenge.description,
    icon: challenge.icon,
    progress: Math.min(1, progressFraction),
    target: progress.target,
    current: progress.current,
    pointsReward: challenge.pointsReward,
    completed: progressFraction >= 1,
    expiresAt: endOfDay.toISOString(),
  };
}

// ─── Rewards Catalog ────────────────────────────────────────

const REWARDS: Omit<RewardItem, 'available'>[] = [
  { id: 'r1', name: 'Coffee Gift Card', icon: '\u2615', pointsCost: 500, category: 'Gift Cards', levelRequired: 1 },
  { id: 'r2', name: 'Premium Parking Pass', icon: '\u{1F17F}\uFE0F', pointsCost: 1000, category: 'Perks', levelRequired: 2 },
  { id: 'r3', name: 'Fuel Card Bonus $50', icon: '\u26FD', pointsCost: 1500, category: 'Gift Cards', levelRequired: 3 },
  { id: 'r4', name: 'Extra PTO Day', icon: '\u{1F3D6}\uFE0F', pointsCost: 2000, category: 'Time Off', levelRequired: 3 },
  { id: 'r5', name: 'Fleet Champion Jacket', icon: '\u{1F9E5}', pointsCost: 3000, category: 'Merchandise', levelRequired: 4 },
  { id: 'r6', name: 'Year-End Bonus +5%', icon: '\u{1F4B0}', pointsCost: 5000, category: 'Financial', levelRequired: 5 },
];

function buildRewardsCatalog(totalPoints: number, level: number): RewardItem[] {
  return REWARDS.map((r) => ({
    ...r,
    available: totalPoints >= r.pointsCost && level >= r.levelRequired,
  }));
}

// ─── Cache ──────────────────────────────────────────────────

const gamificationCache = new Map<string, { state: GamificationState; timestamp: number }>();
const CACHE_TTL = 60000; // 60 seconds

// ─── Exported Functions ─────────────────────────────────────

export function getGamificationState(driverId: string): GamificationState | null {
  const now = Date.now();
  const cached = gamificationCache.get(driverId);
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.state;
  }

  const driver = seedDrivers.find((d) => d.id === driverId);
  if (!driver) return null;

  const { totalPoints, transactions } = calculatePoints(driver);
  const levelInfo = getLevelInfo(totalPoints);
  const streak = calculateStreakDays(driverId);
  const multiplier = getStreakMultiplier(streak);
  const badges = calculateBadges(driver);
  const dailyChallenge = selectDailyChallenge(driverId);
  const rewards = buildRewardsCatalog(totalPoints, levelInfo.level);

  // Weekly stats (last 7 days of transactions)
  const weekAgo = now - 7 * 86400000;
  const weekTransactions = transactions.filter((t) => new Date(t.timestamp).getTime() > weekAgo);
  const weeklyStats = {
    pointsEarned: weekTransactions.filter((t) => t.points > 0).reduce((sum, t) => sum + t.points, 0),
    challengesCompleted: weekTransactions.filter((t) => t.type === 'challenge').length,
    badgesEarned: weekTransactions.filter((t) => t.type === 'badge' && new Date(t.timestamp).getTime() > weekAgo).length,
  };

  const state: GamificationState = {
    driverId: driver.id,
    driverName: driver.name,
    totalPoints,
    level: levelInfo.level,
    levelTitle: levelInfo.title,
    pointsToNextLevel: levelInfo.pointsToNext,
    levelProgress: levelInfo.progress,
    currentStreak: streak,
    streakMultiplier: multiplier,
    badges,
    recentPoints: transactions.slice(0, 20), // Recent 20 transactions
    dailyChallenge,
    weeklyStats,
    rewards,
  };

  gamificationCache.set(driverId, { state, timestamp: now });
  return state;
}

export function getDriverBadges(driverId: string): Badge[] {
  const driver = seedDrivers.find((d) => d.id === driverId);
  if (!driver) return [];
  return calculateBadges(driver);
}

export function getPointsHistory(driverId: string): PointTransaction[] {
  const driver = seedDrivers.find((d) => d.id === driverId);
  if (!driver) return [];
  const { transactions } = calculatePoints(driver);
  return transactions;
}

export function getDailyChallenge(driverId: string): DailyChallenge | null {
  const driver = seedDrivers.find((d) => d.id === driverId);
  if (!driver) return null;
  return selectDailyChallenge(driverId);
}

export function getRewardsCatalog(driverId: string): RewardItem[] {
  const driver = seedDrivers.find((d) => d.id === driverId);
  if (!driver) return [];
  const { totalPoints } = calculatePoints(driver);
  const levelInfo = getLevelInfo(totalPoints);
  return buildRewardsCatalog(totalPoints, levelInfo.level);
}

export function checkChallengeProgress(driverId: string): DailyChallenge | null {
  const driver = seedDrivers.find((d) => d.id === driverId);
  if (!driver) return null;
  // Clear cache to get fresh progress
  gamificationCache.delete(driverId);
  return selectDailyChallenge(driverId);
}
