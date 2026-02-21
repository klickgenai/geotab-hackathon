'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Leaf, Fuel, Wind, TreePine, TrendingDown, TrendingUp, Zap, Truck,
  ArrowRight, Clock, DollarSign, Award, Users, AlertTriangle, ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';
import PageHeader from '@/components/layout/PageHeader';
import { api } from '@/lib/api';
import type {
  GreenFleetDashboard, DriverGreenScore, EVCandidate, GreenRecommendation, MonthlyGreenTrend,
} from '@/types/fleet';

const priorityColors = {
  high: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', badge: 'bg-red-100 text-red-700' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700' },
  low: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
};

const difficultyBadge = {
  easy: 'bg-emerald-100 text-emerald-700',
  moderate: 'bg-amber-100 text-amber-700',
  hard: 'bg-red-100 text-red-700',
};

const gradeColors: Record<string, string> = {
  'A+': 'text-emerald-500', 'A': 'text-emerald-500', 'B+': 'text-green-500', 'B': 'text-green-600',
  'C+': 'text-amber-500', 'C': 'text-amber-600', 'D': 'text-orange-500', 'F': 'text-red-500',
};

function GreenGauge({ score, grade, size = 120 }: { score: number; grade: string; size?: number }) {
  const circumference = 2 * Math.PI * (size / 2 - 8);
  const fillPercent = Math.min(score / 100, 1);
  const color = score >= 80 ? '#10B981' : score >= 60 ? '#84CC16' : score >= 40 ? '#F59E0B' : '#EF4444';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 8} fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth="6" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={size / 2 - 8} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - fillPercent) }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={clsx('text-3xl font-extrabold', gradeColors[grade] || 'text-gray-800')}>{grade}</span>
        <span className="text-xs text-gray-400 font-semibold">{score}/100</span>
      </div>
    </div>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-1.5 w-20 bg-gray-100 rounded-full overflow-hidden">
      <motion.div
        className={clsx('h-full rounded-full', color)}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min((value / max) * 100, 100)}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );
}

