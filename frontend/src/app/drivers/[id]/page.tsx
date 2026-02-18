'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, AlertTriangle, Heart, Shield, TrendingUp, TrendingDown, Minus, Clock, Activity, Moon, Zap, Calendar, DollarSign } from 'lucide-react';
import clsx from 'clsx';
import PageHeader from '@/components/layout/PageHeader';
import { api } from '@/lib/api';
import type { DriverRisk, WellnessResult, SafetyEvent, Driver } from '@/types/fleet';

const tierConfig = {
  low: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  moderate: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  high: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  critical: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', dot: 'bg-red-800' },
};

const severityColors = {
  normal: { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-400' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-400' },
  critical: { bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-500' },
};

const eventSeverityColors = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-amber-50 text-amber-700',
  high: 'bg-red-50 text-red-700',
  critical: 'bg-red-100 text-red-800',
};

const signalIcons: Record<string, typeof Clock> = {
  'Shift Irregularity': Activity,
  'Consecutive Long Days': Calendar,
  'Rest Compression': Clock,
  'Event Escalation': TrendingUp,
  'Night Driving Creep': Moon,
  'Excessive Daily Hours': Zap,
};

export default function DriverDetailPage() {
  const params = useParams();
  const router = useRouter();
  const driverId = params.id as string;

  const [driver, setDriver] = useState<Driver | null>(null);
  const [risk, setRisk] = useState<DriverRisk | null>(null);
  const [wellness, setWellness] = useState<WellnessResult | null>(null);
  const [events, setEvents] = useState<SafetyEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.driver(driverId).catch(() => null),
      api.driverRisk(driverId).catch(() => null),
      api.driverWellness(driverId).catch(() => null),
      api.events({ driverId, limit: 50 }).catch(() => []),
    ]).then(([d, r, w, e]) => {
      setDriver(d);
      setRisk(r);
      setWellness(w);
      setEvents(e);
    }).finally(() => setLoading(false));
  }, [driverId]);

  if (loading) {
    return (
      <>
        <PageHeader title="Driver Profile" subtitle="Loading..." />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0078D3]" />
        </div>
      </>
    );
  }

  if (!risk || !driver) {
    return (
      <>
        <PageHeader title="Driver Not Found" />
        <div className="p-6 text-center">
          <p className="text-gray-500">Driver ID "{driverId}" was not found.</p>
          <button onClick={() => router.push('/drivers')} className="mt-4 px-4 py-2 bg-[#0078D3] text-white rounded-lg text-sm">
            Back to Drivers
          </button>
        </div>
      </>
    );
  }

  const cfg = tierConfig[risk.tier];
  const trendIcon = risk.components.trend.direction === 'improving' ? TrendingDown : risk.components.trend.direction === 'worsening' ? TrendingUp : Minus;
  const TrendIcon = trendIcon;

  return (
    <>
      <PageHeader
        title={risk.driverName}
        subtitle={`Driver ID: ${driverId}`}
        actions={
          <button onClick={() => router.push('/drivers')} className="flex items-center gap-1.5 px-3 py-[7px] rounded-md text-[0.78rem] font-medium border border-gray-200 text-gray-600 hover:text-[#0078D3] hover:border-[#0078D3] transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            All Drivers
          </button>
        }
      />

      <div className="p-6 space-y-5 max-w-[1400px]">
        {/* Hero Section: Risk + Wellness Overview */}
        <div className="grid grid-cols-12 gap-5">
          {/* Risk Overview Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="col-span-4 bg-gradient-to-br from-[#1a2332] to-[#25477B] rounded-xl p-6 text-white relative overflow-hidden"
          >
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-white/[0.03]" />
            <h3 className="text-[0.68rem] font-semibold text-white/50 uppercase tracking-wide mb-4">Risk Score</h3>
            <div className="flex items-end gap-3 mb-4">
              <span className="text-[3.5rem] font-extrabold leading-none tracking-tighter">{risk.riskScore}</span>
              <span className={clsx('px-2.5 py-1 rounded-full text-[0.72rem] font-bold capitalize mb-2', cfg.bg, cfg.text)}>
                {risk.tier}
              </span>
            </div>
            <div className="flex items-center gap-2 text-white/60 text-[0.75rem] mb-4">
              <TrendIcon className="w-4 h-4" />
              <span className="capitalize">{risk.components.trend.direction}</span>
              <span>({risk.components.trend.delta > 0 ? '+' : ''}{risk.components.trend.delta} events)</span>
            </div>
            <div className="text-[0.68rem] text-white/40">Annual cost estimate</div>
            <div className="text-[1.6rem] font-bold text-amber-300">${risk.annualizedCost.toLocaleString()}</div>
          </motion.div>

          {/* Risk Components */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="col-span-4 bg-white rounded-xl border border-gray-200 p-5"
          >
            <h3 className="text-[0.68rem] font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#0078D3]" />
              Risk Breakdown
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Event Frequency', score: risk.components.eventFrequency.score, weight: '40%', detail: `${risk.components.eventFrequency.eventsPerThousandMiles} per 1K mi` },
                { label: 'Severity', score: risk.components.severity.score, weight: '25%', detail: `Avg: ${risk.components.severity.weightedAvg}` },
                { label: 'Pattern', score: risk.components.pattern.score, weight: '20%', detail: risk.components.pattern.topPatterns[0] || '—' },
                { label: 'Trend', score: risk.components.trend.score, weight: '15%', detail: risk.components.trend.direction },
              ].map((comp) => {
                const color = comp.score >= 60 ? 'bg-red-400' : comp.score >= 30 ? 'bg-amber-400' : 'bg-emerald-400';
                return (
                  <div key={comp.label}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[0.75rem] font-medium text-gray-700">{comp.label} <span className="text-gray-400">({comp.weight})</span></span>
                      <span className="text-[0.82rem] font-bold text-gray-800">{comp.score}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1">
                      <motion.div
                        className={clsx('h-full rounded-full', color)}
                        initial={{ width: 0 }}
                        animate={{ width: `${comp.score}%` }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                      />
                    </div>
                    <div className="text-[0.62rem] text-gray-400">{comp.detail}</div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Wellness Overview */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="col-span-4 bg-white rounded-xl border border-gray-200 p-5"
          >
            <h3 className="text-[0.68rem] font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-500" />
              Wellness Assessment
            </h3>
            {wellness ? (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className={clsx('text-[1.5rem] font-extrabold', wellness.burnoutRisk === 'high' ? 'text-red-500' : wellness.burnoutRisk === 'moderate' ? 'text-amber-500' : 'text-emerald-500')}>
                      {(wellness.burnoutProbability * 100).toFixed(0)}%
                    </div>
                    <div className="text-[0.6rem] text-gray-400">Burnout Risk</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-[1.5rem] font-extrabold text-gray-800">{wellness.overallWellnessScore}</div>
                    <div className="text-[0.6rem] text-gray-400">Wellness Score</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[0.72rem]">
                    <span className="text-gray-500">Avg Rest</span>
                    <span className="font-medium text-gray-700">{wellness.avgRestHours}hrs</span>
                  </div>
                  <div className="flex justify-between text-[0.72rem]">
                    <span className="text-gray-500">Long Day Streak</span>
                    <span className="font-medium text-gray-700">{wellness.consecutiveLongDays} days</span>
                  </div>
                  <div className="flex justify-between text-[0.72rem]">
                    <span className="text-gray-500">Days Since Rest</span>
                    <span className={clsx('font-medium', wellness.daysSinceLastRest > 6 ? 'text-red-600' : 'text-gray-700')}>{wellness.daysSinceLastRest}</span>
                  </div>
                  <div className="flex justify-between text-[0.72rem]">
                    <span className="text-gray-500">Retention Cost</span>
                    <span className="font-bold text-red-600">${wellness.retentionCost.toLocaleString()}</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400">No wellness data available</p>
            )}
          </motion.div>
        </div>

        {/* Wellness Signals + Driving Stats */}
        <div className="grid grid-cols-12 gap-5">
          {/* Wellness Signals */}
          {wellness && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="col-span-7 bg-white rounded-xl border border-gray-200 p-5"
            >
              <h3 className="text-[0.68rem] font-semibold text-gray-400 uppercase tracking-wide mb-4">Burnout Signals</h3>
              <div className="grid grid-cols-2 gap-3">
                {wellness.signals.map((signal) => {
                  const sev = severityColors[signal.severity];
                  const SignalIcon = signalIcons[signal.name] || Activity;
                  const pct = Math.min(100, (signal.value / Math.max(signal.threshold, 1)) * 100);
                  return (
                    <div key={signal.name} className={clsx('rounded-lg border p-3', signal.severity === 'critical' ? 'border-red-200 bg-red-50/50' : signal.severity === 'warning' ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100')}>
                      <div className="flex items-center gap-2 mb-2">
                        <SignalIcon className={clsx('w-4 h-4', signal.severity === 'critical' ? 'text-red-500' : signal.severity === 'warning' ? 'text-amber-500' : 'text-gray-400')} />
                        <span className="text-[0.72rem] font-semibold text-gray-700">{signal.name}</span>
                        <span className={clsx('ml-auto px-1.5 py-0.5 rounded text-[0.58rem] font-bold uppercase', sev.bg, sev.text)}>
                          {signal.severity}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                        <div className={clsx('h-full rounded-full transition-all', sev.bar)} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <div className="text-[0.6rem] text-gray-400">{signal.description}</div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Driving Stats */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className={clsx('bg-white rounded-xl border border-gray-200 p-5', wellness ? 'col-span-5' : 'col-span-12')}
          >
            <h3 className="text-[0.68rem] font-semibold text-gray-400 uppercase tracking-wide mb-4">30-Day Driving Stats</h3>
            {driver.stats ? (
              <div className="space-y-3">
                {[
                  { label: 'Total Distance', value: `${driver.stats.totalDistance.toLocaleString()} km` },
                  { label: 'Total Trips', value: driver.stats.totalTrips.toString() },
                  { label: 'Driving Hours', value: `${driver.stats.totalDrivingHours}hrs` },
                  { label: 'Avg Daily Hours', value: `${driver.stats.avgDailyHours}hrs`, warn: driver.stats.avgDailyHours > 10 },
                  { label: 'Avg Rest Hours', value: `${driver.stats.avgRestHours}hrs`, warn: driver.stats.avgRestHours < 8 },
                  { label: 'Night Driving', value: `${driver.stats.nightDrivingHours}hrs` },
                  { label: 'Max Speed', value: `${driver.stats.maxSpeed.toFixed(0)} km/h`, warn: driver.stats.maxSpeed > 120 },
                  { label: 'Avg Idling', value: `${driver.stats.avgIdlingMinutes} min` },
                  { label: 'Days Worked', value: `${driver.stats.daysWorked} / 30` },
                  { label: 'Safety Events', value: driver.stats.totalEvents.toString(), warn: driver.stats.totalEvents > 10 },
                ].map((stat) => (
                  <div key={stat.label} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-[0.75rem] text-gray-500">{stat.label}</span>
                    <span className={clsx('text-[0.82rem] font-semibold tabular-nums', stat.warn ? 'text-red-600' : 'text-gray-800')}>
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No stats available</p>
            )}
          </motion.div>
        </div>

        {/* Recommendations + Events */}
        <div className="grid grid-cols-12 gap-5">
          {/* Recommendations */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="col-span-5 bg-white rounded-xl border border-gray-200 p-5"
          >
            <h3 className="text-[0.68rem] font-semibold text-gray-400 uppercase tracking-wide mb-4">Coaching Recommendations</h3>
            <div className="space-y-2">
              {risk.recommendations.map((rec, i) => (
                <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-[#0078D3] text-white flex items-center justify-center text-[0.65rem] font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <p className="text-[0.78rem] text-gray-700 leading-relaxed">{rec}</p>
                </div>
              ))}
              {wellness && wellness.recommendations.length > 0 && (
                <>
                  <div className="text-[0.62rem] font-semibold text-pink-500 uppercase tracking-wide pt-2">Wellness</div>
                  {wellness.recommendations.map((rec, i) => (
                    <div key={`w-${i}`} className="flex gap-3 p-3 bg-pink-50/50 rounded-lg border border-pink-100">
                      <Heart className="w-4 h-4 text-pink-500 flex-shrink-0 mt-0.5" />
                      <p className="text-[0.78rem] text-gray-700 leading-relaxed">{rec}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          </motion.div>

          {/* Recent Events */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="col-span-7 bg-white rounded-xl border border-gray-200 p-5"
          >
            <h3 className="text-[0.68rem] font-semibold text-gray-400 uppercase tracking-wide mb-4">
              Recent Safety Events <span className="text-gray-300 font-normal">({events.length})</span>
            </h3>
            {events.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {events.map((event) => (
                  <div key={event.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={clsx('px-2 py-0.5 rounded text-[0.6rem] font-bold uppercase', eventSeverityColors[event.severity])}>
                      {event.severity}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.78rem] font-medium text-gray-800 capitalize">{event.type.replace(/_/g, ' ')}</div>
                      <div className="text-[0.62rem] text-gray-400">{event.details}</div>
                    </div>
                    <div className="text-[0.68rem] text-gray-400 tabular-nums whitespace-nowrap">
                      {new Date(event.dateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Shield className="w-8 h-8 mx-auto mb-2 text-emerald-300" />
                <p className="text-sm">No safety events in the last 30 days</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
}
