'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { VoiceClient, type VoiceState, type DispatchProgressEvent, type DispatchPhase } from '@/lib/voice-client';
import type {
  DriverSession, DriverRanking, GamificationState, PreShiftBriefing, ActionItem,
  DriverTrainingProgram, HOSStatus, WellnessCheckIn,
} from '@/types/fleet';
import { Shield, Loader2, User } from 'lucide-react';

// Tab components
import { DriverTopBar } from '@/components/driver/DriverTopBar';
import { DriverTabBar, type DriverTab } from '@/components/driver/DriverTabBar';
import { HomeTab } from '@/components/driver/HomeTab';
import { TrainingTab } from '@/components/driver/TrainingTab';
import { VoiceTab } from '@/components/driver/VoiceTab';
import { LoadTab } from '@/components/driver/LoadTab';
import { LeaderboardTab } from '@/components/driver/LeaderboardTab';
import { FloatingMicButton } from '@/components/driver/FloatingMicButton';
import { DispatchCallOverlay } from '@/components/driver/DispatchCallOverlay';

export default function DriverPortalPage() {
  // ─── Auth State ────────────────────────────────────
  const [session, setSession] = useState<DriverSession | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [pinInput, setPinInput] = useState('');

  // ─── Tab State ────────────────────────────────────
  const [activeTab, setActiveTab] = useState<DriverTab>('home');

  // ─── Data State ───────────────────────────────────
  const [leaderboard, setLeaderboard] = useState<DriverRanking[]>([]);
  const [gamification, setGamification] = useState<GamificationState | null>(null);
  const [briefing, setBriefing] = useState<PreShiftBriefing | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [allActionItems, setAllActionItems] = useState<ActionItem[]>([]);
  const [trainingPrograms, setTrainingPrograms] = useState<DriverTrainingProgram[]>([]);
  const [trainingBadge, setTrainingBadge] = useState(0);
  const [hos, setHos] = useState<HOSStatus | null>(null);
  const [wellnessCheckins, setWellnessCheckins] = useState<WellnessCheckIn[]>([]);
  const [wellnessMessage, setWellnessMessage] = useState<string | null>(null);

  // ─── Voice State ──────────────────────────────────
  const [voiceState, setVoiceState] = useState<VoiceState>('disconnected');
  const [transcripts, setTranscripts] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const voiceClientRef = useRef<VoiceClient | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatStreaming, setChatStreaming] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // ─── Dispatch State ───────────────────────────────
  const [dispatchCallActive, setDispatchCallActive] = useState(false);
  const [dispatchMessages, setDispatchMessages] = useState<{ role: string; text: string }[]>([]);
  const [dispatchSummary, setDispatchSummary] = useState('');
  const [dispatchPhase, setDispatchPhase] = useState<DispatchPhase | null>(null);
  const [dispatchMode, setDispatchMode] = useState<'simulated' | 'twilio'>('simulated');
  const [aiCallState, setAiCallState] = useState<string | undefined>(undefined);
  const [aiCallTranscript, setAiCallTranscript] = useState<{ role: string; text: string; timestamp?: string }[]>([]);
  const [aiCallSummary, setAiCallSummary] = useState<string | undefined>(undefined);
  const dispatchPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Polling ref for tracking previous count ──────
  const prevActionCountRef = useRef(0);
  const prevTrainingCountRef = useRef(0);

  // ─── Login ────────────────────────────────────────
  const login = async () => {
    if (!employeeNumber.trim() || !pinInput.trim()) return;
    setLoggingIn(true);
    setLoginError('');
    try {
      const sess = await api.driverLoginWithPin(employeeNumber.trim(), pinInput.trim());
      setSession(sess);
      const [lb, gam, brief, acts, training, hosData, wellnessTrend] = await Promise.all([
        api.driverLeaderboard(),
        api.driverGamification(sess.driverId).catch(() => null),
        api.preShiftBriefing(sess.driverId).catch(() => null),
        api.driverActions(sess.driverId).catch(() => []),
        api.driverTraining(sess.driverId).catch(() => []),
        api.driverHOS(sess.driverId).catch(() => null),
        api.wellnessTrend(sess.driverId).catch(() => null),
      ]);
      setLeaderboard(lb);
      if (gam) setGamification(gam);
      if (brief) setBriefing(brief);
      const actionsList = acts as ActionItem[];
      setActionItems(actionsList);
      setAllActionItems(actionsList);
      prevActionCountRef.current = actionsList.length;
      const trainingList = training as DriverTrainingProgram[];
      setTrainingPrograms(trainingList);
      prevTrainingCountRef.current = trainingList.length;
      if (hosData) setHos(hosData);
      if (wellnessTrend) setWellnessCheckins((wellnessTrend as any).checkins ?? []);
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
    setAllActionItems([]);
    setTrainingPrograms([]);
    setTrainingBadge(0);
    setHos(null);
    setWellnessCheckins([]);
    setWellnessMessage(null);
    setIsMuted(false);
    setActiveTab('home');
  };

  // ─── Polling for action items & training (Phase 4) ──
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(async () => {
      try {
        const [acts, training] = await Promise.all([
          api.driverActions(session.driverId).catch(() => null),
          api.driverTraining(session.driverId).catch(() => null),
        ]);
        if (acts) {
          const newActions = acts as ActionItem[];
          setActionItems(newActions);
          setAllActionItems(newActions);
          // Show badge on Training tab if new items arrived
          if (newActions.length > prevActionCountRef.current) {
            setTrainingBadge(prev => prev + (newActions.length - prevActionCountRef.current));
          }
          prevActionCountRef.current = newActions.length;
        }
        if (training) {
          const newTraining = training as DriverTrainingProgram[];
          if (newTraining.length > prevTrainingCountRef.current) {
            setTrainingBadge(prev => prev + (newTraining.length - prevTrainingCountRef.current));
          }
          setTrainingPrograms(newTraining);
          prevTrainingCountRef.current = newTraining.length;
        }
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [session]);

  // Clear training badge when visiting Training tab
  useEffect(() => {
    if (activeTab === 'training') setTrainingBadge(0);
  }, [activeTab]);

  // ─── Voice ────────────────────────────────────────
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
      onError: () => {},
      onDispatchProgress: (event: DispatchProgressEvent) => {
        if (event.type === 'dispatch_status' && event.phase) {
          setDispatchPhase(event.phase);
          if (event.phase === 'connecting' || event.phase === 'on_call') {
            setDispatchCallActive(true);
            if (event.phase === 'connecting') {
              setDispatchMessages([]);
              setDispatchSummary('');
              // Detect if this is a Twilio call by checking the message
              const msg = (event as any).message || '';
              if (msg.includes('Calling') || msg.includes('Phone')) {
                setDispatchMode('twilio');
              }
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

  // ─── Chat ─────────────────────────────────────────
  const sendChat = useCallback(async (text: string) => {
    if (!text.trim() || chatStreaming) return;
    setChatInput('');
    setTranscripts((prev) => [...prev, { role: 'user', text }]);
    setChatStreaming(true);

    // Switch to voice tab when sending chat
    if (activeTab !== 'voice') setActiveTab('voice');

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
  }, [chatStreaming, activeTab]);

  // ─── Dispatch Call ────────────────────────────────
  const callDispatch = async (intent: string) => {
    if (!session) return;
    setDispatchCallActive(true);
    setDispatchMessages([]);
    setDispatchSummary('');
    setAiCallState(undefined);
    setAiCallTranscript([]);
    setAiCallSummary(undefined);

    try {
      const result = await api.dispatchCall(session.driverId, intent);
      const mode = result.mode || 'simulated';
      setDispatchMode(mode as 'simulated' | 'twilio');

      if (mode === 'twilio' && result.callId) {
        // Start polling for Twilio AI call status
        setAiCallState('ringing');
        const callId = result.callId;
        dispatchPollRef.current = setInterval(async () => {
          try {
            const status = await api.dispatchCallStatus(session.driverId, callId);
            setAiCallState(status.state);
            setAiCallTranscript(status.transcript || []);
            if (status.summary) setAiCallSummary(status.summary);
            if (status.state === 'complete' || status.state === 'failed') {
              if (dispatchPollRef.current) {
                clearInterval(dispatchPollRef.current);
                dispatchPollRef.current = null;
              }
            }
          } catch {
            // Polling error, continue
          }
        }, 2000);
      } else {
        // Simulated mode - stream messages
        if (result.messages) {
          for (let i = 0; i < result.messages.length; i++) {
            await new Promise((r) => setTimeout(r, 800));
            setDispatchMessages((prev) => [...prev, result.messages![i]]);
          }
        }
        setDispatchSummary(result.summary || 'Call completed.');
      }
    } catch {
      setDispatchMode('simulated');
      setDispatchSummary('Failed to connect to dispatch.');
    }
  };

  // Clean up poll on unmount
  useEffect(() => {
    return () => {
      if (dispatchPollRef.current) {
        clearInterval(dispatchPollRef.current);
      }
    };
  }, []);

  // ─── Wellness Check-In Handler ───────────────
  const handleWellnessCheckIn = async (mood: WellnessCheckIn['mood']) => {
    if (!session) return;
    try {
      const result = await api.wellnessCheckIn(session.driverId, mood) as any;
      setWellnessMessage(result.message || 'Thanks for checking in!');
      setWellnessCheckins(prev => [{ mood, timestamp: new Date().toISOString() }, ...prev]);
      setTimeout(() => setWellnessMessage(null), 8000);
    } catch {
      setWellnessMessage('Thanks for checking in!');
      setTimeout(() => setWellnessMessage(null), 8000);
    }
  };

  // ─── Action Item Handlers ────────────────────────
  const handleCompleteAction = async (actionId: string) => {
    if (!session) return;
    try {
      await api.completeAction(session.driverId, actionId);
      setActionItems(prev => prev.filter(a => a.id !== actionId));
      setAllActionItems(prev => prev.map(a => a.id === actionId ? { ...a, status: 'completed' as const, completedAt: new Date().toISOString() } : a));
    } catch {}
  };

  const handleDismissAction = async (actionId: string) => {
    if (!session) return;
    try {
      await api.dismissAction(session.driverId, actionId);
      setActionItems(prev => prev.filter(a => a.id !== actionId));
      setAllActionItems(prev => prev.map(a => a.id === actionId ? { ...a, status: 'dismissed' as const } : a));
    } catch {}
  };

  // ─── LOGIN SCREEN ─────────────────────────────────
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

  // ─── MAIN DASHBOARD ──────────────────────────────
  return (
    <div className="h-screen bg-[#0F1520] text-white flex flex-col overflow-hidden">
      {/* Top Bar */}
      <DriverTopBar session={session} gamification={gamification} onLogout={logout} />

      {/* Tab Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeTab === 'home' && (
          <HomeTab
            session={session}
            gamification={gamification}
            briefing={briefing}
            hos={hos}
            wellnessCheckins={wellnessCheckins}
            onWellnessCheckIn={handleWellnessCheckIn}
            wellnessMessage={wellnessMessage}
          />
        )}
        {activeTab === 'training' && (
          <TrainingTab
            programs={trainingPrograms}
            actionItems={actionItems}
            allActionItems={allActionItems}
            onCompleteAction={handleCompleteAction}
            onDismissAction={handleDismissAction}
          />
        )}
        {activeTab === 'voice' && (
          <VoiceTab
            voiceState={voiceState}
            transcripts={transcripts}
            chatInput={chatInput}
            chatStreaming={chatStreaming}
            isMuted={isMuted}
            onChatInputChange={setChatInput}
            onSendChat={sendChat}
            onToggleVoice={toggleVoice}
            onToggleMute={() => {
              if (voiceClientRef.current) {
                voiceClientRef.current.toggleMute();
                setIsMuted(voiceClientRef.current.isMuted);
              }
            }}
          />
        )}
        {activeTab === 'load' && (
          <LoadTab
            session={session}
            onCallDispatch={callDispatch}
            onAskTasha={(msg) => sendChat(msg)}
          />
        )}
        {activeTab === 'rank' && (
          <LeaderboardTab
            session={session}
            leaderboard={leaderboard}
            gamification={gamification}
          />
        )}
      </div>

      {/* Floating Mic (visible on all tabs except Voice) */}
      <FloatingMicButton
        voiceState={voiceState}
        onPress={() => {
          if (voiceState === 'disconnected') {
            setActiveTab('voice');
            // Small delay so tab renders first
            setTimeout(() => toggleVoice(), 100);
          } else {
            setActiveTab('voice');
          }
        }}
        visible={activeTab !== 'voice'}
      />

      {/* Bottom Tab Bar */}
      <DriverTabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        trainingBadge={trainingBadge}
        homeBadge={actionItems.length}
      />

      {/* Dispatch Call Overlay */}
      <DispatchCallOverlay
        active={dispatchCallActive}
        mode={dispatchMode}
        messages={dispatchMessages}
        summary={dispatchSummary}
        phase={dispatchPhase}
        aiState={aiCallState as any}
        aiTranscript={aiCallTranscript}
        aiSummary={aiCallSummary}
        onClose={() => {
          setDispatchCallActive(false);
          setDispatchPhase(null);
          if (dispatchPollRef.current) {
            clearInterval(dispatchPollRef.current);
            dispatchPollRef.current = null;
          }
        }}
      />
    </div>
  );
}
