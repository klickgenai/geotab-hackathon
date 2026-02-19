'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Mic, Send, Shield, Volume2, VolumeX, Sparkles, PhoneOff } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import ComponentRenderer from '@/components/assistant/ComponentRenderer';

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
      if (!inTable) { html.push('<table class="w-full text-xs my-2 border-collapse">'); inTable = true; }
      if (inList) { html.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      const cells = line.split('|').filter(c => c.trim());
      const isHeader = i > 0 && /^\s*\|[\s-:|]+\|\s*$/.test(lines[i + 1] || '');
      const tag = isHeader ? 'th' : 'td';
      const cellClass = isHeader
        ? 'px-3 py-1.5 text-left font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-200'
        : 'px-3 py-1.5 border-b border-gray-100 text-gray-700';
      html.push(`<tr>${cells.map(c => `<${tag} class="${cellClass}">${inlineFormat(c.trim())}</${tag}>`).join('')}</tr>`);
      continue;
    }
    if (inTable) { html.push('</table>'); inTable = false; }
    if (/^#{1,3}\s/.test(line)) {
      if (inList) { html.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      const level = (line.match(/^#+/) as RegExpMatchArray)[0].length;
      const content = line.replace(/^#+\s*/, '');
      const cls = level === 1 ? 'text-sm font-bold text-gray-800 mt-3 mb-1'
        : level === 2 ? 'text-xs font-bold text-gray-700 mt-3 mb-1 uppercase tracking-wider'
        : 'text-xs font-semibold text-gray-600 mt-2 mb-0.5';
      html.push(`<div class="${cls}">${inlineFormat(content)}</div>`);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      if (!inList || listType !== 'ul') { if (inList) html.push('</ol>'); html.push('<ul class="space-y-0.5 my-1">'); inList = true; listType = 'ul'; }
      const content = line.replace(/^\s*[-*]\s+/, '');
      html.push(`<li class="flex gap-1.5 text-xs text-gray-700"><span class="text-amber-500 mt-0.5 shrink-0">\u2022</span><span>${inlineFormat(content)}</span></li>`);
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      if (!inList || listType !== 'ol') { if (inList) html.push('</ul>'); html.push('<ol class="space-y-0.5 my-1">'); inList = true; listType = 'ol'; }
      const num = line.match(/^\s*(\d+)\./)?.[1] || '1';
      const content = line.replace(/^\s*\d+\.\s+/, '');
      html.push(`<li class="flex gap-1.5 text-xs text-gray-700"><span class="text-amber-600 font-bold shrink-0">${num}.</span><span>${inlineFormat(content)}</span></li>`);
      continue;
    }
    if (inList) { html.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
    if (!line.trim()) { html.push('<div class="h-1.5"></div>'); continue; }
    html.push(`<p class="text-sm text-gray-800 leading-relaxed">${inlineFormat(line)}</p>`);
  }
  if (inTable) html.push('</table>');
  if (inList) html.push(listType === 'ul' ? '</ul>' : '</ol>');
  return html.join('');
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono text-gray-700">$1</code>')
    .replace(/\$([0-9,]+)/g, '<span class="text-emerald-600 font-semibold">$$$1</span>')
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
    parts: [{ type: 'text', content: "Hi, I'm **Ava** — your fleet intelligence assistant. Ask me anything about your fleet, or tap a chip below to get started. I can show you live dashboards, scores, and analytics right here." }],
    timestamp: new Date(),
  }]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [interimTranscript, setInterimTranscript] = useState('');

  // Voice conversation mode
  const [voiceMode, setVoiceMode] = useState(false);
  const [voicePhase, setVoicePhase] = useState<VoicePhase>('listening');

  // Refs for async-safe access (avoid stale closures)
  const voiceModeRef = useRef(false);
  const streamingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const abortRef = useRef<AbortController | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sendMessageRef = useRef<(text: string) => void>(null!);

  // Keep refs in sync
  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ---------- TTS (Promise-based) ---------- */
  const speakAsync = useCallback(async (voiceText: string): Promise<void> => {
    if (!voiceEnabled || typeof window === 'undefined' || !voiceText.trim()) return;

    return new Promise<void>(async (resolve) => {
      // Try Smallest AI TTS
      try {
        const res = await api.ttsSynthesize(voiceText);
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            audioContextRef.current = new AudioContext({ sampleRate: 24000 });
          }
          const ctx = audioContextRef.current;
          if (ctx.state === 'suspended') await ctx.resume();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);
          source.onended = () => resolve();
          source.start();
          return;
        }
      } catch {
        // Fall through to browser TTS
      }

      // Fallback: browser SpeechSynthesis
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(voiceText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  }, [voiceEnabled]);

  /* ---------- Speech Recognition ---------- */
  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    // Stop any existing recognition
    recognitionRef.current?.stop();

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += transcript;
        else interim += transcript;
      }
      if (interim) setInterimTranscript(interim);
      if (final.trim()) {
        setInterimTranscript('');
        sendMessageRef.current(final);
      }
    };

    recognition.onerror = () => { setInterimTranscript(''); };
    recognition.onend = () => { setInterimTranscript(''); };

    recognition.start();
    recognitionRef.current = recognition;
  }, []);

  /* ---------- Voice Mode Controls ---------- */
  const enterVoiceMode = useCallback(() => {
    setVoiceMode(true);
    voiceModeRef.current = true;
    setVoiceEnabled(true);
    setVoicePhase('listening');
    startListening();
  }, [startListening]);

  const endVoiceMode = useCallback(() => {
    setVoiceMode(false);
    voiceModeRef.current = false;
    setVoicePhase('listening');
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setInterimTranscript('');
    if (abortRef.current) abortRef.current.abort();
    if (typeof window !== 'undefined') window.speechSynthesis.cancel();
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  /* ---------- Send Message ---------- */
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streamingRef.current) return;

    // Cancel any playing speech
    if (typeof window !== 'undefined') window.speechSynthesis.cancel();

    const userMsg: ChatMessage = { id: genId(), role: 'user', parts: [{ type: 'text', content: text }], timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setInterimTranscript('');
    streamingRef.current = true;
    setStreaming(true);

    if (voiceModeRef.current) setVoicePhase('processing');

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
                if (voiceModeRef.current) setVoicePhase('speaking');
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

      // Voice mode: wait for speech to finish, then auto-restart listening
      if (voiceModeRef.current) {
        if (speakPromise) {
          try { await speakPromise; } catch {}
        }
        // Small pause before re-listening so it feels natural
        if (voiceModeRef.current) {
          await new Promise(r => setTimeout(r, 400));
          if (voiceModeRef.current) {
            setVoicePhase('listening');
            startListening();
          }
        }
      }
    }
  }, [speakAsync, startListening]);

  // Keep sendMessage ref in sync for recognition callback
  useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

  const hasUserSent = messages.some(m => m.role === 'user');

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F5F3EF]">
      {/* Top Bar */}
      <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-[#E5E2DC] shrink-0">
        <Link href="/operator" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FBAF1A] to-[#BF7408] flex items-center justify-center">
          <Shield className="w-4.5 h-4.5 text-white" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            Ava <span className="text-[10px] font-medium text-gray-400">AI Assistant</span>
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
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`${msg.role === 'user' ? 'max-w-[75%]' : 'max-w-full w-full'}`}>
                  {msg.parts.map((part, pi) => (
                    <div key={`${msg.id}-${pi}`}>
                      {part.type === 'text' && part.content && (
                        <div
                          className={`px-4 py-3 text-sm leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-[#18202F] text-white rounded-2xl rounded-br-sm'
                              : 'bg-white text-gray-800 border border-[#E5E2DC] rounded-2xl rounded-bl-sm shadow-sm'
                          } ${pi > 0 ? 'mt-2' : ''}`}
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(part.content) }}
                        />
                      )}
                      {part.type === 'component' && part.toolName && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3 }}
                          className={pi > 0 ? 'mt-2' : ''}
                        >
                          <ComponentRenderer toolName={part.toolName} result={part.toolResult} />
                        </motion.div>
                      )}
                    </div>
                  ))}
                  {msg.role === 'assistant' && msg.parts.length === 0 && (
                    <div className="bg-white text-gray-400 border border-[#E5E2DC] rounded-2xl rounded-bl-sm shadow-sm px-4 py-3 text-sm">
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

          {/* Interim voice transcript */}
          {interimTranscript && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end">
              <div className="px-4 py-3 bg-[#18202F]/60 text-white/70 rounded-2xl rounded-br-sm text-sm italic">
                {interimTranscript}...
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Actions */}
      {!hasUserSent && !voiceMode && (
        <div className="px-4 pb-2 shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#FBAF1A]" />
              <span className="text-xs font-medium text-gray-400">Quick actions</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickActions.map((q) => (
                <button
                  key={q.text}
                  onClick={() => sendMessage(q.text)}
                  disabled={streaming}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border border-[#E5E2DC] text-gray-500 bg-white hover:border-[#FBAF1A] hover:text-[#BF7408] hover:bg-[#FFF8EB] transition-all duration-200 disabled:opacity-50"
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
            <div className="max-w-3xl mx-auto flex flex-col items-center gap-3">
              {/* Waveform */}
              <VoiceWaveform phase={voicePhase} />

              {/* Interim transcript in voice mode */}
              {interimTranscript && (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-white/50 text-sm italic max-w-md text-center"
                >
                  &ldquo;{interimTranscript}...&rdquo;
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
                   voicePhase === 'processing' ? 'Analyzing your fleet data...' : 'Ava is speaking...'}
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
            className="border-t border-[#E5E2DC] bg-white px-4 py-3 shrink-0"
          >
            <div className="max-w-3xl mx-auto flex items-center gap-2">
              {/* Mic Button — enters voice conversation mode */}
              <button
                onClick={enterVoiceMode}
                disabled={streaming}
                className="w-11 h-11 rounded-xl bg-[#18202F] text-white hover:bg-[#2D3748] flex items-center justify-center transition-all duration-200 shrink-0 disabled:opacity-40"
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
                placeholder="Ask Ava about your fleet..."
                className="flex-1 bg-[#FAF9F7] border border-[#E5E2DC] rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#FBAF1A] focus:ring-1 focus:ring-[#FBAF1A]/20 transition-all"
                disabled={streaming}
              />

              {/* Send Button */}
              <button
                onClick={() => sendMessage(input)}
                disabled={streaming || !input.trim()}
                className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FBAF1A] to-[#BF7408] text-white flex items-center justify-center hover:shadow-lg hover:shadow-amber-500/20 transition-all duration-200 disabled:opacity-40 disabled:shadow-none shrink-0"
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
