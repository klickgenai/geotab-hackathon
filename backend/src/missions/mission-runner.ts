/**
 * Mission Runner - Core execution engine for autonomous background missions.
 * Produces detailed, actionable reports like a fleet safety analyst would.
 * Calls scoring engines directly, uses one Claude generateText call for executive summary.
 */

import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { MissionConfig, MissionResult, MissionFinding, MissionProgress, MissionType } from './mission-types.js';
import { MISSION_META } from './mission-types.js';
import type { MissionCallbacks } from './mission-bridge.js';

// Scoring engine imports
import { calculateDriverRisk, calculateAllDriverRisks } from '../scoring/driver-risk-engine.js';
import { predictWellness, predictAllWellness, getFleetWellnessSummary } from '../scoring/wellness-predictor.js';
import { calculateInsuranceScore } from '../scoring/insurance-score-engine.js';
import { calculateAllPreShiftRisks, getFleetRiskForecast, detectDeteriorating } from '../scoring/predictive-safety.js';
import { calculateFleetROI, calculateBeforeAfter } from '../scoring/roi-engine.js';
import { getDailyBriefing } from '../scoring/alert-triage.js';
import { seedDrivers, seedSafetyEvents } from '../data/seed-data.js';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const MISSION_TIMEOUT = 90_000; // 90 seconds max

// ─── Main Entry Point ──────────────────────────────────────

export async function runMission(
  config: MissionConfig,
  callbacks: MissionCallbacks,
  abortSignal?: AbortSignal,
): Promise<MissionResult> {
  const missionId = config.sessionId || `mission-${Date.now()}`;
  const meta = MISSION_META[config.type];
  const startTime = Date.now();

  const timeoutController = new AbortController();
  const timeoutTimer = setTimeout(() => timeoutController.abort(), MISSION_TIMEOUT);
  const isAborted = () => abortSignal?.aborted || timeoutController.signal.aborted;

  try {
    callbacks.onProgress({
      missionId, type: config.type, phase: 'starting',
      step: 0, totalSteps: 1, message: `Initializing ${meta.displayName}...`,
    });
    await delay(400);

    let result: MissionResult;
    switch (config.type) {
      case 'coaching_sweep': result = await runCoachingSweep(missionId, config, callbacks, isAborted); break;
      case 'wellness_check': result = await runWellnessCheck(missionId, config, callbacks, isAborted); break;
      case 'safety_investigation': result = await runSafetyInvestigation(missionId, config, callbacks, isAborted); break;
      case 'insurance_optimization': result = await runInsuranceOptimization(missionId, config, callbacks, isAborted); break;
      case 'preshift_sweep': result = await runPreshiftSweep(missionId, config, callbacks, isAborted); break;
      default: throw new Error(`Unknown mission type: ${config.type}`);
    }

    result.duration = (Date.now() - startTime) / 1000;
    callbacks.onComplete(result);
    return result;
  } catch (err) {
    const duration = (Date.now() - startTime) / 1000;
    const result: MissionResult = {
      missionId, type: config.type,
      status: abortSignal?.aborted ? 'cancelled' : 'failed',
      displayName: meta.displayName,
      summary: timeoutController.signal.aborted
        ? 'Mission timed out — partial results may be available.'
        : `Mission failed: ${(err as Error).message}`,
      findings: [], recommendations: [], duration, data: {},
      completedAt: new Date().toISOString(), error: (err as Error).message,
    };
    callbacks.onComplete(result);
    return result;
  } finally {
    clearTimeout(timeoutTimer);
  }
}

// ─── Coaching Sweep ────────────────────────────────────────

