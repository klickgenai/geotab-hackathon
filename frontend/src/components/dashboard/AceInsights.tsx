'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Send, Loader2, Sparkles, MessageSquare, AlertTriangle, Wrench, Truck } from 'lucide-react';
import { api } from '@/lib/api';

const QUICK_QUERIES = [
  { label: 'Speeding trends', prompt: 'What is my fleet\'s speeding trend?' },
  { label: 'Maintenance needs', prompt: 'Which vehicles need maintenance?' },
  { label: 'Safety concerns', prompt: 'Show me top safety concerns' },
  { label: 'Driver performance', prompt: 'How are my drivers performing?' },
];

// Map raw Geotab column names to friendly display names
const COLUMN_LABELS: Record<string, string> = {
  AssetName: 'Vehicle',
  FaultCodeDescription: 'Issue',
  FaultSeverity: 'Severity',
  DiagnosticType: 'Type',
  LastSeen: 'Last Seen',
  DeviceName: 'Device',
  DriverName: 'Driver',
  Distance: 'Distance (km)',
  Duration: 'Duration',
  Speed: 'Speed',
  MaxSpeed: 'Max Speed',
  AverageSpeed: 'Avg Speed',
  SpeedingCount: 'Speeding Count',
  HarshBrakingCount: 'Harsh Braking',
  IdlingDuration: 'Idling',
  FuelUsed: 'Fuel Used (L)',
  VehicleName: 'Vehicle',
  TripCount: 'Trips',
  StartTime: 'Start',
  EndTime: 'End',
  StopDuration: 'Stop Duration',
};

// Columns to hide — too technical for display
const HIDDEN_COLUMNS = new Set([
  'DeviceTimeZoneId',
  'DeviceId',
  'FaultCode',
  'Id',
  'id',
  'DeviceSerialNumber',
]);

function formatColumnName(key: string): string {
  if (COLUMN_LABELS[key]) return COLUMN_LABELS[key];
  // Convert camelCase/snake_case to Title Case
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatCellValue(val: unknown, key: string): string {
  if (val === null || val === undefined) return '-';
  if (typeof val === 'number') {
    return Number.isInteger(val) ? String(val) : (val as number).toFixed(1);
  }
  const str = String(val);
  // Format timestamps to be more readable
  if (key.toLowerCase().includes('time') || key.toLowerCase().includes('seen') || key.toLowerCase().includes('date')) {
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
               d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      }
    } catch { /* use raw */ }
  }
  return str;
}

function getSeverityStyle(val: unknown): string {
  const s = String(val ?? '').toLowerCase();
  if (s.includes('critical') || s.includes('high') || s.includes('severe')) return 'text-red-600 bg-red-50 border-red-200';
  if (s.includes('warning') || s.includes('medium') || s.includes('moderate')) return 'text-amber-600 bg-amber-50 border-amber-200';
  if (s.includes('low') || s.includes('minor') || s.includes('info')) return 'text-blue-600 bg-blue-50 border-blue-200';
  return '';
}

function getIssueIcon(description: string) {
  const d = description.toLowerCase();
  if (d.includes('collision') || d.includes('acceleration') || d.includes('speed')) return <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />;
  if (d.includes('maintenance') || d.includes('fault') || d.includes('warning') || d.includes('device')) return <Wrench className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />;
  return <Truck className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />;
}

interface AceDataTableProps {
  data: Record<string, unknown>[];
}

