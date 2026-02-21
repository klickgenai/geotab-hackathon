'use client';

import { Home, ClipboardList, Mic, Truck, Trophy } from 'lucide-react';

export type DriverTab = 'home' | 'training' | 'voice' | 'load' | 'rank';

interface DriverTabBarProps {
  activeTab: DriverTab;
  onTabChange: (tab: DriverTab) => void;
  trainingBadge?: number;
  homeBadge?: number;
}

const tabs: { id: DriverTab; label: string; Icon: typeof Home }[] = [
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'training', label: 'Training', Icon: ClipboardList },
  { id: 'voice', label: 'Voice', Icon: Mic },
  { id: 'load', label: 'Load', Icon: Truck },
  { id: 'rank', label: 'Rank', Icon: Trophy },
];

export function DriverTabBar({ activeTab, onTabChange, trainingBadge, homeBadge }: DriverTabBarProps) {
  return (
    <div className="bg-[#18202F] border-t border-white/10 flex items-end justify-around flex-shrink-0 safe-area-bottom">
      {tabs.map(({ id, label, Icon }) => {
        const isActive = activeTab === id;
        const isVoice = id === 'voice';
        const badge = id === 'training' ? trainingBadge : id === 'home' ? homeBadge : undefined;

        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`flex flex-col items-center gap-0.5 py-2 px-3 min-w-[56px] transition-colors relative ${
              isVoice ? '-mt-3' : ''
            }`}
          >
            <div className={`relative flex items-center justify-center ${
              isVoice
                ? `w-14 h-14 rounded-full ${isActive ? 'bg-[#FBAF1A]' : 'bg-[#FBAF1A]/20 border-2 border-[#FBAF1A]/40'}`
                : ''
            }`}>
              <Icon className={`${
                isVoice ? 'w-7 h-7' : 'w-5 h-5'
              } ${
                isActive
                  ? isVoice ? 'text-[#18202F]' : 'text-[#FBAF1A]'
                  : isVoice ? 'text-[#FBAF1A]' : 'text-gray-500'
              }`} />
              {badge !== undefined && badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-medium ${
              isActive ? (isVoice ? 'text-[#FBAF1A]' : 'text-[#FBAF1A]') : 'text-gray-500'
            }`}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
