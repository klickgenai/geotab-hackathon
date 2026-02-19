'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Mic, Send, Shield } from 'lucide-react';
import { api } from '@/lib/api';

interface ChatMessage {
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

const quickActions = [
  'Show fleet overview',
  'Who is the riskiest driver?',
  'Show insurance score',
  'Who might quit?',
  'How much can we save?',
  'Generate a report',
];

export default function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'bot',
      content: "Hi! I'm **Ava**, your fleet risk analyst. Ask me about insurance scores, driver risk, wellness, financial impact, or I can generate a report for you.",
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
      const res = await api.chatStream(text);
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
  }, [streaming]);

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
                  <div className="text-sm font-semibold">Ava</div>
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
            {messages.length <= 2 && (
              <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                {quickActions.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="px-2.5 py-1 rounded-full text-xs font-medium border border-[#E5E2DC] text-gray-500 hover:border-[#FBAF1A] hover:text-[#BF7408] hover:bg-[#FFF8EB] transition-all duration-200"
                  >
                    {q}
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
                placeholder="Ask Ava about your fleet..."
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
