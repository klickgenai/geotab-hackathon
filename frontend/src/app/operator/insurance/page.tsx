'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import PageHeader from '@/components/layout/PageHeader';
import type { InsuranceScore, WhatIfScenario, WhatIfResult } from '@/types/fleet';
import {
  Shield, TrendingUp, TrendingDown, Minus, DollarSign, Award,
  Loader2, ChevronRight, ArrowRight, Zap, BarChart3, Target,
  Sliders, CheckCircle2,
} from 'lucide-react';
import clsx from 'clsx';

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
    <div className="relative w-56 h-56 mx-auto">
      <svg viewBox="0 0 200 200" className="w-full h-full -rotate-[135deg]">
        <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`} />
        <motion.circle
          cx="100" cy="100" r="90" fill="none" stroke={strokeColor} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          initial={{ strokeDashoffset: circumference * 0.75 }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-6xl font-extrabold text-white font-mono-kpi">
          <AnimatedNumber value={score} duration={2000} />
        </div>
        <div className={clsx('text-3xl font-extrabold mt-1', gradeColor)}>{grade}</div>
      </div>
    </div>
  );
}

const componentConfig: Record<string, { icon: typeof Shield; color: string; label: string }> = {
  safeDriving: { icon: Shield, color: 'text-blue-400', label: 'Safe Driving' },
  compliance: { icon: CheckCircle2, color: 'text-emerald-400', label: 'Compliance' },
  maintenance: { icon: Zap, color: 'text-amber-400', label: 'Maintenance' },
  driverQuality: { icon: Award, color: 'text-purple-400', label: 'Driver Quality' },
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = async () => {
    setLoading(true);
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
    } catch (err) {
      console.error(err);
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

  const selectedResult = whatIfResults.find((r) => r.scenarioId === selectedScenario);
  const trendIcon = score.trend === 'improving' ? TrendingUp : score.trend === 'declining' ? TrendingDown : Minus;
  const TrendIcon = trendIcon;
  const trendColor = score.trend === 'improving' ? 'text-emerald-500' : score.trend === 'declining' ? 'text-red-500' : 'text-gray-400';
  const activeResult = mode === 'custom' ? customResult : selectedResult;

  return (
    <>
      <PageHeader title="Insurance Intelligence" subtitle="Your fleet's insurance-readiness score and optimization paths" onRefresh={load} />

      <div className="p-8 space-y-8 max-w-[1520px]">
        {/* Hero: Score + Premium Impact */}
        <div className="grid grid-cols-12 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="col-span-5 bg-gradient-to-br from-[#18202F] to-[#1E293B] rounded-3xl p-8 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#FBAF1A]/[0.04] rounded-full blur-[60px]" />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-white">Fleet Insurance Score</h2>
                <div className={clsx('flex items-center gap-1 text-sm font-semibold', trendColor)}>
                  <TrendIcon className="w-4 h-4" />
                  <span className="capitalize">{score.trend}</span>
                </div>
              </div>
              <div className="text-xs text-white/40 mb-6">
                Percentile: Top {100 - score.percentile}% of fleets
              </div>
              <ScoreGauge score={score.overallScore} grade={score.grade} />
              <div className="mt-6 bg-white/[0.05] rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-white/40 uppercase tracking-wider">Annual Premium Impact</div>
                    <div className="text-3xl font-extrabold text-emerald-400 mt-1">
                      ${score.premiumImpact.estimatedAnnualSavings.toLocaleString()}
                    </div>
                    <div className="text-xs text-white/30">savings vs. industry average</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-white/40 uppercase tracking-wider">Benchmark</div>
                    <div className="text-xl font-bold text-white/60 mt-1">
                      ${score.premiumImpact.benchmarkPremium.toLocaleString()}
                    </div>
                    <div className={clsx('text-sm font-bold', score.premiumImpact.percentChange < 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {score.premiumImpact.percentChange > 0 ? '+' : ''}{score.premiumImpact.percentChange}%
                    </div>
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
              <h2 className="text-lg font-bold text-gray-900">Score Components</h2>
            </div>
            <div className="space-y-6">
              {Object.entries(score.components).map(([key, comp], i) => {
                const config = componentConfig[key];
                if (!config) return null;
                const Icon = config.icon;
                const barColor = comp.score >= 80 ? 'from-emerald-400 to-emerald-500' :
                  comp.score >= 60 ? 'from-[#FBAF1A] to-amber-500' :
                  comp.score >= 40 ? 'from-amber-500 to-orange-500' : 'from-red-400 to-red-500';
                return (
                  <motion.div key={key} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.1 }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center">
                          <Icon className={clsx('w-5 h-5', config.color)} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-800">{config.label}</div>
                          <div className="text-xs text-gray-400">Weight: {(comp.weight * 100).toFixed(0)}%</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-extrabold text-gray-900">{comp.score}</div>
                        <div className="text-xs text-gray-400">weighted: {comp.weightedScore.toFixed(1)}</div>
                      </div>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div className={clsx('h-full rounded-full bg-gradient-to-r', barColor)} initial={{ width: 0 }} animate={{ width: `${comp.score}%` }} transition={{ duration: 1, delay: 0.3 + i * 0.1 }} />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Object.entries(comp.details).slice(0, 4).map(([k, v]) => (
                        <span key={k} className="text-xs px-2 py-0.5 bg-gray-50 rounded text-gray-500">
                          {k.replace(/([A-Z])/g, ' $1').trim()}: <span className="font-semibold text-gray-700">{typeof v === 'number' ? v.toFixed(1) : v}</span>
                        </span>
                      ))}
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
              <h2 className="text-lg font-bold text-gray-900">What-If Simulator</h2>
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
      </div>
    </>
  );
}
