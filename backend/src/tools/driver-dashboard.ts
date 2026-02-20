/**
 * Driver-Facing AI Tools
 * Tools for the driver dashboard: personal stats, load management,
 * dispatch call simulation, and leaderboard.
 */

import { tool } from 'ai';
import { z } from 'zod';
import {
  getDriverSession,
  getDriverLoad,
  getActiveLoads,
  updateLoadStatus,
  getDriverLeaderboard,
  getDriverMessages,
  type LoadAssignment,
} from '../data/driver-session.js';
import { runDispatcherDelegation } from '../data/dispatcher-ai.js';
import { makeDispatchProgressCallbacks } from '../voice/dispatch-bridge.js';
import { seedDrivers } from '../data/seed-data.js';

export const getDriverDashboard = tool({
  description:
    'Get a driver\'s personal dashboard including safety score, streak days, current load, recent messages, and weekly rank. Use when a driver asks "how am I doing?", wants their stats, or asks about their score/rank.',
  parameters: z.object({
    driverId: z
      .string()
      .optional()
      .describe('Driver ID (e.g., "d1"). If not provided, tries to find by name.'),
    driverName: z
      .string()
      .optional()
      .describe('Search by driver name (partial match). Ignored if driverId is provided.'),
  }),
  execute: async ({ driverId, driverName }) => {
    const resolvedId = resolveDriverId(driverId, driverName);
    if (!resolvedId) return { error: 'Driver not found. Please provide a valid driver ID or name.' };

    const session = getDriverSession(resolvedId);
    if (!session) return { error: `Could not load session for driver ${resolvedId}` };

    return {
      driverId: session.driverId,
      driverName: session.driverName,
      vehicleName: session.vehicleName,
      safetyScore: session.safetyScore,
      streakDays: session.streakDays,
      todayEvents: session.todayEvents,
      weeklyRank: session.weeklyRank,
      currentLoad: session.currentLoad
        ? {
            loadId: session.currentLoad.id,
            status: session.currentLoad.status,
            origin: `${session.currentLoad.origin.city}, ${session.currentLoad.origin.state}`,
            destination: `${session.currentLoad.destination.city}, ${session.currentLoad.destination.state}`,
            commodity: session.currentLoad.commodity,
            distance: session.currentLoad.distance,
          }
        : null,
      unreadMessages: session.recentMessages.filter((m) => !m.read).length,
      recentMessages: session.recentMessages.slice(0, 5).map((m) => ({
        from: m.from,
        text: m.text,
        timestamp: m.timestamp,
        read: m.read,
      })),
    };
  },
});

export const getLoadUpdates = tool({
  description:
    'Get detailed information about a driver\'s current load assignment including origin, destination, pickup/delivery times, commodity, weight, rate, broker info, and status. Use when a driver asks about their load, shipment, or delivery details.',
  parameters: z.object({
    driverId: z
      .string()
      .optional()
      .describe('Driver ID (e.g., "d1"). If not provided, tries to find by name.'),
    driverName: z
      .string()
      .optional()
      .describe('Search by driver name (partial match).'),
  }),
  execute: async ({ driverId, driverName }) => {
    const resolvedId = resolveDriverId(driverId, driverName);
    if (!resolvedId) return { error: 'Driver not found.' };

    const load = getDriverLoad(resolvedId);
    if (!load) {
      return {
        driverId: resolvedId,
        hasLoad: false,
        message: 'No active load assigned. Contact dispatch for your next assignment.',
      };
    }

    return {
      driverId: resolvedId,
      hasLoad: true,
      load: {
        id: load.id,
        status: load.status,
        origin: load.origin,
        destination: load.destination,
        pickupTime: load.pickupTime,
        deliveryTime: load.deliveryTime,
        commodity: load.commodity,
        weight: load.weight,
        rate: load.rate,
        distance: load.distance,
        broker: load.broker,
        notes: load.notes,
      },
      nextSteps: getNextSteps(load),
    };
  },
});

export const initiateDispatcherCall = tool({
  description:
    'Contact dispatcher "Mike" on behalf of the driver to get information, resolve issues, or handle requests that require dispatch coordination. Ava calls Mike autonomously — the driver does NOT talk directly. Use when a driver needs dispatch help: load questions, delivery extensions, schedule changes, mechanical issues, route changes, ETA updates, or anything requiring dispatcher input. Also use when the driver says "ask dispatch", "check with dispatch", "call dispatch", or "talk to Mike".',
  parameters: z.object({
    driverId: z
      .string()
      .optional()
      .describe('Driver ID.'),
    driverName: z
      .string()
      .optional()
      .describe('Search by driver name (partial match).'),
    intent: z
      .string()
      .describe('What Ava needs to discuss with dispatch on the driver\'s behalf (e.g., "driver is running 30 minutes late and needs delivery extension", "driver needs next load assignment", "driver reporting brake issue on vehicle").'),
    conversationContext: z
      .string()
      .optional()
      .describe('Additional context from the conversation with the driver, if relevant.'),
    sessionId: z
      .string()
      .optional()
      .describe('Voice session ID for streaming dispatch progress to the driver UI.'),
  }),
  execute: async ({ driverId, driverName, intent, conversationContext, sessionId }) => {
    const resolvedId = resolveDriverId(driverId, driverName);
    if (!resolvedId) return { error: 'Driver not found.' };

    const driver = seedDrivers.find((d) => d.id === resolvedId);
    if (!driver) return { error: 'Driver not found.' };

    const load = getDriverLoad(resolvedId);

    // Create progress callbacks — streams to UI if sessionId is available
    const callbacks = sessionId
      ? makeDispatchProgressCallbacks(sessionId)
      : { onStatus: () => {}, onMessage: () => {}, onOutcome: () => {} };

    const result = await runDispatcherDelegation(
      resolvedId,
      intent,
      {
        currentLoad: load,
        driverName: driver.name,
        driverContext: conversationContext,
      },
      callbacks,
    );

    return {
      callId: result.callId,
      duration: result.duration,
      durationFormatted: `${Math.floor(result.duration / 60)}m ${result.duration % 60}s`,
      outcome: result.outcome,
      summary: result.summary,
      conversation: result.messages,
      details: result.details,
      cancelled: result.cancelled || false,
    };
  },
});

