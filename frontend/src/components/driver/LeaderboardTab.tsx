'use client';

import { motion } from 'framer-motion';
import { Trophy, Award, TrendingUp } from 'lucide-react';
import type { DriverSession, DriverRanking, GamificationState } from '@/types/fleet';

function levelColor(level: number) {
  if (level >= 8) return 'from-yellow-400 to-amber-600';
  if (level >= 6) return 'from-purple-400 to-purple-600';
  if (level >= 4) return 'from-blue-400 to-blue-600';
  if (level >= 2) return 'from-emerald-400 to-emerald-600';
  return 'from-gray-400 to-gray-600';
}

interface LeaderboardTabProps {
  session: DriverSession;
  leaderboard: DriverRanking[];
  gamification: GamificationState | null;
}

export function LeaderboardTab({ session, leaderboard, gamification }: LeaderboardTabProps) {
  const badges = (gamification?.badges ?? []).filter(b => b.earned).slice(0, 8);
  const level = gamification?.level ?? 1;
  const levelTitle = gamification?.levelTitle ?? 'Rookie';
  const levelProgress = (gamification?.levelProgress ?? 0) * 100;
  const pointsToNext = gamification?.pointsToNextLevel ?? 0;
  const weeklyStats = gamification?.weeklyStats;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Weekly Stats Card */}
      {weeklyStats && (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-br from-[#FBAF1A]/10 to-[#BF7408]/5 rounded-2xl border border-[#FBAF1A]/20 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-[#FBAF1A]" />
            <span className="text-sm font-semibold">This Week</span>
          </div>
          <div className="flex items-center justify-around">
            <div className="text-center">
              <div className="text-xl font-bold text-[#FBAF1A]">{weeklyStats.pointsEarned}</div>
              <div className="text-[10px] text-gray-500">Points</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-emerald-400">{weeklyStats.challengesCompleted}</div>
              <div className="text-[10px] text-gray-500">Challenges</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-purple-400">{weeklyStats.badgesEarned}</div>
              <div className="text-[10px] text-gray-500">Badges</div>
            </div>
          </div>
          {/* Level progress */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">
                <span className={`inline-flex w-5 h-5 rounded-full bg-gradient-to-br ${levelColor(level)} items-center justify-center text-white text-[10px] font-bold mr-1`}>{level}</span>
                {levelTitle}
              </span>
              <span className="text-[10px] text-gray-600">{pointsToNext} pts to next</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#0F1520] overflow-hidden">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-[#FBAF1A] to-[#BF7408]"
                initial={{ width: 0 }} animate={{ width: `${levelProgress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Full Leaderboard */}
      <motion.div
        initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }}
        className="bg-[#18202F] rounded-2xl border border-white/10 p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold">Leaderboard</span>
        </div>
        <div className="space-y-1">
          {leaderboard.map((r) => {
            const isMe = r.driverId === session.driverId;
            return (
              <div key={r.driverId}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm ${
                  isMe ? 'bg-[#FBAF1A]/10 border border-[#FBAF1A]/20' : 'hover:bg-white/5'
                }`}>
                <span className={`w-6 text-center font-bold text-sm ${
                  r.rank === 1 ? 'text-yellow-400' :
                  r.rank === 2 ? 'text-gray-300' :
                  r.rank === 3 ? 'text-amber-600' :
                  'text-gray-600'
                }`}>
                  {r.rank <= 3 ? ['', '\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'][r.rank] : r.rank}
                </span>
                <span className={`flex-1 truncate ${isMe ? 'text-white font-semibold' : 'text-gray-400'}`}>
                  {r.name} {isMe && <span className="text-[#FBAF1A] text-xs">(You)</span>}
                </span>
                <span className="text-xs text-gray-500">{r.streak}d streak</span>
                <span className={`font-bold ${isMe ? 'text-[#FBAF1A]' : 'text-gray-500'}`}>{r.score}</span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Earned Badges */}
      {badges.length > 0 && (
        <motion.div
          initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
          className="bg-[#18202F] rounded-2xl border border-white/10 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold">Earned Badges</span>
            <span className="ml-auto text-[10px] text-gray-500">{badges.length} earned</span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {badges.map((b) => (
              <div key={b.id} className="flex flex-col items-center gap-1 p-2 rounded-xl">
                <span className="text-2xl">{b.icon}</span>
                <span className="text-[9px] text-gray-500 truncate w-full text-center">{b.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
