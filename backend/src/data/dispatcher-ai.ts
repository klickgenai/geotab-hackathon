/**
 * Dispatcher AI - Simulated Dispatch Call Agent
 * When a driver "calls dispatch", this module simulates a conversation
 * with a dispatcher named Mike using Claude via Vercel AI SDK.
 */

import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { LoadAssignment } from './driver-session.js';

// ─── Types ──────────────────────────────────────────────────

export interface DispatchCallResult {
  callId: string;
  duration: number;
  summary: string;
  outcome: 'load_confirmed' | 'load_updated' | 'eta_updated' | 'issue_reported' | 'general_info';
  details: Record<string, unknown>;
  messages: Array<{ role: 'dispatcher' | 'driver'; text: string }>;
}

let callIdCounter = 1;

// ─── Dispatcher Call Simulation ─────────────────────────────

export async function simulateDispatcherCall(
  driverId: string,
  intent: string,
  context: { currentLoad?: LoadAssignment | null; driverName: string },
): Promise<DispatchCallResult> {
  const callId = `CALL-${Date.now()}-${callIdCounter++}`;

  const loadInfo = context.currentLoad
    ? `
CURRENT LOAD DETAILS:
- Load ID: ${context.currentLoad.id}
- Status: ${context.currentLoad.status}
- Origin: ${context.currentLoad.origin.city}, ${context.currentLoad.origin.state} (${context.currentLoad.origin.address})
- Destination: ${context.currentLoad.destination.city}, ${context.currentLoad.destination.state} (${context.currentLoad.destination.address})
- Pickup Time: ${new Date(context.currentLoad.pickupTime).toLocaleString()}
- Delivery Time: ${new Date(context.currentLoad.deliveryTime).toLocaleString()}
- Commodity: ${context.currentLoad.commodity}
- Weight: ${context.currentLoad.weight.toLocaleString()} lbs
- Rate: $${context.currentLoad.rate.toLocaleString()}
- Distance: ${context.currentLoad.distance} km
- Broker: ${context.currentLoad.broker.name} (${context.currentLoad.broker.phone})
- Notes: ${context.currentLoad.notes}
`
    : '\nNo current load assigned to this driver.';

  const systemPrompt = `You are Mike, a fleet dispatcher at FleetShield Trucking. You are handling a phone call from one of your drivers.

YOUR PERSONALITY:
- Professional but friendly and supportive
- You know the driver by first name and use it naturally
- Calm and helpful, even when drivers are frustrated
- Decisive -- you give clear answers and next steps
- You care about driver safety and well-being

DRIVER ON THE CALL:
- Name: ${context.driverName}
- Driver ID: ${driverId}
${loadInfo}

DRIVER'S REASON FOR CALLING:
"${intent}"

YOUR TASK:
Generate a realistic dispatcher-driver phone conversation (3-5 exchanges back and forth).

IMPORTANT: You must respond with ONLY valid JSON in this exact format (no markdown, no code blocks, no extra text):
{
  "outcome": "load_confirmed" | "load_updated" | "eta_updated" | "issue_reported" | "general_info",
  "summary": "Brief 1-2 sentence summary of the call outcome",
  "details": { any relevant details like new ETA, issue description, etc. },
  "messages": [
    { "role": "dispatcher", "text": "Mike's greeting" },
    { "role": "driver", "text": "Driver's message" },
    { "role": "dispatcher", "text": "Mike's response" },
    ...
  ]
}

Make the conversation feel natural and realistic. Mike should address the driver's intent directly and provide helpful information based on the load details available.`;

  try {
    const result = await generateText({
      model: anthropic('claude-sonnet-4-5-20250929'),
      system: systemPrompt,
      prompt: `Generate the dispatcher call conversation for driver ${context.driverName} who is calling about: "${intent}"`,
      maxTokens: 1024,
    });

    // Parse the structured response
    const responseText = result.text.trim();
    let parsed: {
      outcome: DispatchCallResult['outcome'];
      summary: string;
      details: Record<string, unknown>;
      messages: Array<{ role: 'dispatcher' | 'driver'; text: string }>;
    };

    try {
      parsed = JSON.parse(responseText);
    } catch {
      // If JSON parsing fails, try extracting JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: construct a basic response
        parsed = buildFallbackResponse(context.driverName, intent, context.currentLoad);
      }
    }

    // Validate outcome
    const validOutcomes = ['load_confirmed', 'load_updated', 'eta_updated', 'issue_reported', 'general_info'] as const;
    if (!validOutcomes.includes(parsed.outcome as typeof validOutcomes[number])) {
      parsed.outcome = 'general_info';
    }

    // Simulate call duration based on message count (15-30 sec per exchange)
    const duration = parsed.messages.length * Math.round(15 + Math.random() * 15);

    return {
      callId,
      duration,
      summary: parsed.summary || 'Call completed.',
      outcome: parsed.outcome,
      details: parsed.details || {},
      messages: parsed.messages || [],
    };
  } catch (error) {
    console.error('[DispatcherAI] Error simulating call:', error);

    // Return a fallback response when AI is unavailable
    const fallback = buildFallbackResponse(context.driverName, intent, context.currentLoad);
    return {
      callId,
      duration: 45,
      summary: fallback.summary,
      outcome: fallback.outcome,
      details: fallback.details,
      messages: fallback.messages,
    };
  }
}

