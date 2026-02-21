# FleetShield AI - Predictive Fleet Safety & Insurance Intelligence Platform

> Built for the Geotab Vibe Coding Hackathon | Powered by Geotab Telematics + Claude AI

FleetShield AI transforms raw fleet telematics data into actionable safety intelligence, predictive risk analytics, and quantifiable insurance savings. The platform combines real-time vehicle tracking, AI-powered incident prevention, autonomous background agents, and dual Voice AI dashboards (operator + driver) to deliver an enterprise-grade fleet safety solution.

---

## What Makes FleetShield AI Different

- **Dual AI Assistants**: Tasha (operator-facing) and Ava/Mike (driver-facing) each with specialized tools and voice capabilities
- **Autonomous Mission Agents**: Background agents that run coaching sweeps, wellness checks, safety investigations, insurance optimizations, and pre-shift risk assessments without blocking the operator
- **Dual Geotab API Integration**: MyGeotab API for vehicle/trip/diagnostic data AND Geotab Ace API for conversational fleet analytics
- **Real-Time Voice AI**: Full voice pipelines with STT, TTS, VAD, and barge-in support for hands-free operation
- **Quantified ROI**: Every recommendation comes with dollar-quantified impact projections

---

## Platform Overview

### 8 Core Pillars

| # | Pillar | Description |
|---|--------|-------------|
| 1 | **Insurance Premium Optimization** | AI-driven fleet scoring (0-100) with detailed component breakdown, what-if simulator, and savings projections |
| 2 | **Predictive Safety Analytics** | Pre-shift risk scoring, driver deterioration detection, dangerous corridor identification, 7-day forecasting |
| 3 | **Smart Incident Prevention** | AI alert triage with urgency scoring, pattern detection, and recommended interventions |
| 4 | **Autonomous Mission Agents** | Background AI agents for coaching sweeps, wellness checks, safety investigations, insurance optimization, and pre-shift sweeps |
| 5 | **Operator AI Assistant (Tasha)** | Full-screen voice + text assistant with 17+ tools, mission deployment, and rich visual reports |
| 6 | **Driver Voice AI Portal** | Personal driver dashboard with voice AI assistant, dispatch delegation, load management, and leaderboard |
| 7 | **Live Fleet Map** | Real-time vehicle tracking with risk-colored markers, speeding hotspot overlay, and GPS trails |
| 8 | **ROI & Sustainability Dashboards** | Before/after comparisons, dollar-quantified savings, retention risk, green fleet scoring, and what-if scenarios |

---

## Features & Pages

### Landing Page (`/`)
- Animated hero section with platform value proposition
- Feature highlights with smooth scroll navigation
- Entry points to Operator Portal and Driver Portal

### Operator Portal (`/operator`)
- Enterprise dashboard with fleet-wide KPIs
- Insurance score card with A-F grading
- Driver risk rankings with trend indicators
- Real-time event feed
- Navigation to all operator sub-pages

### AI Assistant — Tasha (`/operator/assistant`)
- Full-screen conversational AI interface (text + voice modes)
- 17+ specialized fleet analysis tools
- Rich visual report cards rendered inline
- Autonomous mission deployment with live progress tracking
- Voice mode with waveform visualization, real-time transcripts, and TTS
- Cross-page notification system for completed missions

### Autonomous Mission Agents
Background AI agents that Tasha deploys on behalf of the operator:

| Mission Type | What It Does |
|-------------|-------------|
| **Coaching Sweep** | Analyzes top riskiest drivers, builds individualized coaching plans with timelines and interventions |
| **Wellness Check** | Scans all drivers for burnout risk, fatigue patterns, and retention flags |
| **Safety Investigation** | Deep-dives a driver's safety events, identifies patterns, root causes, and corrective actions |
| **Insurance Optimization** | Analyzes score components, identifies quick wins, estimates premium savings |
| **Pre-Shift Sweep** | Assesses real-time risk for all drivers before shifts, flags high-risk situations |

Each mission:
- Runs in the background without blocking conversation
- Streams live progress updates (step-by-step)
- Generates findings with severity levels (info/warning/critical)
- Produces an executive summary via Claude AI
- Delivers rich visual reports with expandable findings, stat cards, and action plans
- Supports cross-page notifications (bell icon with badge count)

