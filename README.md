# FleetShield AI - Predictive Fleet Safety & Insurance Intelligence Platform

> Built for the Geotab Hackathon | Powered by Geotab Telematics + Claude AI

FleetShield AI transforms raw fleet telematics data into actionable safety intelligence, predictive risk analytics, and quantifiable insurance savings. The platform combines real-time vehicle tracking, AI-powered incident prevention, and a driver-facing Voice AI dashboard to deliver a comprehensive fleet safety solution.

---

## Platform Overview

### 6 Core Pillars

| # | Pillar | Description |
|---|--------|-------------|
| 1 | **Insurance Premium Optimization** | AI-driven fleet scoring (0-100) with what-if simulator for premium reduction strategies |
| 2 | **Predictive Safety Analytics** | Pre-shift risk scoring, driver deterioration detection, dangerous corridor identification |
| 3 | **Smart Incident Prevention** | AI alert triage with urgency scoring, pattern detection, and recommended actions |
| 4 | **Driver Voice AI Dashboard** | Personal driver dashboard with voice-activated AI assistant for hands-free fleet communication |
| 5 | **Live Fleet Map** | Real-time vehicle tracking with risk-colored markers, speeding hotspot overlay, and GPS trails |
| 6 | **ROI Dashboard** | Before/after comparisons, dollar-quantified savings, retention risk analysis, and what-if scenarios |

---

## Screenshots & Features

### Fleet Manager Dashboard (`/`)
- Fleet-wide KPIs: vehicles, drivers, safety score, active alerts
- Insurance score card with A-F grading
- Driver risk rankings with trend indicators
- Real-time event feed
- AI chat assistant (Ava) with 14+ specialized tools

### Predictive Safety (`/predictive`)
- 7-day fleet forecast with predicted event counts
- Pre-shift risk assessment grid with expandable risk factors
- Driver deterioration trends (week-over-week changes)
- Dangerous corridor identification with event density
- Fleet-wide safety recommendations

### Alert Triage (`/alerts`)
- AI-prioritized daily briefing with critical/high alert counts
- Urgency-scored alert cards (0-100) with color-coded borders
- Pattern detection across multiple events
- Suggested actions for each alert
- Filter by priority level and alert category

### Live Fleet Map (`/map`)
- Real-time vehicle positions on dark-themed Leaflet map
- Color-coded markers: green (low), amber (moderate), orange (high), red (critical)
- Vehicle search and status filtering (moving/idle/offline)
- Speeding hotspot overlay with event density circles
- Selected vehicle detail card with speed, bearing, risk level

### ROI Dashboard (`/roi`)
- Hero banner with animated total savings counter
- 5-category savings breakdown (insurance, accident prevention, fuel, retention, productivity)
- Before/after comparison table across 6 metrics with dollar impact
- What-if simulator: select scenarios and see projected score improvements
- Driver retention risk analysis with burnout indicators

### Driver Voice AI Portal (`/driver-portal`)
- Personal dashboard with animated safety score gauge
- Current load assignment with status management (picked up, in transit, delivered)
- Voice AI assistant via WebSocket (Smallest AI STT/TTS)
  - Hands-free interaction for truck-mounted tablets
  - Quick action chips: "My Score", "Load Status", "Report Issue", "Call Dispatch"
  - Real-time transcript display
