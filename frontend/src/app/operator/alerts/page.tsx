'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import PageHeader from '@/components/layout/PageHeader';
import type { TriagedAlert, AlertBriefing } from '@/types/fleet';
import { Bell, AlertTriangle, Shield, Wrench, Activity, Loader2 } from 'lucide-react';
import { InsightTooltip } from '@/components/ui/InsightTooltip';

const priorityConfig = {
  critical: { color: 'border-l-red-500 bg-red-50/30', badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  high: { color: 'border-l-orange-500 bg-orange-50/30', badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  medium: { color: 'border-l-amber-500 bg-amber-50/20', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  low: { color: 'border-l-emerald-500', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
};

const categoryIcons = {
  behavioral: <Activity className="w-3.5 h-3.5" />,
  compliance: <Shield className="w-3.5 h-3.5" />,
  mechanical: <Wrench className="w-3.5 h-3.5" />,
  pattern: <AlertTriangle className="w-3.5 h-3.5" />,
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<TriagedAlert[]>([]);
  const [briefing, setBriefing] = useState<AlertBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([api.alerts(), api.alertBriefing()]);
      setAlerts(a); setBriefing(b);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-[#FBAF1A]" />
      </div>
    );
  }

  const filtered = alerts.filter((a) => {
    if (priorityFilter !== 'all' && a.priority !== priorityFilter) return false;
    if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
    return true;
  });

  const priorityCounts = {
    critical: alerts.filter((a) => a.priority === 'critical').length,
    high: alerts.filter((a) => a.priority === 'high').length,
    medium: alerts.filter((a) => a.priority === 'medium').length,
    low: alerts.filter((a) => a.priority === 'low').length,
  };

  return (
    <>
      <PageHeader title="Alert Triage" subtitle="AI-prioritized safety alerts" onRefresh={load} />

      <div className="p-8 space-y-8 max-w-[1520px]">
        {/* Briefing Banner */}
        {briefing && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-[#18202F] to-[#2D3748] rounded-2xl p-6 text-white">
            <div className="flex items-start gap-6">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-300">{briefing.criticalCount}</div>
                  <div className="text-xs uppercase tracking-wider text-[#FBAF1A]/70">Critical</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-300">{briefing.highCount}</div>
                  <div className="text-xs uppercase tracking-wider text-[#FBAF1A]/70">High</div>
                </div>
              </div>
              <div className="flex-1 text-sm text-[#FBAF1A]/50 leading-relaxed">
                {briefing.fleetRiskSummary}
              </div>
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-500 mr-1 flex items-center gap-1">Priority: <InsightTooltip metricKey="alerts.priorityLevel" /></span>
            {['all', 'critical', 'high', 'medium', 'low'].map((p) => (
              <button key={p} onClick={() => setPriorityFilter(p)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  priorityFilter === p
                    ? 'border-[#18202F] bg-[#18202F] text-white'
                    : 'border-[#E5E2DC] text-gray-500 hover:border-gray-300'
                }`}>
                {p === 'all' ? 'All' : `${p.charAt(0).toUpperCase() + p.slice(1)} (${priorityCounts[p as keyof typeof priorityCounts] || 0})`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-500 mr-1 flex items-center gap-1">Category: <InsightTooltip metricKey="alerts.category" /></span>
            {['all', 'behavioral', 'compliance', 'mechanical', 'pattern'].map((c) => (
              <button key={c} onClick={() => setCategoryFilter(c)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  categoryFilter === c
                    ? 'border-[#18202F] bg-[#18202F] text-white'
                    : 'border-[#E5E2DC] text-gray-500 hover:border-gray-300'
                }`}>
                {c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Alert Cards */}
        <div className="space-y-3">
          {(showAllAlerts ? filtered : filtered.slice(0, 30)).map((alert, i) => {
            const pc = priorityConfig[alert.priority];
            return (
              <motion.div key={alert.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className={`border border-[#E5E2DC] rounded-lg p-5 border-l-4 ${pc.color} hover:shadow-sm transition-shadow`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${pc.badge}`}>
                        {alert.priority}
                      </span>
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-xs font-medium text-gray-600">
                        {categoryIcons[alert.category]}
                        {alert.category}
                      </span>
                      <span className="text-xs text-gray-400">{timeAgo(alert.timestamp)}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">{alert.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{alert.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>Driver: <b className="text-gray-700">{alert.affectedDriver.name}</b></span>
                      <span>Vehicle: <b className="text-gray-700">{alert.affectedVehicle}</b></span>
                      <span>{alert.relatedEvents.length} related events</span>
                    </div>
                    <div className="mt-2.5 bg-[#FFF8EB] rounded-lg p-2.5">
                      <div className="text-xs font-semibold text-[#BF7408] uppercase mb-0.5">Suggested Action</div>
                      <div className="text-xs text-gray-700">{alert.suggestedAction}</div>
                    </div>
                  </div>
                  <div className="ml-4 text-center flex-shrink-0">
                    <div className="text-xs text-gray-400 uppercase font-medium flex items-center gap-1">Urgency <InsightTooltip metricKey="alerts.urgencyScore" /></div>
                    <div className={`text-lg font-bold ${
                      alert.urgencyScore >= 75 ? 'text-red-600' : alert.urgencyScore >= 50 ? 'text-orange-600' : alert.urgencyScore >= 25 ? 'text-amber-600' : 'text-emerald-600'
                    }`}>{alert.urgencyScore}</div>
                    <div className="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
                      <div className={`h-1.5 rounded-full ${
                        alert.urgencyScore >= 75 ? 'bg-red-500' : alert.urgencyScore >= 50 ? 'bg-orange-500' : alert.urgencyScore >= 25 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`} style={{ width: `${alert.urgencyScore}%` }} />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {!showAllAlerts && filtered.length > 30 && (
          <button
            onClick={() => setShowAllAlerts(true)}
            className="w-full py-3 text-sm font-medium text-[#BF7408] hover:bg-[#FFF8EB] rounded-lg transition-colors"
          >
            Show all {filtered.length} alerts ({filtered.length - 30} more)
          </button>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <div className="text-sm">No alerts match your filters</div>
          </div>
        )}
      </div>
    </>
  );
}
