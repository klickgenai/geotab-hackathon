/**
 * Driver Session & Load Management
 * Manages driver login/sessions, load assignments, dispatch messages,
 * safety scores, streak tracking, and leaderboard rankings.
 */

import { seedDrivers, seedVehicles, seedSafetyEvents, seedTripDays } from './seed-data.js';

// ─── Types ──────────────────────────────────────────────────

export interface DriverSession {
  driverId: string;
  driverName: string;
  employeeNumber: string;
  vehicleId: string;
  vehicleName: string;
  loginTime: string;
  currentLoad: LoadAssignment | null;
  recentMessages: DispatchMessage[];
  safetyScore: number;
  streakDays: number;
  todayEvents: number;
  weeklyRank: number;
}

export interface LoadAssignment {
  id: string;
  driverId: string;
  status: 'assigned' | 'en_route' | 'at_pickup' | 'loaded' | 'in_transit' | 'at_delivery' | 'delivered';
  origin: { city: string; state: string; address: string };
  destination: { city: string; state: string; address: string };
  pickupTime: string;
  deliveryTime: string;
  commodity: string;
  weight: number;
  rate: number;
  distance: number;
  broker: { name: string; phone: string };
  notes: string;
}

export interface DispatchMessage {
  id: string;
  from: 'dispatch' | 'driver' | 'system';
  text: string;
  timestamp: string;
  read: boolean;
}

export interface ActionItem {
  id: string;
  text: string;
  source: 'voice' | 'tool' | 'system';
  status: 'pending' | 'completed' | 'dismissed';
  createdAt: string;
  completedAt?: string;
}

// ─── In-memory stores ───────────────────────────────────────

const activeSessions = new Map<string, DriverSession>();
const allLoads: LoadAssignment[] = [];
const driverMessages = new Map<string, DispatchMessage[]>();
let messageIdCounter = 1;
const driverActionItems = new Map<string, ActionItem[]>();
let actionIdCounter = 1;

// ─── Seed Data: Realistic city pairs ────────────────────────

interface CityPair {
  origin: { city: string; state: string; address: string };
  destination: { city: string; state: string; address: string };
  distance: number;
}