async function runCoachingSweep(
  missionId: string, config: MissionConfig, cb: MissionCallbacks, isAborted: () => boolean,
): Promise<MissionResult> {
  const topN = config.params?.topN || 5;
  const findings: MissionFinding[] = [];
  const totalSteps = topN + 4; // fleet scan + N drivers + cross-ref + action plan + summary

  // Step 1: Fleet-wide risk scan
  cb.onProgress(progress(missionId, 'coaching_sweep', 'running', 1, totalSteps, 'Scanning fleet-wide risk scores for all 30 drivers...'));
  const allRisks = calculateAllDriverRisks();
  const topRisky = allRisks.slice(0, topN);
  const totalAnnualCostAtRisk = topRisky.reduce((s, d) => s + d.annualizedCost, 0);

  findings.push({
    missionId, category: 'fleet_overview', severity: 'info',
    title: `Fleet Risk Overview — ${topN} highest-risk drivers identified`,
    detail: `Scanned all ${allRisks.length} drivers. The top ${topN} account for $${totalAnnualCostAtRisk.toLocaleString()}/year in risk costs. Fleet average risk score: ${(allRisks.reduce((s, d) => s + d.riskScore, 0) / allRisks.length).toFixed(0)}/100.`,
    data: {
      totalDrivers: allRisks.length, topN,
      totalAnnualCostAtRisk,
      fleetAvgRiskScore: Math.round(allRisks.reduce((s, d) => s + d.riskScore, 0) / allRisks.length),
      riskDistribution: {
        critical: allRisks.filter(d => d.tier === 'critical').length,
        high: allRisks.filter(d => d.tier === 'high').length,
        moderate: allRisks.filter(d => d.tier === 'moderate').length,
        low: allRisks.filter(d => d.tier === 'low').length,
      },
    },
  });
  cb.onFinding(findings[findings.length - 1]);
  await delay(400);

  // Step 2–N+1: Deep analysis per driver
  const driverPlans: Array<Record<string, unknown>> = [];
  for (let i = 0; i < topRisky.length; i++) {
    if (isAborted()) break;
    const driver = topRisky[i];
    cb.onProgress(progress(missionId, 'coaching_sweep', 'running', i + 2, totalSteps,
      `Building coaching plan for ${driver.driverName} (${i + 1}/${topN})...`));

    try {
      const wellness = predictWellness(driver.driverId);
      const preShift = calculateAllPreShiftRisks().find(p => p.driverId === driver.driverId);
      const driverEvents = seedSafetyEvents.filter(e => e.driverId === driver.driverId);
      const last30Days = driverEvents.filter(e => Date.now() - new Date(e.dateTime).getTime() < 30 * 86400000);
      const severity = driver.tier === 'critical' ? 'critical' : driver.tier === 'high' ? 'warning' : 'info';

      // Build coaching actions based on their specific issues
      const coachingActions: string[] = [];
      const timeline: string[] = [];
      for (const evt of driver.topEventTypes.slice(0, 3)) {
        const evtName = evt.type.replace(/_/g, ' ');
        switch (evt.type) {
          case 'harsh_braking':
            coachingActions.push(`Enroll in defensive driving module — focus on following distance (${evt.count} incidents in 30 days)`);
            timeline.push('Week 1: Ride-along with trainer to assess braking patterns');
            break;
          case 'speeding':
            coachingActions.push(`Speed management coaching — set cruise control mandate on highways (${evt.count} incidents)`);
            timeline.push('Week 1: Install speed alert on vehicle, review with driver');
            break;
          case 'distracted_driving':
            coachingActions.push(`Phone-free driving policy enforcement + in-cab coaching session (${evt.count} incidents)`);
            timeline.push('Immediately: Secure phone mount, enable DND while driving');
            break;
          case 'drowsy_driving':
            coachingActions.push(`Fatigue management review — assess schedule and rest patterns (${evt.count} incidents)`);
            timeline.push('This week: Manager check-in on sleep and schedule');
            break;
          default:
            coachingActions.push(`${evtName} reduction coaching — ${evt.count} incidents in 30 days`);
            timeline.push(`Week 1–2: Targeted ${evtName} awareness training`);
        }
      }

      if (wellness && wellness.burnoutRisk !== 'low') {
        coachingActions.push(`Wellness intervention: ${wellness.burnoutRisk} burnout risk — ${wellness.recommendations[0] || 'schedule check-in'}`);
        timeline.push(wellness.burnoutRisk === 'high' ? 'Within 48 hours: Manager call + route reassignment' : 'Within 7 days: 1-on-1 wellness check-in');
      }

      const plan = {
        driverId: driver.driverId, driverName: driver.driverName,
        riskScore: driver.riskScore, tier: driver.tier,
        annualizedCost: driver.annualizedCost,
        recentEvents: last30Days.length,
        topIssues: driver.topEventTypes.slice(0, 3).map(e => ({ type: e.type.replace(/_/g, ' '), count: e.count })),
        riskComponents: driver.components,
        wellnessScore: wellness?.overallWellnessScore, burnoutRisk: wellness?.burnoutRisk,
        burnoutProbability: wellness?.burnoutProbability,
        retentionCost: wellness?.retentionCost,
        preShiftRisk: preShift ? { score: preShift.riskScore, level: preShift.riskLevel } : null,
        coachingActions, timeline,
        expectedImprovement: `${Math.min(15, Math.round(driver.riskScore * 0.2))} point risk reduction in 60 days`,
        estimatedSavings: `$${Math.round(driver.annualizedCost * 0.3).toLocaleString()}/year`,
      };
      driverPlans.push(plan);

      findings.push({
        missionId, category: 'driver_coaching_plan', severity,
        title: `${driver.driverName} — ${driver.tier.toUpperCase()} risk (${driver.riskScore}/100) — $${driver.annualizedCost.toLocaleString()}/yr`,
        detail: `${last30Days.length} safety events in 30 days. Top issues: ${driver.topEventTypes.slice(0, 3).map(e => `${e.type.replace(/_/g, ' ')} (${e.count})`).join(', ')}. ` +
          (wellness ? `Wellness: ${wellness.overallWellnessScore}/100, burnout: ${wellness.burnoutRisk}. ` : '') +
          `Coaching plan: ${coachingActions.length} actions. Expected improvement: ${plan.expectedImprovement}. Potential savings: ${plan.estimatedSavings}.`,
        data: plan,
      });
      cb.onFinding(findings[findings.length - 1]);
    } catch {
      findings.push({ missionId, category: 'error', severity: 'warning',
        title: `Could not analyze ${driver.driverName}`, detail: 'Scoring engine error — skipped.', });
    }
    await delay(350);
  }

  // Step N+2: Cross-reference with deteriorating trends
  cb.onProgress(progress(missionId, 'coaching_sweep', 'running', topN + 2, totalSteps, 'Cross-referencing with deteriorating trend data...'));
  const trends = detectDeteriorating();
  const worsening = trends.filter(t => t.trendDirection === 'declining' || t.trendDirection === 'rapidly_declining');
  if (worsening.length > 0) {
    findings.push({
      missionId, category: 'trend_alert', severity: 'warning',
      title: `${worsening.length} drivers with worsening trends detected`,
      detail: worsening.map(t => `${t.driverName}: ${t.trendDirection} (${t.weekOverWeekChange > 0 ? '+' : ''}${t.weekOverWeekChange.toFixed(0)}% events week-over-week)`).join('. '),
      data: { worseningDrivers: worsening.map(t => ({ name: t.driverName, trend: t.trendDirection, change: t.weekOverWeekChange })) },
    });
    cb.onFinding(findings[findings.length - 1]);
  }
  await delay(300);

  // Step N+3: Generate prioritized action plan
  cb.onProgress(progress(missionId, 'coaching_sweep', 'running', topN + 3, totalSteps, 'Building prioritized action plan...'));
  const actionPlan = driverPlans
    .sort((a, b) => (b.riskScore as number) - (a.riskScore as number))
    .map((p, i) => `${i + 1}. ${p.driverName} (risk: ${p.riskScore}) — ${(p.coachingActions as string[])[0]}`);
  await delay(200);

  // Step N+4: Executive summary
  cb.onProgress(progress(missionId, 'coaching_sweep', 'summarizing', totalSteps, totalSteps, 'Writing executive summary...'));
  const summary = await generateSummary(missionId, 'coaching_sweep', findings, driverPlans);

  return {
    missionId, type: 'coaching_sweep', status: 'complete',
    displayName: 'Coaching Sweep', summary, findings,
    recommendations: actionPlan,
    duration: 0,
    data: {
      driversAnalyzed: topRisky.length, totalFleetDrivers: allRisks.length,
      totalAnnualCostAtRisk, potentialSavings: Math.round(totalAnnualCostAtRisk * 0.3),
      driverPlans,
    },
    completedAt: new Date().toISOString(),
  };
}

