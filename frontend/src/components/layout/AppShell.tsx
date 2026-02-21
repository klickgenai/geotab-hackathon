'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from './Sidebar';

import { api } from '@/lib/api';

/* ---------- Types ---------- */
interface CompletedMission {
  missionId: string;
  type: string;
  displayName: string;
  status: string;
  summary: string;
  completedAt: string;
  duration: number;
}

/* ---------- Notification Bell ---------- */
function MissionNotificationBell() {
  const router = useRouter();
  const pathname = usePathname();
  const [completedMissions, setCompletedMissions] = useState<CompletedMission[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [showDropdown, setShowDropdown] = useState(false);
  const [toast, setToast] = useState<CompletedMission | null>(null);
  const prevCompletedRef = useRef<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isOnAssistant = pathname.startsWith('/operator/assistant');

  // Poll for missions
  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const data = await api.missionsActive();
        if (!active) return;
        const completed = (data.completed || []) as CompletedMission[];
        setCompletedMissions(completed);

        // Detect newly completed missions for toast
        // Skip toast if already on assistant page (result shows inline)
        const currentIds = new Set(completed.map(m => m.missionId));
        if (!isOnAssistant) {
          for (const m of completed) {
            if (!prevCompletedRef.current.has(m.missionId)) {
              setToast(m);
              setTimeout(() => setToast(null), 8000);
            }
          }
        }
        prevCompletedRef.current = currentIds;
      } catch {
        // Backend not running
      }
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [isOnAssistant]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const undismissed = completedMissions.filter(m => !dismissedIds.has(m.missionId));
  const badgeCount = undismissed.length;

  const handleClick = useCallback((mission: CompletedMission) => {
    setShowDropdown(false);
    setDismissedIds(prev => new Set([...prev, mission.missionId]));
    router.push(`/operator/assistant?mission=${mission.missionId}`);
  }, [router]);

  if (badgeCount === 0 && !toast) return null;

  return (
    <>
      {/* Toast notification */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-[60] animate-in slide-in-from-top-2 cursor-pointer"
          onClick={() => { handleClick(toast); setToast(null); }}
        >
          <div className="bg-[#18202F] text-white rounded-xl px-5 py-3.5 shadow-2xl shadow-black/30 border border-white/10 max-w-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold">{toast.displayName} completed</div>
                <div className="text-xs text-white/50 truncate mt-0.5">Click to view results</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bell icon with badge */}
      {badgeCount > 0 && (
        <div ref={dropdownRef} className="fixed top-4 right-4 z-50">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="relative w-10 h-10 rounded-xl bg-white border border-[#E5E2DC] shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
              {badgeCount}
            </span>
          </button>

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute top-12 right-0 w-80 bg-white rounded-xl shadow-2xl border border-[#E5E2DC] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#E5E2DC]">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Completed Missions</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {undismissed.map(m => (
                  <button
                    key={m.missionId}
                    onClick={() => handleClick(m)}
                    className="w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left border-b border-[#E5E2DC] last:border-0"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-gray-900">{m.displayName}</div>
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{m.summary}</div>
                      <div className="text-[10px] text-gray-400 mt-1">
                        {m.duration.toFixed(1)}s &middot; {new Date(m.completedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* ---------- Main AppShell ---------- */

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [geotabConfigured, setGeotabConfigured] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    api.health().then((h) => setGeotabConfigured(h.geotabConfigured)).catch(() => {});
  }, []);

  // Landing page, driver portal, and full-screen assistant have no sidebar
  if (pathname === '/' || pathname.startsWith('/driver-portal') || pathname.startsWith('/operator/assistant')) {
    return (
      <>
        {/* Show mission notifications on assistant page too */}
        {pathname.startsWith('/operator/assistant') && <MissionNotificationBell />}
        {children}
      </>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F5F3EF]">
      <Sidebar geotabConfigured={geotabConfigured} />
      <main className="ml-[240px] flex-1 min-h-screen">
        {children}
      </main>
      <MissionNotificationBell />
    </div>
  );
}
