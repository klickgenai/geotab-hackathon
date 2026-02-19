'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import PageHeader from '@/components/layout/PageHeader';
import type { PreShiftRisk, FleetForecast, DriverTrend, DangerousZone } from '@/types/fleet';
import {
  Brain, AlertTriangle, TrendingUp, TrendingDown, Minus, MapPin, Users, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';

const riskColors = {
  low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  elevated: 'bg-amber-100 text-amber-700 border-amber-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  critical: 'bg-red-100 text-red-700 border-red-200',
};

const riskDotColors = {
  low: 'bg-emerald-500',
  elevated: 'bg-amber-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

const trendIcons = {
  improving: <TrendingDown className="w-4 h-4 text-emerald-500" />,
  stable: <Minus className="w-4 h-4 text-gray-400" />,
  declining: <TrendingUp className="w-4 h-4 text-orange-500" />,
  rapidly_declining: <TrendingUp className="w-4 h-4 text-red-500" />,
};

const trendColors = {
  improving: 'text-emerald-600',
  stable: 'text-gray-500',
  declining: 'text-orange-600',
  rapidly_declining: 'text-red-600',
};

export default function PredictivePage() {
  const [risks, setRisks] = useState<PreShiftRisk[]>([]);
  const [forecast, setForecast] = useState<FleetForecast | null>(null);
  const [trends, setTrends] = useState<DriverTrend[]>([]);
  const [corridors, setCorridors] = useState<DangerousZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [r, f, t, c] = await Promise.all([
        api.preShiftRisks(), api.fleetForecast(), api.driverTrends(), api.dangerousCorridors(),
      ]);
      setRisks(r); setForecast(f); setTrends(t); setCorridors(c);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-[#FBAF1A]" />
      </div>
    );
  }

  const criticalRisks = risks.filter((r) => r.riskLevel === 'critical' || r.riskLevel === 'high');

  return (
    <>
      <PageHeader title="Predictive Safety" subtitle="Pre-shift risk intelligence & driver trends" onRefresh={load} />

      <div className="p-8 space-y-8 max-w-[1520px]">
        {/* Forecast Banner */}
        {forecast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-[#18202F] to-[#2D3748] rounded-2xl p-6 text-white"
          >
            <div className="grid grid-cols-4 gap-6">
              <div>
                <div className="text-[#FBAF1A]/70 text-xs font-medium uppercase tracking-wider">High Risk Today</div>
                <div className="text-3xl font-bold mt-1">{forecast.highRiskDrivers}</div>
                <div className="text-white/50 text-xs">drivers need attention</div>
              </div>
              <div>
                <div className="text-[#FBAF1A]/70 text-xs font-medium uppercase tracking-wider">Predicted Events</div>
                <div className="text-3xl font-bold mt-1">{forecast.predictedEventsThisWeek}</div>
                <div className="text-white/50 text-xs">this week forecast</div>
              </div>
              <div>
                <div className="text-[#FBAF1A]/70 text-xs font-medium uppercase tracking-wider">Top Risk Factor</div>
                <div className="text-lg font-bold mt-2">{forecast.topRiskFactors[0] || 'None'}</div>
                <div className="text-white/50 text-xs">fleet-wide</div>
              </div>
              <div>
                <div className="text-[#FBAF1A]/70 text-xs font-medium uppercase tracking-wider">Fleet Status</div>
                <div className={`text-lg font-bold mt-2 ${criticalRisks.length === 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {criticalRisks.length === 0 ? 'All Clear' : `${criticalRisks.length} At Risk`}
                </div>
                <div className="text-white/50 text-xs">
                  {risks.length} drivers assessed
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-12 gap-6">
          {/* Pre-Shift Risk Scores */}
          <div className="col-span-8">
            <div className="bg-white rounded-2xl border border-[#E5E2DC] p-6">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-4 h-4 text-[#BF7408]" />
                <h2 className="text-lg font-bold text-gray-900">Pre-Shift Risk Scores</h2>
                <span className="ml-auto text-xs text-gray-400">{risks.length} drivers</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {risks.slice(0, 12).map((risk, i) => (
                  <motion.div
                    key={risk.driverId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border border-[#F0EDE7] rounded-lg p-3 hover:border-[#E5E2DC] transition-colors cursor-pointer"
                    onClick={() => setExpandedDriver(expandedDriver === risk.driverId ? null : risk.driverId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${riskDotColors[risk.riskLevel]}`} />
                        <span className="text-sm font-medium text-gray-900">{risk.driverName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${riskColors[risk.riskLevel]}`}>
                          {risk.riskScore}
                        </span>
                        {expandedDriver === risk.driverId ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
                      </div>
                    </div>
                    {expandedDriver === risk.driverId && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-3 space-y-2">
                        {risk.factors.map((f) => (
                          <div key={f.name} className="text-xs">
                            <div className="flex justify-between text-gray-600">
                              <span>{f.name}</span>
                              <span className="font-medium">{f.impact}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-0.5">
                              <div
                                className={`h-1.5 rounded-full ${f.impact > 20 ? 'bg-red-400' : f.impact > 10 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                                style={{ width: `${Math.min(100, (f.impact / 30) * 100)}%` }}
                              />
                            </div>
                            <div className="text-gray-400 text-xs mt-0.5">{f.description}</div>
                          </div>
                        ))}
                        <div className="text-xs text-[#BF7408] font-medium bg-[#FFF8EB] rounded-lg p-2 mt-2">
                          {risk.recommendation}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Forecast Recommendations */}
          <div className="col-span-4 space-y-6">
            {forecast && (
              <div className="bg-white rounded-2xl border border-[#E5E2DC] p-6">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <h2 className="text-lg font-bold text-gray-900">Recommendations</h2>
                </div>
                <div className="space-y-2.5">
                  {forecast.recommendations.map((rec, i) => (
                    <div key={i} className="flex gap-2 text-sm text-gray-700">
                      <div className="w-1 rounded-full bg-[#FBAF1A] flex-shrink-0 mt-0.5" style={{ minHeight: '1rem' }} />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dangerous Corridors */}
            <div className="bg-white rounded-2xl border border-[#E5E2DC] p-6">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-red-500" />
                <h2 className="text-lg font-bold text-gray-900">Dangerous Corridors</h2>
              </div>
              <div className="space-y-2.5">
                {corridors.slice(0, 5).map((zone) => (
                  <div key={zone.id} className="p-2.5 bg-red-50/50 rounded-lg border border-red-100">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-gray-800">Zone {zone.id.split('_')[1]}</span>
                      <span className="text-xs font-bold text-red-600">{zone.eventCount} events</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Top: {zone.topEventType.replace(/_/g, ' ')} | {zone.affectedDrivers.length} drivers
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Driver Deterioration Trends */}
        <div className="bg-white rounded-2xl border border-[#E5E2DC] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-[#BF7408]" />
            <h2 className="text-lg font-bold text-gray-900">Driver Deterioration Trends</h2>
            <span className="text-xs text-gray-400 ml-1">Week-over-week comparison</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#F0EDE7]">
                  <th className="text-left text-xs font-semibold text-gray-500 pb-2 pr-4">Driver</th>
                  <th className="text-left text-xs font-semibold text-gray-500 pb-2 pr-4">Trend</th>
                  <th className="text-right text-xs font-semibold text-gray-500 pb-2 pr-4">WoW Change</th>
                  <th className="text-left text-xs font-semibold text-gray-500 pb-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {trends.slice(0, 15).map((trend, i) => (
                  <motion.tr
                    key={trend.driverId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-gray-50 hover:bg-[#FFF8EB]/50"
                  >
                    <td className="py-2.5 pr-4 text-sm font-medium text-gray-900">{trend.driverName}</td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-1.5">
                        {trendIcons[trend.trendDirection]}
                        <span className={`text-xs font-medium capitalize ${trendColors[trend.trendDirection]}`}>
                          {trend.trendDirection.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className={`py-2.5 pr-4 text-right text-sm font-semibold ${
                      trend.weekOverWeekChange > 0 ? 'text-red-600' : trend.weekOverWeekChange < 0 ? 'text-emerald-600' : 'text-gray-400'
                    }`}>
                      {trend.weekOverWeekChange > 0 ? '+' : ''}{trend.weekOverWeekChange}%
                    </td>
                    <td className="py-2.5 text-xs text-gray-500 max-w-[400px] truncate">{trend.details}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
