/**
 * Fleet ROI Calculation Engine
 * Quantifies fleet safety investment value in dollars.
 * Compares first 45 days vs last 45 days of 90-day seed data.
 */

import {
  seedDrivers,
  seedVehicles,
  seedSafetyEvents,
  seedTripDays,
  seedFleetKPIs,
} from '../data/seed-data.js';
import { calculateInsuranceScore } from './insurance-score-engine.js';
import { predictAllWellness } from './wellness-predictor.js';

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

export interface RetentionSavings {
  driversAtRisk: number;
  avgReplacementCost: number;
  totalRetentionCostAtRisk: number;
  interventionSuccessRate: number;
  projectedSavings: number;
  details: { driverId: string; driverName: string; burnoutRisk: string; retentionCost: number }[];
}

const AVG_ACCIDENT_COST = 91000;
const FLEET_INSURANCE_PER_VEHICLE = 12000;
const FUEL_COST_PER_LITER = 1.65;
const IDLE_FUEL_BURN_PER_HOUR = 3.8;
const PLATFORM_COST_PER_VEHICLE_MONTHLY = 45;
const TELEMATICS_COST_PER_VEHICLE_MONTHLY = 35;
const REPLACEMENT_COST_PER_DRIVER = 35000;
const INTERVENTION_SUCCESS_RATE = 0.65;
const PRODUCTIVITY_GAIN_PER_REDUCED_EVENT = 150;

function getPeriods() {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);
  const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 86400000);
  return {
    beforeStart: ninetyDaysAgo,
    beforeEnd: fortyFiveDaysAgo,
    afterStart: fortyFiveDaysAgo,
    afterEnd: now,
  };
}

function dateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function calculateFleetROI(): FleetROI {
  const vehicleCount = seedVehicles.length;
  const { beforeStart, beforeEnd, afterStart, afterEnd } = getPeriods();

  const eventsBefore = seedSafetyEvents.filter((e) => {
    const t = new Date(e.dateTime).getTime();
    return t >= beforeStart.getTime() && t < beforeEnd.getTime();
  });
  const eventsAfter = seedSafetyEvents.filter((e) => {
    const t = new Date(e.dateTime).getTime();
    return t >= afterStart.getTime() && t < afterEnd.getTime();
  });

  const highSeverityBefore = eventsBefore.filter((e) => e.severity === 'high' || e.severity === 'critical').length;
  const highSeverityAfter = eventsAfter.filter((e) => e.severity === 'high' || e.severity === 'critical').length;

  const tripsBefore = seedTripDays.filter((t) => {
    const d = new Date(t.date).getTime();
    return d >= beforeStart.getTime() && d < beforeEnd.getTime();
  });
  const tripsAfter = seedTripDays.filter((t) => {
    const d = new Date(t.date).getTime();
    return d >= afterStart.getTime() && d < afterEnd.getTime();
  });

  const avgIdlingBefore = tripsBefore.length > 0
    ? tripsBefore.reduce((s, t) => s + t.idlingMinutes, 0) / tripsBefore.length : 0;
  const avgIdlingAfter = tripsAfter.length > 0
    ? tripsAfter.reduce((s, t) => s + t.idlingMinutes, 0) / tripsAfter.length : 0;

  // 1. Insurance Premium Savings
  const insuranceScore = calculateInsuranceScore();
  const baselinePremium = vehicleCount * FLEET_INSURANCE_PER_VEHICLE;
  const premiumReductionPercent = Math.max(0, (insuranceScore.overallScore - 60) * 0.4);
  const insurancePremiumSavings = Math.round(baselinePremium * (premiumReductionPercent / 100));

  // 2. Accident Prevention Savings
  const highSeverityReduction = Math.max(0, highSeverityBefore - highSeverityAfter);
  const annualizedReduction = highSeverityReduction * (365 / 45);
  const estimatedPreventedAccidents = annualizedReduction / 50;
  const accidentPreventionSavings = Math.round(estimatedPreventedAccidents * AVG_ACCIDENT_COST);

  // 3. Fuel Savings
  const idlingReductionMinutes = Math.max(0, avgIdlingBefore - avgIdlingAfter);
  const idlingReductionHoursPerDay = idlingReductionMinutes / 60;
  const workingDaysPerYear = 260;
  const annualFuelLitersSaved = idlingReductionHoursPerDay * IDLE_FUEL_BURN_PER_HOUR * seedDrivers.length * workingDaysPerYear;
  const fuelSavings = Math.round(annualFuelLitersSaved * FUEL_COST_PER_LITER);

  // 4. Retention Savings
  const retentionData = calculateRetentionSavings();
  const retentionSavings = retentionData.projectedSavings;

  // 5. Productivity Gains
  const totalEventReduction = Math.max(0, eventsBefore.length - eventsAfter.length);
  const annualizedEventReduction = totalEventReduction * (365 / 45);
  const productivityGains = Math.round(annualizedEventReduction * PRODUCTIVITY_GAIN_PER_REDUCED_EVENT);

  // Investment Cost
  const investmentCost = (vehicleCount * (PLATFORM_COST_PER_VEHICLE_MONTHLY + TELEMATICS_COST_PER_VEHICLE_MONTHLY)) * 12;

  const totalAnnualSavings = insurancePremiumSavings + accidentPreventionSavings + fuelSavings + retentionSavings + productivityGains;
  const netSavings = totalAnnualSavings - investmentCost;
  const roiPercent = investmentCost > 0 ? Math.round((netSavings / investmentCost) * 100) : 0;
  const paybackMonths = totalAnnualSavings > 0 ? Math.round((investmentCost / totalAnnualSavings) * 12 * 10) / 10 : 0;

  const year1 = totalAnnualSavings - investmentCost;
  const year2 = totalAnnualSavings * 1.08 - investmentCost;
  const year3 = totalAnnualSavings * 1.08 * 1.08 - investmentCost;
  const projectedThreeYearValue = Math.round(year1 + year2 + year3);

  return {
    totalAnnualSavings,
    insurancePremiumSavings,
    accidentPreventionSavings,
    fuelSavings,
    retentionSavings,
    productivityGains,
    investmentCost,
    roiPercent,
    paybackMonths,
    projectedThreeYearValue,
  };
}

