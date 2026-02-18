'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Heart, AlertCircle, Clock, Activity, Moon, Zap, Calendar, TrendingUp, ChevronRight, Users } from 'lucide-react';
import clsx from 'clsx';
import PageHeader from '@/components/layout/PageHeader';
import { api } from '@/lib/api';
import type { WellnessResult, WellnessSummary } from '@/types/fleet';

const riskColors = {
  high: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500', ring: 'ring-red-200' },
  moderate: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', ring: 'ring-amber-200' },
  low: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', ring: 'ring-emerald-200' },
};

const signalIcons: Record<string, typeof Clock> = {
  'Shift Irregularity': Activity,
  'Consecutive Long Days': Calendar,
  'Rest Compression': Clock,
  'Event Escalation': TrendingUp,
  'Night Driving Creep': Moon,
  'Excessive Daily Hours': Zap,
};

export default function WellnessPage() {
  const router = useRouter();
  const [allWellness, setAllWellness] = useState<WellnessResult[]>([]);
  const [summary, setSummary] = useState<WellnessSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [riskFilter, setRiskFilter] = useState<string>('all');

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
    if (riskFilter === 'all') return allWellness;
    return allWellness.filter((w) => w.burnoutRisk === riskFilter);
  }, [allWellness, riskFilter]);

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
      <PageHeader title="Driver Wellness & Retention" subtitle="Burnout detection from telematics patterns" onRefresh={loadData} />

      <div className="p-6 space-y-5 max-w-[1400px]">
        {/* KPI row */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'High Burnout Risk', value: summary.highBurnoutRisk, color: summary.highBurnoutRisk > 0 ? 'text-red-500' : 'text-gray-800', icon: AlertCircle, iconColor: 'text-red-500', iconBg: 'bg-red-50' },
            { label: 'Moderate Risk', value: summary.moderateBurnoutRisk, color: 'text-amber-500', icon: Heart, iconColor: 'text-amber-500', iconBg: 'bg-amber-50' },
            { label: 'Avg Wellness', value: summary.avgWellnessScore, color: 'text-emerald-600', icon: Activity, iconColor: 'text-emerald-500', iconBg: 'bg-emerald-50' },
            { label: 'Retention Cost at Risk', value: `$${(summary.totalRetentionCostAtRisk / 1000).toFixed(0)}K`, color: 'text-red-600', icon: Users, iconColor: 'text-indigo-500', iconBg: 'bg-indigo-50' },
          ].map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="bg-white rounded-xl border border-gray-200 px-5 py-4"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[0.68rem] font-semibold text-gray-400 uppercase tracking-wide">{card.label}</span>
                  <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', card.iconBg)}>
                    <Icon className={clsx('w-4 h-4', card.iconColor)} />
                  </div>
                </div>
                <div className={clsx('text-[2rem] font-extrabold leading-none', card.color)}>
                  {card.value}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(['all', 'high', 'moderate', 'low'] as const).map((risk) => (
            <button
              key={risk}
              onClick={() => setRiskFilter(risk)}
              className={clsx(
                'px-4 py-2 rounded-lg text-[0.78rem] font-medium transition-all',
                riskFilter === risk
                  ? 'bg-[#0078D3] text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-[#0078D3]'
              )}
            >
              {risk === 'all' ? `All (${allWellness.length})` : `${risk.charAt(0).toUpperCase() + risk.slice(1)} (${allWellness.filter((w) => w.burnoutRisk === risk).length})`}
            </button>
          ))}
        </div>

        {/* Driver wellness cards */}
        <div className="grid grid-cols-2 gap-4">
          {filtered.map((w, i) => {
            const cfg = riskColors[w.burnoutRisk];
            const criticalSignals = w.signals.filter((s) => s.severity === 'critical');
            const warningSignals = w.signals.filter((s) => s.severity === 'warning');
            return (
              <motion.div
                key={w.driverId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => router.push(`/drivers/${w.driverId}`)}
                className={clsx(
                  'bg-white rounded-xl border p-5 cursor-pointer hover:shadow-md transition-all group',
                  w.burnoutRisk === 'high' ? 'border-red-200' : 'border-gray-200'
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center text-white text-[0.72rem] font-bold', cfg.dot)}>
                      {w.driverName.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <div className="text-[0.88rem] font-semibold text-gray-800">{w.driverName}</div>
                      <div className="text-[0.65rem] text-gray-400">{w.driverId}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={clsx('px-2.5 py-1 rounded-full text-[0.68rem] font-bold capitalize', cfg.bg, cfg.text)}>
                      {w.burnoutRisk} risk
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#0078D3] transition-colors" />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="text-center">
                    <div className={clsx('text-[1.2rem] font-extrabold', w.burnoutProbability > 0.5 ? 'text-red-500' : w.burnoutProbability > 0.25 ? 'text-amber-500' : 'text-emerald-500')}>
                      {(w.burnoutProbability * 100).toFixed(0)}%
                    </div>
                    <div className="text-[0.55rem] text-gray-400">Burnout</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[1.2rem] font-extrabold text-gray-800">{w.overallWellnessScore}</div>
                    <div className="text-[0.55rem] text-gray-400">Wellness</div>
                  </div>
                  <div className="text-center">
                    <div className={clsx('text-[1.2rem] font-extrabold', w.avgRestHours < 8 ? 'text-red-500' : 'text-gray-800')}>{w.avgRestHours}h</div>
                    <div className="text-[0.55rem] text-gray-400">Avg Rest</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[1.2rem] font-extrabold text-red-600">${(w.retentionCost / 1000).toFixed(0)}K</div>
                    <div className="text-[0.55rem] text-gray-400">At Risk</div>
                  </div>
                </div>

                {/* Signal indicators */}
                <div className="flex flex-wrap gap-1.5">
                  {criticalSignals.map((s) => {
                    const Icon = signalIcons[s.name] || Activity;
                    return (
                      <span key={s.name} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 text-red-700 text-[0.6rem] font-medium">
                        <Icon className="w-3 h-3" />
                        {s.name}
                      </span>
                    );
                  })}
                  {warningSignals.map((s) => {
                    const Icon = signalIcons[s.name] || Activity;
                    return (
                      <span key={s.name} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[0.6rem] font-medium">
                        <Icon className="w-3 h-3" />
                        {s.name}
                      </span>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </>
  );
}
