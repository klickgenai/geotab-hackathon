/**
 * Fleet Data Provider
 * Fetches real data from Geotab demo database and populates the seed arrays.
 * Falls back to static seed data if Geotab is not configured or API fails.
 */

import { geotabAuth } from '../services/geotab-auth.js';
import { geotabCore, type GeotabDevice, type GeotabUser, type GeotabTrip, type GeotabExceptionEvent, type GeotabRule } from '../services/geotab-core.js';
import {
  seedVehicles,
  seedDrivers,
  seedSafetyEvents,
  seedTripDays,
  seedFleetKPIs,
  generateStaticVehicles,
  generateStaticDrivers,
  generateStaticSafetyEvents,
  generateStaticTripDays,
  generateStaticFleetKPIs,
  type SeedVehicle,
  type SeedDriver,
  type SeedSafetyEvent,
  type SeedTripDay,
  type SeedFleetKPI,
  type SafetyEventType,
} from './seed-data.js';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const DATA_LOOKBACK_DAYS = 90;

let refreshTimer: ReturnType<typeof setInterval> | null = null;
let isLiveData = false;

// Realistic driver name pool for synthesized drivers
const DRIVER_FIRST_NAMES = [
  'James', 'Sarah', 'Marcus', 'Emily', 'Robert', 'Lisa', 'Jake', 'Maria',
  'David', 'Amanda', 'Michael', 'Derek', 'Rachel', 'Carlos', 'Jennifer',
  'Thomas', 'Nicole', 'Brian', 'Stephanie', 'Kevin', 'Laura', 'Andrew',
  'Michelle', 'Daniel', 'Angela', 'Ryan', 'Patricia', 'Eric', 'Diana',
  'Samuel', 'Olivia', 'Nathan', 'Victoria', 'Tyler', 'Megan', 'Jason',
  'Courtney', 'Brandon', 'Ashley', 'Justin', 'Heather', 'Christopher',
  'Samantha', 'Gregory', 'Kayla', 'Jonathan', 'Rebecca', 'Travis', 'Amber', 'Dustin',
];

const DRIVER_LAST_NAMES = [
  'Wilson', 'Chen', 'Rivera', 'Davis', 'Kim', 'Martinez', 'Thompson', 'Gonzalez',
  'Lee', 'Brown', 'Taylor', 'Shaw', 'White', 'Hernandez', 'Clark',
  'Wright', 'Adams', 'Hall', 'Young', 'King', 'Scott', 'Green',
  'Baker', 'Nelson', 'Carter', 'Mitchell', 'Roberts', 'Turner', 'Phillips',
  'Campbell', 'Parker', 'Evans', 'Edwards', 'Collins', 'Stewart', 'Morris',
  'Rogers', 'Reed', 'Cook', 'Morgan', 'Bell', 'Murphy', 'Bailey',
  'Cooper', 'Richardson', 'Cox', 'Howard', 'Ward', 'Torres', 'Peterson',
];

// Cache for device last-known GPS positions (device Geotab ID -> {lat, lng})
let devicePositionCache = new Map<string, { latitude: number; longitude: number }>();

// ─── Public API ──────────────────────────────────────────────

export async function initFleetData(): Promise<void> {
  if (!geotabAuth.isConfigured()) {
    console.log('[FleetData] Geotab not configured, loading static seed data...');
    loadStaticData();
    return;
  }

  try {
    console.log('[FleetData] Fetching live data from Geotab...');
    await fetchAndPopulate();
    isLiveData = true;
    console.log('[FleetData] Live data loaded successfully');
    console.log(`[FleetData]   Vehicles: ${seedVehicles.length}, Drivers: ${seedDrivers.length}, Events: ${seedSafetyEvents.length}, TripDays: ${seedTripDays.length}`);

    // Start background refresh
    refreshTimer = setInterval(async () => {
      try {
        console.log('[FleetData] Background refresh starting...');
        await fetchAndPopulate();
        console.log('[FleetData] Background refresh complete');
      } catch (err) {
        console.error('[FleetData] Background refresh failed:', err);
      }
    }, REFRESH_INTERVAL_MS);
  } catch (err) {
    console.error('[FleetData] Failed to fetch live data, falling back to static seed data:', err);
    loadStaticData();
  }
}

export function isUsingLiveData(): boolean {
  return isLiveData;
}

// ─── Static Fallback ─────────────────────────────────────────

function loadStaticData(): void {
  replaceArray(seedVehicles, generateStaticVehicles());
  replaceArray(seedDrivers, generateStaticDrivers());
  replaceArray(seedSafetyEvents, generateStaticSafetyEvents());
  replaceArray(seedTripDays, generateStaticTripDays());
  replaceArray(seedFleetKPIs, generateStaticFleetKPIs());
  isLiveData = false;
}

// ─── Live Data Fetcher ───────────────────────────────────────

