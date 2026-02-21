'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ---------- Types ---------- */

interface MissionFinding {
  missionId: string;
  category: string;
  title: string;
  detail: string;
  severity: 'info' | 'warning' | 'critical';
  data?: Record<string, unknown>;
}

interface MissionProgress {
  missionId: string;
  type: string;
  phase: string;
  step: number;
  totalSteps: number;
  message: string;
}

interface MissionResult {
  missionId: string;
  type: string;
  status: 'complete' | 'failed' | 'cancelled';
  displayName: string;
  summary: string;
  findings: MissionFinding[];
  recommendations: string[];
  duration: number;
  data: Record<string, unknown>;
}

export interface MissionTrackerState {
  missionId: string;
  type: string;
  displayName: string;
  status: 'running' | 'complete' | 'failed' | 'cancelled';
  progress?: MissionProgress;
  findings: MissionFinding[];
  result?: MissionResult;
}

/* ---------- Helpers ---------- */

function groupFindingsByCategory(findings: MissionFinding[]): Map<string, MissionFinding[]> {
  const groups = new Map<string, MissionFinding[]>();
  for (const f of findings) {
    const arr = groups.get(f.category) || [];
    arr.push(f);
    groups.set(f.category, arr);
  }
  return groups;
}

function categoryLabel(cat: string): string {
  const labels: Record<string, string> = {
    fleet_overview: 'Fleet Overview',
    fleet_wellness_overview: 'Fleet Wellness Overview',
    driver_coaching_plan: 'Driver Coaching Plans',
    trend_alert: 'Trend Alerts',
    burnout_critical: 'Critical Burnout Risk',
    burnout_moderate: 'Moderate Burnout Risk',
    risk_profile: 'Risk Profile',
    event_patterns: 'Event Pattern Analysis',
    wellness_correlation: 'Wellness & Fatigue',
    preshift_assessment: 'Pre-Shift Assessment',
    root_cause: 'Root Cause Analysis',
    score_overview: 'Insurance Score',
    component_analysis: 'Score Components',
    roi_analysis: 'ROI Analysis',
    before_after: 'Before vs After',
    top_offender: 'Top Offenders',
    preshift_overview: 'Pre-Shift Overview',
    flagged_driver: 'Flagged Drivers',
    fleet_forecast: 'Weekly Forecast',
    daily_briefing: 'Morning Briefing',
    error: 'Errors',
  };
  return labels[cat] || cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function categoryIcon(cat: string): string {
  const icons: Record<string, string> = {
    fleet_overview: '\u{1F4CA}', fleet_wellness_overview: '\u{1F9E0}',
    driver_coaching_plan: '\u{1F3AF}', trend_alert: '\u{1F4C9}',
    burnout_critical: '\u{1F6A8}', burnout_moderate: '\u{26A0}',
    risk_profile: '\u{1F6E1}', event_patterns: '\u{1F50D}',
    wellness_correlation: '\u{1F4A4}', preshift_assessment: '\u{2600}',
    root_cause: '\u{1F9EA}', score_overview: '\u{1F4B0}',
    component_analysis: '\u{1F9F1}', roi_analysis: '\u{1F4B5}',
    before_after: '\u{1F504}', top_offender: '\u{26D4}',
    preshift_overview: '\u{2600}', flagged_driver: '\u{1F6A9}',
    fleet_forecast: '\u{1F324}', daily_briefing: '\u{1F4CB}',
  };
  return icons[cat] || '\u{1F4CC}';
}

/* ---------- Sub-components ---------- */

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className={`rounded-xl px-3 py-2.5 ${accent === 'red' ? 'bg-red-500/10 border border-red-500/15' : accent === 'amber' ? 'bg-amber-500/10 border border-amber-500/15' : accent === 'emerald' ? 'bg-emerald-500/10 border border-emerald-500/15' : 'bg-white/[0.05] border border-white/10'}`}>
      <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">{label}</div>
      <div className={`text-lg font-bold mt-0.5 ${accent === 'red' ? 'text-red-400' : accent === 'amber' ? 'text-amber-400' : accent === 'emerald' ? 'text-emerald-400' : 'text-white'}`}>{value}</div>
      {sub && <div className="text-[10px] text-white/40 mt-0.5">{sub}</div>}
    </div>
  );
}

