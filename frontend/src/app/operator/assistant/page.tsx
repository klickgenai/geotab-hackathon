'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Mic, MicOff, Send, Shield, Volume2, VolumeX, Sparkles } from 'lucide-react';
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

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-black/10 px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/\n/g, '<br/>')
    .replace(/\$([0-9,]+)/g, '<span class="text-emerald-500 font-semibold">$$$1</span>');
}

/* ---------- Component ---------- */
export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: genId(),
      role: 'assistant',
      parts: [{ type: 'text', content: "Hi, I'm **Ava** — your fleet intelligence assistant. Ask me anything about your fleet, or tap a chip below to get started. I can show you live dashboards, scores, and analytics right here." }],
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [interimTranscript, setInterimTranscript] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Speak a summary via browser TTS
  const speak = useCallback((text: string) => {
    if (!voiceEnabled || typeof window === 'undefined') return;
    // Clean markdown
    const clean = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '').replace(/<[^>]+>/g, '');
    // Only speak first 2 sentences for brevity
    const sentences = clean.split(/[.!?]+/).filter(s => s.trim().length > 3).slice(0, 2);
    if (sentences.length === 0) return;
    const utterance = new SpeechSynthesisUtterance(sentences.join('. ') + '.');
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  // Send message
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;

    // Cancel speech
    if (typeof window !== 'undefined') window.speechSynthesis.cancel();

    const userMsg: ChatMessage = { id: genId(), role: 'user', parts: [{ type: 'text', content: text }], timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setInterimTranscript('');
    setStreaming(true);

    // Create assistant message placeholder
    const assistantId = genId();
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', parts: [], timestamp: new Date() }]);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await api.assistantStream(text, '/operator/assistant');
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentText = '';
      let firstTextSent = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (abort.signal.aborted) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'text') {
              currentText += data.content;
              setMessages(prev => {
                const updated = [...prev];
                const msg = updated.find(m => m.id === assistantId);
                if (!msg) return prev;
                // Find or create the last text part
                const lastPart = msg.parts[msg.parts.length - 1];
                if (lastPart && lastPart.type === 'text') {
                  lastPart.content = currentText;
                } else {
                  msg.parts.push({ type: 'text', content: currentText });
                }
                return [...updated];
              });
            } else if (data.type === 'tool_result') {
              // Flush current text and start a new text segment after component
              const textBeforeComponent = currentText;
              currentText = '';

              setMessages(prev => {
                const updated = [...prev];
                const msg = updated.find(m => m.id === assistantId);
                if (!msg) return prev;
                // Add the component part
                msg.parts.push({ type: 'component', toolName: data.toolName, toolResult: data.result });
                return [...updated];
              });

              // Voice: speak summary of first text chunk
              if (!firstTextSent && textBeforeComponent.trim()) {
                speak(textBeforeComponent);
                firstTextSent = true;
              }
            }
          } catch {}
        }
      }

      // Final voice for text after last component
      if (!firstTextSent && currentText.trim()) {
        speak(currentText);
      }
    } catch (err) {
      if (!abort.signal.aborted) {
        setMessages(prev => {
          const updated = [...prev];
          const msg = updated.find(m => m.id === assistantId);
          if (msg) {
            msg.parts = [{ type: 'text', content: 'Connection error. Make sure the backend server is running.' }];
          }
          return [...updated];
        });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [streaming, speak]);

  // Voice input via Web Speech API
  const toggleVoice = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setInterimTranscript('');
      return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      if (interim) setInterimTranscript(interim);
      if (final.trim()) {
        setInterimTranscript('');
        sendMessage(final);
        setIsListening(false);
      }
    };

    recognition.onerror = () => { setIsListening(false); setInterimTranscript(''); };
    recognition.onend = () => { setIsListening(false); setInterimTranscript(''); };

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  }, [isListening, sendMessage]);

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
            <div className={`w-1.5 h-1.5 rounded-full ${streaming ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
            <span className="text-xs text-gray-400">{streaming ? 'Thinking...' : 'Ready'}</span>
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
                    <div key={pi}>
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
                        <div className={pi > 0 ? 'mt-2' : ''}>
                          <ComponentRenderer toolName={part.toolName} result={part.toolResult} />
                        </div>
                      )}
                    </div>
                  ))}
                  {/* Show thinking indicator for empty assistant message */}
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

          {/* Interim transcript */}
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

      {/* Quick Actions (shown when few messages) */}
      {!hasUserSent && (
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

      {/* Bottom Input Bar */}
      <div className="border-t border-[#E5E2DC] bg-white px-4 py-3 shrink-0">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          {/* Mic Button */}
          <button
            onClick={toggleVoice}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 shrink-0 ${
              isListening
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse'
                : 'bg-[#18202F] text-white hover:bg-[#2D3748]'
            }`}
            title={isListening ? 'Stop listening' : 'Tap to speak'}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) sendMessage(input); }}
            placeholder={isListening ? 'Listening...' : 'Ask Ava about your fleet...'}
            className="flex-1 bg-[#FAF9F7] border border-[#E5E2DC] rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#FBAF1A] focus:ring-1 focus:ring-[#FBAF1A]/20 transition-all"
            disabled={streaming || isListening}
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
      </div>
    </div>
  );
}
