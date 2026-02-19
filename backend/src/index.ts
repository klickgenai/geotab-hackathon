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
  addDriverActionItem,
  completeDriverActionItem,
  dismissDriverActionItem,
} from './data/driver-session.js';
import { simulateDispatcherCall } from './data/dispatcher-ai.js';
import { calculateFleetROI, calculateBeforeAfter, calculateRetentionSavings } from './scoring/roi-engine.js';
import { getGamificationState, getPointsHistory, getDriverBadges, getRewardsCatalog, getDailyChallenge, checkChallengeProgress } from './scoring/gamification-engine.js';
import { simulateWhatIf, getDefaultScenarios } from './scoring/what-if-simulator.js';
import { geotabAce } from './services/geotab-ace.js';
import { isUsingLiveData } from './data/fleet-data-provider.js';

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
    console.error('[Chat Stream] Error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', content: 'Agent error' })}\n\n`);
    res.end();
  }
});

// --- Assistant SSE Stream (full-screen assistant with tool results) ---
app.post('/api/assistant/stream', async (req, res) => {
  const { message, currentPage } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    console.log('[Assistant Stream] Starting for message:', message.slice(0, 80));
    const result = await streamAssistantResponse(message, currentPage);

    for await (const part of result.fullStream) {
      switch (part.type) {
        case 'text-delta':
          res.write(`data: ${JSON.stringify({ type: 'text', content: part.textDelta })}\n\n`);
          break;
        case 'tool-call':
          console.log('[Assistant Stream] Tool call:', part.toolName);
          res.write(`data: ${JSON.stringify({ type: 'tool_call', toolName: part.toolName, args: part.args })}\n\n`);
          break;
        case 'tool-result':
          console.log('[Assistant Stream] Tool result:', part.toolName);
          res.write(`data: ${JSON.stringify({ type: 'tool_result', toolName: part.toolName, result: part.result })}\n\n`);
          break;
        case 'error':
          console.error('[Assistant Stream] Stream error event:', part.error);
          res.write(`data: ${JSON.stringify({ type: 'error', content: String(part.error) })}\n\n`);
          break;
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error('[Assistant Stream] Error:', error?.message || error);
    if (error?.cause) console.error('[Assistant Stream] Cause:', error.cause);
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
    const { synthesizeSpeech } = await import('./voice/tts-synthesize.js');
    const audioBuffer = await synthesizeSpeech(apiKey, {
      text: text.slice(0, 500), // Limit to ~500 chars for quick synthesis
      voiceId: voiceId || 'sophia',
      sampleRate: 24000,
      speed: speed || 1.0,
      addWavHeader: true,
    });
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', audioBuffer.length);
    res.send(audioBuffer);
  } catch (error: any) {
    console.error('[TTS] Synthesis error:', error?.message || error);
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
    console.error('[Pre-Shift Briefing] Error:', error);
    res.status(500).json({ error: 'Failed to generate pre-shift briefing' });
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
    console.error('[Ace] Query error:', error);
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

// --- Data Source Info ---
app.get('/api/fleet/data-source', (_req, res) => {
  res.json({
    isLiveData: isUsingLiveData(),
    geotabConfigured: geotabAuth.isConfigured(),
    database: geotabAuth.isConfigured() ? process.env.GEOTAB_DATABASE : null,
  });
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
        }, driverContext);
        try {
          await session.startListening();
          console.log(`[WS] Voice session started: ${session.sessionId}${voiceDriverId ? ` for driver ${voiceDriverId}` : ''}`);
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
