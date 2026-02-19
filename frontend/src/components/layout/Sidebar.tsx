'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Shield, LayoutDashboard, Users, AlertTriangle, Heart, Truck,
  Brain, Bell, MapPin, DollarSign, UserCircle, Award,
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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FBAF1A] to-[#BF7408] flex items-center justify-center shadow-lg shadow-[#FBAF1A]/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-base tracking-tight">FleetShield AI</div>
            <div className="text-[10px] text-[#FBAF1A]/70 font-medium tracking-[2px] uppercase">Risk Intelligence</div>
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
