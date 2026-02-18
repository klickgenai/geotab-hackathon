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

  // Driver portal has its own layout (no sidebar)
  if (pathname.startsWith('/driver-portal')) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar geotabConfigured={geotabConfigured} />
      <main className="ml-[240px] flex-1 min-h-screen">
        {children}
      </main>
      <ChatPanel />
    </div>
  );
}
