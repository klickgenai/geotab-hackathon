'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { VoiceClient, type VoiceState } from '@/lib/voice-client';
import type { DriverSession, DriverRanking } from '@/types/fleet';
import {
  Shield, Mic, MicOff, Loader2, LogOut, Flame, Trophy, TrendingUp, Package,
  MapPin, Phone, ChevronRight, MessageCircle, Send, ArrowRight, Clock, User,
} from 'lucide-react';

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

export default function DriverPortalPage() {
  const [session, setSession] = useState<DriverSession | null>(null);
  const [leaderboard, setLeaderboard] = useState<DriverRanking[]>([]);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [pinInput, setPinInput] = useState('');

  // Voice
  const [voiceState, setVoiceState] = useState<VoiceState>('disconnected');
  const [transcripts, setTranscripts] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const voiceClientRef = useRef<VoiceClient | null>(null);

  // Chat fallback
  const [chatInput, setChatInput] = useState('');
  const [chatStreaming, setChatStreaming] = useState(false);

  // Dispatch call
  const [dispatchCallActive, setDispatchCallActive] = useState(false);
  const [dispatchMessages, setDispatchMessages] = useState<{ role: string; text: string }[]>([]);
  const [dispatchSummary, setDispatchSummary] = useState('');

  const transcriptsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { transcriptsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [transcripts]);

  const login = async () => {
    if (!employeeNumber.trim() || !pinInput.trim()) return;
    setLoggingIn(true);
    setLoginError('');
    try {
      const sess = await api.driverLoginWithPin(employeeNumber.trim(), pinInput.trim());
      setSession(sess);
      const lb = await api.driverLeaderboard();
      setLeaderboard(lb);
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
      onError: (err) => console.error('[Voice]', err),
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
    { label: 'Call Dispatch', action: () => callDispatch('I need to check in about my current load status') },
    { label: 'How am I doing?', action: () => sendChat('How is my driving performance this week? Any tips?') },
  ];

  // --- LOGIN SCREEN ---
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

  // --- DASHBOARD ---
  return (
    <div className="min-h-screen bg-[#0F1520] text-white">
      {/* Top Bar */}
      <div className="bg-[#18202F] border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FBAF1A] to-[#BF7408] flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-semibold text-sm">{session.driverName}</div>
            <div className="text-gray-400 text-xs">#{session.employeeNumber} &middot; {session.vehicleName}</div>
          </div>
        </div>
        <button onClick={logout} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-5">
        {/* Score + Stats Row */}
        <div className="grid grid-cols-12 gap-5">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="col-span-4 bg-[#18202F] rounded-2xl border border-white/10 p-6 flex flex-col items-center">
            <ScoreGauge score={session.safetyScore} />
            <div className="flex items-center gap-6 mt-4">
              <div className="text-center">
                <div className="flex items-center gap-1 justify-center">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-lg font-bold">{session.streakDays}</span>
                </div>
                <div className="text-xs text-gray-500 uppercase">Day Streak</div>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1 justify-center">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="text-lg font-bold">#{session.weeklyRank}</span>
                </div>
                <div className="text-xs text-gray-500 uppercase">Weekly Rank</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-emerald-400">{session.todayEvents}</div>
                <div className="text-xs text-gray-500 uppercase">Events Today</div>
              </div>
            </div>
          </motion.div>

          {/* Load Card */}
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
            className="col-span-8 bg-[#18202F] rounded-2xl border border-white/10 p-5">
            {session.currentLoad ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#FBAF1A]" />
                    <span className="text-sm font-semibold">{session.currentLoad.id}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#FBAF1A]/20 text-[#FBAF1A] capitalize">
                      {session.currentLoad.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">{session.currentLoad.commodity} &middot; {session.currentLoad.weight.toLocaleString()} lbs</span>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 bg-[#0F1520] rounded-xl p-3">
                    <div className="text-xs text-gray-500 uppercase">Pickup</div>
                    <div className="text-sm font-medium">{session.currentLoad.origin.city}, {session.currentLoad.origin.state}</div>
                    <div className="text-xs text-gray-500">{new Date(session.currentLoad.pickupTime).toLocaleTimeString()}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
                  <div className="flex-1 bg-[#0F1520] rounded-xl p-3">
                    <div className="text-xs text-gray-500 uppercase">Delivery</div>
                    <div className="text-sm font-medium">{session.currentLoad.destination.city}, {session.currentLoad.destination.state}</div>
                    <div className="text-xs text-gray-500">{new Date(session.currentLoad.deliveryTime).toLocaleTimeString()}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {['at_pickup', 'loaded', 'in_transit', 'at_delivery', 'delivered'].map((status) => (
                    <button key={status}
                      onClick={async () => {
                        await api.updateLoadStatus(session.driverId, status);
                        const sess = await api.driverDashboard(session.driverId);
                        setSession(sess);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        session.currentLoad?.status === status
                          ? 'bg-[#FBAF1A] text-[#18202F]'
                          : 'bg-[#0F1520] text-gray-400 hover:bg-[#FBAF1A]/20 hover:text-white'
                      }`}>
                      {status.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <Package className="w-5 h-5 mr-2 opacity-30" />
                <span className="text-sm">No active load assigned</span>
              </div>
            )}
          </motion.div>
        </div>

        {/* Voice AI + Leaderboard + Messages */}
        <div className="grid grid-cols-12 gap-5">
          {/* Voice / Chat Panel */}
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
            className="col-span-5 bg-[#18202F] rounded-2xl border border-white/10 flex flex-col" style={{ height: 420 }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#FBAF1A] to-[#BF7408] flex items-center justify-center">
                  <Shield className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm font-semibold">Ava</span>
                <div className={`w-2 h-2 rounded-full ${
                  voiceState === 'listening' ? 'bg-emerald-400 animate-pulse' :
                  voiceState === 'thinking' ? 'bg-amber-400 animate-pulse' :
                  voiceState === 'speaking' ? 'bg-blue-400 animate-pulse' :
                  'bg-gray-500'
                }`} />
                <span className="text-xs text-gray-500 capitalize">{voiceState}</span>
              </div>
            </div>

            {/* Transcripts */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {transcripts.length === 0 && (
                <div className="text-center py-8 text-gray-600 text-sm">
                  <Mic className="w-6 h-6 mx-auto mb-2 opacity-30" />
                  Tap the mic or type to talk with Ava
                </div>
              )}
              {transcripts.map((t, i) => (
                <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
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

            {/* Quick Actions */}
            {transcripts.length === 0 && (
              <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                {quickActions.map((q) => (
                  <button key={q.label} onClick={q.action}
                    className="px-2.5 py-1 rounded-full text-xs font-medium border border-white/10 text-gray-400 hover:border-[#FBAF1A]/50 hover:text-[#FBAF1A] transition-all">
                    {q.label}
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <div className="flex items-center gap-1.5 px-3 py-2.5 border-t border-white/10">
              <button onClick={toggleVoice}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  voiceState !== 'disconnected'
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-[#0F1520] border border-white/10 text-gray-400 hover:border-[#FBAF1A] hover:text-[#FBAF1A]'
                }`}>
                {voiceState !== 'disconnected' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <input
                type="text" value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendChat(chatInput); }}
                placeholder="Ask Ava..."
                className="flex-1 bg-[#0F1520] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-600 outline-none focus:border-[#FBAF1A]"
                disabled={chatStreaming}
              />
              <button onClick={() => sendChat(chatInput)} disabled={chatStreaming || !chatInput.trim()}
                className="w-9 h-9 rounded-xl bg-[#FBAF1A] text-[#18202F] flex items-center justify-center disabled:opacity-40">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>

          {/* Leaderboard */}
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
            className="col-span-4 bg-[#18202F] rounded-2xl border border-white/10 p-4" style={{ height: 420 }}>
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold">Safety Leaderboard</span>
            </div>
            <div className="space-y-1 overflow-y-auto" style={{ maxHeight: 360 }}>
              {leaderboard.slice(0, 15).map((r) => {
                const isMe = r.driverId === session.driverId;
                return (
                  <div key={r.driverId}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm ${
                      isMe ? 'bg-[#FBAF1A]/15 border border-[#FBAF1A]/30' : 'hover:bg-white/5'
                    }`}>
                    <span className={`w-6 text-center font-bold text-xs ${
                      r.rank <= 3 ? 'text-amber-400' : 'text-gray-500'
                    }`}>#{r.rank}</span>
                    <span className={`flex-1 truncate ${isMe ? 'text-white font-semibold' : 'text-gray-300'}`}>
                      {r.name} <span className="text-gray-500 text-xs">#{r.employeeNumber}</span> {isMe && <span className="text-xs text-[#FBAF1A]">(You)</span>}
                    </span>
                    <span className="text-xs font-medium text-gray-400">{r.score}</span>
                    <div className="flex items-center gap-0.5 text-xs text-gray-500">
                      <Flame className="w-3 h-3 text-orange-400/60" />
                      {r.streak}d
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Messages */}
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
            className="col-span-3 bg-[#18202F] rounded-2xl border border-white/10 p-4" style={{ height: 420 }}>
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="w-4 h-4 text-[#FBAF1A]" />
              <span className="text-sm font-semibold">Messages</span>
              {session.recentMessages.filter((m) => !m.read).length > 0 && (
                <span className="ml-auto px-1.5 py-0.5 rounded-full bg-red-500 text-xs font-bold text-white">
                  {session.recentMessages.filter((m) => !m.read).length}
                </span>
              )}
            </div>
            <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 360 }}>
              {session.recentMessages.map((msg) => (
                <div key={msg.id} className={`p-2.5 rounded-xl border ${
                  !msg.read ? 'bg-[#FBAF1A]/10 border-[#FBAF1A]/20' : 'bg-[#0F1520] border-white/5'
                }`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`text-xs font-semibold uppercase ${
                      msg.from === 'dispatch' ? 'text-[#FBAF1A]' : msg.from === 'system' ? 'text-amber-500' : 'text-gray-400'
                    }`}>{msg.from}</span>
                    <span className="text-xs text-gray-600">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {!msg.read && <div className="w-1.5 h-1.5 rounded-full bg-[#FBAF1A] ml-auto" />}
                  </div>
                  <div className="text-sm text-gray-400 leading-relaxed">{msg.text}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Dispatch Call Overlay */}
      <AnimatePresence>
        {dispatchCallActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
            onClick={() => { if (dispatchSummary) setDispatchCallActive(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#18202F] rounded-2xl border border-white/10 w-[400px] max-h-[500px] overflow-hidden"
            >
              <div className="bg-[#FBAF1A] px-5 py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-[#18202F]" />
                </div>
                <div>
                  <div className="text-[#18202F] font-semibold">Dispatch - Mike</div>
                  <div className="text-[#18202F]/70 text-xs">
                    {dispatchSummary ? 'Call ended' : 'Calling...'}
                  </div>
                </div>
              </div>
              <div className="px-5 py-4 space-y-3 max-h-[350px] overflow-y-auto">
                {dispatchMessages.map((m, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex ${m.role === 'driver' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                      m.role === 'driver'
                        ? 'bg-[#FBAF1A] text-[#18202F] rounded-br-sm'
                        : 'bg-[#0F1520] text-gray-300 rounded-bl-sm'
                    }`}>{m.text}</div>
                  </motion.div>
                ))}
                {!dispatchSummary && dispatchMessages.length === 0 && (
                  <div className="text-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-[#FBAF1A] mx-auto" />
                    <div className="text-gray-500 text-xs mt-2">Connecting to dispatch...</div>
                  </div>
                )}
                {dispatchSummary && (
                  <div className="bg-[#FBAF1A]/10 border border-[#FBAF1A]/20 rounded-xl p-3 text-sm text-gray-300">
                    <div className="text-xs font-semibold text-[#FBAF1A] uppercase mb-1">Summary</div>
                    {dispatchSummary}
                  </div>
                )}
              </div>
              {dispatchSummary && (
                <div className="px-5 pb-4">
                  <button onClick={() => setDispatchCallActive(false)}
                    className="w-full py-2 rounded-xl bg-[#FBAF1A] text-[#18202F] text-sm font-medium hover:bg-[#BF7408] transition-colors">
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
