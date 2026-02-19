'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { VoiceClient, type VoiceState } from '@/lib/voice-client';
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

  // Dispatch call
  const [dispatchCallActive, setDispatchCallActive] = useState(false);
  const [dispatchMessages, setDispatchMessages] = useState<{ role: string; text: string }[]>([]);
  const [dispatchSummary, setDispatchSummary] = useState('');

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

  // --- DASHBOARD ---
  return (
    <div className="min-h-screen bg-[#0F1520] text-white">
      {/* ===== TOP BAR ===== */}
      <div className="bg-[#18202F] border-b border-white/10 px-6 py-3 flex items-center justify-between">
        {/* Left: Driver info */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FBAF1A] to-[#BF7408] flex items-center justify-center">
            <Shield className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-sm">{session.driverName}</div>
            <div className="text-gray-400 text-xs">#{session.employeeNumber} &middot; {session.vehicleName}</div>
          </div>
        </div>

        {/* Center: Level Badge */}
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${levelColor(level)} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
            {level}
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold text-white">{levelTitle}</div>
            <div className="text-xs text-gray-500">Level {level}</div>
          </div>
        </div>

        {/* Right: Points, Streak, Logout */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 text-[#FBAF1A]" />
            <motion.span
              key={totalPoints}
              className="text-sm font-bold text-[#FBAF1A]"
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              {totalPoints.toLocaleString()}
            </motion.span>
            <span className="text-xs text-gray-500">pts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-bold text-orange-400">{currentStreak}</span>
            <span className="text-xs text-gray-500">days</span>
          </div>
          {streakMultiplier > 1 && (
            <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold">
              x{streakMultiplier.toFixed(1)}
            </span>
          )}
          <button onClick={logout} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors ml-2">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-5 space-y-5">

        {/* ===== ROW 1: Safety Score + Level | Today's Briefing ===== */}
        <div className="grid grid-cols-12 gap-5">
          {/* Safety Score + Level Progress */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0 }}
            className="col-span-5 bg-[#18202F] rounded-2xl border border-white/10 p-6 flex flex-col items-center"
          >
            <ScoreGauge score={session.safetyScore} size={150} />

            {/* Level Progress Bar */}
            <div className="w-full mt-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-gray-400">Level {level}: {levelTitle}</span>
                <span className="text-xs text-gray-500">{pointsToNext} pts to next level</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-[#0F1520] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#FBAF1A] to-[#BF7408]"
                  initial={{ width: 0 }}
                  animate={{ width: `${levelProgress}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                />
              </div>
            </div>

            {/* Points + Streak + Rank */}
            <div className="flex items-center gap-6 mt-5 w-full justify-center">
              <div className="text-center">
                <motion.div
                  className="flex items-center gap-1 justify-center"
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: 'spring' }}
                >
                  <Star className="w-4 h-4 text-[#FBAF1A]" />
                  <span className="text-lg font-bold text-[#FBAF1A]">{totalPoints.toLocaleString()}</span>
                </motion.div>
                <div className="text-xs text-gray-500 uppercase">Total Points</div>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1 justify-center">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-lg font-bold">{currentStreak}</span>
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

          {/* Today's Briefing */}
          <motion.div
            initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="col-span-7 bg-[#18202F] rounded-2xl border border-white/10 p-5 flex flex-col"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-[#FBAF1A]" />
                <span className="text-sm font-semibold">Today&apos;s Briefing</span>
              </div>
              {briefing && (
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${riskDotColor(briefing.riskLevel)}`} />
                  <span className={`text-xs font-semibold uppercase ${riskTextColor(briefing.riskLevel)}`}>
                    {briefing.riskLevel} Risk
                  </span>
                </div>
              )}
            </div>

            {briefing ? (
              <div className="flex-1 space-y-3 overflow-y-auto">
                {/* Greeting */}
                <p className="text-sm text-gray-300">{briefing.greeting}</p>

                {/* Focus Areas */}
                {briefing.focusAreas.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase mb-1.5">Focus Areas</div>
                    <div className="space-y-1">
                      {briefing.focusAreas.map((area, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CircleDot className="w-3 h-3 text-[#FBAF1A] mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-300">{area}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Weather + Route */}
                <div className="flex gap-3">
                  {/* Weather */}
                  <div className="flex-1 bg-[#0F1520] rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <WeatherIcon condition={briefing.weather.condition} />
                      <span className="text-sm font-medium text-white">{briefing.weather.temp}&deg;F</span>
                    </div>
                    <div className="text-xs text-gray-400 capitalize">{briefing.weather.condition}</div>
                    {briefing.weather.advisory && (
                      <div className="text-xs text-amber-400 mt-1">{briefing.weather.advisory}</div>
                    )}
                  </div>

                  {/* Route Hazards */}
                  {briefing.routeHazards.length > 0 && (
                    <div className="flex-1 bg-[#0F1520] rounded-xl p-3">
                      <div className="text-xs font-semibold text-gray-400 uppercase mb-1">Route Alerts</div>
                      {briefing.routeHazards.slice(0, 3).map((h, i) => (
                        <div key={i} className="text-xs text-gray-300 flex items-start gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-orange-400 flex-shrink-0 mt-0.5" />
                          {h}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Motivational + Streak */}
                <div className="bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-xl p-3">
                  <p className="text-sm text-emerald-300 italic">&ldquo;{briefing.motivational}&rdquo;</p>
                  <p className="text-xs text-gray-500 mt-1">{briefing.streakStatus}</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Loading briefing...
              </div>
            )}
          </motion.div>
        </div>

        {/* ===== ROW 2: Daily Challenge | Current Load ===== */}
        <div className="grid grid-cols-12 gap-5">
          {/* Daily Challenge */}
          <motion.div
            initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="col-span-5 bg-[#18202F] rounded-2xl border border-white/10 p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-[#FBAF1A]" />
              <span className="text-sm font-semibold">Daily Challenge</span>
            </div>

            {dailyChallenge ? (
              <div className={`rounded-xl p-4 border ${dailyChallenge.completed ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-[#0F1520] border-white/5'}`}>
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{dailyChallenge.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{dailyChallenge.name}</span>
                      {dailyChallenge.completed && (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{dailyChallenge.description}</p>

                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">
                          {dailyChallenge.completed ? 'Completed!' : `${dailyChallenge.current}/${dailyChallenge.target}`}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#FBAF1A]/20 text-[#FBAF1A]">
                          +{dailyChallenge.pointsReward} pts
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#18202F] overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${dailyChallenge.completed ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-[#FBAF1A] to-[#BF7408]'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.round(dailyChallenge.progress * 100)}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                        />
                      </div>
                    </div>

                    {!dailyChallenge.completed && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        Expires {new Date(dailyChallenge.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-24 text-gray-600 text-sm">
                <Target className="w-4 h-4 mr-2 opacity-30" />
                No active challenge
              </div>
            )}
          </motion.div>

          {/* Current Load (kept exactly) */}
          <motion.div
            initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="col-span-7 bg-[#18202F] rounded-2xl border border-white/10 p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-[#FBAF1A]" />
              <span className="text-sm font-semibold">Current Load</span>
            </div>
            {session.currentLoad ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-300">{session.currentLoad.id}</span>
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
              <div className="flex items-center justify-center h-24 text-gray-500">
                <Package className="w-5 h-5 mr-2 opacity-30" />
                <span className="text-sm">No active load assigned</span>
              </div>
            )}
          </motion.div>
        </div>

        {/* ===== ROW 3: Badges | Voice AI ===== */}
        <div className="grid grid-cols-12 gap-5">
          {/* Badges Grid */}
          <motion.div
            initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="col-span-5 bg-[#18202F] rounded-2xl border border-white/10 p-5"
            style={{ minHeight: 380 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold">Badges</span>
              <span className="ml-auto text-xs text-gray-500">
                {badges.filter(b => b.earned).length}/{badges.length} earned
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {badges.map((badge, i) => (
                <motion.button
                  key={badge.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.04, type: 'spring', stiffness: 300 }}
                  onClick={() => setSelectedBadge(badge)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all cursor-pointer ${
                    badge.earned
                      ? 'bg-[#0F1520] border border-[#FBAF1A]/30 hover:border-[#FBAF1A]/60 shadow-sm shadow-[#FBAF1A]/10'
                      : 'bg-[#0F1520]/50 border border-white/5 hover:border-white/15 opacity-60'
                  }`}
                >
                  <span className={`text-2xl ${badge.earned ? '' : 'grayscale'}`}>{badge.icon}</span>
                  <span className={`text-[10px] font-medium truncate w-full text-center ${badge.earned ? 'text-gray-300' : 'text-gray-600'}`}>
                    {badge.name}
                  </span>
                  {!badge.earned && badge.progress > 0 && (
                    <div className="w-full h-1 rounded-full bg-[#18202F] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gray-500"
                        style={{ width: `${Math.round(badge.progress * 100)}%` }}
                      />
                    </div>
                  )}
                  {badge.earned && (
                    <Check className="w-3 h-3 text-emerald-400" />
                  )}
                </motion.button>
              ))}
            </div>

            {badges.length === 0 && (
              <div className="flex items-center justify-center h-40 text-gray-600 text-sm">
                <Award className="w-5 h-5 mr-2 opacity-30" />
                Badges loading...
              </div>
            )}
          </motion.div>

          {/* Voice AI Panel (kept exactly with new quick actions) */}
          <motion.div
            initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="col-span-7 bg-[#18202F] rounded-2xl border border-white/10 flex flex-col"
            style={{ height: 420 }}
          >
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
        </div>

        {/* ===== ROW 4: Leaderboard | Rewards/Points/Actions ===== */}
        <div className="grid grid-cols-12 gap-5">
          {/* Leaderboard (kept exactly) */}
          <motion.div
            initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="col-span-5 bg-[#18202F] rounded-2xl border border-white/10 p-4"
            style={{ height: 420 }}
          >
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

          {/* Rewards / Points / Actions Tabbed Panel */}
          <motion.div
            initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="col-span-7 bg-[#18202F] rounded-2xl border border-white/10 flex flex-col"
            style={{ height: 420 }}
          >
            {/* Tab Header */}
            <div className="flex border-b border-white/10">
              {[
                { key: 'rewards' as const, label: 'Rewards', icon: <Gift className="w-3.5 h-3.5" /> },
                { key: 'points' as const, label: 'Points', icon: <Star className="w-3.5 h-3.5" /> },
                { key: 'actions' as const, label: 'Actions', icon: <ListChecks className="w-3.5 h-3.5" />, count: actionItems.filter(a => a.status === 'pending').length },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium transition-all border-b-2 ${
                    activeTab === tab.key
                      ? 'border-[#FBAF1A] text-[#FBAF1A]'
                      : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#FBAF1A]/20 text-[#FBAF1A] text-[10px] font-bold">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Rewards Tab */}
              {activeTab === 'rewards' && (
                <div className="space-y-2">
                  {rewards.length > 0 ? rewards.map((reward) => {
                    const canAfford = totalPoints >= reward.pointsCost;
                    const levelOk = level >= reward.levelRequired;
                    const available = canAfford && levelOk && reward.available;
                    return (
                      <div
                        key={reward.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          available
                            ? 'bg-[#0F1520] border-[#FBAF1A]/30 hover:border-[#FBAF1A]/60'
                            : 'bg-[#0F1520]/50 border-white/5 opacity-60'
                        }`}
                      >
                        <span className="text-2xl">{reward.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">{reward.name}</div>
                          <div className="text-xs text-gray-500">{reward.category}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {!levelOk ? (
                            <span className="text-xs text-gray-500">Level {reward.levelRequired} required</span>
                          ) : available ? (
                            <button className="px-3 py-1.5 rounded-lg bg-[#FBAF1A] text-[#18202F] text-xs font-bold hover:bg-[#BF7408] transition-colors">
                              Redeem &middot; {reward.pointsCost}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-500">
                              Need {(reward.pointsCost - totalPoints).toLocaleString()} more pts
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="flex items-center justify-center h-40 text-gray-600 text-sm">
                      <Gift className="w-5 h-5 mr-2 opacity-30" />
                      No rewards available yet
                    </div>
                  )}
                </div>
              )}

              {/* Points Tab */}
              {activeTab === 'points' && (
                <div className="space-y-1.5">
                  {recentPoints.length > 0 ? recentPoints.slice(0, 20).map((pt) => (
                    <div key={pt.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#0F1520] border border-white/5">
                      <span className={`text-sm font-bold min-w-[50px] text-right ${
                        pt.points > 0
                          ? pt.type === 'earned' ? 'text-emerald-400' : 'text-[#FBAF1A]'
                          : 'text-red-400'
                      }`}>
                        {pt.points > 0 ? '+' : ''}{pt.points}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-300 truncate">{pt.reason}</div>
                        <div className="text-[10px] text-gray-600 uppercase">{pt.type}</div>
                      </div>
                      <span className="text-[10px] text-gray-600 flex-shrink-0">{timeAgo(pt.timestamp)}</span>
                    </div>
                  )) : (
                    <div className="flex items-center justify-center h-40 text-gray-600 text-sm">
                      <Star className="w-5 h-5 mr-2 opacity-30" />
                      No point history yet
                    </div>
                  )}
                </div>
              )}

              {/* Actions Tab */}
              {activeTab === 'actions' && (
                <div className="space-y-1.5">
                  {actionItems.length > 0 ? actionItems.map((item) => {
                    const isPending = item.status === 'pending';
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                          isPending
                            ? 'bg-[#0F1520] border-white/10'
                            : 'bg-[#0F1520]/50 border-white/5 opacity-50'
                        }`}
                      >
                        <button
                          onClick={async () => {
                            if (!isPending) return;
                            try {
                              await api.completeAction(session.driverId, item.id);
                              setActionItems(prev => prev.map(a =>
                                a.id === item.id ? { ...a, status: 'completed' as const } : a
                              ));
                            } catch {}
                          }}
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            isPending
                              ? 'border-gray-500 hover:border-[#FBAF1A]'
                              : 'border-emerald-500 bg-emerald-500'
                          }`}
                        >
                          {!isPending && <Check className="w-3 h-3 text-white" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm ${isPending ? 'text-gray-300' : 'text-gray-500 line-through'}`}>
                            {item.text}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {item.source === 'voice' && <Mic className="w-3 h-3 text-gray-600" />}
                          {item.source === 'tool' && <Zap className="w-3 h-3 text-gray-600" />}
                          {item.source === 'system' && <Shield className="w-3 h-3 text-gray-600" />}
                          {isPending && (
                            <button
                              onClick={async () => {
                                try {
                                  await api.dismissAction(session.driverId, item.id);
                                  setActionItems(prev => prev.map(a =>
                                    a.id === item.id ? { ...a, status: 'dismissed' as const } : a
                                  ));
                                } catch {}
                              }}
                              className="text-gray-600 hover:text-gray-400 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="flex items-center justify-center h-40 text-gray-600 text-sm">
                      <ListChecks className="w-5 h-5 mr-2 opacity-30" />
                      No action items
                    </div>
                  )}
                </div>
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

      {/* ===== Dispatch Call Overlay (kept exactly) ===== */}
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
