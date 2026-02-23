'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  motion,
  useInView,
} from 'framer-motion';
import {
  Shield, TrendingUp, Heart, DollarSign, Mic, Brain, BarChart3,
  ChevronRight, ArrowRight, Zap, Users, Truck, AlertTriangle,
  Leaf, Clock, Phone, MessageCircle, Volume2, Target,
  ArrowDown, Sparkles, CircleDollarSign, ShieldAlert, HeartPulse,
  TreePine, Fuel, Wind, Activity,
} from 'lucide-react';

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   UTILITY COMPONENTS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const EASE_OUT: [number, number, number, number] = [0.22, 0.61, 0.36, 1];

/** Scroll-triggered entrance wrapper */
function Reveal({
  children,
  delay = 0,
  direction = 'up',
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'left' | 'right';
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  const offsets = { up: { y: 40 }, left: { x: -40 }, right: { x: 40 } };
  const initial = { opacity: 0, ...offsets[direction] };
  const animate = inView
    ? { opacity: 1, x: 0, y: 0, transition: { duration: 0.6, delay, ease: EASE_OUT } }
    : initial;

  return (
    <motion.div ref={ref} initial={initial} animate={animate} className={className}>
      {children}
    </motion.div>
  );
}

/** Animated hero centerpiece — concentric pulsing rings around the shield logo */
function GlowingShield() {
  const rings = [
    { size: 120, duration: 3, delay: 0 },
    { size: 180, duration: 4, delay: 0.5 },
    { size: 240, duration: 5, delay: 1 },
  ];

  return (
    <div className="relative w-[260px] h-[260px] flex items-center justify-center">
      {rings.map((ring, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border"
          style={{
            width: ring.size,
            height: ring.size,
            borderColor: i === 0 ? 'rgba(251,175,26,0.25)' : i === 1 ? 'rgba(251,175,26,0.15)' : 'rgba(16,185,129,0.1)',
          }}
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.6, 0.2, 0.6],
          }}
          transition={{
            duration: ring.duration,
            delay: ring.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
      {/* Inner glow */}
      <motion.div
        className="absolute w-24 h-24 rounded-full"
        animate={{
          boxShadow: [
            '0 0 40px 10px rgba(251,175,26,0.15)',
            '0 0 60px 20px rgba(251,175,26,0.25)',
            '0 0 40px 10px rgba(251,175,26,0.15)',
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <FleetShieldLogo size={64} />
    </div>
  );
}

/** Character-by-character text reveal */
function TypewriterText({
  text,
  className = '',
  charDelay = 28,
  startDelay = 0,
}: {
  text: string;
  className?: string;
  charDelay?: number;
  startDelay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    let i = 0;
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, charDelay);
    }, startDelay);
    return () => clearTimeout(timeout);
  }, [inView, text, charDelay, startDelay]);

  return (
    <span ref={ref} className={className}>
      {displayed}
      {!done && inView && (
        <span className="inline-block w-[2px] h-[1em] bg-pink-400 ml-0.5 animate-pulse align-middle" />
      )}
    </span>
  );
}

/** CSS-only dot grid background */
function DotGrid() {
  return (
    <div
      className="absolute inset-0 opacity-[0.04]"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    />
  );
}

/** SVG ring that fills when scrolled into view */
function ProgressRing({
  progress,
  size = 64,
  stroke = 3,
  color = '#FBAF1A',
}: {
  progress: number; // 0-1
  size?: number;
  stroke?: number;
  color?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg ref={ref} width={size} height={size} className="absolute inset-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeOpacity={0.1}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={inView ? { strokeDashoffset: circumference * (1 - progress) } : {}}
        transition={{ duration: 1.2, delay: 0.2, ease: EASE_OUT }}
      />
    </svg>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   EXISTING HELPERS (kept)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function FleetShieldLogo({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      <path d="M24 4L6 12v12c0 11.1 7.7 21.5 18 24 10.3-2.5 18-12.9 18-24V12L24 4z" fill="url(#shieldGrad)" stroke="url(#shieldStroke)" strokeWidth="1" />
      <path d="M24 8L10 14.5v9.5c0 9.2 6.3 17.8 14 19.8V8z" fill="rgba(255,255,255,0.06)" />
      <g stroke="#FBAF1A" strokeWidth="2" strokeLinecap="round" opacity="0.9"><path d="M17 24h3l2-6 3 12 2.5-8 2.5 4h3" /></g>
      <circle cx="24" cy="24" r="2" fill="#FBAF1A" />
      <path d="M24 4L6 12v2l18-8 18 8v-2L24 4z" fill="rgba(251,175,26,0.3)" />
      <defs>
        <linearGradient id="shieldGrad" x1="6" y1="4" x2="42" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1a2540" /><stop offset="100%" stopColor="#0f1729" />
        </linearGradient>
        <linearGradient id="shieldStroke" x1="6" y1="4" x2="42" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBAF1A" stopOpacity="0.5" /><stop offset="50%" stopColor="#FBAF1A" stopOpacity="0.2" /><stop offset="100%" stopColor="#10B981" stopOpacity="0.3" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function AnimatedCounter({ end, prefix = '', suffix = '', duration = 2000 }: { end: number; prefix?: string; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const startTime = Date.now();
          const tick = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(1, elapsed / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(end * eased));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

function VoiceWave() {
  const bars = [0, 1, 2, 3, 4, 3, 2, 1, 0];
  return (
    <div className="flex items-center gap-[3px] h-8">
      {bars.map((base, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-gradient-to-t from-[#FBAF1A] to-emerald-400 opacity-80"
          style={{
            height: `${12 + base * 5}px`,
            animation: `voiceBar ${0.4 + i * 0.08}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.05}s`,
          }}
        />
      ))}
    </div>
  );
}

/** Bouncing dots thinking indicator */
function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-pink-400"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.5, delay: i * 0.15, repeat: Infinity }}
        />
      ))}
    </span>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MAIN PAGE
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export default function LandingPage() {
  const router = useRouter();
  const [scrollY, setScrollY] = useState(0);

  const heroRef = useRef<HTMLDivElement>(null);

  // Staged conversation state
  const [convoStep, setConvoStep] = useState(0);
  const convoRef = useRef<HTMLDivElement>(null);
  const convoInView = useInView(convoRef, { once: true, margin: '-100px' });
  const convoStarted = useRef(false);

  useEffect(() => {
    if (!convoInView || convoStarted.current) return;
    convoStarted.current = true;
    const timers = [
      setTimeout(() => setConvoStep(1), 800),   // user message
      setTimeout(() => setConvoStep(2), 2200),   // thinking dots
      setTimeout(() => setConvoStep(3), 3000),   // tasha types out
    ];
    return () => timers.forEach(clearTimeout);
  }, [convoInView]);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Staggered headline words
  const headlineWords1 = ['Your', 'fleet', 'data', 'holds'];
  const headlineWords2 = ['million-dollar', 'answers.'];

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white overflow-x-hidden">
      {/* Voice wave + cursor animations */}
      <style>{`
        @keyframes voiceBar { 0% { transform: scaleY(0.5); } 100% { transform: scaleY(1.6); } }
      `}</style>

      {/* ━━━ NAVIGATION ━━━ */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrollY > 50 ? 'bg-[#0B0F1A]/95 backdrop-blur-xl border-b border-white/[0.06]' : ''}`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FleetShieldLogo size={36} />
            <div className="flex flex-col">
              <span className="text-lg font-extrabold tracking-tight leading-none">
                <span className="text-white">Fleet</span><span className="text-[#FBAF1A]">Shield</span><span className="text-white/40 ml-1">AI</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push('/operator')}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-white/20 text-white/80 hover:bg-white/10 hover:text-white transition-all duration-200"
            >
              Fleet Operator
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push('/driver-portal')}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#FBAF1A] to-[#BF7408] text-[#0B0F1A] hover:brightness-110 transition-all duration-200"
            >
              Driver Portal
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* ━━━ HERO ━━━ */}
      <section ref={heroRef} className="relative pt-28 pb-20">
        {/* Background layers */}
        <div className="absolute inset-0 overflow-hidden">
          <DotGrid />
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#FBAF1A]/[0.04] rounded-full blur-[120px]" />
          <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-emerald-500/[0.03] rounded-full blur-[100px]" />
          <div className="absolute top-20 right-1/3 w-[400px] h-[400px] bg-pink-500/[0.02] rounded-full blur-[100px]" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FBAF1A]/20 to-transparent" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 w-full">
          {/* GlowingShield centerpiece */}
          <div className="flex flex-col items-center gap-2 mb-8">
            <GlowingShield />
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6, ease: EASE_OUT }}
              className="flex flex-col items-center"
            >
              <span className="text-2xl font-extrabold tracking-tight leading-none">
                <span className="text-white">Fleet</span><span className="text-[#FBAF1A]">Shield</span><span className="text-white/40 ml-1.5">AI</span>
              </span>
              <span className="text-[9px] font-bold text-white/25 tracking-[3px] uppercase leading-none mt-0.5">Predictive Fleet Intelligence</span>
            </motion.div>
          </div>

          {/* Geotab badge */}
          <Reveal delay={0.4} className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08]">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm text-white/50">Powered by Geotab MyGeotab API + Ace API</span>
            </div>
          </Reveal>

          {/* Staggered headline */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-[5.5rem] font-extrabold leading-[1.02] tracking-tight mb-6">
              <span className="inline-flex flex-wrap justify-center gap-x-[0.3em]">
                {headlineWords1.map((word, i) => (
                  <motion.span
                    key={word}
                    className="text-white inline-block"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.08, duration: 0.5, ease: EASE_OUT }}
                  >
                    {word}
                  </motion.span>
                ))}
              </span>
              <br />
              <span className="inline-flex flex-wrap justify-center gap-x-[0.3em]">
                {headlineWords2.map((word, i) => (
                  <motion.span
                    key={word}
                    className="bg-gradient-to-r from-[#FBAF1A] via-emerald-400 to-blue-400 bg-clip-text text-transparent inline-block"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.82 + i * 0.12, duration: 0.6, ease: EASE_OUT }}
                  >
                    {word}
                  </motion.span>
                ))}
              </span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.6, ease: EASE_OUT }}
              className="text-xl md:text-2xl text-white/45 max-w-4xl mx-auto leading-relaxed mb-8"
            >
              $91K per accident. 87% driver turnover. 2,400 alerts buried daily.{' '}
              The data to prevent it all is already in your Geotab — but nobody has time to find it.
            </motion.p>
            {/* Tasha intro badge */}
            <Reveal delay={1.3}>
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-500/10 to-[#FBAF1A]/10 border border-pink-500/15 mb-8">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-[#FBAF1A] flex items-center justify-center shadow-lg shadow-pink-500/20">
                  <Mic className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-lg font-extrabold text-white">
                    Meet <span className="bg-gradient-to-r from-pink-400 to-[#FBAF1A] bg-clip-text text-transparent">Tasha</span> — your fleet&apos;s Voice AI Agent.
                  </div>
                  <div className="text-sm text-white/40">She finds the answers, predicts the risks, and talks to your drivers hands-free.</div>
                </div>
              </div>
            </Reveal>

            {/* Live voice terminal — staged conversation */}
            <div ref={convoRef} className="max-w-2xl mx-auto bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-3xl p-6 border border-white/[0.08] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-pink-500/[0.06] rounded-full blur-[60px]" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#FBAF1A]/[0.04] rounded-full blur-[50px]" />
              <div className="relative">
                <div className="flex items-center justify-center gap-2 mb-5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-white/30 uppercase tracking-[2px]">Tasha Voice AI — Live</span>
                  <div className="ml-2"><VoiceWave /></div>
                </div>
                <div className="space-y-3 min-h-[100px]">
                  {/* Step 1: User message slides in */}
                  {convoStep >= 1 && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, ease: EASE_OUT }}
                      className="flex items-start gap-2.5 justify-start"
                    >
                      <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <Mic className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <div className="bg-blue-500/10 rounded-2xl rounded-tl-sm px-4 py-2.5">
                        <p className="text-sm text-white/80">&quot;Tasha, which drivers need attention today?&quot;</p>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Thinking dots */}
                  {convoStep === 2 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-start gap-2.5 justify-end"
                    >
                      <div className="bg-gradient-to-r from-pink-500/10 to-[#FBAF1A]/10 rounded-2xl rounded-tr-sm px-4 py-3 border border-pink-500/10">
                        <ThinkingDots />
                      </div>
                      <div className="w-7 h-7 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                        <Volume2 className="w-3.5 h-3.5 text-pink-400" />
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Tasha response types out */}
                  {convoStep >= 3 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, ease: EASE_OUT }}
                      className="flex items-start gap-2.5 justify-end"
                    >
                      <div className="bg-gradient-to-r from-pink-500/10 to-[#FBAF1A]/10 rounded-2xl rounded-tr-sm px-4 py-2.5 border border-pink-500/10">
                        <p className="text-sm text-white/80">
                          <TypewriterText
                            text="3 drivers flagged. Marcus has a 23% higher risk this week — increased hard braking on I-401. I've prepared a coaching plan. Want me to deploy it?"
                            charDelay={25}
                          />
                        </p>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                        <Volume2 className="w-3.5 h-3.5 text-pink-400" />
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Two Portal Preview Cards — slide in from opposite sides */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-6xl mx-auto mb-12">
            {/* Operator Card — from left */}
            <Reveal direction="left" delay={0.1}>
              <motion.button
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                onClick={() => router.push('/operator')}
                className="group text-left w-full bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/[0.08] rounded-3xl p-7 hover:border-[#FBAF1A]/30 hover:bg-white/[0.06] transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#FBAF1A]/[0.04] rounded-full blur-[60px] group-hover:bg-[#FBAF1A]/[0.08] transition-all duration-500" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FBAF1A] to-[#BF7408] flex items-center justify-center shadow-lg shadow-[#FBAF1A]/20">
                        <BarChart3 className="w-5 h-5 text-[#0B0F1A]" />
                      </div>
                      <div>
                        <div className="text-base font-bold text-white">Fleet Operator Portal</div>
                        <div className="text-[11px] text-white/30">Safety Directors &middot; Fleet Managers &middot; Insurance</div>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/20 group-hover:text-[#FBAF1A] group-hover:translate-x-1 transition-all" />
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-white/[0.04] rounded-xl p-3">
                      <div className="text-[10px] text-white/30 mb-1">Insurance Score</div>
                      <div className="text-xl font-extrabold text-[#FBAF1A]">B</div>
                      <div className="text-[9px] text-emerald-400">+4 this month</div>
                    </div>
                    <div className="bg-white/[0.04] rounded-xl p-3">
                      <div className="text-[10px] text-white/30 mb-1">At-Risk Drivers</div>
                      <div className="text-xl font-extrabold text-red-400">3</div>
                      <div className="text-[9px] text-white/25">need intervention</div>
                    </div>
                    <div className="bg-white/[0.04] rounded-xl p-3">
                      <div className="text-[10px] text-white/30 mb-1">Annual Savings</div>
                      <div className="text-xl font-extrabold text-emerald-400">$147K</div>
                      <div className="text-[9px] text-white/25">identified</div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {[
                      'AI predicts which driver will have an incident this week',
                      'Every safety event tagged with a dollar cost to your premiums',
                      'What-If Simulator: model interventions before spending',
                      'Green Fleet: carbon footprint + EV transition analysis',
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-2 text-xs text-white/35 leading-relaxed">
                        <ChevronRight className="w-3 h-3 text-[#FBAF1A]/50 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.button>
            </Reveal>

            {/* Driver Card — from right */}
            <Reveal direction="right" delay={0.1}>
              <motion.button
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                onClick={() => router.push('/driver-portal')}
                className="group text-left w-full bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/[0.08] rounded-3xl p-7 hover:border-pink-500/30 hover:bg-white/[0.06] transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-pink-500/[0.04] rounded-full blur-[60px] group-hover:bg-pink-500/[0.08] transition-all duration-500" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
                        <Mic className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-base font-bold text-white">Driver Voice Portal</div>
                        <div className="text-[11px] text-white/30">Hands-free AI &middot; Voice-first &middot; Tablet-ready</div>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/20 group-hover:text-pink-400 group-hover:translate-x-1 transition-all" />
                  </div>

                  <div className="bg-slate-900/80 rounded-2xl p-4 mb-4 border border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] text-white/30 uppercase tracking-wider">Voice Active</span>
                      <div className="ml-auto"><VoiceWave /></div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <Mic className="w-3.5 h-3.5 text-blue-400 mt-0.5" />
                        <p className="text-xs text-white/60 italic">&quot;Hey Tasha, what&apos;s my score?&quot;</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <Volume2 className="w-3.5 h-3.5 text-pink-400 mt-0.5" />
                        <p className="text-xs text-white/80">&quot;You&apos;re at 87, up 4 this week! Ranked #3. Keep it up, you&apos;re 2 points from that Smooth Operator badge!&quot;</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {[
                      'Real voice AI (STT/TTS): not a chatbot, a real conversation',
                      'Tasha calls dispatch ON YOUR BEHALF while you drive',
                      'Pre-shift safety briefings personalized to your risk profile',
                      'Points, badges, streaks: safety that feels like a game',
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-2 text-xs text-white/35 leading-relaxed">
                        <ChevronRight className="w-3 h-3 text-pink-400/50 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.button>
            </Reveal>
          </div>

          {/* Impact Numbers with ProgressRings */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-5xl mx-auto">
            {[
              { value: 91, prefix: '$', suffix: 'K', label: 'Avg Accident Cost', color: 'text-red-400', ringColor: '#f87171', sub: 'we help prevent', progress: 0.91 },
              { value: 147, prefix: '$', suffix: 'K', label: 'Savings Identified', color: 'text-[#FBAF1A]', ringColor: '#FBAF1A', sub: 'from Geotab data', progress: 0.73 },
              { value: 992, suffix: 't', label: 'CO2 Reducible', color: 'text-emerald-400', ringColor: '#34d399', sub: 'annually', progress: 0.65 },
              { value: 30, suffix: '', label: 'Drivers AI-Assisted', color: 'text-pink-400', ringColor: '#f472b6', sub: 'by voice daily', progress: 1.0 },
            ].map((stat, i) => (
              <Reveal key={stat.label} delay={i * 0.08}>
                <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl py-3 px-4 text-center relative">
                  <div className="flex justify-center mb-1">
                    <div className="relative w-24 h-24 flex items-center justify-center">
                      <ProgressRing progress={stat.progress} size={96} stroke={3} color={stat.ringColor} />
                      <span className={`text-xl font-extrabold font-mono-kpi ${stat.color} relative z-10`}>
                        <AnimatedCounter end={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                      </span>
                    </div>
                  </div>
                  <div className="text-[10px] text-white/40 font-semibold mt-0.5">{stat.label}</div>
                  <div className="text-[9px] text-white/20">{stat.sub}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ THE HIDDEN CRISIS ━━━ */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-red-500/[0.02] via-transparent to-transparent" />
        <div className="relative max-w-7xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <div className="text-xs font-semibold text-red-400/70 uppercase tracking-[3px] mb-4">The Hidden Crisis</div>
              <h2 className="text-4xl md:text-6xl font-extrabold leading-tight">
                The data exists. The losses are{' '}
                <span className="text-red-400">preventable.</span>
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {[
              { metric: '$91K', sub: 'per accident', title: 'Premiums are a black box', icon: CircleDollarSign, color: 'text-red-400', border: 'border-red-500/15', bg: 'bg-red-500/10', gradTop: 'from-red-500/30' },
              { metric: '2,400+', sub: 'alerts/month ignored', title: 'Alert fatigue buries danger', icon: ShieldAlert, color: 'text-orange-400', border: 'border-orange-500/15', bg: 'bg-orange-500/10', gradTop: 'from-orange-500/30' },
              { metric: '992t', sub: 'CO2 wasted/year', title: 'Zero environmental visibility', icon: Wind, color: 'text-amber-400', border: 'border-amber-500/15', bg: 'bg-amber-500/10', gradTop: 'from-amber-500/30' },
              { metric: '87%', sub: 'annual turnover', title: 'Burnout is invisible', icon: HeartPulse, color: 'text-pink-400', border: 'border-pink-500/15', bg: 'bg-pink-500/10', gradTop: 'from-pink-500/30' },
              { metric: '0', sub: 'drivers like being watched', title: 'Telematics = surveillance', icon: Activity, color: 'text-purple-400', border: 'border-purple-500/15', bg: 'bg-purple-500/10', gradTop: 'from-purple-500/30' },
              { metric: '45 min', sub: 'to reach dispatch', title: 'Communication is broken', icon: Phone, color: 'text-blue-400', border: 'border-blue-500/15', bg: 'bg-blue-500/10', gradTop: 'from-blue-500/30' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <Reveal key={item.title} delay={i * 0.1}>
                  <motion.div
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.2 }}
                    className={`backdrop-blur-md bg-white/[0.03] ${item.border} border rounded-2xl p-6 md:p-8 relative overflow-hidden transition-colors`}
                  >
                    {/* Gradient top accent line */}
                    <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${item.gradTop} to-transparent`} />
                    <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center mb-4`}>
                      <Icon className={`w-6 h-6 ${item.color}`} />
                    </div>
                    <div className={`text-3xl md:text-4xl font-extrabold font-mono-kpi ${item.color} mb-1`}>{item.metric}</div>
                    <div className="text-sm text-white/30 mb-3">{item.sub}</div>
                    <h3 className="text-base md:text-lg font-bold text-white/80">{item.title}</h3>
                  </motion.div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ━━━ THE FLEETSHIELD ANSWER ━━━ */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FBAF1A]/[0.02] to-transparent" />
        <div className="relative max-w-7xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <div className="text-xs font-semibold text-[#FBAF1A]/70 uppercase tracking-[3px] mb-4">The FleetShield Answer</div>
              <h2 className="text-4xl md:text-6xl font-extrabold leading-tight">
                Not dashboards.{' '}
                <span className="bg-gradient-to-r from-[#FBAF1A] to-emerald-400 bg-clip-text text-transparent">Decisions.</span>
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: DollarSign, color: 'text-emerald-400', border: 'border-emerald-500/15', hoverBorder: 'hover:border-emerald-500/30', bg: 'bg-emerald-500/10', label: 'Insurance', title: 'Every behavior mapped to its dollar cost', desc: '7-component score, A+ to F. What-If Simulator to model savings before spending.', stats: [{ val: '18-32%', sub: 'premium cut' }, { val: '$36K', sub: 'saved/year' }], statBg: 'bg-emerald-500/10' },
              { icon: Brain, color: 'text-[#FBAF1A]', border: 'border-[#FBAF1A]/15', hoverBorder: 'hover:border-[#FBAF1A]/30', bg: 'bg-[#FBAF1A]/10', label: 'Predictive', title: "Know who's at risk before they are", desc: 'Pre-shift scoring, dangerous corridors, 14-day deterioration trends.', stats: [{ val: '94%', sub: 'accuracy' }, { val: '14 days', sub: 'early warning' }], statBg: 'bg-[#FBAF1A]/10' },
              { icon: Target, color: 'text-blue-400', border: 'border-blue-500/15', hoverBorder: 'hover:border-blue-500/30', bg: 'bg-blue-500/10', label: 'Alert Triage', title: '2,400 alerts down to 5 that matter', desc: 'AI-prioritized daily briefing. Driver name, pattern, exact action.', stats: [{ val: '99.7%', sub: 'noise cut' }, { val: '5 min', sub: 'daily briefing' }], statBg: 'bg-blue-500/10' },
              { icon: Heart, color: 'text-pink-400', border: 'border-pink-500/15', hoverBorder: 'hover:border-pink-500/30', bg: 'bg-pink-500/10', label: 'Wellness', title: 'Detect burnout from driving patterns', desc: '6 telematics signals. No surveys. Flags risk before drivers quit.', stats: [{ val: '6 signals', sub: 'monitored' }, { val: '$35K', sub: 'per save' }], statBg: 'bg-pink-500/10' },
              { icon: Sparkles, color: 'text-purple-400', border: 'border-purple-500/15', hoverBorder: 'hover:border-purple-500/30', bg: 'bg-purple-500/10', label: 'Gamification', title: 'Drivers compete. Not comply.', desc: 'Points, badges, streaks, leaderboards. Safety feels like a game.', stats: [{ val: '7 levels', sub: 'progression' }, { val: '12+', sub: 'badges' }], statBg: 'bg-purple-500/10' },
              { icon: Zap, color: 'text-amber-400', border: 'border-amber-500/15', hoverBorder: 'hover:border-amber-500/30', bg: 'bg-amber-500/10', label: 'Pre-Shift', title: 'Every shift starts with intelligence', desc: 'Personalized risk briefing, weather, route hazards, focus areas.', stats: [{ val: '30 sec', sub: 'briefing' }, { val: 'Personal', sub: 'per driver' }], statBg: 'bg-amber-500/10' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <Reveal key={item.label} delay={i * 0.08}>
                  <motion.div
                    whileHover={{ scale: 1.02, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className={`backdrop-blur-sm bg-white/[0.04] ${item.border} border rounded-2xl p-7 md:p-8 ${item.hoverBorder} transition-colors h-full`}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center`}>
                        <Icon className={`w-6 h-6 ${item.color}`} />
                      </div>
                      <span className={`text-sm font-bold ${item.color} uppercase tracking-wider`}>{item.label}</span>
                    </div>
                    <h4 className="text-xl md:text-2xl font-extrabold mb-3">{item.title}</h4>
                    <p className="text-sm text-white/45 leading-relaxed mb-5">{item.desc}</p>
                    <div className="flex gap-3">
                      {item.stats.map((stat) => (
                        <div key={stat.sub} className={`${item.statBg} rounded-xl px-4 py-2`}>
                          <div className={`text-lg font-extrabold ${item.color}`}>{stat.val}</div>
                          <div className="text-[10px] text-white/30">{stat.sub}</div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ━━━ VOICE AI ━━━ */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-pink-500/[0.03] to-transparent" />
        <div className="relative max-w-7xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <div className="text-xs font-semibold text-pink-400/70 uppercase tracking-[3px] mb-4">Core Innovation</div>
              <h2 className="text-4xl md:text-6xl font-extrabold leading-tight">
                Meet <span className="text-pink-400">Tasha</span>. Voice AI for the road.
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Voice Demo Mockup — staged replay */}
            <Reveal direction="left">
              <VoiceDemoSection />
            </Reveal>

            {/* Voice AI Capabilities */}
            <div className="space-y-4">
              {[
                { icon: Mic, color: 'text-pink-400', bg: 'bg-pink-500/10', title: 'Production STT/TTS Pipeline', desc: 'Smallest AI Pulse + Waves. Voice activity detection, barge-in support, natural conversation flow.' },
                { icon: Phone, color: 'text-amber-400', bg: 'bg-amber-500/10', title: 'Autonomous Dispatch Calls', desc: 'Tasha calls dispatch Mike on the driver\'s behalf. Negotiates ETAs, reports issues, calls back with results.' },
                { icon: Brain, color: 'text-emerald-400', bg: 'bg-emerald-500/10', title: '23 Fleet Tools by Voice', desc: 'Safety scores, HOS status, pre-shift briefings, load updates, incident reporting. All hands-free.' },
                { icon: MessageCircle, color: 'text-purple-400', bg: 'bg-purple-500/10', title: 'Support, Not Surveillance', desc: 'Celebrates wins, gives tips, knows when to stay quiet. Drivers trust her because she\'s on their side.' },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <Reveal key={item.title} direction="right" delay={i * 0.12}>
                    <motion.div
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.2 }}
                      className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 md:p-6 hover:bg-white/[0.05] transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-11 h-11 rounded-xl ${item.bg} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-5 h-5 ${item.color}`} />
                        </div>
                        <div>
                          <h4 className="text-base md:text-lg font-bold mb-1">{item.title}</h4>
                          <p className="text-sm text-white/40 leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    </motion.div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ SUSTAINABILITY ━━━ */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/[0.03] to-transparent" />
        <div className="relative max-w-7xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <div className="text-xs font-semibold text-emerald-400/70 uppercase tracking-[3px] mb-4">Environmental Impact</div>
              <h2 className="text-4xl md:text-6xl font-extrabold leading-tight">
                Fleet decarbonization,{' '}
                <span className="text-emerald-400">quantified.</span>
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-8">
            {[
              { icon: Wind, value: '313.5', unit: 'tons', label: 'Monthly CO2', color: 'text-emerald-400', bg: 'bg-emerald-500/10', ringColor: '#34d399', progress: 0.78 },
              { icon: TreePine, value: '62,076', unit: 'trees', label: 'To offset annually', color: 'text-green-400', bg: 'bg-green-500/10', ringColor: '#4ade80', progress: 0.85 },
              { icon: Fuel, value: '1,576', unit: 'L wasted', label: 'Idle fuel/month', color: 'text-amber-400', bg: 'bg-amber-500/10', ringColor: '#fbbf24', progress: 0.6 },
              { icon: Zap, value: '20', unit: 'vehicles', label: 'EV-ready now', color: 'text-blue-400', bg: 'bg-blue-500/10', ringColor: '#60a5fa', progress: 0.4 },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <Reveal key={stat.label} delay={i * 0.1}>
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 md:p-8 text-center relative">
                    <div className="flex justify-center mb-4">
                      <div className="relative w-16 h-16 flex items-center justify-center">
                        <ProgressRing progress={stat.progress} size={64} stroke={2.5} color={stat.ringColor} />
                        <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center relative z-10`}>
                          <Icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                      </div>
                    </div>
                    <div className={`text-3xl md:text-4xl font-extrabold font-mono-kpi ${stat.color}`}>{stat.value}</div>
                    <div className="text-sm text-white/40 font-semibold mt-1">{stat.unit}</div>
                    <div className="text-xs text-white/25 mt-1">{stat.label}</div>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: 'Green Score: A-F', desc: 'Fuel efficiency + idle reduction + eco-driving + fleet modernity.' },
              { title: 'EV Transition Analysis', desc: 'Trip patterns vs 2026 EV range. Which vehicles switch today.' },
              { title: 'Dollar + CO2 per Action', desc: '"5-min idle shutoff → $1,184/yr saved, 1.7t CO2 reduced."' },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 0.1}>
                <motion.div
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white/[0.04] border border-emerald-500/15 rounded-2xl p-6 md:p-7 h-full"
                >
                  <h4 className="text-lg font-bold text-emerald-400 mb-2">{item.title}</h4>
                  <p className="text-sm text-white/40 leading-relaxed">{item.desc}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ DUAL API — 3-column with center flow node ━━━ */}
      <section className="py-24 px-6 relative">
        <div className="relative max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <div className="text-xs font-semibold text-white/30 uppercase tracking-[3px] mb-4">Powered By</div>
              <h2 className="text-2xl md:text-4xl font-extrabold mb-4">
                Dual Geotab API Integration
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-center">
            {/* MyGeotab API — from left */}
            <Reveal direction="left">
              <motion.div
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
                className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-8 h-full"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-5">
                  <BarChart3 className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">MyGeotab API</h3>
                <p className="text-sm text-white/40 mb-4">Real-time telematics pipeline refreshing every 5 minutes.</p>
                <div className="space-y-2 text-xs text-white/30">
                  {['Vehicle GPS positions & speed data', 'Trip history, distance & fuel usage', 'Exception events & safety rules', 'Engine diagnostics & fault codes', 'Driver assignments & HOS data'].map((item, i) => (
                    <Reveal key={item} delay={0.3 + i * 0.06}>
                      <div className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-blue-400" /><span>{item}</span></div>
                    </Reveal>
                  ))}
                </div>
              </motion.div>
            </Reveal>

            {/* Center flow node — pulsing FleetShield */}
            <div className="hidden md:flex flex-col items-center gap-3 py-8">
              <div className="w-px h-12 bg-gradient-to-b from-blue-400/30 to-[#FBAF1A]/30" />
              <motion.div
                animate={{ scale: [1, 1.1, 1], boxShadow: ['0 0 20px 4px rgba(251,175,26,0.15)', '0 0 30px 8px rgba(251,175,26,0.25)', '0 0 20px 4px rgba(251,175,26,0.15)'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FBAF1A]/20 to-emerald-500/10 border border-[#FBAF1A]/20 flex items-center justify-center"
              >
                <FleetShieldLogo size={32} />
              </motion.div>
              <div className="w-px h-12 bg-gradient-to-b from-[#FBAF1A]/30 to-purple-400/30" />
            </div>

            {/* Geotab Ace API — from right */}
            <Reveal direction="right">
              <motion.div
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
                className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-8 h-full"
              >
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-5">
                  <Brain className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Geotab Ace API</h3>
                <p className="text-sm text-white/40 mb-4">Conversational AI for natural language fleet queries.</p>
                <div className="space-y-2 text-xs text-white/30">
                  {['Natural language fleet analytics', 'AI-generated insights on demand', 'Trend analysis & anomaly detection', 'Integrated into AI assistant chat', 'Quick-query buttons on dashboard'].map((item, i) => (
                    <Reveal key={item} delay={0.3 + i * 0.06}>
                      <div className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-purple-400" /><span>{item}</span></div>
                    </Reveal>
                  ))}
                </div>
              </motion.div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ━━━ CTA ━━━ */}
      <section className="py-28 px-6 relative overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-[#FBAF1A]/[0.04] via-transparent to-pink-500/[0.03]"
          animate={{
            background: [
              'linear-gradient(135deg, rgba(251,175,26,0.04) 0%, transparent 50%, rgba(236,72,153,0.03) 100%)',
              'linear-gradient(135deg, rgba(236,72,153,0.03) 0%, transparent 50%, rgba(251,175,26,0.04) 100%)',
              'linear-gradient(135deg, rgba(251,175,26,0.04) 0%, transparent 50%, rgba(236,72,153,0.03) 100%)',
            ],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <Reveal>
          <div className="max-w-4xl mx-auto text-center relative">
            <h2 className="text-3xl md:text-5xl font-extrabold mb-6">
              Two portals.{' '}
              <span className="bg-gradient-to-r from-[#FBAF1A] to-emerald-400 bg-clip-text text-transparent">One mission.</span>
            </h2>
            <p className="text-lg text-white/40 mb-4 max-w-2xl mx-auto">
              Fleet operators get AI intelligence that saves money and prevents incidents.<br />
              Drivers get a voice AI companion that keeps them safe and engaged.
            </p>
            <p className="text-sm text-white/25 mb-10">
              Both powered by real Geotab telematics. Both driving toward zero incidents.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push('/operator')}
                className="group w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-5 rounded-2xl text-lg font-bold bg-gradient-to-r from-[#FBAF1A] to-[#BF7408] text-[#0B0F1A] hover:brightness-110 transition-all duration-200 shadow-lg shadow-[#FBAF1A]/20"
              >
                <BarChart3 className="w-5 h-5" />
                Operator Intelligence
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push('/driver-portal')}
                className="group w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-5 rounded-2xl text-lg font-bold border-2 border-pink-500/30 text-white hover:border-pink-500/50 hover:bg-pink-500/5 transition-all duration-200"
              >
                <Mic className="w-5 h-5 text-pink-400" />
                Driver Voice Portal
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FleetShieldLogo size={28} />
            <span className="text-sm font-semibold text-white/40">
              <span className="text-white/60">Fleet</span><span className="text-[#FBAF1A]/60">Shield</span><span className="text-white/30 ml-0.5">AI</span>
            </span>
          </div>
          <div className="text-xs text-white/20 text-center">
            Built with Geotab MyGeotab API + Ace API &middot; Claude AI &middot; Geotab Vibe Coding Hackathon 2026
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   VOICE DEMO SECTION — staged conversation replay
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function VoiceDemoSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [step, setStep] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    const timers = [
      setTimeout(() => setStep(1), 600),    // bubble 1
      setTimeout(() => setStep(2), 1800),   // thinking
      setTimeout(() => setStep(3), 2600),   // tasha responds
      setTimeout(() => setStep(4), 6000),   // bubble 2
      setTimeout(() => setStep(5), 7500),   // dispatch action
    ];
    return () => timers.forEach(clearTimeout);
  }, [inView]);

  return (
    <div ref={ref} className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 border border-white/[0.08] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-40 bg-pink-500/[0.06] rounded-full blur-[60px]" />

      <div className="relative space-y-4">
        <div className="text-xs text-white/30 uppercase tracking-wider mb-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Voice Session
        </div>

        {/* Bubble 1 */}
        {step >= 1 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
            className="flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Mic className="w-4 h-4 text-blue-400" />
            </div>
            <div className="bg-blue-500/10 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
              <div className="text-[10px] text-blue-400/60 mb-1">Driver Marcus</div>
              <div className="text-sm text-white/80">&quot;Hey Tasha, how&apos;s my score looking?&quot;</div>
            </div>
          </motion.div>
        )}

        {/* Thinking */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-start gap-3 justify-end"
          >
            <div className="bg-pink-500/10 rounded-2xl rounded-tr-sm px-4 py-3">
              <ThinkingDots />
            </div>
            <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0">
              <Volume2 className="w-4 h-4 text-pink-400" />
            </div>
          </motion.div>
        )}

        {/* Tasha response types out */}
        {step >= 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="flex items-start gap-3 justify-end"
          >
            <div className="bg-pink-500/10 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
              <div className="text-[10px] text-pink-400/60 mb-1">Tasha AI</div>
              <div className="text-sm text-white/80">
                <TypewriterText
                  text="87 points Marcus, up 4 this week! Zero harsh braking in 3 days. You're #3 on the leaderboard!"
                  charDelay={28}
                />
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0">
              <Volume2 className="w-4 h-4 text-pink-400" />
            </div>
          </motion.div>
        )}

        {/* Bubble 2 */}
        {step >= 4 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
            className="flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Mic className="w-4 h-4 text-blue-400" />
            </div>
            <div className="bg-blue-500/10 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
              <div className="text-[10px] text-blue-400/60 mb-1">Driver Marcus</div>
              <div className="text-sm text-white/80">&quot;Call dispatch, I need to update my ETA.&quot;</div>
            </div>
          </motion.div>
        )}

        {/* Dispatch action */}
        {step >= 5 && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
            className="flex items-start gap-3 justify-end"
          >
            <div className="bg-gradient-to-r from-pink-500/10 to-amber-500/10 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%] border border-amber-500/10">
              <div className="text-[10px] text-amber-400/60 mb-1 flex items-center gap-1">
                <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 0.5, repeat: 2 }}>
                  <Phone className="w-3 h-3" />
                </motion.div>
                Tasha → Dispatch Mike
              </div>
              <div className="text-sm text-white/80">
                &quot;On it. I&apos;ll call Mike for you. Keep your eyes on the road.&quot;
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Phone className="w-4 h-4 text-amber-400" />
            </div>
          </motion.div>
        )}

        <div className="flex items-center justify-center pt-4">
          <VoiceWave />
        </div>
      </div>
    </div>
  );
}