export const getDriverLeaderboardTool = tool({
  description:
    'Get the driver safety leaderboard showing rankings, scores, and streak days for all drivers. Use when a driver asks about rankings, leaderboard, "where do I stand?", or wants to see how they compare to other drivers.',
  parameters: z.object({
    top: z
      .number()
      .optional()
      .describe('Number of top drivers to return (default: 10).'),
    driverId: z
      .string()
      .optional()
      .describe('Highlight a specific driver in the results.'),
    driverName: z
      .string()
      .optional()
      .describe('Highlight a specific driver by name.'),
  }),
  execute: async ({ top, driverId, driverName }) => {
    const leaderboard = getDriverLeaderboard();
    const limit = top || 10;

    const resolvedId = resolveDriverId(driverId, driverName);
    const highlightedDriver = resolvedId
      ? leaderboard.find((r) => r.driverId === resolvedId)
      : null;

    return {
      totalDrivers: leaderboard.length,
      topDrivers: leaderboard.slice(0, limit).map((r) => ({
        rank: r.rank,
        driverId: r.driverId,
        name: r.name,
        safetyScore: r.score,
        streakDays: r.streak,
      })),
      yourRanking: highlightedDriver
        ? {
            rank: highlightedDriver.rank,
            name: highlightedDriver.name,
            safetyScore: highlightedDriver.score,
            streakDays: highlightedDriver.streak,
            percentile: Math.round(
              ((leaderboard.length - highlightedDriver.rank) / leaderboard.length) * 100,
            ),
          }
        : null,
    };
  },
});

export const updateDriverLoadStatus = tool({
  description:
    'Update the status of a load assignment. Use when a driver says they\'ve arrived at pickup, loaded, are in transit, arrived at delivery, or delivered. Valid statuses: assigned, en_route, at_pickup, loaded, in_transit, at_delivery, delivered.',
  parameters: z.object({
    driverId: z
      .string()
      .optional()
      .describe('Driver ID.'),
    driverName: z
      .string()
      .optional()
      .describe('Search by driver name.'),
    loadId: z
      .string()
      .optional()
      .describe('Load ID (e.g., "LD-1000"). If not provided, uses the driver\'s current load.'),
    status: z
      .enum(['assigned', 'en_route', 'at_pickup', 'loaded', 'in_transit', 'at_delivery', 'delivered'])
      .describe('New load status.'),
  }),
  execute: async ({ driverId, driverName, loadId, status }) => {
    const resolvedId = resolveDriverId(driverId, driverName);

    // Resolve load ID
    let targetLoadId = loadId;
    if (!targetLoadId && resolvedId) {
      const load = getDriverLoad(resolvedId);
      if (load) targetLoadId = load.id;
    }

    if (!targetLoadId) {
      return { error: 'No load found. Please specify a load ID or ensure the driver has an active load.' };
    }

    const updated = updateLoadStatus(targetLoadId, status);
    if (!updated) return { error: `Load ${targetLoadId} not found.` };

    return {
      loadId: updated.id,
      previousStatus: 'updated',
      newStatus: updated.status,
      origin: `${updated.origin.city}, ${updated.origin.state}`,
      destination: `${updated.destination.city}, ${updated.destination.state}`,
      notes: updated.notes,
      message: `Load ${updated.id} status updated to "${status.replace(/_/g, ' ')}".`,
    };
  },
});

// ─── Helpers ────────────────────────────────────────────────

function resolveDriverId(driverId?: string, driverName?: string): string | null {
  if (driverId) {
    const exists = seedDrivers.find((d) => d.id === driverId);
    return exists ? driverId : null;
  }
  if (driverName) {
    const match = seedDrivers.find((d) =>
      d.name.toLowerCase().includes(driverName.toLowerCase()),
    );
    return match?.id || null;
  }
  return null;
}

function getNextSteps(load: LoadAssignment): string {
  switch (load.status) {
    case 'assigned':
      return `Head to pickup at ${load.origin.address}, ${load.origin.city}. Contact shipper when you are 30 minutes out.`;
    case 'en_route':
      return `Continue to ${load.origin.city} for pickup. ETA: ${new Date(load.pickupTime).toLocaleTimeString()}.`;
    case 'at_pickup':
      return 'Check in at the dock. Once loaded, verify seal number and sign BOL.';
    case 'loaded':
      return `Depart for ${load.destination.city}, ${load.destination.state}. Delivery by ${new Date(load.deliveryTime).toLocaleTimeString()}.`;
    case 'in_transit':
      return `Continue to ${load.destination.city}. Contact receiver 1 hour before arrival.`;
    case 'at_delivery':
      return 'Check in at receiver dock. Once unloaded, get signed POD and update status to delivered.';
    case 'delivered':
      return 'Load complete. Submit POD and contact dispatch for next assignment.';
    default:
      return 'Contact dispatch for instructions.';
  }
}
