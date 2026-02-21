# CLAUDE.md - FleetShield AI Development Guide

## !!! COMPETITION RULES - MANDATORY FOR ALL AGENTS !!!
This project is for the **Geotab Vibe Coding Hackathon** ($25K prize pool).
Full details in `COMPETITION.md` - read it for deep context on judging, demo tips, pitfalls.

### Non-Negotiable Requirements
- **OUR Deadline**: February 25, 2026 (official: March 2, but owner traveling)
- **DUAL-API Integration (judging criterion!)**: Must use BOTH:
  - **MyGeotab API** (`my.geotab.com`) - vehicles, trips, diagnostics, GPS, safety events
  - **Geotab Ace API** - conversational AI queries about fleet data
- **Submission**: 3-min demo video + public GitHub repo (with prompts) + story

### Judging Criteria (all 6 matter)
1. **Working Demo** - Must function live, not just mockups
2. **Problem-Solution Fit** - Solves real fleet management pain points
3. **Dual-API Integration** - Uses both MyGeotab API AND Geotab Ace
4. **User Experience** - Polished, intuitive UI
5. **Innovation** - Unique/creative approach
6. **Vibe Factor** - Shows effective AI-assisted development

### Target: The Vibe Master ($10,000) - Best overall solution

### Rules for Every Agent/Session
- Do NOT break existing working features
- Do NOT remove Geotab API integration code
- Every feature must work with real Geotab demo database data (not just seed)
- Keep UI polished - judges score UX
- Keep code clean - production readiness is a tiebreaker
- Reference `COMPETITION.md` for full competition context when making design decisions

## Project Overview
FleetShield AI is a Predictive Fleet Safety & Insurance Intelligence Platform built for the Geotab Vibe Coding Hackathon (Feb 12 - Mar 2, 2026). It combines real-time telematics data with AI-powered analytics, autonomous mission agents, and dual voice AI dashboards to optimize fleet safety, reduce insurance premiums, and prevent incidents.

## Architecture

### Monorepo Structure
```
/backend   - Express + WebSocket server (TypeScript, port 3000)
/frontend  - Next.js 16 + React 19 app (TypeScript, port 3001)
```

### Backend Stack
- **Runtime**: Node.js with ESM modules
- **Framework**: Express 4.21 + ws 8.18 (WebSocket)
- **AI**: Vercel AI SDK 4.3 + Anthropic Claude Opus 4.6
- **Voice**: Smallest AI Pulse (STT) + Waves (TTS)
- **Build**: TypeScript 5.7, tsx for dev
- **Dev command**: `npm run dev` (tsx watch)

### Frontend Stack
- **Framework**: Next.js 16.1 with App Router
- **UI**: React 19 + Tailwind CSS 4 + Framer Motion
- **Charts**: Recharts 3.7
- **Icons**: Lucide React
- **Maps**: Leaflet 1.9 (loaded via CDN, not npm)
- **Dev command**: `npm run dev` (port 3001)
- **API Proxy**: next.config.ts rewrites `/api/*` to `localhost:3000`

## Key Directories

### Backend
- `src/index.ts` - Main server, 50+ API routes, WebSocket handler, SSE streaming
- `src/agents/fleetshield-agent.ts` - Claude AI agent config + system prompt + 17 tools
- `src/data/seed-data.ts` - 30 drivers, 25 vehicles, 1000+ safety events
- `src/data/driver-session.ts` - Driver portal state management
- `src/data/dispatcher-ai.ts` - Claude-powered dispatcher call simulation
- `src/data/fleet-data-provider.ts` - Geotab/seed data abstraction layer
- `src/missions/` - Autonomous mission agent system
  - `mission-types.ts` - Type definitions and metadata for 5 mission types
  - `mission-bridge.ts` - EventEmitter bridge + global mission store
  - `mission-runner.ts` - Mission execution engine (calls scoring engines directly)
  - `index.ts` - Barrel exports
- `src/reports/fleet-report.ts` - PDF report generation
- `src/scoring/` - 9 scoring engines (risk, insurance, wellness, predictive, alert triage, ROI, what-if, gamification, green score)
- `src/services/` - Geotab API integration (auth, core, ace, data connector), live fleet GPS simulation
- `src/tools/` - 17 Claude agent tools (see list below)
- `src/voice/` - Full voice pipeline (STT, TTS, VAD, session orchestration, dispatch bridge)

