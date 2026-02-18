import type {
  FleetOverview, InsuranceScore, DriverRisk, WellnessSummary, WellnessResult,
  HealthStatus, SafetyEvent, Vehicle, Driver, PreShiftRisk, FleetForecast,
  DriverTrend, DangerousZone, TriagedAlert, AlertBriefing, LiveVehicle,
  GPSTrailPoint, SpeedingHotspot, FleetROI, BeforeAfterComparison,
  WhatIfScenario, WhatIfResult, DriverSession, DriverRanking,
} from '@/types/fleet';

const API_BASE = '';

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function putJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  // Health
  health: () => fetchJSON<HealthStatus>('/api/health'),

  // Fleet Overview
  fleetOverview: () => fetchJSON<FleetOverview>('/api/fleet/overview'),
  insuranceScore: () => fetchJSON<InsuranceScore>('/api/fleet/score'),
  driverRisks: () => fetchJSON<DriverRisk[]>('/api/fleet/risks'),
  driverRisk: (id: string) => fetchJSON<DriverRisk>(`/api/fleet/risks/${id}`),
  wellness: () => fetchJSON<WellnessSummary>('/api/fleet/wellness'),
  driverWellness: (id: string) => fetchJSON<WellnessResult>(`/api/fleet/wellness/${id}`),
  wellnessAll: () => fetchJSON<WellnessResult[]>('/api/fleet/wellness-all'),
  drivers: () => fetchJSON<Driver[]>('/api/fleet/drivers'),
  driver: (id: string) => fetchJSON<Driver>(`/api/fleet/drivers/${id}`),
  vehicles: () => fetchJSON<Vehicle[]>('/api/fleet/vehicles'),
  events: (params?: { driverId?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.driverId) qs.set('driverId', params.driverId);
    if (params?.limit) qs.set('limit', String(params.limit));
    const query = qs.toString();
    return fetchJSON<SafetyEvent[]>(`/api/fleet/events${query ? `?${query}` : ''}`);
  },

  // Chat
  chat: async (message: string): Promise<string> => {
    const data = await postJSON<{ response: string }>('/api/chat', { message });
    return data.response;
  },
  chatStream: (message: string) =>
    fetch(`${API_BASE}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    }),

  // Predictive Safety
  preShiftRisks: () => fetchJSON<PreShiftRisk[]>('/api/fleet/predictive/pre-shift'),
  preShiftRisk: (id: string) => fetchJSON<PreShiftRisk>(`/api/fleet/predictive/pre-shift/${id}`),
  fleetForecast: () => fetchJSON<FleetForecast>('/api/fleet/predictive/forecast'),
  driverTrends: () => fetchJSON<DriverTrend[]>('/api/fleet/predictive/trends'),
  dangerousCorridors: () => fetchJSON<DangerousZone[]>('/api/fleet/predictive/corridors'),

  // Alerts
  alerts: (limit?: number) => fetchJSON<TriagedAlert[]>(`/api/fleet/alerts${limit ? `?limit=${limit}` : ''}`),
  alertBriefing: () => fetchJSON<AlertBriefing>('/api/fleet/alerts/briefing'),

  // Live Map
  liveFleet: () => fetchJSON<LiveVehicle[]>('/api/fleet/map/live'),
  gpsTrail: (vehicleId: string, hours?: number) =>
    fetchJSON<GPSTrailPoint[]>(`/api/fleet/map/trail/${vehicleId}${hours ? `?hours=${hours}` : ''}`),
  hotspots: () => fetchJSON<SpeedingHotspot[]>('/api/fleet/map/hotspots'),

  // ROI
  fleetROI: () => fetchJSON<FleetROI>('/api/fleet/roi'),
  beforeAfter: () => fetchJSON<BeforeAfterComparison>('/api/fleet/roi/before-after'),
  retentionSavings: () => fetchJSON<{ driversAtRisk: number; avgReplacementCost: number; totalRetentionCostAtRisk: number; interventionSuccessRate: number; projectedSavings: number; details: { driverId: string; driverName: string; burnoutRisk: string; retentionCost: number }[] }>('/api/fleet/roi/retention'),
  whatIfDefaults: () => fetchJSON<WhatIfScenario[]>('/api/fleet/what-if/defaults'),
  whatIfSimulate: (scenarios: WhatIfScenario[]) => postJSON<WhatIfResult[]>('/api/fleet/what-if', { scenarios }),

  // Driver Portal
  driverLogin: (driverId: string) => postJSON<DriverSession>('/api/driver/login', { driverId }),
  driverDashboard: (id: string) => fetchJSON<DriverSession>(`/api/driver/${id}/dashboard`),
  driverLoad: (id: string) => fetchJSON<{ hasLoad: boolean; load?: unknown }>(`/api/driver/${id}/load`),
  updateLoadStatus: (id: string, status: string) => putJSON(`/api/driver/${id}/load/status`, { status }),
  driverMessages: (id: string) => fetchJSON<unknown[]>(`/api/driver/${id}/messages`),
  driverLeaderboard: () => fetchJSON<DriverRanking[]>('/api/driver/leaderboard'),
  dispatchCall: (id: string, intent: string) => postJSON<unknown>(`/api/driver/${id}/dispatch-call`, { intent }),
};
