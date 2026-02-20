# Prompts & Vibe Coding Journey

> This document captures key prompts used during AI-assisted development of FleetShield AI. The entire project was built through iterative conversations with Claude (Anthropic), demonstrating the "vibe coding" approach.

## Architecture & Setup

### Initial Project Scaffold
```
Build me a fleet safety analytics platform with:
- Express backend (TypeScript, ESM) on port 3000
- Next.js frontend on port 3001
- Geotab API integration for real fleet telematics
- Claude AI agent with specialized fleet tools
- WebSocket for real-time voice communication
```

### Geotab API Integration
```
Connect to the MyGeotab API using JSON-RPC. I need to:
1. Authenticate with session credentials
2. Fetch devices (vehicles), users (drivers), trips, exception events
3. Get real-time device positions and GPS breadcrumbs
4. Map Geotab entities to our internal data model
5. Fall back gracefully to seed data when credentials aren't configured
```

### Geotab Ace Integration
```
Integrate the Geotab Ace API for conversational fleet analytics.
Use the 3-step pattern: createChat → sendPrompt → pollResult.
Add exponential backoff on polling and a 30-second timeout.
Expose it both as a standalone widget and as a tool for the AI agent.
```

## Scoring Engines

### Insurance Score Engine
```
Create a fleet insurability score engine (0-100) with 4 weighted components:
- Safe Driving (35%): event frequency, severity, trends
- Compliance (25%): HOS violations, seatbelt, speed
- Maintenance (20%): fault codes, vehicle age, mileage
- Driver Quality (20%): tenure, training, risk distribution
Map to letter grades A+ through F. Calculate premium impact.
```

### Wellness & Burnout Predictor
```
Build a driver burnout prediction model using 6 telematics-derived signals:
1. Excessive driving hours (>11hr/day)
2. Short rest periods (<8hr between shifts)
3. Night driving pattern changes
4. Consecutive long work days
5. Increasing event frequency
6. Route deviation patterns
Calculate burnout probability and quantify retention cost at risk.
```

### Green Fleet Sustainability Engine
```
Create a sustainability scoring engine that calculates:
- Fleet carbon footprint (fuel consumed × 2.31 kg CO2/liter diesel)
- Fuel efficiency per driver (km/L vs vehicle class benchmarks)
- Idle emissions waste (idle hours × 3.8L/hr × CO2 factor)
- Green Score (A-F) composite of efficiency + idle + eco-driving + fleet modernity
- EV transition readiness (analyze trip patterns vs 2026 EV range capabilities)
- Actionable recommendations with projected savings and CO2 reduction
```

## Voice AI Pipeline

### Voice Session Architecture
```
Build a real-time voice pipeline for truck drivers:
1. Browser captures audio via MediaRecorder
2. WebSocket streams audio chunks to backend
3. Smallest AI Pulse (STT) transcribes speech
4. Claude processes with fleet context (driver ID, safety score, current load)
5. Smallest AI Waves (TTS) synthesizes response
6. Audio streams back to browser for playback

Add voice activity detection (VAD) with energy threshold,
barge-in support so drivers can interrupt, and natural pause timing.
```

### Dispatch Delegation
```
Enable Tasha (voice AI) to autonomously delegate to dispatch:
When a driver says "call dispatch" or "talk to Mike", Tasha should:
1. Collect the driver's intent/request
2. Simulate a phone call to dispatch (Mike)
3. Have an AI-generated conversation with Mike on the driver's behalf
4. Report back to the driver with the outcome
This should feel like Tasha is actually calling dispatch, not just relaying a message.
```

## Frontend Pages

### Driver Portal
```
Create a voice-first driver dashboard for truck-mounted tablets:
- Full-screen, dark theme (slate-900), no sidebar
- Left 8 columns: Voice AI hero with animated mic orb, conversation display
- Right 4 columns: Safety score gauge, pre-shift briefing, current load,
  daily challenge, leaderboard, badges
- Large touch targets (52px+ buttons) for use while stationary
- PIN-based login (3-digit employee number + 4-digit PIN)
```

### Sustainability Dashboard
```
Create a Green Fleet sustainability page matching our design system:
- Hero row: Green Score gauge + Carbon Footprint card + Quick stats
- Tab navigation: Recommendations & Trends | Driver Green Scores | EV Readiness
- Actionable recommendations with priority, difficulty, time-to-impact, and projected savings
- Monthly sustainability trend visualization
- Top idle offenders list with fuel waste and CO2 impact
- Driver eco-driving leaderboard ranked by green score
- EV vehicle readiness cards with readiness percentage and conversion analysis
```

## AI Agent & Tools

### FleetShield Agent (Tasha)
```
Create an AI assistant named Tasha with role detection:
- Fleet Managers: analytical, data-driven, dollar-quantified responses
- Drivers: warm, encouraging, celebrates good scores
Give her 23+ specialized tools covering fleet overview, risk scoring,
insurance analysis, wellness prediction, safety events, financial impact,
coaching recommendations, Ace analytics, predictive safety, alert triage,
driver dashboard, load management, dispatch calls, sustainability metrics,
and report generation.
```

## Key Design Decisions Made Through Prompting

1. **Why voice-first for drivers?** Truck drivers can't use touchscreens while driving. Voice is the only safe interface.
2. **Why insurance scoring?** Fleet managers think in dollars. Connecting behavior to premiums makes safety investments tangible.
3. **Why sustainability?** Fleet decarbonization is a $B opportunity. Operators need data to justify EV transitions and idle reduction policies.
4. **Why gamification?** Drivers respond better to coaching and competition than surveillance. Points, badges, and leaderboards drive engagement.
5. **Why Ace integration?** Natural language queries let non-technical managers explore their data without learning query tools.
