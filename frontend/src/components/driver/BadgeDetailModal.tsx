'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import type { Badge } from '@/types/fleet';

interface BadgeDetailModalProps {
  badge: Badge | null;
  onClose: () => void;
}

export function BadgeDetailModal({ badge, onClose }: BadgeDetailModalProps) {
  return (
    <AnimatePresence>
      {badge && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#18202F] rounded-2xl border border-white/10 p-6 w-[320px] text-center"
          >
            <span className={`text-5xl block mb-3 ${badge.earned ? '' : 'grayscale opacity-60'}`}>
              {badge.icon}
            </span>
            <h3 className="text-lg font-bold text-white">{badge.name}</h3>
            <p className="text-sm text-gray-400 mt-1">{badge.description}</p>
            <div className="mt-3 text-xs text-gray-500">{badge.requirement}</div>

            {badge.earned ? (
              <div className="mt-3 flex items-center justify-center gap-1 text-emerald-400 text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                Earned {badge.earnedDate ? new Date(badge.earnedDate).toLocaleDateString() : ''}
              </div>
            ) : (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1 text-xs text-gray-500">
                  <span>Progress</span>
                  <span>{Math.round(badge.progress * 100)}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#0F1520] overflow-hidden">
                  <div className="h-full rounded-full bg-gray-500" style={{ width: `${Math.round(badge.progress * 100)}%` }} />
                </div>
              </div>
            )}

            <button
              onClick={onClose}
              className="mt-4 px-6 py-2 rounded-xl bg-[#0F1520] text-gray-400 text-sm font-medium hover:bg-white/10 transition-colors"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
