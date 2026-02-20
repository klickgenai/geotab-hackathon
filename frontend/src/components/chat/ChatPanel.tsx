'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Mic, Send, Shield } from 'lucide-react';
import { api } from '@/lib/api';

interface ChatMessage {
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

function getQuickActions(pathname: string): { label: string; text: string }[] {
  const actions: Record<string, { label: string; text: string }[]> = {
    '/operator': [
      { label: '\ud83d\udcca Improve Score', text: 'How can we improve our fleet safety score?' },
      { label: '\u26a0\ufe0f Risky Driver', text: 'Who is the riskiest driver and what should we do?' },
      { label: '\ud83d\udcb0 Savings Plan', text: 'Give me a detailed savings action plan' },
      { label: '\ud83d\udd04 Retention', text: 'Which drivers are at risk of leaving?' },
      { label: '\ud83d\udccb Overview', text: 'Give me a complete fleet overview' },
      { label: '\ud83d\udcc4 Report', text: 'Generate an executive summary report' },
    ],
    '/operator/insurance': [
      { label: '\ud83d\udcc8 Improve Score', text: 'How can we improve our insurance score?' },
      { label: '\ud83d\udcb0 Speeding Impact', text: 'What would reducing speeding by 20% save us?' },
      { label: '\ud83d\udd0d Weakest Area', text: 'Which insurance component is our weakest and how do we fix it?' },
      { label: '\ud83c\udfaf Reach Grade B', text: 'Give me a detailed plan to reach insurance grade B' },
    ],
    '/operator/safety': [
      { label: '\ud83d\udcca Common Events', text: 'What are the most common safety events?' },
      { label: '\u26a0\ufe0f Critical Drivers', text: 'Which drivers have the most critical safety events?' },
      { label: '\ud83d\udcc8 Safety Trend', text: 'How is our safety trend looking?' },
    ],
    '/operator/wellness': [
      { label: '\ud83d\udd25 Burnout Risk', text: 'Who has the highest burnout risk right now?' },
      { label: '\ud83d\udcb0 Retention Cost', text: 'How much are we spending on driver retention risk?' },
      { label: '\ud83c\udfe5 Wellness Plan', text: 'Give me a wellness intervention plan for at-risk drivers' },
    ],
    '/operator/predictive': [
      { label: '\u26a0\ufe0f High Risk', text: 'Who is the highest risk driver today?' },
      { label: '\ud83d\udcc5 Weekly Forecast', text: 'What does the weekly safety forecast look like?' },
      { label: '\ud83d\udcc8 Risk Trends', text: 'Which risk factors are trending up?' },
    ],
    '/operator/alerts': [
      { label: '\ud83c\udf05 Morning Brief', text: 'Give me a morning alert briefing' },
      { label: '\ud83d\udea8 Immediate Action', text: 'Which alerts need immediate action?' },
      { label: '\ud83d\udcca Alert Patterns', text: 'Summarize the alert patterns this week' },
    ],
    '/operator/roi': [
      { label: '\ud83d\udcb0 Annual Savings', text: 'How much are we saving annually with FleetShield?' },
      { label: '\ud83d\udcca Biggest Savings', text: 'Where are the biggest savings opportunities?' },
      { label: '\ud83d\udd04 Retention ROI', text: 'How can we improve our retention savings?' },
    ],
    '/operator/vehicles': [
      { label: '\ud83d\udd27 Maintenance', text: 'Which vehicles need maintenance soon?' },
      { label: '\ud83d\udcca Fleet Age', text: "What's our average fleet age and condition?" },
    ],
    '/operator/drivers': [
      { label: '\ud83c\udfaf Coach First', text: 'Who needs coaching first and why?' },
      { label: '\u26a0\ufe0f Critical Tier', text: 'Show me all critical-tier drivers' },
      { label: '\ud83d\udcca Risk Causes', text: "What's causing the highest risk scores?" },
    ],
    '/operator/reports': [
      { label: '\ud83d\udcc4 Insurance Report', text: 'Generate a comprehensive insurance report' },
      { label: '\ud83d\udccb Underwriter Brief', text: 'What should I highlight for insurance underwriters?' },
    ],
    '/operator/map': [
      { label: '\ud83c\udd7f\ufe0f Idle Vehicles', text: 'Which vehicles are idle right now?' },
      { label: '\u26a0\ufe0f Risk Zones', text: 'Show me vehicles in high-risk zones' },
    ],
  };

  // Exact match first
  const exactMatch = actions[pathname];
  if (exactMatch) return exactMatch;

  // Try prefix match for nested routes (longest prefix wins)
  const keys = Object.keys(actions).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (pathname.startsWith(key) && key !== '/operator') return actions[key];
  }