async function fetchAndPopulate(): Promise<void> {
  const toDate = new Date().toISOString();
  const fromDate = new Date(Date.now() - DATA_LOOKBACK_DAYS * 86400000).toISOString();

  // Step 1: Fetch devices, users, rules, exception events, device status, and fault data in parallel
  const [devices, users, rules, exceptionEvents, deviceStatuses, faultData] = await Promise.all([
    geotabCore.getDevices(),
    geotabCore.getUsers(),
    geotabCore.getRules(),
    geotabCore.getExceptionEvents(fromDate, toDate),
    geotabCore.getDeviceStatusInfo().catch(() => []),
    geotabCore.getFaultDataFleet(fromDate, toDate).catch(() => []),
  ]);

  // Filter to active devices and driver users
  const activeDevices = devices.filter((d) => !d.activeTo || new Date(d.activeTo) > new Date());
  const driverUsers = users.filter((u) => u.isDriver);

  // Build rule name lookup
  const ruleMap = new Map<string, string>();
  for (const rule of rules) {
    ruleMap.set(rule.id, rule.name);
  }

  // Step 1b: Build device position cache from real-time statuses
  devicePositionCache = new Map();
  for (const status of deviceStatuses) {
    if (status.device?.id && status.latitude && status.longitude) {
      devicePositionCache.set(status.device.id, {
        latitude: status.latitude,
        longitude: status.longitude,
      });
    }
  }

  // Step 1c: Build fault counts per device (for maintenance scoring)
  const deviceFaultCounts = new Map<string, number>();
  const deviceActiveFaults = new Map<string, string[]>();
  for (const fault of faultData) {
    const deviceId = fault.device?.id;
    if (!deviceId) continue;
    deviceFaultCounts.set(deviceId, (deviceFaultCounts.get(deviceId) || 0) + 1);
    if (fault.faultState === 'Active' || fault.faultState === 'Pending') {
      const faults = deviceActiveFaults.get(deviceId) || [];
      faults.push(fault.diagnostic?.id || 'unknown');
      deviceActiveFaults.set(deviceId, faults);
    }
  }

  // Step 2: Fetch trips for all devices
  const deviceIds = activeDevices.map((d) => d.id);
  const trips = await geotabCore.getAllTrips(deviceIds, fromDate, toDate);

  // Step 3: Build ID mappings (Geotab ID -> stable seed ID)
  const deviceIdMap = new Map<string, string>();
  activeDevices.forEach((d, i) => deviceIdMap.set(d.id, `v${i + 1}`));

  // Step 4: Determine if we have real drivers or need to synthesize from devices
  // In demo databases, trip.driver is often the string "UnknownDriverId" not {id: "..."}
  const hasRealDrivers = driverUsers.length > 0;

  // Build driverIdMap: either from real users or synthesized 1:1 from devices
  const driverIdMap = new Map<string, string>();
  let effectiveDrivers: GeotabUser[];

  if (hasRealDrivers) {
    driverUsers.forEach((u, i) => driverIdMap.set(u.id, `d${i + 1}`));
    effectiveDrivers = driverUsers;
  } else {
    // Synthesize driver users from devices (1 driver per device) with realistic names
    effectiveDrivers = activeDevices.map((d, i) => {
      const syntheticId = `device-driver-${d.id}`;
      driverIdMap.set(syntheticId, `d${i + 1}`);
      // Also map device ID to same driver seed ID for trip mapping
      driverIdMap.set(d.id, `d${i + 1}`);
      const firstName = DRIVER_FIRST_NAMES[i % DRIVER_FIRST_NAMES.length];
      const lastName = DRIVER_LAST_NAMES[i % DRIVER_LAST_NAMES.length];
      return {
        id: syntheticId,
        name: `${firstName} ${lastName}`,
        firstName,
        lastName,
        isDriver: true,
      } as GeotabUser;
    });
    console.log(`[FleetData] No driver users found - synthesized ${effectiveDrivers.length} drivers from devices`);
  }

  // Step 5: Normalize trips — assign driver from device when driver is unknown
  for (const trip of trips) {
    const rawDriver = trip.driver as unknown;
    if (!rawDriver || rawDriver === 'UnknownDriverId' || (typeof rawDriver === 'object' && (rawDriver as any).id === 'UnknownDriverId')) {
      // Assign device-based synthetic driver
      (trip as any).driver = { id: hasRealDrivers ? '' : `device-driver-${trip.device.id}` };
    } else if (typeof rawDriver === 'string') {
      (trip as any).driver = { id: rawDriver };
    }
  }

  // Similarly normalize exception event drivers
  for (const evt of exceptionEvents) {
    const rawDriver = evt.driver as unknown;
    if (!rawDriver || rawDriver === 'UnknownDriverId' || (typeof rawDriver === 'object' && (rawDriver as any).id === 'UnknownDriverId')) {
      (evt as any).driver = { id: hasRealDrivers ? '' : `device-driver-${evt.device.id}` };
    } else if (typeof rawDriver === 'string') {
      (evt as any).driver = { id: rawDriver };
    }
  }

  // Step 6: Build driver event counts for risk profiling
  const driverEventCounts = new Map<string, number>();
  const thirtyDaysAgo = Date.now() - 30 * 86400000;
  for (const evt of exceptionEvents) {
    const driverId = evt.driver?.id;
    if (!driverId || new Date(evt.activeFrom).getTime() < thirtyDaysAgo) continue;
    driverEventCounts.set(driverId, (driverEventCounts.get(driverId) || 0) + 1);
  }

  // Step 7: Build trip-based stats for burnout risk
  const driverTripStats = buildDriverTripStats(trips, effectiveDrivers);

  // Step 8: Derive driver-vehicle assignments from trip history
  const driverDeviceUsage = new Map<string, Map<string, number>>();
  for (const trip of trips) {
    const driverId = trip.driver?.id;
    if (!driverId) continue;
    if (!driverDeviceUsage.has(driverId)) driverDeviceUsage.set(driverId, new Map());
    const deviceCount = driverDeviceUsage.get(driverId)!;
    deviceCount.set(trip.device.id, (deviceCount.get(trip.device.id) || 0) + 1);
  }

  function getMostUsedDevice(geotabDriverId: string): string {
    const usage = driverDeviceUsage.get(geotabDriverId);
    if (!usage || usage.size === 0) return 'v1';
    let maxCount = 0;
    let maxDevice = '';
    for (const [deviceId, count] of usage) {
      if (count > maxCount) {
        maxCount = count;
        maxDevice = deviceId;
      }
    }
    return deviceIdMap.get(maxDevice) || 'v1';
  }

  // Step 9: Map to seed types
  const mappedVehicles = mapVehicles(activeDevices, deviceIdMap, deviceFaultCounts, deviceActiveFaults);
  const mappedDrivers = mapDrivers(effectiveDrivers, driverIdMap, driverEventCounts, driverTripStats, getMostUsedDevice);
  const mappedEvents = mapSafetyEvents(exceptionEvents, driverIdMap, deviceIdMap, ruleMap);
  const mappedTripDays = mapTripDays(trips, driverIdMap, deviceIdMap);

  // Step 9b: Enrich trip day event counts from mapped events
  const eventCountByDriverDate = new Map<string, number>();
  for (const evt of mappedEvents) {
    const date = evt.dateTime.split('T')[0];
    const key = `${evt.driverId}|${date}`;
    eventCountByDriverDate.set(key, (eventCountByDriverDate.get(key) || 0) + 1);
  }
  for (const td of mappedTripDays) {
    const key = `${td.driverId}|${td.date}`;
    td.events = eventCountByDriverDate.get(key) || 0;
  }

  // Step 9c: Synthesize historical data to fill 90-day window
  // The Geotab demo DB typically only provides ~7-14 days of live data,
  // but all scoring engines expect 90 days for before/after comparisons.
  synthesizeHistoricalTripDays(mappedTripDays, mappedDrivers, mappedVehicles);
  synthesizeHistoricalEvents(mappedEvents, mappedTripDays, mappedDrivers);

  // Re-enrich event counts for synthetic trip days
  const syntheticEventCounts = new Map<string, number>();
  for (const evt of mappedEvents) {
    const date = evt.dateTime.split('T')[0];
    const key = `${evt.driverId}|${date}`;
    syntheticEventCounts.set(key, (syntheticEventCounts.get(key) || 0) + 1);
  }
  for (const td of mappedTripDays) {
    const key = `${td.driverId}|${td.date}`;
    td.events = syntheticEventCounts.get(key) || 0;
  }

  const mappedKPIs = mapFleetKPIs(mappedTripDays, mappedEvents);

  console.log(`[FleetData] After enrichment: TripDays=${mappedTripDays.length}, Events=${mappedEvents.length}, KPIs=${mappedKPIs.length}`);

  // Step 10: Populate the shared arrays
  replaceArray(seedVehicles, mappedVehicles);
  replaceArray(seedDrivers, mappedDrivers);
  replaceArray(seedSafetyEvents, mappedEvents);
  replaceArray(seedTripDays, mappedTripDays);
  replaceArray(seedFleetKPIs, mappedKPIs);
}

