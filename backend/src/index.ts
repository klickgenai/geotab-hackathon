/**
 * FleetShield AI - Express + WebSocket Server
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { geotabAuth } from './services/geotab-auth.js';
import { getFleetSummary, getDriverStats, seedDrivers, seedVehicles, seedSafetyEvents } from './data/seed-data.js';
import { initFleetData } from './data/fleet-data-provider.js';
import { calculateInsuranceScore } from './scoring/insurance-score-engine.js';
import { calculateDriverRisk, calculateAllDriverRisks } from './scoring/driver-risk-engine.js';
import { predictWellness, predictAllWellness, getFleetWellnessSummary } from './scoring/wellness-predictor.js';
import { calculateAllPreShiftRisks, calculatePreShiftRisk, getFleetRiskForecast, detectDeteriorating, detectDangerousZones } from './scoring/predictive-safety.js';
import { getTriagedAlerts, getDailyBriefing } from './scoring/alert-triage.js';
import { streamAgentResponse, generateAgentResponse } from './agents/fleetshield-agent.js';
import { VoiceSession } from './voice/voice-session.js';
import { fillerCache } from './voice/filler-cache.js';
import { getLiveFleet, getGPSTrail, getSpeedingHotspots } from './services/live-fleet.js';
import {
  initDriverSessions,
  loginDriver,
  getDriverSession,
  getDriverLoad,
  updateLoadStatus,
  getDriverMessages,
  getDriverLeaderboard,
} from './data/driver-session.js';
import { simulateDispatcherCall } from './data/dispatcher-ai.js';
import { calculateFleetROI, calculateBeforeAfter, calculateRetentionSavings } from './scoring/roi-engine.js';
import { simulateWhatIf, getDefaultScenarios } from './scoring/what-if-simulator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// --- Health Check ---
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    geotabConfigured: geotabAuth.isConfigured(),
    timestamp: new Date().toISOString(),
  });
});

// --- Fleet Overview ---
app.get('/api/fleet/overview', (_req, res) => {
  try {
    const summary = getFleetSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get fleet overview' });
  }
});

// --- All Drivers ---
app.get('/api/fleet/drivers', (_req, res) => {
  try {
    const drivers = seedDrivers.map((d) => {
      const stats = getDriverStats(d.id);
      return { ...d, stats };
    });
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get drivers' });
  }
});

// --- Single Driver ---
app.get('/api/fleet/drivers/:id', (req, res) => {
  try {
    const stats = getDriverStats(req.params.id);
    if (!stats) return res.status(404).json({ error: 'Driver not found' });
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get driver' });
  }
});

// --- Vehicles ---
app.get('/api/fleet/vehicles', (_req, res) => {
  res.json(seedVehicles);
});

// --- Safety Events ---
app.get('/api/fleet/events', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const driverId = req.query.driverId as string;
    let events = seedSafetyEvents;
    if (driverId) events = events.filter((e) => e.driverId === driverId);
    res.json(events.slice(0, limit));
  } catch (error) {
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// --- Reports ---
app.get('/api/reports/:filename', (req, res) => {
  const reportsDir = path.join(__dirname, '../reports');
  const filepath = path.join(reportsDir, req.params.filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Report not found' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${req.params.filename}"`);
  fs.createReadStream(filepath).pipe(res);
});

// --- Fleet Score API ---
app.get('/api/fleet/score', (_req, res) => {
  try {
    res.json(calculateInsuranceScore());
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate insurance score' });
  }
});

// --- Driver Risks API ---
app.get('/api/fleet/risks', (_req, res) => {
  try {
    res.json(calculateAllDriverRisks());
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate driver risks' });
  }
});

// --- Wellness API ---
app.get('/api/fleet/wellness', (_req, res) => {
  try {
    res.json(getFleetWellnessSummary());
  } catch (error) {
    res.status(500).json({ error: 'Failed to get wellness summary' });
  }
});

// --- Individual Driver Risk ---
app.get('/api/fleet/risks/:id', (req, res) => {
  try {
    const result = calculateDriverRisk(req.params.id);
    if (!result) return res.status(404).json({ error: 'Driver not found' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate driver risk' });
  }
});

// --- Individual Driver Wellness ---
app.get('/api/fleet/wellness/:id', (req, res) => {
  try {
    const result = predictWellness(req.params.id);
    if (!result) return res.status(404).json({ error: 'Driver not found' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to predict driver wellness' });
  }
});

// --- All Driver Wellness (full detail) ---
app.get('/api/fleet/wellness-all', (_req, res) => {
  try {
    res.json(predictAllWellness());
  } catch (error) {
    res.status(500).json({ error: 'Failed to get wellness data' });
  }
});

// --- Chat endpoint (non-streaming) ---
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  try {
    const result = await generateAgentResponse(message);
    res.json({
      response: result.text,
      toolResults: result.steps?.flatMap((s) => s.toolResults || []) || [],
    });
  } catch (error) {
    console.error('[Chat] Error:', error);
    res.status(500).json({ error: 'Agent error' });
  }
});

// --- SSE Chat Stream ---
app.post('/api/chat/stream', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const result = await streamAgentResponse(message);

    for await (const chunk of result.textStream) {
      res.write(`data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (error) {
    console.error('[Chat Stream] Error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', content: 'Agent error' })}\n\n`);
    res.end();
  }
});

// --- Live Fleet Map ---
app.get('/api/fleet/map/live', async (_req, res) => {
  try {
    const vehicles = await getLiveFleet();
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get live fleet data' });
  }
});

app.get('/api/fleet/map/trail/:vehicleId', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 4;
    const trail = await getGPSTrail(req.params.vehicleId, hours);
    res.json(trail);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get GPS trail' });
  }
});

app.get('/api/fleet/map/hotspots', (_req, res) => {
  try {
    res.json(getSpeedingHotspots());
  } catch (error) {
    res.status(500).json({ error: 'Failed to get hotspots' });
  }
});

// --- Predictive Safety API ---
app.get('/api/fleet/predictive/pre-shift', (_req, res) => {
  try {
    res.json(calculateAllPreShiftRisks());
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate pre-shift risks' });
  }
});

app.get('/api/fleet/predictive/pre-shift/:id', (req, res) => {
  try {
    const result = calculatePreShiftRisk(req.params.id);
    if (!result) return res.status(404).json({ error: 'Driver not found' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate pre-shift risk' });
  }
});

app.get('/api/fleet/predictive/forecast', (_req, res) => {
  try {
    res.json(getFleetRiskForecast());
  } catch (error) {
    res.status(500).json({ error: 'Failed to get fleet risk forecast' });
  }
});

app.get('/api/fleet/predictive/trends', (_req, res) => {
  try {
    res.json(detectDeteriorating());
  } catch (error) {
    res.status(500).json({ error: 'Failed to detect deteriorating drivers' });
  }
});

app.get('/api/fleet/predictive/corridors', (_req, res) => {
  try {
    res.json(detectDangerousZones());
  } catch (error) {
    res.status(500).json({ error: 'Failed to detect dangerous corridors' });
  }
});

// --- Alert Triage API ---
app.get('/api/fleet/alerts', (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    res.json(getTriagedAlerts(limit));
  } catch (error) {
    res.status(500).json({ error: 'Failed to get triaged alerts' });
  }
});

app.get('/api/fleet/alerts/briefing', (_req, res) => {
  try {
    res.json(getDailyBriefing());
  } catch (error) {
    res.status(500).json({ error: 'Failed to get daily briefing' });
  }
});

// --- Driver Dashboard APIs ---
app.post('/api/driver/login', (req, res) => {
  try {
    const { driverId } = req.body;
    if (!driverId) return res.status(400).json({ error: 'driverId is required' });
    const session = loginDriver(driverId);
    if (!session) return res.status(404).json({ error: 'Driver not found' });
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: 'Failed to login driver' });
  }
});

app.get('/api/driver/:id/dashboard', (req, res) => {
  try {
    const session = getDriverSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Driver not found' });
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get driver dashboard' });
  }
});

app.get('/api/driver/:id/load', (req, res) => {
  try {
    const load = getDriverLoad(req.params.id);
    if (!load) return res.json({ hasLoad: false, message: 'No active load assigned.' });
    res.json({ hasLoad: true, load });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get driver load' });
  }
});

app.put('/api/driver/:id/load/status', (req, res) => {
  try {
    const { status, loadId } = req.body;
    if (!status) return res.status(400).json({ error: 'status is required' });

    // Find load ID from driver if not provided
    let targetLoadId = loadId;
    if (!targetLoadId) {
      const load = getDriverLoad(req.params.id);
      if (!load) return res.status(404).json({ error: 'No active load found for this driver' });
      targetLoadId = load.id;
    }

    const updated = updateLoadStatus(targetLoadId, status);
    if (!updated) return res.status(404).json({ error: 'Load not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update load status' });
  }
});

app.get('/api/driver/:id/messages', (req, res) => {
  try {
    const messages = getDriverMessages(req.params.id);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get driver messages' });
  }
});

app.get('/api/driver/leaderboard', (_req, res) => {
  try {
    res.json(getDriverLeaderboard());
  } catch (error) {
    res.status(500).json({ error: 'Failed to get driver leaderboard' });
  }
});

// --- ROI API ---
app.get('/api/fleet/roi', (_req, res) => {
  try {
    res.json(calculateFleetROI());
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate ROI' });
  }
});

app.get('/api/fleet/roi/before-after', (_req, res) => {
  try {
    res.json(calculateBeforeAfter());
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate before/after' });
  }
});

app.get('/api/fleet/roi/retention', (_req, res) => {
  try {
    res.json(calculateRetentionSavings());
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate retention savings' });
  }
});

// --- What-If Simulator API ---
app.post('/api/fleet/what-if', (req, res) => {
  try {
    const { scenarios } = req.body;
    if (!scenarios || !Array.isArray(scenarios)) {
      return res.status(400).json({ error: 'scenarios array required' });
    }
    res.json(simulateWhatIf(scenarios));
  } catch (error) {
    res.status(500).json({ error: 'Failed to run what-if simulation' });
  }
});

app.get('/api/fleet/what-if/defaults', (_req, res) => {
  try {
    res.json(getDefaultScenarios());
  } catch (error) {
    res.status(500).json({ error: 'Failed to get default scenarios' });
  }
});

// --- Dispatcher Call ---
app.post('/api/driver/:id/dispatch-call', async (req, res) => {
  try {
    const { intent } = req.body;
    if (!intent) return res.status(400).json({ error: 'intent is required' });

    const driver = seedDrivers.find((d) => d.id === req.params.id);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    const load = getDriverLoad(req.params.id);
    const result = await simulateDispatcherCall(req.params.id, intent, {
      currentLoad: load,
      driverName: driver.name,
    });
    res.json(result);
  } catch (error) {
    console.error('[Dispatch Call] Error:', error);
    res.status(500).json({ error: 'Failed to simulate dispatch call' });
  }
});

// --- WebSocket (for voice) ---
wss.on('connection', (ws) => {
  console.log('[WS] Client connected');
  let session: VoiceSession | null = null;

  const sendJson = (msg: Record<string, unknown>) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  };

  ws.on('message', async (raw, isBinary) => {
    // Binary data = PCM audio frames from the browser mic
    if (isBinary) {
      if (session) {
        session.feedAudio(Buffer.isBuffer(raw) ? raw : Buffer.from(raw as ArrayBuffer));
      }
      return;
    }

    // JSON control messages
    const rawStr = raw.toString();
    if (!rawStr.startsWith('{')) return;

    let msg: { type: string; [key: string]: unknown };
    try {
      msg = JSON.parse(rawStr);
    } catch {
      return;
    }

    switch (msg.type) {
      case 'start_session': {
        if (session) {
          session.end();
        }
        session = new VoiceSession({
          onStateChange: (state) => {
            sendJson({ type: 'state_change', state });
          },
          onTranscript: (role, text) => {
            sendJson({ type: 'transcript', role, text });
          },
          onFillerAudio: (audioBuffer, text) => {
            sendJson({ type: 'filler_audio', audio: audioBuffer.toString('base64'), text });
          },
          onAudioChunk: (audioBuffer, sentenceText) => {
            sendJson({ type: 'audio_chunk', audio: audioBuffer.toString('base64'), text: sentenceText });
          },
          onActionItem: (item) => {
            sendJson({ type: 'action_item', item });
          },
          onSessionEnded: (summary) => {
            sendJson({ type: 'session_ended', summary });
          },
          onError: (error) => {
            console.error('[Voice] Error:', error.message);
            sendJson({ type: 'error', message: error.message });
          },
          onMicStatus: (status) => {
            sendJson({ type: 'mic_status', status });
          },
        });
        try {
          await session.startListening();
          console.log(`[WS] Voice session started: ${session.sessionId}`);
        } catch (err) {
          console.error('[WS] Failed to start voice session:', (err as Error).message);
          sendJson({ type: 'error', message: (err as Error).message });
          session = null;
        }
        break;
      }

      case 'speech_start': {
        if (session) {
          // Interrupt any ongoing response (barge-in)
          if (session.getState() === 'speaking' || session.getState() === 'thinking') {
            session.interrupt();
          }
          await session.onSpeechStart();
        }
        break;
      }

      case 'speech_end': {
        if (session) {
          await session.onSpeechEnd();
        }
        break;
      }

      case 'end_session': {
        if (session) {
          const summary = session.end();
          console.log(`[WS] Voice session ended: ${summary.sessionId}`);
          session = null;
        }
        break;
      }

      default:
        break;
    }
  });

  ws.on('close', () => {
    console.log('[WS] Client disconnected');
    if (session) {
      session.end();
      session = null;
    }
  });
});

// --- Serve frontend ---
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// --- Start ---
const PORT = parseInt(process.env.PORT || '3000');

async function start() {
  await initFleetData();
  initDriverSessions();

  // Initialize filler cache (pre-generate TTS audio for filler phrases)
  fillerCache.initialize().catch((err) => {
    console.error('[FillerCache] Initialization failed:', err);
  });

  server.listen(PORT, () => {
    console.log(`\n🛡️  FleetShield AI running on http://localhost:${PORT}`);
    console.log(`   Geotab API: ${geotabAuth.isConfigured() ? '✅ Configured' : '⚠️  Using seed data'}`);
    console.log(`   WebSocket:  ws://localhost:${PORT}/ws`);
    console.log('');
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
