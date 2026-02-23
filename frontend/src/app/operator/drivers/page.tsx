'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, ArrowUpDown, ChevronRight, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import PageHeader from '@/components/layout/PageHeader';
import { InsightTooltip } from '@/components/ui/InsightTooltip';
import { MethodologyPanel } from '@/components/ui/MethodologyPanel';
import { api } from '@/lib/api';
import type { DriverRisk } from '@/types/fleet';

const tierConfig = {
  low: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', bar: 'bg-emerald-400', ring: 'ring-emerald-200' },
  moderate: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', bar: 'bg-amber-400', ring: 'ring-amber-200' },
  high: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', bar: 'bg-red-400', ring: 'ring-red-200' },
  critical: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-800', bar: 'bg-red-600', ring: 'ring-red-300' },
};

type SortField = 'name' | 'riskScore' | 'tier' | 'annualizedCost';

export default function DriversPage() {
  const router = useRouter();
  const [risks, setRisks] = useState<DriverRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('riskScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const loadData = () => {
    setLoading(true);
    setError(null);
    api.driverRisks().then(setRisks).catch(() => {
      setError('Failed to load driver data. Please check that the backend is running.');
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => {
    let result = risks;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((r) => r.driverName.toLowerCase().includes(q) || r.driverId.toLowerCase().includes(q));
    }
    if (tierFilter !== 'all') {
      result = result.filter((r) => r.tier === tierFilter);
    }
    result = [...result].sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'name') return mul * a.driverName.localeCompare(b.driverName);
      if (sortField === 'riskScore') return mul * (a.riskScore - b.riskScore);
      if (sortField === 'annualizedCost') return mul * (a.annualizedCost - b.annualizedCost);
      return mul * (a.riskScore - b.riskScore);
    });
    return result;
  }, [risks, search, tierFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const tierCounts = useMemo(() => ({
    all: risks.length,
    critical: risks.filter((r) => r.tier === 'critical').length,
    high: risks.filter((r) => r.tier === 'high').length,
    moderate: risks.filter((r) => r.tier === 'moderate').length,
    low: risks.filter((r) => r.tier === 'low').length,
  }), [risks]);

  if (loading) {
    return (
      <>
        <PageHeader title="Driver Risk Analysis" subtitle="Individual driver risk profiles and scoring" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FBAF1A]" />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Driver Risk Analysis" subtitle="Error loading data" />
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="text-red-400 text-sm font-medium bg-red-500/10 border border-red-500/20 rounded-xl px-6 py-4">{error}</div>
          <button onClick={loadData} className="text-sm text-[#FBAF1A] hover:underline">Retry</button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Driver Risk Analysis" subtitle={`${risks.length} drivers monitored`} onRefresh={loadData} />

      <div className="p-6 space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-6">
          {(['critical', 'high', 'moderate', 'low'] as const).map((tier) => {
            const cfg = tierConfig[tier];
            return (
              <motion.button
                key={tier}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setTierFilter(tierFilter === tier ? 'all' : tier)}
                className={clsx(
                  'bg-white rounded-2xl border px-5 py-4 text-left transition-all duration-200 hover:shadow-md',
                  tierFilter === tier ? `border-2 ${cfg.ring}` : 'border-[#E5E2DC]'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={clsx('w-2.5 h-2.5 rounded-full', cfg.dot)} />
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide capitalize">{tier}</span>
                </div>
                <div className="text-3xl font-extrabold text-gray-900">{tierCounts[tier]}</div>
                <div className="text-xs text-gray-400">drivers</div>
              </motion.button>
            );
          })}
        </div>

        {/* Search + Filter bar */}
        <div className="bg-white rounded-2xl border border-[#E5E2DC] p-5">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search drivers..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E5E2DC] text-sm focus:outline-none focus:border-[#FBAF1A] transition-colors"
              />
            </div>
            {tierFilter !== 'all' && (
              <button
                onClick={() => setTierFilter('all')}
                className="text-xs font-medium text-[#BF7408] hover:underline"
              >
                Clear filter
              </button>
            )}
            <div className="ml-auto text-xs text-gray-400">
              Showing {filtered.length} of {risks.length}
            </div>
          </div>
        </div>

        {/* Driver list */}
        <div className="bg-white rounded-2xl border border-[#E5E2DC] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F0EDE7] bg-[#FAF9F7]">
                {[
                  { key: 'name' as SortField, label: 'Driver' },
                  { key: 'riskScore' as SortField, label: 'Risk Score' },
                  { key: 'tier' as SortField, label: 'Tier' },
                  { key: 'annualizedCost' as SortField, label: 'Cost Exposure/yr' },
                  { key: null, label: 'Top Issues' },
                  { key: null, label: '' },
                ].map((col) => (
                  <th
                    key={col.label || 'action'}
                    className={clsx(
                      'text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3',
                      col.key && 'cursor-pointer hover:text-gray-600 select-none'
                    )}
                    onClick={() => col.key && toggleSort(col.key)}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {col.key === 'annualizedCost' && <InsightTooltip metricKey="drivers.annualCostExposure" />}
                      {col.key === 'riskScore' && <InsightTooltip metricKey="drivers.riskScore" />}
                      {col.key && sortField === col.key && (
                        <ArrowUpDown className="w-3 h-3" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const cfg = tierConfig[r.tier];
                const initials = r.driverName.split(' ').map((n) => n[0]).join('');
                return (
                  <motion.tr
                    key={r.driverId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => router.push(`/operator/drivers/${r.driverId}`)}
                    className="border-b border-gray-50 hover:bg-[#FFF8EB]/50 cursor-pointer transition-colors group"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white', cfg.dot)}>
                          {initials}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-800">{r.driverName}</div>
                          <div className="text-xs text-gray-400">{r.driverId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={clsx('h-full rounded-full', cfg.bar)} style={{ width: `${r.riskScore}%` }} />
                        </div>
                        <span className="text-sm font-bold text-gray-700 tabular-nums w-8">{r.riskScore}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={clsx(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold capitalize',
                        cfg.bg, cfg.text,
                        r.tier === 'critical' && 'animate-pulse'
                      )}>
                        {r.tier === 'critical' && <AlertTriangle className="w-3 h-3" />}
                        {r.tier}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-600 tabular-nums">
                      ${r.annualizedCost.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {r.topEventTypes.slice(0, 2).map((e) => (
                          <span key={e.type} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-500 capitalize">
                            {e.type.replace(/_/g, ' ')} ({e.count})
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#BF7408] transition-colors" />
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Methodology Panel */}
        <MethodologyPanel
          title="How We Calculate Driver Risk & Cost Exposure"
          description="Each driver receives a 0-100 risk score based on their telematics safety event history. The 'Cost Exposure' column shows the statistically expected annual financial risk this driver represents — NOT an actual cost incurred. It represents potential liability from accidents, insurance impact, and operational disruption."
          formulas={[
            {
              label: 'Driver Risk Score (0-100)',
              formula: 'score = (event_frequency x 0.40) + (severity x 0.25) + (pattern x 0.20) + (trend x 0.15)',
              example: 'Frequency: 60 x 0.40 = 24, Severity: 70 x 0.25 = 17.5, Pattern: 50 x 0.20 = 10, Trend: 40 x 0.15 = 6 = Total: 57.5 (high tier)',
            },
            {
              label: 'Risk Tiers',
              formula: 'Low: 0-25 | Moderate: 26-50 | High: 51-75 | Critical: 76-100',
              example: 'A score of 57.5 falls in the "high" tier',
            },
            {
              label: 'Annual Cost Exposure by Tier',
              formula: 'Low = $2,000 | Moderate = $8,000 | High = $25,000 | Critical = $65,000',
              example: 'A critical-tier driver at $65K represents ~1 major accident per 1-2 years at $91K avg cost, discounted for probability',
              source: 'FMCSA/NHTSA: $91K avg accident cost (vehicle damage + medical + liability + downtime)',
            },
            {
              label: 'Event Frequency Score (40% weight)',
              formula: 'events per 1,000 miles driven, normalized to 0-100 scale',
              example: 'Industry avg: ~12 events/1K miles. Below 5 = low risk; above 20 = critical risk',
            },
            {
              label: 'Severity Score (25% weight)',
              formula: 'weighted average: critical events x 4 + high x 2 + moderate x 1, normalized',
              example: 'Driver with mostly critical events scores much higher than one with the same count of moderate events',
            },
            {
              label: 'Pattern Score (20% weight)',
              formula: 'Measures behavioral concentration — do events cluster around one bad habit?',
              example: 'Driver who only speeds vs. driver with varied events. Concentrated = higher pattern score',
            },
            {
              label: 'Trend Score (15% weight)',
              formula: 'Compares recent 30-day event rate to prior 30-day rate',
              example: 'Worsening trend adds points; improving trend subtracts points',
            },
          ]}
          sources={[
            'FMCSA/NHTSA: $91,000 average commercial vehicle accident cost',
            'Cost tiers based on actuarial accident probability by risk level',
            'Geotab telematics: safety events, GPS, trip data, driver identification',
            'Important: cost exposure is potential risk, not actual incurred cost',
          ]}
        />
      </div>
    </>
  );
}
