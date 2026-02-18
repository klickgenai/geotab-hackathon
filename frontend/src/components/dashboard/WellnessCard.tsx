'use client';

import { motion } from 'framer-motion';
import { Heart, AlertCircle } from 'lucide-react';
import type { WellnessSummary } from '@/types/fleet';

interface WellnessCardProps {
  wellness: WellnessSummary;
  onDriverClick: (driverId: string) => void;
}

export default function WellnessCard({ wellness, onDriverClick }: WellnessCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.5 }}
      className="bg-white rounded-xl border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[0.68rem] font-semibold text-gray-400 uppercase tracking-[0.5px]">
          Wellness & Retention
        </h2>
        <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center">
          <Heart className="w-4 h-4 text-pink-500" />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center py-3 bg-gray-50 rounded-lg">
          <div className={`text-[1.5rem] font-extrabold leading-none ${wellness.highBurnoutRisk > 0 ? 'text-red-500' : 'text-gray-800'}`}>
            {wellness.highBurnoutRisk}
          </div>
          <div className="text-[0.6rem] text-gray-400 font-medium mt-1">High Burnout</div>
        </div>
        <div className="text-center py-3 bg-gray-50 rounded-lg">
          <div className="text-[1.5rem] font-extrabold leading-none text-emerald-600">
            {wellness.avgWellnessScore}
          </div>
          <div className="text-[0.6rem] text-gray-400 font-medium mt-1">Avg Wellness</div>
        </div>
        <div className="text-center py-3 bg-gray-50 rounded-lg">
          <div className="text-[1.5rem] font-extrabold leading-none text-red-500">
            ${(wellness.totalRetentionCostAtRisk / 1000).toFixed(0)}K
          </div>
          <div className="text-[0.6rem] text-gray-400 font-medium mt-1">Cost at Risk</div>
        </div>
      </div>

      {/* At-risk drivers */}
      {wellness.driversAtRisk.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            <span className="text-[0.7rem] font-semibold text-red-600">Drivers at Risk</span>
          </div>
          <div className="space-y-1.5">
            {wellness.driversAtRisk.map((d) => (
              <button
                key={d.id}
                onClick={() => onDriverClick(d.id)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-red-50/70 border-l-[3px] border-red-400 hover:bg-red-50 hover:translate-x-0.5 transition-all duration-200 text-left"
              >
                <div>
                  <div className="text-[0.76rem] font-semibold text-gray-800">{d.name}</div>
                  <div className="text-[0.62rem] text-gray-400">{d.topSignal}</div>
                </div>
                <div className="text-right">
                  <div className="text-[0.72rem] font-bold text-red-600">{(d.burnoutProbability * 100).toFixed(0)}%</div>
                  <div className="text-[0.6rem] text-gray-400">${d.retentionCost.toLocaleString()}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
