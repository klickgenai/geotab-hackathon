'use client';

import { Truck, Users, AlertTriangle, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import type { FleetOverview, InsuranceScore } from '@/types/fleet';

interface KPICardsProps {
  overview: FleetOverview;
  score: InsuranceScore;
}

export default function KPICards({ overview, score }: KPICardsProps) {
  const cards = [
    {
      label: 'Active Vehicles',
      value: overview.totalVehicles,
      sub: `${overview.activeVehicles} active today`,
      icon: Truck,
      iconBg: 'bg-blue-50',
      iconColor: 'text-[#0078D3]',
      trend: null,
    },
    {
      label: 'Active Drivers',
      value: overview.totalDrivers,
      sub: `${overview.activeDrivers} on route`,
      icon: Users,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-500',
      trend: null,
    },
    {
      label: 'Safety Events',
      value: overview.totalSafetyEvents,
      sub: `${overview.eventsPerMile.toFixed(4)}/mi · 30 days`,
      icon: AlertTriangle,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-500',
      trend: { direction: 'down' as const, label: score.trend === 'improving' ? '↓ Improving' : score.trend === 'declining' ? '↑ Worsening' : '→ Stable' },
    },
    {
      label: 'Fleet Score',
      value: score.overallScore,
      sub: `Grade ${score.grade} · Top ${100 - score.percentile}%`,
      icon: Shield,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      trend: { direction: score.trend === 'improving' ? 'up' as const : score.trend === 'declining' ? 'down' as const : 'neutral' as const, label: score.trend },
      highlight: true,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
            className={`bg-white rounded-xl border px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:border-gray-300 transition-all duration-200 ${
              card.highlight ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/40 to-white' : 'border-gray-200'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <span className="text-[0.68rem] font-semibold text-gray-400 uppercase tracking-[0.5px]">
                {card.label}
              </span>
              <div className={`w-8 h-8 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${card.iconColor}`} />
              </div>
            </div>
            <div className="text-[2rem] font-extrabold tracking-tight leading-none mb-1">
              {card.value.toLocaleString()}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[0.72rem] text-gray-400">{card.sub}</span>
              {card.trend && (
                <span className={`text-[0.65rem] font-semibold px-1.5 py-0.5 rounded ${
                  card.trend.direction === 'up' ? 'bg-emerald-50 text-emerald-700' :
                  card.trend.direction === 'down' ? 'bg-red-50 text-red-600' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {card.trend.label}
                </span>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
