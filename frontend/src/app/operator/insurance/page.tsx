'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import PageHeader from '@/components/layout/PageHeader';
import type { InsuranceScore, WhatIfScenario, WhatIfResult } from '@/types/fleet';
import {
  Shield, TrendingUp, TrendingDown, Minus, DollarSign, Award,
  Loader2, ChevronRight, ArrowRight, BarChart3, Target,
  Sliders, CheckCircle2, AlertTriangle, XCircle, Users, Wrench,
} from 'lucide-react';
import clsx from 'clsx';
import { InsightTooltip } from '@/components/ui/InsightTooltip';
import { MethodologyPanel } from '@/components/ui/MethodologyPanel';

function AnimatedNumber({ value, duration = 1500 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    const start = ref.current;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (value - start) * eased);
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(tick);
      else ref.current = value;
    };
    requestAnimationFrame(tick);
  }, [value, duration]);

  return <>{display}</>;
}

function ScoreGauge({ score, grade }: { score: number; grade: string }) {
  const circumference = 2 * Math.PI * 90;
  const fillPercent = score / 100;
  const dashOffset = circumference * (1 - fillPercent * 0.75);

  const gradeColor = grade.startsWith('A') ? 'text-emerald-400' :
    grade.startsWith('B') ? 'text-[#FBAF1A]' :
    grade.startsWith('C') ? 'text-amber-500' : 'text-red-500';

  const strokeColor = grade.startsWith('A') ? '#34D399' :
    grade.startsWith('B') ? '#FBAF1A' :
    grade.startsWith('C') ? '#F59E0B' : '#EF4444';

  return (
    <div className="relative w-44 h-44 mx-auto">
      <svg viewBox="0 0 200 200" className="w-full h-full -rotate-[135deg]">
        <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14" strokeLinecap="round"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`} />
        <motion.circle
          cx="100" cy="100" r="90" fill="none" stroke={strokeColor} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          initial={{ strokeDashoffset: circumference * 0.75 }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-5xl font-extrabold text-white font-mono-kpi">
          <AnimatedNumber value={score} duration={2000} />
        </div>
        <div className={clsx('text-2xl font-extrabold mt-0.5', gradeColor)}>{grade}</div>
      </div>
    </div>
  );
}

const GRADE_SCALE = [
  { grade: 'F', min: 0, color: '#EF4444' },
  { grade: 'D', min: 50, color: '#F97316' },
  { grade: 'C', min: 60, color: '#F59E0B' },
  { grade: 'C+', min: 70, color: '#EAB308' },
  { grade: 'B', min: 75, color: '#FBAF1A' },
  { grade: 'B+', min: 85, color: '#84CC16' },
  { grade: 'A', min: 90, color: '#34D399' },
  { grade: 'A+', min: 95, color: '#10B981' },
];

function GradeScaleBar({ score }: { score: number }) {
  const position = Math.min(100, Math.max(0, score));
  return (
    <div>
      <div className="relative h-3 rounded-full overflow-hidden flex">
        {GRADE_SCALE.map((g, i) => {
          const next = GRADE_SCALE[i + 1]?.min ?? 100;
          const width = next - g.min;
          return <div key={g.grade} className="h-full" style={{ width: `${width}%`, backgroundColor: g.color, opacity: 0.7 }} />;
        })}
        {/* Score marker */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-gray-900 shadow-lg"
          initial={{ left: '0%' }}
          animate={{ left: `${position}%` }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{ marginLeft: '-7px' }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        {GRADE_SCALE.map((g) => (
          <span key={g.grade} className="text-[9px] font-bold" style={{ color: g.color, opacity: score >= g.min && score < (GRADE_SCALE[GRADE_SCALE.indexOf(g) + 1]?.min ?? 101) ? 1 : 0.4 }}>
            {g.grade}
          </span>
        ))}
      </div>
    </div>
  );
}

type StatusLevel = 'good' | 'warning' | 'critical';

interface DetailMetric {
  label: string;
  value: string;
  status: StatusLevel;
  context: string;
}

const statusConfig: Record<StatusLevel, { dot: string; text: string; bg: string; border: string }> = {
  good: { dot: 'bg-emerald-400', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  warning: { dot: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  critical: { dot: 'bg-red-400', text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
};

function getComponentDetails(key: string, details: Record<string, number | string>): DetailMetric[] {
  switch (key) {
    case 'safeDriving': {
      const eventRate = Number(details.eventRate) || 0;
      const totalEvents = Number(details.totalEvents) || 0;
      const severity = Number(details.severityScore) || 0;
      const trend = Number(details.trendDelta) || 0;
      return [
        {
          label: 'Incident Rate',
          value: `${eventRate} per 1,000 mi`,
          status: eventRate < 5 ? 'good' : eventRate < 15 ? 'warning' : 'critical',
          context: eventRate < 5 ? 'Well below industry avg of 12' : eventRate < 15 ? 'Near industry average of 12' : 'Above industry avg - review driving patterns',
        },
        {
          label: 'Events (30 days)',
          value: `${totalEvents} events`,
          status: totalEvents < 30 ? 'good' : totalEvents < 60 ? 'warning' : 'critical',
          context: totalEvents < 30 ? 'Low event volume' : totalEvents < 60 ? 'Moderate - monitor trends' : 'High volume - investigate root causes',
        },
        {
          label: 'Severity Mix',
          value: severity >= 70 ? 'Mostly minor' : severity >= 40 ? 'Some serious' : 'Many severe',
          status: severity >= 70 ? 'good' : severity >= 40 ? 'warning' : 'critical',
          context: `Severity score: ${severity}/100`,
        },
        {
          label: '30-Day Trend',
          value: trend < 0 ? `${Math.abs(trend)} fewer events` : trend > 0 ? `${trend} more events` : 'No change',
          status: trend <= -3 ? 'good' : trend <= 2 ? 'warning' : 'critical',
          context: trend < 0 ? 'Improving vs. prior 30 days' : trend > 0 ? 'Worsening vs. prior 30 days' : 'Stable vs. prior 30 days',
        },
      ];
    }
    case 'compliance': {
      const seatbelt = Number(details.seatbeltViolations) || 0;
      const speeding = Number(details.speedingEvents) || 0;
      const hos = Number(details.hosViolations) || 0;
      const hours = Number(details.avgDailyHours) || 0;
      return [
        {
          label: 'Seatbelt Violations',
          value: `${seatbelt} in 30 days`,
          status: seatbelt === 0 ? 'good' : seatbelt <= 5 ? 'warning' : 'critical',
          context: seatbelt === 0 ? 'Full compliance' : seatbelt <= 5 ? 'Schedule refresher training' : 'Enforce mandatory seatbelt policy',
        },
        {
          label: 'Speeding Events',
          value: `${speeding} in 30 days`,
          status: speeding <= 5 ? 'good' : speeding <= 15 ? 'warning' : 'critical',
          context: speeding <= 5 ? 'Within acceptable range' : speeding <= 15 ? 'Consider speed governor policy' : 'Implement speed limiters immediately',
        },
        {
          label: 'HOS Violations',
          value: `${hos} violations`,
          status: hos === 0 ? 'good' : hos <= 3 ? 'warning' : 'critical',
          context: hos === 0 ? 'No hours-of-service violations' : hos <= 3 ? 'Review driver scheduling' : 'Scheduling overhaul needed - DOT risk',
        },
        {
          label: 'Avg Driving Hours/Day',
          value: `${hours.toFixed(1)} hrs`,
          status: hours < 9 ? 'good' : hours < 11 ? 'warning' : 'critical',
          context: hours < 9 ? 'Healthy workload' : hours < 11 ? 'Approaching HOS limit (11 hrs)' : 'Exceeding safe driving limits',
        },
      ];
    }
    case 'maintenance': {
      const age = Number(details.avgVehicleAge) || 0;
      const odometer = Number(details.avgOdometer) || 0;
      const activeFaults = Number(details.activeFaults) || 0;
      const faultsPerVeh = Number(details.faultsPerVehicle) || 0;
      const fleetSize = Number(details.fleetSize) || 0;
      return [
        {
          label: 'Fleet Age',
          value: `${age.toFixed(1)} yr avg across ${fleetSize} vehicles`,
          status: age < 3 ? 'good' : age < 5 ? 'warning' : 'critical',
          context: age < 3 ? 'Modern fleet - lower breakdown risk' : age < 5 ? 'Consider renewal for oldest units' : 'Aging fleet - plan replacements',
        },
        {
          label: 'Active Fault Codes',
          value: `${activeFaults} unresolved`,
          status: activeFaults <= 2 ? 'good' : activeFaults <= 5 ? 'warning' : 'critical',
          context: activeFaults <= 2 ? 'Fleet well maintained' : activeFaults <= 5 ? 'Schedule repairs this week' : 'Urgent - multiple vehicles at risk',
        },
        {
          label: 'Faults per Vehicle',
          value: faultsPerVeh.toFixed(1),
          status: faultsPerVeh < 2 ? 'good' : faultsPerVeh < 5 ? 'warning' : 'critical',
          context: faultsPerVeh < 2 ? 'Low fault rate' : faultsPerVeh < 5 ? 'Increase PM frequency' : 'Systemic maintenance issues',
        },
        {
          label: 'Avg Mileage',
          value: `${Math.round(odometer).toLocaleString()} km`,
          status: odometer < 200000 ? 'good' : odometer < 400000 ? 'warning' : 'critical',
          context: odometer < 200000 ? 'Low mileage fleet' : odometer < 400000 ? 'Monitor wear components' : 'High mileage - increased breakdown risk',
        },
      ];
    }
    case 'driverQuality': {
      const tenure = Number(details.avgTenure) || 0;
      const lowRisk = details.lowRiskPercent as string || '0%';
      const highRisk = details.highRiskPercent as string || '0%';
      const totalDrivers = Number(details.totalDrivers) || 0;
      const lowPct = parseInt(lowRisk);
      const highPct = parseInt(highRisk);
      return [
        {
          label: 'Avg Driver Tenure',
          value: `${tenure.toFixed(1)} years`,
          status: tenure >= 5 ? 'good' : tenure >= 2 ? 'warning' : 'critical',
          context: tenure >= 5 ? 'Experienced workforce - lower risk' : tenure >= 2 ? 'Mix of experience levels' : 'High turnover - invest in retention',
        },
        {
          label: 'Low-Risk Drivers',
          value: `${lowRisk} of ${totalDrivers} drivers`,
          status: lowPct >= 60 ? 'good' : lowPct >= 40 ? 'warning' : 'critical',
          context: lowPct >= 60 ? 'Majority of drivers are safe' : lowPct >= 40 ? 'Room to improve with coaching' : 'Fleet-wide training needed',
        },
        {
          label: 'High/Critical Risk',
          value: `${highRisk} of ${totalDrivers} drivers`,
          status: highPct <= 10 ? 'good' : highPct <= 20 ? 'warning' : 'critical',
          context: highPct <= 10 ? 'Very few problem drivers' : highPct <= 20 ? 'Target coaching for these drivers' : 'Intervention plans needed urgently',
        },
        {
          label: 'Team Size',
          value: `${totalDrivers} drivers`,
          status: 'good',
          context: 'Active fleet drivers',
        },
      ];
    }
    default:
      return [];
  }
}

const componentConfig: Record<string, { icon: typeof Shield; color: string; bg: string; label: string; description: string; tooltipKey?: string }> = {
  safeDriving: { icon: Shield, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Safe Driving', description: 'Incident frequency, severity & trends', tooltipKey: 'insurance.harshBraking' },
  compliance: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Compliance', description: 'Seatbelt, speeding & HOS adherence', tooltipKey: 'insurance.seatbelt' },
  maintenance: { icon: Wrench, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Maintenance', description: 'Vehicle condition, faults & fleet age', tooltipKey: 'insurance.idleTime' },
  driverQuality: { icon: Users, color: 'text-purple-500', bg: 'bg-purple-50', label: 'Driver Quality', description: 'Tenure, risk distribution & team profile', tooltipKey: 'insurance.speeding' },
};

interface SliderParam {
  key: string;
  label: string;
  icon: string;
  max: number;
  step: number;
  unit: string;
}

const SLIDER_PARAMS: SliderParam[] = [
  { key: 'harshBrakingReduction', label: 'Harsh Braking Reduction', icon: '🛑', max: 50, step: 5, unit: '%' },
  { key: 'speedingReduction', label: 'Speeding Reduction', icon: '⚡', max: 50, step: 5, unit: '%' },
  { key: 'idlingReduction', label: 'Excessive Idling Reduction', icon: '🔧', max: 60, step: 5, unit: '%' },
  { key: 'nightDrivingReduction', label: 'Night Driving Reduction', icon: '🌙', max: 60, step: 5, unit: '%' },
  { key: 'complianceImprovement', label: 'Compliance Training', icon: '📋', max: 30, step: 5, unit: '%' },
  { key: 'maintenanceScoreBoost', label: 'Maintenance Program', icon: '🔩', max: 25, step: 5, unit: '%' },
];

export default function InsurancePage() {
  const [score, setScore] = useState<InsuranceScore | null>(null);
  const [scenarios, setScenarios] = useState<WhatIfScenario[]>([]);
  const [whatIfResults, setWhatIfResults] = useState<WhatIfResult[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Custom slider state
  const [mode, setMode] = useState<'presets' | 'custom'>('presets');
  const [sliders, setSliders] = useState<Record<string, number>>({});
  const [customResult, setCustomResult] = useState<WhatIfResult | null>(null);
  const [customLoading, setCustomLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, sc] = await Promise.all([
        api.insuranceScore(),
        api.whatIfDefaults(),
      ]);
      setScore(s);
      setScenarios(sc);
      if (sc.length > 0) {
        const results = await api.whatIfSimulate(sc);
        setWhatIfResults(results);
        setSelectedScenario(sc[0].id);
      }
    } catch {
      setError('Failed to load insurance data. Please check that the backend is running.');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Debounced custom simulation
  const runCustomSim = useCallback(async (adjustments: Record<string, number>) => {
    const hasAny = Object.values(adjustments).some((v) => v > 0);
    if (!hasAny) {
      setCustomResult(null);
      return;
    }
    setCustomLoading(true);
    try {
      const result = await api.whatIfCustom(adjustments);
      setCustomResult(result);
    } catch {
      // Silently handle
    }
    setCustomLoading(false);
  }, []);

  const handleSliderChange = useCallback((key: string, value: number) => {
    setSliders((prev) => {
      const next = { ...prev, [key]: value };
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => runCustomSim(next), 300);
      return next;
    });
  }, [runCustomSim]);

  const resetSliders = useCallback(() => {
    setSliders({});
    setCustomResult(null);
  }, []);

  if (loading || !score) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#FBAF1A] mx-auto mb-3" />
          <span className="text-sm text-gray-500 font-medium">Calculating insurance score...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-red-400 text-sm font-medium bg-red-500/10 border border-red-500/20 rounded-xl px-6 py-4">{error}</div>
        <button onClick={load} className="text-sm text-[#FBAF1A] hover:underline">Retry</button>
      </div>
    );
  }

  const selectedResult = whatIfResults.find((r) => r.scenarioId === selectedScenario);
  const trendIcon = score.trend === 'improving' ? TrendingUp : score.trend === 'declining' ? TrendingDown : Minus;
  const TrendIcon = trendIcon;
  const trendColor = score.trend === 'improving' ? 'text-emerald-500' : score.trend === 'declining' ? 'text-red-500' : 'text-gray-400';
  const activeResult = mode === 'custom' ? customResult : selectedResult;

  return (
    <>
      <PageHeader title="Insurance Intelligence" subtitle="Your fleet's insurance-readiness score and optimization paths" onRefresh={load} />

      <div className="p-6 space-y-6">
        {/* Hero: Score + Premium Impact */}
        <div className="grid grid-cols-12 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="col-span-5 bg-gradient-to-br from-[#18202F] to-[#1E293B] rounded-3xl p-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#FBAF1A]/[0.04] rounded-full blur-[60px]" />
            <div className="relative space-y-5">
              {/* Header */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1">
                    <h2 className="text-base font-bold text-white">Fleet Insurance Score</h2>
                    <InsightTooltip metricKey="insurance.overallScore" variant="dark" position="bottom" />
                  </span>
                  <div className={clsx('flex items-center gap-1 text-sm font-semibold', trendColor)}>
                    <TrendIcon className="w-4 h-4" />
                    <span className="capitalize">{score.trend}</span>
                  </div>
                </div>
                <div className="text-xs text-white/40 flex items-center gap-1">
                  Percentile: Top {100 - score.percentile}% of fleets
                  <InsightTooltip metricKey="insurance.percentile" variant="dark" />
                </div>
              </div>

              {/* Gauge */}
              <ScoreGauge score={score.overallScore} grade={score.grade} />

              {/* Grade Scale */}
              <div className="bg-white/[0.05] rounded-xl px-4 py-3">
                <div className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-2">Grade Scale</div>
                <GradeScaleBar score={score.overallScore} />
              </div>

              {/* Premium Impact */}
              <div className="bg-white/[0.05] rounded-xl p-4">
                <div className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1">
                  Annual Premium Impact <InsightTooltip metricKey="insurance.premiumEstimate" variant="dark" />
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-extrabold text-emerald-400">
                      ${score.premiumImpact.estimatedAnnualSavings.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-white/30">savings vs. industry average</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-white/60">
                      ${score.premiumImpact.benchmarkPremium.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1 justify-end">
                      <span className="text-[11px] text-white/30">benchmark</span>
                      <span className={clsx('text-xs font-bold', score.premiumImpact.percentChange < 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {score.premiumImpact.percentChange > 0 ? '+' : ''}{score.premiumImpact.percentChange}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Component Contributions */}
              <div className="bg-white/[0.05] rounded-xl px-4 py-3">
                <div className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-3">Point Contributions</div>
                <div className="space-y-2.5">
                  {Object.entries(score.components).map(([key, comp]) => {
                    const config = componentConfig[key];
                    if (!config) return null;
                    const Icon = config.icon;
                    const barPct = (comp.weightedScore / score.overallScore) * 100;
                    return (
                      <div key={key} className="flex items-center gap-2.5">
                        <Icon className={clsx('w-3.5 h-3.5 flex-shrink-0', config.color)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] text-white/60 font-medium truncate">{config.label}</span>
                            <span className="text-[11px] text-white/80 font-bold tabular-nums ml-2">{comp.weightedScore} pts</span>
                          </div>
                          <div className="h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-white/30 to-white/50"
                              initial={{ width: 0 }}
                              animate={{ width: `${barPct}%` }}
                              transition={{ duration: 1, delay: 0.5 }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.08]">
                    <span className="text-[11px] text-white/40 font-semibold">Total</span>
                    <span className="text-sm text-white font-extrabold tabular-nums">{score.overallScore} / 100</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="col-span-7 bg-white rounded-3xl border border-[#E5E2DC] p-8"
          >
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-[#BF7408]" />
              <h2 className="text-lg font-bold text-gray-900">Score Breakdown</h2>
              <span className="text-xs text-gray-400 ml-auto">4 components, weighted to 100</span>
            </div>
            <div className="space-y-5">
              {Object.entries(score.components).map(([key, comp], i) => {
                const config = componentConfig[key];
                if (!config) return null;
                const Icon = config.icon;
                const barColor = comp.score >= 80 ? 'from-emerald-400 to-emerald-500' :
                  comp.score >= 60 ? 'from-[#FBAF1A] to-amber-500' :
                  comp.score >= 40 ? 'from-amber-500 to-orange-500' : 'from-red-400 to-red-500';
                const componentStatus = comp.score >= 80 ? 'good' : comp.score >= 60 ? 'warning' : 'critical';
                const statusLabel = comp.score >= 80 ? 'On Track' : comp.score >= 60 ? 'Needs Attention' : 'Critical';
                const StatusIcon = comp.score >= 80 ? CheckCircle2 : comp.score >= 60 ? AlertTriangle : XCircle;
                const metrics = getComponentDetails(key, comp.details);

                return (
                  <motion.div key={key} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
                    className="border border-gray-100 rounded-2xl p-5 hover:border-gray-200 transition-colors"
                  >
                    {/* Component Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', config.bg)}>
                          <Icon className={clsx('w-5 h-5', config.color)} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900">{config.label}</span>
                            <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                              {(comp.weight * 100).toFixed(0)}% weight
                            </span>
                            {config.tooltipKey && <InsightTooltip metricKey={config.tooltipKey} />}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">{config.description}</div>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div className={clsx('flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg',
                          statusConfig[componentStatus].bg, statusConfig[componentStatus].text
                        )}>
                          <StatusIcon className="w-3 h-3" />
                          {statusLabel}
                        </div>
                        <div>
                          <div className="text-2xl font-extrabold text-gray-900 tabular-nums">{comp.score}</div>
                          <div className="text-[10px] text-gray-400 text-right">{comp.weightedScore.toFixed(0)} pts to total</div>
                        </div>
                      </div>
                    </div>

                    {/* Score Bar */}
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-4">
                      <motion.div className={clsx('h-full rounded-full bg-gradient-to-r', barColor)} initial={{ width: 0 }} animate={{ width: `${comp.score}%` }} transition={{ duration: 1, delay: 0.3 + i * 0.1 }} />
                    </div>

                    {/* Detail Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      {metrics.map((metric) => {
                        const st = statusConfig[metric.status];
                        return (
                          <div key={metric.label} className={clsx('rounded-xl px-3 py-2.5 border', st.bg, st.border)}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <div className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', st.dot)} />
                              <span className="text-[11px] font-semibold text-gray-500 truncate">{metric.label}</span>
                            </div>
                            <div className="text-sm font-bold text-gray-900 mb-0.5">{metric.value}</div>
                            <div className="text-[10px] text-gray-500 leading-tight">{metric.context}</div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* What-If Simulator + Recommendations */}
        <div className="grid grid-cols-12 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="col-span-7 bg-white rounded-3xl border border-[#E5E2DC] p-8">
            <div className="flex items-center gap-2 mb-4">
              <Sliders className="w-5 h-5 text-[#BF7408]" />
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-1">What-If Simulator <InsightTooltip metricKey="insurance.whatIf" /></h2>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setMode('presets')}
                className={clsx('px-4 py-2 rounded-xl text-sm font-medium transition-all', mode === 'presets' ? 'bg-[#18202F] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
              >
                Preset Scenarios
              </button>
              <button
                onClick={() => setMode('custom')}
                className={clsx('px-4 py-2 rounded-xl text-sm font-medium transition-all', mode === 'custom' ? 'bg-[#18202F] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
              >
                Custom Sliders
              </button>
            </div>

            {/* Preset Mode */}
            {mode === 'presets' && (
              <>
                <div className="flex flex-wrap gap-2 mb-6">
                  {scenarios.map((s) => (
                    <button key={s.id} onClick={() => setSelectedScenario(s.id)}
                      className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all', selectedScenario === s.id ? 'bg-[#FBAF1A]/15 text-[#BF7408] border border-[#FBAF1A]/30' : 'bg-gray-50 text-gray-500 hover:bg-gray-100')}>
                      {s.name}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Custom Slider Mode */}
            {mode === 'custom' && (
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Adjust parameters to model interventions</span>
                  <button onClick={resetSliders} className="text-xs text-[#BF7408] font-medium hover:underline">Reset All</button>
                </div>
                {SLIDER_PARAMS.map((param) => {
                  const value = sliders[param.key] || 0;
                  return (
                    <div key={param.key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-gray-700">
                          <span className="mr-1.5">{param.icon}</span>
                          {param.label}
                        </span>
                        <span className={clsx('text-sm font-bold tabular-nums', value > 0 ? 'text-[#BF7408]' : 'text-gray-400')}>
                          {value}{param.unit}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={param.max}
                        step={param.step}
                        value={value}
                        onChange={(e) => handleSliderChange(param.key, parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-100 rounded-full appearance-none cursor-pointer accent-[#FBAF1A]
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                          [&::-webkit-slider-thumb]:bg-[#FBAF1A] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md
                          [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
                          [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5
                          [&::-moz-range-thumb]:bg-[#FBAF1A] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2
                          [&::-moz-range-thumb]:border-white"
                      />
                      <div className="flex justify-between text-[10px] text-gray-300 mt-0.5">
                        <span>0%</span>
                        <span>{param.max}%</span>
                      </div>
                    </div>
                  );
                })}
                {customLoading && (
                  <div className="flex items-center gap-2 text-xs text-[#BF7408]">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Recalculating...</span>
                  </div>
                )}
              </div>
            )}

            {/* Result Display (works for both modes) */}
            {activeResult && (
              <motion.div key={`${mode}-${activeResult.scenarioId}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                <div className="flex items-center justify-center gap-8 py-5 mb-5 bg-[#F5F3EF] rounded-2xl">
                  <div className="text-center">
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Current</div>
                    <div className="text-4xl font-extrabold text-gray-400 font-mono-kpi">{activeResult.currentScore}</div>
                    <div className="text-sm font-bold text-gray-400 mt-1">{activeResult.currentGrade}</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <ArrowRight className="w-8 h-8 text-[#FBAF1A]" />
                    <div className="text-[10px] text-[#BF7408] font-medium mt-1">+{activeResult.scoreDelta} pts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-emerald-600 uppercase tracking-wider font-semibold mb-1">Projected</div>
                    <div className="text-4xl font-extrabold text-emerald-600 font-mono-kpi">{activeResult.projectedScore}</div>
                    <div className="text-sm font-bold text-emerald-600 mt-1">{activeResult.projectedGrade}</div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 mb-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-emerald-600 uppercase font-semibold tracking-wider">Projected Annual Savings</div>
                      <div className="text-4xl font-extrabold text-emerald-600 mt-1 font-mono-kpi">
                        ${activeResult.annualSavings.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Difficulty:</span>
                        <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full',
                          activeResult.implementationDifficulty === 'easy' ? 'bg-emerald-100 text-emerald-700' :
                          activeResult.implementationDifficulty === 'moderate' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        )}>{activeResult.implementationDifficulty}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Timeline:</span>
                        <span className="text-xs font-bold text-gray-700">{activeResult.timeToImpact}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {activeResult.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Implementation Steps</div>
                    {activeResult.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-[#F5F3EF] hover:bg-[#FFF8EB] transition-colors">
                        <div className="w-6 h-6 rounded-full bg-[#18202F] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</div>
                        <span className="text-sm text-gray-700 leading-relaxed">{rec}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {mode === 'custom' && !customResult && !customLoading && (
              <div className="text-center py-8 text-gray-400">
                <Sliders className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Adjust the sliders above to see projected impact</p>
              </div>
            )}
          </motion.div>

          {/* Recommendations + Quick Actions */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="col-span-5 space-y-6">
            <div className="bg-white rounded-3xl border border-[#E5E2DC] p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-[#BF7408]" />
                <h2 className="text-lg font-bold text-gray-900">Top Recommendations</h2>
              </div>
              <div className="space-y-3">
                {score.recommendations.map((rec, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1 }} className="flex gap-3 p-3 bg-[#F5F3EF] rounded-xl">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#FBAF1A] to-[#BF7408] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                    <p className="text-sm text-gray-700 leading-relaxed">{rec}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#18202F] to-[#2D3748] rounded-3xl p-6 text-white">
              <h3 className="text-sm font-bold mb-4 text-white/80">Related Dashboards</h3>
              <div className="space-y-2">
                {[
                  { href: '/operator/roi', label: 'ROI Dashboard', desc: 'See full savings breakdown', icon: DollarSign },
                  { href: '/operator/safety', label: 'Safety Events', desc: 'Drill into event details', icon: Shield },
                  { href: '/operator/wellness', label: 'Driver Wellness', desc: 'Burnout & retention risk', icon: TrendingUp },
                ].map((link) => {
                  const Icon = link.icon;
                  return (
                    <a key={link.href} href={link.href} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] transition-colors group">
                      <Icon className="w-4 h-4 text-[#FBAF1A]/70" />
                      <div className="flex-1">
                        <div className="text-sm font-semibold">{link.label}</div>
                        <div className="text-xs text-white/40">{link.desc}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors" />
                    </a>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
        {/* Methodology Panel */}
        <MethodologyPanel
          title="How We Calculate Insurance Scores"
          description="The insurance score is a weighted composite of four safety components, each scored independently from 0-100. The premium impact translates score points into estimated dollar savings using industry-standard actuarial formulas."
          formulas={[
            {
              label: 'Overall Insurance Score',
              formula: 'score = Safe Driving (35%) + Compliance (25%) + Maintenance (20%) + Driver Quality (20%)',
              example: 'Safe Driving: 70 x 0.35 = 24.5, Compliance: 65 x 0.25 = 16.25, Maintenance: 80 x 0.20 = 16, Quality: 75 x 0.20 = 15 = Total: 71.75',
            },
            {
              label: 'Premium Impact Formula',
              formula: 'savings = (score - 50) x 0.3% x (fleet_size x $14,200)',
              example: 'Score 72, 25 vehicles: (72-50) x 0.003 x $355,000 = $23,430/yr savings vs industry avg',
              source: '$14,200/vehicle/yr = Class 8 commercial benchmark premium',
            },
            {
              label: 'Safe Driving Component (35%)',
              formula: 'Based on: event rate/1K miles, total events (30d), severity mix, 30-day trend',
              example: 'Event rate <5/1K mi = good (industry avg ~12); severity: light 1x, moderate 2x, severe 4x weighting',
            },
            {
              label: 'Compliance Component (25%)',
              formula: 'Based on: seatbelt violations, speeding events, HOS violations, avg daily hours',
              example: '0 seatbelt violations = full marks; HOS violations > 3 = critical; avg hours > 11h = critical',
            },
            {
              label: 'Maintenance Component (20%)',
              formula: 'Based on: fleet age (years), active fault codes, faults/vehicle, avg odometer',
              example: 'Fleet age <3yr = good; active faults >5 = critical; odometer >400K km = critical',
            },
            {
              label: 'Driver Quality Component (20%)',
              formula: 'Based on: avg tenure (years), % low-risk drivers, % high/critical risk, team size',
              example: 'Tenure >5yr = good; >60% low-risk = good; >20% high-risk = critical',
            },
            {
              label: 'What-If Score Boost Formulas',
              formula: 'Harsh Braking: (reduction%/100) x 0.35 x 15 max pts | Speeding: (reduction%/100) x 0.25 x 18 | Idling: (reduction%/100) x 0.20 x 8 | Night Driving: (reduction%/100) x 0.35 x 6 | Compliance: (improvement%/100) x 0.25 x 20 | Maintenance: (boost%/100) x 0.20 x 20',
              example: '30% speeding reduction: (30/100) x 0.25 x 18 = 4.5 point boost = 4.5 x 0.3% x $355K = $4,792/yr savings',
            },
          ]}
          sources={[
            'Insurance benchmark: $14,200/vehicle/yr (Class 8 commercial average)',
            'Premium sensitivity: 0.3% per score point (standard underwriting practice)',
            'Grade scale: A+ (95-100), A (90-94), B+ (85-89), B (75-84), C+ (70-74), C (60-69), D (50-59), F (<50)',
            'Component thresholds calibrated against Geotab fleet benchmark data',
          ]}
        />
      </div>
    </>
  );
}