// ─── Wellness Check ────────────────────────────────────────

async function runWellnessCheck(
  missionId: string, _config: MissionConfig, cb: MissionCallbacks, isAborted: () => boolean,
): Promise<MissionResult> {
  const findings: MissionFinding[] = [];

  // Step 1: Fleet wellness overview
  cb.onProgress(progress(missionId, 'wellness_check', 'running', 1, 5, 'Pulling fleet wellness overview...'));
  const fleetSummary = getFleetWellnessSummary();
  const allWellness = predictAllWellness();
  const highRisk = allWellness.filter(w => w.burnoutRisk === 'high');
  const moderateRisk = allWellness.filter(w => w.burnoutRisk === 'moderate');
  const totalRetention = allWellness.reduce((s, w) => s + w.retentionCost, 0);

  findings.push({
    missionId, category: 'fleet_wellness_overview', severity: highRisk.length > 3 ? 'critical' : highRisk.length > 0 ? 'warning' : 'info',
    title: `Fleet Wellness Overview — ${highRisk.length} critical, ${moderateRisk.length} moderate burnout risk`,
    detail: `${allWellness.length} drivers scanned. Average wellness score: ${fleetSummary.avgWellnessScore}/100. Total retention cost at risk: $${totalRetention.toLocaleString()}. ${highRisk.length} drivers need immediate intervention, ${moderateRisk.length} need monitoring.`,
    data: {
      totalDrivers: allWellness.length, highRisk: highRisk.length, moderateRisk: moderateRisk.length,
      avgWellnessScore: fleetSummary.avgWellnessScore, totalRetentionCost: totalRetention,
      distribution: { high: highRisk.length, moderate: moderateRisk.length, low: allWellness.length - highRisk.length - moderateRisk.length },
    },
  });
  cb.onFinding(findings[findings.length - 1]);
  await delay(400);

  if (isAborted()) return makePartialResult(missionId, 'wellness_check', findings);

  // Step 2: Deep analysis of high-risk drivers
  cb.onProgress(progress(missionId, 'wellness_check', 'running', 2, 5, `Analyzing ${highRisk.length} high-risk drivers...`));
  for (const w of highRisk) {
    const warningSignals = w.signals.filter(s => s.severity !== 'normal');
    const risk = calculateDriverRisk(w.driverId);
    const interventions: string[] = [];

    // Build specific interventions based on signals
    for (const sig of warningSignals) {
      if (sig.name.includes('hours') || sig.name.includes('long days')) {
        interventions.push(`Reduce shift length — currently averaging ${sig.value.toFixed(1)} (threshold: ${sig.threshold}). Reassign to shorter routes this week.`);
      } else if (sig.name.includes('rest') || sig.name.includes('Rest')) {
        interventions.push(`Enforce rest minimums — currently ${sig.value.toFixed(1)}hrs avg rest (need ${sig.threshold}+). Block scheduling for next 48hrs.`);
      } else if (sig.name.includes('night')) {
        interventions.push(`Review night driving pattern — ${sig.severity} level. Consider daylight-only routes for 2 weeks.`);
      } else if (sig.name.includes('event') || sig.name.includes('escalation')) {
        interventions.push(`Safety event escalation detected — assign ride-along within 5 days.`);
      } else {
        interventions.push(`${sig.name}: ${sig.severity} (value: ${sig.value.toFixed(1)}, threshold: ${sig.threshold})`);
      }
    }

    findings.push({
      missionId, category: 'burnout_critical', severity: 'critical',
      title: `${w.driverName} — HIGH burnout risk (${(w.burnoutProbability * 100).toFixed(0)}% probability)`,
      detail: `Wellness score: ${w.overallWellnessScore}/100. ${warningSignals.length} active warning signals. Retention cost at risk: $${w.retentionCost.toLocaleString()}. ` +
        `Avg rest: ${w.avgRestHours.toFixed(1)}hrs. Consecutive long days: ${w.consecutiveLongDays}. ` +
        (risk ? `Safety risk: ${risk.tier} (${risk.riskScore}/100) — burnout is compounding safety issues.` : ''),
      data: {
        driverId: w.driverId, driverName: w.driverName,
        wellnessScore: w.overallWellnessScore, burnoutProbability: w.burnoutProbability,
        retentionCost: w.retentionCost, avgRestHours: w.avgRestHours,
        consecutiveLongDays: w.consecutiveLongDays, daysSinceLastRest: w.daysSinceLastRest,
        signals: warningSignals, interventions,
        safetyRisk: risk ? { score: risk.riskScore, tier: risk.tier } : null,
        urgency: 'Within 48 hours',
      },
    });
    cb.onFinding(findings[findings.length - 1]);
  }
  await delay(350);

  // Step 3: Moderate-risk drivers
  cb.onProgress(progress(missionId, 'wellness_check', 'running', 3, 5, `Reviewing ${moderateRisk.length} moderate-risk drivers...`));
  for (const w of moderateRisk) {
    const warningSignals = w.signals.filter(s => s.severity !== 'normal');
    findings.push({
      missionId, category: 'burnout_moderate', severity: 'warning',
      title: `${w.driverName} — MODERATE burnout risk (${(w.burnoutProbability * 100).toFixed(0)}%)`,
      detail: `Wellness: ${w.overallWellnessScore}/100. ${warningSignals.length} warning signals: ${warningSignals.map(s => s.name).join(', ')}. ` +
        `Retention cost: $${w.retentionCost.toLocaleString()}. Recommended: schedule 1-on-1 check-in within 7 days.`,
      data: {
        driverId: w.driverId, driverName: w.driverName,
        wellnessScore: w.overallWellnessScore, burnoutProbability: w.burnoutProbability,
        retentionCost: w.retentionCost, signals: warningSignals,
        urgency: 'Within 7 days',
      },
    });
    cb.onFinding(findings[findings.length - 1]);
  }
  await delay(300);

  // Step 4: Intervention schedule
  cb.onProgress(progress(missionId, 'wellness_check', 'running', 4, 5, 'Building intervention schedule...'));
  const schedule = [
    ...highRisk.map(w => `URGENT (48hrs): ${w.driverName} — mandatory rest day + manager call + route reassignment`),
    ...moderateRisk.map(w => `MONITOR (7 days): ${w.driverName} — schedule wellness check-in, review route assignments`),
  ];
  await delay(200);

  // Step 5: Summary
  cb.onProgress(progress(missionId, 'wellness_check', 'summarizing', 5, 5, 'Writing executive summary...'));
  const summary = await generateSummary(missionId, 'wellness_check', findings);

  return {
    missionId, type: 'wellness_check', status: 'complete',
    displayName: 'Wellness Check', summary, findings,
    recommendations: schedule,
    duration: 0,
    data: {
      totalDrivers: allWellness.length, highBurnoutRisk: highRisk.length,
      moderateBurnoutRisk: moderateRisk.length, totalRetentionCost: totalRetention,
      avgWellnessScore: fleetSummary.avgWellnessScore,
    },
    completedAt: new Date().toISOString(),
  };
}

