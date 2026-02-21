import { tool } from 'ai';
import { z } from 'zod';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateInsuranceScore } from '../scoring/insurance-score-engine.js';
import { calculateAllDriverRisks } from '../scoring/driver-risk-engine.js';
import { getFleetWellnessSummary } from '../scoring/wellness-predictor.js';
import { getFleetSummary } from '../data/seed-data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORTS_DIR = path.join(__dirname, '../../reports');

export const generateContextReport = tool({
  description:
    'Generate an AI-powered PDF report from conversation context. Creates a professional multi-page PDF with executive summary, key findings, action items, and fleet data. Use when asked to "generate a report", "create a report about this", "make this a report", or "produce a PDF".',
  parameters: z.object({
    topic: z.string().describe('Report title / topic (e.g. "Fleet Safety Analysis Q1 2026")'),
    sections: z
      .array(z.string())
      .optional()
      .describe('Optional list of section names to include beyond the defaults'),
    conversationContext: z
      .string()
      .describe(
        'Full conversation context including all key data points, scores, driver names, findings, and recommendations discussed so far',
      ),
  }),
  execute: async ({ topic, sections, conversationContext }) => {
    // Ensure reports directory exists
    if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `context-report-${timestamp}.pdf`;
    const filepath = path.join(REPORTS_DIR, filename);

    // Pull real fleet data from scoring engines
    const insuranceScore = calculateInsuranceScore();
    const driverRisks = calculateAllDriverRisks();
    const wellness = getFleetWellnessSummary();
    const fleet = getFleetSummary();

    // Build a data snapshot string for the AI
    const topRiskDrivers = driverRisks
      .slice(0, 5)
      .map((r) => `${r.driverName} (score: ${r.riskScore}, tier: ${r.tier}, cost: $${r.annualizedCost.toLocaleString()})`)
      .join('; ');

    const fleetDataSnapshot = `
Fleet: ${fleet.totalVehicles} vehicles, ${fleet.totalDrivers} drivers
Insurance Score: ${insuranceScore.overallScore}/100 (Grade: ${insuranceScore.grade})
Industry Percentile: Top ${100 - insuranceScore.percentile}%
30-Day Safety Events: ${fleet.totalSafetyEvents}
Premium Savings Potential: $${insuranceScore.premiumImpact.estimatedAnnualSavings.toLocaleString()}/year
Wellness: Avg score ${wellness.avgWellnessScore}/100, ${wellness.highBurnoutRisk} high-burnout drivers, $${wellness.totalRetentionCostAtRisk.toLocaleString()} retention cost at risk
Risk Distribution: ${fleet.riskDistribution.low} low, ${fleet.riskDistribution.moderate} moderate, ${fleet.riskDistribution.high} high, ${fleet.riskDistribution.critical} critical
Top Risk Drivers: ${topRiskDrivers}
Score Components: Safe Driving ${insuranceScore.components.safeDriving.score}/100, Compliance ${insuranceScore.components.compliance.score}/100, Maintenance ${insuranceScore.components.maintenance.score}/100, Driver Quality ${insuranceScore.components.driverQuality.score}/100
Trend: ${insuranceScore.trend}
`.trim();

    // Use Claude to generate structured AI analysis
    const aiResult = await generateText({
      model: anthropic('claude-opus-4-6-20250918'),
      prompt: `You are FleetShield AI, an expert fleet safety and insurance analyst. Based on the conversation context and fleet data below, produce a structured report analysis.

## Report Topic
${topic}

## Conversation Context
${conversationContext}

## Current Fleet Data
${fleetDataSnapshot}

${sections && sections.length > 0 ? `## Additional Sections Requested\n${sections.join(', ')}` : ''}

Produce your response in EXACTLY this format (use the exact section headers):

EXECUTIVE_SUMMARY_START
Write 3-5 detailed paragraphs summarizing the key insights, current state, and strategic recommendations based on the conversation and data. Be specific with numbers, driver names, and dollar amounts.
EXECUTIVE_SUMMARY_END

KEY_FINDINGS_START
1. [Finding with specific data point]
2. [Finding with specific data point]
3. [Finding with specific data point]
4. [Finding with specific data point]
5. [Finding with specific data point]
6. [Finding with specific data point]
7. [Finding with specific data point]
8. [Finding with specific data point]
KEY_FINDINGS_END

ACTION_ITEMS_START
1. PRIORITY: High | RESPONSIBLE: [Role/Team] | DEADLINE: [Timeframe] | IMPACT: $[Amount] | ACTION: [Specific action description]
2. PRIORITY: High | RESPONSIBLE: [Role/Team] | DEADLINE: [Timeframe] | IMPACT: $[Amount] | ACTION: [Specific action description]
3. PRIORITY: Medium | RESPONSIBLE: [Role/Team] | DEADLINE: [Timeframe] | IMPACT: $[Amount] | ACTION: [Specific action description]
4. PRIORITY: Medium | RESPONSIBLE: [Role/Team] | DEADLINE: [Timeframe] | IMPACT: $[Amount] | ACTION: [Specific action description]
5. PRIORITY: Low | RESPONSIBLE: [Role/Team] | DEADLINE: [Timeframe] | IMPACT: $[Amount] | ACTION: [Specific action description]
ACTION_ITEMS_END

Be specific, data-driven, and actionable. Reference actual driver names and scores from the fleet data. Dollar impacts should be realistic based on the fleet size and data provided.`,
    });

    // Parse AI response
    const aiText = aiResult.text;

    const executiveSummary = extractSection(aiText, 'EXECUTIVE_SUMMARY_START', 'EXECUTIVE_SUMMARY_END');
    const keyFindingsRaw = extractSection(aiText, 'KEY_FINDINGS_START', 'KEY_FINDINGS_END');
    const actionItemsRaw = extractSection(aiText, 'ACTION_ITEMS_START', 'ACTION_ITEMS_END');

    // Parse key findings into array
    const keyFindings = keyFindingsRaw
      .split('\n')
      .map((line) => line.replace(/^\d+\.\s*/, '').trim())
      .filter((line) => line.length > 0);

    // Parse action items into structured objects
    const actionItems = actionItemsRaw
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const stripped = line.replace(/^\d+\.\s*/, '').trim();
        const priorityMatch = stripped.match(/PRIORITY:\s*(\w+)/i);
        const responsibleMatch = stripped.match(/RESPONSIBLE:\s*([^|]+)/i);
        const deadlineMatch = stripped.match(/DEADLINE:\s*([^|]+)/i);
        const impactMatch = stripped.match(/IMPACT:\s*([^|]+)/i);
        const actionMatch = stripped.match(/ACTION:\s*(.+)/i);
        return {
          priority: priorityMatch?.[1]?.trim() || 'Medium',
          responsible: responsibleMatch?.[1]?.trim() || 'Fleet Manager',
          deadline: deadlineMatch?.[1]?.trim() || '30 days',
          impact: impactMatch?.[1]?.trim() || 'TBD',
          action: actionMatch?.[1]?.trim() || stripped,
        };
      });

    // Generate the PDF
    await generatePDF(filepath, {
      topic,
      executiveSummary,
      keyFindings,
      actionItems,
      insuranceScore,
      driverRisks,
      wellness,
      fleet,
    });

    return {
      status: 'generated' as const,
      filename,
      downloadUrl: `/api/reports/${filename}`,
      title: topic,
      generatedAt: new Date().toISOString(),
    };
  },
});

function extractSection(text: string, startMarker: string, endMarker: string): string {
  const startIdx = text.indexOf(startMarker);
  const endIdx = text.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1) return '';
  return text.slice(startIdx + startMarker.length, endIdx).trim();
}

interface ReportData {
  topic: string;
  executiveSummary: string;
  keyFindings: string[];
  actionItems: Array<{
    priority: string;
    responsible: string;
    deadline: string;
    impact: string;
    action: string;
  }>;
  insuranceScore: ReturnType<typeof calculateInsuranceScore>;
  driverRisks: ReturnType<typeof calculateAllDriverRisks>;
  wellness: ReturnType<typeof getFleetWellnessSummary>;
  fleet: ReturnType<typeof getFleetSummary>;
}

async function generatePDF(filepath: string, data: ReportData): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'letter', margin: 50 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    const GREEN = '#10b981';
    const WARNING = '#f59e0b';
    const CRITICAL = '#ef4444';
    const DARK = '#1e293b';
    const GRAY = '#64748b';
    const LIGHT_GRAY = '#f1f5f9';

    // ============================================
    // PAGE 1: COVER PAGE
    // ============================================
    doc.moveDown(6);
    doc.fontSize(32).font('Helvetica-Bold').fillColor(DARK).text('FleetShield AI', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(18).font('Helvetica').fillColor(GRAY).text('AI-Generated Intelligence Report', { align: 'center' });
    doc.moveDown(2);

    // Accent line
    const pageWidth = doc.page.width - 100;
    doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor(GREEN).lineWidth(3).stroke();
    doc.moveDown(2);

    doc.fontSize(22).font('Helvetica-Bold').fillColor(DARK).text(data.topic, { align: 'center' });
    doc.moveDown(1);
    doc.fontSize(12).font('Helvetica').fillColor(GRAY).text(`Generated: ${new Date().toLocaleString()}`, {
      align: 'center',
    });
    doc.text(`Fleet: ${data.fleet.totalVehicles} Vehicles | ${data.fleet.totalDrivers} Drivers`, { align: 'center' });
    doc.text(`Insurance Grade: ${data.insuranceScore.grade} (${data.insuranceScore.overallScore}/100)`, {
      align: 'center',
    });
    doc.moveDown(4);

    doc.fontSize(10).fillColor(GRAY).text('Powered by Geotab Telematics + Claude AI', { align: 'center' });
    doc.text('Confidential - For Internal Use Only', { align: 'center' });

    // ============================================
    // PAGE 2: EXECUTIVE SUMMARY
    // ============================================
    doc.addPage();
    doc.fontSize(20).font('Helvetica-Bold').fillColor(DARK).text('Executive Summary');
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(200, doc.y).strokeColor(GREEN).lineWidth(2).stroke();
    doc.moveDown(0.8);

    // Split executive summary into paragraphs and render
    const summaryParagraphs = data.executiveSummary.split('\n\n').filter((p) => p.trim().length > 0);
    doc.fontSize(11).font('Helvetica').fillColor('#334155');
    for (const paragraph of summaryParagraphs) {
      doc.text(paragraph.trim(), { align: 'justify', lineGap: 2 });
      doc.moveDown(0.5);
    }

    // Quick stats box
    doc.moveDown(0.5);
    const boxY = doc.y;
    doc.rect(50, boxY, pageWidth, 80).fillAndStroke(LIGHT_GRAY, '#e2e8f0');
    doc.fillColor(DARK).fontSize(10).font('Helvetica-Bold');
    doc.text('Quick Stats', 70, boxY + 10);
    doc.fontSize(10).font('Helvetica').fillColor('#475569');
    doc.text(
      `Insurance Score: ${data.insuranceScore.overallScore}/100 (${data.insuranceScore.grade})   |   ` +
        `Safety Events (30d): ${data.fleet.totalSafetyEvents}   |   ` +
        `Premium Savings: $${data.insuranceScore.premiumImpact.estimatedAnnualSavings.toLocaleString()}/yr`,
      70,
      boxY + 30,
      { width: pageWidth - 40 },
    );
    doc.text(
      `Burnout Risk: ${data.wellness.highBurnoutRisk} high-risk drivers   |   ` +
        `Retention Cost at Risk: $${data.wellness.totalRetentionCostAtRisk.toLocaleString()}   |   ` +
        `Trend: ${data.insuranceScore.trend}`,
      70,
      boxY + 50,
      { width: pageWidth - 40 },
    );

    // ============================================
    // PAGE 3: KEY FINDINGS
    // ============================================
    doc.addPage();
    doc.fontSize(20).font('Helvetica-Bold').fillColor(DARK).text('Key Findings');
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(200, doc.y).strokeColor(GREEN).lineWidth(2).stroke();
    doc.moveDown(0.8);

    data.keyFindings.forEach((finding, i) => {
      const numColor = i < 3 ? CRITICAL : i < 5 ? WARNING : GREEN;
      doc.fontSize(12).font('Helvetica-Bold').fillColor(numColor).text(`${i + 1}.`, { continued: true });
      doc.fontSize(11).font('Helvetica').fillColor('#334155').text(`  ${finding}`, { lineGap: 2 });
      doc.moveDown(0.4);
    });

    // ============================================
    // PAGE 4: ACTION ITEMS
    // ============================================
    doc.addPage();
    doc.fontSize(20).font('Helvetica-Bold').fillColor(DARK).text('Action Items');
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(200, doc.y).strokeColor(GREEN).lineWidth(2).stroke();
    doc.moveDown(0.8);

    data.actionItems.forEach((item, i) => {
      const priorityColor =
        item.priority.toLowerCase() === 'high'
          ? CRITICAL
          : item.priority.toLowerCase() === 'medium'
            ? WARNING
            : GREEN;

      // Priority badge
      doc.fontSize(10).font('Helvetica-Bold').fillColor(priorityColor);
      doc.text(`[${item.priority.toUpperCase()}]`, { continued: true });
      doc.fillColor(DARK).text(`  Action #${i + 1}`);
      doc.moveDown(0.2);

      doc.fontSize(11).font('Helvetica').fillColor('#334155');
      doc.text(item.action, { indent: 20, lineGap: 2 });
      doc.moveDown(0.2);

      doc.fontSize(9).font('Helvetica').fillColor(GRAY);
      doc.text(`Responsible: ${item.responsible}  |  Deadline: ${item.deadline}  |  Est. Impact: ${item.impact}`, {
        indent: 20,
      });
      doc.moveDown(0.6);
    });

    // ============================================
    // PAGE 5: FLEET DATA
    // ============================================
    doc.addPage();
    doc.fontSize(20).font('Helvetica-Bold').fillColor(DARK).text('Fleet Data Overview');
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(200, doc.y).strokeColor(GREEN).lineWidth(2).stroke();
    doc.moveDown(0.8);

    // Insurance Score Section
    doc.fontSize(14).font('Helvetica-Bold').fillColor(DARK).text('Insurance Score Breakdown');
    doc.moveDown(0.4);

    const scoreColor =
      data.insuranceScore.overallScore >= 80 ? GREEN : data.insuranceScore.overallScore >= 60 ? WARNING : CRITICAL;
    doc.fontSize(28).font('Helvetica-Bold').fillColor(scoreColor);
    doc.text(`${data.insuranceScore.overallScore}/100`, { align: 'center' });
    doc.fontSize(14).text(data.insuranceScore.grade, { align: 'center' });
    doc.fillColor(DARK).moveDown(0.5);

    doc.fontSize(11).font('Helvetica');
    const components = [
      { name: 'Safe Driving', data: data.insuranceScore.components.safeDriving },
      { name: 'Compliance', data: data.insuranceScore.components.compliance },
      { name: 'Maintenance', data: data.insuranceScore.components.maintenance },
      { name: 'Driver Quality', data: data.insuranceScore.components.driverQuality },
    ];
    components.forEach(({ name, data: comp }) => {
      const compColor = comp.score >= 80 ? GREEN : comp.score >= 60 ? WARNING : CRITICAL;
      doc.fillColor(compColor).text(`  ${name}: ${comp.score}/100`, { continued: true });
      doc.fillColor(GRAY).text(`  (weight: ${comp.weight * 100}%, contribution: ${comp.weightedScore} pts)`);
    });
    doc.moveDown(1);

    // Driver Risk Section
    doc.fontSize(14).font('Helvetica-Bold').fillColor(DARK).text('Top Risk Drivers');
    doc.moveDown(0.4);

    doc.font('Courier').fontSize(9).fillColor(DARK);
    doc.text('Driver                  Risk Score  Tier       Annual Cost');
    doc.text('\u2500'.repeat(60));

    const topRisks = data.driverRisks.slice(0, 8);
    topRisks.forEach((r) => {
      const tierColor = r.tier === 'critical' ? CRITICAL : r.tier === 'high' ? WARNING : DARK;
      const line = `${r.driverName.padEnd(24)}${String(r.riskScore).padStart(5)}     ${r.tier.padEnd(11)}$${r.annualizedCost.toLocaleString()}`;
      doc.fillColor(tierColor).text(line);
    });
    doc.fillColor(DARK).moveDown(0.5);

    const totalRiskCost = data.driverRisks.reduce((s, r) => s + r.annualizedCost, 0);
    doc.font('Helvetica-Bold').fontSize(11).text(`Total Annualized Risk Cost: $${totalRiskCost.toLocaleString()}`);
    doc.moveDown(1);

    // Wellness Section
    doc.fontSize(14).font('Helvetica-Bold').fillColor(DARK).text('Wellness & Retention');
    doc.moveDown(0.4);
    doc.fontSize(11).font('Helvetica').fillColor('#334155');
    doc.text(`Average Wellness Score: ${data.wellness.avgWellnessScore}/100`);
    doc.text(`High Burnout Risk: ${data.wellness.highBurnoutRisk} drivers`);
    doc.text(`Moderate Burnout Risk: ${data.wellness.moderateBurnoutRisk} drivers`);
    doc.text(`Total Retention Cost at Risk: $${data.wellness.totalRetentionCostAtRisk.toLocaleString()}`);

    if (data.wellness.driversAtRisk.length > 0) {
      doc.moveDown(0.4);
      doc.fontSize(10).font('Helvetica-Bold').fillColor(DARK).text('Drivers at Risk:');
      doc.fontSize(10).font('Helvetica');
      data.wellness.driversAtRisk.slice(0, 5).forEach((d) => {
        doc.fillColor(CRITICAL);
        doc.text(
          `  ${d.name}: ${(d.burnoutProbability * 100).toFixed(0)}% burnout probability, $${d.retentionCost.toLocaleString()} at risk`,
        );
        doc.fillColor(GRAY).text(`    Top signal: ${d.topSignal}`);
      });
    }

    // ============================================
    // LAST PAGE FOOTER
    // ============================================
    doc.moveDown(3);
    doc
      .moveTo(50, doc.y)
      .lineTo(50 + pageWidth, doc.y)
      .strokeColor('#e2e8f0')
      .lineWidth(1)
      .stroke();
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor(GRAY).font('Helvetica');
    doc.text('Generated by FleetShield AI', { align: 'center' });
    doc.text(
      'This report was generated using AI analysis of fleet telematics data. Findings and recommendations are for informational purposes only. Consult with qualified professionals before making operational or financial decisions.',
      { align: 'center' },
    );

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}
