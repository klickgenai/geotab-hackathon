import { tool } from 'ai';
import { z } from 'zod';
import { seedSafetyEvents, seedDrivers } from '../data/seed-data.js';

export const getSafetyEvents = tool({
  description: 'Get safety event details including harsh braking, speeding, seatbelt violations, distracted driving, and more. Can filter by driver, event type, severity, and time period. Use when asked about specific safety incidents, event history, or "what happened?"',
  parameters: z.object({
    driverId: z.string().optional().describe('Filter by driver ID'),
    driverName: z.string().optional().describe('Filter by driver name (partial match)'),
    eventType: z.enum([
      'harsh_braking', 'harsh_acceleration', 'speeding', 'seatbelt',
      'distracted_driving', 'drowsy_driving', 'lane_departure', 'tailgating',
      'rolling_stop', 'idle_excessive',
    ]).optional().describe('Filter by event type'),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Filter by severity'),
    days: z.number().optional().describe('Number of days to look back (default: 30)'),
    limit: z.number().optional().describe('Max events to return (default: 20)'),
  }),
  execute: async ({ driverId, driverName, eventType, severity, days, limit }) => {
    const lookbackMs = (days || 30) * 86400000;
    const cutoff = Date.now() - lookbackMs;
    const maxResults = limit || 20;

    if (!driverId && driverName) {
      const match = seedDrivers.find((d) =>
        d.name.toLowerCase().includes(driverName.toLowerCase()),
      );
      if (match) driverId = match.id;
    }

    let events = seedSafetyEvents.filter((e) => new Date(e.dateTime).getTime() > cutoff);
    if (driverId) events = events.filter((e) => e.driverId === driverId);
    if (eventType) events = events.filter((e) => e.type === eventType);
    if (severity) events = events.filter((e) => e.severity === severity);

    const total = events.length;
    const limited = events.slice(0, maxResults);

    // Summary stats
    const typeCounts: Record<string, number> = {};
    const severityCounts: Record<string, number> = {};
    events.forEach((e) => {
      typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
      severityCounts[e.severity] = (severityCounts[e.severity] || 0) + 1;
    });

    return {
      totalEvents: total,
      showing: limited.length,
      period: `${days || 30} days`,
      filters: { driverId, eventType, severity },
      summary: { byType: typeCounts, bySeverity: severityCounts },
      events: limited.map((e) => ({
        id: e.id,
        driverId: e.driverId,
        driverName: seedDrivers.find((d) => d.id === e.driverId)?.name || 'Unknown',
        vehicleId: e.vehicleId,
        type: e.type,
        severity: e.severity,
        dateTime: e.dateTime,
        details: e.details,
      })),
    };
  },
});