// ─── Safety Investigation ──────────────────────────────────

async function runSafetyInvestigation(
  missionId: string, config: MissionConfig, cb: MissionCallbacks, isAborted: () => boolean,
): Promise<MissionResult> {
  const findings: MissionFinding[] = [];
  let driverId = config.params?.driverId;

  if (!driverId && config.params?.driverName) {
    const match = seedDrivers.find(d => d.name.toLowerCase().includes(config.params!.driverName!.toLowerCase()));
    if (match) driverId = match.id;
  }
  if (!driverId) {
    driverId = calculateAllDriverRisks()[0]?.driverId;
  }
  if (!driverId) {
    return failResult(missionId, 'safety_investigation', 'No driver found to investigate.');
  }

  // Step 1: Full risk profile
  cb.onProgress(progress(missionId, 'safety_investigation', 'running', 1, 6, 'Pulling complete risk profile...'));
  const risk = calculateDriverRisk(driverId);
  if (!risk) return failResult(missionId, 'safety_investigation', 'Driver not found.');

  const allEvents = seedSafetyEvents.filter(e => e.driverId === driverId);
  const last30 = allEvents.filter(e => Date.now() - new Date(e.dateTime).getTime() < 30 * 86400000);
  const last60 = allEvents.filter(e => Date.now() - new Date(e.dateTime).getTime() < 60 * 86400000);
  const prev30 = last60.filter(e => !last30.includes(e));

  findings.push({
    missionId, category: 'risk_profile', severity: risk.tier === 'critical' ? 'critical' : risk.tier === 'high' ? 'warning' : 'info',
    title: `${risk.driverName} — Risk Profile: ${risk.riskScore}/100 (${risk.tier.toUpperCase()})`,
    detail: `Annualized cost: $${risk.annualizedCost.toLocaleString()}. ${last30.length} events in last 30 days (${prev30.length > 0 ? `${last30.length > prev30.length ? 'up' : 'down'} from ${prev30.length} prior 30 days` : 'no prior data'}). ` +
      `Risk components — Frequency: ${risk.components.eventFrequency.score}/100, Severity: ${risk.components.severity.score}/100, Pattern: ${risk.components.pattern.score}/100, Trend: ${risk.components.trend.score}/100 (${risk.components.trend.direction}).`,
    data: {
      driverId, driverName: risk.driverName, riskScore: risk.riskScore, tier: risk.tier,
      annualizedCost: risk.annualizedCost, components: risk.components,
      eventsLast30: last30.length, eventsPrev30: prev30.length,
      trendDirection: risk.components.trend.direction,
    },
  });
  cb.onFinding(findings[findings.length - 1]);
  await delay(400);

  if (isAborted()) return makePartialResult(missionId, 'safety_investigation', findings);

  // Step 2: Event pattern analysis
  cb.onProgress(progress(missionId, 'safety_investigation', 'running', 2, 6, 'Analyzing safety event patterns...'));
  const eventsByType: Record<string, number> = {};
  const eventsByHour: Record<number, number> = {};
  const eventsBySeverity: Record<string, number> = {};
  for (const e of last30) {
    const type = e.type.replace(/_/g, ' ');
    eventsByType[type] = (eventsByType[type] || 0) + 1;
    const hour = new Date(e.dateTime).getHours();
    eventsByHour[hour] = (eventsByHour[hour] || 0) + 1;
    eventsBySeverity[e.severity] = (eventsBySeverity[e.severity] || 0) + 1;
  }
  const peakHour = Object.entries(eventsByHour).sort((a, b) => b[1] - a[1])[0];
  const peakHourLabel = peakHour ? `${parseInt(peakHour[0]) % 12 || 12}${parseInt(peakHour[0]) < 12 ? 'AM' : 'PM'}` : 'N/A';

  findings.push({
    missionId, category: 'event_patterns', severity: 'info',
    title: `Event Pattern Analysis — ${last30.length} events in 30 days`,
    detail: `By type: ${Object.entries(eventsByType).sort((a, b) => b[1] - a[1]).map(([t, c]) => `${t} (${c})`).join(', ')}. ` +
      `By severity: ${Object.entries(eventsBySeverity).map(([s, c]) => `${s}: ${c}`).join(', ')}. ` +
      `Peak incident time: ${peakHourLabel} (${peakHour?.[1] || 0} events). ` +
      `Trend: ${risk.components.trend.direction} (${risk.components.trend.delta > 0 ? '+' : ''}${risk.components.trend.delta.toFixed(0)}% change).`,
    data: { eventsByType, eventsByHour, eventsBySeverity, peakHour: peakHour ? { hour: parseInt(peakHour[0]), count: peakHour[1], label: peakHourLabel } : null },
  });
  cb.onFinding(findings[findings.length - 1]);
  await delay(350);

  // Step 3: Wellness & fatigue correlation
  cb.onProgress(progress(missionId, 'safety_investigation', 'running', 3, 6, 'Checking wellness and fatigue correlation...'));
  const wellness = predictWellness(driverId);
  if (wellness) {
    const allSignals = wellness.signals.filter(s => s.severity !== 'normal');
    findings.push({
      missionId, category: 'wellness_correlation', severity: wellness.burnoutRisk === 'high' ? 'critical' : wellness.burnoutRisk === 'moderate' ? 'warning' : 'info',
      title: `Wellness Assessment: ${wellness.overallWellnessScore}/100 — ${wellness.burnoutRisk} burnout risk`,
      detail: `Burnout probability: ${(wellness.burnoutProbability * 100).toFixed(0)}%. Avg rest: ${wellness.avgRestHours.toFixed(1)}hrs. Consecutive long days: ${wellness.consecutiveLongDays}. ` +
        `${allSignals.length} active warning signals: ${allSignals.map(s => `${s.name} (${s.severity})`).join(', ')}. ` +
        `Retention cost at risk: $${wellness.retentionCost.toLocaleString()}.` +
        (wellness.burnoutRisk !== 'low' ? ` Fatigue may be a root cause of elevated safety events.` : ''),
      data: { wellnessScore: wellness.overallWellnessScore, burnoutRisk: wellness.burnoutRisk, burnoutProbability: wellness.burnoutProbability, avgRestHours: wellness.avgRestHours, consecutiveLongDays: wellness.consecutiveLongDays, signals: allSignals, retentionCost: wellness.retentionCost },
    });
    cb.onFinding(findings[findings.length - 1]);
  }
  await delay(350);

  // Step 4: Pre-shift risk
  cb.onProgress(progress(missionId, 'safety_investigation', 'running', 4, 6, 'Evaluating pre-shift risk factors...'));
  const preShift = calculateAllPreShiftRisks().find(p => p.driverId === driverId);
  if (preShift) {
    findings.push({
      missionId, category: 'preshift_assessment', severity: preShift.riskLevel === 'critical' ? 'critical' : preShift.riskLevel === 'high' ? 'warning' : 'info',
      title: `Pre-Shift Risk: ${preShift.riskScore}/100 (${preShift.riskLevel})`,
      detail: `Factors: ${preShift.factors.map(f => `${f.name} — impact: ${f.impact}/30, ${f.description}`).join('. ')}. Recommendation: ${preShift.recommendation}`,
      data: { riskScore: preShift.riskScore, riskLevel: preShift.riskLevel, factors: preShift.factors, recommendation: preShift.recommendation },
    });
    cb.onFinding(findings[findings.length - 1]);
  }
  await delay(300);

  // Step 5: Root cause analysis + action plan
  cb.onProgress(progress(missionId, 'safety_investigation', 'running', 5, 6, 'Determining root causes and building action plan...'));
  const rootCauses: string[] = [];
  if (wellness && wellness.burnoutRisk !== 'low') rootCauses.push(`Driver fatigue/burnout (${wellness.burnoutRisk} risk) — likely contributing to ${Object.keys(eventsByType)[0] || 'safety events'}`);
  if (risk.components.trend.direction === 'worsening') rootCauses.push('Worsening trend — behavior deteriorating over past 30 days, suggesting unaddressed root cause');
  if (peakHour && parseInt(peakHour[0]) >= 14 && parseInt(peakHour[0]) <= 18) rootCauses.push(`Afternoon fatigue pattern — ${peakHour[1]} of ${last30.length} events occur around ${peakHourLabel}`);
  if (peakHour && (parseInt(peakHour[0]) >= 22 || parseInt(peakHour[0]) <= 5)) rootCauses.push(`Night driving risk — ${peakHour[1]} events during high-risk hours`);
  const topEventType = Object.entries(eventsByType).sort((a, b) => b[1] - a[1])[0];
  if (topEventType && topEventType[1] > last30.length * 0.4) rootCauses.push(`${topEventType[0]} dominant (${topEventType[1]}/${last30.length} events) — specific behavioral pattern needs targeted intervention`);
  if (rootCauses.length === 0) rootCauses.push('Multiple contributing factors — no single dominant root cause identified');

  findings.push({
    missionId, category: 'root_cause', severity: 'warning',
    title: `Root Cause Analysis — ${rootCauses.length} factors identified`,
    detail: rootCauses.join('. '),
    data: { rootCauses },
  });
  cb.onFinding(findings[findings.length - 1]);
  await delay(200);

  // Step 6: Summary
  cb.onProgress(progress(missionId, 'safety_investigation', 'summarizing', 6, 6, 'Writing investigation report...'));
  const summary = await generateSummary(missionId, 'safety_investigation', findings);

  const actionPlan = [
    `IMMEDIATE: ${risk.recommendations[0] || 'Schedule safety review with driver'}`,
    ...(wellness && wellness.burnoutRisk !== 'low' ? [`URGENT: Address burnout — ${wellness.recommendations[0]}`] : []),
    `WEEK 1: Targeted coaching on ${Object.keys(eventsByType)[0] || 'top event type'} reduction`,
    `WEEK 2: Follow-up ride-along assessment`,
    `ONGOING: Monitor via Predictive Safety dashboard — flag if risk score exceeds ${risk.riskScore}`,
  ];

  return {
    missionId, type: 'safety_investigation', status: 'complete',
    displayName: 'Safety Investigation', summary, findings,
    recommendations: actionPlan, duration: 0,
    data: { driverId, driverName: risk.driverName, riskScore: risk.riskScore, rootCauses },
    completedAt: new Date().toISOString(),
  };
}

