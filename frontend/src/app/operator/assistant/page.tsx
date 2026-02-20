'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Mic, Send, Shield, Volume2, VolumeX, Sparkles, PhoneOff } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import ComponentRenderer from '@/components/assistant/ComponentRenderer';
import { VoiceClient, type VoiceState } from '@/lib/voice-client';

/* ---------- Types ---------- */
interface MessagePart {
  type: 'text' | 'component';
  content?: string;
  toolName?: string;
  toolResult?: any;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  parts: MessagePart[];
  timestamp: Date;
}

type VoicePhase = 'listening' | 'processing' | 'speaking';

/* ---------- Quick Action Chips ---------- */
const quickActions = [
  { label: 'Fleet Overview', text: 'Give me a complete fleet overview with KPIs' },
  { label: 'Insurance Score', text: 'Show me our insurance score with component breakdown' },
  { label: 'Who Needs Help?', text: 'Which drivers have the highest burnout risk right now?' },
  { label: 'Financial Impact', text: 'What is our total financial impact and savings potential?' },
  { label: 'Weekly Forecast', text: 'What does the fleet safety forecast look like this week?' },
  { label: 'Alert Briefing', text: 'Give me a morning alert briefing' },
  { label: 'Riskiest Driver', text: 'Who is our riskiest driver and what should we do?' },
  { label: 'Coaching Plan', text: 'Give me coaching recommendations for our highest risk drivers' },
];

/* ---------- Helpers ---------- */
let msgCounter = 0;
function genId() { return `msg-${++msgCounter}-${Date.now()}`; }

function stripVoiceTags(text: string): string {
  return text.replace(/<voice>[\s\S]*?<\/voice>/g, '').replace(/<\/?voice>/g, '').trimStart();
}

