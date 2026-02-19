'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Send, Loader2, Sparkles, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api';

const QUICK_QUERIES = [
  { label: 'Speeding trends', prompt: 'What is my fleet\'s speeding trend?' },
  { label: 'Maintenance needs', prompt: 'Which vehicles need maintenance?' },
  { label: 'Safety concerns', prompt: 'Show me top safety concerns' },
  { label: 'Driver performance', prompt: 'How are my drivers performing?' },
];

export default function AceInsights() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const submitQuery = useCallback(async (prompt: string) => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setResponse(null);
    setUnavailable(false);

    try {
      const result = await api.aceQuery(prompt.trim());
      if (result.status === 'unavailable') {
        setUnavailable(true);
        setResponse(null);
      } else {
        setResponse(result.text);
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
            className="px-4 py-3 rounded-xl bg-[#FAF9F7] border border-[#E5E2DC]"
          >
            <div className="flex items-start gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{response}</p>
            </div>
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