// ─── Insurance Optimization ────────────────────────────────

async function runInsuranceOptimization(
  missionId: string, _config: MissionConfig, cb: MissionCallbacks, isAborted: () => boolean,
): Promise<MissionResult> {
  const findings: MissionFinding[] = [];

  // Step 1: Current score breakdown
  cb.onProgress(progress(missionId, 'insurance_optimization', 'running', 1, 6, 'Analyzing insurance score components...'));
  const score = calculateInsuranceScore();
  findings.push({
    missionId, category: 'score_overview', severity: score.overallScore < 60 ? 'critical' : score.overallScore < 75 ? 'warning' : 'info',
    title: `Fleet Insurance Score: ${score.overallScore}/100 (${score.grade}) — ${score.trend}`,
    detail: `Percentile: ${score.percentile}th. Premium impact: ${score.premiumImpact.percentChange > 0 ? '+' : ''}${score.premiumImpact.percentChange.toFixed(1)}% vs benchmark. ` +
      `Current annual savings: $${score.premiumImpact.estimatedAnnualSavings.toLocaleString()}.`,
    data: { overallScore: score.overallScore, grade: score.grade, trend: score.trend, percentile: score.percentile, premiumImpact: score.premiumImpact, components: score.components },
  });
  cb.onFinding(findings[findings.length - 1]);
  await delay(400);

  if (isAborted()) return makePartialResult(missionId, 'insurance_optimization', findings);

  // Step 2: Component-by-component analysis
  cb.onProgress(progress(missionId, 'insurance_optimization', 'running', 2, 6, 'Identifying weakest components and quick wins...'));
  const componentEntries = Object.entries(score.components)
    .map(([name, comp]) => ({ name, ...(comp as { score: number; weight: number; weightedScore: number; details: Record<string, unknown> }) }))
    .sort((a, b) => a.score - b.score);

  for (const comp of componentEntries) {
    const improvementPotential = Math.round((100 - comp.score) * comp.weight * 0.5);
    const premiumImpact = Math.round(improvementPotential * 200); // rough $/point estimate
    findings.push({
      missionId, category: 'component_analysis', severity: comp.score < 60 ? 'critical' : comp.score < 75 ? 'warning' : 'info',
      title: `${comp.name}: ${comp.score}/100 (weight: ${(comp.weight * 100).toFixed(0)}%)`,
      detail: `Weighted contribution: ${comp.weightedScore.toFixed(1)} points. ${comp.score < 70 ? `Below target — improving to 80 could save ~$${premiumImpact.toLocaleString()}/year.` : 'At or above target — maintain current performance.'}`,
      data: { component: comp.name, score: comp.score, weight: comp.weight, weightedScore: comp.weightedScore, improvementPotential, premiumImpact, details: comp.details },
    });
    cb.onFinding(findings[findings.length - 1]);
  }
  await delay(350);

  // Step 3: ROI analysis
  cb.onProgress(progress(missionId, 'insurance_optimization', 'running', 3, 6, 'Calculating full ROI breakdown...'));
  const roi = calculateFleetROI();
  findings.push({
    missionId, category: 'roi_analysis', severity: 'info',
    title: `ROI Analysis — $${roi.totalAnnualSavings.toLocaleString()}/year total savings`,
    detail: `Insurance premiums: $${roi.insurancePremiumSavings.toLocaleString()}. Accident prevention: $${roi.accidentPreventionSavings.toLocaleString()}. ` +
      `Fuel: $${roi.fuelSavings.toLocaleString()}. Retention: $${roi.retentionSavings.toLocaleString()}. Productivity: $${roi.productivityGains.toLocaleString()}. ` +
      `ROI: ${roi.roiPercent.toFixed(0)}%. Payback: ${roi.paybackMonths.toFixed(1)} months. 3-year value: $${roi.projectedThreeYearValue.toLocaleString()}.`,
    data: { ...roi } as Record<string, unknown>,
  });
  cb.onFinding(findings[findings.length - 1]);
  await delay(300);

  // Step 4: Before/after comparison
  cb.onProgress(progress(missionId, 'insurance_optimization', 'running', 4, 6, 'Comparing before vs after metrics...'));
  const beforeAfter = calculateBeforeAfter();
  findings.push({
    missionId, category: 'before_after', severity: 'info',
    title: `Before vs After — ${beforeAfter.metrics.length} metrics tracked`,
    detail: beforeAfter.metrics.map(m => `${m.name}: ${m.before.toFixed(1)} → ${m.after.toFixed(1)} (${m.changePercent > 0 ? '+' : ''}${m.changePercent.toFixed(1)}%, $${Math.abs(m.dollarImpact).toLocaleString()} ${m.dollarImpact > 0 ? 'saved' : 'cost'})`).join('. '),
    data: { ...beforeAfter } as Record<string, unknown>,
  });
  cb.onFinding(findings[findings.length - 1]);
  await delay(300);

  // Step 5: Top-offender drivers
  cb.onProgress(progress(missionId, 'insurance_optimization', 'running', 5, 6, 'Identifying top offenders dragging the score down...'));
  const allRisks = calculateAllDriverRisks();
  const topOffenders = allRisks.slice(0, 3);
  for (const d of topOffenders) {
    findings.push({
      missionId, category: 'top_offender', severity: d.tier === 'critical' ? 'critical' : 'warning',
      title: `Score drag: ${d.driverName} — ${d.riskScore}/100 risk, $${d.annualizedCost.toLocaleString()}/yr`,
      detail: `Top events: ${d.topEventTypes.slice(0, 2).map(e => `${e.type.replace(/_/g, ' ')} (${e.count})`).join(', ')}. Coaching this driver alone could improve fleet score by 2-4 points.`,
      data: { driverId: d.driverId, driverName: d.driverName, riskScore: d.riskScore, annualizedCost: d.annualizedCost },
    });
    cb.onFinding(findings[findings.length - 1]);
  }
  await delay(200);

  // Step 6: Summary
  cb.onProgress(progress(missionId, 'insurance_optimization', 'summarizing', 6, 6, 'Writing optimization report...'));
  const summary = await generateSummary(missionId, 'insurance_optimization', findings);

  const quickWins = [
    ...componentEntries.filter(c => c.score < 70).map(c => `Improve ${c.name} from ${c.score} to 75+ — target specific drivers and behaviors`),
    ...topOffenders.map(d => `Coach ${d.driverName} on ${d.topEventTypes[0]?.type.replace(/_/g, ' ')} — potential $${Math.round(d.annualizedCost * 0.3).toLocaleString()}/yr savings`),
    `Present this report to insurance underwriter at next renewal for preferred rate consideration`,
  ];

  return {
    missionId, type: 'insurance_optimization', status: 'complete',
    displayName: 'Insurance Optimization', summary, findings,
    recommendations: quickWins, duration: 0,
    data: { overallScore: score.overallScore, grade: score.grade, totalSavings: roi.totalAnnualSavings, roiPercent: roi.roiPercent },
    completedAt: new Date().toISOString(),
  };
}

