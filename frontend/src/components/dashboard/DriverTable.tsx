'use client';

import { motion } from 'framer-motion';
import clsx from 'clsx';
import type { DriverRisk } from '@/types/fleet';

interface DriverTableProps {
  risks: DriverRisk[];
  onDriverClick: (driverId: string) => void;
}

const tierConfig = {
  low: { bg: 'bg-emerald-50', text: 'text-emerald-700', avatar: 'bg-emerald-500', bar: 'bg-emerald-400' },
  moderate: { bg: 'bg-amber-50', text: 'text-amber-700', avatar: 'bg-amber-500', bar: 'bg-amber-400' },
  high: { bg: 'bg-red-50', text: 'text-red-700', avatar: 'bg-red-500', bar: 'bg-red-400' },
  critical: { bg: 'bg-red-100', text: 'text-red-800', avatar: 'bg-red-800', bar: 'bg-red-600' },
};

export default function DriverTable({ risks, onDriverClick }: DriverTableProps) {
  const displayRisks = risks.slice(0, 12);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.5 }}
      className="bg-white rounded-2xl border border-[#E5E2DC] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden"
    >
      <div className="px-6 pt-6 pb-3 flex justify-between items-center">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.5px]">
          Driver Risk Analysis
        </h2>
        <span className="text-xs text-gray-400">{risks.length} drivers</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-y border-[#F0EDE7]">
              {['Driver', 'Risk Score', 'Tier', 'Annual Cost', 'Top Issue'].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-[0.5px] px-4 py-2.5">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRisks.map((r, i) => {
              const cfg = tierConfig[r.tier];
              const initials = r.driverName.split(' ').map(n => n[0]).join('');
              return (
                <motion.tr
                  key={r.driverId}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.04 }}
                  onClick={() => onDriverClick(r.driverId)}
                  className="border-b border-[#F0EDE7] hover:bg-[#FAF9F7] cursor-pointer transition-colors duration-150"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white', cfg.avatar)}>
                        {initials}
                      </div>
                      <span className="text-sm font-medium text-gray-800">{r.driverName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={clsx('h-full rounded-full', cfg.bar)}
                          style={{ width: `${r.riskScore}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 tabular-nums">{r.riskScore}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={clsx(
                      'inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize',
                      cfg.bg, cfg.text,
                      r.tier === 'critical' && 'animate-pulse'
                    )}>
                      {r.tier}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-sm font-medium text-gray-600 tabular-nums">
                    ${r.annualizedCost.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-400 max-w-[200px] truncate">
                    {r.recommendations?.[0] || '—'}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
