import { tool } from 'ai';
import { z } from 'zod';
import { getTriagedAlerts, getDailyBriefing } from '../scoring/alert-triage.js';

export const getAlertBriefing = tool({
  description: 'Get the daily alert briefing or triaged alerts for the fleet. Returns prioritized, clustered safety alerts with urgency scores, suggested actions, and a fleet risk summary. Use when asked about alerts, "what needs attention today?", daily briefing, or triaged incidents.',
  parameters: z.object({
    mode: z.enum(['briefing', 'alerts']).optional().describe('Mode: "briefing" for daily summary with top alerts, "alerts" for full alert list. Default: briefing.'),
    limit: z.number().optional().describe('Max number of alerts to return (default: all for alerts mode, 10 for briefing).'),
    priority: z.enum(['critical', 'high', 'medium', 'low']).optional().describe('Filter alerts by priority level.'),
  }),
  execute: async ({ mode, limit, priority }) => {
    if (mode === 'alerts') {
      let alerts = getTriagedAlerts(limit);
      if (priority) {
        alerts = alerts.filter((a) => a.priority === priority);
      }
      return {
        totalAlerts: alerts.length,
        alerts: alerts.map((a) => ({
          id: a.id,
          priority: a.priority,
          urgencyScore: a.urgencyScore,
          title: a.title,
          category: a.category,
          affectedDriver: a.affectedDriver.name,
          suggestedAction: a.suggestedAction,
          timestamp: a.timestamp,
        })),
      };
    }

    // Default: briefing
    const briefing = getDailyBriefing();
    return {
      criticalCount: briefing.criticalCount,
      highCount: briefing.highCount,
      fleetRiskSummary: briefing.fleetRiskSummary,
      topAlerts: briefing.topAlerts.map((a) => ({
        id: a.id,
        priority: a.priority,
        urgencyScore: a.urgencyScore,
        title: a.title,
        category: a.category,
        affectedDriver: a.affectedDriver.name,
        suggestedAction: a.suggestedAction,
      })),
    };
  },
});
