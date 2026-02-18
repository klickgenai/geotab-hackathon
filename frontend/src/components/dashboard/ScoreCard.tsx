'use client';

import { motion } from 'framer-motion';
import type { InsuranceScore } from '@/types/fleet';

interface ScoreCardProps {
  score: InsuranceScore;
}

export default function ScoreCard({ score }: ScoreCardProps) {
  const circumference = 2 * Math.PI * 56;
  const progress = (score.overallScore / 100) * circumference;

  const gradeColor = score.overallScore >= 80 ? '#10b981' :
                     score.overallScore >= 60 ? '#f59e0b' : '#ef4444';

  const components = [
    { label: 'Safe Driving', data: score.components.safeDriving, weight: '35%' },
    { label: 'Compliance', data: score.components.compliance, weight: '25%' },
    { label: 'Maintenance', data: score.components.maintenance, weight: '20%' },
    { label: 'Driver Quality', data: score.components.driverQuality, weight: '20%' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="bg-gradient-to-br from-[#1a2332] to-[#25477B] rounded-xl p-6 text-white relative overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/[0.03]" />
      <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-white/[0.02]" />

      <h2 className="text-[0.68rem] font-semibold text-white/50 uppercase tracking-[0.5px] mb-5 relative">
        Fleet Insurability Score
      </h2>

      {/* Score ring + metadata */}
      <div className="flex items-center gap-6 mb-5 relative">
        {/* Ring */}
        <div className="relative w-[140px] h-[140px] flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="56" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
            <motion.circle
              cx="60" cy="60" r="56"
              fill="none"
              stroke={gradeColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference - progress }}
              transition={{ delay: 0.6, duration: 1.5, ease: [0.34, 1.56, 0.64, 1] }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="text-[2.6rem] font-extrabold leading-none tracking-tighter"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {score.overallScore}
            </motion.span>
            <span
              className="mt-1 px-2.5 py-0.5 rounded text-[0.8rem] font-bold"
              style={{ backgroundColor: `${gradeColor}22`, color: gradeColor }}
            >
              {score.grade}
            </span>
          </div>
        </div>

        {/* Meta */}
        <div className="flex-1 space-y-0">
          {[
            { label: 'Percentile', value: `Top ${100 - score.percentile}%` },
            { label: 'Trend', value: score.trend.charAt(0).toUpperCase() + score.trend.slice(1) },
            { label: 'Premium Impact', value: `${score.premiumImpact.percentChange > 0 ? '+' : ''}${score.premiumImpact.percentChange}%` },
            { label: 'Annual Savings', value: `$${score.premiumImpact.estimatedAnnualSavings.toLocaleString()}` },
          ].map((row) => (
            <div key={row.label} className="flex justify-between items-center py-[7px] border-b border-white/[0.06] last:border-0 text-[0.78rem]">
              <span className="text-white/45">{row.label}</span>
              <span className="font-semibold">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Components */}
      <div className="grid grid-cols-2 gap-2.5 relative">
        {components.map((comp, i) => {
          const barColor = comp.data.score >= 80 ? '#10b981' :
                          comp.data.score >= 60 ? '#f59e0b' : '#ef4444';
          return (
            <div key={comp.label} className="bg-white/[0.05] rounded-lg p-3">
              <div className="text-[0.6rem] font-medium text-white/40 uppercase tracking-[0.3px] mb-1.5">
                {comp.label} · {comp.weight}
              </div>
              <div className="h-1 bg-white/[0.08] rounded-full mb-1.5 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: barColor }}
                  initial={{ width: 0 }}
                  animate={{ width: `${comp.data.score}%` }}
                  transition={{ delay: 0.8 + i * 0.15, duration: 1, ease: [0.34, 1.56, 0.64, 1] }}
                />
              </div>
              <span className="text-[0.9rem] font-bold">{comp.data.score}</span>
              <span className="text-[0.65rem] text-white/30 ml-1">/100</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
