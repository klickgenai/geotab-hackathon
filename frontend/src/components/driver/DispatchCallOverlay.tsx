'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Phone, Shield, Loader2, CheckCircle, PhoneCall, AlertCircle } from 'lucide-react';
import type { DispatchPhase } from '@/lib/voice-client';

export type DispatchMode = 'simulated' | 'twilio';
export type AICallState = 'initiating' | 'ringing' | 'greeting' | 'on_call' | 'wrapping_up' | 'complete' | 'failed';

interface DispatchCallOverlayProps {
  active: boolean;
  mode: DispatchMode;
  // Simulated mode props
  messages: { role: string; text: string }[];
  summary: string;
  phase: DispatchPhase | null;
  // Twilio AI mode props
  aiState?: AICallState;
  aiTranscript?: { role: string; text: string; timestamp?: string }[];
  aiSummary?: string;
  onClose: () => void;
}

function stateLabel(aiState: AICallState): string {
  switch (aiState) {
    case 'initiating': return 'Initiating call...';
    case 'ringing': return 'Calling dispatch...';
    case 'greeting': return 'Tasha is introducing herself';
    case 'on_call': return 'Tasha is talking to dispatch';
    case 'wrapping_up': return 'Wrapping up the call...';
    case 'complete': return 'Call complete';
    case 'failed': return 'Could not reach dispatch';
    default: return 'Connecting...';
  }
}

export function DispatchCallOverlay({
  active, mode, messages, summary, phase,
  aiState, aiTranscript, aiSummary, onClose,
}: DispatchCallOverlayProps) {
  const isTwilio = mode === 'twilio';
  const isDone = isTwilio ? (aiState === 'complete' || aiState === 'failed') : !!summary;
  const isFailed = isTwilio ? aiState === 'failed' : phase === 'error';
  const isWrappingUp = isTwilio ? aiState === 'wrapping_up' : phase === 'wrapping_up';
  const displayMessages = isTwilio ? (aiTranscript ?? []) : messages;
  const displaySummary = isTwilio ? (aiSummary ?? '') : summary;
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [displayMessages.length, displaySummary]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
          onClick={() => { if (isDone) onClose(); }}
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
              isDone && !isFailed ? 'bg-emerald-600' :
              isFailed ? 'bg-red-600' :
              isWrappingUp ? 'bg-blue-600' :
              'bg-[#FBAF1A]'
            }`}>
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center">
                  {isDone && !isFailed ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : isFailed ? (
                    <AlertCircle className="w-5 h-5 text-white" />
                  ) : isTwilio ? (
                    <PhoneCall className="w-5 h-5 text-[#18202F]" />
                  ) : (
                    <MessageCircle className="w-5 h-5 text-[#18202F]" />
                  )}
                </div>
                {!isDone && !isFailed && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-white/40"
                    animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
              </div>
              <div className="flex-1">
                <div className={`font-semibold ${isDone ? 'text-white' : 'text-[#18202F]'}`}>
                  {isTwilio ? 'Tasha → Dispatch' : 'Tasha → Dispatch (Mike)'}
                </div>
                <div className={`text-xs ${isDone ? 'text-white/70' : 'text-[#18202F]/70'}`}>
                  {isTwilio
                    ? stateLabel(aiState ?? 'initiating')
                    : (isDone ? 'Done' :
                       phase === 'connecting' ? 'Tasha is reaching dispatch...' :
                       phase === 'on_call' ? 'Tasha is talking to Mike' :
                       phase === 'wrapping_up' ? 'Wrapping up...' :
                       phase === 'error' ? 'Could not reach dispatch' :
                       'Connecting...')}
                </div>
                {isTwilio && (aiState === 'ringing' || aiState === 'on_call' || aiState === 'greeting') && (
                  <div className="flex items-center gap-1 mt-1">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[10px] text-[#18202F]/60 font-medium">LIVE CALL</span>
                  </div>
                )}
              </div>
              {!isDone && !isFailed && (
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

            {/* Messages / Transcript */}
            <div ref={scrollRef} className="px-5 py-4 space-y-3 max-h-[350px] overflow-y-auto">
              {displayMessages.map((m, i) => {
                const isTasha = m.role === 'ava' || m.role === 'tasha';
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${isTasha ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isTasha && (
                      <div className="w-6 h-6 rounded-full bg-[#FBAF1A]/20 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                        <Phone className="w-3 h-3 text-[#FBAF1A]" />
                      </div>
                    )}
                    <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isTasha
                        ? 'bg-blue-500 text-white rounded-br-sm'
                        : 'bg-[#0F1520] text-gray-300 border border-white/5 rounded-bl-sm'
                    }`}>
                      <div className="text-[10px] font-semibold mb-0.5 opacity-70">
                        {isTasha ? 'Tasha' : 'Dispatch'}
                      </div>
                      {m.text}
                    </div>
                    {isTasha && (
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center ml-2 mt-1 flex-shrink-0">
                        <Shield className="w-3 h-3 text-blue-400" />
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {!isDone && displayMessages.length === 0 && (
                <div className="text-center py-6">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                    <Loader2 className="w-6 h-6 text-[#FBAF1A] mx-auto" />
                  </motion.div>
                  <div className="text-gray-500 text-xs mt-3">
                    {isTwilio
                      ? (aiState === 'ringing' ? 'Calling dispatch...' : 'Tasha is reaching out to dispatch...')
                      : (phase === 'connecting' ? 'Tasha is reaching out to Mike at dispatch...' : 'Tasha is contacting dispatch...')}
                  </div>
                </div>
              )}

              {!isDone && displayMessages.length > 0 && (
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

              {displaySummary && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`${isFailed ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'} border rounded-xl p-3.5 text-sm text-gray-300`}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    {isFailed ? (
                      <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span className={`text-xs font-semibold uppercase ${isFailed ? 'text-red-400' : 'text-emerald-400'}`}>
                      {isFailed ? 'Call Failed' : 'Call Summary'}
                    </span>
                  </div>
                  {displaySummary}
                </motion.div>
              )}
            </div>

            {isDone && (
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
