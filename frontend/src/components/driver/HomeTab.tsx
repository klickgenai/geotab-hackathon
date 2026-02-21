'use client';

import { motion } from 'framer-motion';
import {
  Flame, Trophy, Target, Zap, CheckCircle, CircleDot, ChevronRight,
  CloudRain, Sun, Cloud, CloudSnow, CloudFog, CloudLightning,
} from 'lucide-react';
import { ScoreGauge } from './ScoreGauge';
import type { DriverSession, GamificationState, PreShiftBriefing, ActionItem } from '@/types/fleet';

function WeatherIcon({ condition }: { condition: string }) {
  const c = condition.toLowerCase();
  if (c.includes('rain') || c.includes('shower')) return <CloudRain className="w-5 h-5 text-blue-400" />;
  if (c.includes('snow') || c.includes('ice')) return <CloudSnow className="w-5 h-5 text-blue-200" />;
  if (c.includes('fog') || c.includes('mist')) return <CloudFog className="w-5 h-5 text-gray-400" />;
  if (c.includes('thunder') || c.includes('storm')) return <CloudLightning className="w-5 h-5 text-yellow-400" />;
  if (c.includes('cloud') || c.includes('overcast')) return <Cloud className="w-5 h-5 text-gray-300" />;
  return <Sun className="w-5 h-5 text-yellow-400" />;
}

function riskTextColor(level: string) {
  switch (level) {
    case 'low': return 'text-emerald-400';
    case 'elevated': return 'text-yellow-400';
    case 'high': return 'text-orange-400';
    case 'critical': return 'text-red-400';
    default: return 'text-gray-400';
  }
}

interface HomeTabProps {
  session: DriverSession;
  gamification: GamificationState | null;
  briefing: PreShiftBriefing | null;
  actionItems: ActionItem[];
  onGoToTraining: () => void;
}

export function HomeTab({ session, gamification, briefing, actionItems, onGoToTraining }: HomeTabProps) {
  const currentStreak = gamification?.currentStreak ?? session.streakDays ?? 0;
  const dailyChallenge = gamification?.dailyChallenge ?? null;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Safety Score - Large, centered */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-[#18202F] rounded-2xl border border-white/10 p-6 flex flex-col items-center"
      >
        <ScoreGauge score={session.safetyScore} size={160} />
        <div className="flex items-center gap-6 mt-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-0.5"><Flame className="w-4 h-4 text-orange-400" /><span className="text-lg font-bold">{currentStreak}</span></div>
            <div className="text-[11px] text-gray-500">Day Streak</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-0.5"><Trophy className="w-4 h-4 text-amber-400" /><span className="text-lg font-bold">#{session.weeklyRank}</span></div>
            <div className="text-[11px] text-gray-500">Rank</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-emerald-400">{session.todayEvents}</div>
            <div className="text-[11px] text-gray-500">Today Events</div>
          </div>
        </div>
      </motion.div>

      {/* Pre-Shift Briefing Card */}
      <motion.div
        initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }}
        className="bg-[#18202F] rounded-2xl border border-white/10 p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Target className="w-4 h-4 text-[#FBAF1A]" />
            <span className="text-sm font-semibold">Pre-Shift Briefing</span>
          </div>
          {briefing && (
            <span className={`text-xs font-semibold uppercase ${riskTextColor(briefing.riskLevel)}`}>
              {briefing.riskLevel}
            </span>
          )}
        </div>
        {briefing ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-300 leading-relaxed">{briefing.greeting}</p>
            {briefing.focusAreas.slice(0, 3).map((area, i) => (
              <div key={i} className="flex items-start gap-2">
                <CircleDot className="w-3 h-3 text-[#FBAF1A] mt-1 flex-shrink-0" />
                <span className="text-xs text-gray-400 leading-tight">{area}</span>
              </div>
            ))}
            {briefing.weather.advisory && (
              <div className="flex items-center gap-2 text-xs text-amber-400 mt-1">
                <WeatherIcon condition={briefing.weather.condition} />
                <span>{briefing.weather.advisory}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-600 text-xs">Loading briefing...</div>
        )}
      </motion.div>

      {/* Daily Challenge */}
      {dailyChallenge && (
        <motion.div
          initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
          className="bg-[#18202F] rounded-2xl border border-white/10 p-4"
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Zap className="w-4 h-4 text-[#FBAF1A]" />
            <span className="text-sm font-semibold">Daily Challenge</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{dailyChallenge.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-white truncate">{dailyChallenge.name}</span>
                {dailyChallenge.completed && <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                <span className="text-xs font-bold text-[#FBAF1A] ml-auto flex-shrink-0">+{dailyChallenge.pointsReward}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{dailyChallenge.description}</p>
              <div className="w-full h-2 rounded-full bg-[#0F1520] overflow-hidden mt-1.5">
                <motion.div
                  className={`h-full rounded-full ${dailyChallenge.completed ? 'bg-emerald-500' : 'bg-[#FBAF1A]'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(dailyChallenge.progress * 100)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Top 3 Action Items */}
      {actionItems.length > 0 && (
        <motion.div
          initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}
          className="bg-[#18202F] rounded-2xl border border-white/10 p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Action Items</span>
            <button onClick={onGoToTraining} className="text-xs text-[#FBAF1A] flex items-center gap-0.5 hover:underline">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {actionItems.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-start gap-2 text-xs text-gray-400">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                  item.priority === 'urgent' ? 'bg-red-500' :
                  item.priority === 'high' ? 'bg-orange-400' :
                  item.priority === 'medium' ? 'bg-yellow-400' : 'bg-gray-500'
                }`} />
                <span className="leading-relaxed">{item.text}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