// ─── Pre-Shift Sweep ──────────────────────────────────────

async function runPreshiftSweep(
  missionId: string, _config: MissionConfig, cb: MissionCallbacks, isAborted: () => boolean,
): Promise<MissionResult> {
  const findings: MissionFinding[] = [];

  // Step 1: All pre-shift risks
  cb.onProgress(progress(missionId, 'preshift_sweep', 'running', 1, 5, 'Calculating pre-shift risk for all drivers...'));
  const allRisks = calculateAllPreShiftRisks();
  const critical = allRisks.filter(r => r.riskLevel === 'critical');
  const high = allRisks.filter(r => r.riskLevel === 'high');
  const elevated = allRisks.filter(r => r.riskLevel === 'elevated');

  findings.push({
    missionId, category: 'preshift_overview', severity: critical.length > 0 ? 'critical' : high.length > 0 ? 'warning' : 'info',
    title: `Pre-Shift Risk Overview — ${critical.length} critical, ${high.length} high, ${elevated.length} elevated`,
    detail: `${allRisks.length} drivers assessed. ${critical.length + high.length} need attention before starting their shift. ${allRisks.length - critical.length - high.length - elevated.length} cleared for standard operations.`,
    data: { totalDrivers: allRisks.length, critical: critical.length, high: high.length, elevated: elevated.length, cleared: allRisks.length - critical.length - high.length - elevated.length },
  });
  cb.onFinding(findings[findings.length - 1]);
  await delay(400);

  if (isAborted()) return makePartialResult(missionId, 'preshift_sweep', findings);

  // Step 2: Detail critical + high risk drivers
  cb.onProgress(progress(missionId, 'preshift_sweep', 'running', 2, 5, 'Building detailed risk profiles for flagged drivers...'));
  for (const driver of [...critical, ...high]) {
    const wellness = predictWellness(driver.driverId);
    findings.push({
      missionId, category: 'flagged_driver',
      severity: driver.riskLevel === 'critical' ? 'critical' : 'warning',
      title: `${driver.driverName} — ${driver.riskLevel.toUpperCase()} pre-shift risk (${driver.riskScore}/100)`,
      detail: `Risk factors: ${driver.factors.map(f => `${f.name} (impact: ${f.impact})`).join(', ')}. ` +
        (wellness ? `Wellness: ${wellness.overallWellnessScore}/100, rest: ${wellness.avgRestHours.toFixed(1)}hrs avg. ` : '') +
        `Action: ${driver.recommendation}`,
      data: {
        driverId: driver.driverId, driverName: driver.driverName,
        riskScore: driver.riskScore, riskLevel: driver.riskLevel,
        factors: driver.factors, recommendation: driver.recommendation,
        wellness: wellness ? { score: wellness.overallWellnessScore, rest: wellness.avgRestHours } : null,
      },
    });
    cb.onFinding(findings[findings.length - 1]);
  }
  await delay(350);

  // Step 3: Fleet forecast
  cb.onProgress(progress(missionId, 'preshift_sweep', 'running', 3, 5, 'Generating fleet risk forecast for the week...'));
  const forecast = getFleetRiskForecast();
  findings.push({
    missionId, category: 'fleet_forecast', severity: forecast.highRiskDrivers > 3 ? 'warning' : 'info',
    title: `Weekly Forecast — ${forecast.predictedEventsThisWeek} predicted events`,
    detail: `High-risk drivers this week: ${forecast.highRiskDrivers}. Top risk factors: ${forecast.topRiskFactors.join(', ')}. Recommendations: ${forecast.recommendations.join('. ')}`,
    data: forecast,
  });
  cb.onFinding(findings[findings.length - 1]);
  await delay(300);

  // Step 4: Alert briefing
  cb.onProgress(progress(missionId, 'preshift_sweep', 'running', 4, 5, 'Pulling morning alert briefing...'));
  const briefing = getDailyBriefing();
  findings.push({
    missionId, category: 'daily_briefing', severity: briefing.criticalCount > 0 ? 'critical' : 'info',
    title: `Morning Briefing — ${briefing.criticalCount} critical, ${briefing.highCount} high priority alerts`,
    detail: briefing.fleetRiskSummary,
    data: { criticalCount: briefing.criticalCount, highCount: briefing.highCount, topAlerts: briefing.topAlerts.slice(0, 3) },
  });
  cb.onFinding(findings[findings.length - 1]);
  await delay(200);

  // Step 5: Summary
  cb.onProgress(progress(missionId, 'preshift_sweep', 'summarizing', 5, 5, 'Writing morning action plan...'));
  const summary = await generateSummary(missionId, 'preshift_sweep', findings);

  const morningActions = [
    ...critical.map(d => `BLOCK: Do not dispatch ${d.driverName} without supervisor clearance (risk: ${d.riskScore}/100)`),
    ...high.map(d => `REVIEW: Talk to ${d.driverName} before shift — ${d.recommendation}`),
    ...elevated.map(d => `MONITOR: Watch ${d.driverName} via live map — risk: ${d.riskScore}/100`),
    `FLEET: ${forecast.predictedEventsThisWeek} events predicted this week — focus on ${forecast.topRiskFactors[0] || 'general safety'}`,
  ];

  return {
    missionId, type: 'preshift_sweep', status: 'complete',
    displayName: 'Pre-Shift Sweep', summary, findings,
    recommendations: morningActions, duration: 0,
    data: {
      totalDrivers: allRisks.length, criticalCount: critical.length,
      highCount: high.length, predictedEventsThisWeek: forecast.predictedEventsThisWeek,
    },
    completedAt: new Date().toISOString(),
  };
}

