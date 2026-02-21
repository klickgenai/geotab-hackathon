'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Award, Star, Gift, ChevronRight, CheckCircle, TrendingUp } from 'lucide-react';
import { BadgeDetailModal } from './BadgeDetailModal';
import type { DriverSession, DriverRanking, GamificationState, Badge } from '@/types/fleet';

function levelColor(level: number) {
  if (level >= 8) return 'from-yellow-400 to-amber-600';
  if (level >= 6) return 'from-purple-400 to-purple-600';
  if (level >= 4) return 'from-blue-400 to-blue-600';
  if (level >= 2) return 'from-emerald-400 to-emerald-600';
  return 'from-gray-400 to-gray-600';
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface LeaderboardTabProps {
  session: DriverSession;
  leaderboard: DriverRanking[];
  gamification: GamificationState | null;
}

export function LeaderboardTab({ session, leaderboard, gamification }: LeaderboardTabProps) {
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  const badges = gamification?.badges ?? [];
  const rewards = gamification?.rewards ?? [];
  const recentPoints = gamification?.recentPoints ?? [];
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

      {/* Badge Gallery */}
      <motion.div
        initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
        className="bg-[#18202F] rounded-2xl border border-white/10 p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <Award className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold">Badges</span>
          <span className="ml-auto text-[10px] text-gray-500">{badges.filter(b => b.earned).length}/{badges.length} earned</span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {badges.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBadge(b)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                b.earned ? 'hover:bg-white/5' : 'opacity-40 hover:opacity-60'
              }`}
            >
              <span className="text-2xl">{b.icon}</span>
              <span className="text-[9px] text-gray-500 truncate w-full text-center">{b.name}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Rewards Catalog */}
      {rewards.length > 0 && (
        <motion.div
          initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}
          className="bg-[#18202F] rounded-2xl border border-white/10 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Gift className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-semibold">Rewards</span>
          </div>
          <div className="space-y-2">
            {rewards.slice(0, 6).map((r) => (
              <div key={r.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm ${
                r.available ? 'bg-[#0F1520]' : 'bg-[#0F1520]/50 opacity-50'
              }`}>
                <span className="text-xl">{r.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white truncate">{r.name}</div>
                  <div className="text-[10px] text-gray-500">Lv{r.levelRequired}+ &middot; {r.category}</div>
                </div>
                <div className="flex items-center gap-0.5 text-xs">
                  <Star className="w-3 h-3 text-[#FBAF1A]" />
                  <span className="font-bold text-[#FBAF1A]">{r.pointsCost}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent Points History */}
      {recentPoints.length > 0 && (
        <motion.div
          initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
          className="bg-[#18202F] rounded-2xl border border-white/10 p-4"
        >
          <h3 className="text-sm font-semibold mb-3">Recent Points</h3>
          <div className="space-y-1.5">
            {recentPoints.slice(0, 8).map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-xs">
                <span className={`font-bold ${p.points > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {p.points > 0 ? '+' : ''}{p.points}
                </span>
                <span className="text-gray-400 flex-1 truncate">{p.reason}</span>
                <span className="text-gray-600">{timeAgo(p.timestamp)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <BadgeDetailModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
    </div>
  );
}
