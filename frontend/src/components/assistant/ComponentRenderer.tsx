'use client';

import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { ForecastMini, AlertMini, RiskDriverMini, ROIMini } from './MiniCards';

// Lazy-load the dashboard components
const ScoreCard = dynamic(() => import('@/components/dashboard/ScoreCard'), { ssr: false });
const KPICards = dynamic(() => import('@/components/dashboard/KPICards'), { ssr: false });
const WellnessCard = dynamic(() => import('@/components/dashboard/WellnessCard'), { ssr: false });
const FinancialCard = dynamic(() => import('@/components/dashboard/FinancialCard'), { ssr: false });

/**
 * Maps tool names to a renderer function.
 * Each renderer receives the raw tool result and returns a React element.
 */
const toolRenderers: Record<string, (result: any) => React.ReactNode> = {
  getFleetInsuranceScore: (result) => {
    // The tool result may have full InsuranceScore shape or a partial one
    if (!result.overallScore && !result.grade) return null;
    // Ensure we have the components for ScoreCard; if partial, render a mini version
    if (!result.components) {
      return (
        <div className="bg-gradient-to-br from-[#18202F] to-[#2D3748] rounded-2xl p-5 text-white">
          <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Insurance Score</div>
          <div className="flex items-center gap-4">
            <div className="text-5xl font-mono font-extrabold">{result.overallScore}</div>
            <div>
              <span className="px-2.5 py-1 rounded text-sm font-bold bg-emerald-500/20 text-emerald-400">{result.grade}</span>
              <div className="text-sm text-white/60 mt-1">Trend: {result.trend}</div>
              {result.premiumImpact && (
                <div className="text-sm text-emerald-400 font-semibold mt-0.5">
                  Saving ${result.premiumImpact.estimatedAnnualSavings?.toLocaleString()}/yr
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
    return <ScoreCard score={result} />;
  },

  getFleetOverview: (result) => {
    if (!result.totalVehicles) return null;
    // KPICards needs both overview and score. We'll render a simplified KPI grid.
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Vehicles', value: result.totalVehicles, sub: `${result.activeVehicles} active` },
          { label: 'Drivers', value: result.totalDrivers, sub: `${result.activeDrivers} on route` },
          { label: 'Safety Events', value: result.totalSafetyEvents, sub: `${(result.eventsPerThousandMiles ?? (result.eventsPerMile * 1000)).toFixed(1)}/1K mi` },
          { label: 'Avg Score', value: result.avgSafetyScore, sub: `30-day period` },
        ].map((card) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-[#E5E2DC] px-4 py-3 shadow-sm"
          >
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{card.label}</div>
            <div className="text-2xl font-mono font-extrabold tracking-tight mt-1">{card.value?.toLocaleString()}</div>
            <div className="text-xs text-gray-400 mt-0.5">{card.sub}</div>
          </motion.div>
        ))}
      </div>
    );
  },

  getDriverWellness: (result) => {
    // Fleet-wide summary
    if (result.totalDrivers !== undefined && result.highBurnoutRisk !== undefined) {
      return <WellnessCard wellness={result} onDriverClick={() => {}} />;
    }
    // Individual driver wellness
    if (result.driverName) {
      const burnoutColor = result.burnoutRisk === 'high' ? 'text-red-400' : result.burnoutRisk === 'moderate' ? 'text-amber-400' : 'text-emerald-400';
      return (
        <motion.div {...{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }} className="bg-gradient-to-br from-[#18202F] to-[#2D3748] rounded-2xl p-5 text-white">
          <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Driver Wellness</div>
          <div className="flex items-center gap-4 mb-3">
            <div>
              <div className="text-lg font-semibold">{result.driverName}</div>
              <span className={`text-sm font-bold ${burnoutColor}`}>{result.burnoutRisk} burnout risk</span>
            </div>
            <div className="ml-auto text-right">
              <div className="text-3xl font-mono font-extrabold">{result.overallWellnessScore}</div>
              <div className="text-[10px] text-white/40">Wellness Score</div>
            </div>
          </div>
          {result.signals && result.signals.length > 0 && (
            <div className="space-y-1">
              {result.signals.filter((s: any) => s.severity !== 'normal').slice(0, 3).map((sig: any, i: number) => (
                <div key={i} className={`px-2.5 py-1.5 rounded-lg text-xs ${
                  sig.severity === 'critical' ? 'bg-red-500/10 text-red-300' : 'bg-amber-500/10 text-amber-300'
                }`}>
                  {sig.description}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      );
    }
    // All drivers wellness list
    if (result.drivers) {
      return (
        <motion.div {...{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }} className="bg-gradient-to-br from-[#18202F] to-[#2D3748] rounded-2xl p-5 text-white">
          <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Driver Wellness ({result.totalDrivers} drivers)</div>
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {result.drivers.slice(0, 8).map((d: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-2.5 py-1.5 bg-white/[0.05] rounded-lg">
                <span className="text-sm">{d.driverName}</span>
                <span className={`text-xs font-bold ${
                  d.burnoutRisk === 'high' ? 'text-red-400' : d.burnoutRisk === 'moderate' ? 'text-amber-400' : 'text-emerald-400'
                }`}>{d.burnoutRisk}</span>
              </div>
            ))}
          </div>
        </motion.div>
      );
    }
    return null;
  },

  getFinancialImpact: (result) => {
    // The financial impact tool returns a complex object
    return <ROIMini data={result} />;
  },

  getFleetForecast: (result) => {
    return <ForecastMini data={result} />;
  },

  getAlertBriefing: (result) => {
    return <AlertMini data={result} />;
  },

  getDriverRiskScore: (result) => {
    // Could be a single driver or multiple
    if (result.driverName) {
      return <RiskDriverMini data={result} />;
    }
    // Multiple drivers
    if (result.drivers) {
      return (
        <motion.div {...{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }} className="bg-gradient-to-br from-[#18202F] to-[#2D3748] rounded-2xl p-5 text-white">
          <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Driver Risk Scores</div>
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {result.drivers.slice(0, 8).map((d: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-2.5 py-1.5 bg-white/[0.05] rounded-lg">
                <span className="text-sm">{d.driverName}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                    d.tier === 'critical' ? 'bg-red-500/20 text-red-400' : d.tier === 'high' ? 'bg-amber-500/20 text-amber-400' : d.tier === 'moderate' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>{d.tier}</span>
                  <span className="text-sm font-mono font-bold">{d.riskScore}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      );
    }
    return null;
  },

  getCoachingRecommendations: (result) => {
    const recs = result.recommendations || result;
    if (!Array.isArray(recs) && !recs?.recommendations) return null;
    const items = Array.isArray(recs) ? recs : recs.recommendations;
    return (
      <motion.div {...{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }} className="bg-gradient-to-br from-[#18202F] to-[#2D3748] rounded-2xl p-5 text-white">
        <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Coaching Recommendations</div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {items.slice(0, 5).map((rec: any, i: number) => (
            <div key={i} className="px-3 py-2 bg-white/[0.05] rounded-lg">
              <div className="text-sm font-semibold">{rec.title || rec.action || rec}</div>
              {rec.expectedImpact && <div className="text-xs text-emerald-400 mt-0.5">{rec.expectedImpact}</div>}
              {rec.driver && <div className="text-xs text-white/40 mt-0.5">Driver: {rec.driver}</div>}
            </div>
          ))}
        </div>
      </motion.div>
    );
  },

  getPreShiftRisk: (result) => {
    // Single driver
    if (result.driverName && result.riskScore !== undefined) {
      const levelColor = result.riskLevel === 'critical' ? 'text-red-400' : result.riskLevel === 'high' ? 'text-amber-400' : result.riskLevel === 'elevated' ? 'text-yellow-400' : 'text-emerald-400';
      return (
        <motion.div {...{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }} className="bg-gradient-to-br from-[#18202F] to-[#2D3748] rounded-2xl p-5 text-white">
          <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Pre-Shift Risk</div>
          <div className="flex items-center gap-4 mb-3">
            <div>
              <div className="text-lg font-semibold">{result.driverName}</div>
              <span className={`text-sm font-bold ${levelColor}`}>{result.riskLevel}</span>
            </div>
            <div className="ml-auto text-3xl font-mono font-extrabold">{result.riskScore}</div>
          </div>
          {result.recommendation && (
            <div className="px-3 py-2 bg-amber-500/10 rounded-lg text-xs text-amber-300">{result.recommendation}</div>
          )}
        </motion.div>
      );
    }
    // Multiple drivers
    if (result.drivers) {
      return (
        <motion.div {...{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }} className="bg-gradient-to-br from-[#18202F] to-[#2D3748] rounded-2xl p-5 text-white">
          <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Pre-Shift Risk ({result.highRiskCount} high risk)</div>
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {result.drivers.slice(0, 8).map((d: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-2.5 py-1.5 bg-white/[0.05] rounded-lg">
                <span className="text-sm">{d.driverName}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${
                    d.riskLevel === 'critical' ? 'text-red-400' : d.riskLevel === 'high' ? 'text-amber-400' : 'text-emerald-400'
                  }`}>{d.riskLevel}</span>
                  <span className="text-sm font-mono font-bold">{d.riskScore}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      );
    }
    return null;
  },

  getFleetComparison: (result) => {
    if (!result) return null;
    return (
      <motion.div {...{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }} className="bg-gradient-to-br from-[#18202F] to-[#2D3748] rounded-2xl p-5 text-white">
        <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Fleet Comparison</div>
        <div className="space-y-2">
          {Object.entries(result).slice(0, 6).map(([key, val]: [string, any]) => (
            <div key={key} className="flex items-center justify-between px-2.5 py-1.5 bg-white/[0.05] rounded-lg">
              <span className="text-xs text-white/60">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              <span className="text-sm font-mono font-bold">{typeof val === 'number' ? val.toLocaleString() : String(val)}</span>
            </div>
          ))}
        </div>
      </motion.div>
    );
  },

  generateContextReport: (result) => {
    if (!result?.filename) return null;
    return (
      <div className="bg-gradient-to-br from-[#18202F] to-[#2D3748] rounded-2xl p-5 text-white">
        <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Report Generated</div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{result.title || result.filename}</div>
            <div className="text-xs text-white/40 mt-0.5">
              {result.generatedAt ? new Date(result.generatedAt).toLocaleString() : 'Just now'}
            </div>
          </div>
          <a
            href={result.downloadUrl}
            download={result.filename}
            className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-sm font-semibold rounded-lg transition-colors"
          >
            Download PDF
          </a>
        </div>
      </div>
    );
  },
};

interface ComponentRendererProps {
  toolName: string;
  result: any;
}

export default function ComponentRenderer({ toolName, result }: ComponentRendererProps) {
  const renderer = toolRenderers[toolName];
  let rendered = renderer ? renderer(result) : null;

  // Generic fallback for unmapped tools
  if (!rendered && result && typeof result === 'object') {
    const entries = Object.entries(result).filter(
      ([, v]) => v !== null && v !== undefined && typeof v !== 'object'
    ).slice(0, 5);
    if (entries.length > 0) {
      const displayName = toolName
        .replace(/^get/, '')
        .replace(/([A-Z])/g, ' $1')
        .trim();
      rendered = (
        <div className="bg-gradient-to-br from-[#18202F] to-[#2D3748] rounded-2xl p-5 text-white">
          <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">{displayName}</div>
          <div className="space-y-1.5">
            {entries.map(([key, val]) => (
              <div key={key} className="flex items-center justify-between px-2.5 py-1.5 bg-white/[0.05] rounded-lg">
                <span className="text-xs text-white/60">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                <span className="text-sm font-mono font-bold">
                  {typeof val === 'number' ? val.toLocaleString() : String(val)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
  }

  if (!rendered) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
      className="w-full my-2"
    >
      {rendered}
    </motion.div>
  );
}
