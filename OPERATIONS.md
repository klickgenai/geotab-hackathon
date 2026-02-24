# FleetShield AI - Operations & Deployment Guide

## Why This Doc Exists
The ngrok URL changes every time ngrok restarts. This broke Twilio dispatch calls because `backend/.env` had a stale URL. This document ensures it never happens again.

---

## Architecture Overview

```
                    ┌─────────────────────────────────────┐
                    │   Vercel (fleetshieldai.vercel.app)  │
                    │   Frontend: Next.js 16 + React 19    │
                    └──────────────┬──────────────────────┘
                                   │ /api/* requests
                                   ▼
                    ┌──────────────────────────────────────┐
                    │   ngrok tunnel (CHANGES EVERY START)  │
                    │   https://xxxx.ngrok-free.app         │
                    └──────────────┬───────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────────────┐
                    │   Local Backend (localhost:3000)       │
                    │   Express + WebSocket + Voice AI       │
                    └──────────────────────────────────────┘
                                   ▲
                                   │ Media Stream + Status Callbacks
                    ┌──────────────┴───────────────────────┐
                    │   Twilio (phone calls to dispatch)    │
                    │   Uses NGROK_URL for:                 │
                    │   - wss://NGROK_URL/twilio-media      │
                    │   - NGROK_URL/api/twilio/call-status  │
                    └──────────────────────────────────────┘
```

**Key insight**: TWO things depend on the ngrok URL:
1. **Vercel frontend** → `NEXT_PUBLIC_API_URL` env var → routes `/api/*` to backend
2. **Twilio phone calls** → `NGROK_URL` in `backend/.env` → routes audio stream + callbacks to backend

If the ngrok URL is wrong in EITHER place, things break silently.

---

## All Services & URLs

| Service | URL / Port | Purpose |
|---------|-----------|---------|
| Backend (local) | `http://localhost:3000` | Express API + WebSocket + Voice |
| Frontend (local dev) | `http://localhost:3001` | Next.js dev server |
| Frontend (production) | `https://fleetshieldai.vercel.app` | Vercel deployment |
| ngrok tunnel | `https://xxxx.ngrok-free.app` (CHANGES!) | Exposes localhost:3000 to internet |
| ngrok dashboard | `http://localhost:4040` | ngrok management UI |
| Twilio console | `https://console.twilio.com` | Phone number & call management |
| Geotab MyAdmin | `https://my.geotab.com` | Fleet data API |

---

## Environment Variables (`backend/.env`)

| Variable | Purpose | Changes? |
|----------|---------|----------|
| `GEOTAB_DATABASE` | Geotab demo database name | Stable |
| `GEOTAB_USERNAME` | Geotab account email | Stable |
| `GEOTAB_PASSWORD` | Geotab account password | Stable |
| `GEOTAB_SERVER` | Geotab server (`my.geotab.com`) | Stable |
| `ANTHROPIC_API_KEY` | Claude AI for agent, missions, dispatcher | Stable |
| `SMALLEST_API_KEY` | Smallest AI for STT (Pulse) and TTS (Waves) | Stable |
| `PORT` | Backend port (3000) | Stable |
| `NODE_ENV` | `development` | Stable |
| `TWILIO_ACCOUNT_SID` | Twilio account identifier | Stable |
| `TWILIO_AUTH_TOKEN` | Twilio API auth token | Stable |
| `TWILIO_PHONE_NUMBER` | Twilio outbound caller ID (`+12365066274`) | Stable |
| `DISPATCH_PHONE_NUMBER` | Dispatcher phone to call (`+16479377325`) | Stable |
| **`NGROK_URL`** | **Current ngrok tunnel URL** | **CHANGES EVERY NGROK RESTART!** |

---

## What Depends on the ngrok URL

### 1. Twilio Dispatch Calls (backend/.env → NGROK_URL)
When the driver asks Tasha to "call dispatch", the backend:
- Creates a Twilio outbound call to `DISPATCH_PHONE_NUMBER`
- Tells Twilio to connect the Media Stream WebSocket to `wss://NGROK_URL/twilio-media`
- Tells Twilio to send status callbacks to `NGROK_URL/api/twilio/call-status`

**If NGROK_URL is stale**: Twilio calls the phone, but audio stream goes to a dead URL. The call rings, nobody can hear anything, and it eventually times out with an empty transcript.

**Symptom**: "Call ended without saying what the driver asked for."

### 2. Vercel Frontend (NEXT_PUBLIC_API_URL)
The Vercel deployment uses middleware to route `/api/*` requests to the backend via ngrok.

**If NEXT_PUBLIC_API_URL is stale**: The production site can't reach the backend. API calls fail, pages show loading spinners forever.

**Symptom**: Production site loads but shows no data.

---

## Startup Sequence (Run Every Time)

### Step 1: Start the backend
```bash
cd backend && npm run dev
```
Verify: `curl -s http://localhost:3000/api/health`

### Step 2: Start ngrok (if not already running)
```bash
ngrok http 3000
```
Verify: `curl -s http://localhost:4040/api/tunnels`

### Step 3: Get the current ngrok URL
```bash
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | python3 -c "import sys,json; t=json.load(sys.stdin)['tunnels']; print(t[0]['public_url'])")
echo "Current ngrok URL: $NGROK_URL"
```

