# FleetShield AI — Our Story

## The Problem

The commercial trucking industry moves $940 billion in freight annually — and faces a crisis hiding in plain sight. Every year, fleet operators lose billions to a toxic combination of:

- **Preventable accidents** — 500,000+ large truck crashes per year (FMCSA), costing an average of $91,000 per incident
- **Insurance premium overcharges** — underwriters can't see behavioral improvements, so fleets overpay 18-32%
- **Driver turnover** — 87% annual rate (ATA), with each replacement costing $35,000+
- **Driver health crisis** — life expectancy of 61 years (16 below national average), 25% report chronic loneliness
- **Carbon emissions** — 444M metric tons CO2/year from trucking, with billions in avoidable fuel waste

The data to prevent all of this already exists — in **Geotab telematics devices** installed in millions of vehicles worldwide. But fleet managers are drowning in raw data with no way to translate it into actionable decisions, dollar savings, or environmental impact.

## Our Solution: FleetShield AI

FleetShield AI is the intelligence layer that transforms Geotab telematics into three things fleet managers desperately need:

1. **Money saved** — Quantified insurance premium reductions, accident prevention savings, and fuel optimization with exact dollar figures. Not "you should reduce speeding" but "reducing speeding by 15% would save $23,400/year."

2. **Lives protected** — AI-powered predictive safety that identifies at-risk drivers and dangerous corridors *before* incidents happen. Proactive wellness check-ins and HOS compliance gauges give drivers agency over their own wellbeing.

3. **Planet preserved** — Sustainability analytics that convert driving behavior into carbon footprint metrics with actionable recommendations for fleet decarbonization and EV transition readiness.

## What Makes It Different

**For Fleet Managers**: Not just dashboards — an AI workforce. Autonomous Mission Agents take assignments ("Run a coaching sweep on my riskiest drivers"), execute multi-step analyses across the entire fleet, and deliver comprehensive reports with findings, root causes, dollar impact, and action plans. The work of an analyst in hours, delivered in minutes.

**For Drivers**: A voice-first AI companion (Tasha) that coaches instead of surveils. Drivers talk to Tasha hands-free for pre-shift briefings, safety coaching, HOS status, and load updates. When they need dispatch, Tasha places a **real phone call** to a human dispatcher, has the conversation on their behalf, and relays the result — all without the driver touching a screen.

**For the Planet**: The first fleet platform that ties driving behavior directly to CO2 emissions, identifies EV transition candidates, and quantifies the environmental impact of every operational decision.

## The Vibe Coding Journey

FleetShield AI was built in ~10 days using AI-assisted development ("vibe coding") with Claude Code and Claude Opus 4.6. The entire platform — 50+ API endpoints, 25+ frontend pages, 17 AI tools, 9 scoring engines, 5 mission types, real-time voice pipeline, and Twilio telephony integration — was conceived through natural language conversations and refined iteratively.

### Development Timeline
- **Days 1-2**: Geotab API integration — connected to MyGeotab for real fleet data and Geotab Ace for conversational analytics
- **Days 3-4**: Core intelligence — 9 scoring engines for insurance, risk, wellness, predictive safety, sustainability, alert triage, ROI, gamification, and what-if simulation
- **Days 5-6**: Voice AI pipeline — real-time STT/TTS with Smallest AI, voice activity detection, dispatch delegation, natural conversation flow
- **Days 7-8**: Driver portal — tab-based layout, 11 components, mission-to-driver sync, gamification
- **Days 9-10**: Real Twilio dispatch calls (Media Streams), HOS compliance, wellness check-ins, STT reliability fixes, polish

The prompts used throughout development are documented in `PROMPTS_USED.md`.

## Dual-API Integration

FleetShield AI uses both required Geotab APIs:

- **MyGeotab API** (`my.geotab.com`): Fetches real vehicle data, trip histories, engine diagnostics, GPS breadcrumbs, safety exception events, and driver information via JSON-RPC. The app refreshes live data every 5 minutes.

- **Geotab Ace API**: Powers conversational analytics where fleet managers can ask natural language questions about their fleet data ("What are my speeding trends?", "Which vehicles need maintenance?"). Ace is available both as a standalone widget and as one of Tasha's 17 tools.

## Technology Stack

- **Frontend**: Next.js 16 + React 19, Tailwind CSS 4, Framer Motion, Recharts, Leaflet maps
- **Backend**: Express + TypeScript (ESM), WebSocket for real-time voice and media streams
- **AI**: Claude Opus 4.6 via Vercel AI SDK (17 specialized fleet tools + mission summaries)
- **Voice**: Smallest AI Pulse (STT) + Waves (TTS) with custom VAD pipeline
- **Telephony**: Twilio Media Streams for real outbound dispatch calls
- **Maps**: Leaflet with real-time GPS tracking and speeding hotspot overlay

## Impact by the Numbers

| Metric | Value |
|--------|-------|
| Potential annual fleet savings | **$521,600** |
| CO2 reduction from sustainability recommendations | **992 tons/year** |
| Insurance premium reduction potential | **18-32%** |
| Identified savings (safety + retention + fuel) | **$147,000** |
| Analyst work replaced by Mission Agents | **15-20 hours/week** |
| Drivers coached by AI, not surveilled | **30** |
| Real phone calls to dispatch | **Fully automated via Twilio** |
