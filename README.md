# FleetShield AI

### Predictive Fleet Safety & Insurance Intelligence Platform

> **Geotab Vibe Coding Hackathon 2026** | Powered by Geotab Telematics + Claude Opus 4.6 + Real-Time Voice AI

---

## The Problem We're Solving

The North American trucking industry moves **$940 billion** in freight annually — and loses **$38 billion** to preventable accidents, insurance overcharges, driver turnover, and operational inefficiency. The data to prevent all of this already exists in **Geotab telematics devices** installed in millions of vehicles. But fleet operators are drowning in raw data with no way to translate it into:

| Pain Point | Scale | Cost |
|------------|-------|------|
| **Preventable accidents** | 500,000+ large truck crashes/year (FMCSA) | $91,000 avg per incident |
| **Insurance premium overcharges** | Underwriters can't see behavioral improvements | 18-32% overpayment |
| **Driver turnover** | 87% annual rate (ATA) | $35,000+ per replacement |
| **Driver health crisis** | Life expectancy 61 years (16 below avg) | 25% report chronic loneliness |
| **Carbon emissions** | 444M metric tons CO2/year from trucking | $521K/fleet in avoidable fuel |

**FleetShield AI** is the intelligence layer that transforms raw Geotab telematics into **money saved**, **lives protected**, and a **planet preserved** — with two AI assistants, autonomous mission agents, and real phone calls to dispatch.

---

## What Makes FleetShield AI Different

### 1. AI Employees, Not Chatbots
Traditional fleet AI answers questions. FleetShield's **Mission Agents** do work. Say *"Run a wellness check across my fleet"* — an autonomous agent analyzes every driver's telematics, crunches 9 scoring engines, and delivers a comprehensive report with findings, root causes, dollar impact, and an action plan. The operator keeps working. The agent does the analyst's job in minutes instead of hours.

### 2. Real Phone Calls to Dispatch
When a driver says *"I'm stuck in snow, call dispatch"*, Tasha doesn't simulate a response — she places a **real phone call** via Twilio, has a multi-turn AI-mediated conversation with a human dispatcher using speech-to-text and text-to-speech, and relays the outcome back to the driver. This is a working, end-to-end voice AI ↔ telephony bridge.

### 3. Dual AI Assistants with Voice
**Tasha** (operator-facing) and the driver voice AI each have specialized tool sets, voice pipelines, and personas. Operators get analytical, dollar-quantified insights. Drivers get warm, encouraging coaching through a hands-free voice-first interface designed for truck-mounted tablets.

### 4. Proactive Driver Wellness
While competitors use invasive dashcam fatigue detection that drivers hate, FleetShield uses **privacy-respecting wellness check-ins** and **HOS compliance gauges** — giving drivers agency over their own wellbeing and real-time visibility into their remaining drive hours.

### 5. Dual Geotab API Integration
Uses **both** MyGeotab API (vehicles, trips, diagnostics, GPS, safety events via JSON-RPC) **and** Geotab Ace API (conversational AI queries about fleet data) — the required dual-API integration for the hackathon.

### 6. Quantified ROI for Every Recommendation
Every insight comes with dollar-quantified projections. Not "you should reduce speeding" but "reducing speeding by 15% would save $23,400/year in insurance premiums and prevent an estimated 2.3 incidents."

---

## Platform Overview — 8 Core Pillars

| # | Pillar | What It Does |
|---|--------|--------------|
| 1 | **Insurance Premium Optimization** | AI-driven fleet scoring (0-100, A-F grade) with component breakdown, what-if simulator, and savings projections |
| 2 | **Predictive Safety Analytics** | Pre-shift risk scoring, driver deterioration detection, dangerous corridor mapping, 7-day forecasting |
| 3 | **Smart Incident Prevention** | AI alert triage with urgency scoring (0-100), pattern detection, and prioritized interventions |
| 4 | **Autonomous Mission Agents** | 5 mission types that run in the background — coaching sweeps, wellness checks, safety investigations, insurance optimization, pre-shift sweeps |
| 5 | **Operator AI Assistant (Tasha)** | Full-screen voice + text assistant with 17 specialized tools, mission deployment, and rich visual reports |
| 6 | **Driver Voice AI Portal** | Personal dashboard with voice AI, real Twilio dispatch calls, HOS compliance, wellness check-ins, load management, and gamification |
| 7 | **Live Fleet Map** | Real-time vehicle tracking with risk-colored markers, speeding hotspot overlay, and GPS trails |
| 8 | **ROI & Sustainability** | Before/after comparisons, dollar-quantified savings, retention risk, green fleet scoring, EV readiness analysis |

---

## Competitive Landscape — How We Compare to Top YC & Industry Players

The fleet management and logistics space has attracted billions in venture funding. Here's how FleetShield AI differentiates from the top YC-backed companies and industry leaders:

### Comparison Matrix

