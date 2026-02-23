'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import PageHeader from '@/components/layout/PageHeader';
import type { FleetROI, BeforeAfterComparison, WhatIfScenario, WhatIfResult } from '@/types/fleet';
import {
  DollarSign, TrendingUp, TrendingDown, Shield, Fuel, Users, Zap, Calculator,
  Loader2, ArrowRight, ChevronDown,
} from 'lucide-react';
import { InsightTooltip } from '@/components/ui/InsightTooltip';
import { MethodologyPanel } from '@/components/ui/MethodologyPanel';

function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    const duration = 1500;
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
  }, [value]);

  return <>{prefix}{display.toLocaleString()}{suffix}</>;
}

const savingsIcons: Record<string, React.ReactNode> = {
  insurance: <Shield className="w-5 h-5 text-blue-500" />,
  accident: <Zap className="w-5 h-5 text-red-500" />,
  fuel: <Fuel className="w-5 h-5 text-amber-500" />,
  retention: <Users className="w-5 h-5 text-purple-500" />,
  productivity: <TrendingUp className="w-5 h-5 text-emerald-500" />,
};

export default function ROIPage() {
  const [roi, setROI] = useState<FleetROI | null>(null);
  const [beforeAfter, setBeforeAfter] = useState<BeforeAfterComparison | null>(null);
  const [scenarios, setScenarios] = useState<WhatIfScenario[]>([]);
  const [whatIfResults, setWhatIfResults] = useState<WhatIfResult[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [retention, setRetention] = useState<{ driversAtRisk: number; totalRetentionCostAtRisk: number; projectedSavings: number; details: { driverId: string; driverName: string; burnoutRisk: string; retentionCost: number }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, ba, sc, ret] = await Promise.all([
        api.fleetROI(), api.beforeAfter(), api.whatIfDefaults(), api.retentionSavings(),
      ]);
      setROI(r); setBeforeAfter(ba); setScenarios(sc); setRetention(ret);
      if (sc.length > 0) {
        const results = await api.whatIfSimulate(sc);
        setWhatIfResults(results);
        setSelectedScenario(sc[0].id);
      }
    } catch { setError('Failed to load ROI data. Please check that the backend is running.'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading || !roi) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-[#FBAF1A]" />
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
  const savingsBreakdown = [
    { key: 'insurance', label: 'Insurance Premium', value: roi.insurancePremiumSavings, tooltipKey: 'roi.insuranceSavings' },
    { key: 'accident', label: 'Accident Prevention', value: roi.accidentPreventionSavings, tooltipKey: 'roi.claimsSavings' },
    { key: 'fuel', label: 'Fuel Savings', value: roi.fuelSavings, tooltipKey: 'roi.fuelSavings' },
    { key: 'retention', label: 'Driver Retention', value: roi.retentionSavings, tooltipKey: 'roi.retentionSavings' },
    { key: 'productivity', label: 'Productivity', value: roi.productivityGains, tooltipKey: 'roi.complianceSavings' },
  ];
  const maxSaving = Math.max(...savingsBreakdown.map((s) => s.value));

  return (
    <>
      <PageHeader title="ROI Dashboard" subtitle="Quantified value of your safety investment" onRefresh={load} />

      <div className="p-6 space-y-6">
        {/* Hero Banner */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#18202F] to-[#2D3748] rounded-2xl p-6 text-white">
          <div className="grid grid-cols-4 gap-6 items-center">
            <div className="col-span-1">
              <div className="text-[#FBAF1A]/70 text-xs uppercase tracking-wider font-medium flex items-center gap-1">Total Annual Savings <InsightTooltip metricKey="roi.annualSavings" variant="dark" position="bottom" /></div>
              <div className="text-4xl font-extrabold mt-1 text-emerald-300">
                <AnimatedNumber value={roi.totalAnnualSavings} prefix="$" />
              </div>
              <div className="text-white/50 text-xs mt-1">vs. investment of ${roi.investmentCost.toLocaleString()}</div>
            </div>
            <div className="text-center">
              <div className="text-[#FBAF1A]/70 text-xs uppercase tracking-wider font-medium flex items-center gap-1 justify-center">ROI <InsightTooltip metricKey="roi.roiPercent" variant="dark" position="bottom" /></div>
              <div className="text-3xl font-bold mt-1">{roi.roiPercent}%</div>
              <div className="text-white/50 text-xs">return on investment</div>
            </div>
            <div className="text-center">
              <div className="text-[#FBAF1A]/70 text-xs uppercase tracking-wider font-medium flex items-center gap-1 justify-center">Payback Period <InsightTooltip metricKey="roi.paybackMonths" variant="dark" position="bottom" /></div>
              <div className="text-3xl font-bold mt-1">{roi.paybackMonths}<span className="text-lg"> mo</span></div>
              <div className="text-white/50 text-xs">to break even</div>
            </div>
            <div className="text-center">
              <div className="text-[#FBAF1A]/70 text-xs uppercase tracking-wider font-medium flex items-center gap-1 justify-center">3-Year Value <InsightTooltip metricKey="roi.costPerDriver" variant="dark" position="bottom" /></div>
              <div className="text-3xl font-bold mt-1 text-emerald-300">${Math.round(roi.projectedThreeYearValue / 1000)}K</div>
              <div className="text-white/50 text-xs">projected net value</div>
            </div>
          </div>
        </motion.div>

        {/* Savings Breakdown */}
        <div className="bg-white rounded-2xl border border-[#E5E2DC] p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            Savings Breakdown
          </h2>
          <div className="space-y-3">
            {savingsBreakdown.map((item, i) => (
              <motion.div key={item.key} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3">
                <div className="w-8">{savingsIcons[item.key]}</div>
                <div className="w-36 text-sm font-medium text-gray-700 flex items-center gap-1">{item.label} <InsightTooltip metricKey={item.tooltipKey} /></div>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full h-6">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${maxSaving > 0 ? (item.value / maxSaving) * 100 : 0}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                      className="h-6 rounded-full bg-gradient-to-r from-[#FBAF1A] to-emerald-400"
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-700 whitespace-nowrap">${item.value.toLocaleString()}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Before / After */}
          {beforeAfter && (
            <div className="col-span-7 bg-white rounded-2xl border border-[#E5E2DC] p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#BF7408]" />
                Before / After Comparison
                <InsightTooltip metricKey="roi.beforeAfter" />
              </h2>
              <div className="text-xs text-gray-400 mb-3">
                {beforeAfter.periods[0].label} vs {beforeAfter.periods[1].label}
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#F0EDE7]">
                    <th className="text-left text-xs font-semibold text-gray-500 pb-2">Metric</th>
                    <th className="text-right text-xs font-semibold text-gray-500 pb-2">Before</th>
                    <th className="text-right text-xs font-semibold text-gray-500 pb-2">After</th>
                    <th className="text-right text-xs font-semibold text-gray-500 pb-2">Change</th>
                    <th className="text-right text-xs font-semibold text-gray-500 pb-2">$ Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {beforeAfter.metrics.map((m) => {
                    const improved = m.name === 'Avg Safety Score' ? m.change > 0 : m.change < 0;
                    return (
                      <tr key={m.name} className="border-b border-gray-50">
                        <td className="py-2 text-sm text-gray-700 font-medium">{m.name}</td>
                        <td className="py-2 text-right text-sm text-gray-500">{m.before.toLocaleString()}</td>
                        <td className="py-2 text-right text-sm text-gray-900 font-medium">{m.after.toLocaleString()}</td>
                        <td className={`py-2 text-right text-sm font-semibold ${improved ? 'text-emerald-600' : 'text-red-500'}`}>
                          <span className="inline-flex items-center gap-1">
                            {improved ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                            {m.changePercent > 0 ? '+' : ''}{m.changePercent}%
                          </span>
                        </td>
                        <td className="py-2 text-right text-sm font-semibold text-emerald-600">
                          ${m.dollarImpact.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* What-If Simulator */}
          <div className="col-span-5 bg-white rounded-2xl border border-[#E5E2DC] p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#BF7408]" />
              What-If Simulator
            </h2>
            <div className="relative mb-4">
              <select
                value={selectedScenario}
                onChange={(e) => setSelectedScenario(e.target.value)}
                className="w-full bg-[#F5F3EF] border border-[#E5E2DC] rounded-lg px-3 py-2.5 text-sm text-gray-800 appearance-none pr-8 focus:outline-none focus:border-[#FBAF1A]"
              >
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {selectedResult && (
              <motion.div key={selectedResult.scenarioId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex items-center justify-center gap-3 py-3">
                  <div className="text-center">
                    <div className="text-xs text-gray-400 uppercase">Current</div>
                    <div className="text-2xl font-bold text-gray-400">{selectedResult.currentScore}</div>
                    <div className="text-xs text-gray-400">{selectedResult.currentGrade}</div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-[#FBAF1A]" />
                  <div className="text-center">
                    <div className="text-xs text-emerald-600 uppercase font-medium">Projected</div>
                    <div className="text-2xl font-bold text-emerald-600">{selectedResult.projectedScore}</div>
                    <div className="text-xs text-emerald-600">{selectedResult.projectedGrade}</div>
                  </div>
                </div>

                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-emerald-600 uppercase font-medium">Annual Premium Savings</div>
                  <div className="text-2xl font-extrabold text-emerald-600">${selectedResult.annualSavings.toLocaleString()}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#F5F3EF] rounded p-2">
                    <span className="text-gray-500">Difficulty: </span>
                    <span className={`font-semibold ${
                      selectedResult.implementationDifficulty === 'easy' ? 'text-emerald-600' :
                      selectedResult.implementationDifficulty === 'moderate' ? 'text-amber-600' : 'text-red-600'
                    }`}>{selectedResult.implementationDifficulty}</span>
                  </div>
                  <div className="bg-[#F5F3EF] rounded p-2">
                    <span className="text-gray-500">Timeline: </span>
                    <span className="font-semibold text-gray-700">{selectedResult.timeToImpact}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {selectedResult.recommendations.map((r, i) => (
                    <div key={i} className="text-xs text-gray-600 flex gap-1.5">
                      <span className="text-[#BF7408]">&#8226;</span> {r}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Retention Risk Table */}
        {retention && retention.details.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#E5E2DC] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-500" />
                Retention Risk
              </h2>
              <div className="bg-purple-50 rounded-lg px-3 py-1.5 text-sm">
                <span className="text-purple-600 font-bold">
                  Intervening now could save ${retention.projectedSavings.toLocaleString()}
                </span>
              </div>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#F0EDE7]">
                  <th className="text-left text-xs font-semibold text-gray-500 pb-2">Driver</th>
                  <th className="text-left text-xs font-semibold text-gray-500 pb-2">Burnout Risk</th>
                  <th className="text-right text-xs font-semibold text-gray-500 pb-2">Retention Cost at Risk</th>
                </tr>
              </thead>
              <tbody>
                {retention.details.map((d) => (
                  <tr key={d.driverId} className="border-b border-gray-50">
                    <td className="py-2 text-sm font-medium text-gray-900">{d.driverName}</td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        d.burnoutRisk === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>{d.burnoutRisk}</span>
                    </td>
                    <td className="py-2 text-right text-sm font-bold text-red-600">
                      ${d.retentionCost.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Methodology Panel */}
        <MethodologyPanel
          title="How We Calculate ROI"
          description="All savings figures represent potential cost avoidance based on industry benchmarks and your fleet's telematics data. These are not guaranteed refunds but statistically projected savings from preventing costly events."
          formulas={[
            {
              label: 'Insurance Premium Savings',
              formula: 'savings = (insurance_score - 50) x 0.3% x benchmark_premium',
              example: 'Score 72 with 25 vehicles: (72-50) x 0.003 x (25 x $14,200) = $23,430/yr',
              source: 'Industry avg: $14,200/vehicle/yr for Class 8 commercial',
            },
            {
              label: 'Accident Prevention',
              formula: 'savings = (high_severity_reduction / 200) x $91,000 avg_accident_cost',
              example: '10 fewer high-severity events/45 days, annualized = 81/yr. 81/200 = 0.4 prevented accidents. 0.4 x $91K = $36,400',
              source: 'FMCSA/NHTSA: $91K avg accident cost; 0.5% event-to-crash ratio',
            },
            {
              label: 'Fuel Savings (Idle Reduction)',
              formula: 'savings = vehicles x 365 x 0.8 gal/hr x (current_idle% - target_idle%) x $3.85/gal',
              example: '25 vehicles, 13.1% idle to 8% target: 25 x 365 x 0.8 x 5.1% x $3.85 = ~$14,300/yr',
              source: 'OEM spec: 0.8 gal/hr idle burn; EIA: $3.85/gal diesel avg',
            },
            {
              label: 'Driver Retention',
              formula: 'savings = SUM(burnout_probability x $35,000) x 65% intervention_success_rate',
              example: '5 at-risk drivers avg 70% burnout: 5 x $24,500 = $122K at risk. $122K x 65% = $79,625 saved',
              source: 'ATA: $35K replacement cost; DOT: 60-75% wellness intervention success',
            },
            {
              label: 'Productivity Gains',
              formula: 'savings = prevented_events x $150/event (capped at $50K/yr)',
              example: '200 fewer events/yr x $150 = $30,000 in recovered productivity',
            },
            {
              label: 'ROI Percentage',
              formula: 'ROI = ((total_annual_savings - investment_cost) / investment_cost) x 100',
              example: 'Investment: 25 vehicles x ($45 + $35)/mo x 12 = $24K/yr. Savings $80K. ROI = ($80K-$24K)/$24K x 100 = 233%',
            },
            {
              label: '3-Year Projection',
              formula: 'Year 1 + (savings x 1.08 - cost) + (savings x 1.08^2 - cost)',
              example: '$80K savings: Y1=$56K + Y2=$62.4K + Y3=$69.3K = $187.7K cumulative',
              source: '8% annual compounding from sustained safety improvements',
            },
          ]}
          sources={[
            'FMCSA/NHTSA accident cost databases',
            'American Trucking Associations (ATA) driver replacement cost studies',
            'DOT/FMCSA wellness program intervention data',
            'EIA diesel fuel price averages',
            'Geotab fleet telematics benchmarks',
          ]}
        />
      </div>
    </>
  );
}