export default function SustainabilityPage() {
  const [data, setData] = useState<GreenFleetDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'drivers' | 'ev'>('overview');

  const loadData = () => {
    setLoading(true);
    api.sustainability()
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  if (loading || !data) {
    return (
      <>
        <PageHeader title="Sustainability" subtitle="Loading green fleet metrics..." />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      </>
    );
  }

  const { fleetScore, carbonFootprint, fuelEfficiency, idleWaste, driverGreenRankings, evReadiness, recommendations, monthlyTrend } = data;

  return (
    <>
      <PageHeader
        title="Green Fleet & Sustainability"
        subtitle="Environmental impact analytics and actionable recommendations to reduce your carbon footprint"
        onRefresh={loadData}
      />

      <div className="p-6 space-y-6">

        {/* Hero Row: Green Score + Carbon Footprint */}
        <div className="grid grid-cols-12 gap-6">

          {/* Green Score Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="col-span-5 bg-gradient-to-br from-[#18202F] to-[#1E293B] rounded-3xl p-7 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/[0.08] rounded-full blur-[60px]" />
            <div className="relative flex items-start gap-6">
              <GreenGauge score={fleetScore.overallScore} grade={fleetScore.grade} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Leaf className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Fleet Green Score</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {fleetScore.trend === 'improving' ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
                      <TrendingDown className="w-3 h-3" /> Improving
                    </span>
                  ) : fleetScore.trend === 'declining' ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-red-400 bg-red-400/10 px-2 py-1 rounded-full">
                      <TrendingUp className="w-3 h-3" /> Declining
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-semibold text-white/40 bg-white/5 px-2 py-1 rounded-full">Stable</span>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  {Object.entries(fleetScore.components).map(([key, comp]) => (
                    <div key={key} className="flex items-center gap-3">
                      <div className="w-24 text-[11px] text-white/40 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-emerald-400"
                          initial={{ width: 0 }}
                          animate={{ width: `${comp.score}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                        />
                      </div>
                      <span className="text-xs text-white/50 font-mono w-8 text-right">{comp.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Carbon Footprint Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
            className="col-span-4 bg-white rounded-3xl border border-gray-100 p-7 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-[40px]" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <Wind className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Carbon Footprint (30d)</span>
              </div>
              <div className="text-4xl font-extrabold text-gray-800 mt-3 font-mono-kpi">
                {carbonFootprint.totalCO2Tons.toFixed(1)} <span className="text-lg text-gray-400">tons CO2</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                {carbonFootprint.monthOverMonthChange <= 0 ? (
                  <span className="text-xs font-semibold text-emerald-600">
                    {carbonFootprint.monthOverMonthChange.toFixed(1)}% vs last month
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-red-500">
                    +{carbonFootprint.monthOverMonthChange.toFixed(1)}% vs last month
                  </span>
                )}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-lg font-extrabold text-gray-700">{carbonFootprint.dailyAvgCO2Kg}</div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">kg CO2/day</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-lg font-extrabold text-gray-700">{carbonFootprint.co2PerKm}</div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">kg CO2/km</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-lg font-extrabold text-gray-700">{carbonFootprint.co2PerVehiclePerDay}</div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">kg/vehicle/day</div>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3">
                  <div className="flex items-center gap-1">
                    <TreePine className="w-4 h-4 text-emerald-600" />
                    <div className="text-lg font-extrabold text-emerald-700">{carbonFootprint.treesEquivalent.toLocaleString()}</div>
                  </div>
                  <div className="text-[10px] text-emerald-600/60 uppercase tracking-wider mt-0.5">Trees to offset/yr</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className="col-span-3 space-y-3"
          >
            {/* Fuel Efficiency */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Fuel className="w-4 h-4 text-blue-500" />
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Fleet Fuel Efficiency</span>
              </div>
              <div className="text-2xl font-extrabold text-gray-800 font-mono-kpi">
                {fuelEfficiency.fleetAvgKmPerLiter} <span className="text-sm text-gray-400">km/L</span>
              </div>
              <div className="text-[11px] text-gray-400 mt-1 capitalize">{fuelEfficiency.benchmarkComparison} for fleet class</div>
            </div>

            {/* Idle Waste */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Idle Waste (30d)</span>
              </div>
              <div className="text-2xl font-extrabold text-orange-600 font-mono-kpi">
                {idleWaste.fuelWastedLiters.toLocaleString()} <span className="text-sm text-gray-400">liters</span>
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                ${idleWaste.costWasted.toLocaleString()} wasted &middot; {idleWaste.co2FromIdling.toFixed(0)}kg CO2
              </div>
            </div>

            {/* EV Ready */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-emerald-500" />
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">EV-Ready Vehicles</span>
              </div>
              <div className="text-2xl font-extrabold text-emerald-600 font-mono-kpi">
                {evReadiness.totalCandidates}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                ${evReadiness.projectedAnnualSavings.toLocaleString()}/yr potential savings
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {(['overview', 'drivers', 'ev'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200',
                activeTab === tab
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {tab === 'overview' ? 'Recommendations & Trends' : tab === 'drivers' ? 'Driver Green Scores' : 'EV Readiness'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-12 gap-6">
            {/* Actionable Recommendations */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="col-span-7 bg-white rounded-3xl border border-gray-100 p-7"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-bold text-gray-800">Actionable Recommendations</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Prioritized actions to reduce emissions and costs</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Leaf className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-600">
                    ${recommendations.reduce((s, r) => s + r.projectedSavings, 0).toLocaleString()}/yr total opportunity
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {recommendations.map((rec, i) => {
                  const colors = priorityColors[rec.priority];
                  return (
                    <motion.div
                      key={rec.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.07 }}
                      className={clsx('rounded-2xl border p-5', colors.bg, colors.border)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={clsx('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full', colors.badge)}>
                              {rec.priority}
                            </span>
                            <span className={clsx('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full', difficultyBadge[rec.difficulty])}>
                              {rec.difficulty}
                            </span>
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {rec.timeToImpact}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-gray-800 mt-2">{rec.title}</h4>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{rec.description}</p>
                        </div>
                        <div className="text-right ml-4 flex-shrink-0">
                          <div className="text-lg font-extrabold text-emerald-600">${rec.projectedSavings.toLocaleString()}</div>
                          <div className="text-[10px] text-gray-400">per year</div>
                          <div className="text-xs font-semibold text-emerald-600 mt-1">-{rec.projectedCO2Reduction}t CO2</div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* Right Column: Trend + Top Idle Offenders */}
            <div className="col-span-5 space-y-6">
              {/* Monthly Trend */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.07 }}
                className="bg-white rounded-3xl border border-gray-100 p-7"
              >
                <h3 className="text-base font-bold text-gray-800 mb-4">Monthly Sustainability Trend</h3>
                <div className="space-y-3">
                  {monthlyTrend.map((m, i) => (
                    <div key={m.month} className="flex items-center gap-4 py-2">
                      <div className="w-20 text-xs font-semibold text-gray-500">{m.month}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] text-gray-400">CO2: {m.co2Tons}t</span>
                          <span className="text-[11px] text-gray-400">Score: {m.greenScore}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${m.greenScore}%` }}
                            transition={{ duration: 1, delay: i * 0.2 }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-gray-400">{m.fuelEfficiency} km/L</span>
                          <span className="text-[10px] text-gray-400">{m.idlePercent}% idle</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Top Idle Offenders */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14 }}
                className="bg-white rounded-3xl border border-gray-100 p-7"
              >
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <h3 className="text-base font-bold text-gray-800">Top Idle Offenders</h3>
                </div>
                <div className="space-y-3">
                  {idleWaste.topOffenders.map((offender, i) => (
                    <motion.div
                      key={offender.driverId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.07 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-orange-50/50 border border-orange-100"
                    >
                      <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-700">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-800 truncate">{offender.driverName}</div>
                        <div className="text-[11px] text-gray-400">{offender.idleMinutes} min idle</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-orange-600">{offender.fuelWasted}L</div>
                        <div className="text-[10px] text-gray-400">{offender.co2Produced}kg CO2</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        )}

        {activeTab === 'drivers' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-gray-100 p-7"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-gray-800">Driver Eco-Driving Leaderboard</h3>
                <p className="text-xs text-gray-400 mt-0.5">Ranked by green score: fuel efficiency, low idle, smooth driving</p>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-semibold text-gray-500">{driverGreenRankings.length} drivers</span>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-100">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Rank</th>
                    <th className="px-4 py-3 text-left">Driver</th>
                    <th className="px-4 py-3 text-center">Green Score</th>
                    <th className="px-4 py-3 text-center">Grade</th>
                    <th className="px-4 py-3 text-right">Fuel Eff.</th>
                    <th className="px-4 py-3 text-right">Idle %</th>
                    <th className="px-4 py-3 text-right">Harsh/km</th>
                    <th className="px-4 py-3 text-right">CO2/km</th>
                    <th className="px-4 py-3 text-right">CO2 vs Avg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {driverGreenRankings.map((driver, i) => (
                    <motion.tr
                      key={driver.driverId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="hover:bg-emerald-50/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className={clsx(
                          'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                          i === 0 ? 'bg-amber-100 text-amber-700' :
                          i === 1 ? 'bg-gray-200 text-gray-600' :
                          i === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-50 text-gray-500'
                        )}>
                          {driver.rank}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-gray-800">{driver.driverName}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <MiniBar value={driver.greenScore} max={100} color={driver.greenScore >= 70 ? 'bg-emerald-400' : driver.greenScore >= 50 ? 'bg-amber-400' : 'bg-red-400'} />
                          <span className="text-sm font-bold text-gray-700 w-8 text-right">{driver.greenScore}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={clsx('text-sm font-extrabold', gradeColors[driver.grade] || 'text-gray-600')}>
                          {driver.grade}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-600">{driver.fuelEfficiency} km/L</td>
                      <td className="px-4 py-3 text-right">
                        <span className={clsx('text-sm font-semibold', driver.idlePercent > 15 ? 'text-red-500' : driver.idlePercent > 10 ? 'text-amber-500' : 'text-emerald-500')}>
                          {driver.idlePercent}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-600">{driver.harshEventsPerKm}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-600">{driver.co2PerKm} kg</td>
                      <td className="px-4 py-3 text-right">
                        <span className={clsx('text-sm font-semibold', driver.co2SavedVsAvg >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                          {driver.co2SavedVsAvg >= 0 ? '+' : ''}{driver.co2SavedVsAvg.toFixed(0)} kg
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'ev' && (
          <div className="space-y-6">
            {/* EV Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-3xl border border-emerald-200 p-7"
            >
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <Zap className="w-8 h-8 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">EV Transition Analysis</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    <span className="font-bold text-emerald-600">{evReadiness.totalCandidates} vehicles</span> are strong candidates for EV replacement,
                    potentially saving <span className="font-bold text-emerald-600">${evReadiness.projectedAnnualSavings.toLocaleString()}/year</span> and
                    reducing <span className="font-bold text-emerald-600">{evReadiness.projectedCO2Reduction} tons CO2</span> annually.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* EV Vehicle Cards */}
            <div className="grid grid-cols-2 gap-4">
              {evReadiness.vehicles.map((vehicle, i) => (
                <motion.div
                  key={vehicle.vehicleId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={clsx(
                    'rounded-2xl border p-5',
                    vehicle.readinessScore >= 75 ? 'bg-emerald-50/50 border-emerald-200' :
                    vehicle.readinessScore >= 50 ? 'bg-amber-50/50 border-amber-200' :
                    'bg-white border-gray-100'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-bold text-gray-800">{vehicle.vehicleName}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{vehicle.type} &middot; {vehicle.year}</div>
                    </div>
                    <div className={clsx(
                      'px-2.5 py-1 rounded-full text-xs font-bold',
                      vehicle.readinessScore >= 75 ? 'bg-emerald-100 text-emerald-700' :
                      vehicle.readinessScore >= 50 ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-500'
                    )}>
                      {vehicle.readinessScore}% ready
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mt-3 leading-relaxed">{vehicle.reason}</p>

                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className="bg-white/60 rounded-lg p-2 text-center">
                      <div className="text-sm font-bold text-gray-700">{vehicle.avgDailyDistance} km</div>
                      <div className="text-[9px] text-gray-400 uppercase">Avg daily</div>
                    </div>
                    <div className="bg-white/60 rounded-lg p-2 text-center">
                      <div className="text-sm font-bold text-emerald-600">${vehicle.projectedEVSavings.toLocaleString()}</div>
                      <div className="text-[9px] text-gray-400 uppercase">Savings/yr</div>
                    </div>
                    <div className="bg-white/60 rounded-lg p-2 text-center">
                      <div className="text-sm font-bold text-emerald-600">-{vehicle.co2Reduction}t</div>
                      <div className="text-[9px] text-gray-400 uppercase">CO2/yr</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