function AceDataTable({ data }: AceDataTableProps) {
  const visibleColumns = useMemo(() => {
    if (!data.length) return [];
    return Object.keys(data[0]).filter(k => !HIDDEN_COLUMNS.has(k));
  }, [data]);

  const hasIssueColumn = visibleColumns.includes('FaultCodeDescription');
  const hasVehicleColumn = visibleColumns.includes('AssetName') || visibleColumns.includes('VehicleName');

  // If it's a fault/maintenance result, show card layout
  if (hasIssueColumn && hasVehicleColumn) {
    const vehicleKey = visibleColumns.includes('AssetName') ? 'AssetName' : 'VehicleName';
    return (
      <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto">
        {data.slice(0, 15).map((row, i) => {
          const desc = String(row.FaultCodeDescription ?? '');
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white border border-[#E5E2DC] hover:border-indigo-200 transition-colors"
            >
              {getIssueIcon(desc)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-gray-800">{String(row[vehicleKey] ?? '-')}</span>
                  {row.DiagnosticType ? (
                    <span className="text-[9px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                      {String(row.DiagnosticType)}
                    </span>
                  ) : null}
                </div>
                <p className="text-[11px] text-gray-600 leading-snug">{desc}</p>
                {row.LastSeen ? (
                  <p className="text-[10px] text-gray-400 mt-1">{formatCellValue(row.LastSeen, 'LastSeen')}</p>
                ) : null}
              </div>
            </motion.div>
          );
        })}
        {data.length > 15 && (
          <p className="text-[10px] text-gray-400 text-center py-1">
            Showing 15 of {data.length} results
          </p>
        )}
      </div>
    );
  }

  // Generic table for other data types
  return (
    <div className="mt-3 overflow-x-auto max-h-[300px] overflow-y-auto rounded-lg border border-[#E5E2DC]">
      <table className="w-full text-xs border-collapse">
        <thead className="sticky top-0 bg-[#FAF9F7]">
          <tr className="border-b border-[#E5E2DC]">
            {visibleColumns.map((key) => (
              <th key={key} className="text-left py-2 px-2.5 font-semibold text-gray-500 text-[10px] uppercase tracking-wide whitespace-nowrap">
                {formatColumnName(key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 15).map((row, i) => (
            <motion.tr
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="border-b border-[#E5E2DC]/50 last:border-0 hover:bg-indigo-50/30 transition-colors"
            >
              {visibleColumns.map((key) => {
                const val = row[key];
                const sevStyle = (key.toLowerCase().includes('severity') || key.toLowerCase().includes('priority')) ? getSeverityStyle(val) : '';
                return (
                  <td key={key} className="py-1.5 px-2.5 text-gray-600 whitespace-nowrap">
                    {sevStyle ? (
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border ${sevStyle}`}>
                        {formatCellValue(val, key)}
                      </span>
                    ) : (
                      <span className="text-[11px]">{formatCellValue(val, key)}</span>
                    )}
                  </td>
                );
              })}
            </motion.tr>
          ))}
        </tbody>
      </table>
      {data.length > 15 && (
        <p className="text-[10px] text-gray-400 text-center py-1.5 border-t border-[#E5E2DC]/50">
          Showing 15 of {data.length} results
        </p>
      )}
    </div>
  );
}

export default function AceInsights() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [responseData, setResponseData] = useState<Record<string, unknown>[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const submitQuery = useCallback(async (prompt: string) => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setResponse(null);
    setResponseData(null);
    setUnavailable(false);

    try {
      const result = await api.aceQuery(prompt.trim());
      if (result.status === 'unavailable') {
        setUnavailable(true);
        setResponse(null);
      } else {
        setResponse(result.text);
        if (Array.isArray(result.data) && result.data.length > 0) {
          setResponseData(result.data as Record<string, unknown>[]);
        }
      }
    } catch {
      setResponse('Unable to reach Geotab Ace. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    submitQuery(query);
  }, [query, submitQuery]);

  const handleQuickQuery = useCallback((prompt: string) => {
    setQuery(prompt);
    submitQuery(prompt);
  }, [submitQuery]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, duration: 0.5 }}
      className="bg-white rounded-2xl border border-[#E5E2DC] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.5px]">
            Ace AI Insights
          </h2>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-100">
            <Sparkles className="w-3 h-3 text-indigo-500" />
            <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wide">Live</span>
          </span>
        </div>
        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
          <Brain className="w-4 h-4 text-indigo-600" />
        </div>
      </div>

      {/* Quick query chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {QUICK_QUERIES.map((q) => (
          <button
            key={q.label}
            onClick={() => handleQuickQuery(q.prompt)}
            disabled={loading}
            className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 hover:border-indigo-200 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="relative mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask about your fleet..."
          disabled={loading}
          className="w-full pl-4 pr-11 py-2.5 text-sm rounded-xl border border-[#E5E2DC] bg-[#FAF9F7] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all duration-200 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
        </button>
      </form>

      {/* Response area */}
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-indigo-50/60 border border-indigo-100"
          >
            <Loader2 className="w-4 h-4 text-indigo-500 animate-spin flex-shrink-0" />
            <span className="text-xs text-indigo-600 font-medium">Analyzing fleet data with Geotab Ace...</span>
          </motion.div>
        )}

        {unavailable && !loading && (
          <motion.div
            key="unavailable"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200"
          >
            <p className="text-xs text-amber-700 font-medium">
              Geotab Ace requires an active Geotab connection. Configure your Geotab credentials in the backend to enable natural language fleet analytics.
            </p>
          </motion.div>
        )}

        {response && !loading && !unavailable && (
          <motion.div
            key="response"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl bg-[#FAF9F7] border border-[#E5E2DC] overflow-hidden"
          >
            <div className="px-4 py-3">
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700 leading-relaxed">{response}</p>
              </div>
            </div>
            {responseData && responseData.length > 0 && (
              <div className="px-3 pb-3">
                <AceDataTable data={responseData} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Powered by badge */}
      <div className="flex items-center justify-end mt-3">
        <span className="inline-flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
          Powered by
          <span className="font-bold text-indigo-500">Geotab Ace</span>
        </span>
      </div>
    </motion.div>
  );
}
