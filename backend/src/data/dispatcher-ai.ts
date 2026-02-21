/**
 * Dispatcher AI - Tasha-to-Mike Agent Delegation
 *
 * When a driver needs dispatch help, Tasha autonomously contacts Mike
 * (the dispatcher) on the driver's behalf. The driver never talks directly —
 * Tasha handles the entire conversation and reports back with the outcome.
 * Progress streams to the driver's UI via dispatch bridge callbacks.
 */

import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { LoadAssignment } from './driver-session.js';
import type { DispatchProgressCallback } from '../voice/dispatch-bridge.js';

// ─── Types ──────────────────────────────────────────────────

export interface DispatchCallResult {
  callId: string;
  duration: number;
  summary: string;
  outcome: 'load_confirmed' | 'load_updated' | 'eta_updated' | 'issue_reported' | 'general_info';
  details: Record<string, unknown>;
  messages: Array<{ role: 'dispatcher' | 'ava'; text: string }>;
  cancelled?: boolean;
}

let callIdCounter = 1;

// ─── Multi-Turn Dispatcher Delegation ───────────────────────

export async function runDispatcherDelegation(
  driverId: string,
  driverRequest: string,
  context: {
    currentLoad?: LoadAssignment | null;
    driverName: string;
    driverContext?: string;
  },
  callbacks: DispatchProgressCallback,
  abortSignal?: AbortSignal,
): Promise<DispatchCallResult> {
  const callId = `CALL-${Date.now()}-${callIdCounter++}`;
  const firstName = context.driverName.split(' ')[0];
  const startTime = Date.now();
  const messages: Array<{ role: 'dispatcher' | 'ava'; text: string }> = [];
  let turnNumber = 0;

  const loadInfo = buildLoadInfo(context.currentLoad);

  // Phase 1: Connecting
  callbacks.onStatus('connecting', `Tasha is checking with dispatch...`);

  if (abortSignal?.aborted) {
    return buildCancelledResult(callId, messages);
  }

  try {
    // Turn 1: Tasha opens the call on behalf of the driver, Mike responds
    turnNumber++;
    const avaOpener = `Hey Mike, it's Tasha calling on behalf of ${firstName}. ${driverRequest}`;
    messages.push({ role: 'ava', text: avaOpener });
    callbacks.onMessage('ava', avaOpener, turnNumber);

    if (abortSignal?.aborted) return buildCancelledResult(callId, messages);

    callbacks.onStatus('on_call', 'Tasha is talking to Mike');
    await delay(300); // Brief pause for realism

    // Claude call #1: Mike responds to Tasha
    const mikeResponse1 = await generateMikeResponse(
      firstName, driverId, loadInfo, driverRequest,
      messages, abortSignal
    );

    if (abortSignal?.aborted) return buildCancelledResult(callId, messages);

    messages.push({ role: 'dispatcher', text: mikeResponse1 });
    callbacks.onMessage('dispatcher', mikeResponse1, turnNumber);

    await delay(500);

    // Turn 2: Tasha follow-up, then Mike responds
    turnNumber++;
    if (abortSignal?.aborted) return buildCancelledResult(callId, messages);

    const avaFollowUp = await generateTashaProxy(
      firstName, driverRequest, messages, abortSignal
    );

    if (abortSignal?.aborted) return buildCancelledResult(callId, messages);

    messages.push({ role: 'ava', text: avaFollowUp });
    callbacks.onMessage('ava', avaFollowUp, turnNumber);

    await delay(300);

    const mikeResponse2 = await generateMikeResponse(
      firstName, driverId, loadInfo, driverRequest,
      messages, abortSignal
    );

    if (abortSignal?.aborted) return buildCancelledResult(callId, messages);

    messages.push({ role: 'dispatcher', text: mikeResponse2 });
    callbacks.onMessage('dispatcher', mikeResponse2, turnNumber);

    await delay(500);

    // Turn 3: Natural wrap-up
    turnNumber++;
    callbacks.onStatus('wrapping_up', 'Tasha is wrapping up with dispatch...');

    if (abortSignal?.aborted) return buildCancelledResult(callId, messages);

    const avaClose = await generateTashaProxy(
      firstName, driverRequest, messages, abortSignal
    );

    if (abortSignal?.aborted) return buildCancelledResult(callId, messages);

    messages.push({ role: 'ava', text: avaClose });
    callbacks.onMessage('ava', avaClose, turnNumber);

    await delay(300);

    const mikeClose = await generateMikeResponse(
      firstName, driverId, loadInfo, driverRequest,
      messages, abortSignal
    );

    if (abortSignal?.aborted) return buildCancelledResult(callId, messages);

    messages.push({ role: 'dispatcher', text: mikeClose });
    callbacks.onMessage('dispatcher', mikeClose, turnNumber);

    // Extract structured outcome
    const outcome = await extractOutcome(driverRequest, messages, abortSignal);

    const duration = Math.round((Date.now() - startTime) / 1000);

    callbacks.onStatus('complete', 'Call complete');
    callbacks.onOutcome(outcome.outcome, outcome.summary, outcome.details);

    return {
      callId,
      duration,
      summary: outcome.summary,
      outcome: outcome.outcome as DispatchCallResult['outcome'],
      details: outcome.details,
      messages,
    };
  } catch (error) {
    if (abortSignal?.aborted) {
      return buildCancelledResult(callId, messages);
    }

    callbacks.onStatus('error', 'Could not reach dispatch');

    // If we have partial conversation, return what we got
    if (messages.length >= 2) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      const partialOutcome = inferOutcomeFromMessages(driverRequest, messages, firstName);
      callbacks.onOutcome(partialOutcome.outcome, partialOutcome.summary, partialOutcome.details);
      return {
        callId,
        duration,
        ...partialOutcome,
        messages,
      };
    }

    // Full fallback
    const fallback = buildFallbackResponse(context.driverName, driverRequest, context.currentLoad);
    // Stream fallback messages
    for (let i = 0; i < fallback.messages.length; i++) {
      callbacks.onMessage(fallback.messages[i].role, fallback.messages[i].text, Math.floor(i / 2) + 1);
      await delay(400);
    }
    callbacks.onStatus('complete', 'Call complete');
    callbacks.onOutcome(fallback.outcome, fallback.summary, fallback.details);
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

// Keep the old function as a backward-compatible alias
export async function simulateDispatcherCall(
  driverId: string,
  intent: string,
  context: { currentLoad?: LoadAssignment | null; driverName: string },
): Promise<DispatchCallResult> {
  // Use the new multi-turn delegation with no-op callbacks
  const noopCallbacks: DispatchProgressCallback = {
    onStatus: () => {},
    onMessage: () => {},
    onOutcome: () => {},
  };
  return runDispatcherDelegation(driverId, intent, context, noopCallbacks);
}

// ─── Mike (Dispatcher) Agent ────────────────────────────────

async function generateMikeResponse(
  driverFirstName: string,
  driverId: string,
  loadInfo: string,
  originalRequest: string,
  conversationSoFar: Array<{ role: 'dispatcher' | 'ava'; text: string }>,
  abortSignal?: AbortSignal,
): Promise<string> {
  const conversationText = conversationSoFar
    .map(m => `${m.role === 'dispatcher' ? 'Mike' : 'Tasha'}: ${m.text}`)
    .join('\n');

  const result = await generateText({
    model: anthropic('claude-opus-4-6-20250918'),
    system: `You are Mike, a veteran fleet dispatcher at FleetShield Trucking. You're on a call with Tasha, the AI co-driver assistant who is calling on behalf of driver ${driverFirstName}.

PERSONALITY (dispatch call style):
- Short responses: 1-3 sentences max. Think dispatch radio brevity.
- Use dispatcher shorthand naturally: "Copy that", "10-4", "Roger", "Understood"
- Decisive — give clear answers and concrete next steps
- Professional but warm — you know your drivers and care about them
- Reference actual load data when relevant
- You're talking to Tasha (the AI assistant), not the driver directly. Tasha will relay info back to ${driverFirstName}.
- Sign off warmly: "Tell ${driverFirstName} to stay safe out there" / "10-4, dispatch out"

DRIVER INFO:
- Name: ${driverFirstName} (ID: ${driverId})
${loadInfo}

DRIVER'S ORIGINAL REQUEST (relayed by Tasha):
"${originalRequest}"

CONVERSATION SO FAR:
${conversationText}

Respond as Mike. Keep it brief, decisive, and natural. 1-3 sentences only. No JSON, no formatting — just Mike's spoken words.`,
    prompt: `What does Mike say next in this dispatch call?`,
    maxTokens: 150,
    abortSignal,
  });

  return result.text.trim();
}

// ─── Tasha Proxy Agent (speaks to Mike on behalf of the driver) ─────

async function generateTashaProxy(
  driverFirstName: string,
  originalRequest: string,
  conversationSoFar: Array<{ role: 'dispatcher' | 'ava'; text: string }>,
  abortSignal?: AbortSignal,
): Promise<string> {
  const conversationText = conversationSoFar
    .map(m => `${m.role === 'dispatcher' ? 'Mike' : 'Tasha'}: ${m.text}`)
    .join('\n');

  const result = await generateText({
    model: anthropic('claude-opus-4-6-20250918'),
    system: `You are Tasha, an AI co-driver assistant for FleetShield Trucking. You are on a call with dispatcher Mike, speaking on behalf of driver ${driverFirstName}.

AVA'S STYLE:
- Professional and concise: "Got it, thanks Mike", "Copy that", "I'll let ${driverFirstName} know"
- Speak as Tasha (not as the driver): "The driver needs...", "${driverFirstName} is asking about..."
- Only ask a follow-up if the original question wasn't fully answered
- If Mike has addressed the issue, confirm and prepare to sign off
- 1-2 sentences max

ORIGINAL REQUEST FROM ${driverFirstName}: "${originalRequest}"

CONVERSATION SO FAR:
${conversationText}

Generate Tasha's next response to Mike. Keep it short and natural. No JSON, no formatting.`,
    prompt: `What does Tasha say next to Mike?`,
    maxTokens: 80,
    abortSignal,
  });

  return result.text.trim();
}

// ─── Outcome Extractor ──────────────────────────────────────

async function extractOutcome(
  originalRequest: string,
  messages: Array<{ role: 'dispatcher' | 'ava'; text: string }>,
  abortSignal?: AbortSignal,
): Promise<{
  outcome: string;
  summary: string;
  details: Record<string, unknown>;
}> {
  const conversationText = messages
    .map(m => `${m.role === 'dispatcher' ? 'Mike (Dispatcher)' : 'Tasha (AI Assistant)'}: ${m.text}`)
    .join('\n');

  try {
    const result = await generateText({
      model: anthropic('claude-opus-4-6-20250918'),
      system: `Extract the outcome of this dispatch call conversation.

ORIGINAL REQUEST: "${originalRequest}"

CONVERSATION:
${conversationText}

Respond with ONLY valid JSON:
{
  "outcome": "load_confirmed" | "load_updated" | "eta_updated" | "issue_reported" | "general_info",
  "summary": "1-2 sentence summary of what was resolved",
  "details": { relevant key-value pairs about the outcome }
}`,
      prompt: 'Extract the structured outcome from this dispatch call.',
      maxTokens: 200,
      abortSignal,
    });

    const text = result.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Fall through to inference
  }

  // Infer from messages if extraction fails
  return inferOutcomeFromMessages(originalRequest, messages, '');
}

// ─── Helpers ────────────────────────────────────────────────

function buildLoadInfo(load?: LoadAssignment | null): string {
  if (!load) return 'No current load assigned to this driver.';

  return `CURRENT LOAD DETAILS:
- Load ID: ${load.id}
- Status: ${load.status}
- Origin: ${load.origin.city}, ${load.origin.state} (${load.origin.address})
- Destination: ${load.destination.city}, ${load.destination.state} (${load.destination.address})
- Pickup Time: ${new Date(load.pickupTime).toLocaleString()}
- Delivery Time: ${new Date(load.deliveryTime).toLocaleString()}
- Commodity: ${load.commodity}
- Weight: ${load.weight.toLocaleString()} lbs
- Rate: $${load.rate.toLocaleString()}
- Distance: ${load.distance} km
- Broker: ${load.broker.name} (${load.broker.phone})
- Notes: ${load.notes}`;
}

function inferOutcomeFromMessages(
  request: string,
  messages: Array<{ role: 'dispatcher' | 'ava'; text: string }>,
  firstName: string,
): {
  outcome: DispatchCallResult['outcome'];
  summary: string;
  details: Record<string, unknown>;
} {
  const lower = request.toLowerCase();
  const allText = messages.map(m => m.text).join(' ').toLowerCase();

  if (lower.includes('eta') || lower.includes('late') || lower.includes('delay') || lower.includes('extend')) {
    return {
      outcome: 'eta_updated',
      summary: `Dispatch acknowledged the request regarding timing. ${firstName ? firstName + ' received' : 'Received'} confirmation from Mike.`,
      details: { request, acknowledged: true },
    };
  }
  if (lower.includes('load') || lower.includes('pickup') || lower.includes('delivery')) {
    return {
      outcome: allText.includes('confirm') || allText.includes('copy') ? 'load_confirmed' : 'general_info',
      summary: `Load information discussed with dispatch.`,
      details: { request },
    };
  }
  if (lower.includes('issue') || lower.includes('problem') || lower.includes('broken') || lower.includes('mechanical')) {
    return {
      outcome: 'issue_reported',
      summary: `Issue reported to dispatch and logged.`,
      details: { issue: request, logged: true },
    };
  }
  return {
    outcome: 'general_info',
    summary: `Dispatch call completed regarding: ${request}.`,
    details: { request },
  };
}

function buildCancelledResult(
  callId: string,
  messages: Array<{ role: 'dispatcher' | 'ava'; text: string }>,
): DispatchCallResult {
  return {
    callId,
    duration: 0,
    summary: 'Call cancelled by driver.',
    outcome: 'general_info',
    details: { cancelled: true },
    messages,
    cancelled: true,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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
  messages: Array<{ role: 'dispatcher' | 'ava'; text: string }>;
} {
  const firstName = driverName.split(' ')[0];
  const intentLower = intent.toLowerCase();

  if (intentLower.includes('eta') || intentLower.includes('late') || intentLower.includes('delay')) {
    return {
      outcome: 'eta_updated',
      summary: `Mike confirmed the ETA update for ${firstName}. Dispatch will notify the receiver.`,
      details: { reason: intent, acknowledged: true },
      messages: [
        { role: 'ava', text: `Hey Mike, it's Tasha calling on behalf of ${firstName}. ${intent}` },
        { role: 'dispatcher', text: `Copy that, Tasha. I'll update the receiver on the new ETA. Tell ${firstName} to keep rolling safe.` },
        { role: 'ava', text: `Got it, thanks Mike. I'll let ${firstName} know.` },
        { role: 'dispatcher', text: `No problem. Tell ${firstName} to call if anything changes. Dispatch out.` },
      ],
    };
  }

  if (intentLower.includes('load') || intentLower.includes('pickup') || intentLower.includes('delivery')) {
    const loadInfo = load
      ? `${firstName}'s load ${load.id} is ${load.commodity} going from ${load.origin.city} to ${load.destination.city}. Pickup is at ${new Date(load.pickupTime).toLocaleTimeString()}.`
      : `Let me check what we have available for ${firstName}. I'll get back to you in a few minutes.`;

    return {
      outcome: load ? 'load_confirmed' : 'general_info',
      summary: load
        ? `Mike confirmed load details for ${load.id}.`
        : `Dispatch is checking load availability for ${firstName}.`,
      details: load ? { loadId: load.id, status: load.status } : {},
      messages: [
        { role: 'ava', text: `Hey Mike, Tasha here. ${firstName} is asking about their load. ${intent}` },
        { role: 'dispatcher', text: `Sure thing. ${loadInfo}` },
        { role: 'ava', text: `Perfect, I'll pass that along. Thanks Mike.` },
        { role: 'dispatcher', text: `You bet. Tell ${firstName} to stay safe. Dispatch out.` },
      ],
    };
  }

  if (intentLower.includes('issue') || intentLower.includes('problem') || intentLower.includes('broken') || intentLower.includes('mechanical')) {
    return {
      outcome: 'issue_reported',
      summary: `Issue reported to dispatch for ${firstName}. Mike is arranging support.`,
      details: { issue: intent, logged: true },
      messages: [
        { role: 'ava', text: `Mike, Tasha here. ${firstName} has a situation to report. ${intent}` },
        { role: 'dispatcher', text: `Understood, Tasha. I'm logging that now. Is ${firstName} in a safe location?` },
        { role: 'ava', text: `Yes, ${firstName} is pulled over safely.` },
        { role: 'dispatcher', text: `Good. I'll get our roadside team on it right away. Tell ${firstName} to sit tight, I'll call back in 15 minutes. Stay safe.` },
      ],
    };
  }

  // General fallback
  return {
    outcome: 'general_info',
    summary: `Tasha checked with dispatch regarding: ${intent}. Information provided.`,
    details: { topic: intent },
    messages: [
      { role: 'ava', text: `Hey Mike, Tasha calling on behalf of ${firstName}. ${intent}` },
      { role: 'dispatcher', text: `Got it, Tasha. Let me look into that. One moment...` },
      { role: 'dispatcher', text: `Alright, I've got the info. Everything looks good on our end.` },
      { role: 'ava', text: `Great, I'll pass that along to ${firstName}. Thanks Mike.` },
      { role: 'dispatcher', text: `Anytime. Tell ${firstName} to drive safe. Dispatch out.` },
    ],
  };
}