### Predictive Safety (`/operator/predictive`)
- 7-day fleet forecast with predicted event counts
- Pre-shift risk assessment grid with expandable risk factors
- Driver deterioration trends (week-over-week changes)
- Dangerous corridor identification with event density
- Fleet-wide safety recommendations

### Alert Triage (`/operator/alerts`)
- AI-prioritized daily briefing with critical/high alert counts
- Urgency-scored alert cards (0-100) with color-coded borders
- Pattern detection across multiple events
- Suggested actions for each alert
- Filter by priority level and alert category

### Insurance Dashboard (`/operator/insurance`)
- Detailed insurance score breakdown by component
- Score improvement opportunities with projected savings
- Historical trend visualization
- Peer comparison benchmarks

### Live Fleet Map (`/operator/map`)
- Real-time vehicle positions on dark-themed Leaflet map
- Color-coded markers: green (low), amber (moderate), orange (high), red (critical)
- Vehicle search and status filtering (moving/idle/offline)
- Speeding hotspot overlay with event density circles
- Selected vehicle detail card with speed, bearing, risk level

### ROI Dashboard (`/operator/roi`)
- Hero banner with animated total savings counter
- 5-category savings breakdown (insurance, accident prevention, fuel, retention, productivity)
- Before/after comparison table across 6 metrics with dollar impact
- What-if simulator: select scenarios and see projected score improvements
- Driver retention risk analysis with burnout indicators

### Sustainability Dashboard (`/operator/sustainability`)
- Green fleet scoring with environmental impact metrics
- Fuel efficiency tracking and optimization suggestions
- Carbon footprint analysis
- Eco-driving behavior monitoring

### Wellness Monitor (`/operator/wellness`)
- Fleet-wide wellness overview with burnout risk distribution
- Individual driver wellness scores with fatigue indicators
- Shift pattern analysis and rest time tracking
- Wellness trend visualization

### Driver Management (`/operator/drivers`, `/operator/drivers/[id]`)
- Driver list with risk scores, wellness status, and trend indicators
- Individual driver detail pages with comprehensive analytics
- Performance history, event timeline, and coaching notes

### Vehicle Fleet (`/operator/vehicles`)
- Vehicle inventory with assignment status
- Maintenance tracking and condition scores
- Utilization metrics

### Safety Events (`/operator/safety`)
- Comprehensive safety event log with filters
- Event type breakdown and severity analysis
- Temporal pattern visualization

### Reports (`/operator/reports`)
- PDF report generation for insurance documentation
- Fleet performance summaries
- Customizable report parameters

### Driver Voice AI Portal (`/driver-portal`)
- Personal dashboard with animated safety score gauge
- Current load assignment with status management (picked up, in transit, delivered)
- Voice AI assistant via WebSocket (Smallest AI STT/TTS)
  - Hands-free interaction for truck-mounted tablets
  - Quick action chips: "My Score", "Load Status", "Report Issue", "Call Dispatch"
  - Real-time transcript display
