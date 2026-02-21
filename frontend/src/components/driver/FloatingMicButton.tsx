'use client';

import { motion } from 'framer-motion';
import { Mic, Loader2, MessageCircle } from 'lucide-react';
import type { VoiceState } from '@/lib/voice-client';

interface FloatingMicButtonProps {
  voiceState: VoiceState;
  onPress: () => void;
  visible: boolean;
}

export function FloatingMicButton({ voiceState, onPress, visible }: FloatingMicButtonProps) {
  if (!visible) return null;

  const isActive = voiceState !== 'disconnected';
  const stateLabel = voiceState === 'listening' ? 'Listening...' :
    voiceState === 'thinking' ? 'Thinking...' :
    voiceState === 'speaking' ? 'Speaking...' :
    voiceState === 'dispatching' ? 'Dispatch...' : null;

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      onClick={onPress}
      className={`fixed bottom-24 right-4 z-30 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-colors ${
        isActive
          ? 'bg-emerald-500 shadow-emerald-500/30'
          : 'bg-gradient-to-br from-[#FBAF1A] to-[#BF7408] shadow-[#FBAF1A]/30'
      }`}
    >
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-white/30"
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      {voiceState === 'thinking' ? (
        <Loader2 className="w-6 h-6 text-white animate-spin" />
      ) : voiceState === 'speaking' ? (
        <MessageCircle className="w-6 h-6 text-white" />
      ) : (
        <Mic className="w-6 h-6 text-white" />
      )}
      {stateLabel && (
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-medium text-white bg-black/60 px-2 py-0.5 rounded-full whitespace-nowrap">
          {stateLabel}
        </span>
      )}
    </motion.button>
  );
}