### Step 4: Update backend/.env with current ngrok URL
```bash
# Check what's currently in .env
grep NGROK_URL backend/.env

# If it doesn't match, update it
sed -i '' "s|NGROK_URL=.*|NGROK_URL=$NGROK_URL|" backend/.env

# RESTART the backend to pick up the new env var
# (kill the running backend first, then start again)
```

### Step 5: Verify Twilio can reach the backend
```bash
curl -s -H "ngrok-skip-browser-warning: true" $NGROK_URL/api/health
# Should return: {"status":"ok","geotabConfigured":true,...}
```

### Step 6: Update Vercel and redeploy (if deploying to production)
```bash
cd frontend
vercel env rm NEXT_PUBLIC_API_URL production -y
echo "$NGROK_URL" | vercel env add NEXT_PUBLIC_API_URL production
vercel --prod
```

### Step 7: Verify production (if deployed)
```bash
curl -s https://fleetshieldai.vercel.app/api/fleet/data-source
# Should return: {"isLiveData":true,"geotabConfigured":true,...}
```

---

## One-Liner Commands

### Full startup (backend + ngrok + env sync)
```bash
# Start backend in background
cd /Users/vimalkumar/geotab-\ hackathon/backend && npm run dev &

# Wait for backend, then start ngrok
sleep 3 && ngrok http 3000 &

# Wait for ngrok, sync URL to .env, restart backend
sleep 6 && \
  NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | python3 -c "import sys,json; t=json.load(sys.stdin)['tunnels']; print(t[0]['public_url'])") && \
  sed -i '' "s|NGROK_URL=.*|NGROK_URL=$NGROK_URL|" /Users/vimalkumar/geotab-\ hackathon/backend/.env && \
  echo "Updated NGROK_URL to: $NGROK_URL" && \
  echo "RESTART the backend now to pick up the new URL"
```

### Quick ngrok URL sync (when ngrok restarts but backend is running)
```bash
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | python3 -c "import sys,json; t=json.load(sys.stdin)['tunnels']; print(t[0]['public_url'])") && \
  sed -i '' "s|NGROK_URL=.*|NGROK_URL=$NGROK_URL|" /Users/vimalkumar/geotab-\ hackathon/backend/.env && \
  echo "Updated to: $NGROK_URL — NOW RESTART BACKEND"
```

### Full production deploy
```bash
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | python3 -c "import sys,json; t=json.load(sys.stdin)['tunnels']; print(t[0]['public_url'])") && \
  sed -i '' "s|NGROK_URL=.*|NGROK_URL=$NGROK_URL|" /Users/vimalkumar/geotab-\ hackathon/backend/.env && \
  cd /Users/vimalkumar/geotab-\ hackathon/frontend && \
  vercel env rm NEXT_PUBLIC_API_URL production -y && \
  echo "$NGROK_URL" | vercel env add NEXT_PUBLIC_API_URL production && \
  vercel --prod && \
  echo "Deployed with NGROK_URL=$NGROK_URL"
```

---

## Troubleshooting

### Dispatch call says "call ended" with no conversation
**Cause**: `NGROK_URL` in `backend/.env` is stale (ngrok restarted, URL changed).
**Fix**: Run the ngrok URL sync one-liner above, then restart the backend.

### Production site shows no data / loading forever
**Cause**: `NEXT_PUBLIC_API_URL` on Vercel points to old ngrok URL.
**Fix**: Run the production deploy one-liner above.

### Backend crashes on restart
**Cause**: Port 3000 still in use by the old process.
**Fix**: `lsof -ti:3000 | xargs kill` then start again.

### ngrok says "tunnel not found"
**Cause**: ngrok isn't running.
**Fix**: `ngrok http 3000` in a new terminal.

### Twilio call rings but dispatcher hears nothing
**Cause**: Media Stream WebSocket URL is wrong (stale ngrok URL).
**Fix**: Sync ngrok URL to `.env` and restart backend.

### Voice AI doesn't work (no STT/TTS)
**Cause**: `SMALLEST_API_KEY` missing or expired.
**Fix**: Check `backend/.env` has a valid key.

---

## Twilio Phone Numbers

| Number | Purpose |
|--------|---------|
| `+12365066274` | FleetShield outbound caller ID (Twilio) |
| `+16479377325` | Dispatcher phone (receives calls from Tasha) |

---

## Pre-Demo Checklist

Before any demo or recording session:

- [ ] Backend running: `curl -s http://localhost:3000/api/health` returns OK
- [ ] ngrok running: `curl -s http://localhost:4040/api/tunnels` returns tunnel info
- [ ] ngrok URL matches `.env`: compare `grep NGROK_URL backend/.env` with live tunnel URL
- [ ] Backend restarted after `.env` update (if URL changed)
- [ ] Twilio tunnel verified: `curl -s -H "ngrok-skip-browser-warning: true" <NGROK_URL>/api/health`
- [ ] Frontend dev server running (port 3001) — for local testing
- [ ] Vercel deployment current (if showing production) — run deploy one-liner
- [ ] Test dispatch call: login as driver 141/1073, go to Voice tab, ask "call dispatch about my delivery"
- [ ] Test operator assistant: go to /operator/assistant, ask "show fleet overview"
