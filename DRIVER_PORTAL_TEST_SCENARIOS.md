# Driver Portal — Test Scenarios

## Login Credentials

| Mode | Employee # | PIN | Driver | Notes |
|------|-----------|------|--------|-------|
| **Seed data** (no Geotab) | `241` | `1847` | James Wilson | Default when Geotab credentials not configured |
| **Geotab connected** | `141` | `1073` | Default test driver | When GEOTAB_DATABASE is set in .env |

---

## Tab Navigation Tests

### Test 1: Basic Tab Navigation
1. Open **http://localhost:3001/driver-portal**
2. Login with the appropriate credentials (see table above)
3. Verify all **5 tabs** render: Home | Training | **Voice** (centered, larger) | Load | Rank
4. Tap each tab — content should switch smoothly
5. Verify the **floating amber mic button** appears on all tabs except Voice

### Test 2: Home Tab Content
- Safety score gauge (large, centered, animated)
- **HOS compliance gauges** — drive time and duty time remaining
  - Color-coded: green (>4hrs), amber (2-4hrs), red (<2hrs)
  - "Next break in Xhr Xmin" text
- **AI Wellness check-in** — "How are you feeling?" with 5 mood buttons
  - After selecting mood: supportive response message
  - Weekly trend indicator
- Pre-shift briefing card with risk level and focus areas
- Daily challenge card with progress bar
- Quick stats row (streak, rank, today's events)

### Test 3: Training Tab
- Pending action items with category badges (coaching/wellness/safety/general)
- Priority dots: red=urgent, orange=high, yellow=medium, gray=low
- Complete/dismiss buttons on each item
- Training programs section (populated after running missions from operator portal)
- Completed items section at bottom
- **Notification badge** on tab when new programs arrive from operator missions

### Test 4: Load Tab
- Full load card with route (origin → destination), commodity, weight, distance, rate
- Broker contact info
- "Quick Dispatch" buttons (ETA update, Report issue, Route info, Load change)
- **"Call Dispatch"** button triggers dispatch call:
  - **Twilio mode** (when TWILIO_ACCOUNT_SID configured): Real phone call to dispatcher
  - **Simulated mode** (fallback): AI-simulated Tasha ↔ Mike conversation
- Dispatch call overlay showing:
  - Call state: Initiating → Ringing → Greeting → On Call → Wrapping Up → Complete
  - Live transcript as messages arrive (auto-scrolling)
  - "LIVE CALL" indicator during Twilio calls
  - Call summary on completion
- Recent dispatch messages
- Empty state ("No Load Assigned") with "Ask Tasha" button if no load

### Test 5: Leaderboard (Rank) Tab
- Full driver leaderboard — current driver highlighted in amber
- Badge gallery (earned/locked grid, tap any badge to inspect)
- Level progress bar with points-to-next indicator

### Test 6: Voice Tab
- Tap the large mic orb to start voice session
- Or type a message in the text input bar
- Quick action buttons visible when transcript is empty
- Animated orb states: listening=green, thinking=amber, speaking=blue, dispatching=gold
- **Mute/unmute** button during active voice session
- **End Voice** button to disconnect

### Test 7: Floating Mic Button
1. While on the Home tab, tap the floating mic button (bottom-right)
2. Should switch to Voice tab and start listening
3. Say or type something — verify it works

---

## Voice AI Test Questions

### 1. Performance & Dashboard

| Question | What it tests |
|----------|--------------|
| "What's my safety score?" | Score, streak, rank |
| "How am I doing?" | Overall performance summary |
| "Where do I rank?" | Leaderboard position |
| "How many events did I have today?" | Today's safety events |

### 2. Pre-Shift Briefing

| Question | What it tests |
|----------|--------------|
| "Give me my pre-shift briefing" | Full briefing: risk level, focus areas, weather, hazards |
| "What should I watch for today?" | Personalized safety focus areas |
| "What's the weather?" | Route weather conditions |

### 3. Safety Coaching & Improvement

| Question | What it tests |
|----------|--------------|
| "Give me safety coaching tips" | Top 3 improvement areas + specific tips |
| "How can I improve?" | Coaching recommendations |
| "What am I doing wrong?" | Event analysis with actionable steps |
| "How am I trending?" | Week-over-week progress comparison |
| "What should I focus on?" | Priority improvement areas |

### 4. Load & Delivery

| Question | What it tests |
|----------|--------------|
| "Tell me about my load" | Full load details (origin, destination, commodity) |
| "What am I delivering?" | Commodity + weight |
| "When do I need to deliver?" | Pickup/delivery times |
| "Who's my broker?" | Broker name + phone |
| "Where am I picking up?" | Origin address |
| "What's the rate?" | Load rate |
| "I've loaded" / "I'm at the pickup" | Load status update |

### 5. Dispatch Calls

The dispatch overlay should appear with a live conversation.

| Question | What it tests |
|----------|--------------|
| "Ask dispatch about my load" | Dispatch call overlay, conversation |
| "I'm going to be late" | ETA extension request |
| "My truck has a problem" | Issue reporting to dispatch |
| "Can I get a different load?" | Load change request |
| "Call dispatch for me" | General dispatch check-in |
| "I need roadside assistance" | Emergency dispatch contact |
| "I'm stuck in snow, call dispatch" | Multi-turn real phone call (Twilio mode) |

**Twilio dispatch tests** (when configured):
- Real phone should ring within 5 seconds
- Tasha introduces herself with driver name and issue
- 3-4 exchange multi-turn conversation with real human
- Transcript appears in overlay in real-time
- Call summary generated and saved to driver messages

### 6. Hours of Service (HOS)

| Question | What it tests |
|----------|--------------|
| "How many hours do I have left?" | Remaining drive time (11-hour limit) |
| "Do I need a break?" | Break requirement check (30-min rule) |
| "What's my HOS status?" | Full compliance status |
| "Can I keep driving?" | Drive time remaining |
| "Am I close to my cycle limit?" | 70-hour cycle check |

### 7. Wellness

| Question | What it tests |
|----------|--------------|
| "How am I feeling?" | Wellness status and recent check-ins |
| "I'm feeling tired" | Wellness acknowledgment + supportive response |

### 8. Incident Reporting

| Question | What it tests |
|----------|--------------|
| "I had a close call" | Near-miss auto-classification |
| "Report an incident" | Incident reporting with severity |
| "There's debris on the road" | Hazard reporting |
| "My truck broke down" | Mechanical issue report |

### 9. Leaderboard

| Question | What it tests |
|----------|--------------|
| "Show me the leaderboard" | Top 10 drivers with scores |
| "Who are the top drivers?" | Fleet ranking comparison |
| "How do I compare?" | Personal vs fleet performance |

---

## Mission-to-Driver Sync Test (Operator → Driver)

This tests the full pipeline: operator runs a mission → results sync to driver portal.

### Steps:
1. Open **Operator Portal** at http://localhost:3001/operator/assistant in a separate tab
2. Ask Tasha: **"Run a coaching sweep on the top 5 riskiest drivers"**
3. Wait for the mission to complete (~10 seconds)
4. Go back to the **Driver Portal** Training tab
5. Wait up to 30 seconds (polling interval)
6. A **notification dot** should appear on the Training tab
7. Training tab should now show a **Coaching Sweep** program with:
   - Source badge ("Coaching Sweep")
   - Risk tier badge (critical/high/moderate)
   - Expandable coaching actions with checkboxes
   - Timeline, expected improvement, estimated savings
8. Mark a coaching action as "Done" — should show a checkmark
9. Verify completed items move to the "Completed" section

### Data Flow:
```
Operator asks Tasha → coaching sweep mission runs
  → mission-runner generates per-driver coaching plans
  → mission-bridge.completeActiveMission() fires
  → syncMissionToDrivers() creates action items for each driver
  → Driver portal polls /api/driver/:id/actions every 30s
  → Training tab shows new coaching program with full context
  → Driver marks steps complete → item updates
```

---

## Twilio Dispatch Call Test (End-to-End)

### Prerequisites:
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` set in `.env`
- `DISPATCH_PHONE_NUMBER` set to a real phone number you can answer
- `NGROK_URL` set to your ngrok public URL (run `ngrok http 3000`)

### Steps:
1. Login to driver portal
2. Go to **Voice tab** → say: **"I'm stuck in snow at Highway 401, call dispatch"**
3. Dispatch call overlay should appear with "Initiating call..." state
4. Your phone (DISPATCH_PHONE_NUMBER) should ring
5. Pick up — you should hear Tasha's voice introducing herself
6. Respond naturally — Tasha should reply contextually
7. Have 2-3 exchanges — Tasha asks follow-up questions
8. Call wraps up automatically after 3-4 exchanges (or 2 minutes max)
9. Driver portal shows call summary in overlay
10. Close overlay → summary saved as message in Load tab

### Fallback Test:
- Remove `TWILIO_ACCOUNT_SID` from `.env` → restart backend
- Repeat the dispatch call → should fall back to AI-simulated conversation
- Same UI, same overlay, just AI-generated Mike responses instead of real phone

---

## Recommended Demo Flow (3-Minute Video)

1. **Login** — use appropriate credentials for your data source
2. **Home tab** — show safety score gauge, HOS compliance gauges, tap a wellness mood
3. **Voice tab** — tap mic orb, say: **"Give me my pre-shift briefing"**
4. Wait for response, then say: **"Tell me about my load"**
5. Say: **"I'm going to be late, can you check with dispatch?"** — watch dispatch overlay
6. After dispatch closes, say: **"How can I improve my driving?"**
7. Say: **"How many hours do I have left?"** (HOS)
8. **Load tab** — show full load card, tap "Call Dispatch"
9. **Rank tab** — show leaderboard with driver highlighted, badge gallery
10. **Training tab** — show action items (if coaching sweep was run from operator portal)

This covers: voice AI, real dispatch calls, all 5 tabs, HOS, wellness, and the mission sync pipeline.

---

## Quick Text Chat Test (No Microphone Needed)

Use the text input at the bottom of the Voice tab:

1. Type: `What's my safety score?` → press Enter
2. Type: `Give me my pre-shift briefing` → press Enter
3. Type: `Tell me about my load` → press Enter
4. Type: `How many hours do I have left?` → press Enter
5. Type: `Give me safety coaching tips` → press Enter
6. Type: `Show me the leaderboard` → press Enter

Each should stream a response in the chat transcript area.
