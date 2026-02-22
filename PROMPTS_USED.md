# Prompts & Vibe Coding Journey

> This document captures key prompts used during AI-assisted development of FleetShield AI with Claude Code (Claude Opus 4.6). The entire project was built through iterative conversations, demonstrating the "vibe coding" approach.

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

### Driver Risk Engine
```
Build a driver risk score (0-100) weighted composite of:
- Safety Events (40%): Event frequency and severity
- Driving Behavior (25%): Speeding, harsh braking, acceleration patterns
- Compliance (20%): HOS violations, maintenance adherence
- Wellness (15%): Fatigue indicators, shift patterns
```

## Voice AI Pipeline

### Voice Session Architecture
```
Build a real-time voice pipeline for truck drivers:
1. Browser captures audio via AudioContext (16kHz mono)
2. WebSocket streams PCM16 binary chunks to backend
3. Smallest AI Pulse (STT) transcribes speech per-utterance
4. Claude processes with fleet context (driver ID, safety score, current load)
5. Smallest AI Waves (TTS) synthesizes response sentence-by-sentence
6. Audio streams back to browser for playback

Add voice activity detection (VAD) with energy threshold,
barge-in support so drivers can interrupt, and natural pause timing.
Sentence-level TTS streaming for low-latency first-word playback.
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

## Real Twilio Dispatch Calls

### Twilio Media Streams Integration
```
Upgrade the dispatch call from simulated to real:
When a driver says "call dispatch", Tasha should place a REAL phone call via Twilio,
have a real conversation with a human dispatcher using Media Streams, and relay the result.

Use the existing audio pipeline (audio-convert.ts, stt-pipeline.ts, tts-synthesize.ts).
The new piece is Twilio call management and the phone-specific Claude prompt.

Audio pipeline:
- Inbound: Twilio mulaw 8kHz → mulawToLinear16 → resample 16kHz → Pulse STT
- Outbound: Claude response → Waves TTS 24kHz → resample 8kHz → linear16ToMulaw → Twilio

Key challenges:
- Silence detection in continuous 20ms Twilio packets (don't reset timer on silent packets)
- Batch STT per utterance (fresh PulseSTTPipeline per silence gap)
- Echo prevention (clear buffer during TTS playback)
- Idempotent endCall() (WebSocket close, webhook, and timeout can all fire)
- Graceful fallback to AI-simulated dispatch when Twilio not configured
```

### STT Reliability Fix
```
Fix STT transcription failures on shorter utterances during Twilio dispatch calls.
Root cause: audio sent as burst (no pacing), Pulse STT never starts processing before
the "end" signal arrives.

Fix:
1. Paced audio sending (8ms delay every 3 chunks) to let Pulse start processing
2. Post-send wait (800-2500ms) before calling endUtterance
3. Retry logic: if STT returns empty despite 20+ voiced chunks, retry with slower pacing
4. Longer endUtterance timeout (8-20s scaled by audio duration)
```

## Driver Portal

### Tab-Based Layout
```
Create a voice-first driver dashboard for truck-mounted tablets:
- Full-screen, dark theme (slate-900), no sidebar
- Tab-based: Home | Training | Voice (center, larger) | Load | Rank
- Floating amber mic button on all tabs except Voice
- 11 components in components/driver/ — page.tsx is a slim orchestrator
- Large touch targets (48px+ buttons) for tablet use
- PIN-based login (3-digit employee number + 4-digit PIN)
```

### HOS Compliance Widget
```
Add Hours of Service compliance gauges to the Home tab:
- Two compact gauges: "Drive: Xhr Xmin left" | "Duty: Xhr Xmin left"
- Color-coded: Green (>4hrs), Amber (2-4hrs), Red (<2hrs)
- "Next break in Xhr Xmin" text
- Calculate from seed trip data (sum today's trip durations, subtract from limits)
```

### AI Wellness Check-In
```
Add a wellness check-in card to the Home tab:
- "How are you feeling?" header
- 5 mood buttons: Great / OK / Tired / Stressed / Not Good
- After selection: supportive message + weekly trend indicator
- Privacy-first: no individual mood shared with operator, only aggregate trends
- Integrate with voice: if driver checked in as tired, Tasha is empathetic
```

### Sustainability Dashboard
```
Create a Green Fleet sustainability page matching our design system:
- Hero row: Green Score gauge + Carbon Footprint card + Quick stats
- Tab navigation: Recommendations & Trends | Driver Green Scores | EV Readiness
- Actionable recommendations with priority, difficulty, projected savings
- Monthly sustainability trend visualization
- Top idle offenders with fuel waste and CO2 impact
- Driver eco-driving leaderboard
- EV vehicle readiness cards with conversion analysis
```

## AI Agent & Tools

### FleetShield Agent (Tasha)
```
Create an AI assistant named Tasha with role detection:
- Fleet Managers: analytical, data-driven, dollar-quantified responses
- Drivers: warm, encouraging, celebrates good scores
Give her 17 specialized tools covering fleet overview, risk scoring,
insurance analysis, wellness prediction, safety events, financial impact,
coaching recommendations, Ace analytics, predictive safety, alert triage,
driver dashboard, load management, dispatch calls, sustainability metrics,
and report generation.
```

### Autonomous Mission Agents
```
Create a mission system where Tasha can deploy autonomous background agents:
- 5 types: coaching sweep, wellness check, safety investigation, insurance optimization, pre-shift sweep
- Missions call scoring engines directly (no LLM sub-agents) — fast and cheap
- Only the final executive summary uses one Claude call
- Progress streams via EventEmitter bridge → SSE/WebSocket
- Cross-page notifications (bell icon with badge count)
- When missions complete, auto-sync action items to affected drivers
```

## Key Design Decisions Made Through Prompting

1. **Why voice-first for drivers?** Truck drivers can't use touchscreens while driving. Voice is the only safe interface.
2. **Why real phone calls?** Simulated dispatch is a demo feature. Real Twilio calls prove the technology works end-to-end and make the product genuinely useful.
3. **Why insurance scoring?** Fleet managers think in dollars. Connecting behavior to premiums makes safety investments tangible.
4. **Why HOS gauges?** Driver's #1 daily question is "How many hours do I have left?" — buried in ELD compliance screens everywhere else.
5. **Why wellness check-ins?** Driver life expectancy is 61 years. 25% report loneliness. No fleet app does proactive, privacy-respecting wellness.
6. **Why sustainability?** Fleet decarbonization is a $B opportunity. Operators need data to justify EV transitions and idle reduction policies.
7. **Why gamification?** Drivers respond better to coaching and competition than surveillance. Points, badges, and leaderboards drive engagement.
8. **Why Ace integration?** Natural language queries let non-technical managers explore their data without learning query tools.
9. **Why mission agents, not just chat?** Chat is reactive. Missions are proactive — they do the analyst's job while the operator keeps working.
10. **Why batch STT with pacing?** Phone audio through Twilio arrives in 20ms continuous packets. Burst-sending to Pulse STT causes empty transcripts on short utterances. Paced sending simulates real-time streaming.
