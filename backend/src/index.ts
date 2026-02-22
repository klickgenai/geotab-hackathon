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
import { geotabCore } from './services/geotab-core.js';
import { getFleetSummary, getDriverStats, seedDrivers, seedVehicles, seedSafetyEvents } from './data/seed-data.js';
import { initFleetData } from './data/fleet-data-provider.js';
import { calculateInsuranceScore } from './scoring/insurance-score-engine.js';
import { calculateDriverRisk, calculateAllDriverRisks } from './scoring/driver-risk-engine.js';
import { predictWellness, predictAllWellness, getFleetWellnessSummary } from './scoring/wellness-predictor.js';
import { calculateAllPreShiftRisks, calculatePreShiftRisk, getFleetRiskForecast, detectDeteriorating, detectDangerousZones } from './scoring/predictive-safety.js';
import { getTriagedAlerts, getDailyBriefing } from './scoring/alert-triage.js';
import { streamAgentResponse, generateAgentResponse, streamAssistantResponse } from './agents/fleetshield-agent.js';
import { VoiceSession, type DriverVoiceContext } from './voice/voice-session.js';
import { fillerCache } from './voice/filler-cache.js';
import { getLiveFleet, getGPSTrail, getSpeedingHotspots } from './services/live-fleet.js';
import {
  initDriverSessions,
  loginDriver,
  loginDriverWithPin,
  getDriverSession,
  getDriverLoad,
  updateLoadStatus,
  getDriverMessages,
  getDriverLeaderboard,
  getDriverActionItems,
  getAllDriverActionItems,
  addDriverActionItem,
  completeDriverActionItem,
  dismissDriverActionItem,
  getDriverHOS,
  submitWellnessCheckIn,
  getWellnessTrend,
} from './data/driver-session.js';
import { runDispatcherDelegation } from './data/dispatcher-ai.js';
import { calculateFleetROI, calculateBeforeAfter, calculateRetentionSavings } from './scoring/roi-engine.js';
import { getGamificationState, getPointsHistory, getDriverBadges, getRewardsCatalog, getDailyChallenge, checkChallengeProgress } from './scoring/gamification-engine.js';
import { simulateWhatIf, getDefaultScenarios } from './scoring/what-if-simulator.js';
import { calculateGreenDashboard } from './scoring/green-score-engine.js';
import { geotabAce } from './services/geotab-ace.js';
import { generateFleetReport } from './reports/fleet-report.js';
import { isUsingLiveData } from './data/fleet-data-provider.js';
import { TwilioDispatchSession, getCallSession, getCallSessionByCallSid } from './services/twilio-dispatch-service.js';
import { TwilioAIDispatchCall, getAICallSession, getAICallSessionByCallSid } from './services/twilio-ai-dispatch.js';
import { getAllMissions, getCompletedMission, getMissionBridge } from './missions/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// Dual WebSocket: browser voice on /ws, Twilio media streams on /twilio-media
const browserWss = new WebSocketServer({ noServer: true });
const twilioWss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url!, `http://${request.headers.host}`).pathname;
  if (pathname === '/ws') {
    browserWss.handleUpgrade(request, socket, head, (ws) => {
      browserWss.emit('connection', ws, request);
    });
  } else if (pathname === '/twilio-media') {
    twilioWss.handleUpgrade(request, socket, head, (ws) => {
      twilioWss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
    : true, // allow all in dev
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
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
    const driver = seedDrivers.find((d) => d.id === req.params.id);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    const stats = getDriverStats(req.params.id);
    res.json({ ...driver, stats });
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
app.get('/api/reports/generate', async (_req, res) => {
  try {
    const { filename } = await generateFleetReport();
    const reportsDir = path.join(__dirname, '../reports');
    const filepath = path.join(reportsDir, filename);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    fs.createReadStream(filepath).pipe(res);
  } catch (error) {
    console.error('Report generation failed:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

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
  if (!message || typeof message !== 'string' || message.length > 10000) return res.status(400).json({ error: 'Invalid message' });

  try {
    const result = await generateAgentResponse(message);
    res.json({
      response: result.text,
      toolResults: result.steps?.flatMap((s) => s.toolResults || []) || [],
    });
  } catch (error) {
    res.status(500).json({ error: 'Agent error' });
  }
});

// --- SSE Chat Stream ---
app.post('/api/chat/stream', async (req, res) => {
  const { message, currentPage } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const result = await streamAgentResponse(message, currentPage);

    for await (const chunk of result.textStream) {
      res.write(`data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: 'error', content: 'Agent error' })}\n\n`);
    res.end();
  }
});

// --- Assistant SSE Stream (full-screen assistant with tool results) ---
app.post('/api/assistant/stream', async (req, res) => {
  const { message, currentPage } = req.body;
  if (!message || typeof message !== 'string') return res.status(400).json({ error: 'Message required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const result = await streamAssistantResponse(message, currentPage);

    // Voice tag parser: buffer text until <voice>...</voice> is extracted or determined absent
    let voiceBuffer = '';
    let streamingDirectly = false;
    let voiceEmitted = false;
    const activeMissionIds: string[] = [];

    for await (const part of result.fullStream) {
      switch (part.type) {
        case 'text-delta':
          if (streamingDirectly) {
            // Past voice tag, stream text directly
            res.write(`data: ${JSON.stringify({ type: 'text', content: part.textDelta })}\n\n`);
          } else {
            voiceBuffer += part.textDelta;

            // Check if voice tag is complete
            const closeIdx = voiceBuffer.indexOf('</voice>');
            if (closeIdx !== -1) {
              const openIdx = voiceBuffer.indexOf('<voice>');
              if (openIdx !== -1) {
                const voiceContent = voiceBuffer.slice(openIdx + 7, closeIdx).trim();
                if (voiceContent) {
                  res.write(`data: ${JSON.stringify({ type: 'voice_summary', content: voiceContent })}\n\n`);
                  voiceEmitted = true;
                }
              }
              // Emit any text after the closing voice tag
              const remaining = voiceBuffer.slice(closeIdx + 8);
              if (remaining.trimStart()) {
                res.write(`data: ${JSON.stringify({ type: 'text', content: remaining.trimStart() })}\n\n`);
              }
              voiceBuffer = '';
              streamingDirectly = true;
            } else if (voiceBuffer.length > 500 || (!voiceBuffer.includes('<') && voiceBuffer.length > 80)) {
              // No voice tag coming — flush buffer as regular text
              const clean = voiceBuffer.replace(/<\/?voice>/g, '');
              if (clean.trim()) {
                res.write(`data: ${JSON.stringify({ type: 'text', content: clean })}\n\n`);
              }
              voiceBuffer = '';
              streamingDirectly = true;
            }
          }
          break;
        case 'tool-call':
          // Flush any pending voice buffer before tool calls
          if (!streamingDirectly && voiceBuffer) {
            const clean = voiceBuffer.replace(/<voice>[\s\S]*?<\/voice>/g, '').replace(/<\/?voice>/g, '');
            if (clean.trim()) {
              res.write(`data: ${JSON.stringify({ type: 'text', content: clean })}\n\n`);
            }
            voiceBuffer = '';
            streamingDirectly = true;
          }
          res.write(`data: ${JSON.stringify({ type: 'tool_call', toolName: part.toolName, args: part.args })}\n\n`);
          break;
        case 'tool-result':
          res.write(`data: ${JSON.stringify({ type: 'tool_result', toolName: part.toolName, result: part.result })}\n\n`);
          // Emit report_ready for auto-download
          if (part.toolName === 'generateContextReport' && part.result?.downloadUrl) {
            res.write(`data: ${JSON.stringify({ type: 'report_ready', url: part.result.downloadUrl, filename: part.result.filename, title: part.result.title })}\n\n`);
          }
          // Subscribe to mission bridge for live progress streaming
          if (part.toolName === 'deployMission' && part.result?.missionId) {
            const mid = part.result.missionId as string;
            activeMissionIds.push(mid);
            const missionBridge = getMissionBridge(mid);
            if (missionBridge) {
              missionBridge.on('mission_progress', (progress: unknown) => {
                try { res.write(`data: ${JSON.stringify({ type: 'mission_progress', ...progress as object })}\n\n`); } catch {}
              });
              missionBridge.on('mission_finding', (finding: unknown) => {
                try { res.write(`data: ${JSON.stringify({ type: 'mission_finding', ...finding as object })}\n\n`); } catch {}
              });
              missionBridge.on('mission_complete', (mResult: unknown) => {
                try {
                  res.write(`data: ${JSON.stringify({ type: 'mission_complete', ...mResult as object })}\n\n`);
                } catch {}
                // Remove from active list
                const idx = activeMissionIds.indexOf(mid);
                if (idx !== -1) activeMissionIds.splice(idx, 1);
              });
            }
          }
          break;
        case 'error':
          res.write(`data: ${JSON.stringify({ type: 'error', content: String(part.error) })}\n\n`);
          break;
      }
    }

    // Flush any remaining buffer
    if (!streamingDirectly && voiceBuffer) {
      const clean = voiceBuffer.replace(/<voice>[\s\S]*?<\/voice>/g, '').replace(/<\/?voice>/g, '');
      if (clean.trim()) {
        res.write(`data: ${JSON.stringify({ type: 'text', content: clean })}\n\n`);
      }
    }

    // Signal text stream done (frontend can accept new input)
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);

    // If missions are active, keep SSE open until they complete (max 65s)
    if (activeMissionIds.length > 0) {
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 65_000);
        const check = setInterval(() => {
          if (activeMissionIds.length === 0) {
            clearInterval(check);
            clearTimeout(timeout);
            resolve();
          }
        }, 500);
        res.on('close', () => { clearInterval(check); clearTimeout(timeout); resolve(); });
      });
    }
    res.end();
  } catch (error: any) {
    const errorMsg = error?.message?.includes('rate') ? 'Rate limited — please wait a moment and try again.' : 'Agent error — check backend logs.';
    res.write(`data: ${JSON.stringify({ type: 'error', content: errorMsg })}\n\n`);
    res.end();
  }
});

// --- TTS Synthesis (Smallest AI lightning-v3.1) ---
app.post('/api/tts/synthesize', async (req, res) => {
  const { text, voiceId, speed } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  const apiKey = process.env.SMALLEST_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'TTS not configured (SMALLEST_API_KEY missing)' });

  try {
    const safeSpeed = Math.max(0.5, Math.min(2.0, speed || 1.0));
    const { synthesizeSpeech } = await import('./voice/tts-synthesize.js');
    const pcmBuffer = await synthesizeSpeech(apiKey, {
      text: text.slice(0, 500),
      voiceId: voiceId || 'sophia',
      sampleRate: 24000,
      speed: safeSpeed,
      addWavHeader: false, // API doesn't reliably add WAV header, we do it ourselves
    });

    // Build WAV header manually around raw PCM (16-bit mono 24kHz)
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcmBuffer.length;
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataSize, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);        // fmt chunk size
    header.writeUInt16LE(1, 20);         // PCM format
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    const wavBuffer = Buffer.concat([header, pcmBuffer]);
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', wavBuffer.length);
    res.send(wavBuffer);
  } catch (error: any) {
    res.status(500).json({ error: 'TTS synthesis failed' });
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
    let count = parseInt(req.query.count as string);
    if (isNaN(count)) count = 50;
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
    const limit = parseInt(req.query.limit as string) || 100;
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
    const { driverId, employeeNumber, pin } = req.body;

    // PIN-based login
    if (employeeNumber && pin) {
      const session = loginDriverWithPin(employeeNumber, pin);
      if (!session) return res.status(401).json({ error: 'Invalid employee number or PIN' });
      return res.json(session);
    }

    // Legacy driverId login
    if (!driverId) return res.status(400).json({ error: 'employeeNumber and pin are required' });
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
    const allowed = ['assigned','picked_up','in_transit','delivered','completed'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });

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

// --- Pre-Shift Briefing ---
app.get('/api/driver/:id/pre-shift-briefing', (req, res) => {
  try {
    const driverId = req.params.id;
    const driver = seedDrivers.find((d) => d.id === driverId);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    // Get risk data from existing engines
    const preShift = calculatePreShiftRisk(driverId);
    const driverRisk = calculateDriverRisk(driverId);
    const wellness = predictWellness(driverId);
    const session = getDriverSession(driverId);
    const dangerousZones = detectDangerousZones();

    // Determine risk level
    const riskLevel = preShift?.riskLevel || 'low';
    const riskScore = preShift?.riskScore || 0;

    // Generate greeting based on time of day and streak
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const streakDays = session?.streakDays || 0;
    let greeting = `${timeGreeting}, ${driver.firstName}!`;
    if (streakDays >= 30) greeting += ` Incredible ${streakDays}-day safe streak!`;
    else if (streakDays >= 14) greeting += ` Amazing ${streakDays}-day safe streak going!`;
    else if (streakDays >= 7) greeting += ` Nice ${streakDays}-day streak - keep it up!`;
    else if (streakDays >= 3) greeting += ` ${streakDays} days safe and counting!`;
    else greeting += ` Let's make today a safe one.`;

    // Generate focus areas based on top event types
    const focusAreaMap: Record<string, string> = {
      harsh_braking: 'Watch following distance - ease off the gas 3-4 seconds earlier',
      speeding: 'Mind your speed today - set cruise control on highways',
      distracted_driving: 'Secure your phone before departure - stay focused',
      drowsy_driving: 'Stay alert - take breaks every 2 hours, hydrate often',
      lane_departure: 'Check your lane position regularly - adjust mirrors before departure',
      tailgating: 'Maintain 4-second following distance at all speeds',
      harsh_acceleration: 'Smooth acceleration from stops - anticipate traffic flow',
      seatbelt: 'Buckle up before starting the engine',
      rolling_stop: 'Full stops at all intersections - no rolling through',
      idle_excessive: 'Minimize idling - turn off for stops longer than 2 minutes',
    };

    const focusAreas: string[] = [];
    if (driverRisk?.topEventTypes) {
      for (const evt of driverRisk.topEventTypes.slice(0, 3)) {
        const tip = focusAreaMap[evt.type];
        if (tip) focusAreas.push(tip);
      }
    }
    if (focusAreas.length === 0) {
      focusAreas.push('Maintain safe following distance', 'Stay within speed limits');
    }

    // Add wellness-based focus areas
    if (wellness && wellness.burnoutRisk === 'high') {
      focusAreas.push('Take extra rest breaks today - your fatigue indicators are elevated');
    } else if (wellness && wellness.avgRestHours < 8) {
      focusAreas.push('You had limited rest - stay extra alert today');
    }

    // Simulated weather (deterministic based on day of year)
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const weatherConditions = [
      { condition: 'Clear skies', temp: 45, advisory: undefined },
      { condition: 'Partly cloudy', temp: 52, advisory: undefined },
      { condition: 'Light rain', temp: 48, advisory: 'Wet roads - increase following distance' },
      { condition: 'Overcast', temp: 42, advisory: undefined },
      { condition: 'Light rain', temp: 38, advisory: 'Wet roads ahead - reduce speed in curves' },
      { condition: 'Clear skies', temp: 55, advisory: undefined },
      { condition: 'Fog', temp: 35, advisory: 'Low visibility - use fog lights, reduce speed' },
      { condition: 'Snow flurries', temp: 28, advisory: 'Slippery conditions possible - extra caution on bridges' },
      { condition: 'Partly cloudy', temp: 50, advisory: undefined },
      { condition: 'Heavy rain', temp: 44, advisory: 'Heavy rain expected - reduce speed, increase following distance' },
      { condition: 'Clear skies', temp: 58, advisory: undefined },
      { condition: 'Thunderstorms', temp: 62, advisory: 'Thunderstorms forecast - pull over if visibility drops below 200ft' },
      { condition: 'Overcast', temp: 40, advisory: undefined },
      { condition: 'Clear skies', temp: 48, advisory: undefined },
    ];
    const weather = weatherConditions[dayOfYear % weatherConditions.length];

    // Route hazards from dangerous zones
    const routeHazards: string[] = [];
    const topZones = dangerousZones.slice(0, 3);
    for (const zone of topZones) {
      routeHazards.push(`High ${zone.topEventType.replace(/_/g, ' ')} area near (${zone.latitude.toFixed(1)}°, ${zone.longitude.toFixed(1)}°) - ${zone.eventCount} recent events`);
    }

    // Motivational message based on context
    let motivational: string;
    if (riskLevel === 'critical' || riskLevel === 'high') {
      motivational = 'Take it steady today. Your safety is the top priority. We believe in you.';
    } else if (streakDays >= 30) {
      motivational = `${streakDays} days of excellence! You're an inspiration to the entire fleet.`;
    } else if (streakDays >= 14) {
      motivational = 'Your consistency is paying off. Keep this momentum going!';
    } else if (streakDays >= 7) {
      motivational = 'One week strong! Every safe mile counts. You\'re building something great.';
    } else {
      motivational = 'Every journey starts with a single safe mile. Let\'s make today count!';
    }

    // Streak status
    let streakStatus: string;
    if (streakDays >= 30) {
      streakStatus = `${streakDays} days strong! You've earned Monthly Master! Can you reach 60?`;
    } else if (streakDays >= 14) {
      streakStatus = `${streakDays} days! ${30 - streakDays} more for the Monthly Master badge!`;
    } else if (streakDays >= 7) {
      streakStatus = `${streakDays} days! ${14 - streakDays} more for the Fortnight Fighter badge!`;
    } else {
      streakStatus = `${streakDays} days. ${7 - streakDays} more for the Week Warrior badge!`;
    }

    const briefing = {
      riskLevel,
      riskScore,
      greeting,
      focusAreas,
      weather: {
        condition: weather.condition,
        temp: weather.temp,
        advisory: weather.advisory || null,
      },
      routeHazards,
      motivational,
      streakStatus,
      safetyScore: session?.safetyScore || 0,
      streakDays,
      factors: preShift?.factors || [],
    };

    res.json(briefing);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate pre-shift briefing' });
  }
});

// --- Driver HOS (Hours of Service) ---
app.get('/api/driver/:id/hos', (req, res) => {
  try {
    const result = getDriverHOS(req.params.id);
    if (!result) return res.status(404).json({ error: 'Driver not found' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get HOS status' });
  }
});

// --- Driver Wellness Check-In ---
app.post('/api/driver/:id/wellness-checkin', (req, res) => {
  try {
    const { mood, note } = req.body;
    if (!mood) return res.status(400).json({ error: 'mood is required' });
    const validMoods = ['great', 'ok', 'tired', 'stressed', 'not_good'];
    if (!validMoods.includes(mood)) return res.status(400).json({ error: 'Invalid mood' });
    const result = submitWellnessCheckIn(req.params.id, mood, note);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit wellness check-in' });
  }
});

app.get('/api/driver/:id/wellness-trend', (req, res) => {
  try {
    const trend = getWellnessTrend(req.params.id);
    res.json(trend);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get wellness trend' });
  }
});

// --- Gamification API ---
app.get('/api/driver/:id/gamification', (req, res) => {
  try {
    const state = getGamificationState(req.params.id);
    if (!state) return res.status(404).json({ error: 'Driver not found' });
    res.json(state);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get gamification state' });
  }
});

app.get('/api/driver/:id/points-history', (req, res) => {
  try {
    const history = getPointsHistory(req.params.id);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get points history' });
  }
});

app.get('/api/driver/:id/badges', (req, res) => {
  try {
    const badges = getDriverBadges(req.params.id);
    res.json(badges);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get badges' });
  }
});

app.get('/api/driver/:id/rewards', (req, res) => {
  try {
    const rewards = getRewardsCatalog(req.params.id);
    res.json(rewards);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get rewards' });
  }
});

app.post('/api/driver/:id/challenge/check', (req, res) => {
  try {
    const challenge = checkChallengeProgress(req.params.id);
    if (!challenge) return res.json({ message: 'No active challenge' });
    res.json(challenge);
  } catch (error) {
    res.status(500).json({ error: 'Failed to check challenge progress' });
  }
});

// --- Driver Action Items ---
app.get('/api/driver/:id/actions', (req, res) => {
  try {
    const items = getDriverActionItems(req.params.id);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get action items' });
  }
});

app.post('/api/driver/:id/actions', (req, res) => {
  try {
    const { text, source } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });
    const item = addDriverActionItem(req.params.id, text, source || 'system');
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add action item' });
  }
});

app.post('/api/driver/:id/actions/:actionId/complete', (req, res) => {
  try {
    const item = completeDriverActionItem(req.params.id, req.params.actionId);
    if (!item) return res.status(404).json({ error: 'Action item not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete action item' });
  }
});

app.post('/api/driver/:id/actions/:actionId/dismiss', (req, res) => {
  try {
    const item = dismissDriverActionItem(req.params.id, req.params.actionId);
    if (!item) return res.status(404).json({ error: 'Action item not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to dismiss action item' });
  }
});

// --- Driver Training (mission-synced coaching programs) ---
app.get('/api/driver/:id/training', (req, res) => {
  try {
    const driverId = req.params.id;
    const missions = getAllMissions();
    const programs: Array<Record<string, unknown>> = [];

    for (const mission of missions.completed) {
      if (mission.status !== 'complete') continue;

      if (mission.type === 'coaching_sweep') {
        const plans = (mission.data.driverPlans as Array<Record<string, unknown>>) || [];
        const driverPlan = plans.find(p => p.driverId === driverId);
        if (driverPlan) {
          programs.push({
            missionId: mission.missionId,
            missionType: mission.type,
            source: mission.displayName,
            completedAt: mission.completedAt,
            driverName: driverPlan.driverName,
            riskScore: driverPlan.riskScore,
            tier: driverPlan.tier,
            topIssues: driverPlan.topIssues,
            coachingActions: driverPlan.coachingActions,
            timeline: driverPlan.timeline,
            expectedImprovement: driverPlan.expectedImprovement,
            estimatedSavings: driverPlan.estimatedSavings,
            wellnessScore: driverPlan.wellnessScore,
            burnoutRisk: driverPlan.burnoutRisk,
          });
        }
      } else if (mission.type === 'safety_investigation' && mission.data.driverId === driverId) {
        programs.push({
          missionId: mission.missionId,
          missionType: mission.type,
          source: mission.displayName,
          completedAt: mission.completedAt,
          driverName: mission.data.driverName,
          riskScore: mission.data.riskScore,
          rootCauses: mission.data.rootCauses,
          coachingActions: mission.recommendations,
          timeline: [],
          expectedImprovement: `Focus on root causes for measurable improvement`,
          estimatedSavings: '',
        });
      }
    }

    // Sort newest first
    programs.sort((a, b) => new Date(b.completedAt as string).getTime() - new Date(a.completedAt as string).getTime());
    res.json(programs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get training programs' });
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

// --- Geotab Ace API (Natural Language Analytics) ---
app.post('/api/fleet/ace/query', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  if (!geotabAuth.isConfigured()) {
    return res.json({
      text: 'Geotab Ace is not available in seed data mode. Connect to a Geotab database to use natural language analytics.',
      data: null,
      charts: [],
      status: 'unavailable',
    });
  }

  try {
    const result = await geotabAce.query(prompt);
    res.json(result);
  } catch (error) {
    res.json({
      text: `Ace query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      data: null,
      charts: [],
      status: 'failed',
    });
  }
});

// --- Custom What-If Simulator (slider-based) ---
app.post('/api/fleet/what-if/custom', (req, res) => {
  try {
    const { adjustments } = req.body;
    if (!adjustments) return res.status(400).json({ error: 'adjustments object required' });

    const scenario = {
      id: 'custom',
      name: 'Custom Scenario',
      description: 'Custom parameter adjustments',
      adjustments,
    };
    const results = simulateWhatIf([scenario]);
    res.json(results[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to run custom simulation' });
  }
});

// --- Mission Agent Endpoints ---
app.get('/api/missions/active', (_req, res) => {
  try {
    res.json(getAllMissions());
  } catch (error) {
    res.status(500).json({ error: 'Failed to get missions' });
  }
});

app.get('/api/missions/:id', (req, res) => {
  try {
    const result = getCompletedMission(req.params.id);
    if (!result) {
      // Check if it's still active
      const all = getAllMissions();
      const active = all.active.find(m => m.missionId === req.params.id);
      if (active) return res.json({ status: 'running', ...active });
      return res.status(404).json({ error: 'Mission not found' });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get mission' });
  }
});

// --- Sustainability / Green Fleet ---
app.get('/api/fleet/sustainability', (_req, res) => {
  try {
    const dashboard = calculateGreenDashboard();
    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate sustainability metrics' });
  }
});

app.get('/api/fleet/sustainability/drivers', (_req, res) => {
  try {
    const dashboard = calculateGreenDashboard();
    res.json(dashboard.driverGreenRankings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get driver green rankings' });
  }
});

app.get('/api/fleet/sustainability/vehicles', (_req, res) => {
  try {
    const dashboard = calculateGreenDashboard();
    res.json(dashboard.evReadiness);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get EV readiness report' });
  }
});

// --- Data Source Info ---
app.get('/api/fleet/data-source', (_req, res) => {
  res.json({
    isLiveData: isUsingLiveData(),
    geotabConfigured: geotabAuth.isConfigured(),
    database: geotabAuth.isConfigured() ? process.env.GEOTAB_DATABASE : null,
  });
});

// --- Geotab Integration Verification ---
app.get('/api/fleet/verify-integration', async (_req, res) => {
  try {
    const configured = geotabAuth.isConfigured();
    const result: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      isLiveData: isUsingLiveData(),
      mygeotab: {
        configured,
        authenticated: false,
        database: configured ? process.env.GEOTAB_DATABASE : null,
        server: configured ? (process.env.GEOTAB_SERVER || 'my.geotab.com') : null,
        deviceCount: 0,
        userCount: 0,
        recentEventCount: 0,
      },
      ace: {
        configured,
        available: false,
        testResult: null,
      },
      apis: {
        mygeotab: configured ? 'https://my.geotab.com/apiv1' : null,
        ace: configured ? 'https://ace-api.geotab.com/api/v2' : null,
        dataConnector: configured ? 'OData v4 (optional)' : null,
      },
    };

    if (configured) {
      try {
        // Verify MyGeotab authentication + fetch real counts
        const [devices, users] = await Promise.all([
          geotabCore.getDevices().catch(() => []),
          geotabCore.getUsers({ isDriver: true }).catch(() => []),
        ]);
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const events = await geotabCore.getExceptionEvents(
          weekAgo.toISOString(),
          now.toISOString()
        ).catch(() => []);

        (result.mygeotab as Record<string, unknown>).authenticated = true;
        (result.mygeotab as Record<string, unknown>).deviceCount = devices.length;
        (result.mygeotab as Record<string, unknown>).userCount = users.length;
        (result.mygeotab as Record<string, unknown>).recentEventCount = events.length;
        (result.mygeotab as Record<string, unknown>).sampleDevices = devices.slice(0, 3).map((d: { name?: string; id?: string }) => d.name || d.id);
      } catch {
        (result.mygeotab as Record<string, unknown>).error = 'Authentication failed';
      }

      try {
        // Test Ace API availability
        const aceResult = await geotabAce.query('How many vehicles are in my fleet?');
        (result.ace as Record<string, unknown>).available = true;
        (result.ace as Record<string, unknown>).testResult = aceResult.text?.substring(0, 200);
      } catch {
        (result.ace as Record<string, unknown>).error = 'Ace query failed';
      }
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify integration' });
  }
});

// --- Geotab Integration Verification (for judges) ---
app.get('/api/fleet/verify-integration', async (_req, res) => {
  const result: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    isLiveData: isUsingLiveData(),
  };

  if (!geotabAuth.isConfigured()) {
    result.mygeotab = { authenticated: false, reason: 'Credentials not configured' };
    result.ace = { available: false, reason: 'Requires MyGeotab authentication' };
    return res.json(result);
  }

  // Verify MyGeotab API
  try {
    const session = await geotabAuth.authenticate();
    const devices = await geotabCore.getDevices();
    result.mygeotab = {
      authenticated: true,
      database: process.env.GEOTAB_DATABASE,
      server: session.server,
      deviceCount: devices.length,
      sampleDevices: devices.slice(0, 3).map(d => ({ id: d.id, name: d.name, serialNumber: d.serialNumber })),
    };
  } catch (error) {
    result.mygeotab = {
      authenticated: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
    };
  }

  // Verify Ace API
  try {
    const aceResult = await geotabAce.query('How many vehicles are in my fleet?');
    result.ace = {
      available: true,
      testQuery: 'How many vehicles are in my fleet?',
      response: aceResult.text?.slice(0, 200),
      status: aceResult.status || 'completed',
    };
  } catch (error) {
    result.ace = {
      available: false,
      error: error instanceof Error ? error.message : 'Ace query failed',
    };
  }

  res.json(result);
});

// --- Twilio Call Status Webhook ---
app.post('/api/twilio/call-status', (req, res) => {
  const { CallSid, CallStatus } = req.body;
  console.log(`[TWILIO-STATUS] SID=${CallSid?.slice(-8)} Status=${CallStatus}`);

  // Check AI dispatch calls first
  const aiSession = getAICallSessionByCallSid(CallSid);
  if (aiSession) {
    aiSession.handleStatusUpdate(CallStatus);
    return res.sendStatus(200);
  }

  // Check regular dispatch calls
  const session = getCallSessionByCallSid(CallSid);
  if (session) {
    session.handleStatusUpdate(CallStatus);
  } else {
    console.warn(`[TWILIO-STATUS] No session found for CallSid=${CallSid?.slice(-8)}`);
  }
  res.sendStatus(200);
});

// --- Dispatcher Call (SSE streaming) ---
app.post('/api/driver/:id/dispatch-call', async (req, res) => {
  try {
    const { intent } = req.body;
    if (!intent) return res.status(400).json({ error: 'intent is required' });

    const driver = seedDrivers.find((d) => d.id === req.params.id);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    const load = getDriverLoad(req.params.id);
    const session = getDriverSession(req.params.id);

    // If Twilio is configured, use real AI dispatch call (non-streaming, returns JSON)
    if (process.env.TWILIO_ACCOUNT_SID && process.env.NGROK_URL) {
      try {
        const aiCall = new TwilioAIDispatchCall(intent, {
          driverName: driver.name,
          employeeNo: driver.employeeNumber,
          vehicleName: session?.vehicleName || driver.vehicleId,
          safetyScore: session?.safetyScore || 85,
          loadDetails: load
            ? `Load ${load.id}: ${load.commodity} from ${load.origin.city} to ${load.destination.city} (${load.status})`
            : 'No active load',
        });
        const callResult = await aiCall.startCall();
        return res.json({
          ...callResult,
          mode: 'twilio',
        });
      } catch (err) {
        console.error('Twilio AI dispatch failed, falling back to simulation:', (err as Error).message);
      }
    }

    // SSE streaming for simulated dispatch call
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const sendSSE = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const abortController = new AbortController();
    req.on('close', () => abortController.abort());

    const sseCallbacks: import('./voice/dispatch-bridge.js').DispatchProgressCallback = {
      onStatus(phase, message) {
        sendSSE('status', { phase, message });
      },
      onMessage(role, text, turnNumber) {
        sendSSE('message', { role, text, turnNumber });
      },
      onOutcome(outcome, summary, details) {
        sendSSE('outcome', { outcome, summary, details });
      },
    };

    const result = await runDispatcherDelegation(
      req.params.id,
      intent,
      { currentLoad: load, driverName: driver.name },
      sseCallbacks,
      abortController.signal,
    );

    // Send final complete event with full result
    sendSSE('complete', { ...result, mode: 'simulated' });
    res.end();
  } catch (error) {
    // If headers already sent (SSE started), send error event
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: 'Dispatch call failed' })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: 'Failed to process dispatch call' });
    }
  }
});

// --- AI Dispatch Call Status Polling ---
app.get('/api/driver/:id/dispatch-call/:callId/status', (req, res) => {
  try {
    const aiCall = getAICallSession(req.params.callId);
    if (!aiCall) return res.status(404).json({ error: 'Call not found' });
    res.json(aiCall.getResult());
  } catch (error) {
    res.status(500).json({ error: 'Failed to get call status' });
  }
});

// --- Twilio Media Stream WebSocket ---
twilioWss.on('connection', (ws) => {
  const bufferedMessages: string[] = [];
  let linked = false;

  ws.on('message', (data) => {
    const raw = data.toString();
    if (linked) return; // Once linked, session handles messages directly

    // Cap buffer to prevent unbounded growth (safety measure)
    if (bufferedMessages.length > 200) {
      console.warn('[TWILIO-WS] Buffer exceeded 200 messages before linking — clearing old');
      bufferedMessages.splice(0, bufferedMessages.length - 50);
    }

    bufferedMessages.push(raw);

    try {
      const msg = JSON.parse(raw);
      if (msg.event === 'start' && msg.start?.customParameters?.callId) {
        const callId = msg.start.customParameters.callId;
        const mode = msg.start?.customParameters?.mode;
        console.log(`[TWILIO-WS] Start event: callId=${callId}, mode=${mode}`);

        // Try AI dispatch call first
        if (mode === 'ai') {
          const aiSession = getAICallSession(callId);
          if (aiSession) {
            linked = true;
            console.log(`[TWILIO-WS] Linked to AI dispatch session: ${callId}`);
            aiSession.handleMediaStream(ws as any, bufferedMessages);
            return;
          }
          console.warn(`[TWILIO-WS] AI session not found for callId=${callId}`);
        }

        // Fall back to regular dispatch session
        const session = getCallSession(callId);
        if (session) {
          linked = true;
          session.handleMediaStream(ws as any, bufferedMessages);
        } else {
          console.warn(`[TWILIO-WS] No session found for callId=${callId}`);
        }
      }
    } catch {}
  });

  ws.on('close', () => {
    if (!linked) {
      console.warn('[TWILIO-WS] Connection closed before linking');
    }
  });
});

// --- Browser WebSocket (for voice + dispatch calls) ---
browserWss.on('connection', (ws) => {
  let session: VoiceSession | null = null;
  let activeDispatchCall: TwilioDispatchSession | null = null;

  const sendJson = (msg: Record<string, unknown>) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  };

  ws.on('message', async (raw, isBinary) => {
    // Binary data = PCM audio frames from the browser mic
    if (isBinary) {
      const pcmBuffer = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as ArrayBuffer);

      // If there's an active Twilio dispatch call, forward mic audio to Twilio
      if (activeDispatchCall && activeDispatchCall.currentState === 'connected') {
        activeDispatchCall.sendBrowserAudio(pcmBuffer);
        return;
      }

      // Otherwise, feed to voice session STT
      if (session) {
        session.feedAudio(pcmBuffer);
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

        // Build driver voice context if driverId is provided
        let driverContext: DriverVoiceContext | undefined;
        const voiceDriverId = msg.driverId as string | undefined;
        if (voiceDriverId) {
          const driverData = seedDrivers.find((d) => d.id === voiceDriverId);
          const driverSession = getDriverSession(voiceDriverId);
          const driverRisk = calculateDriverRisk(voiceDriverId);
          const driverWellness = predictWellness(voiceDriverId);
          const driverStats = getDriverStats(voiceDriverId);
          if (driverData && driverSession) {
            driverContext = {
              firstName: driverData.firstName,
              name: driverData.name,
              safetyScore: driverSession.safetyScore,
              streakDays: driverSession.streakDays,
              weeklyRank: driverSession.weeklyRank,
              totalDrivers: seedDrivers.length,
              vehicleName: driverSession.vehicleName,
              currentLoad: driverSession.currentLoad ? {
                id: driverSession.currentLoad.id,
                status: driverSession.currentLoad.status,
                origin: `${driverSession.currentLoad.origin.city}, ${driverSession.currentLoad.origin.state}`,
                destination: `${driverSession.currentLoad.destination.city}, ${driverSession.currentLoad.destination.state}`,
                commodity: driverSession.currentLoad.commodity,
              } : null,
              riskProfile: driverData.riskProfile,
              burnoutRisk: driverData.burnoutRisk,
              riskScore: driverRisk?.riskScore ?? 0,
              burnoutProbability: driverWellness?.burnoutProbability ?? 0,
              todayEvents: driverSession.todayEvents,
              avgDailyHours: driverStats?.avgDailyHours ?? 0,
              avgRestHours: driverStats?.avgRestHours ?? 0,
              totalDrivingHours: driverStats?.totalDrivingHours ?? 0,
              daysWorked: driverStats?.daysWorked ?? 0,
            };
          }
        }

        session = new VoiceSession({
          onStateChange: (state) => {
            sendJson({ type: 'state_change', state, voiceState: state });
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
          onToolResult: (toolName, result) => {
            sendJson({ type: 'tool_result', toolName, result });
            // Subscribe to mission bridge for voice clients
            const toolResult = result as Record<string, unknown> | null;
            if (toolName === 'deployMission' && toolResult?.missionId) {
              const mBridge = getMissionBridge(toolResult.missionId as string);
              if (mBridge) {
                mBridge.on('mission_progress', (p: unknown) => sendJson({ type: 'mission_progress', ...(p as object) }));
                mBridge.on('mission_finding', (f: unknown) => sendJson({ type: 'mission_finding', ...(f as object) }));
                mBridge.on('mission_complete', (r: unknown) => sendJson({ type: 'mission_complete', ...(r as object) }));
              }
            }
          },
          onActionItem: (item) => {
            sendJson({ type: 'action_item', item });
          },
          onSessionEnded: (summary) => {
            sendJson({ type: 'session_ended', summary });
          },
          onError: (error) => {
            sendJson({ type: 'error', message: error.message });
          },
          onMicStatus: (status) => {
            sendJson({ type: 'mic_status', status });
          },
          onDispatchProgress: (event) => {
            sendJson({
              type: 'dispatch_progress',
              eventType: event.type,
              phase: (event as any).phase,
              message: (event as any).message,
              role: (event as any).role,
              text: (event as any).text,
              turnNumber: (event as any).turnNumber,
              outcome: (event as any).outcome,
              summary: (event as any).summary,
              details: (event as any).details,
            });
          },
          onDispatchCallRequested: async () => {
            // Real Twilio call requested by voice session
            try {
              activeDispatchCall = new TwilioDispatchSession({
                onStateChange: (state) => {
                  // Map Twilio states to dispatch phases
                  const phaseMap: Record<string, string> = {
                    ringing: 'connecting',
                    connected: 'on_call',
                    completed: 'complete',
                    failed: 'error',
                  };
                  sendJson({
                    type: 'dispatch_call_state',
                    callState: state,
                    phase: phaseMap[state] || state,
                    callId: activeDispatchCall?.callId,
                  });
                },
                onPhoneAudio: (wavBuffer) => {
                  // Send dispatcher's phone audio to browser for playback
                  sendJson({
                    type: 'dispatch_audio',
                    audio: wavBuffer.toString('base64'),
                  });
                },
                onCallEnded: (reason) => {
                  sendJson({
                    type: 'dispatch_call_ended',
                    reason,
                    callId: activeDispatchCall?.callId,
                  });
                  activeDispatchCall = null;
                },
              });

              await activeDispatchCall.startCall();
            } catch (err) {
              sendJson({
                type: 'dispatch_call_state',
                callState: 'failed',
                phase: 'error',
                error: (err as Error).message,
              });
              activeDispatchCall = null;
            }
          },
        }, driverContext);
        try {
          await session.startListening();
        } catch (err) {
          sendJson({ type: 'error', message: (err as Error).message });
          session = null;
        }
        break;
      }

      case 'dispatch_call_start': {
        // Manual dispatch call start from frontend button
        if (activeDispatchCall) {
          break;
        }
        if (!process.env.TWILIO_ACCOUNT_SID) {
          sendJson({ type: 'error', message: 'Twilio not configured' });
          break;
        }
        try {
          activeDispatchCall = new TwilioDispatchSession({
            onStateChange: (state) => {
              const phaseMap: Record<string, string> = {
                ringing: 'connecting',
                connected: 'on_call',
                completed: 'complete',
                failed: 'error',
              };
              sendJson({
                type: 'dispatch_call_state',
                callState: state,
                phase: phaseMap[state] || state,
                callId: activeDispatchCall?.callId,
              });
            },
            onPhoneAudio: (wavBuffer) => {
              sendJson({
                type: 'dispatch_audio',
                audio: wavBuffer.toString('base64'),
              });
            },
            onCallEnded: (reason) => {
              sendJson({
                type: 'dispatch_call_ended',
                reason,
                callId: activeDispatchCall?.callId,
              });
              activeDispatchCall = null;
            },
          });
          await activeDispatchCall.startCall();
        } catch (err) {
          sendJson({ type: 'error', message: (err as Error).message });
          activeDispatchCall = null;
        }
        break;
      }

      case 'dispatch_call_hangup': {
        if (activeDispatchCall) {
          activeDispatchCall.hangup();
          activeDispatchCall = null;
        }
        break;
      }

      case 'speech_start': {
        if (session) {
          const currentState = session.getState();
          // During dispatch (AI sim), don't interrupt
          if (currentState === 'dispatching' && !activeDispatchCall) {
            break;
          }
          // During real Twilio call, don't send speech_start (audio is being forwarded directly)
          if (activeDispatchCall) {
            break;
          }
          // Interrupt any ongoing response (barge-in)
          if (currentState === 'speaking' || currentState === 'thinking') {
            session.interrupt();
          }
          await session.onSpeechStart();
        }
        break;
      }

      case 'speech_end': {
        // During real Twilio call, don't process speech_end
        if (activeDispatchCall) break;
        if (session) {
          await session.onSpeechEnd();
        }
        break;
      }

      case 'end_session': {
        if (activeDispatchCall) {
          activeDispatchCall.hangup();
          activeDispatchCall = null;
        }
        if (session) {
          session.end();
          session = null;
        }
        break;
      }

      default:
        break;
    }
  });

  ws.on('close', () => {
    if (activeDispatchCall) {
      activeDispatchCall.hangup();
      activeDispatchCall = null;
    }
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
  fillerCache.initialize().catch(() => {
    // error handled silently
  });

  server.listen(PORT, () => {
    // server started
  });
}

start().catch(() => {
  process.exit(1);
});
