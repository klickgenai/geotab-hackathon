'use client';

import { motion } from 'framer-motion';
import {
  Flame, Trophy, Target, Zap, CheckCircle, CircleDot, Clock, AlertTriangle, Heart,
  CloudRain, Sun, Cloud, CloudSnow, CloudFog, CloudLightning,
} from 'lucide-react';
import { ScoreGauge } from './ScoreGauge';
import type { DriverSession, GamificationState, PreShiftBriefing, HOSStatus, WellnessCheckIn } from '@/types/fleet';

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

function formatHM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function hosColor(minutes: number): string {
  if (minutes > 240) return 'text-emerald-400'; // > 4 hours
  if (minutes > 120) return 'text-amber-400';   // 2-4 hours
  return 'text-red-400';                          // < 2 hours
}

function hosBarColor(minutes: number): string {
  if (minutes > 240) return 'bg-emerald-500';
  if (minutes > 120) return 'bg-amber-500';
  return 'bg-red-500';
}

function HOSGauge({ label, minutes, maxMinutes }: { label: string; minutes: number; maxMinutes: number }) {
  const pct = Math.max(0, Math.min(100, (minutes / maxMinutes) * 100));
  return (
    <div className="bg-[#0F1520] rounded-xl p-3">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs text-gray-500">{label}</span>
        <span className={`text-sm font-bold ${hosColor(minutes)}`}>{formatHM(minutes)}</span>
      </div>
      <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${hosBarColor(minutes)}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

function timeAgoShort(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface HomeTabProps {
  session: DriverSession;
  gamification: GamificationState | null;
  briefing: PreShiftBriefing | null;
  hos: HOSStatus | null;
  wellnessCheckins: WellnessCheckIn[];
  onWellnessCheckIn: (mood: WellnessCheckIn['mood']) => void;
  wellnessMessage: string | null;
}

export function HomeTab({ session, gamification, briefing, hos, wellnessCheckins, onWellnessCheckIn, wellnessMessage }: HomeTabProps) {
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

      {/* HOS Widget */}
      {hos && (
        <motion.div
          initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.03 }}
          className="bg-[#18202F] rounded-2xl border border-white/10 p-4"
        >
          <div className="flex items-center gap-1.5 mb-3">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold">Hours of Service</span>
            <span className={`ml-auto text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
              hos.currentDutyStatus === 'driving' ? 'bg-emerald-500/20 text-emerald-400' :
              hos.currentDutyStatus === 'on_duty' ? 'bg-blue-500/20 text-blue-400' :
              hos.currentDutyStatus === 'sleeper' ? 'bg-purple-500/20 text-purple-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {hos.currentDutyStatus.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <HOSGauge label="Drive" minutes={hos.driveTimeRemaining} maxMinutes={660} />
            <HOSGauge label="Duty" minutes={hos.onDutyTimeRemaining} maxMinutes={840} />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
            <span>Next break in {formatHM(hos.nextBreakRequired)}</span>
            <span>Cycle: {formatHM(hos.cycleTimeRemaining)} left</span>
          </div>
          {hos.violations.length > 0 && (
            <div className="mt-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-xs text-red-400">{hos.violations[0]}</span>
            </div>
          )}
        </motion.div>
      )}

      {/* Wellness Check-In */}
      <motion.div
        initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.04 }}
        className="bg-[#18202F] rounded-2xl border border-white/10 p-4"
      >
        <div className="flex items-center gap-1.5 mb-3">
          <Heart className="w-4 h-4 text-pink-400" />
          <span className="text-sm font-semibold">How are you feeling?</span>
        </div>
        {wellnessMessage ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-gray-300 leading-relaxed bg-[#0F1520] rounded-xl p-3"
          >
            {wellnessMessage}
          </motion.div>
        ) : (
          <div className="flex items-center justify-around">
            {([
              { mood: 'great' as const, emoji: '\uD83D\uDE0A', label: 'Great' },
              { mood: 'ok' as const, emoji: '\uD83D\uDE42', label: 'OK' },
              { mood: 'tired' as const, emoji: '\uD83D\uDE34', label: 'Tired' },
              { mood: 'stressed' as const, emoji: '\uD83D\uDE23', label: 'Stressed' },
              { mood: 'not_good' as const, emoji: '\uD83D\uDE1E', label: 'Not Good' },
            ]).map((item) => (
              <button
                key={item.mood}
                onClick={() => onWellnessCheckIn(item.mood)}
                className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-all min-w-[56px]"
              >
                <span className="text-2xl">{item.emoji}</span>
                <span className="text-[10px] text-gray-500">{item.label}</span>
              </button>
            ))}
          </div>
        )}
        {wellnessCheckins.length > 0 && !wellnessMessage && (
          <div className="mt-2 text-center text-[10px] text-gray-600">
            Last: {wellnessCheckins[0].mood} {timeAgoShort(wellnessCheckins[0].timestamp)}
          </div>
        )}
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

    </div>
  );
}
