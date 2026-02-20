# FleetShield AI - Our Story

## The Problem

The commercial trucking industry faces a crisis hiding in plain sight. Every year, fleet operators lose billions to a toxic combination of:

- **Preventable accidents** costing an average of $91,000 per incident
- **Insurance premium overcharges** because underwriters can't see behavioral improvements
- **Driver turnover** at 87% annual rates, with each replacement costing $35,000+
- **Unnecessary carbon emissions** from excessive idling and inefficient driving patterns

The data to prevent all of this already exists -- in Geotab telematics devices installed in millions of vehicles worldwide. But fleet managers are drowning in raw data with no way to translate it into actionable decisions, dollar savings, or environmental impact.

## Our Solution: FleetShield AI

FleetShield AI is the intelligence layer that transforms Geotab telematics into three things fleet managers desperately need:

1. **Money saved** -- Quantified insurance premium reductions, accident prevention savings, and fuel optimization with exact dollar figures
2. **Lives protected** -- AI-powered predictive safety that identifies at-risk drivers and dangerous corridors *before* incidents happen
3. **Planet preserved** -- Sustainability analytics that convert driving behavior into carbon footprint metrics with actionable recommendations for fleet decarbonization

### What Makes It Different

**For Fleet Managers**: A unified intelligence platform that answers "how much is this costing us?" and "what should we do about it?" -- not just dashboards, but AI-generated recommendations with projected ROI for every action.

**For Drivers**: A voice-first AI companion (Tasha) that coaches instead of surveils. Drivers talk to Tasha hands-free for pre-shift briefings, safety coaching, load updates, and even dispatch communication -- all through natural conversation.

**For the Planet**: The first fleet platform that ties driving behavior directly to CO2 emissions, identifies EV transition candidates, and quantifies the environmental impact of every operational decision.

## The Vibe Coding Journey

FleetShield AI was built in 7 days using AI-assisted development ("vibe coding"). Every major feature was conceived through natural language conversations with Claude, then refined iteratively:

- **Day 1-2**: Geotab API integration -- connected to MyGeotab for real fleet data (vehicles, trips, diagnostics, GPS, safety events) and Geotab Ace for conversational fleet analytics
- **Day 3-4**: Core intelligence engines -- 9 scoring engines for insurance, risk, wellness, predictive safety, sustainability, alert triage, ROI, gamification, and what-if simulation
- **Day 5-6**: Voice AI pipeline -- real-time STT/TTS with Smallest AI, voice activity detection, dispatch delegation, and natural conversation flow
- **Day 7**: Polish, sustainability dashboard, demo preparation

The entire codebase was developed through iterative prompting -- describing features in plain English, reviewing generated code, and refining until production quality.

## Dual-API Integration

FleetShield AI uses both required Geotab APIs:

- **MyGeotab API** (`my.geotab.com`): Fetches real vehicle data, trip histories, engine diagnostics, GPS breadcrumbs, safety exception events, and driver information. The app refreshes live data every 5 minutes.

- **Geotab Ace API**: Powers the conversational analytics widget where fleet managers can ask natural language questions about their fleet data ("What are my speeding trends?", "Which drivers need maintenance attention?"). Ace is also available through the AI assistant chat.

## Technology Stack

- **Frontend**: Next.js 16 + React 19, Tailwind CSS, Framer Motion, Recharts, Leaflet maps
- **Backend**: Express + TypeScript, WebSocket for real-time voice
- **AI**: Claude via Vercel AI SDK (23 specialized fleet tools)
- **Voice**: Smallest AI (STT/TTS) with custom VAD pipeline
- **Maps**: Leaflet with real-time GPS tracking

## Impact by the Numbers

- **$521,600/year** potential savings from EV fleet transition (20 vehicles identified)
- **992 tons CO2/year** reducible through sustainability recommendations
- **18-32%** insurance premium reduction potential from behavioral improvements
- **$147,000** in identified fleet savings across safety, retention, and fuel
- **30 drivers** coached by AI companion, not surveilled by management