### Frontend
- `src/app/page.tsx` - Landing page
- `src/app/driver-portal/page.tsx` - Driver portal tab orchestrator (~260 lines)
- `src/components/driver/` - 11 driver portal components (tabs, overlays, gauges)
- `src/app/operator/` - Operator Portal (12 sub-pages)
  - `page.tsx` - Operator Dashboard
  - `assistant/page.tsx` - Tasha AI Assistant (full-screen, voice + text)
  - `alerts/page.tsx` - Alert Triage
  - `drivers/page.tsx` & `drivers/[id]/page.tsx` - Driver management
  - `insurance/page.tsx` - Insurance Dashboard
  - `map/page.tsx` - Live Fleet Map
  - `predictive/page.tsx` - Predictive Safety
  - `reports/page.tsx` - Reports
  - `roi/page.tsx` - ROI Dashboard
  - `safety/page.tsx` - Safety Events
  - `sustainability/page.tsx` - Green Fleet Dashboard
  - `vehicles/page.tsx` - Vehicle Fleet
  - `wellness/page.tsx` - Wellness Monitor
- `src/components/assistant/` - AI assistant components
  - `ComponentRenderer.tsx` - Tool result visual renderer (renders rich cards for each tool)
  - `MiniCards.tsx` - Compact data cards
  - `MissionTracker.tsx` - Live mission progress + rich report renderer
- `src/components/chat/ChatPanel.tsx` - AI chat panel (sidebar, used on legacy pages)
- `src/components/dashboard/` - Dashboard components (KPICards, ScoreCard, etc.)
- `src/components/driver/` - Driver portal tab components
  - `HomeTab.tsx` - Dashboard home with score gauge, briefing, challenge
  - `TrainingTab.tsx` - Training programs from missions + action items
  - `VoiceTab.tsx` - Voice AI with animated orb, transcript, text input
  - `LoadTab.tsx` - Load details, dispatch actions, messages
  - `LeaderboardTab.tsx` - Leaderboard, badges, rewards, points history
  - `DriverTopBar.tsx` - Top bar with driver info, level, streak
  - `DriverTabBar.tsx` - Bottom tab bar (Home|Training|Voice|Load|Rank)
  - `FloatingMicButton.tsx` - Floating voice trigger on all tabs except Voice
  - `ScoreGauge.tsx` - SVG circular safety score gauge
  - `DispatchCallOverlay.tsx` - Tasha-Mike dispatch call modal
  - `BadgeDetailModal.tsx` - Badge inspection modal
- `src/components/layout/` - Layout components
  - `AppShell.tsx` - Main layout wrapper + mission notification bell system
  - `Sidebar.tsx` - Navigation sidebar
  - `PageHeader.tsx` - Page header component
- `src/lib/api.ts` - API client with all endpoints
- `src/lib/voice-client.ts` - WebSocket voice client (operator + driver)
- `src/types/fleet.ts` - All TypeScript interfaces

## Development Patterns

### API Routes Convention
All fleet API routes follow: `GET /api/fleet/{domain}/{action}`
- `/api/fleet/overview` - Fleet KPIs
- `/api/fleet/predictive/forecast` - Predictive analytics
- `/api/fleet/alerts/briefing` - Alert triage
- `/api/fleet/map/live` - Live vehicle positions
- `/api/fleet/roi` - ROI calculations
- `/api/fleet/what-if/defaults` - What-if scenarios

### Mission API Routes
- `GET /api/missions/active` - All active and recently completed missions
- `GET /api/missions/:id` - Specific mission result

### AI Assistant Routes
- `POST /api/assistant/stream` - SSE streaming for Tasha (operator assistant)
- `POST /api/tts/synthesize` - Text-to-speech synthesis
- `WS /ws` - WebSocket for voice mode (both operator and driver)

### Frontend Page Pattern
Each page follows the same structure:
1. Import `api` from `@/lib/api`
2. Import `PageHeader` from `@/components/layout/PageHeader`
3. Use `useState` + `useEffect` for data fetching
4. Use `motion` from Framer Motion for animations
5. Use Tailwind utility classes (no CSS modules)

### Operator Portal Layout
- Sidebar navigation with all operator pages
- AppShell wrapper with mission notification bell
- Full-width content area (`ml-[240px]`)
- Consistent warm color palette (amber/gold accents on cream background)

### Driver Portal
- Has its own layout (no sidebar) - detected via pathname in `AppShell.tsx`
- Dark theme (slate-900 background)
- Full-screen experience for truck-mounted tablets
- Tab-based layout: Home | Training | **Voice** (centered, larger) | Load | Rank
- 11 components in `src/components/driver/` — page.tsx is a slim ~260-line orchestrator
- Floating mic button on all tabs except Voice (taps to switch & start listening)
- Voice AI via WebSocket connection to backend
- 30-second polling for action items and training programs
- Mission-to-driver sync: operator missions create action items for specific drivers
- Training endpoint: `GET /api/driver/:id/training` returns programs from completed missions
- Test scenarios documented in `DRIVER_PORTAL_TEST_SCENARIOS.md`

