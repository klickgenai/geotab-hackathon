'use client';

import { Shield, Star, Flame, LogOut } from 'lucide-react';
import type { DriverSession, GamificationState } from '@/types/fleet';

function levelColor(level: number) {
  if (level >= 8) return 'from-yellow-400 to-amber-600';
  if (level >= 6) return 'from-purple-400 to-purple-600';
  if (level >= 4) return 'from-blue-400 to-blue-600';
  if (level >= 2) return 'from-emerald-400 to-emerald-600';
  return 'from-gray-400 to-gray-600';
}

interface DriverTopBarProps {
  session: DriverSession;
  gamification: GamificationState | null;
  onLogout: () => void;
}

export function DriverTopBar({ session, gamification, onLogout }: DriverTopBarProps) {
  const level = gamification?.level ?? 1;
  const levelTitle = gamification?.levelTitle ?? 'Rookie';
  const totalPoints = gamification?.totalPoints ?? 0;
  const currentStreak = gamification?.currentStreak ?? session.streakDays ?? 0;
  const streakMultiplier = gamification?.streakMultiplier ?? 1.0;

  return (
    <div className="bg-[#18202F] border-b border-white/10 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FBAF1A] to-[#BF7408] flex items-center justify-center">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="font-semibold text-sm">{session.driverName}</div>
          <div className="text-gray-400 text-xs">#{session.employeeNumber} &middot; {session.vehicleName}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${levelColor(level)} flex items-center justify-center text-white font-bold text-xs shadow-lg`}>
          {level}
        </div>
        <span className="text-sm font-medium text-white hidden sm:inline">{levelTitle}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-[#FBAF1A]" />
          <span className="text-sm font-bold text-[#FBAF1A]">{totalPoints.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1">
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-sm font-bold text-orange-400">{currentStreak}d</span>
        </div>
        {streakMultiplier > 1 && (
          <span className="px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold">x{streakMultiplier.toFixed(1)}</span>
        )}
        <button onClick={onLogout} className="flex items-center gap-1 text-gray-400 hover:text-white text-xs transition-colors ml-1">
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