| Company | YC Batch | Focus | What They Do | What FleetShield Does Differently |
|---------|----------|-------|-------------|----------------------------------|
| **[Samsara](https://www.samsara.com)** | — | Fleet hardware + software | AI dashcams, GPS tracking, ELD, driver monitoring via computer vision. Hardware-first ($35-50/vehicle/month). Surveillance-heavy — cameras watch drivers. | **Software-only, no hardware cost.** Works with existing Geotab telematics. Privacy-respecting wellness (mood check-ins, not cameras). Drivers coached, not surveilled. |
| **[Motive](https://gomotive.com)** (KeepTruckin) | — | ELD + fleet management | ELD compliance, dashcams with collision alerts, fuel management. 120K+ companies. Uses invasive dashcam fatigue detection. | **Proactive AI prevention vs reactive camera alerts.** Predictive safety forecasts risk *before* shifts. AI wellness check-ins replace invasive dashcam monitoring. Voice-first UX for drivers. |
| **[Flexport](https://www.flexport.com)** | W14 | Global supply chain | Full-service logistics platform for freight forwarding. AI-powered "Flexport Intelligence" for supply chain queries. Global trade focus. | **Trucking fleet-specific, not global freight.** Deep telematics intelligence (9 scoring engines) vs supply chain visibility. Quantified insurance ROI, not just shipment tracking. |
| **[FleetWorks](https://www.fleetworks.ai)** | S23 | AI freight marketplace | AI agents match trucks to cargo, replacing phone calls and emails. $17M raised. Broker-to-carrier marketplace. | **Fleet operator tool, not marketplace.** We optimize the fleet *internally* (safety, insurance, coaching) vs matching external loads. Our AI calls real dispatchers, not brokers. |
| **[Palace](https://www.palace.so)** | — | Dispatch automation | AI-native planning and dispatch. Automates load assignment, scheduling, driver communication. Back-office efficiency. | **Safety + insurance intelligence, not just dispatch.** Palace optimizes operations; we optimize *safety outcomes* and quantify the dollar impact. Mission agents do analyst work, not scheduling. |
| **[Lanesurf](https://www.lanesurf.com)** | S25 | Voice AI for freight | Voice AI negotiates rates with carriers across 96+ parallel calls. Built for freight brokers. Self-improving voice stack. | **Voice AI for drivers and operators, not brokers.** Our voice pipeline serves the people *in* the truck (hands-free safety coaching, dispatch calls) not the people booking loads. Twilio Media Streams for real phone calls. |
| **[Terminal](https://www.withterminal.com)** | S23 | Telematics API | "Plaid for telematics" — universal API to access GPS, speeding, vehicle stats across ELD providers. Infrastructure layer. | **Intelligence layer, not infrastructure.** Terminal normalizes data; we *analyze* it. 9 scoring engines, predictive safety, AI missions, and voice AI built on top of telematics data (Geotab). |
| **[Carma](https://www.joincarma.com)** | W24 | Fleet maintenance | Marketplace for commercial fleet repairs. Same-day service from vetted centers. Transparent pricing. | **Prevention over repair.** Carma fixes vehicles after problems; we predict and prevent incidents before they happen. Our wellness and safety scores identify risks upstream. |
| **[Fleetline](https://www.ycombinator.com/companies/fleetline)** | — | Load planning | Algorithmic load planner for mid-large trucking fleets. LLM-powered optimization for routing and scheduling. | **Safety and insurance ROI, not load optimization.** Fleetline maximizes revenue-per-mile; we maximize safety-per-driver and minimize insurance cost. Complementary, not competing. |

### The Gap We Fill

```
                    OPERATIONS                          SAFETY & INSURANCE
                    ──────────                          ──────────────────

    Palace ──── Dispatch automation          FleetShield AI ──── Predictive safety
    Fleetline ── Load planning                                    Insurance optimization
    FleetWorks ─ Marketplace matching                             Driver wellness & HOS
                                                                  AI mission agents
    BROKER SIDE                                                   Voice-first coaching
    ───────────                              HARDWARE-FIRST       Real dispatch calls
    Lanesurf ─── Rate negotiation            ──────────────       Quantified ROI
    Flexport ─── Supply chain               Samsara ─── Dashcams
                                            Motive ──── ELD + cameras
    INFRASTRUCTURE
    ──────────────
    Terminal ─── Data normalization
    Carma ────── Maintenance
```

**No one in the YC ecosystem or industry combines all of these in one platform:**
1. **Predictive safety analytics** with 9 scoring engines and 7-day forecasting
2. **Quantified insurance ROI** — every recommendation has a dollar figure
3. **Autonomous AI mission agents** that do analyst work in the background
4. **Real phone calls to dispatch** via Twilio Media Streams (not simulated)
5. **Voice-first driver wellness** — proactive, privacy-respecting, not surveillance
6. **Dual Geotab API integration** — both MyGeotab telematics AND Ace conversational analytics
7. **Driver + Operator dual portals** with specialized AI assistants for each role

The closest competitors (Samsara, Motive) are **hardware-first** — they sell cameras and ELD devices. FleetShield is **intelligence-first** — we turn existing Geotab telematics into actionable safety insights, insurance savings, and an AI workforce that replaces manual analyst work.

---

## Technical Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          FRONTEND                                     │
│               Next.js 16 + React 19 + Tailwind CSS 4                  │
│            Framer Motion + Recharts + Leaflet (CDN)                   │
│                        Port 3001                                      │
│                                                                       │
│  ┌───────────────────┐  ┌────────────────────┐  ┌────────────────┐  │
│  │  Operator Portal   │  │  Driver Portal      │  │  Landing Page  │  │
│  │  ┌─ Dashboard      │  │  ┌─ Home (HOS,      │  │  Animated hero │  │
│  │  ├─ Tasha AI (17   │  │  │  Score, Wellness) │  │  + CTA         │  │
│  │  │  tools + voice)  │  │  ├─ Training        │  │                │  │
│  │  ├─ Missions        │  │  ├─ Voice AI        │  │                │  │
│  │  ├─ Predictive      │  │  ├─ Load + Dispatch │  │                │  │
│  │  ├─ Alerts          │  │  └─ Leaderboard     │  │                │  │
│  │  ├─ Insurance       │  │                      │  │                │  │
│  │  ├─ Live Map        │  │  Floating Mic Button │  │                │  │
│  │  ├─ ROI + What-If   │  │  on all tabs         │  │                │  │
│  │  ├─ Sustainability  │  │                      │  │                │  │
│  │  ├─ Wellness        │  │                      │  │                │  │
│  │  ├─ Drivers         │  │                      │  │                │  │
│  │  ├─ Vehicles        │  │                      │  │                │  │
│  │  ├─ Safety Events   │  │                      │  │                │  │
│  │  └─ Reports (PDF)   │  │                      │  │                │  │
│  └───────────────────┘  └────────────────────┘  └────────────────┘  │
├──────────────────────────────────────────────────────────────────────┤
│                    API Proxy Layer (next.config.ts)                    │
│                    Rewrites /api/* → localhost:3000                    │
├──────────────────────────────────────────────────────────────────────┤
│                           BACKEND                                     │
│             Express 4.21 + WebSocket (ws 8.18)                        │
│           TypeScript 5.7 + Vercel AI SDK 4.3                          │
│                        Port 3000                                      │
│                                                                       │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────────┐  │
│  │  AI Agent   │ │  Missions  │ │   Voice    │ │   REST APIs      │  │
│  │  17 Tools   │ │  5 Types   │ │  Pipeline  │ │   50+ Endpoints  │  │
│  │  Claude     │ │  Autonomous│ │  STT/TTS   │ │   SSE Streaming  │  │
│  │  Opus 4.6   │ │  Execution │ │  VAD       │ │   WebSocket      │  │
│  └────────────┘ └────────────┘ └────────────┘ └──────────────────┘  │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │              Twilio AI Dispatch Service                         │  │
│  │   Real phone calls via Media Streams (mulaw 8kHz WebSocket)    │  │
│  │   AI-mediated multi-turn conversations with human dispatchers  │  │
│  └────────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────┤
│                        AI / ML Layer                                  │
│  ┌──────────────────────┐  ┌──────────────────────────────────────┐  │
│  │  Claude Opus 4.6      │  │  Smallest AI Voice                  │  │
│  │  (Vercel AI SDK)      │  │  Pulse STT + Waves TTS              │  │
│  │  Agent reasoning,     │  │  WebSocket streaming pipeline       │  │
│  │  tool orchestration,  │  │  Energy-based VAD                   │  │
│  │  mission summaries    │  │  Sentence-level TTS streaming       │  │
│  └──────────────────────┘  └──────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────┤
│                   Scoring Engines (9 Pure Functions)                   │
│  Driver Risk │ Insurance │ Wellness │ Predictive │ Alert Triage       │
│  ROI │ What-If │ Gamification │ Green Score                           │
├──────────────────────────────────────────────────────────────────────┤
│                    Data & Integration Layer                            │
│  ┌──────────────────────┐  ┌──────────────────────────────────────┐  │
│  │  Geotab APIs          │  │  Seed Data Engine                    │  │
│  │  MyGeotab (JSON-RPC)  │  │  30 drivers, 25 vehicles             │  │
│  │  Ace (Conversational) │  │  1000+ safety events, 90 days        │  │
│  │  Real-time telemetry  │  │  Realistic fleet simulation          │  │
│  └──────────────────────┘  └──────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Technical Deep Dives

### Real Twilio Dispatch Calls — AI Voice ↔ Telephony Bridge

The most technically ambitious feature. When a driver says "call dispatch", Tasha places a **real outbound phone call** via Twilio, has a multi-turn AI-mediated conversation with a human dispatcher, and relays the results back.

**User Flow:**
```
Driver (in-app voice): "I'm stuck in snow at Highway 401, call dispatch"
  → Tasha: "I'll call dispatch right now."
  → Backend initiates Twilio outbound call to real phone number
  → Dispatcher's phone rings → they pick up
  → Dispatcher hears Tasha's voice: "Hi, this is Tasha from FleetShield..."
  → Real human conversation (3-4 exchanges, multi-turn)
  → Call wraps up → AI generates summary
  → Tasha returns to driver: "I spoke with dispatch. They're sending help in 30 minutes."
  → Summary saved to driver's message feed
```

**Audio Pipeline (the hard part):**
```
Dispatcher's Phone (real human speaking)
        ↕ Twilio Media Streams (mulaw 8kHz, 20ms packets via WebSocket)
        ↕
┌─── Backend /twilio-media WebSocket ────────────────────────────────┐
│                                                                     │
│  INBOUND (Dispatcher → Tasha):                                     │
│  1. mulaw base64 → Buffer.from(base64) → mulawToLinear16()         │
│  2. PCM 8kHz → resample() → PCM 16kHz                             │
│  3. Energy-based VAD (RMS threshold 50) → voiced/silent detection  │
│  4. Buffer voiced chunks → silence timer (1.2s) → batch process    │
│  5. PulseSTTPipeline (fresh WebSocket per utterance)               │
│     - Paced audio sending (8ms delay every 3 chunks)               │
│     - Post-send wait (800-2500ms) before endUtterance              │
│     - Retry logic on empty result with slower pacing               │
│  6. Transcribed text → Claude AI (dispatch system prompt)          │
│                                                                     │
│  OUTBOUND (Tasha → Dispatcher):                                    │
│  1. Claude generates response (1-2 sentences, phone cadence)       │
│  2. synthesizeSpeech() → PCM 24kHz via Smallest AI Waves TTS      │
│  3. resample(24kHz → 8kHz) → linear16ToMulaw() → base64           │
│  4. Send as Twilio media events (160 bytes = 20ms chunks)          │
│  5. Wait for playback duration + 300ms network latency             │
│  6. Clear echo buffer → resume listening                           │
│                                                                     │
│  STATE MACHINE:                                                     │
│  initiating → ringing → greeting → on_call → wrapping_up → complete│
│  Max 2-minute call duration, idempotent endCall() guard            │
│  Summary generation via Claude, fallback to simple summary         │
│  Result saved to driver messages, relayed via dispatch bridge      │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Technical Challenges Solved:**
- **Silence detection in continuous audio**: Twilio sends packets every 20ms even during silence. We only reset the silence timer on voiced packets (energy > threshold), letting it expire during actual silence.
- **Batch STT with pacing**: Audio accumulated during speech is batch-sent to Pulse STT with deliberate pacing (8ms delay every 3 chunks) to prevent burst-sending that causes empty transcripts on short utterances.
- **STT retry logic**: If STT returns empty despite significant voiced audio (>20 chunks), the system retries with slower pacing (15ms every 2 chunks) before giving up.
- **Echo prevention**: TTS playback clears the audio buffer and pauses listening. After playback completes (duration + 300ms network latency), echo buffer is cleared before resuming.
- **Idempotent state management**: Multiple events can trigger endCall() (WebSocket close, Twilio webhook, timeout). A `callEnded` boolean guard prevents double processing.
- **Graceful fallback**: When Twilio credentials aren't configured, dispatch calls fall back to AI-simulated conversations — same UI, same user experience.

---

### Voice AI Pipeline — Dual-Client Architecture

Two voice clients (operator + driver) share the same backend pipeline but with different AI personas and tool sets.

```
Browser Microphone
  → AudioContext (16kHz mono PCM16)
  → Energy-based VAD (configurable threshold)
  → Binary PCM16 chunks via WebSocket
  → Backend VoiceSession
      → PulseSTTPipeline (Smallest AI, per-utterance WebSocket)
      → Transcribed text
      → Claude AI Agent (17 tools, role-aware system prompt)
      → Tool calls → scoring engines → formatted responses
      → TTSSentencePipeline (sentence-level streaming)
      → Smallest AI Waves TTS (24kHz PCM)
      → Base64 audio chunks via WebSocket
  → Browser AudioContext (24kHz) → Speaker
```

**Key Features:**
- **Sentence-level TTS streaming**: Response is split into sentences, each synthesized independently for low-latency first-word playback
- **Barge-in support**: Driver can interrupt during TTS playback; system discards remaining audio and starts listening
- **Filler audio cache**: Pre-generated filler sounds play during AI processing to mask latency
- **Generation-counter TTS mutex**: Prevents overlapping audio when rapid responses arrive
- **Dispatch delegation bridge**: EventEmitter-based per-session registry connecting tool execution to WebSocket for dispatch call progress streaming
- **Mute/unmute and End Voice**: Full call control for both voice modes

---

### Autonomous Mission Agent System

Not chatbots — autonomous AI workers that take assignments, execute multi-step analyses, and deliver comprehensive reports.

```
Operator: "Run a coaching sweep on my riskiest drivers"
  → Tasha confirms and deploys mission agent
  → Mission runs autonomously in background

┌─── mission-runner.ts (pure TypeScript) ─────────────────────────────┐
│                                                                      │
│  1. Select top-risk drivers via driver-risk-engine.ts                │
│  2. For each driver:                                                 │
│     - Calculate risk score (driver-risk-engine.ts)                   │
│     - Assess wellness/burnout (wellness-predictor.ts)                │
│     - Analyze safety events (alert-triage.ts)                        │
│     - Generate coaching plan (coaching recommender)                  │
│     - Calculate financial impact (roi-engine.ts)                     │
│  3. Emit progress via EventEmitter bridge → SSE/WebSocket            │
│     "Analyzing driver 3 of 5: Marcus Rivera..."                      │
│  4. Collect all findings into structured report                      │
│  5. ONE Claude Opus 4.6 call for executive summary                   │
│  6. Store result in global mission store                             │
│  7. Notify all clients (bell icon, toast, TTS)                      │
│  8. Sync action items to affected drivers (mission-to-driver sync)  │
│                                                                      │
│  KEY: Scoring engines called DIRECTLY (no LLM sub-agents).           │
│  Fast, deterministic, cheap. Only the summary uses AI.               │
└──────────────────────────────────────────────────────────────────────┘
```

**5 Mission Types:**

| Mission | What It Does | Analyst Equivalent |
|---------|-------------|-------------------|
| **Coaching Sweep** | Analyzes riskiest drivers, builds individualized coaching plans with timelines, interventions, dollar impact | 4-6 hours |
| **Wellness Check** | Scans every driver for burnout risk, fatigue patterns, retention flags | 3-4 hours |
| **Safety Investigation** | Deep-dives safety events, identifies patterns, correlates with wellness | 2-3 hours |
| **Insurance Optimization** | Analyzes score components, finds quick wins, estimates premium savings | 4-5 hours |
| **Pre-Shift Sweep** | Real-time risk assessment for all drivers before shifts | 1-2 hours |

**Mission-to-Driver Sync:**
```
Operator runs coaching sweep → per-driver coaching plans generated
  → syncMissionToDrivers() creates action items with category, priority, missionId
  → Driver portal polls /api/driver/:id/actions every 30 seconds
  → Training tab shows notification badge when new programs arrive
  → Driver marks coaching steps as complete → gamification points awarded
```

---

### 9 Scoring Engines — Pure Functions, No Side Effects

All scoring engines are pure functions that take typed parameters and return typed results. No side effects, no external state mutation, no API calls. They're called from routes, tools, AND missions — making the system modular and testable.

| Engine | Input | Output | Weight/Method |
|--------|-------|--------|---------------|
| **Driver Risk** (0-100) | driverId | RiskScore + breakdown | Safety Events 40%, Driving Behavior 25%, Compliance 20%, Wellness 15% |
| **Insurance Score** (0-100, A-F) | fleet-wide | InsuranceScore + components | Claims 35%, Fleet Behavior 30%, Compliance 20%, Maintenance 15% |
| **Wellness Predictor** | driverId | BurnoutRisk + signals | Hours, rest, night driving, consecutive days, event trends, deviations |
| **Predictive Safety** | driverId/fleet | PreShiftRisk + forecast | Recent events, fatigue, trends, weather, route factors |
| **Alert Triage** (0-100) | events | UrgencyScored alerts | Severity, recency, patterns, driver context, suggested actions |
| **ROI Engine** | fleet-wide | DollarSavings × 5 categories | Insurance, accidents, fuel, retention, productivity |
| **What-If Simulator** | scenarios | ProjectedScores | Scenario modeling for insurance score improvements |
| **Gamification** | driverId | Badges + points + level | Safety streaks, achievements, leaderboard ranking |
| **Green Score** (A-F) | fleet/driver | Sustainability metrics | Fuel efficiency, idle reduction, eco-driving, fleet modernity |

---

### Geotab Dual-API Integration

**MyGeotab API** (`my.geotab.com` — JSON-RPC):
- `DeviceStatusInfo` → Real-time vehicle positions, speed, bearing for live map
- `ExceptionEvent` → Safety rule violations (speeding, harsh braking, HOS)
- `Trip` → Daily driving summaries with distance, duration, idling metrics
- `Device` → Vehicle information, assignments, maintenance data
- `User` → Driver information linked to devices
- Authentication with session management and automatic re-auth

**Geotab Ace API** (Conversational Analytics):
- 3-step pattern: `createChat` → `sendPrompt` → `pollResult`
- Natural language fleet queries: "How many vehicles exceeded speed limits?"
- Exposed as both standalone widget AND as an AI tool for Tasha
- Exponential backoff polling with 30-second timeout

**Data Provider Abstraction** (`fleet-data-provider.ts`):
- Unified interface for both Geotab and seed data sources
- Automatic fallback to seed data when credentials aren't configured
- Seed data: 30 drivers, 25 vehicles, 1000+ events, 90 days of telemetry

---

## Features — Complete List

### Landing Page (`/`)
- Animated hero with platform value proposition
- Feature highlights with scroll navigation
- Entry points to Operator and Driver portals

### Operator Portal (`/operator`)

| Page | Route | Key Features |
|------|-------|-------------|
| **Dashboard** | `/operator` | Fleet KPIs, insurance score card (A-F), driver risk rankings, real-time event feed |
| **Tasha AI Assistant** | `/operator/assistant` | Full-screen chat + voice, 17 tools, mission deployment, rich visual reports, cross-page notifications |
| **Predictive Safety** | `/operator/predictive` | 7-day forecast, pre-shift risk grid, driver deterioration trends, dangerous corridors |
| **Alert Triage** | `/operator/alerts` | AI-prioritized daily briefing, urgency-scored cards (0-100), pattern detection, suggested actions |
| **Insurance** | `/operator/insurance` | Score breakdown by component, improvement opportunities, historical trends, peer benchmarks |
| **Live Fleet Map** | `/operator/map` | Real-time Leaflet map, risk-colored markers, vehicle search, speeding hotspot overlay, GPS trails |
| **ROI Dashboard** | `/operator/roi` | Animated savings counter, 5-category breakdown, before/after comparison, what-if simulator, retention risk |
| **Sustainability** | `/operator/sustainability` | Green fleet scoring, fuel efficiency, carbon footprint, EV readiness analysis |
| **Wellness Monitor** | `/operator/wellness` | Fleet-wide burnout risk, individual driver wellness, shift patterns, trend visualization |
| **Driver Management** | `/operator/drivers` | Driver list with risk/wellness, individual detail pages, performance history |
| **Vehicle Fleet** | `/operator/vehicles` | Vehicle inventory, maintenance tracking, utilization metrics |
| **Safety Events** | `/operator/safety` | Event log with filters, type breakdown, severity analysis, temporal patterns |
| **Reports** | `/operator/reports` | PDF report generation for insurance documentation |

### Driver Voice AI Portal (`/driver-portal`)

Tab-based mobile-first layout designed for truck-mounted tablets with 5 tabs and a floating mic button.

| Tab | Features |
|-----|----------|
| **Home** | Safety score gauge, HOS compliance gauges (drive/duty time remaining, color-coded green/amber/red), AI wellness check-in ("How are you feeling?" mood selector with weekly trend), pre-shift briefing, daily challenge, quick stats |
| **Training** | Coaching programs from operator missions (expandable with checkboxes), action items with category badges and priority dots, notification badge when new programs arrive |
| **Voice** (center, larger) | Full-screen animated orb (green=listening, amber=thinking, blue=speaking, gold=dispatching), real-time transcript, quick action buttons, mute/unmute, end voice, text input fallback |
| **Load** | Load card (origin→destination, commodity, weight, rate), broker info, quick dispatch buttons, **"Call Dispatch" → real Twilio phone call**, live call overlay with transcript, call summary saved to messages |
| **Rank** | Driver leaderboard with current driver highlighted, badge gallery (earned/locked), level progress bar |

**Floating Mic Button**: Always-visible amber button on all tabs except Voice — tap to switch to Voice tab and start listening.

---

## AI Agent Tools (17 Total)

The FleetShield AI assistant (Tasha) has access to 17 specialized tools, each backed by a scoring engine or data provider:

| Tool | What It Does | Backing Engine |
|------|-------------|---------------|
| `fleet_overview` | Fleet-wide KPIs, event counts, risk distribution | Aggregated seed/Geotab data |
| `driver_risk_scorer` | Individual driver risk score (0-100) with breakdown | driver-risk-engine.ts |
| `driver_intelligence` | Deep driver analysis: history, patterns, trends | driver-risk-engine.ts + events |
| `fleet_insurance_score` | Fleet insurance score (A-F) with component breakdown | insurance-score-engine.ts |
| `safety_events` | Query events with filters (type, driver, date, severity) | Filtered event data |
| `driver_wellness` | Burnout/fatigue risk assessment with signals | wellness-predictor.ts |
| `coaching_recommender` | Personalized coaching plan with timeline, interventions | coaching + risk engines |
| `financial_impact` | Dollar-quantified impact of events and interventions | roi-engine.ts |
| `fleet_comparison` | Compare drivers, vehicles, or time periods | Cross-engine comparison |
| `insurance_report` | Generate insurance documentation (PDF via PDFKit) | insurance-score-engine.ts |
| `driver_dashboard` | Driver portal data (score, load, briefing, actions) | driver-session.ts |
| `ace_analytics` | Geotab Ace natural language fleet queries | geotab-ace.ts |
| `predictive_safety` | Pre-shift risk, deterioration trends, forecasting | predictive-safety.ts |
| `alert_triage` | Urgency-scored alert prioritization | alert-triage.ts |
| `context_report` | Contextual analysis reports for specific scenarios | Multi-engine synthesis |
| `sustainability` | Green fleet metrics, carbon footprint, EV readiness | green-score-engine.ts |
| `deployMission` | Deploy autonomous background mission agents | mission-runner.ts |

---

## API Reference

### Fleet Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check + Geotab config status |
| GET | `/api/fleet/overview` | Fleet KPIs and summary metrics |
| GET | `/api/fleet/drivers` | All drivers with risk scores |
| GET | `/api/fleet/drivers/:id` | Individual driver detail |
| GET | `/api/fleet/vehicles` | Vehicle fleet inventory |
| GET | `/api/fleet/events` | Safety events (filterable) |
| GET | `/api/fleet/score` | Fleet insurance score |
| GET | `/api/fleet/risks` | All driver risk scores |
| GET | `/api/fleet/wellness` | Wellness summary |
| GET | `/api/fleet/wellness-all` | All driver wellness results |

### Predictive Safety
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/fleet/predictive/forecast` | 7-day fleet forecast |
| GET | `/api/fleet/predictive/pre-shift` | All pre-shift risk scores |
| GET | `/api/fleet/predictive/pre-shift/:id` | Individual pre-shift risk |
| GET | `/api/fleet/predictive/trends` | Driver deterioration trends |
| GET | `/api/fleet/predictive/corridors` | Dangerous corridors |

### Alert Triage
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/fleet/alerts` | Triaged alerts (with limit param) |
| GET | `/api/fleet/alerts/briefing` | Daily alert briefing |

### Live Map
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/fleet/map/live` | Live vehicle positions |
| GET | `/api/fleet/map/trail/:vehicleId` | GPS trail for vehicle |
| GET | `/api/fleet/map/hotspots` | Speeding hotspot zones |

### ROI & What-If
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/fleet/roi` | Fleet ROI calculations |
| GET | `/api/fleet/roi/before-after` | Before/after comparison |
| GET | `/api/fleet/roi/retention` | Retention savings analysis |
| GET | `/api/fleet/what-if/defaults` | Default what-if scenarios |
| POST | `/api/fleet/what-if` | Simulate custom scenarios |

### Missions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/missions/active` | All active/completed missions |
| GET | `/api/missions/:id` | Specific mission result |

### Driver Portal
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/driver/login` | Driver PIN authentication |
| GET | `/api/driver/:id/dashboard` | Dashboard (score, briefing, HOS, load, gamification) |
| GET | `/api/driver/:id/load` | Current load assignment |
| PUT | `/api/driver/:id/load/status` | Update load status |
| GET | `/api/driver/:id/messages` | Driver messages |
| GET | `/api/driver/:id/actions` | Action items (category, priority) |
| PUT | `/api/driver/:id/actions/:actionId` | Update action item status |
| GET | `/api/driver/:id/training` | Training programs from missions |
| GET | `/api/driver/:id/hos` | HOS compliance status |
| POST | `/api/driver/:id/wellness-checkin` | Submit wellness mood |
| GET | `/api/driver/:id/wellness-trend` | Wellness trend history |
| GET | `/api/driver/leaderboard` | Driver rankings |
| POST | `/api/driver/:id/dispatch-call` | Initiate dispatch call (Twilio or simulated) |
| GET | `/api/driver/:id/dispatch-call/:callId/status` | Poll Twilio call status |

### Twilio Webhooks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/twilio/call-status` | Call status webhook |
| WS | `/twilio-media` | Media Streams WebSocket (mulaw audio) |

### AI & Voice
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/assistant/stream` | SSE streaming AI assistant |
| POST | `/api/chat` | Single-turn AI chat |
| POST | `/api/tts/synthesize` | Text-to-speech synthesis |
| WS | `/ws` | Voice AI WebSocket (operator + driver) |

---

## Tech Stack

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 22+ | Runtime |
| Express | 4.21 | HTTP server + REST APIs |
| ws | 8.18 | WebSocket (voice, missions, Twilio media) |
| TypeScript | 5.7 | Type safety (ESM modules) |
| Vercel AI SDK | 4.3 | Claude AI agent integration |
| @ai-sdk/anthropic | 1.2 | Anthropic model provider |
| Twilio | 5.12 | Outbound phone calls + Media Streams |
| PDFKit | 0.16 | PDF report generation |
| tsx | 4.19 | Development runtime |

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 16.1 | React framework (App Router) |
| React | 19.2 | UI library |
| Tailwind CSS | 4.0 | Utility-first styling |
| Framer Motion | 12.34 | Animations and transitions |
| Recharts | 3.7 | Charts and data visualization |
| Lucide React | 0.574 | Icon library |
| Leaflet | 1.9 | Maps (CDN loaded to avoid SSR issues) |

### AI & Voice
| Technology | Purpose |
|-----------|---------|
| Claude Opus 4.6 | AI agent reasoning, tool orchestration, mission summaries, dispatch conversations |
| Smallest AI Pulse | Speech-to-Text (STT) via WebSocket streaming |
| Smallest AI Waves | Text-to-Speech (TTS) with sentence-level streaming |
| Custom VAD | Energy-based Voice Activity Detection for voice input |
| Twilio Media Streams | Real phone calls with mulaw 8kHz audio over WebSocket |

### Geotab APIs
| API | Purpose |
|-----|---------|
| MyGeotab API | Vehicles, trips, diagnostics, GPS, safety events via JSON-RPC |
| Geotab Ace API | Conversational AI queries about fleet data |

---

## Project Structure

```
fleetshield-ai/
├── backend/
│   ├── src/
│   │   ├── index.ts                          # Main server: 50+ routes, WebSocket, SSE
│   │   ├── agents/
│   │   │   └── fleetshield-agent.ts          # Claude AI agent: system prompt + 17 tools
│   │   ├── data/
│   │   │   ├── seed-data.ts                  # 30 drivers, 25 vehicles, 1000+ events
│   │   │   ├── driver-session.ts             # Driver state, action items, HOS, wellness
│   │   │   ├── dispatcher-ai.ts              # AI dispatcher simulation (fallback)
│   │   │   └── fleet-data-provider.ts        # Geotab ↔ seed data abstraction
│   │   ├── missions/
│   │   │   ├── mission-types.ts              # 5 mission type definitions + metadata
│   │   │   ├── mission-bridge.ts             # EventEmitter bridge + global store + driver sync
│   │   │   ├── mission-runner.ts             # Mission execution (calls scoring engines)
│   │   │   └── index.ts                      # Barrel exports
│   │   ├── scoring/                          # 9 pure-function scoring engines
│   │   │   ├── driver-risk-engine.ts         # Driver risk (0-100)
│   │   │   ├── insurance-score-engine.ts     # Fleet insurance (A-F)
│   │   │   ├── wellness-predictor.ts         # Burnout/fatigue detection
│   │   │   ├── predictive-safety.ts          # Pre-shift risk + forecasting
│   │   │   ├── alert-triage.ts               # Event clustering + urgency scoring
│   │   │   ├── roi-engine.ts                 # ROI calculations
│   │   │   ├── what-if-simulator.ts          # Insurance scenario modeling
│   │   │   ├── gamification-engine.ts        # Points, badges, levels
│   │   │   └── green-score-engine.ts         # Sustainability metrics
│   │   ├── services/
│   │   │   ├── geotab-auth.ts                # Geotab API authentication
│   │   │   ├── geotab-core.ts                # Core MyGeotab API calls
│   │   │   ├── geotab-ace.ts                 # Ace Analytics integration
│   │   │   ├── geotab-data-connector.ts      # Data connector layer
│   │   │   ├── live-fleet.ts                 # GPS simulation service
│   │   │   ├── twilio-ai-dispatch.ts         # Twilio Media Streams dispatch (core)
│   │   │   └── twilio-dispatch-service.ts    # Dispatch service wrapper
│   │   ├── tools/                            # 17 Claude agent tools
│   │   │   ├── index.ts                      # Tool registry
│   │   │   ├── fleet-overview.ts
│   │   │   ├── driver-risk-scorer.ts
│   │   │   ├── driver-intelligence.ts
│   │   │   ├── fleet-insurance-score.ts
│   │   │   ├── safety-events.ts
│   │   │   ├── driver-wellness.ts
│   │   │   ├── coaching-recommender.ts
│   │   │   ├── financial-impact.ts
│   │   │   ├── fleet-comparison.ts
│   │   │   ├── insurance-report.ts
│   │   │   ├── driver-dashboard.ts
│   │   │   ├── ace-analytics.ts
│   │   │   ├── predictive-safety.ts
│   │   │   ├── alert-triage.ts
│   │   │   ├── context-report.ts
│   │   │   ├── sustainability.ts
│   │   │   └── mission-tool.ts
│   │   └── voice/
│   │       ├── voice-session.ts              # Voice session orchestrator
│   │       ├── stt-pipeline.ts               # Pulse STT (per-utterance WebSocket)
│   │       ├── tts-pipeline.ts               # Sentence-level TTS streaming
│   │       ├── tts-synthesize.ts             # Waves TTS synthesis
│   │       ├── audio-convert.ts              # mulaw ↔ PCM, resampling
│   │       ├── action-extractor.ts           # Voice command parsing
│   │       ├── dispatch-bridge.ts            # Dispatch delegation EventEmitter
│   │       └── filler-cache.ts               # Latency-masking filler audio
│   ├── addin/
│   │   ├── addin.html                        # MyGeotab add-in UI
│   │   └── config.json                       # Geotab add-in manifest
│   └── public/
│       ├── index.html                        # Standalone dashboard
│       └── styles.css
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                      # Landing page
│   │   │   ├── layout.tsx                    # Root layout
│   │   │   ├── globals.css                   # Global styles
│   │   │   ├── driver-portal/page.tsx        # Driver portal orchestrator
│   │   │   └── operator/                     # 13 operator pages
│   │   │       ├── page.tsx                  # Dashboard
│   │   │       ├── assistant/page.tsx        # Tasha AI (full-screen)
│   │   │       ├── alerts/page.tsx
│   │   │       ├── drivers/page.tsx
│   │   │       ├── drivers/[id]/page.tsx
│   │   │       ├── insurance/page.tsx
│   │   │       ├── map/page.tsx
│   │   │       ├── predictive/page.tsx
│   │   │       ├── reports/page.tsx
│   │   │       ├── roi/page.tsx
│   │   │       ├── safety/page.tsx
│   │   │       ├── sustainability/page.tsx
│   │   │       ├── vehicles/page.tsx
│   │   │       └── wellness/page.tsx
│   │   ├── components/
│   │   │   ├── assistant/                    # AI assistant components
│   │   │   │   ├── ComponentRenderer.tsx     # Tool result visual renderer
│   │   │   │   ├── MiniCards.tsx             # Compact data cards
│   │   │   │   └── MissionTracker.tsx        # Live mission progress + reports
│   │   │   ├── chat/
│   │   │   │   └── ChatPanel.tsx             # AI chat panel (sidebar)
│   │   │   ├── dashboard/                    # Dashboard widgets
│   │   │   │   ├── AceInsights.tsx           # Geotab Ace widget
│   │   │   │   ├── DriverTable.tsx
│   │   │   │   ├── FinancialCard.tsx
│   │   │   │   ├── KPICards.tsx
│   │   │   │   ├── ScoreCard.tsx
│   │   │   │   └── WellnessCard.tsx
│   │   │   ├── driver/                       # 11 driver portal components
│   │   │   │   ├── HomeTab.tsx               # Score gauge + HOS + wellness
│   │   │   │   ├── TrainingTab.tsx           # Coaching programs + actions
│   │   │   │   ├── VoiceTab.tsx              # Voice AI with animated orb
│   │   │   │   ├── LoadTab.tsx               # Load + dispatch actions
│   │   │   │   ├── LeaderboardTab.tsx        # Rankings + badges
│   │   │   │   ├── DriverTopBar.tsx          # Fixed top bar
│   │   │   │   ├── DriverTabBar.tsx          # Bottom tab bar (5 tabs)
│   │   │   │   ├── FloatingMicButton.tsx     # Voice trigger button
│   │   │   │   ├── ScoreGauge.tsx            # SVG circular gauge
│   │   │   │   ├── DispatchCallOverlay.tsx   # Twilio/simulated call modal
│   │   │   │   └── BadgeDetailModal.tsx      # Badge detail modal
│   │   │   ├── layout/
│   │   │   │   ├── AppShell.tsx              # Layout wrapper + notifications
│   │   │   │   ├── Sidebar.tsx               # Navigation sidebar
│   │   │   │   └── PageHeader.tsx            # Page header
│   │   │   └── ui/
│   │   │       └── InsightTooltip.tsx        # Insight tooltips
│   │   ├── lib/
│   │   │   ├── api.ts                        # API client (all endpoints)
│   │   │   └── voice-client.ts               # WebSocket voice client
│   │   └── types/
│   │       └── fleet.ts                      # All TypeScript interfaces
│   └── next.config.ts                        # API proxy configuration
├── CLAUDE.md                                 # AI development guide + coding standards
├── COMPETITION.md                            # Hackathon rules + judging criteria
├── DRIVER_PORTAL_TEST_SCENARIOS.md           # Test scenarios + demo flow
├── STORY.md                                  # Problem, solution, and impact narrative
├── PROMPTS_USED.md                           # Key vibe coding prompts
└── README.md                                 # This file
```

---

## Getting Started

### Prerequisites
- Node.js 22+
- npm 10+

### Installation

```bash
# Clone the repository
git clone https://github.com/klickgenai/geotab-hackathon.git
cd geotab-hackathon

# Install backend dependencies
cd backend
cp .env.example .env
# Edit .env with your API keys (see Environment Variables below)
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Running in Development

```bash
# Terminal 1: Start backend
cd backend && npm run dev
# Server starts at http://localhost:3000

# Terminal 2: Start frontend
cd frontend && npm run dev
# App starts at http://localhost:3001

# Terminal 3 (optional): Start ngrok for Twilio webhooks
ngrok http 3000
# Copy the https URL to NGROK_URL in backend/.env
```

### Production Build

```bash
cd backend && npm run build    # TypeScript → dist/
cd frontend && npm run build   # Next.js optimized build
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes* | Claude AI (assistant, missions, dispatcher) |
| `SMALLEST_API_KEY` | Yes* | Voice STT/TTS (voice features) |
| `GEOTAB_DATABASE` | No | Geotab database name (seed data if not set) |
| `GEOTAB_USERNAME` | No | Geotab API username |
| `GEOTAB_PASSWORD` | No | Geotab API password |
| `GEOTAB_SERVER` | No | Geotab server (default: `my.geotab.com`) |
| `TWILIO_ACCOUNT_SID` | No | Twilio account SID (real dispatch calls) |
| `TWILIO_AUTH_TOKEN` | No | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | No | Twilio outbound phone number |
| `DISPATCH_PHONE_NUMBER` | No | Dispatcher's phone number |
| `NGROK_URL` | No | Public URL for Twilio webhooks (dev only) |
| `PORT` | No | Backend port (default: 3000) |

*Required for AI-powered features. Core analytics dashboards work without API keys.
Twilio variables are optional — dispatch calls fall back to AI simulation when not configured.

### Quick Test

```bash
# Test backend is running
curl http://localhost:3000/api/fleet/overview

# Test driver login (seed data mode)
curl -X POST http://localhost:3000/api/driver/login \
  -H 'Content-Type: application/json' \
  -d '{"employeeNumber":"241","pin":"1847"}'

# Test HOS endpoint
curl http://localhost:3000/api/driver/d1/hos

# Open app in browser
open http://localhost:3001
```

---

## Demo Guide

### Driver Portal Login
- **Seed data mode**: Employee `241` / PIN `1847`
- **Geotab connected**: Employee `141` / PIN `1073`

### Recommended 3-Minute Demo Flow

1. **Login** → Show driver dashboard
2. **Home tab** → Safety score gauge, HOS compliance gauges, wellness check-in
3. **Voice tab** → Tap mic, say: *"Give me my pre-shift briefing"*
4. Wait for response, then: *"Tell me about my load"*
5. Say: *"I'm going to be late, can you check with dispatch?"* → Watch dispatch call overlay
6. After dispatch: *"How can I improve my driving?"*
7. Say: *"How many hours do I have left?"*
8. **Load tab** → Full load card, tap "Call Dispatch" for another demo
9. **Rank tab** → Leaderboard, badge gallery
10. **Training tab** → Coaching programs (if coaching sweep was run from operator)

### Operator Portal Demo
1. Open `/operator` → Dashboard with fleet KPIs
2. Navigate to `/operator/assistant` → Ask Tasha: *"Run a coaching sweep on the top 5 riskiest drivers"*
3. Watch mission progress stream in real-time
4. When complete, review the rich report with findings, stats, and action plan
5. Show `/operator/map` → Live fleet tracking
6. Show `/operator/predictive` → Safety forecasting
7. Show `/operator/roi` → Dollar-quantified savings

---

## Development Process — The Vibe Coding Journey

Built in ~10 days using AI-assisted development (Claude Code / Claude Opus 4.6) with a parallel development strategy:

1. **Geotab API Integration** — Connected to MyGeotab for real fleet data + Ace for conversational analytics
2. **9 Scoring Engines** — Pure functions operating on seed/Geotab data, each independently testable
3. **50+ API Endpoints** — REST + WebSocket + SSE streaming, all type-safe
4. **17-Tool AI Agent** — Claude with specialized fleet tools + system prompt engineering
5. **5 Mission Types** — Autonomous background agents with progress streaming and cross-page notifications
6. **Voice Pipeline** — Full duplex voice AI with STT, TTS, VAD, barge-in, and filler audio
7. **Real Twilio Dispatch** — Outbound phone calls with AI-mediated multi-turn conversations
8. **25+ Frontend Pages** — Consistent patterns (Tailwind, Framer Motion, Recharts)
9. **Driver Portal** — 11 components, 5 tabs, HOS compliance, wellness check-ins, gamification
10. **Mission-to-Driver Sync** — Operator missions create action items for drivers automatically

### Quality Assurance
- TypeScript strict mode (backend + frontend)
- Zero compilation errors on `tsc --noEmit` and `next build`
- All 50+ API endpoints tested and verified
- Generation-counter TTS mutex preventing audio overlap
- React 19 strict mode guards (useRef) preventing double fetches
- Consistent UI patterns and brand color palette
- Responsive design with 48px+ touch targets for tablets

---

## Impact by the Numbers

| Metric | Value |
|--------|-------|
| Potential annual savings (fleet of 25) | **$521,600** |
| CO2 reduction from sustainability recommendations | **992 tons/year** |
| Insurance premium reduction potential | **18-32%** |
| Identified fleet savings (safety + retention + fuel) | **$147,000** |
| Driver risk assessment accuracy | **Real-time, per-driver** |
| Analyst work replaced by Mission Agents | **15-20 hours/week** |

---

## License

Built for the Geotab Vibe Coding Hackathon 2026.