- Autonomous dispatch delegation (Tasha delegates to Mike the dispatcher)
- Leaderboard showing top 15 drivers
- Message center with dispatch notifications
- AI-powered dispatcher call simulation with conversation history

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      Frontend                             │
│           Next.js 16 + React 19 + Tailwind 4              │
│         Framer Motion + Recharts + Leaflet (CDN)          │
│                     Port 3001                              │
│                                                            │
│  ┌─────────────────┐  ┌───────────────┐  ┌────────────┐  │
│  │ Operator Portal  │  │ Driver Portal │  │  Landing   │  │
│  │ Tasha Assistant  │  │ Voice AI      │  │  Page      │  │
│  │ Mission Tracker  │  │ Dispatch      │  │            │  │
│  │ Notifications    │  │ Leaderboard   │  │            │  │
│  └─────────────────┘  └───────────────┘  └────────────┘  │
├──────────────────────────────────────────────────────────┤
│                   API Proxy Layer                          │
│            next.config.ts rewrites /api/*                  │
├──────────────────────────────────────────────────────────┤
│                      Backend                               │
│          Express 4.21 + WebSocket (ws 8.18)                │
│            TypeScript 5.7 + Vercel AI SDK                  │
│                     Port 3000                              │
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ AI Agent │  │ Missions │  │  Voice   │  │  REST    │  │
│  │ 17 Tools │  │ 5 Types  │  │ Pipeline │  │ 50+ APIs │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
├──────────────────────────────────────────────────────────┤
│                 AI / ML Layer                              │
│  ┌──────────────────┐  ┌──────────────────────────────┐  │
│  │  Claude Sonnet   │  │    Smallest AI Voice          │  │
│  │  (Vercel AI SDK) │  │  Pulse STT + Waves TTS       │  │
│  │  Agent + Summary │  │  WebSocket Pipeline + VAD     │  │
│  └──────────────────┘  └──────────────────────────────┘  │
├──────────────────────────────────────────────────────────┤
│               Scoring Engines (9 engines)                 │
│  Risk | Insurance | Wellness | Predictive | Alert Triage  │
│  ROI  | What-If   | Gamification | Green Score            │
├──────────────────────────────────────────────────────────┤
│              Data & Integration Layer                     │
│  ┌───────────────────┐  ┌─────────────────────────────┐  │
│  │   Geotab APIs     │  │    Seed Data Engine          │  │
│  │   MyGeotab        │  │  30 drivers, 25 vehicles     │  │
│  │   JSON-RPC        │  │  1000+ safety events         │  │
│  │   Ace Analytics   │  │  90 days of telemetry        │  │
│  └───────────────────┘  └─────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 22+ | Runtime |
| Express | 4.21 | HTTP server + REST APIs |
| ws | 8.18 | WebSocket (voice pipeline + missions) |
| TypeScript | 5.7 | Type safety |
| Vercel AI SDK | 4.3 | Claude AI agent integration |
| @ai-sdk/anthropic | 1.2 | Anthropic provider |
| PDFKit | 0.16 | Report generation |
| tsx | 4.19 | Development runtime |

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 16.1 | React framework (App Router) |
| React | 19.2 | UI library |
| Tailwind CSS | 4.0 | Utility-first styling |
| Framer Motion | 12.34 | Animations and transitions |
| Recharts | 3.7 | Charts and graphs |
| Lucide React | 0.574 | Icon library |
| Leaflet | 1.9 | Maps (CDN loaded, not npm) |

### AI & Voice
| Technology | Purpose |
|-----------|---------|
| Claude Sonnet 4.5 | AI agent with 17+ fleet tools + mission summaries |
| Smallest AI Pulse | Speech-to-Text (STT) |
| Smallest AI Waves | Text-to-Speech (TTS) |
| Custom VAD | Energy-based Voice Activity Detection |

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
│   │   ├── index.ts                          # Main server, 50+ API routes, WebSocket, SSE
│   │   ├── agents/
│   │   │   └── fleetshield-agent.ts          # Claude AI agent config + system prompt
│   │   ├── data/
│   │   │   ├── seed-data.ts                  # 30 drivers, 25 vehicles, 1000+ events
│   │   │   ├── driver-session.ts             # Driver portal state management
│   │   │   ├── dispatcher-ai.ts              # AI dispatcher simulation
│   │   │   └── fleet-data-provider.ts        # Geotab/seed data abstraction
│   │   ├── missions/
│   │   │   ├── index.ts                      # Barrel exports
│   │   │   ├── mission-types.ts              # Mission type definitions & metadata
│   │   │   ├── mission-bridge.ts             # EventEmitter bridge + global store
│   │   │   └── mission-runner.ts             # Mission execution engine (5 handlers)
│   │   ├── reports/
│   │   │   └── fleet-report.ts               # PDF report generation
│   │   ├── scoring/
│   │   │   ├── driver-risk-engine.ts         # Driver risk scores (0-100)
│   │   │   ├── insurance-score-engine.ts     # Fleet insurance score (A-F)
│   │   │   ├── wellness-predictor.ts         # Burnout/fatigue detection
│   │   │   ├── predictive-safety.ts          # Pre-shift risk, deterioration
│   │   │   ├── alert-triage.ts               # Event clustering, urgency scoring
│   │   │   ├── roi-engine.ts                 # ROI calculations, before/after
│   │   │   ├── what-if-simulator.ts          # Insurance scenario modeling
│   │   │   ├── gamification-engine.ts        # Driver gamification & badges
│   │   │   └── green-score-engine.ts         # Sustainability & eco scoring
│   │   ├── services/
│   │   │   ├── geotab-auth.ts                # Geotab API authentication
│   │   │   ├── geotab-core.ts                # Core MyGeotab API calls
│   │   │   ├── geotab-ace.ts                 # Ace Analytics integration
│   │   │   ├── geotab-data-connector.ts      # Data connector layer
│   │   │   ├── live-fleet.ts                 # GPS simulation service
│   │   │   └── twilio-dispatch-service.ts    # Dispatch call service
│   │   ├── tools/                            # 17 Claude agent tools
│   │   │   ├── index.ts                      # Tool registry
│   │   │   ├── fleet-overview.ts             # Fleet KPIs
│   │   │   ├── driver-risk-scorer.ts         # Driver risk scoring
│   │   │   ├── driver-intelligence.ts        # Deep driver analysis
│   │   │   ├── fleet-insurance-score.ts      # Insurance score
│   │   │   ├── safety-events.ts              # Safety event queries
│   │   │   ├── driver-wellness.ts            # Wellness assessment
│   │   │   ├── coaching-recommender.ts       # Coaching plan generation
│   │   │   ├── financial-impact.ts           # Financial impact calculator
│   │   │   ├── fleet-comparison.ts           # Comparative analysis
│   │   │   ├── insurance-report.ts           # PDF report generation
│   │   │   ├── driver-dashboard.ts           # Driver portal data
│   │   │   ├── ace-analytics.ts              # Geotab Ace queries
│   │   │   ├── predictive-safety.ts          # Predictive risk analysis
│   │   │   ├── alert-triage.ts               # Alert prioritization
│   │   │   ├── context-report.ts             # Contextual reporting
│   │   │   ├── sustainability.ts             # Green fleet metrics
│   │   │   └── mission-tool.ts               # Autonomous mission deployment
│   │   └── voice/
│   │       ├── voice-session.ts              # Voice orchestrator
│   │       ├── stt-pipeline.ts               # Speech-to-text pipeline
│   │       ├── tts-pipeline.ts               # Text-to-speech pipeline
│   │       ├── tts-synthesize.ts             # TTS synthesis
│   │       ├── action-extractor.ts           # Voice command parsing
│   │       ├── audio-convert.ts              # Audio format conversion
│   │       ├── dispatch-bridge.ts            # Dispatch delegation bridge
│   │       └── filler-cache.ts               # Audio filler for latency masking
│   ├── addin/
│   │   ├── addin.html                        # MyGeotab add-in UI
│   │   └── config.json                       # Geotab add-in manifest
│   └── public/
│       ├── index.html                        # Standalone dashboard
│       └── styles.css
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                      # Landing Page
│   │   │   ├── layout.tsx                    # Root layout
│   │   │   ├── globals.css                   # Global styles
│   │   │   ├── driver-portal/page.tsx        # Driver Voice AI Portal
│   │   │   ├── operator/
│   │   │   │   ├── page.tsx                  # Operator Dashboard
│   │   │   │   ├── assistant/page.tsx        # Tasha AI Assistant (full-screen)
│   │   │   │   ├── alerts/page.tsx           # Alert Triage
│   │   │   │   ├── drivers/page.tsx          # Driver List
│   │   │   │   ├── drivers/[id]/page.tsx     # Driver Detail
│   │   │   │   ├── insurance/page.tsx        # Insurance Dashboard
│   │   │   │   ├── map/page.tsx              # Live Fleet Map
│   │   │   │   ├── predictive/page.tsx       # Predictive Safety
│   │   │   │   ├── reports/page.tsx          # Reports
│   │   │   │   ├── roi/page.tsx              # ROI Dashboard
│   │   │   │   ├── safety/page.tsx           # Safety Events
│   │   │   │   ├── sustainability/page.tsx   # Green Fleet Dashboard
│   │   │   │   ├── vehicles/page.tsx         # Vehicle Fleet
│   │   │   │   └── wellness/page.tsx         # Wellness Monitor
│   │   │   ├── alerts/page.tsx               # (Legacy) Alert Triage
│   │   │   ├── drivers/page.tsx              # (Legacy) Driver List
│   │   │   ├── drivers/[id]/page.tsx         # (Legacy) Driver Detail
│   │   │   ├── map/page.tsx                  # (Legacy) Live Map
│   │   │   ├── predictive/page.tsx           # (Legacy) Predictive
│   │   │   ├── reports/page.tsx              # (Legacy) Reports
│   │   │   ├── roi/page.tsx                  # (Legacy) ROI
│   │   │   ├── safety/page.tsx               # (Legacy) Safety
│   │   │   ├── vehicles/page.tsx             # (Legacy) Vehicles
│   │   │   └── wellness/page.tsx             # (Legacy) Wellness
│   │   ├── components/
│   │   │   ├── assistant/
│   │   │   │   ├── ComponentRenderer.tsx     # Tool result visual renderer
│   │   │   │   ├── MiniCards.tsx             # Compact data cards
│   │   │   │   └── MissionTracker.tsx        # Live mission progress + reports
│   │   │   ├── chat/
│   │   │   │   └── ChatPanel.tsx             # AI chat panel (sidebar)
│   │   │   ├── dashboard/
│   │   │   │   ├── AceInsights.tsx           # Geotab Ace insights widget
│   │   │   │   ├── DriverTable.tsx           # Driver data table
│   │   │   │   ├── FinancialCard.tsx         # Financial impact card
│   │   │   │   ├── KPICards.tsx              # KPI metric cards
│   │   │   │   ├── ScoreCard.tsx             # Score display card
│   │   │   │   └── WellnessCard.tsx          # Wellness indicator card
│   │   │   ├── layout/
│   │   │   │   ├── AppShell.tsx              # Layout + mission notifications
│   │   │   │   ├── Sidebar.tsx               # Navigation sidebar
│   │   │   │   └── PageHeader.tsx            # Page header component
│   │   │   └── ui/
│   │   │       └── InsightTooltip.tsx        # Insight tooltip component
│   │   ├── data/
│   │   │   └── insight-content.ts            # Tooltip insight data
│   │   ├── hooks/
│   │   │   └── useFleetData.ts               # Fleet data hook
│   │   ├── lib/
│   │   │   ├── api.ts                        # API client (all endpoints)
│   │   │   └── voice-client.ts               # WebSocket voice client
│   │   └── types/
│   │       └── fleet.ts                      # All TypeScript interfaces
│   └── next.config.ts                        # API proxy configuration
├── CLAUDE.md                                 # AI development guide
├── COMPETITION.md                            # Hackathon competition details
└── README.md                                 # This file
```

---

## Scoring Engines

### Driver Risk Score (0-100)
Weighted composite of:
- **Safety Events** (40%): Event frequency and severity
- **Driving Behavior** (25%): Speeding, harsh braking, acceleration patterns
- **Compliance** (20%): HOS violations, maintenance adherence
- **Wellness** (15%): Fatigue indicators, shift patterns

### Insurance Score (0-100, A-F Grade)
Fleet-wide assessment across:
- **Claims & Incidents** (35%): Historical loss ratio
- **Fleet Behavior** (30%): Aggregate telematics metrics
- **Compliance** (20%): Regulatory adherence
- **Maintenance** (15%): Vehicle condition scores

### Pre-Shift Risk Score
Real-time assessment before each shift:
- Recent event severity and frequency
- Fatigue factors (rest time, consecutive driving days)
- Behavioral trends (improving/declining)
- Weather and route risk factors

### Alert Urgency Score (0-100)
Event clustering and prioritization:
- Event severity and recency
- Pattern detection (repeated violations)
- Driver risk profile context
- Suggested intervention actions

### ROI Engine
Quantifies platform value across 5 categories:
- Insurance premium savings
- Accident prevention value
- Fuel efficiency gains
- Driver retention savings
- Productivity improvements

### Wellness Predictor
Burnout and fatigue risk assessment:
- Hours worked patterns and rest compliance
- Event frequency trends
- Consecutive driving days
- Shift pattern analysis

### Green Score Engine
Sustainability and eco-driving metrics:
- Fuel efficiency scoring
- Idle time reduction tracking
- Eco-driving behavior assessment
- Carbon footprint estimation

### Gamification Engine
Driver engagement and motivation:
- Safety badges and achievements
- Leaderboard ranking system
- Streak tracking (safe driving days)
- Performance improvement rewards

---

## AI Agent Tools

The FleetShield AI assistant (Tasha) has access to 17 specialized tools:

| Tool | Description |
|------|-------------|
| `fleet_overview` | Get fleet-wide KPIs and health metrics |
| `driver_risk_scorer` | Score individual driver risk (0-100) |
| `driver_intelligence` | Deep driver analysis with history and patterns |
| `fleet_insurance_score` | Calculate fleet insurance score with component breakdown |
| `safety_events` | Query safety events with filters (type, driver, date range) |
| `driver_wellness` | Assess driver wellness/burnout risk |
| `coaching_recommender` | Generate personalized coaching plans |
| `financial_impact` | Calculate financial impact of events and interventions |
| `fleet_comparison` | Compare drivers, vehicles, or time periods |
| `insurance_report` | Generate insurance documentation (PDF) |
| `driver_dashboard` | Get driver portal data |
| `ace_analytics` | Query Geotab Ace Analytics (natural language fleet queries) |
| `predictive_safety` | Predictive risk analysis and forecasting |
| `alert_triage` | Prioritize and triage alerts by urgency |
| `context_report` | Generate contextual analysis reports |
| `sustainability` | Green fleet and eco-driving metrics |
| `deployMission` | Deploy autonomous background mission agents |

---

## Autonomous Mission Agent System

### How It Works

```
1. Operator asks: "Which drivers need coaching?"
2. Tasha answers the immediate question using existing tools
3. Tasha detects this could benefit from deeper analysis
4. Tasha offers: "I can deploy a coaching sweep agent for a thorough
   analysis. Want me to kick that off?"
5. Operator confirms
6. Tasha calls deployMission → returns immediately
7. Mission runs in background (scoring engines + Claude summary)
8. Live progress streams into chat (SSE or WebSocket)
9. On completion → notification bell appears (works cross-page)
10. Operator clicks → rich visual report with findings + action plan
```

### Mission Architecture
- Missions call **scoring engine functions directly** (not AI sub-agents)
- Only the final summary uses one Claude `generateText` call
- Each mission emits progress, findings, and completion via EventEmitter bridge
- Results stored in-memory for cross-page retrieval
- Supports multiple concurrent missions

### Progress Streaming
- **In-page (SSE/WebSocket)**: Live MissionTracker card with animated progress
- **Cross-page (global notifications)**: Bell icon with badge count, toast notifications
- **Click-to-reveal**: Navigate to assistant with full report + TTS narration

### TTS Mutex
Audio playback uses a generation-counter pattern to prevent overlapping voices. Each `speakAsync` call gets a unique generation ID checked at every async boundary.

---

## API Reference

### Fleet Overview
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check + Geotab configuration status |
| GET | `/api/fleet/overview` | Fleet KPIs and summary |
| GET | `/api/fleet/drivers` | All drivers list |
| GET | `/api/fleet/drivers/:id` | Single driver detail |
| GET | `/api/fleet/vehicles` | All vehicles list |
| GET | `/api/fleet/events` | Safety events (with filters) |
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
| GET | `/api/missions/active` | All active and recently completed missions |
| GET | `/api/missions/:id` | Get specific mission result |

### Driver Portal
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/driver/login` | Driver authentication |
| GET | `/api/driver/:id/dashboard` | Driver dashboard data |
| GET | `/api/driver/:id/load` | Current load assignment |
| PUT | `/api/driver/:id/load/status` | Update load status |
| GET | `/api/driver/:id/messages` | Driver messages |
| GET | `/api/driver/leaderboard` | Driver rankings |
| POST | `/api/driver/:id/dispatch-call` | Initiate dispatcher call |

### AI & Voice
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/assistant/stream` | SSE streaming AI assistant (Tasha) |
| POST | `/api/chat` | Single-turn AI chat |
| POST | `/api/chat/stream` | SSE streaming AI chat (legacy) |
| POST | `/api/tts/synthesize` | Text-to-speech synthesis |
| WS | `/ws` | Voice AI WebSocket (operator + driver) |

---

## Voice AI Pipeline

### Architecture
```
Microphone → AudioContext (16kHz) → VAD → PCM16 Binary → WebSocket
                                                            │
                                                     Backend Voice Session
                                                            │
                                                   Smallest AI Pulse (STT)
                                                            │
                                                     Claude AI Agent
                                                     (17+ tools)
                                                            │
                                                   Smallest AI Waves (TTS)
                                                            │
WebSocket ← Base64 Audio Chunks ← Sentence-Level Streaming
     │
AudioContext (24kHz) → Speaker Playback
```

### Features
- Energy-based Voice Activity Detection (VAD)
- Sentence-level TTS streaming for low latency
- Filler audio cache for response time masking
- Barge-in support (interrupt during playback)
- Binary PCM16 for mic data, base64 for playback
- Dual voice clients: operator (Tasha) and driver (Ava/Mike)
- Mission progress streaming via WebSocket

---

## Geotab Integration

### Dual-API Integration (Competition Requirement)

**MyGeotab API** (`my.geotab.com`):
- **DeviceStatusInfo**: Real-time vehicle positions, speed, bearing
- **ExceptionEvent**: Safety rule violations
- **Trip**: Daily driving summaries with distance, duration, idling
- **Device**: Vehicle information and assignments
- Authentication via JSON-RPC with session management

**Geotab Ace API**:
- Natural language queries about fleet data
- Conversational analytics ("How many vehicles exceeded speed limits last week?")
- Integrated as an AI tool for Tasha to query on demand

### MyGeotab Add-in
The platform can be embedded as a MyGeotab add-in:
- Configuration: `backend/addin/config.json`
- Bridge UI: `backend/addin/addin.html`
- Uses iframe with PostMessage for Geotab API proxying

### Seed Data Mode
When Geotab credentials are not configured, the platform operates with comprehensive seed data:
- 30 realistic driver profiles with varied risk levels
- 25 vehicles with fleet assignments
- 1000+ safety events across 90 days
- Daily trip summaries with driving hours, idling, and distances
- Pre-calculated fleet KPIs and wellness indicators

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
# Edit .env with your API keys
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Running in Development

```bash
# Terminal 1: Start backend
cd backend
npm run dev
# Server starts at http://localhost:3000

# Terminal 2: Start frontend
cd frontend
npm run dev
# App starts at http://localhost:3001
```

### Production Build

```bash
# Backend
cd backend && npm run build    # TypeScript -> dist/

# Frontend
cd frontend && npm run build   # Next.js optimized build
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEOTAB_DATABASE` | No | Geotab database name (uses seed data if not set) |
| `GEOTAB_USERNAME` | No | Geotab API username |
| `GEOTAB_PASSWORD` | No | Geotab API password |
| `GEOTAB_SERVER` | No | Geotab server (default: my.geotab.com) |
| `ANTHROPIC_API_KEY` | Yes* | Claude AI (required for AI assistant, missions, dispatcher) |
| `SMALLEST_API_KEY` | Yes* | Voice STT/TTS (required for voice features) |
| `PORT` | No | Backend port (default: 3000) |

*Required only for AI-powered features. Core analytics and dashboards work without API keys.

---

## Development Process

### Build Approach
This platform was built using AI-assisted development (Claude Code) with a parallel development strategy:

1. **Scoring Engines** - 9 scoring engines developed as pure functions operating on seed/Geotab data
2. **API Layer** - 50+ REST endpoints + WebSocket voice pipeline + SSE streaming
3. **AI Agent** - Claude agent with 17 specialized tools + system prompt engineering
4. **Mission System** - 5 autonomous mission types with background execution and progress streaming
5. **Frontend Pages** - 25+ routes built with consistent patterns (Tailwind, Framer Motion, Recharts)
6. **Voice Pipeline** - Full duplex voice AI with STT, TTS, VAD, and barge-in
7. **Data Integration** - Dual Geotab API integration with seed data fallback

### Quality Assurance
- TypeScript strict mode across both backend and frontend
- Zero compilation errors on both `tsc` and `next build`
- All API endpoints tested and verified
- Generation-counter TTS mutex preventing audio overlap
- Consistent UI patterns and component reuse
- Responsive design with mobile-friendly driver portal

---

## License

Built for the Geotab Vibe Coding Hackathon 2026.
