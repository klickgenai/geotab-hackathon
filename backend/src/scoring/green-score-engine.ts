/**
 * Green Fleet Sustainability Score Engine
 * Calculates environmental impact metrics and actionable recommendations
 * for fleet operators to reduce carbon footprint and transition to EV.
 *
 * Components:
 *   Fuel Efficiency:  30% -- km/L performance vs vehicle class benchmarks
 *   Idle Reduction:   25% -- idle time as % of total, fuel wasted
 *   Eco Driving:      25% -- harsh events that waste fuel (braking, accel, speeding)
 *   Fleet Modernity:  20% -- vehicle age, maintenance, EV readiness
 *
 * Grade scale: A+ (95-100), A (90-94), B+ (85-89), B (75-84), C+ (70-74),
 *              C (60-69), D (50-59), F (<50)
 */

import {
  seedDrivers,
  seedVehicles,
  seedSafetyEvents,
  seedTripDays,
  seedFleetKPIs,
} from '../data/seed-data.js';

// --- Constants ---
const CO2_PER_LITER_DIESEL = 2.31; // kg CO2 per liter of diesel
const IDLE_FUEL_BURN_PER_HOUR = 3.8; // liters per hour at idle
const FUEL_COST_PER_LITER = 1.65;
const TREES_PER_TON_CO2 = 16.5; // trees needed to absorb 1 ton CO2/year

// Fuel efficiency benchmarks by vehicle class (km/L)
const EFFICIENCY_BENCHMARKS: Record<string, { good: number; avg: number; poor: number }> = {
  'Class 8 Tractor': { good: 3.4, avg: 2.8, poor: 2.2 },
  'Class 6 Box': { good: 5.1, avg: 4.2, poor: 3.5 },
  'Class 5 Van': { good: 6.8, avg: 5.5, poor: 4.5 },
  default: { good: 4.5, avg: 3.5, poor: 2.8 },
};

// EV replacement savings (annual) by vehicle class
const EV_SAVINGS: Record<string, { fuelSaved: number; maintenanceSaved: number; co2Reduced: number }> = {
  'Class 5 Van': { fuelSaved: 8200, maintenanceSaved: 2800, co2Reduced: 18.5 },
  'Class 6 Box': { fuelSaved: 12500, maintenanceSaved: 3500, co2Reduced: 28.0 },
  'Class 8 Tractor': { fuelSaved: 22000, maintenanceSaved: 5200, co2Reduced: 52.0 },
  default: { fuelSaved: 10000, maintenanceSaved: 3000, co2Reduced: 25.0 },
};

// --- Interfaces ---
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