const CITY_PAIRS: CityPair[] = [
  {
    origin: { city: 'Toronto', state: 'ON', address: '6900 Airport Rd, Mississauga' },
    destination: { city: 'Montreal', state: 'QC', address: '2100 Trans-Canada Hwy, Dorval' },
    distance: 541,
  },
  {
    origin: { city: 'Toronto', state: 'ON', address: '1 York St, Toronto' },
    destination: { city: 'Ottawa', state: 'ON', address: '300 Coventry Rd, Ottawa' },
    distance: 450,
  },
  {
    origin: { city: 'Detroit', state: 'MI', address: '1700 Fort St, Detroit' },
    destination: { city: 'Chicago', state: 'IL', address: '3901 S Ashland Ave, Chicago' },
    distance: 382,
  },
  {
    origin: { city: 'Toronto', state: 'ON', address: '50 Eastern Ave, Toronto' },
    destination: { city: 'Windsor', state: 'ON', address: '1250 Walker Rd, Windsor' },
    distance: 376,
  },
  {
    origin: { city: 'Hamilton', state: 'ON', address: '100 King St W, Hamilton' },
    destination: { city: 'Buffalo', state: 'NY', address: '500 Seneca St, Buffalo' },
    distance: 105,
  },
  {
    origin: { city: 'Montreal', state: 'QC', address: '8585 Trans-Canada Hwy, Montreal' },
    destination: { city: 'Quebec City', state: 'QC', address: '770 Bouvier St, Quebec' },
    distance: 254,
  },
  {
    origin: { city: 'Toronto', state: 'ON', address: '3600 Steeles Ave E, Markham' },
    destination: { city: 'Sudbury', state: 'ON', address: '280 Lorne St, Sudbury' },
    distance: 390,
  },
  {
    origin: { city: 'Kitchener', state: 'ON', address: '1400 Weber St E, Kitchener' },
    destination: { city: 'Toronto', state: 'ON', address: '5800 Dixie Rd, Mississauga' },
    distance: 108,
  },
  {
    origin: { city: 'Chicago', state: 'IL', address: '700 W 47th St, Chicago' },
    destination: { city: 'Indianapolis', state: 'IN', address: '3820 W Morris St, Indianapolis' },
    distance: 290,
  },
  {
    origin: { city: 'Toronto', state: 'ON', address: '2900 Steeles Ave W, Concord' },
    destination: { city: 'Thunder Bay', state: 'ON', address: '500 Harbour Expy, Thunder Bay' },
    distance: 1370,
  },
  {
    origin: { city: 'London', state: 'ON', address: '1680 Dundas St E, London' },
    destination: { city: 'Toronto', state: 'ON', address: '275 Front St E, Toronto' },
    distance: 191,
  },
  {
    origin: { city: 'Montreal', state: 'QC', address: '1000 Rue de la Gauchetiere, Montreal' },
    destination: { city: 'Moncton', state: 'NB', address: '120 Mapleton Rd, Moncton' },
    distance: 1126,
  },
  {
    origin: { city: 'Detroit', state: 'MI', address: '1 Auto Club Dr, Dearborn' },
    destination: { city: 'Cleveland', state: 'OH', address: '4800 Tiedeman Rd, Cleveland' },
    distance: 275,
  },
  {
    origin: { city: 'Toronto', state: 'ON', address: '900 Derry Rd E, Mississauga' },
    destination: { city: 'Barrie', state: 'ON', address: '44 Cedar Pointe Dr, Barrie' },
    distance: 107,
  },
  {
    origin: { city: 'Brampton', state: 'ON', address: '499 Main St S, Brampton' },
    destination: { city: 'Kingston', state: 'ON', address: '945 Midland Ave, Kingston' },
    distance: 284,
  },
  {
    origin: { city: 'Ottawa', state: 'ON', address: '1355 Bank St, Ottawa' },
    destination: { city: 'Toronto', state: 'ON', address: '150 Consumers Rd, North York' },
    distance: 450,
  },
  {
    origin: { city: 'Buffalo', state: 'NY', address: '200 Delaware Ave, Buffalo' },
    destination: { city: 'Syracuse', state: 'NY', address: '5801 Bridge St, Syracuse' },
    distance: 245,
  },
  {
    origin: { city: 'Windsor', state: 'ON', address: '4555 Huron Church Rd, Windsor' },
    destination: { city: 'Toronto', state: 'ON', address: '1 Blue Jays Way, Toronto' },
    distance: 376,
  },
];

const COMMODITIES = [
  'Dry Goods', 'Auto Parts', 'Building Materials', 'Electronics',
  'Food & Beverage', 'Paper Products', 'Steel Coils', 'Machinery',
  'Consumer Goods', 'Pharmaceutical', 'Agricultural Products', 'Textiles',
  'Furniture', 'Chemical Products', 'Packaging Supplies',
];

const BROKERS = [
  { name: 'TQL Logistics', phone: '(800) 580-3101' },
  { name: 'C.H. Robinson', phone: '(855) 229-6128' },
  { name: 'Echo Global', phone: '(800) 354-7993' },
  { name: 'XPO Logistics', phone: '(844) 742-5976' },
  { name: 'Coyote Logistics', phone: '(877) 626-9683' },
  { name: 'Transplace', phone: '(866) 413-9266' },
  { name: 'Arrive Logistics', phone: '(855) 454-6862' },
  { name: 'Redwood Logistics', phone: '(844) 467-3396' },
];

const LOAD_STATUSES: LoadAssignment['status'][] = [
  'assigned', 'en_route', 'at_pickup', 'loaded', 'in_transit', 'at_delivery',
];

// ─── Initialization ─────────────────────────────────────────

