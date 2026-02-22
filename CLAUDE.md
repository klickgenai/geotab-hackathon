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
- `src/data/driver-session.ts` - Driver portal state management, ActionItem (with category/priority/missionId), action item CRUD
- `src/data/dispatcher-ai.ts` - Claude-powered dispatcher call simulation
- `src/data/fleet-data-provider.ts` - Geotab/seed data abstraction layer
- `src/missions/` - Autonomous mission agent system
  - `mission-types.ts` - Type definitions and metadata for 5 mission types
  - `mission-bridge.ts` - EventEmitter bridge + global mission store + syncMissionToDrivers() hook
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
  - `assistant/page.tsx` - Tasha Voice AI Agent (full-screen, voice + text, top of sidebar)
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

### Driver Portal API Routes
- `POST /api/driver/login` - Driver authentication (employeeNo + pin)
- `GET /api/driver/:id/dashboard` - Driver dashboard data (score, briefing, challenge, HOS, load, gamification)
- `GET /api/driver/:id/actions` - Action items with category/priority fields
- `PUT /api/driver/:id/actions/:actionId` - Update action item status (complete/dismiss)
- `GET /api/driver/:id/training` - Training programs from completed operator missions
- `GET /api/driver/:id/load` - Current load assignment
- `PUT /api/driver/:id/load/status` - Update load status
- `GET /api/driver/:id/messages` - Driver messages
- `GET /api/driver/leaderboard` - Driver rankings
- `POST /api/driver/:id/dispatch-call` - Initiate AI dispatcher call
- `GET /api/driver/:id/gamification` - Gamification state (badges, rewards, points, level)

### Frontend Page Pattern
Each page follows the same structure:
1. Import `api` from `@/lib/api`
2. Import `PageHeader` from `@/components/layout/PageHeader`
3. Use `useState` + `useEffect` for data fetching
4. Use `motion` from Framer Motion for animations
5. Use Tailwind utility classes (no CSS modules)

### Operator Portal Layout
- Sidebar navigation with "Tasha  - Voice AI Agent" as top-priority button (gold gradient)
- Sidebar footer: Geotab connection status + "Back to Home" logout link
- AppShell wrapper with mission notification bell + toast (with X dismiss button)
- Full-width content area (`ml-[240px]`)
- Consistent warm color palette (amber/gold accents on cream background)

### Driver Portal
- Has its own layout (no sidebar) - detected via pathname in `AppShell.tsx`
- Dark theme (slate-900 background)
- Full-screen experience for truck-mounted tablets
- Tab-based layout: Home | Training | **Voice** (centered, larger) | Load | Rank
- 11 components in `src/components/driver/`  - page.tsx is a slim ~260-line orchestrator
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

### Operator → Driver Data Flow
```
Operator asks Tasha → mission runs (e.g. coaching sweep)
  → mission-runner generates per-driver coaching plans
  → mission-bridge.completeActiveMission() fires
  → syncMissionToDrivers() creates action items per driver (category, priority, missionId)
  → Driver portal polls /api/driver/:id/actions every 30s
  → Training tab shows new coaching program with notification badge
  → Driver marks coaching steps complete → item updates
```

### Driver Portal Test Credentials
| Employee # | PIN | Notes |
|-----------|------|-------|
| `141` | `1073` | Default test driver |

Full test scenarios (voice questions, tab navigation, dispatch calls, mission sync): `DRIVER_PORTAL_TEST_SCENARIOS.md`

## !!! CODING STANDARDS & ARCHITECTURE RULES  - MANDATORY !!!

Every agent session MUST follow these rules. They exist to prevent features from breaking each other, keep the codebase scalable, and maintain demo reliability (judges will test live).

---

### 1. DO NOT BREAK EXISTING FEATURES

This is the #1 rule. A new feature that breaks an existing one is worse than no feature at all.

