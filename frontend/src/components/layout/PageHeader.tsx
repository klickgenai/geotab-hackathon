'use client';

import { RefreshCw } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  actions?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, onRefresh, actions }: PageHeaderProps) {
  return (
    <header className="h-[72px] bg-white/80 backdrop-blur-lg border-b border-[#E5E2DC] flex items-center justify-between px-8 sticky top-0 z-40">
      <div>
        <h1 className="text-[22px] font-extrabold text-[#18202F] tracking-tight leading-tight">{title}</h1>
        {subtitle && <p className="text-[13px] text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2.5">
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-medium border border-[#E5E2DC] text-gray-600 hover:border-[#FBAF1A] hover:text-[#BF7408] transition-all duration-200 bg-white"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        )}
        {actions}
      </div>
    </header>
  );
}
