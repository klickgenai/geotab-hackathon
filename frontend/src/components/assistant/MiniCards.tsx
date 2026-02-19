'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertTriangle, Shield, Activity, Users, DollarSign } from 'lucide-react';

const cardAnimation = {
  initial: { opacity: 0, y: 12, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.4, ease: [0.22, 0.61, 0.36, 1] as const },
};

/* ---------- Forecast Mini ---------- */
export function ForecastMini({ data }: { data: any }) {
  const forecast = data;
  const riskLevel = forecast.highRiskDrivers > 5 ? 'High' : forecast.highRiskDrivers > 2 ? 'Moderate' : 'Low';
  const riskColor = riskLevel === 'High' ? 'text-red-400' : riskLevel === 'Moderate' ? 'text-amber-400' : 'text-emerald-400';

  return (
    <motion.div {...cardAnimation} className="bg-gradient-to-br from-[#18202F] to-[#2D3748] rounded-2xl p-5 text-white">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
          <Activity className="w-4 h-4 text-indigo-400" />
        </div>
        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Fleet Forecast</h3>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="text-center">
          <div className={`text-2xl font-mono font-extrabold ${riskColor}`}>{riskLevel}</div>
          <div className="text-[10px] text-white/40 mt-0.5">Risk Level</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-mono font-extrabold text-white">{forecast.predictedEventsThisWeek ?? forecast.predictedEvents ?? '—'}</div>
          <div className="text-[10px] text-white/40 mt-0.5">Predicted Events</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-mono font-extrabold text-amber-400">{forecast.highRiskDrivers}</div>
          <div className="text-[10px] text-white/40 mt-0.5">High Risk Drivers</div>
        </div>
      </div>
      {forecast.topRiskFactors && forecast.topRiskFactors.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {forecast.topRiskFactors.slice(0, 3).map((f: string, i: number) => (
            <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.08] text-white/60">{f}</span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ---------- Alert Mini ---------- */
export function AlertMini({ data }: { data: any }) {
  const briefing = data;
  return (
    <motion.div {...cardAnimation} className="bg-gradient-to-br from-[#18202F] to-[#2D3748] rounded-2xl p-5 text-white">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-red-400" />
        </div>
        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Alert Briefing</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-red-500/10 rounded-lg p-3 text-center">
          <div className="text-2xl font-mono font-extrabold text-red-400">{briefing.criticalCount}</div>
          <div className="text-[10px] text-white/40 mt-0.5">Critical</div>
        </div>
        <div className="bg-amber-500/10 rounded-lg p-3 text-center">
          <div className="text-2xl font-mono font-extrabold text-amber-400">{briefing.highCount}</div>
          <div className="text-[10px] text-white/40 mt-0.5">High Priority</div>
        </div>
      </div>
      {briefing.topAlerts && briefing.topAlerts.length > 0 && (
        <div className="space-y-1.5">
          {briefing.topAlerts.slice(0, 3).map((alert: any, i: number) => (
            <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-white/[0.05] rounded-lg">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                alert.priority === 'critical' ? 'bg-red-400' : alert.priority === 'high' ? 'bg-amber-400' : 'bg-blue-400'
              }`} />
              <span className="text-xs text-white/70 truncate">{alert.title}</span>
            </div>
          ))}
        </div>
      )}
      {briefing.fleetRiskSummary && (
        <p className="text-xs text-white/40 mt-3 leading-relaxed">{briefing.fleetRiskSummary}</p>
      )}
    </motion.div>
  );
}

/* ---------- Risk Driver Mini ---------- */
export function RiskDriverMini({ data }: { data: any }) {
  const driver = data;
  const tierColor = driver.tier === 'critical' ? 'text-red-400' : driver.tier === 'high' ? 'text-amber-400' : driver.tier === 'moderate' ? 'text-yellow-400' : 'text-emerald-400';
  const tierBg = driver.tier === 'critical' ? 'bg-red-500/10' : driver.tier === 'high' ? 'bg-amber-500/10' : driver.tier === 'moderate' ? 'bg-yellow-500/10' : 'bg-emerald-500/10';

  return (
    <motion.div {...cardAnimation} className="bg-gradient-to-br from-[#18202F] to-[#2D3748] rounded-2xl p-5 text-white">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
          <Users className="w-4 h-4 text-amber-400" />
        </div>
        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Driver Risk</h3>
      </div>
      <div className="flex items-center gap-4 mb-3">
        <div>
          <div className="text-lg font-semibold">{driver.driverName}</div>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${tierBg} ${tierColor}`}>
            {driver.tier}
          </span>
        </div>
        <div className="ml-auto text-right">
          <div className="text-3xl font-mono font-extrabold">{driver.riskScore}</div>
          <div className="text-[10px] text-white/40">Risk Score</div>
        </div>
      </div>
      {driver.annualizedCost && (
        <div className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 rounded-lg mb-2">
          <DollarSign className="w-3.5 h-3.5 text-red-400" />
          <span className="text-xs text-red-300 font-semibold">${driver.annualizedCost.toLocaleString()}/yr annualized cost</span>
        </div>
      )}
      {driver.topEventTypes && driver.topEventTypes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {driver.topEventTypes.slice(0, 3).map((evt: any, i: number) => (
            <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.08] text-white/60">
              {evt.type?.replace(/_/g, ' ')} ({evt.count})
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ---------- ROI Mini ---------- */
export function ROIMini({ data }: { data: any }) {
  const roi = data;
  const totalSavings = roi.totalAnnualSavings || roi.total?.annualSavings || 0;
  const roiPercent = roi.roiPercent || roi.roi?.percent || 0;

  const categories = [
    { label: 'Insurance', value: roi.insurancePremiumSavings || roi.insurance?.annualSavings || 0, color: 'bg-emerald-500' },
    { label: 'Accidents', value: roi.accidentPreventionSavings || roi.accidents?.savings || 0, color: 'bg-amber-500' },
    { label: 'Retention', value: roi.retentionSavings || roi.retention?.projectedSavings || 0, color: 'bg-indigo-500' },
    { label: 'Fuel', value: roi.fuelSavings || roi.fuel?.savings || 0, color: 'bg-blue-500' },
  ].filter(c => c.value > 0);

  const maxVal = Math.max(...categories.map(c => c.value), 1);

  return (
    <motion.div {...cardAnimation} className="bg-gradient-to-br from-[#18202F] to-[#2D3748] rounded-2xl p-5 text-white">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
        </div>
        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Financial Impact</h3>
      </div>
      <div className="text-center mb-4">
        <div className="text-3xl font-mono font-extrabold text-emerald-400">${totalSavings.toLocaleString()}</div>
        <div className="text-[10px] text-white/40 mt-0.5">Total Annual Savings</div>
      </div>
      {roiPercent > 0 && (
        <div className="flex items-center justify-center gap-1.5 mb-3">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-sm font-bold text-emerald-400">{roiPercent}% ROI</span>
        </div>
      )}
      <div className="space-y-2">
        {categories.map((cat, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span className="text-[10px] text-white/50 w-16 shrink-0">{cat.label}</span>
            <div className="flex-1 h-2 bg-white/[0.08] rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${cat.color}`}
                initial={{ width: 0 }}
                animate={{ width: `${(cat.value / maxVal) * 100}%` }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
              />
            </div>
            <span className="text-[10px] font-semibold text-white/70 w-16 text-right">${(cat.value / 1000).toFixed(0)}K</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