export function calculateBeforeAfter(): BeforeAfterComparison {
  const { beforeStart, beforeEnd, afterStart, afterEnd } = getPeriods();

  const eventsBefore = seedSafetyEvents.filter((e) => {
    const t = new Date(e.dateTime).getTime();
    return t >= beforeStart.getTime() && t < beforeEnd.getTime();
  });
  const eventsAfter = seedSafetyEvents.filter((e) => {
    const t = new Date(e.dateTime).getTime();
    return t >= afterStart.getTime() && t < afterEnd.getTime();
  });

  const tripsBefore = seedTripDays.filter((t) => {
    const d = new Date(t.date).getTime();
    return d >= beforeStart.getTime() && d < beforeEnd.getTime();
  });
  const tripsAfter = seedTripDays.filter((t) => {
    const d = new Date(t.date).getTime();
    return d >= afterStart.getTime() && d < afterEnd.getTime();
  });

  const kpisBefore = seedFleetKPIs.filter((k) => {
    const d = new Date(k.date).getTime();
    return d >= beforeStart.getTime() && d < beforeEnd.getTime();
  });
  const kpisAfter = seedFleetKPIs.filter((k) => {
    const d = new Date(k.date).getTime();
    return d >= afterStart.getTime() && d < afterEnd.getTime();
  });

  const highBefore = eventsBefore.filter((e) => e.severity === 'high' || e.severity === 'critical').length;
  const highAfter = eventsAfter.filter((e) => e.severity === 'high' || e.severity === 'critical').length;
  const avgIdleBefore = tripsBefore.length > 0 ? Math.round(tripsBefore.reduce((s, t) => s + t.idlingMinutes, 0) / tripsBefore.length * 10) / 10 : 0;
  const avgIdleAfter = tripsAfter.length > 0 ? Math.round(tripsAfter.reduce((s, t) => s + t.idlingMinutes, 0) / tripsAfter.length * 10) / 10 : 0;
  const avgScoreBefore = kpisBefore.length > 0 ? Math.round(kpisBefore.reduce((s, k) => s + k.avgSafetyScore, 0) / kpisBefore.length * 10) / 10 : 0;
  const avgScoreAfter = kpisAfter.length > 0 ? Math.round(kpisAfter.reduce((s, k) => s + k.avgSafetyScore, 0) / kpisAfter.length * 10) / 10 : 0;
  const hosBefore = tripsBefore.filter((t) => t.drivingHours > 11).length;
  const hosAfter = tripsAfter.filter((t) => t.drivingHours > 11).length;
  const avgHoursBefore = tripsBefore.length > 0 ? Math.round(tripsBefore.reduce((s, t) => s + t.drivingHours, 0) / tripsBefore.length * 10) / 10 : 0;
  const avgHoursAfter = tripsAfter.length > 0 ? Math.round(tripsAfter.reduce((s, t) => s + t.drivingHours, 0) / tripsAfter.length * 10) / 10 : 0;

  function metric(name: string, before: number, after: number, costPerUnit: number) {
    const change = Math.round((after - before) * 10) / 10;
    const changePercent = before !== 0 ? Math.round((change / before) * 1000) / 10 : 0;
    const dollarImpact = Math.round(Math.abs(change) * costPerUnit);
    return { name, before, after, change, changePercent, dollarImpact };
  }

  return {
    periods: [
      { label: 'Before (Days 46-90)', startDate: dateStr(beforeStart), endDate: dateStr(beforeEnd) },
      { label: 'After (Days 1-45)', startDate: dateStr(afterStart), endDate: dateStr(afterEnd) },
    ],
    metrics: [
      metric('Total Safety Events', eventsBefore.length, eventsAfter.length, 500),
      metric('High/Critical Events', highBefore, highAfter, 1820),
      metric('Avg Safety Score', avgScoreBefore, avgScoreAfter, 3500),
      metric('Avg Daily Idling (min)', avgIdleBefore, avgIdleAfter, 120),
      metric('Avg Daily Driving Hours', avgHoursBefore, avgHoursAfter, 200),
      metric('HOS Violations', hosBefore, hosAfter, 2500),
    ],
  };
}

export function calculateRetentionSavings(): RetentionSavings {
  const allWellness = predictAllWellness();
  const atRisk = allWellness.filter((w) => w.burnoutRisk === 'high' || w.burnoutRisk === 'moderate');

  const details = atRisk.map((w) => ({
    driverId: w.driverId,
    driverName: w.driverName,
    burnoutRisk: w.burnoutRisk,
    retentionCost: w.retentionCost,
  }));

  const totalRetentionCostAtRisk = details.reduce((s, d) => s + d.retentionCost, 0);
  const projectedSavings = Math.round(totalRetentionCostAtRisk * INTERVENTION_SUCCESS_RATE);

  return {
    driversAtRisk: atRisk.length,
    avgReplacementCost: REPLACEMENT_COST_PER_DRIVER,
    totalRetentionCostAtRisk,
    interventionSuccessRate: INTERVENTION_SUCCESS_RATE,
    projectedSavings,
    details,
  };
}