  return actions['/operator'] || [];
}

export default function ChatPanel() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'bot',
      content: "Hi! I'm **Tasha**, your fleet risk analyst. Ask me about insurance scores, driver risk, wellness, financial impact, or I can generate a report for you.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStreaming(true);

    // Add placeholder bot message
    const botMsg: ChatMessage = { role: 'bot', content: '', timestamp: new Date() };
    setMessages(prev => [...prev, botMsg]);

    try {
      const res = await api.chatStream(text, pathname);
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

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
              fullText += data.content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullText };
                return updated;
              });
            }
          } catch {}
        }
      }

      if (!fullText) {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: 'I wasn\'t able to process that. Please try again.' };
          return updated;
        });
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], content: 'Connection error. Make sure the backend server is running.' };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }, [streaming, pathname]);

  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice recognition not supported. Use Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      if (text.trim()) sendMessage(text);
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  };

  const renderContent = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-black/5 px-1 py-0.5 rounded text-xs">$1</code>')
      .replace(/\n/g, '<br/>')
      .replace(/\$([0-9,]+)/g, '<span class="text-emerald-600 font-semibold">$$$1</span>');
  };

  return (
    <>
      {/* FAB */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 300); }}
            className="fixed bottom-6 right-6 w-[52px] h-[52px] rounded-2xl bg-[#18202F] text-white flex items-center justify-center shadow-[0_4px_16px_rgba(24,32,47,0.35)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(24,32,47,0.4)] transition-all duration-200 z-[100]"
          >
            <MessageCircle className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
            className="fixed bottom-6 right-6 w-[400px] h-[560px] bg-white border border-[#E5E2DC] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex flex-col z-[100] origin-bottom-right"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E2DC]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FBAF1A] to-[#BF7408] flex items-center justify-center">
                  <Shield className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Tasha</div>
                  <div className="text-xs text-emerald-500 font-medium">Online</div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded-xl hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[82%] px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#18202F] text-white rounded-2xl rounded-br-sm'
                        : 'bg-[#FAF9F7] text-gray-800 border border-[#E5E2DC] rounded-2xl rounded-bl-sm'
                    } ${msg.role === 'bot' && !msg.content ? 'animate-pulse text-gray-400' : ''}`}
                    dangerouslySetInnerHTML={{
                      __html: msg.content ? renderContent(msg.content) : 'Thinking...',
                    }}
                  />
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick actions */}
            {messages.length <= 4 && (
              <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                {getQuickActions(pathname).map((q) => (
                  <button
                    key={q.text}
                    onClick={() => sendMessage(q.text)}
                    className="px-2.5 py-1 rounded-full text-xs font-medium border border-[#E5E2DC] text-gray-500 hover:border-[#FBAF1A] hover:text-[#BF7408] hover:bg-[#FFF8EB] transition-all duration-200"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="flex items-center gap-1.5 px-3 py-2.5 border-t border-[#E5E2DC]">
              <button
                onClick={toggleVoice}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-[#FAF9F7] border border-[#E5E2DC] text-gray-500 hover:border-[#FBAF1A] hover:text-[#BF7408]'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
              </button>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(input); }}
                placeholder="Ask Tasha about your fleet..."
                className="flex-1 bg-[#FAF9F7] border border-[#E5E2DC] rounded-xl px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#FBAF1A] transition-colors"
                disabled={streaming}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={streaming || !input.trim()}
                className="w-8 h-8 rounded-xl bg-[#18202F] text-white flex items-center justify-center hover:bg-[#2D3748] transition-colors disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
