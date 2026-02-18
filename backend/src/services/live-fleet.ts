/**
 * Live Fleet Map Service
 * Provides real-time vehicle positions, GPS trails, and speeding hotspots.
 * Falls back to simulated Toronto-area data when Geotab is not configured.
 */

import { geotabAuth } from './geotab-auth.js';
import { geotabCore } from './geotab-core.js';
import { seedDrivers, seedVehicles, seedSafetyEvents } from '../data/seed-data.js';

// --- Interfaces ---

export interface LiveVehicle {
  id: string;
  deviceId: string;
  name: string;
  driverName: string;
  latitude: number;
  longitude: number;
  speed: number;
  bearing: number;
  isDriving: boolean;
  isOnline: boolean;
  lastUpdate: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  activeAlerts: number;
}

export interface GPSTrailPoint {
  latitude: number;
  longitude: number;
  speed: number;
  dateTime: string;
}

export interface SpeedingHotspot {
  latitude: number;
  longitude: number;
  eventCount: number;
  avgSpeed: number;
  topDrivers: string[];
  description: string;
}

// --- Cache ---

let cachedFleet: LiveVehicle[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

// --- Seeded random helpers (deterministic per vehicle for stability) ---

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// --- Simulated vehicle positions (stable per call, drift slowly) ---

function generateSimulatedFleet(): LiveVehicle[] {
  const vehicles: LiveVehicle[] = [];
  const now = Date.now();

  // Use up to 50 vehicles; pad beyond seed data if needed
  const vehicleCount = 50;

  for (let i = 0; i < vehicleCount; i++) {
    const seedVehicle = seedVehicles[i % seedVehicles.length];
    const vehicleId = i < seedVehicles.length ? seedVehicle.id : `v${i + 1}`;
    const vehicleName = i < seedVehicles.length ? seedVehicle.name : `Unit ${101 + i}`;

    // Find assigned driver
    const driver = seedDrivers.find((d) => d.vehicleId === vehicleId);
    const driverName = driver ? driver.name : `Driver ${i + 1}`;
    const riskLevel = driver ? driver.riskProfile : 'low';

    // Generate stable but slowly drifting position in Toronto area
    // Lat: 43.6 to 43.8, Lng: -79.5 to -79.2
    const timeSeed = Math.floor(now / 60000); // changes every minute for slow drift
    const baseLat = 43.6 + seededRandom(i * 1000 + 1) * 0.2;
    const baseLng = -79.5 + seededRandom(i * 1000 + 2) * 0.3;
    const driftLat = (seededRandom(i * 1000 + timeSeed) - 0.5) * 0.005;
    const driftLng = (seededRandom(i * 1000 + timeSeed + 500) - 0.5) * 0.005;

    const isDriving = seededRandom(i * 1000 + 3) < 0.6; // ~60% driving
    const speed = isDriving ? Math.round(seededRandom(i * 1000 + timeSeed + 4) * 100) : 0;
    const bearing = Math.round(seededRandom(i * 1000 + 5) * 360);

    // Count recent safety events for this vehicle
    const recentEvents = seedSafetyEvents.filter(
      (e) => e.vehicleId === vehicleId && new Date(e.dateTime).getTime() > now - 24 * 3600000,
    );

    vehicles.push({
      id: vehicleId,
      deviceId: `simulated-${vehicleId}`,
      name: vehicleName,
      driverName,
      latitude: Math.round((baseLat + driftLat) * 100000) / 100000,
      longitude: Math.round((baseLng + driftLng) * 100000) / 100000,
      speed,
      bearing,
      isDriving,
      isOnline: true,
      lastUpdate: new Date(now - Math.floor(seededRandom(i * 1000 + 6) * 60000)).toISOString(),
      riskLevel: riskLevel as LiveVehicle['riskLevel'],
      activeAlerts: recentEvents.length,
    });
  }

  return vehicles;
}

function generateSimulatedTrail(vehicleId: string, hours: number): GPSTrailPoint[] {
  const points: GPSTrailPoint[] = [];
  const now = Date.now();
  const vehicleIndex = parseInt(vehicleId.replace('v', ''), 10) || 1;

  // Starting position in Toronto area
  const startLat = 43.6 + seededRandom(vehicleIndex * 2000 + 1) * 0.2;
  const startLng = -79.5 + seededRandom(vehicleIndex * 2000 + 2) * 0.3;

  // Generate one point per minute for the requested hours
  const totalPoints = hours * 60;
  let lat = startLat;
  let lng = startLng;

  for (let i = 0; i < totalPoints; i++) {
    const timestamp = now - (totalPoints - i) * 60000;
    const seed = vehicleIndex * 2000 + i;

    // Random walk: small steps
    lat += (seededRandom(seed + 100) - 0.5) * 0.002;
    lng += (seededRandom(seed + 200) - 0.5) * 0.002;

    // Keep within Toronto bounds
    lat = Math.max(43.58, Math.min(43.85, lat));
    lng = Math.max(-79.55, Math.min(-79.15, lng));

    // Speed varies: some stops, some highway
    const isMoving = seededRandom(seed + 300) > 0.2;
    const speed = isMoving ? Math.round(30 + seededRandom(seed + 400) * 80) : 0;

    points.push({
      latitude: Math.round(lat * 100000) / 100000,
      longitude: Math.round(lng * 100000) / 100000,
      speed,
      dateTime: new Date(timestamp).toISOString(),
    });
  }

  return points;
}

// --- Live Fleet (with Geotab or simulated) ---

export async function getLiveFleet(): Promise<LiveVehicle[]> {
  // Return cache if still fresh
  if (cachedFleet && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedFleet;
  }

  let vehicles: LiveVehicle[];

  if (geotabAuth.isConfigured()) {
    try {
      const statusList = await geotabCore.getDeviceStatusInfo();
      const now = Date.now();

      vehicles = statusList.map((status, index) => {
        const deviceId = status.device?.id || `unknown-${index}`;
        // Try to match to a seed vehicle by index (Geotab devices map to seed vehicles)
        const seedVehicle = seedVehicles[index % seedVehicles.length];
        const vehicleId = seedVehicle ? seedVehicle.id : `v${index + 1}`;
        const vehicleName = seedVehicle ? seedVehicle.name : `Unit ${101 + index}`;

        const driver = seedDrivers.find((d) => d.vehicleId === vehicleId);
        const driverName = driver ? driver.name : 'Unknown Driver';
        const riskLevel = driver ? driver.riskProfile : 'low';

        const recentEvents = seedSafetyEvents.filter(
          (e) => e.vehicleId === vehicleId && new Date(e.dateTime).getTime() > now - 24 * 3600000,
        );

        return {
          id: vehicleId,
          deviceId,
          name: vehicleName,
          driverName,
          latitude: status.latitude,
          longitude: status.longitude,
          speed: Math.round(status.speed),
          bearing: status.bearing,
          isDriving: status.isDriving,
          isOnline: status.isDeviceCommunicating,
          lastUpdate: status.dateTime,
          riskLevel: riskLevel as LiveVehicle['riskLevel'],
          activeAlerts: recentEvents.length,
        };
      });
    } catch (error) {
      console.error('[LiveFleet] Geotab API error, falling back to simulation:', error);
      vehicles = generateSimulatedFleet();
    }
  } else {
    vehicles = generateSimulatedFleet();
  }

  // Update cache
  cachedFleet = vehicles;
  cacheTimestamp = Date.now();

  return vehicles;
}

// --- GPS Trail ---

export async function getGPSTrail(vehicleId: string, hours: number = 4): Promise<GPSTrailPoint[]> {
  if (geotabAuth.isConfigured()) {
    try {
      // First, find the Geotab device ID for this vehicle
      const fleet = await getLiveFleet();
      const vehicle = fleet.find((v) => v.id === vehicleId);
      if (!vehicle) {
        return generateSimulatedTrail(vehicleId, hours);
      }

      const toDate = new Date().toISOString();
      const fromDate = new Date(Date.now() - hours * 3600000).toISOString();

      const records = await geotabCore.getLogRecords(vehicle.deviceId, fromDate, toDate);

      return records.map((r) => ({
        latitude: r.latitude,
        longitude: r.longitude,
        speed: r.speed,
        dateTime: r.dateTime,
      }));
    } catch (error) {
      console.error('[LiveFleet] GPS trail Geotab error, falling back:', error);
      return generateSimulatedTrail(vehicleId, hours);
    }
  }

  return generateSimulatedTrail(vehicleId, hours);
}

// --- Speeding Hotspots ---

export function getSpeedingHotspots(): SpeedingHotspot[] {
  // Filter speeding events from seed safety data
  const speedingEvents = seedSafetyEvents.filter((e) => e.type === 'speeding');

  // Cluster by grid cell (round lat/lng to 0.05)
  const grid = new Map<string, {
    events: typeof speedingEvents;
    latSum: number;
    lngSum: number;
  }>();

  for (const event of speedingEvents) {
    const gridLat = Math.round(event.latitude / 0.05) * 0.05;
    const gridLng = Math.round(event.longitude / 0.05) * 0.05;
    const key = `${gridLat.toFixed(2)},${gridLng.toFixed(2)}`;

    if (!grid.has(key)) {
      grid.set(key, { events: [], latSum: 0, lngSum: 0 });
    }

    const cell = grid.get(key)!;
    cell.events.push(event);
    cell.latSum += event.latitude;
    cell.lngSum += event.longitude;
  }

  // Convert grid cells to hotspots
  const hotspots: SpeedingHotspot[] = [];

  for (const [_key, cell] of grid) {
    if (cell.events.length < 2) continue; // Only include clusters with multiple events

    const avgLat = cell.latSum / cell.events.length;
    const avgLng = cell.lngSum / cell.events.length;

    // Count events per driver
    const driverCounts = new Map<string, number>();
    for (const event of cell.events) {
      const driver = seedDrivers.find((d) => d.id === event.driverId);
      const name = driver ? driver.name : event.driverId;
      driverCounts.set(name, (driverCounts.get(name) || 0) + 1);
    }

    // Top 3 drivers by event count
    const topDrivers = [...driverCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    // Estimate avg speed from severity (no exact speed in seed data)
    const severityToSpeed: Record<string, number> = {
      low: 75,
      medium: 90,
      high: 110,
      critical: 130,
    };
    const avgSpeed = Math.round(
      cell.events.reduce((sum, e) => sum + (severityToSpeed[e.severity] || 80), 0) / cell.events.length,
    );

    hotspots.push({
      latitude: Math.round(avgLat * 100000) / 100000,
      longitude: Math.round(avgLng * 100000) / 100000,
      eventCount: cell.events.length,
      avgSpeed,
      topDrivers,
      description: `${cell.events.length} speeding events in this area, avg ${avgSpeed} km/h`,
    });
  }

  // Sort by event count descending
  return hotspots.sort((a, b) => b.eventCount - a.eventCount);
}
