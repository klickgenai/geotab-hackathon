# CLAUDE.md - FleetShield AI Development Guide

## Project Overview
FleetShield AI is a Predictive Fleet Safety & Insurance Intelligence Platform built for the Geotab Hackathon. It combines real-time telematics data with AI-powered analytics to optimize fleet safety, reduce insurance premiums, and prevent incidents.

## Architecture

### Monorepo Structure
```
/backend   - Express + WebSocket server (TypeScript, port 3000)
/frontend  - Next.js 16 + React 19 app (TypeScript, port 3001)
```

### Backend Stack
- **Runtime**: Node.js with ESM modules
- **Framework**: Express 4.21 + ws 8.18 (WebSocket)
- **AI**: Vercel AI SDK 4.3 + Anthropic Claude Sonnet 4.5
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
- `src/index.ts` - Main server, all API routes, WebSocket handler
- `src/data/seed-data.ts` - 30 drivers, 25 vehicles, 1000+ safety events
- `src/data/driver-session.ts` - Driver portal state management
- `src/data/dispatcher-ai.ts` - Claude-powered dispatcher call simulation
- `src/scoring/` - All scoring engines (risk, insurance, wellness, predictive, alert triage, ROI, what-if)
- `src/services/` - Geotab API integration, live fleet GPS simulation
- `src/tools/` - 14+ Claude agent tools
- `src/voice/` - Full voice pipeline (STT, TTS, VAD, session orchestration)
- `src/agents/` - FleetShield AI agent configuration

### Frontend
- `src/app/` - Next.js App Router pages
- `src/app/page.tsx` - Fleet Manager Dashboard
- `src/app/predictive/page.tsx` - Predictive Safety Dashboard
- `src/app/alerts/page.tsx` - AI Alert Triage
- `src/app/map/page.tsx` - Live Fleet Map (Leaflet)
- `src/app/roi/page.tsx` - ROI Dashboard + What-If Simulator
- `src/app/driver-portal/page.tsx` - Driver Voice AI Dashboard
- `src/components/chat/ChatPanel.tsx` - AI Assistant (SSE streaming)
- `src/components/layout/` - Sidebar, AppShell, PageHeader
- `src/lib/api.ts` - API client with all endpoints
- `src/lib/voice-client.ts` - WebSocket voice client
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

### Frontend Page Pattern
Each page follows the same structure:
1. Import `api` from `@/lib/api`
2. Import `PageHeader` from `@/components/layout/PageHeader`
3. Use `useState` + `useEffect` for data fetching
4. Use `motion` from Framer Motion for animations
5. Use Tailwind utility classes (no CSS modules)

### Driver Portal
- Has its own layout (no sidebar) - detected via pathname in `AppShell.tsx`
- Dark theme (slate-900 background)
- Full-screen experience for truck-mounted tablets
- Voice AI via WebSocket connection to backend

### Scoring Engines
All scoring engines in `backend/src/scoring/` are pure functions that operate on seed data.
They return typed objects and don't have side effects.

## Environment Variables
See `backend/.env.example` for required variables:
- `GEOTAB_DATABASE`, `GEOTAB_USERNAME`, `GEOTAB_PASSWORD` - Geotab API credentials
- `ANTHROPIC_API_KEY` - For Claude AI agent and dispatcher
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
- Leaflet is loaded via CDN (not npm) to avoid SSR issues
- The frontend proxies all `/api/*` requests to the backend
- The MyGeotab add-in is in `backend/addin/` (iframe bridge pattern)
