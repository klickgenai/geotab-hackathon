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
  eventsPerThousandMiles: number;
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
  employeeNumber: string;
  pin: string;
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
  employeeNumber: string;
  score: number;
  rank: number;
  streak: number;
}

// --- Gamification ---
export interface GamificationState {
  driverId: string;
  driverName: string;
  totalPoints: number;
  level: number;
  levelTitle: string;
  pointsToNextLevel: number;
  levelProgress: number;
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
  icon: string;
  earned: boolean;
  earnedDate?: string;
  progress: number;
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
  icon: string;
  progress: number;
  target: number;
  current: number;
  pointsReward: number;
  completed: boolean;
  expiresAt: string;
}

export interface RewardItem {
  id: string;
  name: string;
  icon: string;
  pointsCost: number;
  category: string;
  available: boolean;
  levelRequired: number;
}

export interface PreShiftBriefing {
  riskLevel: 'low' | 'elevated' | 'high' | 'critical';
  riskScore: number;
  greeting: string;
  focusAreas: string[];
  weather: { condition: string; temp: number; advisory: string | null };
  routeHazards: string[];
  motivational: string;
  streakStatus: string;
  safetyScore: number;
  streakDays: number;
  factors: { name: string; impact: number; description: string }[];
}

export interface ActionItem {
  id: string;
  text: string;
  source: 'voice' | 'tool' | 'system';
  status: 'pending' | 'completed' | 'dismissed';
  createdAt: string;
  completedAt?: string;
}

// --- Sustainability / Green Fleet ---
export interface GreenFleetDashboard {
  fleetScore: FleetGreenScore;
  carbonFootprint: CarbonFootprint;
  fuelEfficiency: FuelEfficiencyMetrics;
  idleWaste: IdleWasteMetrics;
  driverGreenRankings: DriverGreenScore[];
  evReadiness: EVReadinessReport;
  recommendations: GreenRecommendation[];
  monthlyTrend: MonthlyGreenTrend[];
}

export interface FleetGreenScore {
  overallScore: number;
  grade: string;
  components: {
    fuelEfficiency: { score: number; weight: number; weightedScore: number };
    idleReduction: { score: number; weight: number; weightedScore: number };
    ecoDriving: { score: number; weight: number; weightedScore: number };
    fleetModernity: { score: number; weight: number; weightedScore: number };
  };
  trend: 'improving' | 'stable' | 'declining';
}

export interface CarbonFootprint {
  totalCO2Tons: number;
  dailyAvgCO2Kg: number;
  co2PerVehiclePerDay: number;
  co2PerKm: number;
  treesEquivalent: number;
  monthOverMonthChange: number;
}

export interface FuelEfficiencyMetrics {
  fleetAvgKmPerLiter: number;
  totalFuelConsumed: number;
  totalDistance: number;
  bestDriver: { id: string; name: string; kmPerLiter: number };
  worstDriver: { id: string; name: string; kmPerLiter: number };
  benchmarkComparison: string;
}

export interface IdleWasteMetrics {
  totalIdleHours: number;
  fuelWastedLiters: number;
  co2FromIdling: number;
  costWasted: number;
  avgIdlePercentage: number;
  topOffenders: { driverId: string; driverName: string; idleMinutes: number; fuelWasted: number; co2Produced: number }[];
}

export interface DriverGreenScore {
  driverId: string;
  driverName: string;
  greenScore: number;
  grade: string;
  rank: number;
  fuelEfficiency: number;
  idlePercent: number;
  harshEventsPerKm: number;
  co2PerKm: number;
  co2SavedVsAvg: number;
}

export interface EVReadinessReport {
  totalCandidates: number;
  projectedAnnualSavings: number;
  projectedCO2Reduction: number;
  vehicles: EVCandidate[];
}

export interface EVCandidate {
  vehicleId: string;
  vehicleName: string;
  type: string;
  year: number;
  avgDailyDistance: number;
  currentFuelCost: number;
  projectedEVSavings: number;
  co2Reduction: number;
  readinessScore: number;
  reason: string;
}

export interface GreenRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: 'idle' | 'fuel' | 'ev' | 'driving' | 'route';
  title: string;
  description: string;
  projectedSavings: number;
  projectedCO2Reduction: number;
  difficulty: 'easy' | 'moderate' | 'hard';
  timeToImpact: string;
}

export interface MonthlyGreenTrend {
  month: string;
  co2Tons: number;
  fuelEfficiency: number;
  idlePercent: number;
  greenScore: number;
}