// ─── Fallback Response Builder ──────────────────────────────

function buildFallbackResponse(
  driverName: string,
  intent: string,
  load?: LoadAssignment | null,
): {
  outcome: DispatchCallResult['outcome'];
  summary: string;
  details: Record<string, unknown>;
  messages: Array<{ role: 'dispatcher' | 'driver'; text: string }>;
} {
  const firstName = driverName.split(' ')[0];
  const intentLower = intent.toLowerCase();

  if (intentLower.includes('eta') || intentLower.includes('late') || intentLower.includes('delay')) {
    return {
      outcome: 'eta_updated',
      summary: `ETA update discussed with ${firstName}. Dispatch acknowledged the delay and will notify the receiver.`,
      details: { reason: intent, acknowledged: true },
      messages: [
        { role: 'dispatcher', text: `FleetShield Dispatch, this is Mike. Hey ${firstName}, what's going on?` },
        { role: 'driver', text: `Hey Mike, ${intent}` },
        { role: 'dispatcher', text: `Copy that, ${firstName}. I'll update the receiver on the new ETA. Just keep rolling safe and let me know if anything changes.` },
        { role: 'driver', text: 'Will do. Thanks Mike.' },
        { role: 'dispatcher', text: `No problem. Drive safe out there, ${firstName}. Call if you need anything.` },
      ],
    };
  }

  if (intentLower.includes('load') || intentLower.includes('pickup') || intentLower.includes('delivery')) {
    const loadInfo = load
      ? `Your load ${load.id} is ${load.commodity} going from ${load.origin.city} to ${load.destination.city}. Pickup is at ${new Date(load.pickupTime).toLocaleTimeString()}.`
      : `Let me check what we have available for you. I'll get back to you in a few minutes with a load assignment.`;

    return {
      outcome: load ? 'load_confirmed' : 'general_info',
      summary: load
        ? `Confirmed load details for ${load.id} with ${firstName}.`
        : `${firstName} inquired about load availability. Dispatch will follow up.`,
      details: load ? { loadId: load.id, status: load.status } : {},
      messages: [
        { role: 'dispatcher', text: `FleetShield Dispatch, Mike speaking. What can I do for you, ${firstName}?` },
        { role: 'driver', text: `Hey Mike, ${intent}` },
        { role: 'dispatcher', text: `Sure thing. ${loadInfo}` },
        { role: 'driver', text: 'Got it, thanks for the info.' },
        { role: 'dispatcher', text: `You bet. Stay safe out there, ${firstName}. Dispatch out.` },
      ],
    };
  }

  if (intentLower.includes('issue') || intentLower.includes('problem') || intentLower.includes('broken') || intentLower.includes('mechanical')) {
    return {
      outcome: 'issue_reported',
      summary: `${firstName} reported an issue: "${intent}". Dispatch logged the report and will arrange support.`,
      details: { issue: intent, logged: true },
      messages: [
        { role: 'dispatcher', text: `FleetShield Dispatch, this is Mike. Go ahead, ${firstName}.` },
        { role: 'driver', text: `Mike, I've got a situation. ${intent}` },
        { role: 'dispatcher', text: `Understood, ${firstName}. I'm logging that now. Are you in a safe location? Let me get you some help.` },
        { role: 'driver', text: `Yeah, I'm pulled over safely. What's the next step?` },
        { role: 'dispatcher', text: `Good. I'll get our roadside team on it right away. Sit tight and I'll call you back in 15 minutes with an update. Stay safe.` },
      ],
    };
  }

  // General fallback
  return {
    outcome: 'general_info',
    summary: `Dispatch call with ${firstName} regarding: ${intent}. Information provided.`,
    details: { topic: intent },
    messages: [
      { role: 'dispatcher', text: `FleetShield Dispatch, Mike here. What's up, ${firstName}?` },
      { role: 'driver', text: `Hey Mike. ${intent}` },
      { role: 'dispatcher', text: `Got it. Let me look into that for you. One moment...` },
      { role: 'dispatcher', text: `Alright ${firstName}, I've got the info you need. Everything looks good on our end. Is there anything else I can help with?` },
      { role: 'driver', text: `No, that's it. Thanks Mike.` },
      { role: 'dispatcher', text: `Anytime. Drive safe. Dispatch out.` },
    ],
  };
}
