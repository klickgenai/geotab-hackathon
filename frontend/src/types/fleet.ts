export interface FleetOverview {
  period: string;
  totalVehicles: number;
  totalDrivers: number;
  activeVehicles: number;
  activeDrivers: number;
  totalDistance: number;
  totalTrips: number;
  totalSafetyEvents: number;
  avgSafetyScore: number;
  eventsPerMile: number;
  fuelConsumed: number;
  avgIdlingPercent: number;
  riskDistribution: {
    low: number;
    moderate: number;
    high: number;
    critical: number;
  };
  topRiskDrivers: { id: string; name: string; risk: string }[];
}

export interface InsuranceScore {
  overallScore: number;
  grade: string;
  components: {
    safeDriving: ComponentScore;
    compliance: ComponentScore;
    maintenance: ComponentScore;
    driverQuality: ComponentScore;
  };
  premiumImpact: {
    percentChange: number;
    estimatedAnnualSavings: number;
    benchmarkPremium: number;
  };
  percentile: number;
  trend: 'improving' | 'stable' | 'declining';
  recommendations: string[];
}

export interface ComponentScore {
  score: number;
  weight: number;
  weightedScore: number;
  details: Record<string, number | string>;
}

export interface DriverRisk {
  driverId: string;
  driverName: string;
  riskScore: number;
  tier: 'low' | 'moderate' | 'high' | 'critical';
  annualizedCost: number;
  components: {
    eventFrequency: { score: number; weight: number; eventsPerThousandMiles: number };
    severity: { score: number; weight: number; weightedAvg: number };
    pattern: { score: number; weight: number; topPatterns: string[] };
    trend: { score: number; weight: number; direction: string; delta: number };
  };
  topEventTypes: { type: string; count: number }[];
  recommendations: string[];
}

export interface WellnessSummary {
  totalDrivers: number;
  highBurnoutRisk: number;
  moderateBurnoutRisk: number;
  lowBurnoutRisk: number;
  totalRetentionCostAtRisk: number;
  avgWellnessScore: number;
  driversAtRisk: {
    id: string;
    name: string;
    burnoutProbability: number;
    retentionCost: number;
    topSignal: string;
  }[];
}

export interface WellnessResult {
  driverId: string;
  driverName: string;
  burnoutProbability: number;
  burnoutRisk: 'low' | 'moderate' | 'high';
  retentionCost: number;
  signals: WellnessSignal[];
  overallWellnessScore: number;
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

export interface HealthStatus {
  status: string;
  geotabConfigured: boolean;
  timestamp: string;
}

export interface SafetyEvent {
  id: string;
  driverId: string;
  vehicleId: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  dateTime: string;
  latitude: number;
  longitude: number;
  details: string;
}

export interface Vehicle {
  id: string;
  name: string;
  vin: string;
  licensePlate: string;
  type: string;
  year: number;
  make: string;
  model: string;
  odometer: number;
  activeFrom: string;
}

export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  hireDate: string;
  vehicleId: string;
  riskProfile: string;
  burnoutRisk: string;
  tenureYears: number;
  stats: {
    period: string;
    totalEvents: number;
    severityCounts: Record<string, number>;
    eventTypeCounts: Record<string, number>;
    totalDistance: number;
    totalTrips: number;
    totalDrivingHours: number;
    avgDailyHours: number;
    avgRestHours: number;
    nightDrivingHours: number;
    maxSpeed: number;
    avgIdlingMinutes: number;
    daysWorked: number;
  };
}

// --- Predictive Safety ---
export interface PreShiftRisk {
  driverId: string;
  driverName: string;
  riskScore: number;
  riskLevel: 'low' | 'elevated' | 'high' | 'critical';
  factors: { name: string; impact: number; description: string }[];
  recommendation: string;
}

export interface FleetForecast {
  highRiskDrivers: number;
  predictedEventsThisWeek: number;
  topRiskFactors: string[];
  recommendations: string[];
}

export interface DriverTrend {
  driverId: string;
  driverName: string;
  trendDirection: 'improving' | 'stable' | 'declining' | 'rapidly_declining';
  weekOverWeekChange: number;
  details: string;
}

export interface DangerousZone {
  id: string;
  latitude: number;
  longitude: number;
  radius: number;
  eventCount: number;
  topEventType: string;
  affectedDrivers: string[];
  description: string;
}

// --- Alert Triage ---
export interface TriagedAlert {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  urgencyScore: number;
  title: string;
  description: string;
  category: 'behavioral' | 'mechanical' | 'compliance' | 'pattern';
  relatedEvents: string[];
  affectedDriver: { id: string; name: string };
  affectedVehicle: string;
  suggestedAction: string;
  timestamp: string;
}

export interface AlertBriefing {
  criticalCount: number;
  highCount: number;
  topAlerts: TriagedAlert[];
  fleetRiskSummary: string;
}

// --- Live Map ---
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

// --- ROI ---
export interface FleetROI {
  totalAnnualSavings: number;
  insurancePremiumSavings: number;
  accidentPreventionSavings: number;
  fuelSavings: number;
  retentionSavings: number;
  productivityGains: number;
  investmentCost: number;
  roiPercent: number;
  paybackMonths: number;
  projectedThreeYearValue: number;
}

export interface BeforeAfterComparison {
  periods: { label: string; startDate: string; endDate: string }[];
  metrics: {
    name: string;
    before: number;
    after: number;
    change: number;
    changePercent: number;
    dollarImpact: number;
  }[];
}

export interface WhatIfScenario {
  id: string;
  name: string;
  description: string;
  adjustments: Record<string, number>;
}

export interface WhatIfResult {
  scenarioId: string;
  scenarioName: string;
  currentScore: number;
  projectedScore: number;
  scoreDelta: number;
  currentGrade: string;
  projectedGrade: string;
  currentPremium: number;
  projectedPremium: number;
  annualSavings: number;
  implementationDifficulty: 'easy' | 'moderate' | 'hard';
  timeToImpact: string;
  recommendations: string[];
}

// --- Driver Portal ---
export interface DriverSession {
  driverId: string;
  driverName: string;
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
  status: string;
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

export interface DriverRanking {
  driverId: string;
  name: string;
  score: number;
  rank: number;
  streak: number;
}
