import { tool } from 'ai';
import { z } from 'zod';
import { getFleetSummary } from '../data/seed-data.js';

export const getFleetOverview = tool({
  description: 'Get a comprehensive fleet overview including vehicle count, driver count, safety metrics, distance traveled, fuel usage, risk distribution, and top risk drivers. Use this when the user asks about the fleet, wants a summary, or asks "how is the fleet doing?"',
  parameters: z.object({
    period: z.enum(['7', '30', '90']).optional().describe('Number of days to analyze (default: 30)'),
  }),
  execute: async ({ period }) => {
    const summary = getFleetSummary();
    return {
      ...summary,
      period: `${period || '30'} days`,
      generatedAt: new Date().toISOString(),
    };
  },
});
