import { tool } from 'ai';
import { z } from 'zod';
import { geotabAce } from '../services/geotab-ace.js';
import { geotabAuth } from '../services/geotab-auth.js';

export const queryAceAnalytics = tool({
  description: 'Query Geotab Ace for natural language analytics on fleet data. Ace can answer questions like "How many miles did the fleet drive last month?", "Which vehicles had the most idling?", "Show me trip patterns for last week." This uses the Geotab Ace API which requires Geotab credentials. If credentials are not configured, returns an informational message.',
  parameters: z.object({
    question: z.string().describe('Natural language question about fleet data (e.g., "How many miles did the fleet drive last month?")'),
  }),
  execute: async ({ question }) => {
    if (!geotabAuth.isConfigured()) {
      return {
        status: 'demo_mode',
        message: 'Ace API requires Geotab credentials. Using seed data for this demo.',
        question,
        suggestion: 'Configure GEOTAB_DATABASE, GEOTAB_USERNAME, and GEOTAB_PASSWORD to enable Ace analytics.',
      };
    }

    try {
      const result = await geotabAce.query(question);
      return {
        status: result.status,
        answer: result.text,
        data: result.data,
        hasCharts: result.charts.length > 0,
        question,
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Ace query failed: ${error instanceof Error ? error.message : String(error)}`,
        question,
      };
    }
  },
});