function generateLoads(): void {
  allLoads.length = 0;
  const drivers = seedDrivers.length > 0 ? seedDrivers : [];
  const numLoads = Math.min(Math.max(15, Math.floor(drivers.length * 0.6)), 20);

  for (let i = 0; i < numLoads; i++) {
    const driver = drivers[i % drivers.length];
    const pair = CITY_PAIRS[i % CITY_PAIRS.length];
    const commodity = COMMODITIES[i % COMMODITIES.length];
    const broker = BROKERS[i % BROKERS.length];
    const status = LOAD_STATUSES[i % LOAD_STATUSES.length];

    const now = Date.now();
    const pickupOffset = Math.floor(Math.random() * 12 - 2) * 3600000; // -2 to +10 hours from now
    const transitHours = Math.round(pair.distance / 80); // ~80 km/h average
    const deliveryOffset = pickupOffset + transitHours * 3600000;

    allLoads.push({
      id: `LD-${1000 + i}`,
      driverId: driver.id,
      status,
      origin: pair.origin,
      destination: pair.destination,
      pickupTime: new Date(now + pickupOffset).toISOString(),
      deliveryTime: new Date(now + deliveryOffset).toISOString(),
      commodity,
      weight: Math.round(20000 + Math.random() * 25000),
      rate: Math.round(1200 + pair.distance * 2.5 + Math.random() * 500),
      distance: pair.distance,
      broker,
      notes: generateLoadNote(commodity, status),
    });
  }
}

function generateLoadNote(commodity: string, status: string): string {
  const notes: Record<string, string[]> = {
    assigned: [
      `${commodity} shipment ready for pickup.`,
      `Pre-loaded trailer at dock 12. Seal #48291.`,
      `Contact shipper 30 min before arrival.`,
    ],
    en_route: [
      `Driver en route to shipper. On time.`,
      `ETA on track. Check in at arrival.`,
    ],
    at_pickup: [
      `Driver checked in at shipper. Loading in progress.`,
      `Waiting for dock assignment. Estimated 45 min.`,
    ],
    loaded: [
      `Loaded and sealed. BOL signed. Ready to roll.`,
      `Loaded 24 pallets. Weight verified. Depart when ready.`,
    ],
    in_transit: [
      `In transit. Last check-in on schedule.`,
      `Running 15 min ahead of schedule. Good weather conditions.`,
      `Fuel stop planned at next travel center.`,
    ],
    at_delivery: [
      `At receiver. Waiting for dock door.`,
      `Checked in at delivery. Unloading estimated 1 hour.`,
    ],
  };
  const pool = notes[status] || notes['assigned'];
  return pool[Math.floor(Math.random() * pool.length)];
}

function generateDriverMessages(): void {
  driverMessages.clear();
  const drivers = seedDrivers.length > 0 ? seedDrivers : [];
  const now = Date.now();

  for (const driver of drivers) {
    const messages: DispatchMessage[] = [];
    const driverLoad = allLoads.find((l) => l.driverId === driver.id);

    // Load assignment message
    if (driverLoad) {
      messages.push({
        id: `msg-${messageIdCounter++}`,
        from: 'dispatch',
        text: `Load ${driverLoad.id} assigned: ${driverLoad.origin.city} to ${driverLoad.destination.city}. ${driverLoad.commodity}, ${driverLoad.weight.toLocaleString()} lbs. Pickup by ${new Date(driverLoad.pickupTime).toLocaleTimeString()}.`,
        timestamp: new Date(now - 4 * 3600000).toISOString(),
        read: true,
      });
    }

    // System check-in reminder
    messages.push({
      id: `msg-${messageIdCounter++}`,
      from: 'system',
      text: 'Daily check-in reminder: Please confirm your availability and vehicle condition before departure.',
      timestamp: new Date(now - 6 * 3600000).toISOString(),
      read: true,
    });

    // Weather alert for some drivers
    if (Math.random() > 0.5) {
      messages.push({
        id: `msg-${messageIdCounter++}`,
        from: 'system',
        text: 'Weather Advisory: Freezing rain expected along Highway 401 corridor between Kingston and Montreal. Reduce speed and increase following distance.',
        timestamp: new Date(now - 2 * 3600000).toISOString(),
        read: Math.random() > 0.3,
      });
    }

    // Dispatch follow-up for some drivers
    if (driverLoad && Math.random() > 0.4) {
      messages.push({
        id: `msg-${messageIdCounter++}`,
        from: 'dispatch',
        text: `Hey ${driver.firstName}, just checking in on Load ${driverLoad.id}. Any issues? Let us know if you need anything.`,
        timestamp: new Date(now - 1 * 3600000).toISOString(),
        read: false,
      });
    }

    // Safety reminder for high-risk drivers
    if (driver.riskProfile === 'high' || driver.riskProfile === 'critical') {
      messages.push({
        id: `msg-${messageIdCounter++}`,
        from: 'system',
        text: 'Safety Reminder: Your recent driving events have been flagged for review. Please focus on maintaining safe following distances and speed compliance.',
        timestamp: new Date(now - 8 * 3600000).toISOString(),
        read: false,
      });
    }

    // Sort by timestamp descending
    messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    driverMessages.set(driver.id, messages);
  }
}

