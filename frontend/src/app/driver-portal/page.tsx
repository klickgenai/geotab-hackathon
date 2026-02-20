'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { VoiceClient, type VoiceState, type DispatchProgressEvent, type DispatchPhase } from '@/lib/voice-client';
import type {
  DriverSession, DriverRanking, GamificationState, PreShiftBriefing, ActionItem,
} from '@/types/fleet';
import {
  Shield, Mic, MicOff, Loader2, LogOut, Flame, Trophy, TrendingUp, Package,
  MapPin, Phone, ChevronRight, MessageCircle, Send, ArrowRight, Clock, User,
  Star, Award, Target, Zap, Check, CheckCircle, Gift, CloudRain, Sun, Cloud,
  CloudSnow, CloudFog, CloudLightning, X, CircleDot, ListChecks,
} from 'lucide-react';

/* ---------- ScoreGauge (kept exactly) ---------- */
function ScoreGauge({ score, size = 140 }: { score: number; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#18202F" strokeWidth="8" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div
          className="text-3xl font-extrabold text-white"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
        >
          {score}
        </motion.div>
        <div className="text-xs uppercase tracking-wider text-gray-400 font-medium">Safety Score</div>
      </div>
    </div>
  );
}

/* ---------- Weather icon helper ---------- */
function WeatherIcon({ condition }: { condition: string }) {
  const c = condition.toLowerCase();
  if (c.includes('rain') || c.includes('shower')) return <CloudRain className="w-5 h-5 text-blue-400" />;
  if (c.includes('snow') || c.includes('ice')) return <CloudSnow className="w-5 h-5 text-blue-200" />;
  if (c.includes('fog') || c.includes('mist')) return <CloudFog className="w-5 h-5 text-gray-400" />;
  if (c.includes('thunder') || c.includes('storm')) return <CloudLightning className="w-5 h-5 text-yellow-400" />;
  if (c.includes('cloud') || c.includes('overcast')) return <Cloud className="w-5 h-5 text-gray-300" />;
  return <Sun className="w-5 h-5 text-yellow-400" />;
}