- Leaderboard showing top 15 drivers
- Message center with dispatch notifications
- AI-powered dispatcher call simulation with conversation history

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│        Next.js 16 + React 19 + Tailwind 4        │
│          Framer Motion + Recharts + Leaflet       │
│                  Port 3001                        │
├─────────────────────────────────────────────────┤
│                API Proxy Layer                    │
│         next.config.ts rewrites /api/*            │
├─────────────────────────────────────────────────┤
│                   Backend                         │
│       Express 4.21 + WebSocket (ws 8.18)          │
│          TypeScript 5.7 + Vercel AI SDK           │
│                  Port 3000                        │
├─────────────────────────────────────────────────┤
│              AI / ML Layer                        │
│   ┌─────────────┐  ┌─────────────────────────┐  │
│   │ Claude 4.5  │  │   Smallest AI Voice     │  │
│   │ (Vercel AI) │  │  Pulse STT + Waves TTS  │  │
│   │ 14+ Tools   │  │  WebSocket Pipeline      │  │
│   └─────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────┤
│           Data & Integration Layer                │
│   ┌──────────────┐  ┌────────────────────────┐  │
│   │ Geotab API   │  │   Seed Data Engine     │  │
│   │ JSON-RPC     │  │  30 drivers, 25 vehicles│  │
│   │ Ace Analytics│  │  1000+ safety events    │  │
│   └──────────────┘  └────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## Tech Stack

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 22+ | Runtime |
| Express | 4.21 | HTTP server |
| ws | 8.18 | WebSocket (voice pipeline) |
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
| Framer Motion | 12.34 | Animations |
| Recharts | 3.7 | Charts and graphs |
| Lucide React | 0.574 | Icon library |
| Leaflet | 1.9 | Maps (CDN loaded) |

### AI & Voice
| Technology | Purpose |
|-----------|---------|
| Claude Sonnet 4.5 | AI agent with 14+ fleet tools |
| Smallest AI Pulse | Speech-to-Text (STT) |
| Smallest AI Waves | Text-to-Speech (TTS) |
| Custom VAD | Energy-based Voice Activity Detection |

---

## Project Structure

```
fleetshield-ai/
├── backend/
│   ├── src/
│   │   ├── index.ts                    # Main server + 40+ API routes
│   │   ├── agents/
│   │   │   └── fleetshield-agent.ts    # Claude AI agent config
│   │   ├── data/
│   │   │   ├── seed-data.ts            # 30 drivers, 25 vehicles, events
│   │   │   ├── driver-session.ts       # Driver portal state
│   │   │   ├── dispatcher-ai.ts        # AI dispatcher simulation
│   │   │   └── fleet-data-provider.ts  # Geotab/seed data abstraction
│   │   ├── scoring/
│   │   │   ├── driver-risk-engine.ts   # Driver risk scores (0-100)
│   │   │   ├── insurance-score-engine.ts # Fleet insurance score (A-F)
│   │   │   ├── wellness-predictor.ts   # Burnout/fatigue detection
│   │   │   ├── predictive-safety.ts    # Pre-shift risk, deterioration
│   │   │   ├── alert-triage.ts         # Event clustering, urgency scoring
│   │   │   ├── roi-engine.ts           # ROI calculations, before/after
│   │   │   └── what-if-simulator.ts    # Insurance scenario modeling
│   │   ├── services/
│   │   │   ├── geotab-auth.ts          # Geotab API authentication
│   │   │   ├── geotab-core.ts          # Core Geotab API calls
│   │   │   ├── geotab-ace.ts           # Ace Analytics integration
│   │   │   ├── geotab-data-connector.ts # Data connector layer
│   │   │   └── live-fleet.ts           # GPS simulation service
│   │   ├── tools/                      # 14+ Claude agent tools
│   │   │   ├── index.ts                # Tool registry
│   │   │   ├── fleet-overview.ts
│   │   │   ├── driver-risk-scorer.ts
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
│   │   │   └── alert-triage.ts
│   │   └── voice/
│   │       ├── voice-session.ts        # Voice orchestrator
│   │       ├── stt-pipeline.ts         # Speech-to-text
│   │       ├── tts-pipeline.ts         # Text-to-speech pipeline
│   │       ├── tts-synthesize.ts       # TTS synthesis
│   │       ├── action-extractor.ts     # Voice command parsing
│   │       └── filler-cache.ts         # Audio filler for latency masking
│   ├── addin/
│   │   ├── addin.html                  # MyGeotab add-in UI
│   │   └── config.json                 # Geotab add-in manifest
│   └── public/
│       ├── index.html                  # Standalone dashboard
│       └── styles.css
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                # Fleet Manager Dashboard
│   │   │   ├── layout.tsx              # Root layout
│   │   │   ├── globals.css             # Global styles
│   │   │   ├── predictive/page.tsx     # Predictive Safety
│   │   │   ├── alerts/page.tsx         # Alert Triage
│   │   │   ├── map/page.tsx            # Live Fleet Map
│   │   │   ├── roi/page.tsx            # ROI Dashboard
│   │   │   ├── driver-portal/page.tsx  # Driver Voice AI Portal
│   │   │   ├── drivers/page.tsx        # Driver List
│   │   │   ├── drivers/[id]/page.tsx   # Driver Detail
│   │   │   ├── vehicles/page.tsx       # Vehicle List
│   │   │   ├── safety/page.tsx         # Safety Events
│   │   │   ├── wellness/page.tsx       # Wellness Monitor
│   │   │   └── reports/page.tsx        # Reports
│   │   ├── components/
│   │   │   ├── chat/ChatPanel.tsx      # AI Assistant Panel
│   │   │   ├── dashboard/             # Dashboard components
│   │   │   └── layout/
│   │   │       ├── AppShell.tsx        # Main layout wrapper
│   │   │       ├── Sidebar.tsx         # Navigation sidebar
│   │   │       └── PageHeader.tsx      # Page header component
│   │   ├── hooks/
│   │   │   └── useFleetData.ts         # Fleet data hook
│   │   ├── lib/
│   │   │   ├── api.ts                  # API client (all endpoints)
│   │   │   └── voice-client.ts         # WebSocket voice client
│   │   └── types/
│   │       └── fleet.ts                # All TypeScript interfaces
│   └── next.config.ts                  # API proxy configuration
├── CLAUDE.md                           # Development guide
└── README.md                           # This file
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

---

## API Reference

### Fleet Overview
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check + Geotab status |
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
| POST | `/api/chat` | Single-turn AI chat |
| POST | `/api/chat/stream` | SSE streaming AI chat |
| WS | `/ws` | Voice AI WebSocket |

---

## Geotab Integration

### Data Sources
- **DeviceStatusInfo**: Real-time vehicle positions, speed, bearing
- **ExceptionEvent**: Safety rule violations
- **Trip**: Daily driving summaries
- **Ace Analytics**: Advanced telematics analytics

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

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEOTAB_DATABASE` | No | Geotab database name (uses seed data if not set) |
| `GEOTAB_USERNAME` | No | Geotab API username |
| `GEOTAB_PASSWORD` | No | Geotab API password |
| `GEOTAB_SERVER` | No | Geotab server (default: my.geotab.com) |
| `ANTHROPIC_API_KEY` | Yes* | Claude AI (required for chat/voice AI) |
| `SMALLEST_API_KEY` | Yes* | Voice STT/TTS (required for voice features) |
| `PORT` | No | Backend port (default: 3000) |

*Required only for AI-powered features. Core analytics work without API keys.

---

## AI Agent Tools

The FleetShield AI agent ("Ava") has access to 14+ specialized tools:

| Tool | Description |
|------|-------------|
| `fleet_overview` | Get fleet-wide KPIs and health metrics |
| `driver_risk_scorer` | Score individual driver risk (0-100) |
| `fleet_insurance_score` | Calculate fleet insurance score |
| `safety_events` | Query safety events with filters |
| `driver_wellness` | Assess driver wellness/burnout risk |
| `coaching_recommender` | Generate personalized coaching plans |
| `financial_impact` | Calculate financial impact of events |
| `fleet_comparison` | Compare drivers/vehicles/periods |
| `insurance_report` | Generate insurance reports (PDF) |
| `driver_dashboard` | Get driver portal data |
| `ace_analytics` | Query Geotab Ace Analytics |
| `predictive_safety` | Predictive risk analysis |
| `alert_triage` | Prioritize and triage alerts |

---

## Development Process

### Build Approach
This platform was built using a comprehensive parallel development strategy:

1. **Backend Scoring Engines** - All 7 scoring engines were developed as pure functions operating on seed data
2. **API Layer** - 40+ REST endpoints + WebSocket voice pipeline
3. **Frontend Pages** - 13 routes built with consistent patterns (PageHeader, motion animations, Tailwind)
4. **AI Integration** - Claude agent with 14+ tools, voice pipeline with Smallest AI
5. **Data Layer** - Comprehensive seed data generation with realistic fleet scenarios

### Quality Assurance
- TypeScript strict mode across both backend and frontend
- Zero compilation errors on both `tsc` and `next build`
- All API endpoints tested and verified
- Consistent UI patterns and component reuse
- Responsive design with mobile-friendly driver portal

---

## License

Built for the Geotab Hackathon 2025.