function renderMarkdown(raw: string): string {
  const text = stripVoiceTags(raw);
  const lines = text.split('\n');
  const html: string[] = [];
  let inTable = false;
  let inList = false;
  let listType: 'ul' | 'ol' = 'ul';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*\|[\s-:|]+\|\s*$/.test(line)) continue;
    if (/^\s*\|.*\|\s*$/.test(line)) {
      if (!inTable) { html.push('<table class="w-full text-sm my-3 border-collapse">'); inTable = true; }
      if (inList) { html.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      const cells = line.split('|').filter(c => c.trim());
      const isHeader = i > 0 && /^\s*\|[\s-:|]+\|\s*$/.test(lines[i + 1] || '');
      const tag = isHeader ? 'th' : 'td';
      const cellClass = isHeader
        ? 'px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider text-xs bg-gray-50/80 border-b-2 border-gray-200'
        : 'px-4 py-2.5 border-b border-gray-100 text-gray-700';
      html.push(`<tr class="hover:bg-gray-50/50 transition-colors">${cells.map(c => `<${tag} class="${cellClass}">${inlineFormat(c.trim())}</${tag}>`).join('')}</tr>`);
      continue;
    }
    if (inTable) { html.push('</table>'); inTable = false; }
    if (/^#{1,3}\s/.test(line)) {
      if (inList) { html.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      const level = (line.match(/^#+/) as RegExpMatchArray)[0].length;
      const content = line.replace(/^#+\s*/, '');
      const cls = level === 1 ? 'text-lg font-bold text-gray-900 mt-5 mb-2'
        : level === 2 ? 'text-sm font-bold text-gray-700 mt-5 mb-2 uppercase tracking-wider'
        : 'text-sm font-semibold text-gray-600 mt-3 mb-1';
      html.push(`<div class="${cls}">${inlineFormat(content)}</div>`);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      if (!inList || listType !== 'ul') { if (inList) html.push('</ol>'); html.push('<ul class="space-y-1.5 my-2">'); inList = true; listType = 'ul'; }
      const content = line.replace(/^\s*[-*]\s+/, '');
      html.push(`<li class="flex gap-2 text-sm text-gray-700 leading-relaxed"><span class="text-amber-500 mt-1 shrink-0 text-base">\u2022</span><span>${inlineFormat(content)}</span></li>`);
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      if (!inList || listType !== 'ol') { if (inList) html.push('</ul>'); html.push('<ol class="space-y-1.5 my-2">'); inList = true; listType = 'ol'; }
      const num = line.match(/^\s*(\d+)\./)?.[1] || '1';
      const content = line.replace(/^\s*\d+\.\s+/, '');
      html.push(`<li class="flex gap-2 text-sm text-gray-700 leading-relaxed"><span class="text-amber-600 font-bold shrink-0">${num}.</span><span>${inlineFormat(content)}</span></li>`);
      continue;
    }
    if (inList) { html.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
    if (/^\s*[-*_]{3,}\s*$/.test(line)) {
      html.push('<hr class="my-4 border-t border-gray-200" />');
      continue;
    }
    if (!line.trim()) { html.push('<div class="h-2"></div>'); continue; }
    html.push(`<p class="text-[15px] text-gray-800 leading-relaxed">${inlineFormat(line)}</p>`);
  }
  if (inTable) html.push('</table>');
  if (inList) html.push(listType === 'ul' ? '</ul>' : '</ol>');
  return html.join('');
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-700">$1</code>')
    .replace(/\$([0-9,]+)/g, '<span class="text-emerald-600 font-bold text-base">$$$1</span>')
    .replace(/→/g, '<span class="text-amber-500">\u2192</span>')
    .replace(/⚠️/g, '<span class="text-amber-500">\u26A0</span>')
    .replace(/✅/g, '<span class="text-emerald-500">\u2713</span>');
}

/* ---------- Waveform Visualization ---------- */
function VoiceWaveform({ phase }: { phase: VoicePhase }) {
  const bars = useMemo(() =>
    Array.from({ length: 36 }, (_, i) => ({
      maxH: 6 + Math.sin((i / 36) * Math.PI) * 48 + Math.random() * 14,
      delay: i * 0.035,
      speed: 0.25 + Math.random() * 0.35,
    })),
    []
  );

  return (
    <div className="flex items-center justify-center gap-[2px] h-16">
      {bars.map((bar, i) => (
        <motion.div
          key={i}
          className={`w-[3px] rounded-full transition-colors duration-500 ${
            phase === 'listening' ? 'bg-emerald-400' :
            phase === 'speaking' ? 'bg-amber-400' : 'bg-white/25'
          }`}
          animate={{
            height: phase === 'processing'
              ? [4, 10, 4]
              : [3, bar.maxH, 3],
          }}
          transition={{
            duration: phase === 'processing' ? 1.8 : bar.speed,
            repeat: Infinity,
            delay: bar.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

/* ---------- Main Component ---------- */
export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: genId(), role: 'assistant',
    parts: [{ type: 'text', content: "Hi, I'm **Tasha**, your fleet intelligence assistant. Ask me anything about your fleet, or tap a chip below to get started. I can show you live dashboards, scores, and analytics right here." }],
    timestamp: new Date(),
  }]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Voice conversation mode
  const [voiceMode, setVoiceMode] = useState(false);
  const [voicePhase, setVoicePhase] = useState<VoicePhase>('listening');
  const [voiceTranscript, setVoiceTranscript] = useState('');

  // Refs for async-safe access
  const voiceModeRef = useRef(false);
  const streamingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const voiceClientRef = useRef<VoiceClient | null>(null);

  // Keep refs in sync
  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      if (voiceClientRef.current) {
        voiceClientRef.current.disconnect();
        voiceClientRef.current = null;
      }
    };
  }, []);

  /* ---------- TTS (Promise-based, text mode only) ---------- */
  const speakAsync = useCallback(async (voiceText: string): Promise<void> => {
    if (!voiceEnabled || typeof window === 'undefined' || !voiceText.trim()) return;

    const ttsPromise = new Promise<void>(async (resolve) => {
      try {
        const res = await api.ttsSynthesize(voiceText);
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          if (!audioContextRef.current) {
            audioContextRef.current = new AudioContext({ sampleRate: 24000 });
          }
          const ctx = audioContextRef.current;
          if (ctx.state === 'suspended') await ctx.resume();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);
          activeSourceRef.current = source;
          source.onended = () => { activeSourceRef.current = null; resolve(); };
          source.start();
          return;
        }
      } catch {
        // Fall through to browser TTS
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(voiceText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });

    return Promise.race([
      ttsPromise,
      new Promise<void>((resolve) => setTimeout(resolve, 15000)),
    ]);
  }, [voiceEnabled]);

  /* ---------- Voice Mode Controls (uses VoiceClient) ---------- */
  const enterVoiceMode = useCallback(async () => {
    setVoiceMode(true);
    voiceModeRef.current = true;
    setVoiceEnabled(true);
    setVoicePhase('listening');
    setVoiceTranscript('');

    // Track the current assistant message ID for appending tool results
    let currentAssistantId: string | null = null;
    let latestUserTranscript = '';
    const renderedTools = new Set<string>();

    // Create and connect VoiceClient (no driverId for operator)
    const client = new VoiceClient({
      onStateChange: (state: VoiceState) => {
        if (!voiceModeRef.current) return;
        if (state === 'listening') setVoicePhase('listening');
        else if (state === 'thinking') {
          setVoicePhase('processing');
          // State changed to thinking = speech ended, transcript is final
          // NOW add the user message + assistant placeholder to chat
          if (latestUserTranscript && latestUserTranscript.trim().length > 1) {
            const userMsg: ChatMessage = {
              id: genId(), role: 'user',
              parts: [{ type: 'text', content: latestUserTranscript }],
              timestamp: new Date(),
            };
            currentAssistantId = genId();
            renderedTools.clear();
            setMessages(prev => [...prev, userMsg, {
              id: currentAssistantId!, role: 'assistant', parts: [], timestamp: new Date(),
            }]);
            setVoiceTranscript('');
            latestUserTranscript = '';
          }
        }
        else if (state === 'speaking') setVoicePhase('speaking');
      },
      onTranscript: (role, text) => {
        if (!voiceModeRef.current) return;
        if (role === 'user') {
          // Just update the display — don't add to chat yet (wait for 'thinking' state)
          latestUserTranscript = text;
          setVoiceTranscript(text);
        } else {
          // Assistant transcript — add as text in the assistant message
          setVoiceTranscript('');
          if (currentAssistantId && text) {
            const aid = currentAssistantId;
            setMessages(prev => prev.map(m => {
              if (m.id !== aid) return m;
              const hasText = m.parts.some(p => p.type === 'text');
              if (hasText) return m;
              return { ...m, parts: [...m.parts, { type: 'text', content: text }] };
            }));
          }
        }
      },
      onToolResult: (toolName, result) => {
        if (!voiceModeRef.current || !currentAssistantId) return;
        if (renderedTools.has(toolName)) return;
        renderedTools.add(toolName);
        const aid = currentAssistantId;
        setMessages(prev => prev.map(m => {
          if (m.id !== aid) return m;
          return { ...m, parts: [...m.parts, { type: 'component', toolName, toolResult: result }] };
        }));
      },
      onError: () => {
        // Voice error handled by client
      },
      onPlaybackComplete: () => {
        // Playback finished — VoiceClient handles state transition
      },
    });

    voiceClientRef.current = client;
    try {
      await client.connect();
    } catch {
      setVoiceMode(false);
      voiceModeRef.current = false;
      voiceClientRef.current = null;
    }
  }, []);

  const endVoiceMode = useCallback(() => {
    setVoiceMode(false);
    voiceModeRef.current = false;
    setVoicePhase('listening');
    setVoiceTranscript('');

    // Disconnect VoiceClient
    if (voiceClientRef.current) {
      voiceClientRef.current.disconnect();
      voiceClientRef.current = null;
    }

    // Stop any text-mode audio
    if (abortRef.current) abortRef.current.abort();
    if (activeSourceRef.current) {
      try { activeSourceRef.current.stop(); } catch {}
      activeSourceRef.current = null;
    }
    if (typeof window !== 'undefined') window.speechSynthesis.cancel();
    if (audioContextRef.current) {
      audioContextRef.current.suspend().catch(() => {});
    }
  }, []);

  /* ---------- Send Message (text mode — SSE) ---------- */
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streamingRef.current) return;

    // Cancel any playing speech
    if (typeof window !== 'undefined') window.speechSynthesis.cancel();

    const userMsg: ChatMessage = { id: genId(), role: 'user', parts: [{ type: 'text', content: text }], timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    streamingRef.current = true;
    setStreaming(true);

    const assistantId = genId();
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', parts: [], timestamp: new Date() }]);

    const abort = new AbortController();
    abortRef.current = abort;
    let speakPromise: Promise<void> | null = null;

    try {
      const res = await api.assistantStream(text, '/operator/assistant');
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = '';
      let currentText = '';
      let voiceSpoken = false;
      const renderedTools = new Set<string>();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (abort.signal.aborted) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'text') {
              currentText += data.content;
              setMessages(prev => prev.map(m => {
                if (m.id !== assistantId) return m;
                const lastPart = m.parts[m.parts.length - 1];
                if (lastPart && lastPart.type === 'text') {
                  return { ...m, parts: m.parts.map((p, idx) => idx === m.parts.length - 1 ? { ...p, content: currentText } : p) };
                }
                return { ...m, parts: [...m.parts, { type: 'text', content: currentText }] };
              }));

            } else if (data.type === 'voice_summary') {
              if (!voiceSpoken) {
                voiceSpoken = true;
                speakPromise = speakAsync(data.content);
              }

            } else if (data.type === 'tool_result') {
              if (renderedTools.has(data.toolName)) continue;
              renderedTools.add(data.toolName);
              currentText = '';
              setMessages(prev => prev.map(m => {
                if (m.id !== assistantId) return m;
                return { ...m, parts: [...m.parts, { type: 'component', toolName: data.toolName, toolResult: data.result }] };
              }));

            } else if (data.type === 'report_ready') {
              const a = document.createElement('a');
              a.href = data.url;
              a.download = data.filename || 'report.pdf';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }
          } catch {}
        }
      }
    } catch (err) {
      if (!abort.signal.aborted) {
        setMessages(prev => prev.map(m => {
          if (m.id !== assistantId) return m;
          return { ...m, parts: [{ type: 'text', content: 'Connection error. Make sure the backend server is running.' }] };
        }));
      }
    } finally {
      streamingRef.current = false;
      setStreaming(false);
      abortRef.current = null;

      // Text mode TTS: wait for speech to finish
      if (speakPromise) {
        try { await speakPromise; } catch {}
      }
    }
  }, [speakAsync]);

  const hasUserSent = messages.some(m => m.role === 'user');

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F5F3EF]">
      {/* Top Bar */}
      <header className="flex items-center gap-4 px-6 py-3.5 bg-white border-b border-[#E5E2DC] shrink-0">
        <Link href="/operator" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FBAF1A] to-[#BF7408] flex items-center justify-center shadow-md shadow-amber-500/20">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="text-base font-bold text-gray-900 flex items-center gap-2">
            Tasha <span className="text-[11px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">AI Assistant</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${
              voiceMode
                ? (voicePhase === 'listening' ? 'bg-emerald-400 animate-pulse' : voicePhase === 'speaking' ? 'bg-amber-400 animate-pulse' : 'bg-blue-400 animate-pulse')
                : streaming ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
            }`} />
            <span className="text-xs text-gray-400">
              {voiceMode
                ? (voicePhase === 'listening' ? 'Listening...' : voicePhase === 'processing' ? 'Analyzing...' : 'Speaking...')
                : streaming ? 'Thinking...' : 'Ready'}
            </span>
          </div>
        </div>
        <button
          onClick={() => { setVoiceEnabled(v => !v); if (typeof window !== 'undefined') window.speechSynthesis.cancel(); }}
          className={`p-2 rounded-xl transition-colors ${voiceEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}
          title={voiceEnabled ? 'Voice output on' : 'Voice output off'}
        >
          {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-5xl mx-auto space-y-5">
          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`${msg.role === 'user' ? 'max-w-[80%]' : 'max-w-full w-full'}`}>
                  {msg.parts.map((part, pi) => (
                    <div key={`${msg.id}-${pi}`}>
                      {part.type === 'text' && part.content && (
                        msg.role === 'user' ? (
                          <div className={`px-5 py-3.5 text-[15px] leading-relaxed bg-[#18202F] text-white rounded-2xl rounded-br-sm ${pi > 0 ? 'mt-3' : ''}`}>
                            {part.content}
                          </div>
                        ) : (
                          <div
                            className={`px-6 py-5 leading-relaxed bg-white text-gray-800 border border-[#E5E2DC] rounded-2xl rounded-bl-sm shadow-sm ${pi > 0 ? 'mt-3' : ''}`}
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(part.content) }}
                          />
                        )
                      )}
                      {part.type === 'component' && part.toolName && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3 }}
                          className={pi > 0 ? 'mt-3' : ''}
                        >
                          <ComponentRenderer toolName={part.toolName} result={part.toolResult} />
                        </motion.div>
                      )}
                    </div>
                  ))}
                  {msg.role === 'assistant' && msg.parts.length === 0 && (
                    <div className="bg-white text-gray-400 border border-[#E5E2DC] rounded-2xl rounded-bl-sm shadow-sm px-6 py-5 text-[15px]">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#FBAF1A] animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-[#FBAF1A] animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-[#FBAF1A] animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span>Analyzing fleet data...</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Actions */}
      {!hasUserSent && !voiceMode && (
        <div className="px-6 pb-3 shrink-0">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Sparkles className="w-4 h-4 text-[#FBAF1A]" />
              <span className="text-sm font-medium text-gray-400">Quick actions</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((q) => (
                <button
                  key={q.text}
                  onClick={() => sendMessage(q.text)}
                  disabled={streaming}
                  className="px-4 py-2 rounded-full text-sm font-medium border border-[#E5E2DC] text-gray-500 bg-white hover:border-[#FBAF1A] hover:text-[#BF7408] hover:bg-[#FFF8EB] transition-all duration-200 disabled:opacity-50"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Bar: Voice Mode or Text Input */}
      <AnimatePresence mode="wait">
        {voiceMode ? (
          <motion.div
            key="voice-panel"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="border-t border-white/10 bg-gradient-to-t from-[#0F172A] via-[#1A2332] to-[#1E293B] px-4 py-5 shrink-0"
          >
            <div className="max-w-5xl mx-auto flex flex-col items-center gap-3">
              {/* Waveform */}
              <VoiceWaveform phase={voicePhase} />

              {/* Voice transcript */}
              {voiceTranscript && (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-white/50 text-sm italic max-w-md text-center"
                >
                  &ldquo;{voiceTranscript}...&rdquo;
                </motion.p>
              )}

              {/* Phase indicator */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  voicePhase === 'listening' ? 'bg-emerald-400 animate-pulse' :
                  voicePhase === 'speaking' ? 'bg-amber-400 animate-pulse' : 'bg-blue-400 animate-pulse'
                }`} />
                <span className="text-sm text-white/60">
                  {voicePhase === 'listening' ? 'Listening...' :
                   voicePhase === 'processing' ? 'Analyzing your fleet data...' : 'Tasha is speaking...'}
                </span>
              </div>

              {/* End button */}
              <button
                onClick={endVoiceMode}
                className="mt-1 flex items-center gap-2 px-6 py-2.5 bg-red-500/80 hover:bg-red-500 text-white text-sm font-medium rounded-full transition-all shadow-lg shadow-red-500/20 hover:shadow-red-500/40"
              >
                <PhoneOff className="w-4 h-4" />
                End Conversation
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="text-input"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-[#E5E2DC] bg-white px-6 py-4 shrink-0"
          >
            <div className="max-w-5xl mx-auto flex items-center gap-3">
              {/* Mic Button — enters voice conversation mode */}
              <button
                onClick={enterVoiceMode}
                disabled={streaming}
                className="w-12 h-12 rounded-xl bg-[#18202F] text-white hover:bg-[#2D3748] flex items-center justify-center transition-all duration-200 shrink-0 disabled:opacity-40"
                title="Start voice conversation"
              >
                <Mic className="w-5 h-5" />
              </button>

              {/* Text Input */}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) sendMessage(input); }}
                placeholder="Ask Tasha about your fleet..."
                className="flex-1 bg-[#FAF9F7] border border-[#E5E2DC] rounded-xl px-5 py-3.5 text-[15px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#FBAF1A] focus:ring-2 focus:ring-[#FBAF1A]/20 transition-all"
                disabled={streaming}
              />

              {/* Send Button */}
              <button
                onClick={() => sendMessage(input)}
                disabled={streaming || !input.trim()}
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FBAF1A] to-[#BF7408] text-white flex items-center justify-center hover:shadow-lg hover:shadow-amber-500/20 transition-all duration-200 disabled:opacity-40 disabled:shadow-none shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
