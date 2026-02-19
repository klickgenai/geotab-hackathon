'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import ChatPanel from '@/components/chat/ChatPanel';
import { api } from '@/lib/api';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [geotabConfigured, setGeotabConfigured] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    api.health().then((h) => setGeotabConfigured(h.geotabConfigured)).catch(() => {});
  }, []);

  // Landing page and driver portal have no sidebar
  if (pathname === '/' || pathname.startsWith('/driver-portal')) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-[#F5F3EF]">
      <Sidebar geotabConfigured={geotabConfigured} />
      <main className="ml-[260px] flex-1 min-h-screen">
        {children}
      </main>
      <ChatPanel />
    </div>
  );
}
