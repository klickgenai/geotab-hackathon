'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, AlertCircle, Clock, Activity, Moon, Zap, Calendar, TrendingUp,
  ChevronRight, Users, Shield, DollarSign, AlertTriangle, Brain,
} from 'lucide-react';
import clsx from 'clsx';
import PageHeader from '@/components/layout/PageHeader';
import { api } from '@/lib/api';
import type { WellnessResult, WellnessSummary } from '@/types/fleet';

const riskColors = {
  high: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500', ring: 'ring-red-100', gradient: 'from-red-500 to-rose-600' },
  moderate: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', ring: 'ring-amber-100', gradient: 'from-amber-500 to-orange-500' },
  low: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', ring: 'ring-emerald-100', gradient: 'from-emerald-500 to-teal-500' },
};

const signalConfig: Record<string, { icon: typeof Clock; color: string; bgColor: string }> = {
  'Shift Irregularity': { icon: Activity, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  'Consecutive Long Days': { icon: Calendar, color: 'text-red-600', bgColor: 'bg-red-50' },
  'Rest Compression': { icon: Clock, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  'Event Escalation': { icon: TrendingUp, color: 'text-orange-600', bgColor: 'bg-orange-50' },
  'Night Driving Creep': { icon: Moon, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  'Excessive Daily Hours': { icon: Zap, color: 'text-amber-600', bgColor: 'bg-amber-50' },
};

function MiniGauge({ value, max, color, size = 48 }: { value: number; max: number; color: string; size?: number }) {
  const circumference = 2 * Math.PI * (size / 2 - 4);
  const fillPercent = Math.min(value / max, 1);

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={size / 2 - 4} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="3" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={size / 2 - 4} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: circumference * (1 - fillPercent) }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
    </svg>
  );
}

function BurnoutRadial({ probability, risk }: { probability: number; risk: 'low' | 'moderate' | 'high' }) {
  const circumference = 2 * Math.PI * 36;
  const color = risk === 'high' ? '#EF4444' : risk === 'moderate' ? '#F59E0B' : '#10B981';

  return (
    <div className="relative w-20 h-20">
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth="5" />
        <motion.circle
          cx="40" cy="40" r="36" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - probability) }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-base font-extrabold text-gray-800">{(probability * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

function SignalBar({ severity, value }: { severity: string; value: number }) {
  const width = severity === 'critical' ? 100 : severity === 'warning' ? 66 : 33;
  const color = severity === 'critical' ? 'bg-red-500' : severity === 'warning' ? 'bg-amber-400' : 'bg-emerald-400';

  return (
    <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
      <motion.div
        className={clsx('h-full rounded-full', color)}
        initial={{ width: 0 }}
        animate={{ width: `${width}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );
}

export default function WellnessPage() {
  const router = useRouter();
  const [allWellness, setAllWellness] = useState<WellnessResult[]>([]);
  const [summary, setSummary] = useState<WellnessSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.wellnessAll(),
      api.wellness(),
    ]).then(([all, s]) => {
      setAllWellness(all);
      setSummary(s);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => {
    const sorted = [...allWellness].sort((a, b) => b.burnoutProbability - a.burnoutProbability);
    if (riskFilter === 'all') return sorted;
    return sorted.filter((w) => w.burnoutRisk === riskFilter);
  }, [allWellness, riskFilter]);

  const totalRetentionCost = useMemo(() => {
    return allWellness.reduce((sum, w) => sum + w.retentionCost, 0);
  }, [allWellness]);

  if (loading || !summary) {
    return (
      <>
        <PageHeader title="Driver Wellness" subtitle="Loading wellness data..." />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Driver Wellness & Retention" subtitle="AI-powered burnout detection from telematics patterns" onRefresh={loadData} />

      <div className="p-8 space-y-8 max-w-[1520px]">

        {/* Hero KPI Row */}
        <div className="grid grid-cols-12 gap-6">
          {/* Retention Cost Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="col-span-5 bg-gradient-to-br from-[#18202F] to-[#1E293B] rounded-3xl p-7 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/[0.06] rounded-full blur-[60px]" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-5 h-5 text-red-400" />
                <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Total Retention Cost at Risk</span>
              </div>
              <div className="text-5xl font-extrabold text-red-400 mt-3 font-mono-kpi">
                ${(totalRetentionCost / 1000).toFixed(0)}K
              </div>
              <div className="text-sm text-white/30 mt-2">
                across {summary.highBurnoutRisk + summary.moderateBurnoutRisk} at-risk drivers
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="bg-white/[0.05] rounded-xl p-3 text-center">
                  <div className="text-2xl font-extrabold text-red-400">{summary.highBurnoutRisk}</div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">High Risk</div>
                </div>
                <div className="bg-white/[0.05] rounded-xl p-3 text-center">
                  <div className="text-2xl font-extrabold text-amber-400">{summary.moderateBurnoutRisk}</div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Moderate</div>
                </div>
                <div className="bg-white/[0.05] rounded-xl p-3 text-center">
                  <div className="text-2xl font-extrabold text-emerald-400">{summary.lowBurnoutRisk}</div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Healthy</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Burnout Signal Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="col-span-7 bg-white rounded-3xl border border-[#E5E2DC] p-7"
          >
            <div className="flex items-center gap-2 mb-5">
              <Brain className="w-5 h-5 text-purple-500" />
              <h2 className="text-lg font-bold text-gray-900">Burnout Signal Detection</h2>
              <span className="text-xs text-gray-400 ml-auto">6 telematics-based signals monitored</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(signalConfig).map(([name, cfg], i) => {
                const Icon = cfg.icon;
                const driversWithSignal = allWellness.filter((w) =>
                  w.signals.some((s) => s.name === name)
                ).length;
                const criticalCount = allWellness.filter((w) =>
                  w.signals.some((s) => s.name === name && s.severity === 'critical')
                ).length;

                return (
                  <motion.div
                    key={name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.05 }}
                    className={clsx('rounded-2xl p-4 border transition-all', cfg.bgColor, 'border-transparent hover:shadow-sm')}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center', cfg.bgColor)}>
                        <Icon className={clsx('w-5 h-5', cfg.color)} />
                      </div>
                      <div className="relative">
                        <MiniGauge value={driversWithSignal} max={allWellness.length} color={criticalCount > 0 ? '#EF4444' : '#F59E0B'} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-bold text-gray-700">{driversWithSignal}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-gray-800 leading-tight">{name}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {criticalCount > 0 ? (
                        <span className="text-red-500 font-medium">{criticalCount} critical</span>
                      ) : (
                        <span>{driversWithSignal} driver{driversWithSignal !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Fleet Wellness Overview Bar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-[#E5E2DC] p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Fleet Wellness Distribution</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-gray-500">High Risk ({summary.highBurnoutRisk})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-gray-500">Moderate ({summary.moderateBurnoutRisk})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-gray-500">Healthy ({summary.lowBurnoutRisk})</span>
              </div>
            </div>
          </div>
          <div className="flex h-6 rounded-full overflow-hidden gap-0.5">
            {summary.highBurnoutRisk > 0 && (
              <motion.div
                className="bg-gradient-to-r from-red-500 to-rose-500 rounded-l-full"
                initial={{ width: 0 }}
                animate={{ width: `${(summary.highBurnoutRisk / summary.totalDrivers) * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            )}
            {summary.moderateBurnoutRisk > 0 && (
              <motion.div
                className="bg-gradient-to-r from-amber-400 to-orange-400"
                initial={{ width: 0 }}
                animate={{ width: `${(summary.moderateBurnoutRisk / summary.totalDrivers) * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }}
              />
            )}
            {summary.lowBurnoutRisk > 0 && (
              <motion.div
                className="bg-gradient-to-r from-emerald-400 to-teal-400 rounded-r-full"
                initial={{ width: 0 }}
                animate={{ width: `${(summary.lowBurnoutRisk / summary.totalDrivers) * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
              />
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">Average Wellness Score: <span className="font-bold text-gray-700">{summary.avgWellnessScore}/100</span></span>
            <span className="text-xs text-gray-400">{summary.totalDrivers} total drivers</span>
          </div>
        </motion.div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(['all', 'high', 'moderate', 'low'] as const).map((risk) => (
            <button
              key={risk}
              onClick={() => setRiskFilter(risk)}
              className={clsx(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                riskFilter === risk
                  ? 'bg-[#18202F] text-white shadow-md'
                  : 'bg-white border border-[#E5E2DC] text-gray-600 hover:border-[#FBAF1A] hover:shadow-sm'
              )}
            >
              {risk === 'all' ? `All Drivers (${allWellness.length})` : `${risk.charAt(0).toUpperCase() + risk.slice(1)} Risk (${allWellness.filter((w) => w.burnoutRisk === risk).length})`}
            </button>
          ))}
        </div>

        {/* Driver wellness cards */}
        <div className="grid grid-cols-2 gap-6">
          {filtered.map((w, i) => {
            const cfg = riskColors[w.burnoutRisk];
            const criticalSignals = w.signals.filter((s) => s.severity === 'critical');
            const warningSignals = w.signals.filter((s) => s.severity === 'warning');
            const isExpanded = expandedDriver === w.driverId;

            return (
              <motion.div
                key={w.driverId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={clsx(
                  'bg-white rounded-2xl border p-0 overflow-hidden transition-all hover:shadow-lg group',
                  w.burnoutRisk === 'high' ? 'border-red-200' : 'border-[#E5E2DC]'
                )}
              >
                {/* Risk severity bar at top */}
                <div className={clsx('h-1 bg-gradient-to-r', cfg.gradient)} />

                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={clsx('w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md', cfg.dot)}>
                        {w.driverName.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <div className="text-base font-bold text-gray-800">{w.driverName}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold capitalize', cfg.bg, cfg.text)}>
                            {w.burnoutRisk} risk
                          </span>
                          {w.consecutiveLongDays > 3 && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-red-500 font-medium">
                              <AlertTriangle className="w-3 h-3" />
                              {w.consecutiveLongDays} long days
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <BurnoutRadial probability={w.burnoutProbability} risk={w.burnoutRisk} />
                  </div>

                  {/* Key Metrics Row */}
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="bg-[#F5F3EF] rounded-xl p-2.5 text-center">
                      <div className="text-lg font-extrabold text-gray-800">{w.overallWellnessScore}</div>
                      <div className="text-[10px] text-gray-400 font-medium">Wellness</div>
                    </div>
                    <div className="bg-[#F5F3EF] rounded-xl p-2.5 text-center">
                      <div className={clsx('text-lg font-extrabold', w.avgRestHours < 8 ? 'text-red-500' : 'text-gray-800')}>{w.avgRestHours}h</div>
                      <div className="text-[10px] text-gray-400 font-medium">Avg Rest</div>
                    </div>
                    <div className="bg-[#F5F3EF] rounded-xl p-2.5 text-center">
                      <div className="text-lg font-extrabold text-gray-800">{w.daysSinceLastRest}d</div>
                      <div className="text-[10px] text-gray-400 font-medium">Since Rest</div>
                    </div>
                    <div className="bg-red-50 rounded-xl p-2.5 text-center">
                      <div className="text-lg font-extrabold text-red-600">${(w.retentionCost / 1000).toFixed(0)}K</div>
                      <div className="text-[10px] text-red-400 font-medium">At Risk</div>
                    </div>
                  </div>

                  {/* Signal indicators with severity bars */}
                  <div className="space-y-1.5">
                    {criticalSignals.map((s) => {
                      const sc = signalConfig[s.name] || { icon: Activity, color: 'text-gray-600', bgColor: 'bg-gray-50' };
                      const Icon = sc.icon;
                      return (
                        <div key={s.name} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-red-50/80">
                          <Icon className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                          <span className="text-xs font-medium text-red-700 flex-1">{s.name}</span>
                          <SignalBar severity="critical" value={s.value} />
                          <span className="text-[10px] font-bold text-red-500 w-8 text-right">{(s.value * 100).toFixed(0)}%</span>
                        </div>
                      );
                    })}
                    {warningSignals.map((s) => {
                      const sc = signalConfig[s.name] || { icon: Activity, color: 'text-gray-600', bgColor: 'bg-gray-50' };
                      const Icon = sc.icon;
                      return (
                        <div key={s.name} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-50/80">
                          <Icon className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                          <span className="text-xs font-medium text-amber-700 flex-1">{s.name}</span>
                          <SignalBar severity="warning" value={s.value} />
                          <span className="text-[10px] font-bold text-amber-500 w-8 text-right">{(s.value * 100).toFixed(0)}%</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Expand/Collapse for recommendations */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedDriver(isExpanded ? null : w.driverId);
                    }}
                    className="flex items-center gap-1 mt-3 text-xs text-gray-400 hover:text-[#BF7408] transition-colors"
                  >
                    <span>{isExpanded ? 'Hide' : 'Show'} recommendations</span>
                    <ChevronRight className={clsx('w-3 h-3 transition-transform', isExpanded && 'rotate-90')} />
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 space-y-1.5 pt-3 border-t border-[#E5E2DC]">
                          {w.recommendations.map((rec, j) => (
                            <div key={j} className="flex items-start gap-2">
                              <div className="w-4 h-4 rounded-full bg-[#FBAF1A]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-[9px] font-bold text-[#BF7408]">{j + 1}</span>
                              </div>
                              <span className="text-xs text-gray-600 leading-relaxed">{rec}</span>
                            </div>
                          ))}
                          <button
                            onClick={() => router.push(`/operator/drivers/${w.driverId}`)}
                            className="flex items-center gap-1 mt-2 text-xs font-medium text-[#BF7408] hover:underline"
                          >
                            View full driver profile <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Intervention Impact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-r from-[#18202F] to-[#2D3748] rounded-2xl p-6 flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-[#FBAF1A]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Reduce burnout risk to save on retention costs</h3>
              <p className="text-sm text-white/40 mt-0.5">
                Use the What-If Simulator to model wellness interventions and see projected savings
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/operator/insurance')}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#FBAF1A] text-[#18202F] rounded-xl text-sm font-bold hover:bg-[#FFD166] transition-colors"
          >
            Open Simulator <ChevronRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </>
  );
}