**Before modifying ANY existing file:**
- Read the entire file first (not just the section you're changing)
- Understand what other features depend on it
- Check who imports it: use grep for the filename across the codebase
- If a function signature changes, update ALL callers  - not just the one you're working on

**High-risk files (touch with extreme care):**
| File | Why it's dangerous | Who depends on it |
|------|-------------------|-------------------|
| `backend/src/index.ts` | 50+ routes, WebSocket, SSE  - one bad middleware breaks everything | Every frontend page, voice, missions |
| `backend/src/data/driver-session.ts` | Driver state, action items  - changing shape breaks driver portal + voice + missions | Driver portal, voice sessions, mission sync |
| `backend/src/agents/fleetshield-agent.ts` | AI system prompt + all 17 tools  - changes affect every AI response | Operator assistant, voice AI, missions |
| `frontend/src/types/fleet.ts` | Central type definitions  - type changes cascade everywhere | Every frontend component |
| `frontend/src/lib/api.ts` | API client  - breaking a method breaks every page that calls it | Every frontend page |
| `frontend/src/components/layout/AppShell.tsx` | Layout wrapper  - affects every page's rendering | All pages |
| `backend/src/missions/mission-bridge.ts` | Mission store + sync  - breaking this breaks missions + driver training | Missions, driver portal training tab |

**Mandatory verification after changes:**
- Backend compiles: `cd backend && npx tsc --noEmit`
- Frontend compiles: `cd frontend && npx next build` (or at minimum `npx tsc --noEmit`)
- If you touched a route, test it: `curl http://localhost:3000/api/...`
- If you touched driver portal, login with employee `141` / PIN `1073` and verify all 5 tabs
- If you touched missions, run a coaching sweep from operator assistant and verify it completes
- If you touched voice, test both operator and driver voice modes

---

### 2. TYPESCRIPT CONVENTIONS

**Backend (ESM modules):**
```typescript
// ALWAYS use .js extension in imports (required for Node ESM)
import { calculateDriverRisk } from '../scoring/driver-risk-engine.js';
import { seedDrivers } from '../data/seed-data.js';

// NEVER omit the extension  - it will fail at runtime
import { calculateDriverRisk } from '../scoring/driver-risk-engine'; // WRONG
```

**Frontend (Next.js):**
```typescript
// Use @/ path aliases (configured in tsconfig)
import { api } from '@/lib/api';
import type { DriverSession } from '@/types/fleet';

// NEVER use relative paths when @/ alias works
import { api } from '../../lib/api'; // WRONG
```

**Naming conventions:**
| Thing | Convention | Example |
|-------|-----------|---------|
| Functions | camelCase, verb-prefixed | `calculateDriverRisk()`, `getFleetSummary()` |
| Types/Interfaces | PascalCase | `DriverRiskResult`, `InsuranceScore` |
| Components | PascalCase | `HomeTab`, `ScoreGauge` |
| Constants | UPPER_SNAKE_CASE | `CITY_PAIRS`, `MAX_RETRIES` |
| Files (backend) | kebab-case | `driver-risk-engine.ts`, `mission-bridge.ts` |
| Files (components) | PascalCase | `HomeTab.tsx`, `ScoreGauge.tsx` |
| API routes | kebab-case paths | `/api/driver/:id/dispatch-call` |
| State variables | camelCase, descriptive | `actionItems`, `trainingPrograms`, `chatStreaming` |

**Exports:**
- Scoring engines: named function exports (`export function calculateX()`)
- Components: named exports (`export function HomeTab()`)  - no default exports
- Types: named exports from central `types/fleet.ts`
- Tools: `export const toolName = tool({ ... })` (Vercel AI SDK pattern)
- Barrel files: re-export pattern (`export { X } from './x.js'`)

---

### 3. BACKEND ARCHITECTURE RULES

**API Route Pattern (follow for ALL new routes):**
```typescript
app.get('/api/fleet/domain/action', (req, res) => {
  try {
    // 1. Validate input
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'Missing id' });

    // 2. Call function (scoring engine, data provider, etc.)
    const result = calculateSomething(id);
    if (!result) return res.status(404).json({ error: 'Not found' });

    // 3. Return JSON
    res.json(result);
  } catch (error) {
    // 4. Generic error (never leak internals)
    res.status(500).json({ error: 'Failed to process request' });
  }
});
```

**Scoring engines are PURE FUNCTIONS  - keep them that way:**
- No side effects, no external state mutation, no API calls
- Take typed parameters (usually a driverId string), return typed objects
- Return `null` on invalid input  - never throw for validation
- They are called from routes, tools, AND missions  - breaking their signature breaks 3 things

**Adding a new scoring engine:**
1. Create `backend/src/scoring/your-engine.ts`
2. Export pure function: `export function calculateYourThing(id: string): YourResult | null`
3. Add corresponding tool in `backend/src/tools/your-tool.ts`
4. Register tool in `backend/src/tools/index.ts`
5. Add route in `backend/src/index.ts`
6. Add type to `frontend/src/types/fleet.ts`
7. Add API method to `frontend/src/lib/api.ts`

**Adding a new API route:**
1. Add route handler in `backend/src/index.ts` following the try-catch pattern above
2. Add corresponding method in `frontend/src/lib/api.ts`
3. Add TypeScript interface in `frontend/src/types/fleet.ts` if returning new shape

**State management (backend):**
- In-memory Maps for session/store data (e.g., `driverSessions`, `completedMissions`)
- Separate counter variables for ID generation (e.g., `let actionIdCounter = 1`)
- Init functions called on startup (`initDriverSessions()`)
- Simple timestamp-based caching where needed (e.g., leaderboard 60s cache)

---

### 4. FRONTEND ARCHITECTURE RULES

**Component pattern (follow for ALL new components):**
```typescript
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { SomeIcon } from 'lucide-react';
import type { SomeType } from '@/types/fleet';

interface MyComponentProps {
  data: SomeType;
  onAction: (id: string) => void;
}

export function MyComponent({ data, onAction }: MyComponentProps) {
  // State, effects, handlers
  // Return JSX
}
```

**Rules:**
- ALWAYS add `'use client'` directive on interactive components
- ALWAYS define a Props interface directly above the component
- ALWAYS use named exports (not default exports)
- Import order: React → third-party → internal components → types
- Keep components focused  - one component, one responsibility
- If a component exceeds ~200 lines, consider extracting sub-components

**Data fetching pattern:**
```typescript
const [data, setData] = useState<SomeType | null>(null);
const [loading, setLoading] = useState(true);
const fetchedRef = useRef(false); // Guard against React 19 strict mode double-fire

useEffect(() => {
  if (fetchedRef.current) return;
  fetchedRef.current = true;
  async function load() {
    try {
      const result = await api.someEndpoint();
      setData(result);
    } catch { setError('Failed to load data'); }
    finally { setLoading(false); }
  }
  load();
}, []);
```

**Loading/Error states (keep consistent across the app):**
```typescript
// Loading: centered spinner with brand color
if (loading) return (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="w-6 h-6 animate-spin text-[#FBAF1A]" />
  </div>
);

// Error: centered message with retry
if (error) return (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <p className="text-red-400 mb-2">{error}</p>
      <button onClick={load} className="text-[#FBAF1A]">Retry</button>
    </div>
  </div>
);
```

**State management rules:**
- Use `useState` + `useEffect`  - no Redux, no Zustand, no Context API (we don't need it)
- Prop drilling is acceptable and preferred over adding state management complexity
- Each page owns its data fetching  - no shared global state between pages
- Polling: use `setInterval` in `useEffect` with proper cleanup (`return () => clearInterval(id)`)
- Use `useRef` guards to prevent React 19 strict mode double-fetch

---

### 5. TAILWIND & UI STANDARDS

**Color palette (DO NOT deviate):**
| Context | Colors |
|---------|--------|
| Brand accent | `#FBAF1A` (amber/gold), `#BF7408` (darker gold) |
| Operator portal bg | `bg-[#FFF8EB]` (warm cream) |
| Operator borders | `border-[#E5E2DC]` |
| Operator cards | `bg-white rounded-2xl border border-[#E5E2DC] shadow-sm` |
| Driver portal bg | `bg-[#0A0E17]` (dark navy) |
| Driver cards | `bg-[#18202F] rounded-2xl border border-white/10` |
| Driver inner cards | `bg-[#0F1520] rounded-xl` |
| Success/safe | `text-emerald-400`, `bg-emerald-500/20` |
| Warning/moderate | `text-amber-400`, `bg-amber-500/20` |
| Danger/critical | `text-red-400`, `bg-red-500/20` |
| Info | `text-blue-400`, `bg-blue-500/20` |

**Animation pattern (Framer Motion):**
```typescript
// Standard card entrance (use on every card/section)
<motion.div
  initial={{ y: 10, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  transition={{ delay: index * 0.05 }}
>

// Staggered list items
{items.map((item, i) => (
  <motion.div key={item.id}
    initial={{ x: -10, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    transition={{ delay: i * 0.03 }}
  >
))}
```

**Layout conventions:**
- Operator pages: `<PageHeader>` at top, then `<div className="space-y-6">` for sections
- Driver portal: tabs handle their own layout with `overflow-y-auto p-4 space-y-4`
- All interactive elements: minimum 48px touch targets (driver portal is for tablets)
- No CSS modules, no styled-components  - Tailwind utility classes only

---

### 6. TYPE SAFETY & CONTRACTS

**All types live in `frontend/src/types/fleet.ts`:**
- This is the single source of truth for data shapes
- Backend should match these shapes in its responses
- NEVER create inline types when a reusable interface exists in fleet.ts
- When adding a new data shape, add the interface to fleet.ts FIRST, then implement

**When changing a type:**
1. Update the interface in `fleet.ts`
2. Search for all usages: `grep -r "TypeName" frontend/src/`
3. Update every component that uses the changed fields
4. Update the backend route/function that returns this shape
5. Verify both backend and frontend compile

**API contract between backend and frontend:**
- Backend returns JSON matching the TypeScript interfaces in `fleet.ts`
- Frontend `api.ts` methods return typed promises: `fetchJSON<SomeType>('/api/...')`
- If you add a field to a backend response, add it to the corresponding interface in fleet.ts
- If you remove a field, make it optional (`?:`) first, then remove from all consumers, then remove from type

---

### 7. FEATURE ISOLATION & BOUNDARIES

**Module dependency rules (unidirectional  - never circular):**
```
Scoring Engines (pure functions, no imports from other modules)
       ↑
   Tools (call scoring engines, return formatted results)
       ↑
   Agent (orchestrates tools via Vercel AI SDK)
       ↑
   Routes (expose via HTTP) ← Frontend pages (consume via api.ts)

Mission Runner → Scoring Engines (direct calls)
Mission Bridge → Driver Session (one-way: creates action items)
Voice Session → Agent (delegates to AI) → Tools → Scoring Engines
```

**NEVER create circular dependencies:**
- Scoring engines must NEVER import from tools, routes, or missions
- Tools must NEVER import from routes or other tools
- Mission runner must NEVER import from voice or routes
- Components must NEVER import from pages

**Feature isolation checklist (before merging any change):**
- [ ] New code doesn't import from a module that shouldn't know about it
- [ ] No function signatures changed without updating all callers
- [ ] No types changed without updating all consumers
- [ ] Backend compiles (`tsc --noEmit`)
- [ ] Frontend compiles (`next build` or `tsc --noEmit`)
- [ ] Existing routes still return expected shapes
- [ ] Driver portal still loads and all 5 tabs work
- [ ] Operator assistant still responds to questions
- [ ] Voice mode still connects (if voice files were touched)

---

### 8. ADDING NEW FEATURES  - CHECKLIST

**New backend endpoint:**
1. Define return type in `frontend/src/types/fleet.ts`
2. Add route in `backend/src/index.ts` with try-catch pattern
3. Add API method in `frontend/src/lib/api.ts`
4. Test: `curl http://localhost:3000/api/your/endpoint`

**New frontend page:**
1. Create `frontend/src/app/your-page/page.tsx`
2. Add `'use client'` directive
3. Follow data fetching pattern (useState + useEffect + fetchedRef guard)
4. Add loading/error states matching existing patterns
5. Add to sidebar navigation in `Sidebar.tsx` if it's an operator page
6. Verify it renders without breaking other pages

**New component:**
1. Create in the appropriate `components/` subdirectory
2. Define Props interface
3. Use named export
4. Keep < 200 lines; extract sub-components if larger
5. Use existing Tailwind patterns and brand colors

**New scoring engine:**
1. Create in `backend/src/scoring/`
2. Pure function  - no side effects, no external state
3. Return typed result or `null`
4. Add tool wrapper in `backend/src/tools/`
5. Register in tool index
6. Add route, type, and API method

**New mission type:**
1. Add type definition in `backend/src/missions/mission-types.ts`
2. Add handler in `backend/src/missions/mission-runner.ts`
3. If it generates per-driver results, add sync logic in `mission-bridge.ts` → `syncMissionToDrivers()`
4. Update `deployMission` tool to recognize the new type
5. Test end-to-end: operator asks → mission runs → results appear

**New driver portal tab:**
1. Create tab component in `frontend/src/components/driver/`
2. Add tab type to `DriverTab` union in `page.tsx`
3. Add tab entry in `DriverTabBar.tsx`
4. Add tab rendering case in `page.tsx` orchestrator
5. Verify all other tabs still work after adding

---

### 9. COMMON MISTAKES TO AVOID

| Mistake | Why it's bad | What to do instead |
|---------|-------------|-------------------|
| Editing `index.ts` without reading the whole file | Easy to break routes, middleware, or WebSocket handler | Read the full file first, understand the structure |
| Changing a type in `fleet.ts` without updating consumers | Causes runtime errors in components that use the old shape | Grep for the type name, update all usages |
| Adding a backend import without `.js` extension | Compiles but crashes at runtime (ESM requirement) | Always use `.js` extension: `from './file.js'` |
| Forgetting `'use client'` on interactive components | Next.js server component errors, hydration mismatches | Add it to ANY component with useState, useEffect, or event handlers |
| Mutating state in scoring engines | Breaks the pure function contract, causes stale data bugs | Scoring engines must be stateless  - return new objects |
| Using `git add -A` or `git add .` | May commit `.env`, credentials, or unrelated files | Stage specific files by name |
| Creating new state management (Context, Redux) | Adds complexity, no existing pattern to follow, hard to debug | Use useState + prop drilling  - it works fine for this app |
| Adding npm packages without checking bundle size | Bloats the frontend, slows load times  - judges notice | Use existing packages first (Tailwind, Framer Motion, Lucide, Recharts) |
| Hardcoding colors instead of using brand palette | Inconsistent UI  - judges score UX | Use the color palette table above |
| Not testing after changes | Broken features discovered during demo = lost points | Always verify: compile check + manual test of affected features |

---

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
- React 19 strict mode double-fires effects  - guard refs prevent duplicate fetches
- Driver portal page.tsx is a slim orchestrator (~260 lines)  - all UI is in `components/driver/`
- Driver portal polls backend every 30s for action items and training programs
- ActionItem type has `category` (coaching/wellness/safety/general), `priority` (low/medium/high/urgent), and optional `missionId`
- Completed operator missions (coaching_sweep, wellness_check, safety_investigation) auto-sync action items to affected drivers
- `DRIVER_PORTAL_TEST_SCENARIOS.md` has comprehensive test scenarios, voice questions, and a recommended 3-min demo flow

## Production Deployment (Vercel + Local Backend + ngrok)

The frontend is deployed on **Vercel** at `https://fleetshieldai.vercel.app/`.
The backend runs **locally** and is exposed via **ngrok**.

### Architecture
```
Browser → fleetshieldai.vercel.app (Vercel)
  → /api/* requests hit middleware (frontend/src/middleware.ts)
  → middleware rewrites to NEXT_PUBLIC_API_URL (ngrok URL)
  → ngrok tunnel → localhost:3000 (local backend)
```

### How It Works
- `frontend/src/middleware.ts` intercepts all `/api/*` requests
- When `NEXT_PUBLIC_API_URL` is set, middleware rewrites requests to that URL
- It adds `ngrok-skip-browser-warning: true` header to bypass ngrok interstitial
- When `NEXT_PUBLIC_API_URL` is NOT set (local dev), `next.config.ts` rewrites to `localhost:3000`

### Deployment Steps (Run These Exact Commands)

**Step 1: Start the backend**
```bash
cd backend && npm run dev
# Verify: curl http://localhost:3000/api/fleet/data-source
```

**Step 2: Start ngrok tunnel**
```bash
ngrok http 3000
# Note the https URL (e.g., https://xxxx-xx-xx-xx-xx.ngrok-free.app)
```

**Step 3: Get the ngrok URL programmatically**
```bash
curl -s http://localhost:4040/api/tunnels | python3 -c "import sys,json; t=json.load(sys.stdin)['tunnels']; print(t[0]['public_url'])"
```

**Step 4: Verify ngrok tunnel works**
```bash
curl -s -H "ngrok-skip-browser-warning: true" <NGROK_URL>/api/fleet/data-source
# Should return: {"isLiveData":true,"geotabConfigured":true,"database":"demo_my_geo_trucks"}
```

**Step 5: Update Vercel env var and redeploy**
```bash
cd frontend
vercel env rm NEXT_PUBLIC_API_URL production -y
echo "<NGROK_URL>" | vercel env add NEXT_PUBLIC_API_URL production
vercel --prod
```

**Step 6: Verify end-to-end**
```bash
curl -s https://fleetshieldai.vercel.app/api/fleet/data-source
# Should return same JSON as Step 4
```

### Important Notes
- ngrok URL **changes every restart**  - repeat Steps 2-5 each time
- The Vercel project is linked in `frontend/` directory (run vercel commands from there)
- Keep both `ngrok` and `backend` running during demos
- Vercel project name: `frontend` under `klickgenais-projects`
- Frontend local dev (port 3001) is independent  - it uses `next.config.ts` rewrites to `localhost:3000`

### Quick One-Liner for Repeat Deployments
After ngrok is already running:
```bash
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | python3 -c "import sys,json; t=json.load(sys.stdin)['tunnels']; print(t[0]['public_url'])") && cd frontend && vercel env rm NEXT_PUBLIC_API_URL production -y && echo "$NGROK_URL" | vercel env add NEXT_PUBLIC_API_URL production && vercel --prod
```

## Geotab Vibe Guide Reference
The official competition guide repo: https://github.com/fhoffa/geotab-vibe-guide
Key resources for AI agents:
- `AGENT_SUMMARY.md` - Repo orientation
- `skills/geotab/SKILL.md` - Complete Geotab development skill
- `skills/geotab/references/ACE_API.md` - Ace API guide
- `skills/geotab/references/API_QUICKSTART.md` - MyGeotab API quickstart
- `guides/HACKATHON_IDEAS.md` - Project ideas and judging criteria
