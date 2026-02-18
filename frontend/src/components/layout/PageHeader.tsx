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
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-7 sticky top-0 z-40">
      <div>
        <h1 className="text-[1.05rem] font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-[0.7rem] text-gray-400">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2.5">
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-[7px] rounded-md text-[0.78rem] font-medium border border-gray-200 text-gray-600 hover:border-[#0078D3] hover:text-[#0078D3] transition-all duration-200 bg-white"
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
