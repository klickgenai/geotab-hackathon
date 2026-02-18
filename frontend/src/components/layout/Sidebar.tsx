'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Shield, LayoutDashboard, Users, AlertTriangle, Heart, FileText, Truck,
  Brain, Bell, MapPin, DollarSign, UserCircle,
} from 'lucide-react';
import clsx from 'clsx';

interface SidebarProps {
  geotabConfigured: boolean;
}

const sections = [
  {
    title: 'Analytics',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/drivers', label: 'Drivers', icon: Users },
      { href: '/safety', label: 'Safety Events', icon: AlertTriangle },
      { href: '/wellness', label: 'Wellness', icon: Heart },
      { href: '/vehicles', label: 'Vehicles', icon: Truck },
      { href: '/reports', label: 'Reports', icon: FileText },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { href: '/predictive', label: 'Predictive Safety', icon: Brain },
      { href: '/alerts', label: 'Alert Triage', icon: Bell },
      { href: '/map', label: 'Live Map', icon: MapPin },
      { href: '/roi', label: 'ROI Dashboard', icon: DollarSign },
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
    <aside className="fixed left-0 top-0 bottom-0 w-[240px] bg-[#1a2332] text-white flex flex-col z-50">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-white/[0.08]">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#0078D3] to-[#3b9aed] flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-[0.95rem] tracking-tight">FleetShield AI</div>
            <div className="text-[0.6rem] text-blue-300 font-medium tracking-widest uppercase">Risk Intelligence</div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title}>
            <div className="text-[0.58rem] font-semibold text-blue-300/70 uppercase tracking-[1px] px-3 pt-3 pb-1.5">
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-2.5 w-full px-3 py-[9px] rounded-md text-[0.8rem] font-medium transition-all duration-200',
                    isActive
                      ? 'bg-[#0078D3] text-white'
                      : 'text-white/60 hover:bg-white/[0.06] hover:text-white'
                  )}
                >
                  <Icon className="w-[18px] h-[18px]" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3.5 py-3 border-t border-white/[0.08]">
        <div className="flex items-center gap-2 text-[0.68rem] text-blue-300/70">
          <div className={clsx(
            'w-[7px] h-[7px] rounded-full',
            geotabConfigured ? 'bg-emerald-400' : 'bg-amber-400'
          )} />
          <span>{geotabConfigured ? 'Geotab Connected' : 'Seed Data Mode'}</span>
        </div>
        <div className="text-[0.55rem] text-blue-300/40 mt-1">
          Powered by Geotab Telematics
        </div>
      </div>
    </aside>
  );
}