function ExpandableFinding({ finding, defaultOpen }: { finding: MissionFinding; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen || false);
  const data = finding.data;

  return (
    <div className={`rounded-xl overflow-hidden ${
      finding.severity === 'critical' ? 'bg-red-500/8 border border-red-500/15' :
      finding.severity === 'warning' ? 'bg-amber-500/8 border border-amber-500/15' :
      'bg-white/[0.04] border border-white/8'
    }`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-start gap-2.5 text-left hover:bg-white/[0.03] transition-colors"
      >
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
          finding.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
          finding.severity === 'warning' ? 'bg-amber-500/20 text-amber-400' :
          'bg-emerald-500/20 text-emerald-400'
        }`}>
          {finding.severity === 'critical' ? 'CRIT' : finding.severity === 'warning' ? 'WARN' : 'INFO'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-white leading-snug">{finding.title}</div>
          {!open && <div className="text-xs text-white/40 mt-0.5 line-clamp-2">{finding.detail}</div>}
        </div>
        <svg className={`w-4 h-4 text-white/30 shrink-0 mt-1 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 animate-[fadeIn_0.2s_ease-out]">
          {/* Full detail text */}
          <p className="text-xs text-white/60 leading-relaxed">{finding.detail}</p>

          {/* Coaching actions + timeline */}
          {data?.coachingActions && Array.isArray(data.coachingActions) ? (
            <div>
              <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">Action Items</div>
              <div className="space-y-1.5">
                {(data.coachingActions as string[]).map((action: string, i: number) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className="text-amber-400 font-bold shrink-0">{i + 1}.</span>
                    <span className="text-white/70">{action}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {data?.timeline && Array.isArray(data.timeline) ? (
            <div>
              <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">Timeline</div>
              <div className="space-y-1 border-l-2 border-white/10 pl-3">
                {(data.timeline as string[]).map((step: string, i: number) => (
                  <div key={i} className="text-xs text-white/60 relative">
                    <div className="absolute -left-[15px] top-[5px] w-2 h-2 rounded-full bg-amber-400/60" />
                    {step}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Interventions (wellness) */}
          {data?.interventions && Array.isArray(data.interventions) ? (
            <div>
              <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">Required Interventions</div>
              <div className="space-y-1.5">
                {(data.interventions as string[]).map((item: string, i: number) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className="text-red-400 shrink-0">{'\u25B8'}</span>
                    <span className="text-white/70">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Root causes */}
          {data?.rootCauses && Array.isArray(data.rootCauses) ? (
            <div>
              <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">Root Causes</div>
              <div className="space-y-1.5">
                {(data.rootCauses as string[]).map((cause: string, i: number) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className="text-amber-400 shrink-0">{'\u25CF'}</span>
                    <span className="text-white/70">{cause}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Key metrics row */}
          {data ? renderDataMetrics(data, finding.category) : null}

          {/* Expected improvement + savings */}
          {(data?.expectedImprovement || data?.estimatedSavings) ? (
            <div className="flex gap-3 mt-1">
              {data.expectedImprovement ? (
                <div className="flex-1 rounded-lg bg-emerald-500/10 px-3 py-2">
                  <div className="text-[10px] text-emerald-400/60 uppercase font-semibold">Expected Improvement</div>
                  <div className="text-xs text-emerald-300 font-medium mt-0.5">{String(data.expectedImprovement)}</div>
                </div>
              ) : null}
              {data.estimatedSavings ? (
                <div className="flex-1 rounded-lg bg-emerald-500/10 px-3 py-2">
                  <div className="text-[10px] text-emerald-400/60 uppercase font-semibold">Potential Savings</div>
                  <div className="text-xs text-emerald-300 font-medium mt-0.5">{String(data.estimatedSavings)}</div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Urgency */}
          {data?.urgency ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 text-[10px] font-bold">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              Action needed: {String(data.urgency)}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function renderDataMetrics(data: Record<string, unknown>, category: string): React.ReactElement | null {
  const metrics: Array<{ label: string; value: string; accent?: string }> = [];

  if (category === 'driver_coaching_plan' || category === 'risk_profile') {
    if (data.riskScore != null) metrics.push({ label: 'Risk Score', value: `${data.riskScore}/100`, accent: Number(data.riskScore) > 70 ? 'red' : Number(data.riskScore) > 40 ? 'amber' : 'emerald' });
    if (data.wellnessScore != null) metrics.push({ label: 'Wellness', value: `${data.wellnessScore}/100`, accent: Number(data.wellnessScore) < 50 ? 'red' : Number(data.wellnessScore) < 70 ? 'amber' : 'emerald' });
    if (data.recentEvents != null) metrics.push({ label: '30-Day Events', value: String(data.recentEvents) });
    if (data.annualizedCost != null) metrics.push({ label: 'Annual Cost', value: `$${Number(data.annualizedCost).toLocaleString()}`, accent: 'red' });
  }
  if (category === 'burnout_critical' || category === 'burnout_moderate') {
    if (data.wellnessScore != null) metrics.push({ label: 'Wellness', value: `${data.wellnessScore}/100`, accent: 'red' });
    if (data.burnoutProbability != null) metrics.push({ label: 'Burnout %', value: `${(Number(data.burnoutProbability) * 100).toFixed(0)}%`, accent: 'red' });
    if (data.avgRestHours != null) metrics.push({ label: 'Avg Rest', value: `${Number(data.avgRestHours).toFixed(1)}hrs` });
    if (data.retentionCost != null) metrics.push({ label: 'Retention Cost', value: `$${Number(data.retentionCost).toLocaleString()}`, accent: 'amber' });
  }
  if (category === 'event_patterns') {
    const peakHour = data.peakHour as { label?: string; count?: number } | null;
    if (peakHour?.label) metrics.push({ label: 'Peak Time', value: `${peakHour.label} (${peakHour.count} events)` });
  }
  if (category === 'score_overview') {
    if (data.overallScore != null) metrics.push({ label: 'Score', value: `${data.overallScore}/100`, accent: Number(data.overallScore) < 60 ? 'red' : Number(data.overallScore) < 75 ? 'amber' : 'emerald' });
    if (data.grade) metrics.push({ label: 'Grade', value: String(data.grade) });
    if (data.percentile != null) metrics.push({ label: 'Percentile', value: `${data.percentile}th` });
  }

  if (metrics.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
      {metrics.map((m, i) => (
        <div key={i} className={`rounded-lg px-2.5 py-1.5 ${
          m.accent === 'red' ? 'bg-red-500/8' : m.accent === 'amber' ? 'bg-amber-500/8' : m.accent === 'emerald' ? 'bg-emerald-500/8' : 'bg-white/[0.04]'
        }`}>
          <div className="text-[9px] text-white/35 uppercase font-semibold">{m.label}</div>
          <div className={`text-sm font-bold ${
            m.accent === 'red' ? 'text-red-400' : m.accent === 'amber' ? 'text-amber-400' : m.accent === 'emerald' ? 'text-emerald-300' : 'text-white/90'
          }`}>{m.value}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Main Component ---------- */

export default function MissionTracker({ state }: { state: MissionTrackerState }) {
  const isRunning = state.status === 'running';
  const isComplete = state.status === 'complete';
  const isFailed = state.status === 'failed' || state.status === 'cancelled';

  const grouped = isComplete && state.result ? groupFindingsByCategory(state.result.findings) : null;

  // Extract top-level stats from result data
  const resultData = state.result?.data;
  const topStats = isComplete && resultData ? extractTopStats(state.type, resultData) : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
      className="w-full my-3"
    >
      <div className={`rounded-2xl overflow-hidden shadow-lg ${
        isComplete ? 'bg-gradient-to-br from-[#0B1F15] via-[#122B1E] to-[#1A3A28]' :
        isFailed ? 'bg-gradient-to-br from-[#2A1215] to-[#3A1A1E]' :
        'bg-gradient-to-br from-[#18202F] to-[#2D3748]'
      }`}>
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
            isComplete ? 'bg-emerald-500/20' :
            isFailed ? 'bg-red-500/20' :
            'bg-amber-500/20'
          }`}>
            {isRunning && (
              <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            )}
            {isComplete && (
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {isFailed && (
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
              Autonomous Agent Report
            </div>
            <div className="text-base font-bold text-white truncate">
              {state.displayName}
            </div>
          </div>
          {isRunning && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs text-amber-400 font-medium">Running</span>
            </div>
          )}
          {isComplete && state.result && (
            <div className="text-right">
              <div className="text-xs text-emerald-400 font-semibold">{state.result.duration.toFixed(1)}s</div>
              <div className="text-[10px] text-white/30">{state.result.findings.length} findings</div>
            </div>
          )}
        </div>

        {/* Progress Bar (running) */}
        {isRunning && state.progress && (
          <div className="px-5 pb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-white/60">{state.progress.message}</span>
              <span className="text-xs text-white/40 font-mono">
                {state.progress.step}/{state.progress.totalSteps}
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${Math.max(5, (state.progress.step / state.progress.totalSteps) * 100)}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        {/* Live findings (show last 4 during running) */}
        {isRunning && state.findings.length > 0 && (
          <div className="px-5 pb-3 space-y-1.5 max-h-48 overflow-y-auto">
            <AnimatePresence>
              {state.findings.slice(-4).map((f, i) => (
                <motion.div
                  key={`${f.title}-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`px-3 py-2 rounded-lg text-xs ${
                    f.severity === 'critical' ? 'bg-red-500/10 text-red-300' :
                    f.severity === 'warning' ? 'bg-amber-500/10 text-amber-300' :
                    'bg-white/[0.05] text-white/60'
                  }`}
                >
                  <div className="font-semibold">{f.title}</div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* ─── Complete State ─── */}
        {isComplete && state.result && (
          <div className="px-5 pb-5 space-y-5">
            {/* Executive Summary */}
            <div className="rounded-xl bg-white/[0.06] border border-white/10 px-4 py-3.5">
              <div className="text-[10px] font-semibold text-emerald-400/60 uppercase tracking-wider mb-1.5">Executive Summary</div>
              <p className="text-sm text-white/85 leading-relaxed">{state.result.summary}</p>
            </div>

            {/* Top-level stat cards */}
            {topStats.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {topStats.map((s, i) => (
                  <StatCard key={i} label={s.label} value={s.value} sub={s.sub} accent={s.accent} />
                ))}
              </div>
            )}

            {/* Grouped Findings */}
            {grouped && Array.from(grouped.entries()).map(([category, catFindings], gi) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: gi * 0.06 }}
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-base">{categoryIcon(category)}</span>
                  <span className="text-xs font-bold text-white/60 uppercase tracking-wider">{categoryLabel(category)}</span>
                  <span className="text-[10px] text-white/30 font-medium">{catFindings.length}</span>
                </div>
                <div className="space-y-2">
                  {catFindings.map((f, fi) => (
                    <ExpandableFinding
                      key={fi}
                      finding={f}
                      defaultOpen={
                        // Auto-expand first finding in each critical category or small categories
                        (fi === 0 && (f.severity === 'critical' || catFindings.length <= 2)) ||
                        category === 'root_cause' || category === 'fleet_overview' || category === 'fleet_wellness_overview' ||
                        category === 'score_overview' || category === 'roi_analysis' || category === 'before_after'
                      }
                    />
                  ))}
                </div>
              </motion.div>
            ))}

            {/* Action Plan / Recommendations */}
            {state.result.recommendations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-base">{'\u{1F4CB}'}</span>
                  <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Action Plan</span>
                </div>
                <div className="rounded-xl bg-white/[0.04] border border-white/8 divide-y divide-white/5">
                  {state.result.recommendations.map((rec, i) => {
                    const isBlock = rec.startsWith('BLOCK:');
                    const isUrgent = rec.startsWith('URGENT:') || rec.startsWith('IMMEDIATE:');
                    const isReview = rec.startsWith('REVIEW:');
                    const isMonitor = rec.startsWith('MONITOR:');

                    return (
                      <div key={i} className="px-4 py-2.5 flex items-start gap-2.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                          isBlock ? 'bg-red-500/20 text-red-400' :
                          isUrgent ? 'bg-amber-500/20 text-amber-400' :
                          isReview ? 'bg-blue-500/20 text-blue-400' :
                          isMonitor ? 'bg-cyan-500/20 text-cyan-400' :
                          'bg-white/10 text-white/50'
                        }`}>
                          {isBlock ? 'BLOCK' : isUrgent ? 'URGENT' : isReview ? 'REVIEW' : isMonitor ? 'WATCH' : `${i + 1}`}
                        </span>
                        <span className="text-xs text-white/70 leading-relaxed">
                          {isBlock || isUrgent || isReview || isMonitor
                            ? rec.substring(rec.indexOf(':') + 2)
                            : rec}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Failed state */}
        {isFailed && state.result && (
          <div className="px-5 pb-5">
            <p className="text-sm text-red-300/80">{state.result.summary}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ---------- Top Stats Extractor ---------- */

function extractTopStats(type: string, data: Record<string, unknown>): Array<{ label: string; value: string; sub?: string; accent?: string }> {
  const stats: Array<{ label: string; value: string; sub?: string; accent?: string }> = [];

  if (type === 'coaching_sweep') {
    if (data.driversAnalyzed != null) stats.push({ label: 'Drivers Analyzed', value: `${data.driversAnalyzed}`, sub: `of ${data.totalFleetDrivers} total` });
    if (data.totalAnnualCostAtRisk != null) stats.push({ label: 'Annual Cost at Risk', value: `$${Number(data.totalAnnualCostAtRisk).toLocaleString()}`, accent: 'red' });
    if (data.potentialSavings != null) stats.push({ label: 'Potential Savings', value: `$${Number(data.potentialSavings).toLocaleString()}/yr`, accent: 'emerald' });
    const plans = data.driverPlans as unknown[];
    if (plans) stats.push({ label: 'Coaching Plans', value: `${plans.length}`, sub: 'ready to implement' });
  }
  if (type === 'wellness_check') {
    if (data.totalDrivers != null) stats.push({ label: 'Drivers Scanned', value: `${data.totalDrivers}` });
    if (data.highBurnoutRisk != null) stats.push({ label: 'Critical Burnout', value: `${data.highBurnoutRisk}`, accent: 'red' });
    if (data.moderateBurnoutRisk != null) stats.push({ label: 'Moderate Risk', value: `${data.moderateBurnoutRisk}`, accent: 'amber' });
    if (data.totalRetentionCost != null) stats.push({ label: 'Retention at Risk', value: `$${Number(data.totalRetentionCost).toLocaleString()}`, accent: 'red' });
  }
  if (type === 'safety_investigation') {
    if (data.riskScore != null) stats.push({ label: 'Risk Score', value: `${data.riskScore}/100`, accent: Number(data.riskScore) > 70 ? 'red' : 'amber' });
    if (data.driverName) stats.push({ label: 'Subject', value: String(data.driverName) });
    const rootCauses = data.rootCauses as string[];
    if (rootCauses) stats.push({ label: 'Root Causes', value: `${rootCauses.length}`, accent: 'amber' });
  }
  if (type === 'insurance_optimization') {
    if (data.overallScore != null) stats.push({ label: 'Insurance Score', value: `${data.overallScore}/100`, accent: Number(data.overallScore) < 60 ? 'red' : Number(data.overallScore) < 75 ? 'amber' : 'emerald' });
    if (data.grade) stats.push({ label: 'Grade', value: String(data.grade), accent: 'emerald' });
    if (data.totalSavings != null) stats.push({ label: 'Total Savings', value: `$${Number(data.totalSavings).toLocaleString()}/yr`, accent: 'emerald' });
    if (data.roiPercent != null) stats.push({ label: 'ROI', value: `${Number(data.roiPercent).toFixed(0)}%`, accent: 'emerald' });
  }
  if (type === 'preshift_sweep') {
    if (data.totalDrivers != null) stats.push({ label: 'Drivers Assessed', value: `${data.totalDrivers}` });
    if (data.criticalCount != null) stats.push({ label: 'Critical', value: `${data.criticalCount}`, accent: Number(data.criticalCount) > 0 ? 'red' : 'emerald' });
    if (data.highCount != null) stats.push({ label: 'High Risk', value: `${data.highCount}`, accent: Number(data.highCount) > 0 ? 'amber' : 'emerald' });
    if (data.predictedEventsThisWeek != null) stats.push({ label: 'Predicted Events', value: `${data.predictedEventsThisWeek}`, sub: 'this week', accent: 'amber' });
  }

  return stats;
}