// ─── Helpers ──────────────────────────────────────────────

function progress(missionId: string, type: MissionType, phase: 'running' | 'summarizing', step: number, totalSteps: number, message: string): MissionProgress {
  return { missionId, type, phase, step, totalSteps, message };
}

function makePartialResult(missionId: string, type: MissionType, findings: MissionFinding[]): MissionResult {
  return {
    missionId, type, status: 'complete', displayName: MISSION_META[type].displayName,
    summary: 'Partial results — mission was interrupted before completion.',
    findings, recommendations: [], duration: 0, data: { partial: true },
    completedAt: new Date().toISOString(),
  };
}

function failResult(missionId: string, type: MissionType, message: string): MissionResult {
  return {
    missionId, type, status: 'failed', displayName: MISSION_META[type].displayName,
    summary: message, findings: [], recommendations: [], duration: 0, data: {},
    completedAt: new Date().toISOString(), error: message,
  };
}

async function generateSummary(missionId: string, type: MissionType, findings: MissionFinding[], extraData?: unknown): Promise<string> {
  const meta = MISSION_META[type];
  const findingsSummary = findings.map(f => `[${f.severity.toUpperCase()}] ${f.title}: ${f.detail}`).join('\n');

  try {
    const result = await generateText({
      model: anthropic('claude-opus-4-6-20250918'),
      system: `You are a senior fleet safety analyst writing an executive summary. Be specific — name drivers, cite exact numbers, state dollar amounts. Write 3-5 sentences suitable for text-to-speech (a fleet manager listening on the go). Use natural number phrasing ("five drivers", "seventy-two thousand dollars"). End with the single most important action to take right now.`,
      prompt: `Mission: ${meta.displayName}\n\nFindings:\n${findingsSummary}\n\nWrite the executive summary:`,
      maxTokens: 350,
    });
    return result.text;
  } catch {
    const criticalCount = findings.filter(f => f.severity === 'critical').length;
    const warningCount = findings.filter(f => f.severity === 'warning').length;
    return `${meta.displayName} complete. Analyzed ${findings.length} data points: ${criticalCount} critical issues, ${warningCount} warnings require attention. Review the detailed findings below for specific driver names, dollar impacts, and recommended actions.`;
  }
}
