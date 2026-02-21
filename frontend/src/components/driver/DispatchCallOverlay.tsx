'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Phone, Shield, Loader2, CheckCircle } from 'lucide-react';
import type { DispatchPhase } from '@/lib/voice-client';

interface DispatchCallOverlayProps {
  active: boolean;
  messages: { role: string; text: string }[];
  summary: string;
  phase: DispatchPhase | null;
  onClose: () => void;
}

export function DispatchCallOverlay({ active, messages, summary, phase, onClose }: DispatchCallOverlayProps) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
          onClick={() => { if (summary) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#18202F] rounded-2xl border border-white/10 w-[420px] max-h-[550px] overflow-hidden"
          >
            {/* Header */}
            <div className={`px-5 py-4 flex items-center gap-3 transition-colors ${
              summary ? 'bg-emerald-600' :
              phase === 'error' ? 'bg-red-600' :
              'bg-[#FBAF1A]'
            }`}>
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center">
                  {summary ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : (
                    <MessageCircle className="w-5 h-5 text-[#18202F]" />
                  )}
                </div>
                {!summary && phase !== 'error' && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-white/40"
                    animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
              </div>
              <div className="flex-1">
                <div className={`font-semibold ${summary ? 'text-white' : 'text-[#18202F]'}`}>
                  Tasha → Dispatch (Mike)
                </div>
                <div className={`text-xs ${summary ? 'text-white/70' : 'text-[#18202F]/70'}`}>
                  {summary ? 'Done' :
                   phase === 'connecting' ? 'Tasha is reaching dispatch...' :
                   phase === 'on_call' ? 'Tasha is talking to Mike' :
                   phase === 'wrapping_up' ? 'Wrapping up...' :
                   phase === 'error' ? 'Could not reach dispatch' :
                   'Connecting...'}
                </div>
              </div>
              {!summary && phase && phase !== 'error' && (
                <div className="flex items-center gap-1">
                  {[0, 0.3, 0.6].map((d) => (
                    <motion.div key={d} className="w-1.5 h-1.5 rounded-full bg-[#18202F]/50"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: d }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="px-5 py-4 space-y-3 max-h-[350px] overflow-y-auto">
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${m.role === 'ava' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.role === 'dispatcher' && (
                    <div className="w-6 h-6 rounded-full bg-[#FBAF1A]/20 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                      <Phone className="w-3 h-3 text-[#FBAF1A]" />
                    </div>
                  )}
                  <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    m.role === 'ava'
                      ? 'bg-blue-500 text-white rounded-br-sm'
                      : 'bg-[#0F1520] text-gray-300 border border-white/5 rounded-bl-sm'
                  }`}>
                    <div className="text-[10px] font-semibold mb-0.5 opacity-70">
                      {m.role === 'ava' ? 'Tasha' : 'Mike'}
                    </div>
                    {m.text}
                  </div>
                  {m.role === 'ava' && (
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center ml-2 mt-1 flex-shrink-0">
                      <Shield className="w-3 h-3 text-blue-400" />
                    </div>
                  )}
                </motion.div>
              ))}

              {!summary && messages.length === 0 && (
                <div className="text-center py-6">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                    <Loader2 className="w-6 h-6 text-[#FBAF1A] mx-auto" />
                  </motion.div>
                  <div className="text-gray-500 text-xs mt-3">
                    {phase === 'connecting' ? 'Tasha is reaching out to Mike at dispatch...' : 'Tasha is contacting dispatch...'}
                  </div>
                </div>
              )}

              {!summary && messages.length > 0 && phase !== 'complete' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="w-6 h-6 rounded-full bg-[#FBAF1A]/20 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                    <Phone className="w-3 h-3 text-[#FBAF1A]" />
                  </div>
                  <div className="bg-[#0F1520] border border-white/5 rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1">
                      {[0, 0.2, 0.4].map((d) => (
                        <motion.div key={d} className="w-1.5 h-1.5 rounded-full bg-gray-500"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity, delay: d }} />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {summary && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 text-sm text-gray-300"
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-400 uppercase">Call Summary</span>
                  </div>
                  {summary}
                </motion.div>
              )}
            </div>

            {summary && (
              <div className="px-5 pb-4">
                <button onClick={onClose}
                  className="w-full py-2.5 rounded-xl bg-[#FBAF1A] text-[#18202F] text-sm font-semibold hover:bg-[#BF7408] transition-colors">
                  Close
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
