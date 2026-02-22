# Vibe Coding Journey — FleetShield AI

> How Claude Code built a full-stack fleet intelligence platform from scratch in 10 days

---

## The Story

FleetShield AI was built entirely through **vibe coding** with **Claude Code** (Claude Opus 4.6). Every line of code — backend, frontend, scoring engines, voice AI pipelines, autonomous mission agents — was generated through natural language conversation with Claude.

The project started from a blank directory on February 12, 2026. By February 22, it had grown into a **33-commit**, **15,000+ line** production application with 15 operator pages, a driver portal, dual voice AI systems, 9 scoring engines, and real Geotab API integration.

No boilerplate generators, no starter templates, no copy-paste from Stack Overflow. Just a developer and an AI pair programmer having a conversation.

---

## Development Timeline

| Day | What Was Built | Key Prompt Theme |
|-----|---------------|-----------------|
| 1 | Express backend, seed data (30 drivers, 25 vehicles, 1000+ events), first 5 scoring engines | "Build me a fleet safety scoring platform..." |
| 2 | Next.js frontend, dashboard, insurance page, driver risk table | "Create a polished operator dashboard..." |
| 3 | AI assistant (Tasha) with Claude, SSE streaming, 10 tools | "Add an AI assistant that can answer fleet questions..." |
| 4 | Full-screen voice AI with STT/TTS pipeline | "Make the assistant voice-first..." |
| 5 | Driver portal with 5-tab mobile layout, gamification | "Build a separate driver-facing portal..." |
| 6 | Autonomous mission agents (5 types) | "I want AI agents that run in the background..." |
| 7 | Geotab MyGeotab API integration, live GPS map | "Connect to real Geotab telematics data..." |
| 8 | Geotab Ace API, data connector, dual-API | "Add the Ace conversational API..." |
| 9 | Driver voice AI, dispatch calls, HOS, wellness | "Drivers need voice AI too..." |
| 10 | Polish, sustainability dashboard, ROI, deployment | "Make it competition-ready..." |

---

## Key Prompts That Shaped the Platform

### 1. The Foundation
```
Build me a fleet safety analytics platform using Express + TypeScript backend
and Next.js frontend. The backend should have scoring engines that analyze
driver risk from telematics data — things like harsh braking, speeding,
seatbelt compliance, idling. Generate realistic seed data for 30 drivers
and 25 vehicles with 90 days of safety events.
```

**What Claude built**: Complete backend with ESM TypeScript, seed data generator with realistic distributions, and the first 3 scoring engines (driver risk, insurance, wellness).

### 2. The Insurance Intelligence Engine
```
Create an insurance scoring system that grades the fleet A+ through F based
on 4 weighted components. Each component should have detailed metrics. Add a
what-if simulator that lets operators adjust behavior metrics and see how it
affects their insurance score and premium.
```

**What Claude built**: `insurance-score-engine.ts` (pure function, 200+ lines), the what-if simulator, and a polished insurance dashboard with animated gauges and interactive sliders.

### 3. Making Tasha Come Alive
```
Add an AI assistant named Tasha. She should have access to all our scoring
engines as tools — fleet overview, driver risk, insurance score, wellness,
safety events, financial impact, coaching recommendations. She should be
analytical with fleet managers but warm with drivers. Use Claude via the
Vercel AI SDK with streaming.
```

**What Claude built**: Full agent system with 17 tools, SSE streaming, rich inline component rendering for tool results, and a context-aware system prompt that adapts between operator and driver modes.

### 4. Voice AI — The Breakthrough Moment
```
Make the assistant voice-first. Add speech-to-text using Smallest AI Pulse
for real-time transcription and Waves for text-to-speech. The operator should
be able to talk to Tasha and hear her respond with a natural voice. Show a
waveform visualization while she's speaking.
```

**What Claude built**: WebSocket voice pipeline with VAD (voice activity detection), streaming STT, TTS with Web Audio API playback, animated waveform visualization, and a generation-counter mutex to prevent overlapping audio from React strict mode.

### 5. Autonomous Mission Agents
```
I want AI agents that work like employees. When I say "run a coaching sweep",
an agent should analyze every driver in the fleet, check their risk scores
and wellness, build personalized coaching plans, and deliver a full report —
all running in the background while I keep chatting with Tasha.
```

**What Claude built**: 5 mission types (coaching sweep, wellness check, safety investigation, insurance optimization, pre-shift sweep), an EventEmitter-based progress bridge, SSE streaming for live progress updates, and a mission-to-driver sync system that automatically creates action items for drivers.

