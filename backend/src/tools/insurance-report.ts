import { tool } from 'ai';
import { z } from 'zod';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateInsuranceScore } from '../scoring/insurance-score-engine.js';
import { calculateAllDriverRisks } from '../scoring/driver-risk-engine.js';
import { getFleetWellnessSummary } from '../scoring/wellness-predictor.js';
import { getFleetSummary, seedVehicles, seedDrivers } from '../data/seed-data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORTS_DIR = path.join(__dirname, '../../reports');

export const generateInsuranceReport = tool({
  description: 'Generate a comprehensive PDF insurance report for the fleet. The report includes: executive summary, fleet insurability score, driver risk analysis, wellness/retention insights, financial impact analysis, and methodology. Returns a download URL. Use when asked to "generate a report", "create PDF", or "insurance report".',
  parameters: z.object({
    includeDriverDetails: z.boolean().optional().describe('Include individual driver breakdowns (default: true)'),
  }),
  execute: async ({ includeDriverDetails }) => {
    // Ensure reports dir
    if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `fleetshield-report-${timestamp}.pdf`;
    const filepath = path.join(REPORTS_DIR, filename);

    const score = calculateInsuranceScore();
    const risks = calculateAllDriverRisks();
    const wellness = getFleetWellnessSummary();
    const fleet = getFleetSummary();

    await generatePDF(filepath, score, risks, wellness, fleet, includeDriverDetails !== false);

    return {
      status: 'generated',
      filename,
      downloadUrl: `/api/reports/${filename}`,
      pages: 6,
      sections: ['Executive Summary', 'Fleet Insurability Score', 'Driver Risk Analysis', 'Wellness & Retention', 'Financial Impact', 'Methodology'],
      generatedAt: new Date().toISOString(),
    };
  },
});

