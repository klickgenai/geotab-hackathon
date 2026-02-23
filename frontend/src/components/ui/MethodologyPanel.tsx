'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronDown } from 'lucide-react';

export interface FormulaItem {
  label: string;
  formula: string;
  example?: string;
  source?: string;
}

interface MethodologyPanelProps {
  title?: string;
  description: string;
  formulas: FormulaItem[];
  sources?: string[];
}

export function MethodologyPanel({
  title = 'How We Calculate This',
  description,
  formulas,
  sources,
}: MethodologyPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-[#E5E2DC] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#FAF9F7] transition-colors"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#BF7408]" />
          <span className="text-sm font-bold text-gray-900">{title}</span>
          <span className="text-xs text-gray-400 ml-1">Transparent methodology</span>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 space-y-4 border-t border-[#F0EDE7]">
              <p className="text-sm text-gray-600 leading-relaxed pt-4">{description}</p>

              <div className="space-y-3">
                {formulas.map((f, i) => (
                  <div
                    key={i}
                    className="bg-[#F5F3EF] rounded-xl p-4 space-y-1.5"
                  >
                    <div className="text-xs font-bold text-[#BF7408] uppercase tracking-wider">
                      {f.label}
                    </div>
                    <div className="text-sm text-gray-800 font-mono leading-relaxed">
                      {f.formula}
                    </div>
                    {f.example && (
                      <div className="text-xs text-gray-500 leading-relaxed">
                        <span className="font-semibold">Example:</span> {f.example}
                      </div>
                    )}
                    {f.source && (
                      <div className="text-[10px] text-gray-400">
                        Source: {f.source}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {sources && sources.length > 0 && (
                <div className="pt-2 border-t border-[#F0EDE7]">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Data Sources
                  </div>
                  <div className="space-y-0.5">
                    {sources.map((s, i) => (
                      <div key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                        <span className="text-[#BF7408] mt-0.5">*</span>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
