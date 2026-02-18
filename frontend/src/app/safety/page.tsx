'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AlertTriangle, Filter, Search, MapPin } from 'lucide-react';
import clsx from 'clsx';
import PageHeader from '@/components/layout/PageHeader';
import { api } from '@/lib/api';
import type { SafetyEvent, Driver } from '@/types/fleet';

const severityConfig = {
  low: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400', label: 'Low' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Medium' },
  high: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: 'High' },
  critical: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-700', label: 'Critical' },
};

export default function SafetyEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<SafetyEvent[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.events({ limit: 500 }),
      api.drivers(),
    ]).then(([e, d]) => {
      setEvents(e);
      setDrivers(d);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const driverMap = useMemo(() => {
    const map: Record<string, string> = {};
    drivers.forEach((d) => { map[d.id] = d.name; });
    return map;
  }, [drivers]);

  const eventTypes = useMemo(() => {
    const types = new Set(events.map((e) => e.type));
    return Array.from(types).sort();
  }, [events]);

  const filtered = useMemo(() => {
    let result = events;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((e) =>
        e.type.toLowerCase().includes(q) ||
        (driverMap[e.driverId] || '').toLowerCase().includes(q) ||
        e.details.toLowerCase().includes(q)
      );
    }
    if (severityFilter !== 'all') {
      result = result.filter((e) => e.severity === severityFilter);
    }
    if (typeFilter !== 'all') {
      result = result.filter((e) => e.type === typeFilter);
    }
    return result.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }, [events, search, severityFilter, typeFilter, driverMap]);

  const severityCounts = useMemo(() => ({
    critical: events.filter((e) => e.severity === 'critical').length,
    high: events.filter((e) => e.severity === 'high').length,
    medium: events.filter((e) => e.severity === 'medium').length,
    low: events.filter((e) => e.severity === 'low').length,
  }), [events]);

  if (loading) {
    return (
      <>
        <PageHeader title="Safety Events" subtitle="Loading events..." />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0078D3]" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Safety Events" subtitle={`${events.length} events in last 30 days`} onRefresh={loadData} />

      <div className="p-6 space-y-4 max-w-[1400px]">
        {/* Severity summary */}
        <div className="grid grid-cols-4 gap-4">
          {(['critical', 'high', 'medium', 'low'] as const).map((sev) => {
            const cfg = severityConfig[sev];
            return (
              <motion.button
                key={sev}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSeverityFilter(severityFilter === sev ? 'all' : sev)}
                className={clsx(
                  'bg-white rounded-xl border px-5 py-4 text-left transition-all hover:shadow-md',
                  severityFilter === sev ? 'border-2 border-gray-400' : 'border-gray-200'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={clsx('w-2.5 h-2.5 rounded-full', cfg.dot)} />
                  <span className="text-[0.7rem] font-semibold text-gray-400 uppercase">{cfg.label}</span>
                </div>
                <div className="text-[2rem] font-extrabold text-gray-900">{severityCounts[sev]}</div>
                <div className="text-[0.7rem] text-gray-400">events</div>
              </motion.button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events, drivers..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0078D3] transition-colors"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#0078D3]"
            >
              <option value="all">All Types</option>
              {eventTypes.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
            {(severityFilter !== 'all' || typeFilter !== 'all') && (
              <button
                onClick={() => { setSeverityFilter('all'); setTypeFilter('all'); }}
                className="text-xs font-medium text-[#0078D3] hover:underline"
              >
                Clear filters
              </button>
            )}
            <div className="ml-auto text-xs text-gray-400">
              Showing {filtered.length} of {events.length}
            </div>
          </div>
        </div>

        {/* Events timeline */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {filtered.slice(0, 100).map((event, i) => {
              const cfg = severityConfig[event.severity];
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.01 }}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition-colors cursor-pointer"
                  onClick={() => router.push(`/drivers/${event.driverId}`)}
                >
                  <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', cfg.bg)}>
                    <AlertTriangle className={clsx('w-5 h-5', cfg.text)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[0.82rem] font-semibold text-gray-800 capitalize">{event.type.replace(/_/g, ' ')}</span>
                      <span className={clsx('px-2 py-0.5 rounded text-[0.6rem] font-bold uppercase', cfg.bg, cfg.text)}>
                        {event.severity}
                      </span>
                    </div>
                    <div className="text-[0.7rem] text-gray-400 mt-0.5">
                      {driverMap[event.driverId] || event.driverId} &middot; {event.vehicleId}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[0.68rem] text-gray-400">
                    <MapPin className="w-3 h-3" />
                    {event.latitude.toFixed(2)}, {event.longitude.toFixed(2)}
                  </div>
                  <div className="text-[0.72rem] text-gray-400 tabular-nums whitespace-nowrap">
                    {new Date(event.dateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