async function generatePDF(
  filepath: string,
  score: ReturnType<typeof calculateInsuranceScore>,
  risks: ReturnType<typeof calculateAllDriverRisks>,
  wellness: ReturnType<typeof getFleetWellnessSummary>,
  fleet: ReturnType<typeof getFleetSummary>,
  includeDriverDetails: boolean,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'letter', margin: 50 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // --- PAGE 1: EXECUTIVE SUMMARY ---
    doc.fontSize(24).font('Helvetica-Bold').text('FleetShield AI', { align: 'center' });
    doc.fontSize(14).font('Helvetica').text('Fleet Risk Intelligence Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#666').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    doc.fillColor('#000').fontSize(16).font('Helvetica-Bold').text('Executive Summary');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Fleet Size: ${fleet.totalVehicles} vehicles, ${fleet.totalDrivers} drivers`);
    doc.text(`Fleet Insurability Score: ${score.overallScore}/100 (Grade: ${score.grade})`);
    doc.text(`Industry Percentile: Top ${100 - score.percentile}%`);
    doc.text(`30-Day Safety Events: ${fleet.totalSafetyEvents}`);
    doc.text(`Potential Annual Premium Savings: $${score.premiumImpact.estimatedAnnualSavings.toLocaleString()}`);
    doc.text(`Driver Retention Cost at Risk: $${wellness.totalRetentionCostAtRisk.toLocaleString()}`);
    doc.text(`Trend: ${score.trend.charAt(0).toUpperCase() + score.trend.slice(1)}`);
    doc.moveDown();

    doc.fontSize(12).font('Helvetica-Bold').text('Key Findings:');
    doc.fontSize(11).font('Helvetica');
    score.recommendations.forEach((r) => doc.text(`  • ${r}`));
    doc.moveDown();

    doc.fontSize(12).font('Helvetica-Bold').text('Risk Distribution:');
    doc.fontSize(11).font('Helvetica');
    doc.text(`  Low Risk: ${fleet.riskDistribution.low} drivers`);
    doc.text(`  Moderate Risk: ${fleet.riskDistribution.moderate} drivers`);
    doc.text(`  High Risk: ${fleet.riskDistribution.high} drivers`);
    doc.text(`  Critical Risk: ${fleet.riskDistribution.critical} drivers`);

    // --- PAGE 2: FLEET INSURABILITY SCORE ---
    doc.addPage();
    doc.fontSize(16).font('Helvetica-Bold').text('Fleet Insurability Score');
    doc.moveDown(0.5);

    doc.fontSize(36).font('Helvetica-Bold').fillColor(score.overallScore >= 80 ? '#10b981' : score.overallScore >= 60 ? '#f59e0b' : '#ef4444');
    doc.text(`${score.overallScore}`, { align: 'center' });
    doc.fontSize(18).text(score.grade, { align: 'center' });
    doc.fillColor('#000').moveDown();

    doc.fontSize(12).font('Helvetica-Bold').text('Component Breakdown:');
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica');

    const components = [
      { name: 'Safe Driving', data: score.components.safeDriving },
      { name: 'Compliance', data: score.components.compliance },
      { name: 'Maintenance', data: score.components.maintenance },
      { name: 'Driver Quality', data: score.components.driverQuality },
    ];
    components.forEach(({ name, data }) => {
      doc.text(`  ${name}: ${data.score}/100 (weight: ${data.weight * 100}%, contribution: ${data.weightedScore} pts)`);
    });

    doc.moveDown();
    doc.fontSize(12).font('Helvetica-Bold').text('Premium Impact:');
    doc.fontSize(11).font('Helvetica');
    doc.text(`  Benchmark Premium: $${score.premiumImpact.benchmarkPremium.toLocaleString()}/year`);
    doc.text(`  Score-Based Adjustment: ${score.premiumImpact.percentChange > 0 ? '+' : ''}${score.premiumImpact.percentChange}%`);
    doc.text(`  Estimated Annual Savings: $${score.premiumImpact.estimatedAnnualSavings.toLocaleString()}`);

    // --- PAGE 3: DRIVER RISK ANALYSIS ---
    doc.addPage();
    doc.fontSize(16).font('Helvetica-Bold').text('Driver Risk Analysis');
    doc.moveDown(0.5);

    const topRisks = risks.slice(0, includeDriverDetails ? 10 : 5);
    doc.font('Courier').fontSize(10);
    doc.text('Driver                  Risk Score  Tier       Annual Cost');
    doc.text('─'.repeat(60));
    topRisks.forEach((r) => {
      const line = `${r.driverName.padEnd(24)}${String(r.riskScore).padStart(5)}     ${r.tier.padEnd(11)}$${r.annualizedCost.toLocaleString()}`;
      doc.fillColor(r.tier === 'critical' ? '#ef4444' : r.tier === 'high' ? '#f59e0b' : '#000');
      doc.text(line);
    });
    doc.fillColor('#000').moveDown();

    const totalRiskCost = risks.reduce((s, r) => s + r.annualizedCost, 0);
    doc.font('Helvetica-Bold').text(`Total Annualized Risk Cost: $${totalRiskCost.toLocaleString()}`);

    // --- PAGE 4: WELLNESS & RETENTION ---
    doc.addPage();
    doc.fontSize(16).font('Helvetica-Bold').text('Wellness & Retention Analysis');
    doc.moveDown(0.5);

    doc.fontSize(11).font('Helvetica');
    doc.text(`Average Wellness Score: ${wellness.avgWellnessScore}/100`);
    doc.text(`High Burnout Risk: ${wellness.highBurnoutRisk} drivers`);
    doc.text(`Moderate Burnout Risk: ${wellness.moderateBurnoutRisk} drivers`);
    doc.text(`Total Retention Cost at Risk: $${wellness.totalRetentionCostAtRisk.toLocaleString()}`);
    doc.moveDown();

    if (wellness.driversAtRisk.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold').text('Drivers at Risk:');
      doc.fontSize(11).font('Helvetica');
      wellness.driversAtRisk.forEach((d) => {
        doc.fillColor('#ef4444');
        doc.text(`  ${d.name}: ${(d.burnoutProbability * 100).toFixed(0)}% burnout probability, $${d.retentionCost.toLocaleString()} at risk`);
        doc.fillColor('#666').text(`    Top signal: ${d.topSignal}`);
      });
      doc.fillColor('#000');
    }

    // --- PAGE 5: FINANCIAL IMPACT ---
    doc.addPage();
    doc.fontSize(16).font('Helvetica-Bold').text('Financial Impact Analysis');
    doc.moveDown(0.5);

    const insuranceSavings = score.premiumImpact.estimatedAnnualSavings;
    const retentionSavings = Math.round(wellness.totalRetentionCostAtRisk * 0.6);
    const accidentSavings = Math.round(totalRiskCost * 0.4);
    const totalSavings = insuranceSavings + retentionSavings + accidentSavings;

    doc.fontSize(11).font('Helvetica');
    doc.text('Category                        Annual Savings');
    doc.text('─'.repeat(50));
    doc.text(`Insurance Premium Reduction      $${insuranceSavings.toLocaleString()}`);
    doc.text(`Driver Retention (60% save rate) $${retentionSavings.toLocaleString()}`);
    doc.text(`Accident Cost Avoidance (40%)    $${accidentSavings.toLocaleString()}`);
    doc.text('─'.repeat(50));
    doc.font('Helvetica-Bold').text(`TOTAL POTENTIAL SAVINGS          $${totalSavings.toLocaleString()}`);
    doc.moveDown();
    doc.font('Helvetica').text(`Per Vehicle: $${Math.round(totalSavings / fleet.totalVehicles).toLocaleString()}/year`);
    doc.text(`Per Driver: $${Math.round(totalSavings / fleet.totalDrivers).toLocaleString()}/year`);

    // --- PAGE 6: METHODOLOGY ---
    doc.addPage();
    doc.fontSize(16).font('Helvetica-Bold').text('Methodology');
    doc.moveDown(0.5);

    doc.fontSize(11).font('Helvetica');
    doc.text('Fleet Insurability Score Components:', { underline: true });
    doc.moveDown(0.3);
    doc.text('• Safe Driving (35%): Event frequency per 1000 miles, severity weighting, 30-day trend analysis');
    doc.text('• Compliance (25%): Seatbelt violations, speeding events, HOS compliance per driver');
    doc.text('• Maintenance (20%): Average vehicle age, odometer readings, fault code analysis');
    doc.text('• Driver Quality (20%): Average tenure, risk distribution, training completion');
    doc.moveDown();

    doc.text('Driver Risk Score (0-100, lower = safer):', { underline: true });
    doc.moveDown(0.3);
    doc.text('• Event Frequency (40%): Safety events per 1000 miles driven');
    doc.text('• Severity (25%): Weighted average event severity');
    doc.text('• Pattern (20%): Behavioral concentration and recurring patterns');
    doc.text('• Trend (15%): 30-day improvement or decline');
    doc.moveDown();

    doc.text('Burnout Detection Signals:', { underline: true });
    doc.moveDown(0.3);
    doc.text('• Shift irregularity (schedule variance ratio)');
    doc.text('• Consecutive long days (>10 hours driving)');
    doc.text('• Rest compression (average rest between shifts)');
    doc.text('• Harsh event escalation (week-over-week change)');
    doc.text('• Night driving creep (increasing night hours)');
    doc.text('• Excessive daily hours (>11 hours driving percentage)');
    doc.moveDown();

    doc.text('Data Sources:', { underline: true });
    doc.moveDown(0.3);
    doc.text('• Geotab Core API: Device data, trip records, exception events, fault data');
    doc.text('• Geotab Data Connector: Aggregated KPIs, trip summaries, fuel usage');
    doc.text('• Geotab Ace API: Natural language analytics on fleet data');
    doc.moveDown(2);

    doc.fontSize(9).fillColor('#999').text('Generated by FleetShield AI • Powered by Geotab Telematics', { align: 'center' });
    doc.text('This report is for informational purposes. Consult with your insurance broker for binding quotes.', { align: 'center' });

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}