// ─── Score & Ranking Calculations ───────────────────────────

function calculateSafetyScore(driverId: string): number {
  const events30 = seedSafetyEvents.filter(
    (e) => e.driverId === driverId && new Date(e.dateTime) > new Date(Date.now() - 30 * 86400000),
  );

  const trips30 = seedTripDays.filter(
    (t) => t.driverId === driverId && new Date(t.date) > new Date(Date.now() - 30 * 86400000),
  );

  const totalDistance = trips30.reduce((sum, t) => sum + t.totalDistance, 0);
  if (totalDistance === 0) return 85; // Default for drivers with no data

  // Events per 1000 km
  const eventRate = (events30.length / totalDistance) * 1000;

  // Weight severity
  const severityWeights = { low: 1, medium: 2, high: 4, critical: 8 };
  const weightedEvents = events30.reduce((sum, e) => sum + severityWeights[e.severity], 0);
  const weightedRate = (weightedEvents / totalDistance) * 1000;

  // Score: 100 - weighted rate, clamped 0-100
  return Math.max(0, Math.min(100, Math.round(100 - weightedRate * 3)));
}

function calculateStreakDays(driverId: string): number {
  const events = seedSafetyEvents
    .filter((e) => e.driverId === driverId && (e.severity === 'high' || e.severity === 'critical'))
    .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

  if (events.length === 0) return 90; // No critical/high events in 90 days

  const lastBadEvent = new Date(events[0].dateTime);
  const daysSince = Math.floor((Date.now() - lastBadEvent.getTime()) / 86400000);
  return daysSince;
}

function calculateTodayEvents(driverId: string): number {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return seedSafetyEvents.filter(
    (e) => e.driverId === driverId && new Date(e.dateTime) >= todayStart,
  ).length;
}

interface DriverRanking {
  driverId: string;
  name: string;
  employeeNumber: string;
  score: number;
  rank: number;
  streak: number;
}

let cachedLeaderboard: DriverRanking[] = [];
let leaderboardCacheTime = 0;

function buildLeaderboard(): DriverRanking[] {
  const now = Date.now();
  // Cache for 60 seconds
  if (now - leaderboardCacheTime < 60000 && cachedLeaderboard.length > 0) {
    return cachedLeaderboard;
  }

  const drivers = seedDrivers.length > 0 ? seedDrivers : [];
  const rankings: DriverRanking[] = drivers.map((d) => ({
    driverId: d.id,
    name: d.name,
    employeeNumber: d.employeeNumber,
    score: calculateSafetyScore(d.id),
    rank: 0,
    streak: calculateStreakDays(d.id),
  }));

  // Sort by score descending (higher = safer = better rank)
  rankings.sort((a, b) => b.score - a.score || b.streak - a.streak);
  rankings.forEach((r, i) => { r.rank = i + 1; });

  cachedLeaderboard = rankings;
  leaderboardCacheTime = now;
  return rankings;
}

// ─── Public API ─────────────────────────────────────────────

export function initDriverSessions(): void {
  generateLoads();
  generateDriverMessages();

  // Generate initial action items for drivers
  for (const driver of seedDrivers) {
    const items: string[] = [];
    if (driver.riskProfile === 'high' || driver.riskProfile === 'critical') {
      items.push('Complete defensive driving refresher course');
      items.push('Review safety event footage from this week');
    }
    items.push('Submit daily vehicle inspection report');
    if (Math.random() > 0.5) {
      items.push('Update emergency contact information');
    }
    for (const text of items) {
      addDriverActionItem(driver.id, text, 'system');
    }
  }

}

