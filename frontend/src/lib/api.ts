import type {
  FleetOverview, InsuranceScore, DriverRisk, WellnessSummary, WellnessResult,
  HealthStatus, SafetyEvent, Vehicle, Driver, PreShiftRisk, FleetForecast,
  DriverTrend, DangerousZone, TriagedAlert, AlertBriefing, LiveVehicle,
  GPSTrailPoint, SpeedingHotspot, FleetROI, BeforeAfterComparison,
  WhatIfScenario, WhatIfResult, DriverSession, DriverRanking,
  GamificationState, Badge, PointTransaction, RewardItem, DailyChallenge,
  PreShiftBriefing, ActionItem, DriverTrainingProgram,
  GreenFleetDashboard, DriverGreenScore, EVReadinessReport,
  HOSStatus, WellnessTrend,
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
  chatStream: (message: string, currentPage?: string) =>
    fetch(`${API_BASE}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, currentPage }),
    }),

  // Full-screen assistant stream (includes tool results for inline component rendering)
  assistantStream: (message: string, currentPage?: string) =>
    fetch(`${API_BASE}/api/assistant/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, currentPage }),
    }),

  // TTS synthesis via Smallest AI lightning-v3.1
  ttsSynthesize: (text: string) =>
    fetch(`${API_BASE}/api/tts/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
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
  whatIfCustom: (adjustments: Record<string, number>) => postJSON<WhatIfResult>('/api/fleet/what-if/custom', { adjustments }),

  // Sustainability / Green Fleet
  sustainability: () => fetchJSON<GreenFleetDashboard>('/api/fleet/sustainability'),
  sustainabilityDrivers: () => fetchJSON<DriverGreenScore[]>('/api/fleet/sustainability/drivers'),
  sustainabilityVehicles: () => fetchJSON<EVReadinessReport>('/api/fleet/sustainability/vehicles'),

  // Geotab Ace (Natural Language Analytics)
  aceQuery: (prompt: string) => postJSON<{ text: string; data: unknown; charts: unknown[]; status: string }>('/api/fleet/ace/query', { prompt }),

  // Data Source
  dataSource: () => fetchJSON<{ isLiveData: boolean; geotabConfigured: boolean; database: string | null }>('/api/fleet/data-source'),

  // Driver Portal
  driverLogin: (driverId: string) => postJSON<DriverSession>('/api/driver/login', { driverId }),
  driverLoginWithPin: async (employeeNumber: string, pin: string): Promise<DriverSession> => {
    const res = await fetch(`${API_BASE}/api/driver/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeNumber, pin }),
    });
    if (res.status === 401) throw new Error('Invalid employee number or PIN');
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },
  driverDashboard: (id: string) => fetchJSON<DriverSession>(`/api/driver/${id}/dashboard`),
  driverLoad: (id: string) => fetchJSON<{ hasLoad: boolean; load?: unknown }>(`/api/driver/${id}/load`),
  updateLoadStatus: (id: string, status: string) => putJSON(`/api/driver/${id}/load/status`, { status }),
  driverMessages: (id: string) => fetchJSON<unknown[]>(`/api/driver/${id}/messages`),
  driverLeaderboard: () => fetchJSON<DriverRanking[]>('/api/driver/leaderboard'),
  dispatchCall: (id: string, intent: string) => postJSON<{ callId?: string; mode: string; messages?: { role: string; text: string }[]; summary?: string }>(`/api/driver/${id}/dispatch-call`, { intent }),
  dispatchCallStatus: (id: string, callId: string) => fetchJSON<{ callId: string; state: string; transcript: { role: string; text: string; timestamp: string }[]; summary?: string; duration?: number }>(`/api/driver/${id}/dispatch-call/${callId}/status`),

  // Gamification
  driverGamification: (id: string) => fetchJSON<GamificationState>(`/api/driver/${id}/gamification`),
  driverBadges: (id: string) => fetchJSON<Badge[]>(`/api/driver/${id}/badges`),
  driverPointsHistory: (id: string) => fetchJSON<PointTransaction[]>(`/api/driver/${id}/points-history`),
  driverRewards: (id: string) => fetchJSON<RewardItem[]>(`/api/driver/${id}/rewards`),
  checkChallenge: (id: string) => postJSON<DailyChallenge>(`/api/driver/${id}/challenge/check`, {}),

  // Pre-Shift Briefing
  preShiftBriefing: (id: string) => fetchJSON<PreShiftBriefing>(`/api/driver/${id}/pre-shift-briefing`),

  // HOS (Hours of Service)
  driverHOS: (id: string) => fetchJSON<HOSStatus>(`/api/driver/${id}/hos`),

  // Wellness Check-In
  wellnessCheckIn: (id: string, mood: string) => postJSON<{ message: string }>(`/api/driver/${id}/wellness-checkin`, { mood }),
  wellnessTrend: (id: string) => fetchJSON<WellnessTrend>(`/api/driver/${id}/wellness-trend`),

  // Action Items
  driverActions: (id: string) => fetchJSON<ActionItem[]>(`/api/driver/${id}/actions`),
  completeAction: (driverId: string, actionId: string) => postJSON<ActionItem>(`/api/driver/${driverId}/actions/${actionId}/complete`, {}),
  dismissAction: (driverId: string, actionId: string) => postJSON<ActionItem>(`/api/driver/${driverId}/actions/${actionId}/dismiss`, {}),

  // Driver Training Programs
  driverTraining: (id: string) => fetchJSON<DriverTrainingProgram[]>(`/api/driver/${id}/training`),

  // Missions
  missionsActive: () => fetchJSON<{ active: unknown[]; completed: unknown[] }>('/api/missions/active'),
  missionResult: (id: string) => fetchJSON<unknown>(`/api/missions/${id}`),
};