### Assistant Page
- Full-screen layout (no sidebar) - detected via pathname in `AppShell.tsx`
- Text mode: SSE streaming with rich visual tool results
- Voice mode: WebSocket with waveform visualization
- Mission deployment: MissionTracker component with live progress
- Cross-page notifications: Bell icon in AppShell for completed missions
- TTS: Generation-counter mutex to prevent overlapping audio

### Scoring Engines
All scoring engines in `backend/src/scoring/` are pure functions that operate on seed data.
They return typed objects and don't have side effects. The mission system calls these directly.

### Mission System
- 5 mission types: coaching_sweep, wellness_check, safety_investigation, insurance_optimization, preshift_sweep
- Missions call scoring engines directly (not AI sub-agents)
- Only final summary uses one Claude `generateText` call
- Progress streams via EventEmitter bridge → SSE/WebSocket
- Global mission store for cross-page retrieval
- MissionTracker.tsx renders live progress + rich completion reports
- **Mission-to-Driver sync**: coaching_sweep, wellness_check, safety_investigation auto-create action items for affected drivers via `syncMissionToDrivers()` in mission-bridge.ts

## AI Agent Tools (17 total)
| Tool | File | Description |
|------|------|-------------|
| `fleet_overview` | `fleet-overview.ts` | Fleet KPIs and health metrics |
| `driver_risk_scorer` | `driver-risk-scorer.ts` | Driver risk scoring (0-100) |
| `driver_intelligence` | `driver-intelligence.ts` | Deep driver analysis |
| `fleet_insurance_score` | `fleet-insurance-score.ts` | Insurance score with breakdown |
| `safety_events` | `safety-events.ts` | Safety event queries with filters |
| `driver_wellness` | `driver-wellness.ts` | Wellness/burnout assessment |
| `coaching_recommender` | `coaching-recommender.ts` | Coaching plan generation |
| `financial_impact` | `financial-impact.ts` | Financial impact calculator |
| `fleet_comparison` | `fleet-comparison.ts` | Comparative analysis |
| `insurance_report` | `insurance-report.ts` | PDF report generation |
| `driver_dashboard` | `driver-dashboard.ts` | Driver portal data |
| `ace_analytics` | `ace-analytics.ts` | Geotab Ace queries |
| `predictive_safety` | `predictive-safety.ts` | Predictive risk analysis |
| `alert_triage` | `alert-triage.ts` | Alert prioritization |
| `context_report` | `context-report.ts` | Contextual reporting |
| `sustainability` | `sustainability.ts` | Green fleet metrics |
| `deployMission` | `mission-tool.ts` | Deploy autonomous background missions |

## Geotab API Integration (CRITICAL for Competition)
The project MUST demonstrate real Geotab API integration for the submission:
- **MyGeotab API**: Vehicle data, trips, diagnostics, GPS, safety events via `my.geotab.com`
- **Geotab Ace API**: Conversational AI queries about fleet data
- Integration code is in `backend/src/services/`
- Demo database credentials go in `backend/.env`
- The app falls back to seed data when credentials are missing
- `fleet-data-provider.ts` abstracts Geotab vs seed data sources

## Environment Variables
See `backend/.env.example` for required variables:
- `GEOTAB_DATABASE`, `GEOTAB_USERNAME`, `GEOTAB_PASSWORD` - Geotab API credentials
- `GEOTAB_SERVER` - Geotab server (default: my.geotab.com)
- `ANTHROPIC_API_KEY` - For Claude AI agent, missions, and dispatcher
- `SMALLEST_API_KEY` - For voice STT/TTS pipeline
- `PORT` - Backend port (default 3000)

## Running the Project
```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

## Build Commands
```bash
# Backend
cd backend && npm run build    # TypeScript -> dist/

# Frontend
cd frontend && npm run build   # Next.js production build
```

## Important Notes
- Backend seed data simulates 90 days of fleet telematics
- The app works in "seed data mode" without Geotab credentials
- Voice AI requires SMALLEST_API_KEY and ANTHROPIC_API_KEY
- Missions require ANTHROPIC_API_KEY for the summary generation step
- Leaflet is loaded via CDN (not npm) to avoid SSR issues
- The frontend proxies all `/api/*` requests to the backend
- The MyGeotab add-in is in `backend/addin/` (iframe bridge pattern)
- TTS uses generation-counter mutex to prevent double-voice issues
- React 19 strict mode double-fires effects — guard refs prevent duplicate fetches

## Geotab Vibe Guide Reference
The official competition guide repo: https://github.com/fhoffa/geotab-vibe-guide
Key resources for AI agents:
- `AGENT_SUMMARY.md` - Repo orientation
- `skills/geotab/SKILL.md` - Complete Geotab development skill
- `skills/geotab/references/ACE_API.md` - Ace API guide
- `skills/geotab/references/API_QUICKSTART.md` - MyGeotab API quickstart
- `guides/HACKATHON_IDEAS.md` - Project ideas and judging criteria
