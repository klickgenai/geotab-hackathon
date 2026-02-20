'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Shield, LayoutDashboard, Users, AlertTriangle, Heart, Truck,
  Brain, Bell, MapPin, DollarSign, UserCircle, Award, Bot, Leaf,
} from 'lucide-react';
import clsx from 'clsx';

interface SidebarProps {
  geotabConfigured: boolean;
}

const sections = [
  {
    title: 'Analytics',
    items: [
      { href: '/operator', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/operator/insurance', label: 'Insurance Score', icon: Award },
      { href: '/operator/drivers', label: 'Drivers', icon: Users },
      { href: '/operator/safety', label: 'Safety Events', icon: AlertTriangle },
      { href: '/operator/wellness', label: 'Wellness', icon: Heart },
      { href: '/operator/vehicles', label: 'Vehicles', icon: Truck },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { href: '/operator/predictive', label: 'Predictive Safety', icon: Brain },
      { href: '/operator/alerts', label: 'Alert Triage', icon: Bell },
      { href: '/operator/map', label: 'Live Map', icon: MapPin },
      { href: '/operator/roi', label: 'ROI Dashboard', icon: DollarSign },
      { href: '/operator/sustainability', label: 'Sustainability', icon: Leaf },
      { href: '/operator/assistant', label: 'AI Assistant', icon: Bot },
    ],
  },
  {
    title: 'Driver',
    items: [
      { href: '/driver-portal', label: 'Driver Portal', icon: UserCircle },
    ],
  },
];

export default function Sidebar({ geotabConfigured }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[260px] bg-[#18202F] text-white flex flex-col z-50">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-white/[0.08]">
        <Link href="/operator" className="flex items-center gap-2.5">
          <svg width="40" height="40" viewBox="0 0 48 48" fill="none" className="flex-shrink-0">
            <path d="M24 4L6 12v12c0 11.1 7.7 21.5 18 24 10.3-2.5 18-12.9 18-24V12L24 4z" fill="url(#sGrad)" stroke="url(#sStroke)" strokeWidth="1" />
            <path d="M24 8L10 14.5v9.5c0 9.2 6.3 17.8 14 19.8V8z" fill="rgba(255,255,255,0.06)" />
            <g stroke="#FBAF1A" strokeWidth="2" strokeLinecap="round" opacity="0.9"><path d="M17 24h3l2-6 3 12 2.5-8 2.5 4h3" /></g>
            <circle cx="24" cy="24" r="2" fill="#FBAF1A" />
            <path d="M24 4L6 12v2l18-8 18 8v-2L24 4z" fill="rgba(251,175,26,0.3)" />
            <defs>
              <linearGradient id="sGrad" x1="6" y1="4" x2="42" y2="40"><stop offset="0%" stopColor="#1a2540" /><stop offset="100%" stopColor="#0f1729" /></linearGradient>
              <linearGradient id="sStroke" x1="6" y1="4" x2="42" y2="40"><stop offset="0%" stopColor="#FBAF1A" stopOpacity="0.5" /><stop offset="50%" stopColor="#FBAF1A" stopOpacity="0.2" /><stop offset="100%" stopColor="#10B981" stopOpacity="0.3" /></linearGradient>
            </defs>
          </svg>
          <div>
            <div className="font-extrabold text-base tracking-tight leading-none">
              <span className="text-white">Fleet</span><span className="text-[#FBAF1A]">Shield</span>
            </div>
            <div className="text-[9px] text-white/30 font-bold tracking-[2.5px] uppercase mt-0.5">Intelligence</div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title}>
            <div className="text-[10px] font-semibold text-white/25 uppercase tracking-[1.5px] px-3 pt-4 pb-1.5">
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/operator' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-2.5 w-full px-3 py-[10px] rounded-xl text-[13px] font-medium transition-all duration-200 my-0.5',
                    isActive
                      ? 'bg-[#FBAF1A]/15 text-[#FBAF1A]'
                      : 'text-white/50 hover:bg-white/[0.06] hover:text-white/80'
                  )}
                >
                  <Icon className={clsx('w-[18px] h-[18px]', isActive && 'text-[#FBAF1A]')} />
                  <span>{item.label}</span>
                  {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#FBAF1A]" />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/[0.08]">
        <div className={clsx(
          'flex items-center gap-2.5 px-3 py-2.5 rounded-xl',
          geotabConfigured ? 'bg-emerald-500/10' : 'bg-[#FBAF1A]/10'
        )}>
          <div className={clsx(
            'w-2 h-2 rounded-full',
            geotabConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-[#FBAF1A]'
          )} />
          <div>
            <div className={clsx('text-xs font-semibold', geotabConfigured ? 'text-emerald-400' : 'text-[#FBAF1A]')}>
              {geotabConfigured ? 'Geotab Connected' : 'Seed Data Mode'}
            </div>
            <div className="text-[10px] text-white/20">
              {geotabConfigured ? 'MyGeotab + Ace APIs' : 'Using demo data'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
