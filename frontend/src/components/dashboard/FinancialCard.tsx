'use client';

import { motion } from 'framer-motion';
import { DollarSign, TrendingUp } from 'lucide-react';
import type { InsuranceScore, WellnessSummary, DriverRisk } from '@/types/fleet';

interface FinancialCardProps {
  score: InsuranceScore;
  wellness: WellnessSummary;
  risks: DriverRisk[];
  onGenerateReport: () => void;
}

export default function FinancialCard({ score, wellness, risks, onGenerateReport }: FinancialCardProps) {
  const insuranceSavings = score.premiumImpact.estimatedAnnualSavings;
  const retentionSavings = Math.round(wellness.totalRetentionCostAtRisk * 0.6);
  const totalRiskCost = risks.reduce((s, r) => s + r.annualizedCost, 0);
  const accidentSavings = Math.round(totalRiskCost * 0.4);
  const total = insuranceSavings + retentionSavings + accidentSavings;

  const bars = [
    { label: 'Insurance', value: insuranceSavings, color: 'bg-emerald-500', pct: (insuranceSavings / total) * 100 },
    { label: 'Retention', value: retentionSavings, color: 'bg-indigo-500', pct: (retentionSavings / total) * 100 },
    { label: 'Accident Avoidance', value: accidentSavings, color: 'bg-amber-500', pct: (accidentSavings / total) * 100 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="bg-white rounded-2xl border border-[#E5E2DC] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.5px]">
          Financial Impact
        </h2>
        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
          <DollarSign className="w-4 h-4 text-emerald-600" />
        </div>
      </div>

      {/* Hero number */}
      <div className="text-center py-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl mb-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          className="text-4xl font-mono-kpi font-extrabold text-emerald-700 tracking-tight leading-none"
        >
          ${total.toLocaleString()}
        </motion.div>
        <div className="text-xs text-emerald-600 font-medium mt-1 flex items-center justify-center gap-1">
          <TrendingUp className="w-3.5 h-3.5" />
          Total Annual Savings Potential
        </div>
      </div>

      {/* Breakdown bars */}
      <div className="space-y-3 mb-4">
        {bars.map((bar, i) => (
          <div key={bar.label} className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-500 w-[110px] shrink-0">{bar.label}</span>
            <div className="flex-1 h-7 bg-gray-100 rounded-md overflow-hidden relative">
              <motion.div
                className={`h-full rounded-md flex items-center px-2.5 ${bar.color}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(bar.pct, 15)}%` }}
                transition={{ delay: 0.8 + i * 0.15, duration: 1, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <span className="text-xs font-semibold text-white whitespace-nowrap">
                  ${bar.value.toLocaleString()}
                </span>
              </motion.div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onGenerateReport}
        className="w-full py-2.5 rounded-xl bg-[#FFF8EB] border border-[#E5E2DC] text-[#BF7408] text-sm font-semibold hover:bg-[#FFF1D6] transition-all duration-200 flex items-center justify-center gap-2"
      >
        Generate Insurance Report
      </button>
    </motion.div>
  );
}