/* ---------- Risk level color helpers ---------- */
function riskDotColor(level: string) {
  switch (level) {
    case 'low': return 'bg-emerald-400';
    case 'elevated': return 'bg-yellow-400';
    case 'high': return 'bg-orange-400';
    case 'critical': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
}

function riskTextColor(level: string) {
  switch (level) {
    case 'low': return 'text-emerald-400';
    case 'elevated': return 'text-yellow-400';
    case 'high': return 'text-orange-400';
    case 'critical': return 'text-red-400';
    default: return 'text-gray-400';
  }
}

/* ---------- Level color helper ---------- */
function levelColor(level: number) {
  if (level >= 8) return 'from-yellow-400 to-amber-600';
  if (level >= 6) return 'from-purple-400 to-purple-600';
  if (level >= 4) return 'from-blue-400 to-blue-600';
  if (level >= 2) return 'from-emerald-400 to-emerald-600';
  return 'from-gray-400 to-gray-600';
}

/* ---------- Time ago helper ---------- */
function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ========== MAIN COMPONENT ========== */
export default function DriverPortalPage() {
  const [session, setSession] = useState<DriverSession | null>(null);
  const [leaderboard, setLeaderboard] = useState<DriverRanking[]>([]);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [pinInput, setPinInput] = useState('');

  // Gamification state
  const [gamification, setGamification] = useState<GamificationState | null>(null);
  const [briefing, setBriefing] = useState<PreShiftBriefing | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [activeTab, setActiveTab] = useState<'rewards' | 'points' | 'actions'>('rewards');

  // Voice
  const [voiceState, setVoiceState] = useState<VoiceState>('disconnected');
  const [transcripts, setTranscripts] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const voiceClientRef = useRef<VoiceClient | null>(null);

  // Chat fallback
  const [chatInput, setChatInput] = useState('');
  const [chatStreaming, setChatStreaming] = useState(false);

  // Dispatch call (real-time via voice or manual)
  const [dispatchCallActive, setDispatchCallActive] = useState(false);
  const [dispatchMessages, setDispatchMessages] = useState<{ role: string; text: string }[]>([]);
  const [dispatchSummary, setDispatchSummary] = useState('');
  const [dispatchPhase, setDispatchPhase] = useState<DispatchPhase | null>(null);


  // Badge detail modal
  const [selectedBadge, setSelectedBadge] = useState<GamificationState['badges'][0] | null>(null);

  const transcriptsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { transcriptsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [transcripts]);


  const login = async () => {
    if (!employeeNumber.trim() || !pinInput.trim()) return;
    setLoggingIn(true);
    setLoginError('');
    try {
      const sess = await api.driverLoginWithPin(employeeNumber.trim(), pinInput.trim());
      setSession(sess);
      // Parallel fetch all data
      const [lb, gam, brief, acts] = await Promise.all([
        api.driverLeaderboard(),
        api.driverGamification(sess.driverId).catch(() => null),
        api.preShiftBriefing(sess.driverId).catch(() => null),
        api.driverActions(sess.driverId).catch(() => []),
      ]);
      setLeaderboard(lb);
      if (gam) setGamification(gam);
      if (brief) setBriefing(brief);
      setActionItems(acts as ActionItem[]);
    } catch (err) {
      setLoginError((err as Error).message || 'Login failed');
    }
    setLoggingIn(false);
  };

  const logout = () => {
    if (voiceClientRef.current) {
      voiceClientRef.current.disconnect();
      voiceClientRef.current = null;
    }
    setSession(null);
    setTranscripts([]);
    setVoiceState('disconnected');
    setEmployeeNumber('');
    setPinInput('');
    setLoginError('');
    setGamification(null);
    setBriefing(null);
    setActionItems([]);
  };

  const toggleVoice = async () => {
    if (voiceState !== 'disconnected') {
      voiceClientRef.current?.disconnect();
      voiceClientRef.current = null;
      return;
    }

    const client = new VoiceClient({
      onStateChange: setVoiceState,
      onTranscript: (role, text) => {
        setTranscripts((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === role) {
            return [...prev.slice(0, -1), { role, text }];
          }
          return [...prev, { role, text }];
        });
      },
      onError: () => { /* error handled by voice client */ },
      onDispatchProgress: (event: DispatchProgressEvent) => {
        if (event.type === 'dispatch_status' && event.phase) {
          setDispatchPhase(event.phase);
          if (event.phase === 'connecting' || event.phase === 'on_call') {
            setDispatchCallActive(true);
            if (event.phase === 'connecting') {
              setDispatchMessages([]);
              setDispatchSummary('');
            }
          }
        }
        if (event.type === 'dispatch_message' && event.role && event.text) {
          setDispatchMessages((prev) => [...prev, { role: event.role!, text: event.text! }]);
        }
        if (event.type === 'dispatch_outcome' && event.summary) {
          setDispatchSummary(event.summary);
          setTimeout(() => { setDispatchPhase(null); }, 5000);
        }
      },
    }, session?.driverId);

    voiceClientRef.current = client;
    await client.connect();
  };

  const sendChat = useCallback(async (text: string) => {
    if (!text.trim() || chatStreaming) return;
    setChatInput('');
    setTranscripts((prev) => [...prev, { role: 'user', text }]);
    setChatStreaming(true);

    try {
      const res = await api.chatStream(text);
      if (!res.body) throw new Error('No body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';
      let buffer = '';

      setTranscripts((prev) => [...prev, { role: 'assistant', text: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'text') {
              full += data.content;
              setTranscripts((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', text: full };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch {}
    setChatStreaming(false);
  }, [chatStreaming]);

  const callDispatch = async (intent: string) => {
    if (!session) return;
    setDispatchCallActive(true);
    setDispatchMessages([]);
    setDispatchSummary('');

    try {
      const result = await api.dispatchCall(session.driverId, intent) as any;
      if (result.messages) {
        for (let i = 0; i < result.messages.length; i++) {
          await new Promise((r) => setTimeout(r, 800));
          setDispatchMessages((prev) => [...prev, result.messages[i]]);
        }
      }
      setDispatchSummary(result.summary || 'Call completed.');
    } catch (err) {
      setDispatchSummary('Failed to connect to dispatch.');
    }
  };

  const quickActions = [
    { label: "What's my score?", action: () => sendChat("What's my safety score and how am I doing?") },
    { label: 'Load update', action: () => sendChat('Give me details about my current load assignment') },
    { label: 'Ask dispatch', action: () => sendChat('Can you check with dispatch about my current load status?') },
    { label: 'How am I doing?', action: () => sendChat('How is my driving performance this week? Any tips?') },
    { label: 'Pre-shift briefing', action: () => sendChat('Give me my pre-shift safety briefing') },
    { label: 'Safety coaching', action: () => sendChat('Give me safety coaching tips') },
  ];

  // Derived gamification values
  const totalPoints = gamification?.totalPoints ?? 0;
  const level = gamification?.level ?? 1;
  const levelTitle = gamification?.levelTitle ?? 'Rookie';
  const levelProgress = (gamification?.levelProgress ?? 0) * 100;
  const pointsToNext = gamification?.pointsToNextLevel ?? 0;
  const currentStreak = gamification?.currentStreak ?? session?.streakDays ?? 0;
  const streakMultiplier = gamification?.streakMultiplier ?? 1.0;
  const badges = gamification?.badges ?? [];
  const recentPoints = gamification?.recentPoints ?? [];
  const dailyChallenge = gamification?.dailyChallenge ?? null;
  const rewards = gamification?.rewards ?? [];

  // --- LOGIN SCREEN (kept exactly) ---
  if (!session) {
    return (
      <div className="min-h-screen bg-[#0F1520] flex items-center justify-center">
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-sm mx-auto px-6">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FBAF1A] to-[#BF7408] flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Driver Portal</h1>
            <p className="text-gray-400 text-sm mt-1">Enter your credentials to sign in</p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); login(); }}
            className="bg-[#18202F] border border-white/10 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Employee Number</label>
              <input
                type="text" inputMode="numeric" maxLength={3}
                value={employeeNumber}
                onChange={(e) => { setEmployeeNumber(e.target.value.replace(/\D/g, '').slice(0, 3)); setLoginError(''); }}
                placeholder="e.g. 241"
                autoFocus
                className="w-full bg-[#0F1520] border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-mono tracking-widest placeholder:text-gray-600 outline-none focus:border-[#FBAF1A] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">PIN</label>
              <input
                type="password" inputMode="numeric" maxLength={4}
                value={pinInput}
                onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4)); setLoginError(''); }}
                placeholder="4-digit PIN"
                className="w-full bg-[#0F1520] border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-mono tracking-widest placeholder:text-gray-600 outline-none focus:border-[#FBAF1A] transition-colors"
              />
            </div>

            {loginError && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-xl py-2">
                {loginError}
              </motion.div>
            )}

            <button type="submit" disabled={loggingIn || employeeNumber.length < 3 || pinInput.length < 4}
              className="w-full py-3 rounded-xl bg-[#FBAF1A] text-[#18202F] font-semibold text-sm hover:bg-[#BF7408] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
              {loggingIn ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // --- DASHBOARD (Voice-Dominant Layout) ---
  return (
    <div className="h-screen bg-[#0F1520] text-white flex flex-col overflow-hidden">
      {/* ===== TOP BAR ===== */}
      <div className="bg-[#18202F] border-b border-white/10 px-6 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FBAF1A] to-[#BF7408] flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-semibold text-sm">{session.driverName}</div>
            <div className="text-gray-400 text-xs">#{session.employeeNumber} &middot; {session.vehicleName}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${levelColor(level)} flex items-center justify-center text-white font-bold text-xs shadow-lg`}>
            {level}
          </div>
          <span className="text-sm font-medium text-white">{levelTitle}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-[#FBAF1A]" />
            <span className="text-sm font-bold text-[#FBAF1A]">{totalPoints.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-sm font-bold text-orange-400">{currentStreak}d</span>
          </div>
          {streakMultiplier > 1 && (
            <span className="px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold">x{streakMultiplier.toFixed(1)}</span>
          )}
          <button onClick={logout} className="flex items-center gap-1 text-gray-400 hover:text-white text-xs transition-colors ml-1">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ===== MAIN: Voice Hero (8col) + Info Stack (4col) ===== */}
      <div className="flex-1 grid grid-cols-12 gap-4 p-4 min-h-0">

        {/* ─── VOICE AI HERO (8 columns) ─── */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="col-span-8 bg-[#18202F] rounded-2xl border border-white/10 flex flex-col min-h-0"
        >
          {/* Voice header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FBAF1A] to-[#BF7408] flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold">Tasha</span>
              <div className={`w-2.5 h-2.5 rounded-full ${
                voiceState === 'listening' ? 'bg-emerald-400 animate-pulse' :
                voiceState === 'thinking' ? 'bg-amber-400 animate-pulse' :
                voiceState === 'speaking' ? 'bg-blue-400 animate-pulse' :
                voiceState === 'dispatching' ? 'bg-[#FBAF1A] animate-pulse' :
                voiceState === 'dispatch_reporting' ? 'bg-blue-400 animate-pulse' :
                'bg-gray-500'
              }`} />
              <span className="text-xs text-gray-500 capitalize">
                {voiceState === 'dispatching' ? 'Tasha is checking with dispatch' :
                 voiceState === 'dispatch_reporting' ? 'Tasha is reporting back' :
                 voiceState}
              </span>
            </div>
            {voiceState !== 'disconnected' && (
              <button
                onClick={toggleVoice}
                className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-colors group"
                title="End voice session"
              >
                <X className="w-4 h-4 text-red-400 group-hover:text-red-300" />
              </button>
            )}
          </div>

          {/* Animated orb + transcript area */}
          <div className="flex-1 flex flex-col items-center min-h-0 overflow-hidden">
            {/* Orb area */}
            <div className="flex-shrink-0 py-6 flex flex-col items-center">
              {voiceState === 'disconnected' ? (
                <button onClick={toggleVoice} className="group relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#FBAF1A]/20 to-[#BF7408]/10 border-2 border-[#FBAF1A]/30 flex items-center justify-center transition-all group-hover:border-[#FBAF1A] group-hover:scale-105">
                    <Mic className="w-10 h-10 text-[#FBAF1A]/60 group-hover:text-[#FBAF1A] transition-colors" />
                  </div>
                  <div className="text-xs text-gray-500 mt-3 text-center">Tap to start</div>
                </button>
              ) : (
                <div className="relative w-24 h-24">
                  {/* Outer pulse ring */}
                  {(voiceState === 'listening' || voiceState === 'dispatching') && (
                    <motion.div
                      className={`absolute inset-0 rounded-full border-2 ${voiceState === 'dispatching' ? 'border-[#FBAF1A]/40' : 'border-emerald-400/40'}`}
                      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                  {/* Main orb */}
                  <motion.div
                    className={`w-24 h-24 rounded-full flex items-center justify-center ${
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
                      <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
                    ) : voiceState === 'dispatching' ? (
                      <MessageCircle className="w-10 h-10 text-[#FBAF1A]" />
                    ) : voiceState === 'speaking' ? (
                      <MessageCircle className="w-10 h-10 text-blue-400" />
                    ) : (
                      <Mic className="w-10 h-10 text-emerald-400" />
                    )}
                  </motion.div>
                </div>
              )}
            </div>

            {/* Scrollable transcript */}
            <div className="flex-1 w-full overflow-y-auto px-5 pb-2 space-y-2 min-h-0">
              {transcripts.length === 0 && voiceState !== 'disconnected' && (
                <div className="text-center py-4 text-gray-600 text-sm">
                  Listening... say something to Tasha
                </div>
              )}
              {transcripts.length === 0 && voiceState === 'disconnected' && (
                <div className="text-center py-2 text-gray-600 text-xs">
                  Start voice mode or type a message below
                </div>
              )}
              {transcripts.map((t, i) => (
                <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                    t.role === 'user'
                      ? 'bg-[#FBAF1A] text-[#18202F] rounded-br-sm'
                      : 'bg-[#0F1520] text-gray-300 border border-white/5 rounded-bl-sm'
                  }`}>
                    {t.text || <span className="text-gray-500 animate-pulse">Thinking...</span>}
                  </div>
                </div>
              ))}
              <div ref={transcriptsEndRef} />
            </div>
          </div>

          {/* Quick actions (when empty) */}
          {transcripts.length === 0 && (
            <div className="flex flex-wrap gap-1.5 px-5 pb-2 flex-shrink-0">
              {quickActions.map((q) => (
                <button key={q.label} onClick={q.action}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border border-white/10 text-gray-400 hover:border-[#FBAF1A]/50 hover:text-[#FBAF1A] transition-all">
                  {q.label}
                </button>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-white/10 flex-shrink-0">
            <button onClick={toggleVoice}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all flex-shrink-0 ${
                voiceState !== 'disconnected'
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                  : 'bg-gradient-to-br from-[#FBAF1A] to-[#BF7408] text-white shadow-lg shadow-[#FBAF1A]/30 hover:shadow-[#FBAF1A]/50'
              }`}>
              {voiceState !== 'disconnected' ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <input
              type="text" value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendChat(chatInput); }}
              placeholder="Ask Tasha..."
              className="flex-1 bg-[#0F1520] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none focus:border-[#FBAF1A]"
              disabled={chatStreaming}
            />
            <button onClick={() => sendChat(chatInput)} disabled={chatStreaming || !chatInput.trim()}
              className="w-12 h-12 rounded-2xl bg-[#FBAF1A] text-[#18202F] flex items-center justify-center disabled:opacity-40 flex-shrink-0">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* ─── INFO STACK (4 columns) ─── */}
        <div className="col-span-4 flex flex-col gap-3 min-h-0 overflow-y-auto pr-1">
          {/* Safety Score Card */}
          <motion.div
            initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.05 }}
            className="bg-[#18202F] rounded-2xl border border-white/10 p-4 flex items-center gap-4 flex-shrink-0"
          >
            <ScoreGauge score={session.safetyScore} size={80} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-center">
                  <div className="flex items-center gap-0.5"><Flame className="w-3 h-3 text-orange-400" /><span className="text-sm font-bold">{currentStreak}</span></div>
                  <div className="text-[10px] text-gray-500">Streak</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-0.5"><Trophy className="w-3 h-3 text-amber-400" /><span className="text-sm font-bold">#{session.weeklyRank}</span></div>
                  <div className="text-[10px] text-gray-500">Rank</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-emerald-400">{session.todayEvents}</div>
                  <div className="text-[10px] text-gray-500">Events</div>
                </div>
              </div>
              {/* Level bar */}
              <div className="w-full">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] text-gray-500">Lv{level} {levelTitle}</span>
                  <span className="text-[10px] text-gray-600">{pointsToNext} to next</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#0F1520] overflow-hidden">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-[#FBAF1A] to-[#BF7408]"
                    initial={{ width: 0 }} animate={{ width: `${levelProgress}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Briefing Card */}
          <motion.div
            initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}
            className="bg-[#18202F] rounded-2xl border border-white/10 p-4 flex-shrink-0"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-[#FBAF1A]" />
                <span className="text-xs font-semibold">Briefing</span>
              </div>
              {briefing && (
                <span className={`text-[10px] font-semibold uppercase ${riskTextColor(briefing.riskLevel)}`}>
                  {briefing.riskLevel}
                </span>
              )}
            </div>
            {briefing ? (
              <div className="space-y-1.5">
                <p className="text-xs text-gray-300 leading-relaxed">{briefing.greeting}</p>
                {briefing.focusAreas.slice(0, 2).map((area, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <CircleDot className="w-2.5 h-2.5 text-[#FBAF1A] mt-0.5 flex-shrink-0" />
                    <span className="text-[11px] text-gray-400 leading-tight">{area}</span>
                  </div>
                ))}
                {briefing.weather.advisory && (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-400">
                    <WeatherIcon condition={briefing.weather.condition} />
                    {briefing.weather.advisory}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-600 text-xs flex items-center"><Loader2 className="w-3 h-3 animate-spin mr-1" />Loading...</div>
            )}
          </motion.div>

          {/* Current Load Card */}
          <motion.div
            initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 }}
            className="bg-[#18202F] rounded-2xl border border-white/10 p-4 flex-shrink-0"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Package className="w-3.5 h-3.5 text-[#FBAF1A]" />
              <span className="text-xs font-semibold">Current Load</span>
            </div>
            {session.currentLoad ? (
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-medium text-gray-300">{session.currentLoad.id}</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[#FBAF1A]/20 text-[#FBAF1A] capitalize">
                    {session.currentLoad.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{session.currentLoad.origin.city}, {session.currentLoad.origin.state}</span>
                  <ArrowRight className="w-3 h-3 flex-shrink-0 text-gray-600" />
                  <span className="truncate">{session.currentLoad.destination.city}, {session.currentLoad.destination.state}</span>
                </div>
                <div className="text-[10px] text-gray-600 mt-1">{session.currentLoad.commodity} &middot; {session.currentLoad.weight.toLocaleString()} lbs</div>
              </div>
            ) : (
              <div className="text-xs text-gray-600 flex items-center gap-1"><Package className="w-3 h-3 opacity-30" />No active load</div>
            )}
          </motion.div>

          {/* Daily Challenge Card */}
          <motion.div
            initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}
            className="bg-[#18202F] rounded-2xl border border-white/10 p-4 flex-shrink-0"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Zap className="w-3.5 h-3.5 text-[#FBAF1A]" />
              <span className="text-xs font-semibold">Daily Challenge</span>
            </div>
            {dailyChallenge ? (
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{dailyChallenge.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-white truncate">{dailyChallenge.name}</span>
                    {dailyChallenge.completed && <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
                    <span className="text-[10px] font-bold text-[#FBAF1A] ml-auto flex-shrink-0">+{dailyChallenge.pointsReward}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#0F1520] overflow-hidden mt-1">
                    <motion.div
                      className={`h-full rounded-full ${dailyChallenge.completed ? 'bg-emerald-500' : 'bg-[#FBAF1A]'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round(dailyChallenge.progress * 100)}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-600 flex items-center gap-1"><Target className="w-3 h-3 opacity-30" />No active challenge</div>
            )}
          </motion.div>

          {/* Leaderboard Card */}
          <motion.div
            initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.25 }}
            className="bg-[#18202F] rounded-2xl border border-white/10 p-4 flex-shrink-0"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-semibold">Leaderboard</span>
            </div>
            <div className="space-y-0.5">
              {leaderboard.slice(0, 5).map((r) => {
                const isMe = r.driverId === session.driverId;
                return (
                  <div key={r.driverId}
                    className={`flex items-center gap-2 px-2 py-1 rounded-lg text-xs ${
                      isMe ? 'bg-[#FBAF1A]/10 border border-[#FBAF1A]/20' : ''
                    }`}>
                    <span className={`w-4 text-center font-bold ${r.rank <= 3 ? 'text-amber-400' : 'text-gray-600'}`}>
                      {r.rank}
                    </span>
                    <span className={`flex-1 truncate ${isMe ? 'text-white font-medium' : 'text-gray-400'}`}>
                      {r.name.split(' ')[0]} {isMe && <span className="text-[#FBAF1A]">(You)</span>}
                    </span>
                    <span className="text-gray-500">{r.score}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Badges Card */}
          <motion.div
            initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}
            className="bg-[#18202F] rounded-2xl border border-white/10 p-4 flex-shrink-0"
          >
            <button onClick={() => badges.length > 0 && setSelectedBadge(badges[0])}
              className="flex items-center gap-1.5 w-full text-left">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-semibold">Badges</span>
              <span className="ml-auto text-[10px] text-gray-500">
                {badges.filter(b => b.earned).length}/{badges.length} earned
              </span>
              <ChevronRight className="w-3 h-3 text-gray-600" />
            </button>
            <div className="flex gap-1 mt-2 flex-wrap">
              {badges.filter(b => b.earned).slice(0, 8).map((b) => (
                <button key={b.id} onClick={() => setSelectedBadge(b)} className="text-lg hover:scale-110 transition-transform">
                  {b.icon}
                </button>
              ))}
              {badges.filter(b => b.earned).length === 0 && (
                <span className="text-[10px] text-gray-600">No badges earned yet</span>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ===== Badge Detail Modal ===== */}
      <AnimatePresence>
        {selectedBadge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center"
            onClick={() => setSelectedBadge(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#18202F] rounded-2xl border border-white/10 p-6 w-[320px] text-center"
            >
              <span className={`text-5xl block mb-3 ${selectedBadge.earned ? '' : 'grayscale opacity-60'}`}>
                {selectedBadge.icon}
              </span>
              <h3 className="text-lg font-bold text-white">{selectedBadge.name}</h3>
              <p className="text-sm text-gray-400 mt-1">{selectedBadge.description}</p>
              <div className="mt-3 text-xs text-gray-500">{selectedBadge.requirement}</div>

              {selectedBadge.earned ? (
                <div className="mt-3 flex items-center justify-center gap-1 text-emerald-400 text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  Earned {selectedBadge.earnedDate ? new Date(selectedBadge.earnedDate).toLocaleDateString() : ''}
                </div>
              ) : (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1 text-xs text-gray-500">
                    <span>Progress</span>
                    <span>{Math.round(selectedBadge.progress * 100)}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#0F1520] overflow-hidden">
                    <div className="h-full rounded-full bg-gray-500" style={{ width: `${Math.round(selectedBadge.progress * 100)}%` }} />
                  </div>
                </div>
              )}

              <button
                onClick={() => setSelectedBadge(null)}
                className="mt-4 px-6 py-2 rounded-xl bg-[#0F1520] text-gray-400 text-sm font-medium hover:bg-white/10 transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Tasha ↔ Dispatch Conversation Overlay ===== */}
      <AnimatePresence>
        {dispatchCallActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
            onClick={() => { if (dispatchSummary) { setDispatchCallActive(false); setDispatchPhase(null); } }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#18202F] rounded-2xl border border-white/10 w-[420px] max-h-[550px] overflow-hidden"
            >
              {/* Header with phase indicator */}
              <div className={`px-5 py-4 flex items-center gap-3 transition-colors ${
                dispatchSummary ? 'bg-emerald-600' :
                dispatchPhase === 'error' ? 'bg-red-600' :
                'bg-[#FBAF1A]'
              }`}>
                <div className="relative">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center ${
                    dispatchSummary ? 'bg-white/20' :
                    'bg-white/20'
                  }`}>
                    {dispatchSummary ? (
                      <CheckCircle className="w-5 h-5 text-white" />
                    ) : (
                      <MessageCircle className="w-5 h-5 text-[#18202F]" />
                    )}
                  </div>
                  {/* Pulsing ring animation during active conversation */}
                  {!dispatchSummary && dispatchPhase !== 'error' && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-white/40"
                      animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                </div>
                <div className="flex-1">
                  <div className={`font-semibold ${dispatchSummary ? 'text-white' : 'text-[#18202F]'}`}>
                    Tasha → Dispatch (Mike)
                  </div>
                  <div className={`text-xs ${dispatchSummary ? 'text-white/70' : 'text-[#18202F]/70'}`}>
                    {dispatchSummary ? 'Done' :
                     dispatchPhase === 'connecting' ? 'Tasha is reaching dispatch...' :
                     dispatchPhase === 'on_call' ? 'Tasha is talking to Mike' :
                     dispatchPhase === 'wrapping_up' ? 'Wrapping up...' :
                     dispatchPhase === 'error' ? 'Could not reach dispatch' :
                     'Connecting...'}
                  </div>
                </div>
                {/* Call duration / phase dots */}
                {!dispatchSummary && dispatchPhase && dispatchPhase !== 'error' && (
                  <div className="flex items-center gap-1">
                    <motion.div
                      className="w-1.5 h-1.5 rounded-full bg-[#18202F]/50"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                    />
                    <motion.div
                      className="w-1.5 h-1.5 rounded-full bg-[#18202F]/50"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                    />
                    <motion.div
                      className="w-1.5 h-1.5 rounded-full bg-[#18202F]/50"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
                    />
                  </div>
                )}
              </div>

              {/* Messages area */}
              <div className="px-5 py-4 space-y-3 max-h-[350px] overflow-y-auto">
                {dispatchMessages.map((m, i) => (
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

                {/* Connecting state with no messages yet */}
                {!dispatchSummary && dispatchMessages.length === 0 && (
                  <div className="text-center py-6">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                      <Loader2 className="w-6 h-6 text-[#FBAF1A] mx-auto" />
                    </motion.div>
                    <div className="text-gray-500 text-xs mt-3">
                      {dispatchPhase === 'connecting' ? 'Tasha is reaching out to Mike at dispatch...' : 'Tasha is contacting dispatch...'}
                    </div>
                  </div>
                )}

                {/* Typing indicator while waiting for next message */}
                {!dispatchSummary && dispatchMessages.length > 0 && dispatchPhase !== 'complete' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#FBAF1A]/20 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                      <Phone className="w-3 h-3 text-[#FBAF1A]" />
                    </div>
                    <div className="bg-[#0F1520] border border-white/5 rounded-2xl rounded-bl-sm px-4 py-3">
                      <div className="flex gap-1">
                        <motion.div className="w-1.5 h-1.5 rounded-full bg-gray-500"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity, delay: 0 }} />
                        <motion.div className="w-1.5 h-1.5 rounded-full bg-gray-500"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} />
                        <motion.div className="w-1.5 h-1.5 rounded-full bg-gray-500"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Outcome summary */}
                {dispatchSummary && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 text-sm text-gray-300"
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-xs font-semibold text-emerald-400 uppercase">Call Summary</span>
                    </div>
                    {dispatchSummary}
                  </motion.div>
                )}
              </div>

              {/* Close button */}
              {dispatchSummary && (
                <div className="px-5 pb-4">
                  <button onClick={() => { setDispatchCallActive(false); setDispatchPhase(null); }}
                    className="w-full py-2.5 rounded-xl bg-[#FBAF1A] text-[#18202F] text-sm font-semibold hover:bg-[#BF7408] transition-colors">
                    Close
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