export function loginDriver(driverId: string): DriverSession | null {
  const driver = seedDrivers.find((d) => d.id === driverId);
  if (!driver) return null;

  const vehicle = seedVehicles.find((v) => v.id === driver.vehicleId);
  const load = allLoads.find((l) => l.driverId === driverId && l.status !== 'delivered');
  const messages = driverMessages.get(driverId) || [];
  const leaderboard = buildLeaderboard();
  const ranking = leaderboard.find((r) => r.driverId === driverId);

  const session: DriverSession = {
    driverId: driver.id,
    driverName: driver.name,
    employeeNumber: driver.employeeNumber,
    vehicleId: driver.vehicleId,
    vehicleName: vehicle?.name || driver.vehicleId,
    loginTime: new Date().toISOString(),
    currentLoad: load || null,
    recentMessages: messages.slice(0, 10),
    safetyScore: calculateSafetyScore(driverId),
    streakDays: calculateStreakDays(driverId),
    todayEvents: calculateTodayEvents(driverId),
    weeklyRank: ranking?.rank || 0,
  };

  activeSessions.set(driverId, session);
  return session;
}

export function loginDriverWithPin(employeeNumber: string, pin: string): DriverSession | null {
  const driver = seedDrivers.find((d) => d.employeeNumber === employeeNumber);
  if (!driver || driver.pin !== pin) return null;
  return loginDriver(driver.id);
}

export function getDriverSession(driverId: string): DriverSession | null {
  // Return cached session if exists, otherwise attempt login
  const existing = activeSessions.get(driverId);
  if (existing) return existing;
  return loginDriver(driverId);
}

export function getActiveLoads(): LoadAssignment[] {
  return allLoads.filter((l) => l.status !== 'delivered');
}

export function getAllLoads(): LoadAssignment[] {
  return [...allLoads];
}

export function getDriverLoad(driverId: string): LoadAssignment | null {
  return allLoads.find((l) => l.driverId === driverId && l.status !== 'delivered') || null;
}

export function updateLoadStatus(loadId: string, status: LoadAssignment['status']): LoadAssignment | null {
  const load = allLoads.find((l) => l.id === loadId);
  if (!load) return null;

  load.status = status;
  load.notes = generateLoadNote(load.commodity, status);

  // Update the session if there is one
  const session = activeSessions.get(load.driverId);
  if (session) {
    if (status === 'delivered') {
      session.currentLoad = null;
    } else {
      session.currentLoad = load;
    }
  }

  // Auto-add a system message about the status change
  addDispatchMessage(load.driverId, {
    from: 'system',
    text: `Load ${load.id} status updated to "${status.replace(/_/g, ' ')}".`,
    read: false,
  });

  return load;
}

export function addDispatchMessage(
  driverId: string,
  message: Omit<DispatchMessage, 'id' | 'timestamp'>,
): void {
  const msg: DispatchMessage = {
    id: `msg-${messageIdCounter++}`,
    timestamp: new Date().toISOString(),
    ...message,
  };

  const existing = driverMessages.get(driverId) || [];
  existing.unshift(msg); // Add to front (newest first)
  driverMessages.set(driverId, existing);

  // Update session if active
  const session = activeSessions.get(driverId);
  if (session) {
    session.recentMessages = existing.slice(0, 10);
  }
}

export function getDriverMessages(driverId: string): DispatchMessage[] {
  return driverMessages.get(driverId) || [];
}

export function getDriverLeaderboard(): DriverRanking[] {
  return buildLeaderboard();
}

export function getDriverActionItems(driverId: string): ActionItem[] {
  return (driverActionItems.get(driverId) || []).filter(a => a.status === 'pending');
}

export function addDriverActionItem(driverId: string, text: string, source: ActionItem['source'] = 'system'): ActionItem {
  const item: ActionItem = {
    id: `action-${actionIdCounter++}`,
    text,
    source,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  const existing = driverActionItems.get(driverId) || [];
  existing.unshift(item);
  driverActionItems.set(driverId, existing);
  return item;
}

export function completeDriverActionItem(driverId: string, actionId: string): ActionItem | null {
  const items = driverActionItems.get(driverId);
  if (!items) return null;
  const item = items.find(a => a.id === actionId);
  if (!item) return null;
  item.status = 'completed';
  item.completedAt = new Date().toISOString();
  return item;
}

export function dismissDriverActionItem(driverId: string, actionId: string): ActionItem | null {
  const items = driverActionItems.get(driverId);
  if (!items) return null;
  const item = items.find(a => a.id === actionId);
  if (!item) return null;
  item.status = 'dismissed';
  return item;
}