### 6. The Driver Portal
```
Build a separate driver-facing portal optimized for truck-mounted tablets.
Dark theme, 5 tabs: Home (safety score, briefing), Training (from operator
missions), Voice (talk to Tasha), Load (delivery management), Rank
(leaderboard, badges, rewards). Make it feel like a modern mobile app
with bottom tab navigation.
```

**What Claude built**: Complete driver portal with 11 components, floating mic button, dispatch call overlay, gamification engine (badges, levels, XP, streaks, daily challenges), and 30-second polling for real-time updates from operator missions.

### 7. Real Geotab Integration
```
Connect to the real Geotab MyGeotab API. Fetch devices, users, trips,
exception events, GPS positions, and fault data. Use the demo database
credentials. The scoring engines should work with real Geotab data.
When Geotab is connected, show live GPS on the map.
```

**What Claude built**: `geotab-core.ts` (JSON-RPC wrapper with 12 API methods, MultiCall batching), `geotab-auth.ts` (session caching for 23hrs), `fleet-data-provider.ts` (real-to-seed mapping with risk profiling), and `live-fleet.ts` (real-time GPS from `getDeviceStatusInfo()`).

### 8. Dual-API with Geotab Ace
```
Add the Geotab Ace conversational AI API. It uses a 3-step async pattern:
create chat, send prompt, poll for result. Add it as a tool for Tasha and
also surface it directly on the dashboard so judges can see both APIs
working together.
```

**What Claude built**: `geotab-ace.ts` (3-step polling with exponential backoff), `AceInsights.tsx` (dashboard widget with quick query chips), and the `queryAceAnalytics` tool integrated into the AI assistant.

---

## The Claude Code Workflow

### How We Worked Together

1. **Describe what I want** in natural language — the problem, not the solution
2. **Claude explores** the codebase, reads existing files, understands patterns
3. **Claude proposes** an approach (or asks clarifying questions)
4. **Claude implements** — writing TypeScript, creating components, adding routes
5. **Claude verifies** — running `tsc --noEmit`, checking for type errors
6. **I test** in the browser and give feedback
7. **Iterate** — "The gauge looks great but make the animation smoother" or "Add error handling for when the API is down"

### What Made It Effective

- **Context accumulation**: Claude remembered architectural decisions across sessions via `CLAUDE.md` and memory files
- **Pattern consistency**: Once a pattern was established (e.g., scoring engines are pure functions), Claude applied it consistently to every new engine
- **Fearless refactoring**: Claude could safely refactor across files because it understood the full dependency graph
- **Rapid iteration**: What would take hours of manual coding happened in minutes — describe the feature, get working code, refine

### The CLAUDE.md Strategy

We maintained a comprehensive `CLAUDE.md` file (500+ lines) that served as the project's "constitution" — coding standards, architecture rules, naming conventions, color palette, common mistakes to avoid. Every Claude Code session loaded this automatically, ensuring consistency even across long sessions.

---

## Technical Highlights Built Via Vibe Coding

| Feature | Complexity | Prompt-to-Working |
|---------|-----------|------------------|
| 9 scoring engines (pure functions) | High — 2000+ lines of domain logic | ~2 hours |
| WebSocket voice pipeline with VAD | Very High — real-time audio processing | ~3 hours |
| 17-tool AI agent with streaming | High — tool orchestration + rendering | ~2 hours |
| Mission agent system | High — EventEmitter bridge + SSE + sync | ~2 hours |
| Geotab API integration (3 APIs) | Medium — JSON-RPC + OData + Ace | ~2 hours |
| 15 operator pages with animations | Medium — consistent patterns | ~4 hours |
| Driver portal (11 components) | Medium — mobile-first tablet UI | ~3 hours |
| Gamification engine | Medium — XP, levels, badges, streaks | ~1 hour |

---

## What "Vibe Coding" Means to Us

Vibe coding isn't about letting AI do everything without thinking. It's about **working at the speed of ideas** — describing what you want in the language of the problem domain ("drivers need to see their burnout risk") rather than the implementation domain ("create a React component with a circular SVG gauge").

The developer brings **domain expertise, taste, and judgment**. The AI brings **speed, consistency, and tireless attention to detail**. Together, we built in 10 days what would have taken a team of 3-4 engineers several weeks.

Every feature in FleetShield AI started as a natural language description and ended as production-quality TypeScript. That's the vibe.