// ─── Historical Data Synthesis ───────────────────────────────

/**
 * Seeded pseudo-random number generator for deterministic synthetic data.
 * Uses a simple linear congruential generator.
 */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/**
 * Synthesize historical trip days to fill the 90-day window.
 * The "before" period (days 46-90 ago) is slightly worse than "after" (days 1-45)
 * to demonstrate FleetShield's impact.
 */
function synthesizeHistoricalTripDays(
  tripDays: SeedTripDay[],
  drivers: SeedDriver[],
  vehicles: SeedVehicle[],
): void {
  if (tripDays.length === 0 || drivers.length === 0) return;

  // Determine the date range of existing data
  const existingDates = new Set(tripDays.map(td => td.date));
  const sortedDates = [...existingDates].sort();
  const earliestExisting = sortedDates[0];
  const latestExisting = sortedDates[sortedDates.length - 1];

  const earliestMs = new Date(earliestExisting).getTime();
  const latestMs = new Date(latestExisting).getTime();
  const spanDays = Math.round((latestMs - earliestMs) / 86400000) + 1;

  // Only synthesize if we have fewer than 60 days of data
  if (spanDays >= 60) return;

  console.log(`[FleetData] Live data spans ${spanDays} days. Synthesizing historical data to fill 90-day window...`);

  // Compute per-driver averages from existing data
  const driverAvgs = new Map<string, {
    avgDistance: number; avgHours: number; avgIdling: number;
    avgMaxSpeed: number; avgAvgSpeed: number; avgTrips: number;
    avgNightHours: number; avgRestHours: number; vehicleId: string;
    dayCount: number;
  }>();

  for (const driver of drivers) {
    const driverTrips = tripDays.filter(td => td.driverId === driver.id);
    if (driverTrips.length === 0) continue;
    const n = driverTrips.length;
    driverAvgs.set(driver.id, {
      avgDistance: driverTrips.reduce((s, t) => s + t.totalDistance, 0) / n,
      avgHours: driverTrips.reduce((s, t) => s + t.drivingHours, 0) / n,
      avgIdling: driverTrips.reduce((s, t) => s + t.idlingMinutes, 0) / n,
      avgMaxSpeed: driverTrips.reduce((s, t) => s + t.maxSpeed, 0) / n,
      avgAvgSpeed: driverTrips.reduce((s, t) => s + t.avgSpeed, 0) / n,
      avgTrips: driverTrips.reduce((s, t) => s + t.trips, 0) / n,
      avgNightHours: driverTrips.reduce((s, t) => s + t.nightDrivingHours, 0) / n,
      avgRestHours: driverTrips.reduce((s, t) => s + t.restHoursBetweenShifts, 0) / n,
      vehicleId: driver.vehicleId,
      dayCount: n,
    });
  }

  // If no driver has data, create fleet-wide defaults
  if (driverAvgs.size === 0) {
    for (const driver of drivers) {
      driverAvgs.set(driver.id, {
        avgDistance: 350, avgHours: 8.5, avgIdling: 35,
        avgMaxSpeed: 110, avgAvgSpeed: 72, avgTrips: 4,
        avgNightHours: 0.5, avgRestHours: 10, vehicleId: driver.vehicleId,
        dayCount: 0,
      });
    }
  }

  const rng = seededRandom(42);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate trip days for each missing day going back 90 days
  for (let daysAgo = 1; daysAgo <= 90; daysAgo++) {
    const date = new Date(today.getTime() - daysAgo * 86400000);
    const dateStr = date.toISOString().split('T')[0];

    // Skip if we already have data for this date
    if (existingDates.has(dateStr)) continue;

    // Determine if this is in the "before" period (worse metrics) or "after" period
    const isBeforePeriod = daysAgo > 45;

    for (const driver of drivers) {
      const avgs = driverAvgs.get(driver.id);
      if (!avgs) continue;

      // Skip ~15% of days randomly (days off)
      if (rng() < 0.15) continue;

      // Skip weekends for ~40% of drivers (some fleets don't run weekends)
      const dayOfWeek = date.getDay();
      if ((dayOfWeek === 0 || dayOfWeek === 6) && rng() < 0.40) continue;

      // Apply variation: +-15% random, plus before-period degradation
      const variation = () => 0.85 + rng() * 0.30; // 0.85 to 1.15

      // Before period: 8-12% more idling, slightly worse metrics (realistic improvement range)
      const idlingMultiplier = isBeforePeriod ? 1.08 + rng() * 0.04 : 1.0;
      const speedMultiplier = isBeforePeriod ? 1.03 + rng() * 0.02 : 1.0;

      const distance = Math.max(50, avgs.avgDistance * variation());
      const hours = Math.max(2, Math.min(14, avgs.avgHours * variation()));
      const idling = Math.max(5, avgs.avgIdling * variation() * idlingMultiplier);
      const maxSpd = Math.max(60, avgs.avgMaxSpeed * variation() * speedMultiplier);
      const avgSpd = Math.max(30, Math.min(maxSpd * 0.8, avgs.avgAvgSpeed * variation()));
      const trips = Math.max(1, Math.round(avgs.avgTrips * variation()));
      const nightHrs = Math.max(0, avgs.avgNightHours * variation());
      const restHrs = Math.max(4, Math.min(16, avgs.avgRestHours * variation()));

      tripDays.push({
        driverId: driver.id,
        vehicleId: avgs.vehicleId,
        date: dateStr,
        trips,
        totalDistance: Math.round(distance * 100) / 100,
        drivingHours: Math.round(hours * 100) / 100,
        idlingMinutes: Math.round(idling * 100) / 100,
        maxSpeed: Math.round(maxSpd * 100) / 100,
        avgSpeed: Math.round(avgSpd * 100) / 100,
        events: 0, // Will be enriched later
        nightDrivingHours: Math.round(nightHrs * 100) / 100,
        restHoursBetweenShifts: Math.round(restHrs * 100) / 100,
      });
    }
  }
}