// --- Helper functions ---
function getGrade(score: number): string {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'C+';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// --- Main Calculation Functions ---

export function calculateGreenDashboard(): GreenFleetDashboard {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 86400000;
  const sixtyDaysAgo = now - 60 * 86400000;

  // Recent data (last 30 days)
  const recentTrips = seedTripDays.filter(t => new Date(t.date).getTime() > thirtyDaysAgo);
  const recentKPIs = seedFleetKPIs.filter(k => new Date(k.date).getTime() > thirtyDaysAgo);
  const prevKPIs = seedFleetKPIs.filter(k => {
    const d = new Date(k.date).getTime();
    return d > sixtyDaysAgo && d <= thirtyDaysAgo;
  });
  const recentEvents = seedSafetyEvents.filter(e => new Date(e.dateTime).getTime() > thirtyDaysAgo);

  // Fleet-level metrics
  const totalDistance = recentKPIs.reduce((s, k) => s + k.totalDistance, 0);
  const totalFuel = recentKPIs.reduce((s, k) => s + k.fuelConsumed, 0);
  const avgIdlingPercent = recentKPIs.length > 0
    ? recentKPIs.reduce((s, k) => s + k.idlingPercent, 0) / recentKPIs.length
    : 12;

  const prevTotalFuel = prevKPIs.reduce((s, k) => s + k.fuelConsumed, 0);

  // Carbon footprint
  const totalCO2Kg = totalFuel * CO2_PER_LITER_DIESEL;
  const totalCO2Tons = totalCO2Kg / 1000;
  const daysInPeriod = recentKPIs.length || 30;
  const dailyAvgCO2Kg = totalCO2Kg / daysInPeriod;
  const vehicleCount = seedVehicles.length;
  const co2PerVehiclePerDay = dailyAvgCO2Kg / vehicleCount;
  const co2PerKm = totalDistance > 0 ? totalCO2Kg / totalDistance : 0;
  const treesEquivalent = Math.round(totalCO2Tons * TREES_PER_TON_CO2 * 12); // Annualized

  const prevCO2Tons = (prevTotalFuel * CO2_PER_LITER_DIESEL) / 1000;
  const monthOverMonthChange = prevCO2Tons > 0
    ? ((totalCO2Tons - prevCO2Tons) / prevCO2Tons) * 100
    : 0;

  const carbonFootprint: CarbonFootprint = {
    totalCO2Tons: Math.round(totalCO2Tons * 10) / 10,
    dailyAvgCO2Kg: Math.round(dailyAvgCO2Kg),
    co2PerVehiclePerDay: Math.round(co2PerVehiclePerDay * 10) / 10,
    co2PerKm: Math.round(co2PerKm * 1000) / 1000,
    treesEquivalent,
    monthOverMonthChange: Math.round(monthOverMonthChange * 10) / 10,
  };

  // Fuel efficiency
  const fleetAvgKmPerLiter = totalFuel > 0 ? totalDistance / totalFuel : 0;
  const fuelEfficiency = calculateFuelEfficiency(recentTrips, fleetAvgKmPerLiter, totalFuel, totalDistance);

  // Idle waste
  const idleWaste = calculateIdleWaste(recentTrips, avgIdlingPercent);

  // Driver green rankings
  const driverGreenRankings = calculateDriverGreenScores(recentTrips, recentEvents, fleetAvgKmPerLiter);

  // EV readiness
  const evReadiness = calculateEVReadiness(recentTrips);

  // Fleet green score
  const fleetScore = calculateFleetGreenScore(
    fleetAvgKmPerLiter,
    avgIdlingPercent,
    recentEvents.length,
    totalDistance,
    monthOverMonthChange
  );

  // Recommendations
  const recommendations = generateRecommendations(idleWaste, fuelEfficiency, evReadiness, driverGreenRankings);

  // Monthly trend (last 3 months simulated from KPI data)
  const monthlyTrend = calculateMonthlyTrend();

  return {
    fleetScore,
    carbonFootprint,
    fuelEfficiency,
    idleWaste,
    driverGreenRankings,
    evReadiness,
    recommendations,
    monthlyTrend,
  };
}

function calculateFuelEfficiency(
  trips: typeof seedTripDays,
  fleetAvg: number,
  totalFuel: number,
  totalDistance: number,
): FuelEfficiencyMetrics {
  // Per-driver efficiency
  const driverEfficiency = new Map<string, { distance: number; fuel: number; name: string }>();

  for (const trip of trips) {
    const driver = seedDrivers.find(d => d.id === trip.driverId);
    if (!driver) continue;

    const existing = driverEfficiency.get(trip.driverId) || { distance: 0, fuel: 0, name: driver.name };
    existing.distance += trip.totalDistance;
    // Estimate fuel per driver based on distance and vehicle type
    const vehicle = seedVehicles.find(v => v.id === trip.vehicleId);
    const benchmark = EFFICIENCY_BENCHMARKS[vehicle?.type || 'default'] || EFFICIENCY_BENCHMARKS.default;
    existing.fuel += trip.totalDistance / benchmark.avg;
    driverEfficiency.set(trip.driverId, existing);
  }

  let bestDriver = { id: '', name: 'N/A', kmPerLiter: 0 };
  let worstDriver = { id: '', name: 'N/A', kmPerLiter: Infinity };

  for (const [id, data] of driverEfficiency) {
    const eff = data.fuel > 0 ? data.distance / data.fuel : 0;
    if (eff > bestDriver.kmPerLiter) bestDriver = { id, name: data.name, kmPerLiter: Math.round(eff * 10) / 10 };
    if (eff < worstDriver.kmPerLiter && eff > 0) worstDriver = { id, name: data.name, kmPerLiter: Math.round(eff * 10) / 10 };
  }

  if (worstDriver.kmPerLiter === Infinity) worstDriver = { id: '', name: 'N/A', kmPerLiter: 0 };

  const benchmarkComparison = fleetAvg >= 3.4 ? 'above average' : fleetAvg >= 2.8 ? 'average' : 'below average';

  return {
    fleetAvgKmPerLiter: Math.round(fleetAvg * 10) / 10,
    totalFuelConsumed: Math.round(totalFuel),
    totalDistance: Math.round(totalDistance),
    bestDriver,
    worstDriver,
    benchmarkComparison,
  };
}

function calculateIdleWaste(trips: typeof seedTripDays, avgIdlePercent: number): IdleWasteMetrics {
  const totalIdleMinutes = trips.reduce((s, t) => s + t.idlingMinutes, 0);
  const totalIdleHours = totalIdleMinutes / 60;
  const fuelWastedLiters = totalIdleHours * IDLE_FUEL_BURN_PER_HOUR;
  const co2FromIdling = fuelWastedLiters * CO2_PER_LITER_DIESEL;
  const costWasted = fuelWastedLiters * FUEL_COST_PER_LITER;

  // Per-driver idle stats
  const driverIdle = new Map<string, { minutes: number; name: string }>();
  for (const trip of trips) {
    const driver = seedDrivers.find(d => d.id === trip.driverId);
    if (!driver) continue;
    const existing = driverIdle.get(trip.driverId) || { minutes: 0, name: driver.name };
    existing.minutes += trip.idlingMinutes;
    driverIdle.set(trip.driverId, existing);
  }

  const topOffenders = Array.from(driverIdle.entries())
    .map(([id, data]) => ({
      driverId: id,
      driverName: data.name,
      idleMinutes: Math.round(data.minutes),
      fuelWasted: Math.round((data.minutes / 60) * IDLE_FUEL_BURN_PER_HOUR * 10) / 10,
      co2Produced: Math.round((data.minutes / 60) * IDLE_FUEL_BURN_PER_HOUR * CO2_PER_LITER_DIESEL * 10) / 10,
    }))
    .sort((a, b) => b.idleMinutes - a.idleMinutes)
    .slice(0, 5);

  return {
    totalIdleHours: Math.round(totalIdleHours * 10) / 10,
    fuelWastedLiters: Math.round(fuelWastedLiters),
    co2FromIdling: Math.round(co2FromIdling * 10) / 10,
    costWasted: Math.round(costWasted),
    avgIdlePercentage: Math.round(avgIdlePercent * 10) / 10,
    topOffenders,
  };
}

function calculateDriverGreenScores(
  trips: typeof seedTripDays,
  events: typeof seedSafetyEvents,
  fleetAvg: number,
): DriverGreenScore[] {
  const driverStats = new Map<string, {
    distance: number; fuel: number; idleMinutes: number;
    drivingMinutes: number; harshEvents: number; name: string;
  }>();

  const fuelWastingEvents = new Set(['harsh_braking', 'harsh_acceleration', 'speeding', 'idle_excessive']);

  for (const trip of trips) {
    const driver = seedDrivers.find(d => d.id === trip.driverId);
    if (!driver) continue;

    const vehicle = seedVehicles.find(v => v.id === trip.vehicleId);
    const benchmark = EFFICIENCY_BENCHMARKS[vehicle?.type || 'default'] || EFFICIENCY_BENCHMARKS.default;

    const existing = driverStats.get(trip.driverId) || {
      distance: 0, fuel: 0, idleMinutes: 0, drivingMinutes: 0, harshEvents: 0, name: driver.name,
    };
    existing.distance += trip.totalDistance;
    existing.fuel += trip.totalDistance / benchmark.avg;
    existing.idleMinutes += trip.idlingMinutes;
    existing.drivingMinutes += trip.drivingHours * 60;
    driverStats.set(trip.driverId, existing);
  }

  // Count fuel-wasting events per driver
  for (const event of events) {
    if (!fuelWastingEvents.has(event.type)) continue;
    const existing = driverStats.get(event.driverId);
    if (existing) existing.harshEvents++;
  }

  const scores: DriverGreenScore[] = [];

  for (const [id, stats] of driverStats) {
    const kmPerLiter = stats.fuel > 0 ? stats.distance / stats.fuel : 0;
    const idlePercent = stats.drivingMinutes > 0
      ? (stats.idleMinutes / (stats.drivingMinutes + stats.idleMinutes)) * 100
      : 0;
    const harshPerKm = stats.distance > 0 ? (stats.harshEvents / stats.distance) * 1000 : 0;

    // Estimate CO2 per km for this driver
    const fuelPerKm = stats.distance > 0 ? stats.fuel / stats.distance : 0;
    const co2PerKm = fuelPerKm * CO2_PER_LITER_DIESEL;

    // Fleet average CO2/km
    const fleetCO2PerKm = fleetAvg > 0 ? (1 / fleetAvg) * CO2_PER_LITER_DIESEL : 0;
    const co2SavedVsAvg = (fleetCO2PerKm - co2PerKm) * stats.distance;

    // Green score components (each 0-100)
    const efficiencyScore = clamp(((kmPerLiter / 3.5) * 70) + 15, 0, 100);
    const idleScore = clamp(100 - (idlePercent * 5), 0, 100);
    const harshScore = clamp(100 - (harshPerKm * 20), 0, 100);

    const greenScore = Math.round(
      efficiencyScore * 0.4 + idleScore * 0.35 + harshScore * 0.25
    );

    scores.push({
      driverId: id,
      driverName: stats.name,
      greenScore: clamp(greenScore, 0, 100),
      grade: getGrade(greenScore),
      rank: 0, // Set after sorting
      fuelEfficiency: Math.round(kmPerLiter * 10) / 10,
      idlePercent: Math.round(idlePercent * 10) / 10,
      harshEventsPerKm: Math.round(harshPerKm * 100) / 100,
      co2PerKm: Math.round(co2PerKm * 1000) / 1000,
      co2SavedVsAvg: Math.round(co2SavedVsAvg * 10) / 10,
    });
  }

  scores.sort((a, b) => b.greenScore - a.greenScore);
  scores.forEach((s, i) => { s.rank = i + 1; });

  return scores;
}

function calculateEVReadiness(trips: typeof seedTripDays): EVReadinessReport {
  // Group trips by vehicle
  const vehicleTrips = new Map<string, { distances: number[]; totalDays: number }>();

  for (const trip of trips) {
    const existing = vehicleTrips.get(trip.vehicleId) || { distances: [], totalDays: 0 };
    existing.distances.push(trip.totalDistance);
    existing.totalDays++;
    vehicleTrips.set(trip.vehicleId, existing);
  }

  const candidates: EVCandidate[] = [];

  for (const vehicle of seedVehicles) {
    const trips = vehicleTrips.get(vehicle.id);
    if (!trips || trips.totalDays === 0) continue;

    const avgDailyDistance = trips.distances.reduce((s, d) => s + d, 0) / trips.totalDays;

    // 2026 EV range reality: Class 5 vans ~320km, Class 6 ~400km, Class 8 ~500km (Tesla Semi, eCascadia)
    const evRange = vehicle.type === 'Class 5 Van' ? 320
      : vehicle.type === 'Class 6 Box' ? 400
      : 500;

    const evSavings = EV_SAVINGS[vehicle.type] || EV_SAVINGS.default;

    // Readiness score: lower daily distance relative to range = higher readiness
    const rangeRatio = avgDailyDistance / evRange;
    let readinessScore = 0;
    let reason = '';

    if (rangeRatio <= 0.6) {
      readinessScore = 95;
      reason = `Avg daily ${Math.round(avgDailyDistance)}km well within ${evRange}km EV range — ideal candidate`;
    } else if (rangeRatio <= 0.8) {
      readinessScore = 75;
      reason = `Avg daily ${Math.round(avgDailyDistance)}km manageable with ${evRange}km EV range`;
    } else if (rangeRatio <= 1.0) {
      readinessScore = 50;
      reason = `Avg daily ${Math.round(avgDailyDistance)}km pushes ${evRange}km EV range — needs charging infra`;
    } else {
      readinessScore = 25;
      reason = `Avg daily ${Math.round(avgDailyDistance)}km exceeds current ${evRange}km EV range`;
    }

    // Older vehicles are better candidates for replacement
    const ageBonus = Math.max(0, (2026 - vehicle.year) * 3);
    readinessScore = clamp(readinessScore + ageBonus, 0, 100);

    // Fuel cost estimate
    const benchmark = EFFICIENCY_BENCHMARKS[vehicle.type] || EFFICIENCY_BENCHMARKS.default;
    const dailyFuelLiters = avgDailyDistance / benchmark.avg;
    const annualFuelCost = dailyFuelLiters * 260 * FUEL_COST_PER_LITER;

    candidates.push({
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      type: vehicle.type,
      year: vehicle.year,
      avgDailyDistance: Math.round(avgDailyDistance),
      currentFuelCost: Math.round(annualFuelCost),
      projectedEVSavings: Math.round(evSavings.fuelSaved + evSavings.maintenanceSaved),
      co2Reduction: evSavings.co2Reduced,
      readinessScore,
      reason,
    });
  }

  candidates.sort((a, b) => b.readinessScore - a.readinessScore);

  const topCandidates = candidates.filter(c => c.readinessScore >= 50);

  return {
    totalCandidates: topCandidates.length,
    projectedAnnualSavings: topCandidates.reduce((s, c) => s + c.projectedEVSavings, 0),
    projectedCO2Reduction: Math.round(topCandidates.reduce((s, c) => s + c.co2Reduction, 0) * 10) / 10,
    vehicles: candidates,
  };
}

function calculateFleetGreenScore(
  avgKmPerLiter: number,
  avgIdlePercent: number,
  recentEvents: number,
  totalDistance: number,
  monthOverMonthChange: number,
): FleetGreenScore {
  // Fuel efficiency score (0-100): benchmark around 3.0 km/L for mixed fleet
  const fuelScore = clamp(Math.round((avgKmPerLiter / 4.0) * 85 + 10), 0, 100);

  // Idle reduction score: lower idle = higher score
  const idleScore = clamp(Math.round(100 - (avgIdlePercent * 4.5)), 0, 100);

  // Eco driving score: fewer fuel-wasting events per km
  const fuelWastingTypes = new Set(['harsh_braking', 'harsh_acceleration', 'speeding', 'idle_excessive']);
  const fuelWastingEvents = seedSafetyEvents.filter(e =>
    fuelWastingTypes.has(e.type) && new Date(e.dateTime).getTime() > Date.now() - 30 * 86400000
  ).length;
  const eventsPerKm = totalDistance > 0 ? (fuelWastingEvents / totalDistance) * 1000 : 0;
  const ecoScore = clamp(Math.round(100 - (eventsPerKm * 15)), 0, 100);

  // Fleet modernity score: based on avg vehicle age
  const avgAge = seedVehicles.length > 0
    ? seedVehicles.reduce((s, v) => s + (2026 - v.year), 0) / seedVehicles.length
    : 3;
  const modernityScore = clamp(Math.round(100 - (avgAge * 12)), 0, 100);

  const overallScore = Math.round(
    fuelScore * 0.30 + idleScore * 0.25 + ecoScore * 0.25 + modernityScore * 0.20
  );

  const trend: 'improving' | 'stable' | 'declining' =
    monthOverMonthChange < -3 ? 'improving' :
    monthOverMonthChange > 3 ? 'declining' : 'stable';

  return {
    overallScore: clamp(overallScore, 0, 100),
    grade: getGrade(overallScore),
    components: {
      fuelEfficiency: { score: fuelScore, weight: 0.30, weightedScore: Math.round(fuelScore * 0.30 * 10) / 10 },
      idleReduction: { score: idleScore, weight: 0.25, weightedScore: Math.round(idleScore * 0.25 * 10) / 10 },
      ecoDriving: { score: ecoScore, weight: 0.25, weightedScore: Math.round(ecoScore * 0.25 * 10) / 10 },
      fleetModernity: { score: modernityScore, weight: 0.20, weightedScore: Math.round(modernityScore * 0.20 * 10) / 10 },
    },
    trend,
  };
}

function generateRecommendations(
  idle: IdleWasteMetrics,
  fuel: FuelEfficiencyMetrics,
  ev: EVReadinessReport,
  drivers: DriverGreenScore[],
): GreenRecommendation[] {
  const recs: GreenRecommendation[] = [];

  // Idle reduction recommendation
  if (idle.avgIdlePercentage > 10) {
    const targetReduction = idle.avgIdlePercentage * 0.3; // 30% reduction
    const fuelSaved = (targetReduction / 100) * idle.fuelWastedLiters;
    const co2Saved = fuelSaved * CO2_PER_LITER_DIESEL / 1000;
    recs.push({
      id: 'idle-policy',
      priority: 'high',
      category: 'idle',
      title: 'Implement 5-minute idle shutoff policy',
      description: `Fleet averages ${idle.avgIdlePercentage.toFixed(1)}% idle time. A 5-min auto-shutoff policy could reduce idling by 30%, saving ${Math.round(fuelSaved)} liters of fuel monthly.`,
      projectedSavings: Math.round(fuelSaved * FUEL_COST_PER_LITER * 12),
      projectedCO2Reduction: Math.round(co2Saved * 12 * 10) / 10,
      difficulty: 'easy',
      timeToImpact: '1-2 weeks',
    });
  }

  // Coach top idle offenders
  if (idle.topOffenders.length > 0) {
    const topOffender = idle.topOffenders[0];
    recs.push({
      id: 'coach-idle-offenders',
      priority: 'high',
      category: 'idle',
      title: `Coach top idle offenders (starting with ${topOffender.driverName})`,
      description: `${topOffender.driverName} has ${topOffender.idleMinutes} minutes of idle time, wasting ${topOffender.fuelWasted}L of fuel and producing ${topOffender.co2Produced}kg CO2 this month.`,
      projectedSavings: Math.round(topOffender.fuelWasted * FUEL_COST_PER_LITER * 0.5 * 12),
      projectedCO2Reduction: Math.round(topOffender.co2Produced * 0.5 * 12 / 1000 * 10) / 10,
      difficulty: 'easy',
      timeToImpact: '2-4 weeks',
    });
  }

  // EV transition recommendation
  if (ev.totalCandidates > 0) {
    const topCandidate = ev.vehicles[0];
    recs.push({
      id: 'ev-transition',
      priority: 'medium',
      category: 'ev',
      title: `Begin EV transition with ${ev.totalCandidates} ready vehicles`,
      description: `${topCandidate.vehicleName} (${topCandidate.type}, ${topCandidate.year}) averages only ${topCandidate.avgDailyDistance}km/day — perfect for EV replacement. ${ev.totalCandidates} vehicles total are EV-ready.`,
      projectedSavings: ev.projectedAnnualSavings,
      projectedCO2Reduction: ev.projectedCO2Reduction,
      difficulty: 'hard',
      timeToImpact: '3-6 months',
    });
  }

  // Eco-driving training for low-scoring drivers
  const lowDrivers = drivers.filter(d => d.greenScore < 60);
  if (lowDrivers.length > 0) {
    recs.push({
      id: 'eco-training',
      priority: 'medium',
      category: 'driving',
      title: `Eco-driving training for ${lowDrivers.length} drivers`,
      description: `${lowDrivers.length} drivers score below 60 on eco-driving. Training on smooth acceleration, anticipatory braking, and speed management can improve fuel efficiency by 10-15%.`,
      projectedSavings: Math.round(lowDrivers.length * 1200),
      projectedCO2Reduction: Math.round(lowDrivers.length * 2.5 * 10) / 10,
      difficulty: 'moderate',
      timeToImpact: '4-8 weeks',
    });
  }

  // Route optimization
  recs.push({
    id: 'route-optimization',
    priority: 'low',
    category: 'route',
    title: 'Implement AI-powered route optimization',
    description: 'Optimized routing can reduce total fleet distance by 8-12%, directly cutting fuel consumption and emissions proportionally.',
    projectedSavings: Math.round(fuel.totalFuelConsumed * 0.10 * FUEL_COST_PER_LITER * 12),
    projectedCO2Reduction: Math.round(fuel.totalFuelConsumed * 0.10 * CO2_PER_LITER_DIESEL / 1000 * 12 * 10) / 10,
    difficulty: 'moderate',
    timeToImpact: '2-3 months',
  });

  return recs.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

function calculateMonthlyTrend(): MonthlyGreenTrend[] {
  const months: MonthlyGreenTrend[] = [];
  const now = new Date();

  for (let i = 2; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    const monthKPIs = seedFleetKPIs.filter(k => {
      const d = new Date(k.date);
      return d >= monthStart && d <= monthEnd;
    });

    const totalFuel = monthKPIs.reduce((s, k) => s + k.fuelConsumed, 0);
    const totalDist = monthKPIs.reduce((s, k) => s + k.totalDistance, 0);
    const co2Tons = (totalFuel * CO2_PER_LITER_DIESEL) / 1000;
    const avgIdle = monthKPIs.length > 0
      ? monthKPIs.reduce((s, k) => s + k.idlingPercent, 0) / monthKPIs.length
      : 12;
    const efficiency = totalFuel > 0 ? totalDist / totalFuel : 3.0;

    // Simulated improvement over time
    const improvementFactor = 1 + (2 - i) * 0.02;

    months.push({
      month: monthLabel,
      co2Tons: Math.round(co2Tons * 10) / 10 || Math.round((85 + i * 5) * 10) / 10,
      fuelEfficiency: Math.round(efficiency * improvementFactor * 10) / 10 || Math.round((2.8 + (2 - i) * 0.1) * 10) / 10,
      idlePercent: Math.round((avgIdle / improvementFactor) * 10) / 10 || Math.round((14 - (2 - i)) * 10) / 10,
      greenScore: Math.round(65 + (2 - i) * 4),
    });
  }

  return months;
}
