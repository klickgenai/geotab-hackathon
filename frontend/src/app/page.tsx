'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, TrendingUp, Heart, DollarSign, Mic, Brain, BarChart3,
  ChevronRight, ArrowRight, Zap, Users, Truck, AlertTriangle,
} from 'lucide-react';

function FleetShieldLogo({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
      {/* Shield body */}
      <path
        d="M24 4L6 12v12c0 11.1 7.7 21.5 18 24 10.3-2.5 18-12.9 18-24V12L24 4z"
        fill="url(#shieldGrad)"
        stroke="url(#shieldStroke)"
        strokeWidth="1"
      />
      {/* Inner shield highlight */}
      <path
        d="M24 8L10 14.5v9.5c0 9.2 6.3 17.8 14 19.8V8z"
        fill="rgba(255,255,255,0.06)"
      />
      {/* Signal pulse lines - representing data/AI */}
      <g stroke="#FBAF1A" strokeWidth="2" strokeLinecap="round" opacity="0.9">
        <path d="M17 24h3l2-6 3 12 2.5-8 2.5 4h3" />
      </g>
      {/* Center dot */}
      <circle cx="24" cy="24" r="2" fill="#FBAF1A" />
      {/* Top shield accent */}
      <path
        d="M24 4L6 12v2l18-8 18 8v-2L24 4z"
        fill="rgba(251,175,26,0.3)"
      />
      <defs>
        <linearGradient id="shieldGrad" x1="6" y1="4" x2="42" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1a2540" />
          <stop offset="100%" stopColor="#0f1729" />
        </linearGradient>
        <linearGradient id="shieldStroke" x1="6" y1="4" x2="42" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBAF1A" stopOpacity="0.5" />
          <stop offset="50%" stopColor="#FBAF1A" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0.3" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function FleetShieldWordmark({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <FleetShieldLogo size={40} />
      <div className="flex flex-col">
        <span className="text-lg font-extrabold tracking-tight leading-none">
          <span className="text-white">Fleet</span>
          <span className="text-[#FBAF1A]">Shield</span>
        </span>
        <span className="text-[9px] font-bold text-white/30 tracking-[3px] uppercase leading-none mt-0.5">Intelligence</span>
      </div>
    </div>
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

const pillars = [
  {
    icon: DollarSign,
    title: 'Insurance Intelligence',
    description: 'Transform telematics data into actionable insurance scores. See exactly how each driver behavior impacts your premiums — and simulate what-if scenarios to find the fastest path to savings.',
    color: 'from-emerald-500 to-teal-600',
    stats: [
      { label: 'Premium Reduction', value: '18-32%' },
      { label: 'Score Components', value: '7' },
    ],
  },
  {
    icon: Shield,
    title: 'Comprehensive Safety',
    description: 'AI-powered alert triage prioritizes your attention. Predictive models forecast risk corridors and identify deteriorating drivers before incidents happen. Every event gets an insurance-impact price tag.',
    color: 'from-[#FBAF1A] to-[#BF7408]',
    stats: [
      { label: 'Prediction Accuracy', value: '94%' },
      { label: 'Alert Categories', value: '14+' },
    ],
  },
  {
    icon: Heart,
    title: 'Driver AI Companion',
    description: 'Voice-first AI for drivers on tablets. Real-time coaching, burnout detection from 6 wellness signals, and an AI dispatcher that handles load updates — so your drivers feel supported, not surveilled.',
    color: 'from-pink-500 to-rose-600',
    stats: [
      { label: 'Wellness Signals', value: '6' },
      { label: 'Retention Savings', value: '$45K+' },
    ],
  },
];

const stats = [
  { value: 30, suffix: '+', label: 'Drivers Monitored', icon: Users },
  { value: 25, suffix: '+', label: 'Vehicles Tracked', icon: Truck },
  { value: 1000, suffix: '+', label: 'Safety Events Analyzed', icon: AlertTriangle },
  { value: 147, prefix: '$', suffix: 'K', label: 'Annual Savings Identified', icon: DollarSign },
];

const features = [
  { icon: BarChart3, title: 'Insurance Score Engine', desc: 'A-F grading with 7-component breakdown' },
  { icon: Zap, title: 'What-If Simulator', desc: 'Model interventions and see projected savings' },
  { icon: Brain, title: 'Predictive Safety', desc: 'Forecast risk corridors and deteriorating drivers' },
  { icon: Mic, title: 'Voice AI Assistant', desc: 'Natural language fleet queries for drivers' },
  { icon: TrendingUp, title: 'ROI Quantification', desc: 'Payback period, 3-year projections in dollars' },
  { icon: Heart, title: 'Burnout Detection', desc: '6-signal wellness model with retention costing' },
];

export default function LandingPage() {
  const router = useRouter();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrollY > 50 ? 'bg-[#0B0F1A]/95 backdrop-blur-xl border-b border-white/[0.06]' : ''}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <FleetShieldWordmark />
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/operator')}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-white/20 text-white/80 hover:bg-white/10 hover:text-white transition-all duration-200"
            >
              Operator Login
            </button>
            <button
              onClick={() => router.push('/driver-portal')}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#FBAF1A] to-[#BF7408] text-[#0B0F1A] hover:brightness-110 transition-all duration-200"
            >
              Driver Login
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#FBAF1A]/[0.04] rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-500/[0.03] rounded-full blur-[100px]" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FBAF1A]/20 to-transparent" />
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          {/* Hero Logo */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 blur-[40px] bg-[#FBAF1A]/20 rounded-full scale-150" />
              <FleetShieldLogo size={80} className="relative" />
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.08] tracking-tight mb-4">
            <span className="text-white">Fleet</span>
            <span className="bg-gradient-to-r from-[#FBAF1A] to-[#BF7408] bg-clip-text text-transparent">Shield</span>
          </h1>
          <div className="text-sm md:text-base font-semibold text-white/30 tracking-[6px] uppercase mb-8">
            Predictive Fleet Intelligence
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] mb-8">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-white/60">Powered by Geotab Telematics + AI</span>
          </div>

          <h2 className="text-2xl md:text-4xl font-bold leading-tight mb-6 text-white/80">
            Your fleet data has a{' '}
            <span className="bg-gradient-to-r from-[#FBAF1A] to-emerald-400 bg-clip-text text-transparent">
              hidden insurance story
            </span>
          </h2>

          <p className="text-lg md:text-xl text-white/50 max-w-3xl mx-auto leading-relaxed mb-10">
            Fleet safety data exists everywhere — but nobody bridges it to insurance savings,
            driver wellness, or dollars. FleetShield translates Geotab telematics into
            insurance-ready scores, predicts burnout, and quantifies every improvement in real money.
          </p>

          <div className="flex items-center justify-center gap-4 mb-16">
            <button
              onClick={() => router.push('/operator')}
              className="group flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold bg-gradient-to-r from-[#FBAF1A] to-[#BF7408] text-[#0B0F1A] hover:brightness-110 transition-all duration-200 shadow-lg shadow-[#FBAF1A]/20"
            >
              Enter Operator Portal
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => router.push('/driver-portal')}
              className="group flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold border-2 border-white/20 text-white hover:border-white/40 hover:bg-white/5 transition-all duration-200"
            >
              Driver Portal
              <Mic className="w-5 h-5 text-pink-400" />
            </button>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="text-center">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.06] mb-3">
                    <Icon className="w-5 h-5 text-[#FBAF1A]/70" />
                  </div>
                  <div className="text-3xl md:text-4xl font-extrabold text-white font-mono-kpi">
                    <AnimatedCounter end={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                  </div>
                  <div className="text-xs text-white/40 mt-1 uppercase tracking-wider">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs font-semibold text-[#FBAF1A]/70 uppercase tracking-[3px] mb-4">The Problem</div>
            <h2 className="text-3xl md:text-5xl font-extrabold leading-tight mb-6">
              Fleets have the data.<br />
              <span className="text-white/40">Nobody connects it to money.</span>
            </h2>
            <p className="text-lg text-white/40 max-w-2xl mx-auto">
              Insurance companies set premiums from claims history. Fleet managers track safety events.
              Drivers feel surveilled, not supported. The gap between telematics and financial impact is where money leaks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { emoji: '📊', title: 'Data Exists', desc: 'Geotab collects millions of data points — GPS, diagnostics, safety events, driver behavior.' },
              { emoji: '💰', title: 'Money Leaks', desc: 'Without translating events to dollar impact, fleets overpay on premiums by 18-32%.' },
              { emoji: '😰', title: 'Drivers Suffer', desc: '87% of driver turnover starts with burnout. Nobody measures wellness until it\'s too late.' },
            ].map((card) => (
              <div key={card.title} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.05] transition-colors">
                <div className="text-3xl mb-4">{card.emoji}</div>
                <h3 className="text-lg font-bold mb-2">{card.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Three Pillars */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FBAF1A]/[0.02] to-transparent" />
        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs font-semibold text-[#FBAF1A]/70 uppercase tracking-[3px] mb-4">The Solution</div>
            <h2 className="text-3xl md:text-5xl font-extrabold leading-tight">
              Three pillars. One platform.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pillars.map((pillar, i) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="group relative bg-white/[0.03] border border-white/[0.08] rounded-3xl p-8 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${pillar.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{pillar.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed mb-6">{pillar.description}</p>
                  <div className="flex gap-4">
                    {pillar.stats.map((stat) => (
                      <div key={stat.label} className="bg-white/[0.04] rounded-lg px-3 py-2">
                        <div className="text-sm font-bold text-white">{stat.value}</div>
                        <div className="text-[10px] text-white/30 uppercase">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs font-semibold text-[#FBAF1A]/70 uppercase tracking-[3px] mb-4">Capabilities</div>
            <h2 className="text-3xl md:text-4xl font-extrabold">
              Built for fleet intelligence
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 hover:bg-white/[0.05] hover:border-[#FBAF1A]/20 transition-all duration-200">
                  <Icon className="w-6 h-6 text-[#FBAF1A]/70 mb-3" />
                  <h3 className="text-sm font-bold mb-1">{feature.title}</h3>
                  <p className="text-xs text-white/40">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Dual API Section */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/[0.02] to-transparent" />
        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-semibold text-emerald-400/70 uppercase tracking-[3px] mb-4">Powered By</div>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
              Dual Geotab API Integration
            </h2>
            <p className="text-lg text-white/40 max-w-2xl mx-auto">
              FleetShield AI combines both Geotab APIs for the most comprehensive fleet intelligence available.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-8">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-5">
                <BarChart3 className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">MyGeotab API</h3>
              <p className="text-sm text-white/40 mb-4">Real-time telematics data pipeline feeding our scoring engines.</p>
              <div className="space-y-2 text-xs text-white/30">
                {['Vehicle GPS & Diagnostics', 'Trip History & Fuel Data', 'Exception Events & Safety Rules', 'Driver Assignments & Groups'].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-blue-400" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-8">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-5">
                <Brain className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Geotab Ace API</h3>
              <p className="text-sm text-white/40 mb-4">Conversational AI for natural language fleet analytics.</p>
              <div className="space-y-2 text-xs text-white/30">
                {['Natural Language Fleet Queries', 'AI-Generated Insights & Charts', 'Trend Analysis & Anomaly Detection', 'Cross-Dataset Correlation'].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-purple-400" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-6">
            Ready to unlock your fleet's<br />
            <span className="bg-gradient-to-r from-[#FBAF1A] to-emerald-400 bg-clip-text text-transparent">hidden savings?</span>
          </h2>
          <p className="text-lg text-white/40 mb-10 max-w-2xl mx-auto">
            Choose your portal below. Fleet managers get the full intelligence suite.
            Drivers get a voice-first AI companion built for the road.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => router.push('/operator')}
              className="group w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-5 rounded-2xl text-lg font-bold bg-gradient-to-r from-[#FBAF1A] to-[#BF7408] text-[#0B0F1A] hover:brightness-110 transition-all duration-200 shadow-lg shadow-[#FBAF1A]/20"
            >
              <BarChart3 className="w-5 h-5" />
              Operator Portal
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => router.push('/driver-portal')}
              className="group w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-5 rounded-2xl text-lg font-bold border-2 border-white/20 text-white hover:border-white/40 hover:bg-white/5 transition-all duration-200"
            >
              <Mic className="w-5 h-5 text-pink-400" />
              Driver Portal
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FleetShieldLogo size={28} />
            <span className="text-sm font-semibold text-white/40">
              <span className="text-white/60">Fleet</span><span className="text-[#FBAF1A]/60">Shield</span>
            </span>
          </div>
          <div className="text-xs text-white/20">
            Built with Geotab Telematics &middot; Geotab Vibe Coding Hackathon 2026
          </div>
        </div>
      </footer>
    </div>
  );
}