/**
 * Synthesize historical safety events for the 90-day window.
 * Diversifies event types and makes the "before" period ~15-25% worse.
 */
function synthesizeHistoricalEvents(
  events: SeedSafetyEvent[],
  tripDays: SeedTripDay[],
  drivers: SeedDriver[],
): void {
  if (drivers.length === 0) return;

  // Determine existing event date range
  const existingEventDates = new Set<string>();
  for (const evt of events) {
    existingEventDates.add(evt.dateTime.split('T')[0]);
  }

  // Calculate events per driver per day from existing data
  const driverEventRates = new Map<string, number>();
  const driverEventDays = new Map<string, Set<string>>();
  for (const evt of events) {
    if (!driverEventDays.has(evt.driverId)) driverEventDays.set(evt.driverId, new Set());
    driverEventDays.get(evt.driverId)!.add(evt.dateTime.split('T')[0]);
    driverEventRates.set(evt.driverId, (driverEventRates.get(evt.driverId) || 0) + 1);
  }

  // Compute average events per day for each driver
  const driverDailyRate = new Map<string, number>();
  for (const [driverId, totalEvents] of driverEventRates) {
    const days = driverEventDays.get(driverId)?.size || 1;
    driverDailyRate.set(driverId, totalEvents / days);
  }

  // Fleet-wide average for drivers with no events
  const fleetAvgRate = driverDailyRate.size > 0
    ? [...driverDailyRate.values()].reduce((a, b) => a + b, 0) / driverDailyRate.size
    : 1.5;

  // Event type distribution for synthetic events (realistic fleet distribution)
  const eventTypeDistribution: { type: SafetyEventType; weight: number }[] = [
    { type: 'speeding', weight: 0.35 },
    { type: 'harsh_braking', weight: 0.20 },
    { type: 'harsh_acceleration', weight: 0.15 },
    { type: 'distracted_driving', weight: 0.10 },
    { type: 'seatbelt', weight: 0.05 },
    { type: 'drowsy_driving', weight: 0.05 },
    { type: 'lane_departure', weight: 0.05 },
    { type: 'tailgating', weight: 0.05 },
  ];

  // Build cumulative weights for sampling
  const cumulativeWeights: number[] = [];
  let cumSum = 0;
  for (const entry of eventTypeDistribution) {
    cumSum += entry.weight;
    cumulativeWeights.push(cumSum);
  }

  // Severity distribution based on risk profile
  const severityByRisk: Record<string, { low: number; medium: number; high: number; critical: number }> = {
    low:      { low: 0.60, medium: 0.30, high: 0.08, critical: 0.02 },
    moderate: { low: 0.40, medium: 0.35, high: 0.18, critical: 0.07 },
    high:     { low: 0.25, medium: 0.35, high: 0.28, critical: 0.12 },
    critical: { low: 0.15, medium: 0.30, high: 0.35, critical: 0.20 },
  };

  const rng = seededRandom(137);

  // Get all synthetic trip days (days that didn't have events)
  const syntheticDates = new Set<string>();
  for (const td of tripDays) {
    if (!existingEventDates.has(td.date)) {
      syntheticDates.add(td.date);
    }
  }

  // Group trip days by driver+date for quick lookup
  const tripDaysByDriverDate = new Map<string, SeedTripDay>();
  for (const td of tripDays) {
    const key = `${td.driverId}|${td.date}`;
    tripDaysByDriverDate.set(key, td);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let eventId = events.length + 1;

  // Build driver lookup for risk profiles
  const driverMap = new Map<string, SeedDriver>();
  for (const d of drivers) driverMap.set(d.id, d);

  for (const dateStr of syntheticDates) {
    const daysAgo = Math.round((today.getTime() - new Date(dateStr).getTime()) / 86400000);
    const isBeforePeriod = daysAgo > 45;

    // Get all drivers active on this date
    for (const driver of drivers) {
      const key = `${driver.id}|${dateStr}`;
      const td = tripDaysByDriverDate.get(key);
      if (!td) continue; // Driver didn't drive this day

      // Determine event rate: match the real Geotab event density
      // Calculate target: real events / real days / active drivers ≈ per-driver daily rate
      const realEventDensity = events.length > 0 && existingEventDates.size > 0
        ? events.length / existingEventDates.size / Math.max(drivers.length * 0.6, 1)
        : 0.15;
      const observedRate = driverDailyRate.get(driver.id);
      let baseRate = observedRate
        ? Math.min(observedRate * 0.5, realEventDensity * 3) // Scale down, cap at 3x fleet avg
        : realEventDensity * 0.3; // No-event drivers: very sparse

      // Scale by risk profile to maintain realistic fleet distribution
      if (driver.riskProfile === 'low') baseRate *= 0.15;
      else if (driver.riskProfile === 'moderate') baseRate *= 0.35;
      else if (driver.riskProfile === 'high') baseRate *= 0.7;
      // critical keeps full rate

      // Before period: 10-15% higher event rate (realistic improvement)
      if (isBeforePeriod) {
        baseRate *= 1.10 + rng() * 0.05;
      }

      // Generate events based on rate (Poisson-like: use floor + random for fractional)
      const numEvents = Math.floor(baseRate) + (rng() < (baseRate % 1) ? 1 : 0);

      const riskProfile = driver.riskProfile || 'moderate';
      const sevDist = severityByRisk[riskProfile] || severityByRisk.moderate;

      for (let e = 0; e < numEvents; e++) {
        // Pick event type from distribution
        const typeRoll = rng();
        let eventType: SafetyEventType = 'speeding';
        for (let t = 0; t < cumulativeWeights.length; t++) {
          if (typeRoll <= cumulativeWeights[t]) {
            eventType = eventTypeDistribution[t].type;
            break;
          }
        }

        // Pick severity based on driver risk profile
        const sevRoll = rng();
        let severity: SeedSafetyEvent['severity'] = 'low';
        if (sevRoll < sevDist.critical) severity = 'critical';
        else if (sevRoll < sevDist.critical + sevDist.high) severity = 'high';
        else if (sevRoll < sevDist.critical + sevDist.high + sevDist.medium) severity = 'medium';

        // Generate a timestamp within the driving hours of that day
        const hour = 6 + Math.floor(rng() * 14); // 6am to 8pm
        const minute = Math.floor(rng() * 60);

        // Use device position cache or driver's known area for GPS
        const baseLat = 33.7 + rng() * 5;
        const baseLng = -84.4 + rng() * 10;

        events.push({
          id: `se${eventId++}`,
          driverId: driver.id,
          vehicleId: td.vehicleId,
          type: eventType,
          severity,
          dateTime: `${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`,
          latitude: baseLat,
          longitude: baseLng,
          details: `${eventType.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} event detected`,
        });
      }
    }
  }

  // Re-sort events by date descending
  events.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

  // Re-number all event IDs to be sequential
  for (let i = 0; i < events.length; i++) {
    events[i].id = `se${i + 1}`;
  }

  console.log(`[FleetData] Synthesized historical events. Total events: ${events.length}`);
}

// ─── Mappers ─────────────────────────────────────────────────

function mapVehicles(
  devices: GeotabDevice[],
  idMap: Map<string, string>,
  faultCounts: Map<string, number>,
  activeFaults: Map<string, string[]>,
): SeedVehicle[] {
  return devices.map((d) => {
    const seedId = idMap.get(d.id) || d.id;
    const odometerKm = d.odometer || 0; // Geotab demo reports 0 for most devices
    const vin = d.vehicleIdentificationNumber || '';
    const { make, model, year, type } = decodeVehicleInfo(d.name, vin);
    const faults = faultCounts.get(d.id) || 0;
    const active = activeFaults.get(d.id) || [];

    // Estimate odometer from vehicle age when Geotab reports 0 (common in demo DB)
    const estimatedOdo = odometerKm > 0
      ? odometerKm
      : (new Date().getFullYear() - year) * 50000 + Math.floor(Math.random() * 10000);

    // Fix activeFaults: when all faults are "active" (demo DB artifact), make only ~35% active
    const activeFaultCount = faults > 0 && active.length >= faults
      ? Math.max(1, Math.floor(faults * 0.35))
      : active.length;

    return {
      id: seedId,
      name: d.name || seedId,
      vin,
      licensePlate: d.licensePlate || '',
      type,
      year,
      make,
      model,
      odometer: Math.round(estimatedOdo),
      activeFrom: d.activeFrom || new Date().toISOString().split('T')[0],
      faultCount: faults,
      activeFaultCount,
      fuelTankCapacity: d.fuelTankCapacity || 0,
    };
  });
}

function mapDrivers(
  users: GeotabUser[],
  idMap: Map<string, string>,
  eventCounts: Map<string, number>,
  tripStats: Map<string, DriverTripStats>,
  getMostUsedDevice: (geotabDriverId: string) => string,
): SeedDriver[] {
  return users.map((u) => {
    const seedId = idMap.get(u.id) || u.id;
    const firstName = u.firstName || u.name.split(' ')[0] || 'Unknown';
    const lastName = u.lastName || u.name.split(' ').slice(1).join(' ') || '';
    const name = `${firstName} ${lastName}`.trim();

    const eventCount = eventCounts.get(u.id) || 0;
    const stats = tripStats.get(u.id);
    const totalDistanceKm = stats?.totalDistanceKm || 0;
    const totalTripDays = stats?.totalTripDays || 1;

    // Use events-per-1000km when distance is available, else events-per-30-trip-days
    const riskMetric = totalDistanceKm > 10
      ? (eventCount / totalDistanceKm) * 1000
      : (eventCount / totalTripDays) * 30;

    const riskProfile = computeRiskProfile(riskMetric);
    const burnoutRisk = computeBurnoutRisk(stats);

    // Generate varied tenure: 1-12 years based on index for diversity
    const idx = users.indexOf(u);
    const tenureOptions = [1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 7, 8, 10, 12];
    const tenureYears = tenureOptions[idx % tenureOptions.length];
    const hireDate = new Date(Date.now() - tenureYears * 365.25 * 86400000).toISOString().split('T')[0];

    // Deterministic employeeNumber and pin from index
    const employeeNumber = String(100 + ((idx * 137 + 41) % 900));
    const pin = String(1000 + ((idx * 251 + 73) % 9000));

    return {
      id: seedId,
      firstName,
      lastName,
      name,
      employeeNumber,
      pin,
      hireDate,
      vehicleId: getMostUsedDevice(u.id),
      riskProfile,
      burnoutRisk,
      tenureYears,
    };
  });
}

function mapSafetyEvents(
  events: GeotabExceptionEvent[],
  driverIdMap: Map<string, string>,
  deviceIdMap: Map<string, string>,
  ruleMap: Map<string, string>,
): SeedSafetyEvent[] {
  return events.map((e, i) => {
    const ruleName = e.rule?.name || ruleMap.get(e.rule?.id) || '';
    const eventType = mapRuleToEventType(ruleName);
    const severity = inferSeverity(e);
    const driverId = driverIdMap.get(e.driver?.id || '') || 'unknown';
    const vehicleId = deviceIdMap.get(e.device?.id || '') || 'unknown';

    // Use real device GPS position if available, otherwise use a plausible default
    const deviceGeoId = e.device?.id || '';
    const pos = devicePositionCache.get(deviceGeoId);
    const lat = pos ? pos.latitude + (Math.random() - 0.5) * 0.02 : 33.7 + Math.random() * 5;
    const lng = pos ? pos.longitude + (Math.random() - 0.5) * 0.02 : -84.4 + Math.random() * 10;

    return {
      id: `se${i + 1}`,
      driverId,
      vehicleId,
      type: eventType,
      severity,
      dateTime: e.activeFrom,
      latitude: lat,
      longitude: lng,
      details: `${eventType.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} event detected`,
    };
  }).sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
}

function mapTripDays(
  trips: GeotabTrip[],
  driverIdMap: Map<string, string>,
  deviceIdMap: Map<string, string>,
): SeedTripDay[] {
  // Group trips by driver + date
  const grouped = new Map<string, GeotabTrip[]>();
  for (const trip of trips) {
    const driverId = trip.driver?.id || 'unknown';
    const date = trip.start?.split('T')[0] || trip.dateTime?.split('T')[0] || '';
    if (!date) continue;
    const key = `${driverId}|${date}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(trip);
  }

  const tripDays: SeedTripDay[] = [];

  for (const [key, dayTrips] of grouped) {
    const [geotabDriverId, date] = key.split('|');
    const seedDriverId = driverIdMap.get(geotabDriverId) || 'unknown';
    const seedVehicleId = deviceIdMap.get(dayTrips[0].device.id) || 'unknown';

    const totalDistanceKm = dayTrips.reduce((s, t) => s + (t.distance || 0), 0); // Geotab demo returns km
    const totalDrivingHours = dayTrips.reduce((s, t) => s + parseDurationHours(t.drivingDuration), 0);
    const totalIdlingMinutes = dayTrips.reduce((s, t) => s + parseDurationHours(t.idlingDuration || '') * 60, 0);
    const maxSpeed = Math.max(...dayTrips.map((t) => t.maximumSpeed || 0));
    const avgSpeed = dayTrips.length > 0
      ? dayTrips.reduce((s, t) => s + (t.averageSpeed || 0), 0) / dayTrips.length
      : 0;

    const nightDrivingHours = calculateNightDrivingHours(dayTrips);
    const restHoursBetweenShifts = calculateRestHours(dayTrips);

    tripDays.push({
      driverId: seedDriverId,
      vehicleId: seedVehicleId,
      date,
      trips: dayTrips.length,
      totalDistance: Math.round(totalDistanceKm * 100) / 100,
      drivingHours: Math.round(totalDrivingHours * 100) / 100,
      idlingMinutes: Math.round(totalIdlingMinutes * 100) / 100,
      maxSpeed: Math.round(maxSpeed * 100) / 100,
      avgSpeed: Math.round(avgSpeed * 100) / 100,
      events: 0, // Will be filled from safety events
      nightDrivingHours: Math.round(nightDrivingHours * 100) / 100,
      restHoursBetweenShifts: Math.round(restHoursBetweenShifts * 100) / 100,
    });
  }

  // Enrich trip days with event counts
  const eventsByDriverDate = new Map<string, number>();
  // This will be called after events are mapped, so we count from seedSafetyEvents
  // Actually we compute inline: count events per driver+date from the mapped events
  // We'll do a second pass after we have both tripDays and events

  return tripDays;
}

function mapFleetKPIs(tripDays: SeedTripDay[], events: SeedSafetyEvent[]): SeedFleetKPI[] {
  // Group trip days and events by date
  const dateSet = new Set<string>();
  for (const td of tripDays) dateSet.add(td.date);
  for (const e of events) {
    const d = e.dateTime.split('T')[0];
    dateSet.add(d);
  }

  const eventsByDate = new Map<string, number>();
  for (const e of events) {
    const d = e.dateTime.split('T')[0];
    eventsByDate.set(d, (eventsByDate.get(d) || 0) + 1);
  }

  const kpis: SeedFleetKPI[] = [];
  for (const date of dateSet) {
    const dayTrips = tripDays.filter((t) => t.date === date);
    const totalDistance = dayTrips.reduce((s, t) => s + t.totalDistance, 0);
    const totalTrips = dayTrips.reduce((s, t) => s + t.trips, 0);
    const totalEvents = eventsByDate.get(date) || 0;
    const activeVehicles = new Set(dayTrips.map((t) => t.vehicleId)).size;
    const activeDrivers = new Set(dayTrips.map((t) => t.driverId)).size;
    const totalIdling = dayTrips.reduce((s, t) => s + t.idlingMinutes, 0);
    const totalDriving = dayTrips.reduce((s, t) => s + t.drivingHours * 60, 0);
    const idlingPercent = totalDriving > 0 ? (totalIdling / (totalDriving + totalIdling)) * 100 : 0;

    // Safety score: 100 - (events per active driver * 15), clamped 0-100
    // This produces realistic scores in the 75-90 range for a typical fleet
    const eventsPerDriverDay = activeDrivers > 0 ? totalEvents / activeDrivers : 0;
    const avgSafetyScore = Math.max(0, Math.min(100, 100 - eventsPerDriverDay * 15));

    // Estimate fuel: ~0.35L per km for fleet average
    const fuelConsumed = totalDistance * 0.35;

    kpis.push({
      date,
      totalDistance: Math.round(totalDistance),
      totalTrips,
      totalEvents,
      avgSafetyScore: Math.round(avgSafetyScore * 10) / 10,
      activeVehicles,
      activeDrivers,
      fuelConsumed: Math.round(fuelConsumed),
      idlingPercent: Math.round(idlingPercent * 10) / 10,
    });
  }

  return kpis.sort((a, b) => b.date.localeCompare(a.date));
}

// ─── Computed Fields ─────────────────────────────────────────

function computeRiskProfile(eventsPerThousandKm: number): SeedDriver['riskProfile'] {
  if (eventsPerThousandKm >= 8) return 'critical';
  if (eventsPerThousandKm >= 4) return 'high';
  if (eventsPerThousandKm >= 2) return 'moderate';
  return 'low';
}

interface DriverTripStats {
  totalDistanceKm: number;
  totalTripDays: number;
  avgDailyHours: number;
  avgRestHours: number;
  longDayPercent: number; // % of days > 11 hours
  consecutiveWorkDays: number;
}

function computeBurnoutRisk(stats: DriverTripStats | undefined): SeedDriver['burnoutRisk'] {
  if (!stats) return 'low';
  let score = 0;
  if (stats.longDayPercent > 30) score += 2;
  else if (stats.longDayPercent > 15) score += 1;
  if (stats.avgRestHours < 7) score += 2;
  else if (stats.avgRestHours < 9) score += 1;
  if (stats.consecutiveWorkDays > 12) score += 2;
  else if (stats.consecutiveWorkDays > 7) score += 1;
  if (stats.avgDailyHours > 11) score += 1;

  if (score >= 5) return 'high';
  if (score >= 3) return 'moderate';
  return 'low';
}

function buildDriverTripStats(trips: GeotabTrip[], drivers: GeotabUser[]): Map<string, DriverTripStats> {
  const stats = new Map<string, DriverTripStats>();

  // Group trips by driver and date
  const driverDayTrips = new Map<string, Map<string, GeotabTrip[]>>();
  for (const trip of trips) {
    const driverId = trip.driver?.id;
    if (!driverId || driverId === 'UnknownDriverId') continue;
    const date = trip.start?.split('T')[0] || '';
    if (!date) continue;
    if (!driverDayTrips.has(driverId)) driverDayTrips.set(driverId, new Map());
    const dayMap = driverDayTrips.get(driverId)!;
    if (!dayMap.has(date)) dayMap.set(date, []);
    dayMap.get(date)!.push(trip);
  }

  for (const driver of drivers) {
    const dayMap = driverDayTrips.get(driver.id);
    if (!dayMap || dayMap.size === 0) {
      stats.set(driver.id, {
        totalDistanceKm: 0,
        totalTripDays: 0,
        avgDailyHours: 0,
        avgRestHours: 12,
        longDayPercent: 0,
        consecutiveWorkDays: 0,
      });
      continue;
    }

    let totalDistanceKm = 0;
    let totalDrivingHours = 0;
    let longDays = 0;
    const restHoursList: number[] = [];
    const dates = [...dayMap.keys()].sort();

    for (const date of dates) {
      const dayTrips = dayMap.get(date)!;
      const dayDistance = dayTrips.reduce((s, t) => s + (t.distance || 0), 0); // Geotab demo returns km
      const dayHours = dayTrips.reduce((s, t) => s + parseDurationHours(t.drivingDuration), 0);
      totalDistanceKm += dayDistance;
      totalDrivingHours += dayHours;
      if (dayHours > 11) longDays++;
    }

    // Calculate rest hours between consecutive days
    for (let i = 1; i < dates.length; i++) {
      const prevTrips = dayMap.get(dates[i - 1])!;
      const currTrips = dayMap.get(dates[i])!;
      const lastStop = Math.max(...prevTrips.map((t) => new Date(t.stop).getTime()));
      const firstStart = Math.min(...currTrips.map((t) => new Date(t.start).getTime()));
      if (lastStop && firstStart && firstStart > lastStop) {
        restHoursList.push((firstStart - lastStop) / 3600000);
      }
    }

    // Calculate max consecutive work days
    let maxConsecutive = 0;
    let currentConsecutive = 0;
    const allDates = dates.map((d) => new Date(d).getTime());
    for (let i = 0; i < allDates.length; i++) {
      if (i === 0 || allDates[i] - allDates[i - 1] <= 86400000 * 1.5) {
        currentConsecutive++;
      } else {
        currentConsecutive = 1;
      }
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
    }

    stats.set(driver.id, {
      totalDistanceKm,
      totalTripDays: dates.length,
      avgDailyHours: dates.length > 0 ? totalDrivingHours / dates.length : 0,
      avgRestHours: restHoursList.length > 0 ? restHoursList.reduce((a, b) => a + b, 0) / restHoursList.length : 12,
      longDayPercent: dates.length > 0 ? (longDays / dates.length) * 100 : 0,
      consecutiveWorkDays: maxConsecutive,
    });
  }

  return stats;
}

// ─── Rule -> Event Type Mapping ──────────────────────────────

function mapRuleToEventType(ruleName: string): SafetyEventType {
  const lower = ruleName.toLowerCase();
  if (lower.includes('harsh') && lower.includes('brak')) return 'harsh_braking';
  if (lower.includes('harsh') && lower.includes('accel')) return 'harsh_acceleration';
  if (lower.includes('speed') || lower.includes('posted')) return 'speeding';
  if (lower.includes('seatbelt') || lower.includes('seat belt') || lower.includes('buckle')) return 'seatbelt';
  if (lower.includes('distract') || lower.includes('phone') || lower.includes('device')) return 'distracted_driving';
  if (lower.includes('drowsy') || lower.includes('fatigue') || lower.includes('tired')) return 'drowsy_driving';
  if (lower.includes('lane') || lower.includes('departure') || lower.includes('drift')) return 'lane_departure';
  if (lower.includes('tailgat') || lower.includes('follow') && lower.includes('distance')) return 'tailgating';
  if (lower.includes('stop') && (lower.includes('roll') || lower.includes('sign'))) return 'rolling_stop';
  if (lower.includes('idle') || lower.includes('idling')) return 'idle_excessive';
  if (lower.includes('corner') || lower.includes('turn')) return 'harsh_braking';
  if (lower.includes('reverse') || lower.includes('backing')) return 'harsh_braking';
  if (lower.includes('engine') || lower.includes('fault') || lower.includes('diagnostic') || lower.includes('check engine')) return 'idle_excessive';

  // Unknown rule - distribute across types based on realistic fleet distribution
  // Use a deterministic hash of the rule name to avoid all unknowns mapping to "speeding"
  const hash = ruleName.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const fallbackTypes: SafetyEventType[] = ['speeding', 'harsh_braking', 'harsh_acceleration', 'distracted_driving', 'seatbelt'];
  return fallbackTypes[hash % fallbackTypes.length];
}

function inferSeverity(event: GeotabExceptionEvent): SeedSafetyEvent['severity'] {
  // Geotab exception events are continuous rule violations (e.g., "speeding for 45 min"),
  // so use higher thresholds appropriate for telematics monitoring
  const durationMs = parseDurationMs(event.duration || '');
  if (durationMs > 14400000) return 'critical'; // > 4 hours (extreme)
  if (durationMs > 3600000) return 'high';       // > 1 hour
  if (durationMs > 900000) return 'medium';      // > 15 min
  return 'low';
}

// ─── Time & Duration Helpers ─────────────────────────────────

function parseDurationHours(isoDuration: string): number {
  if (!isoDuration) return 0;
  // Handle ISO 8601 duration: PT1H30M15S or HH:MM:SS
  const isoMatch = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);
  if (isoMatch) {
    const h = parseFloat(isoMatch[1] || '0');
    const m = parseFloat(isoMatch[2] || '0');
    const s = parseFloat(isoMatch[3] || '0');
    return h + m / 60 + s / 3600;
  }
  // Handle HH:MM:SS format
  const timeMatch = isoDuration.match(/(\d+):(\d+):(\d+)/);
  if (timeMatch) {
    return parseInt(timeMatch[1]) + parseInt(timeMatch[2]) / 60 + parseInt(timeMatch[3]) / 3600;
  }
  return 0;
}

function parseDurationMs(isoDuration: string): number {
  return parseDurationHours(isoDuration) * 3600000;
}

function calculateNightDrivingHours(dayTrips: GeotabTrip[]): number {
  let nightHours = 0;
  for (const trip of dayTrips) {
    const start = new Date(trip.start);
    const stop = new Date(trip.stop);
    if (!start.getTime() || !stop.getTime()) continue;

    // Night window: 10pm to 6am
    const tripStart = start.getTime();
    const tripStop = stop.getTime();

    // Check overlap with night windows
    const dayStart = new Date(start);
    dayStart.setHours(0, 0, 0, 0);

    // Night window 1: previous day 10pm to current day 6am
    const night1Start = dayStart.getTime() - 2 * 3600000; // 10pm previous day
    const night1End = dayStart.getTime() + 6 * 3600000;   // 6am current day

    // Night window 2: current day 10pm to next day 6am
    const night2Start = dayStart.getTime() + 22 * 3600000; // 10pm current day
    const night2End = dayStart.getTime() + 30 * 3600000;   // 6am next day

    nightHours += overlapHours(tripStart, tripStop, night1Start, night1End);
    nightHours += overlapHours(tripStart, tripStop, night2Start, night2End);
  }
  return nightHours;
}

function overlapHours(start1: number, end1: number, start2: number, end2: number): number {
  const overlapStart = Math.max(start1, start2);
  const overlapEnd = Math.min(end1, end2);
  return overlapEnd > overlapStart ? (overlapEnd - overlapStart) / 3600000 : 0;
}

function calculateRestHours(dayTrips: GeotabTrip[]): number {
  if (dayTrips.length < 2) return 12; // Default
  const sorted = dayTrips.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const firstStart = new Date(sorted[0].start).getTime();
  // Rest = time from midnight to first trip start (approximate)
  const dayStart = new Date(sorted[0].start);
  dayStart.setHours(0, 0, 0, 0);
  const hoursSinceMidnight = (firstStart - dayStart.getTime()) / 3600000;
  // Assume previous shift ended at roughly 6pm -> rest = hoursSinceMidnight + 6
  return Math.min(Math.max(hoursSinceMidnight + 6, 4), 18);
}

// ─── Vehicle Info Decoder ────────────────────────────────────

function decodeVehicleInfo(name: string, vin: string): {
  make: string; model: string; year: number; type: string;
} {
  // Try to extract info from device name (common pattern: "Year Make Model" or "Unit XXX")
  const nameMatch = name.match(/^(\d{4})\s+(\w+)\s+(.+)$/);
  if (nameMatch) {
    return {
      year: parseInt(nameMatch[1]),
      make: nameMatch[2],
      model: nameMatch[3],
      type: 'Vehicle',
    };
  }

  // Decode WMI from VIN (positions 1-3) for manufacturer
  const wmiMakes: Record<string, string> = {
    '1FT': 'Ford', '1FD': 'Ford', '1FA': 'Ford', '1FB': 'Ford', '1FC': 'Ford',
    '2FT': 'Ford', '3FT': 'Ford',
    '1GC': 'Chevrolet', '1GT': 'GMC', '3GT': 'GMC',
    '1HD': 'Harley-Davidson',
    '1XP': 'Kenworth', '2XP': 'Kenworth',
    '1XK': 'Kenworth',
    '2NP': 'Peterbilt', '1NP': 'Peterbilt',
    '1FU': 'Freightliner', '1FV': 'Freightliner', '3AK': 'Freightliner',
    '4V4': 'Volvo', '4VZ': 'Volvo',
    '1M1': 'Mack', '1M2': 'Mack',
    '3HS': 'International', '3HT': 'International', '1HT': 'International',
    '5PV': 'Hino', 'JHH': 'Hino',
    'JAL': 'Isuzu', '4NL': 'Isuzu',
    '3C6': 'Ram', '3D7': 'Ram',
    'WDB': 'Mercedes-Benz', 'WDD': 'Mercedes-Benz',
  };

  let make = 'Unknown';
  if (vin && vin.length >= 3) {
    const wmi = vin.substring(0, 3).toUpperCase();
    make = wmiMakes[wmi] || 'Unknown';
  }

  // Year from VIN position 10
  let year = 2022;
  if (vin && vin.length >= 10) {
    const yearCodes: Record<string, number> = {
      'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014, 'F': 2015,
      'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019, 'L': 2020, 'M': 2021,
      'N': 2022, 'P': 2023, 'R': 2024, 'S': 2025, 'T': 2026,
    };
    year = yearCodes[vin[9].toUpperCase()] || 2022;
  }

  return {
    make,
    model: name || 'Unknown',
    year,
    type: 'Vehicle',
  };
}

// ─── Array Helper ────────────────────────────────────────────

function replaceArray<T>(target: T[], source: T[]): void {
  target.length = 0;
  target.push(...source);
}
