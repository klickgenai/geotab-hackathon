'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Loader2, MessageCircle, Shield, Send, X } from 'lucide-react';
import type { VoiceState } from '@/lib/voice-client';

interface VoiceTabProps {
  voiceState: VoiceState;
  transcripts: { role: 'user' | 'assistant'; text: string }[];
  chatInput: string;
  chatStreaming: boolean;
  onChatInputChange: (val: string) => void;
  onSendChat: (text: string) => void;
  onToggleVoice: () => void;
}

const quickActions = [
  { label: "What's my score?", msg: "What's my safety score and how am I doing?" },
  { label: 'Load update', msg: 'Give me details about my current load assignment' },
  { label: 'Ask dispatch', msg: 'Can you check with dispatch about my current load status?' },
  { label: 'How am I doing?', msg: 'How is my driving performance this week? Any tips?' },
  { label: 'Pre-shift briefing', msg: 'Give me my pre-shift safety briefing' },
  { label: 'Safety coaching', msg: 'Give me safety coaching tips' },
];

export function VoiceTab({
  voiceState, transcripts, chatInput, chatStreaming,
  onChatInputChange, onSendChat, onToggleVoice,
}: VoiceTabProps) {
  const transcriptsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Orb area */}
      <div className="flex-shrink-0 py-6 flex flex-col items-center">
        {voiceState === 'disconnected' ? (
          <button onClick={onToggleVoice} className="group relative">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#FBAF1A]/20 to-[#BF7408]/10 border-2 border-[#FBAF1A]/30 flex items-center justify-center transition-all group-hover:border-[#FBAF1A] group-hover:scale-105">
              <Mic className="w-12 h-12 text-[#FBAF1A]/60 group-hover:text-[#FBAF1A] transition-colors" />
            </div>
            <div className="text-xs text-gray-500 mt-3 text-center">Tap to talk to Tasha</div>
          </button>
        ) : (
          <div className="relative w-28 h-28">
            {(voiceState === 'listening' || voiceState === 'dispatching') && (
              <motion.div
                className={`absolute inset-0 rounded-full border-2 ${voiceState === 'dispatching' ? 'border-[#FBAF1A]/40' : 'border-emerald-400/40'}`}
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
            <motion.div
              className={`w-28 h-28 rounded-full flex items-center justify-center ${
                voiceState === 'listening' ? 'bg-emerald-500/20 border-2 border-emerald-400/50' :
                voiceState === 'thinking' ? 'bg-amber-500/20 border-2 border-amber-400/50' :
                voiceState === 'speaking' ? 'bg-blue-500/20 border-2 border-blue-400/50' :
                voiceState === 'dispatching' ? 'bg-[#FBAF1A]/20 border-2 border-[#FBAF1A]/50' :
                'bg-gray-500/20 border-2 border-gray-400/50'
              }`}
              animate={
                voiceState === 'thinking' ? { rotate: 360 } :
                voiceState === 'speaking' ? { scale: [1, 1.05, 1] } :
                {}
              }
              transition={
                voiceState === 'thinking' ? { duration: 2, repeat: Infinity, ease: 'linear' } :
                voiceState === 'speaking' ? { duration: 0.8, repeat: Infinity, ease: 'easeInOut' } :
                {}
              }
            >
              {voiceState === 'thinking' ? (
                <Loader2 className="w-12 h-12 text-amber-400 animate-spin" />
              ) : voiceState === 'dispatching' ? (
                <MessageCircle className="w-12 h-12 text-[#FBAF1A]" />
              ) : voiceState === 'speaking' ? (
                <MessageCircle className="w-12 h-12 text-blue-400" />
              ) : (
                <Mic className="w-12 h-12 text-emerald-400" />
              )}
            </motion.div>
            <div className="text-xs text-gray-500 mt-2 text-center capitalize">
              {voiceState === 'dispatching' ? 'Checking with dispatch...' :
               voiceState === 'dispatch_reporting' ? 'Reporting back...' :
               voiceState}
            </div>
          </div>
        )}
      </div>

      {/* Scrollable transcript */}
      <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-2 min-h-0">
        {transcripts.length === 0 && voiceState !== 'disconnected' && (
          <div className="text-center py-4 text-gray-600 text-sm">Listening... say something to Tasha</div>
        )}
        {transcripts.length === 0 && voiceState === 'disconnected' && (
          <div className="text-center py-2 text-gray-600 text-xs">Start voice mode or type a message below</div>
        )}
        {transcripts.map((t, i) => (
          <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
              t.role === 'user'
                ? 'bg-[#FBAF1A] text-[#18202F] rounded-br-sm'
                : 'bg-[#18202F] text-gray-300 border border-white/5 rounded-bl-sm'
            }`}>
              {t.text || <span className="text-gray-500 animate-pulse">Thinking...</span>}
            </div>
          </div>
        ))}
        <div ref={transcriptsEndRef} />
      </div>

      {/* Quick actions when idle */}
      {transcripts.length === 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2 flex-shrink-0">
          {quickActions.map((q) => (
            <button key={q.label} onClick={() => onSendChat(q.msg)}
              className="px-3 py-2 rounded-full text-xs font-medium border border-white/10 text-gray-400 hover:border-[#FBAF1A]/50 hover:text-[#FBAF1A] transition-all">
              {q.label}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-white/10 flex-shrink-0">
        <button onClick={onToggleVoice}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all flex-shrink-0 ${
            voiceState !== 'disconnected'
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
              : 'bg-gradient-to-br from-[#FBAF1A] to-[#BF7408] text-white shadow-lg shadow-[#FBAF1A]/30 hover:shadow-[#FBAF1A]/50'
          }`}>
          {voiceState !== 'disconnected' ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
        <input
          type="text" value={chatInput}
          onChange={(e) => onChatInputChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSendChat(chatInput); }}
          placeholder="Ask Tasha..."
          className="flex-1 bg-[#0F1520] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none focus:border-[#FBAF1A]"
          disabled={chatStreaming}
        />
        <button onClick={() => onSendChat(chatInput)} disabled={chatStreaming || !chatInput.trim()}
          className="w-12 h-12 rounded-2xl bg-[#FBAF1A] text-[#18202F] flex items-center justify-center disabled:opacity-40 flex-shrink-0">
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
