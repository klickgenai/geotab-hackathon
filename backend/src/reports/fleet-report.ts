/**
 * Comprehensive Fleet Executive Report (PDF)
 * Professional-grade report with visual KPI cards, gauge rings, styled tables,
 * branded headers/footers, and consolidated action plan.
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateInsuranceScore } from '../scoring/insurance-score-engine.js';
import { calculateAllDriverRisks } from '../scoring/driver-risk-engine.js';
import { getFleetWellnessSummary, predictAllWellness } from '../scoring/wellness-predictor.js';
import { getFleetSummary, seedVehicles, seedSafetyEvents } from '../data/seed-data.js';
import { calculateFleetROI } from '../scoring/roi-engine.js';
import { calculateGreenDashboard } from '../scoring/green-score-engine.js';
import { getFleetRiskForecast, detectDeteriorating } from '../scoring/predictive-safety.js';
import { getDailyBriefing } from '../scoring/alert-triage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORTS_DIR = path.join(__dirname, '../../reports');

// ── Design Tokens ──
const C = {
  brand: '#18202F', brandLight: '#2D3748',
  gold: '#BF7408', goldLight: '#FBAF1A',
  green: '#059669', greenBg: '#d1fae5',
  amber: '#d97706', amberBg: '#fef3c7',
  red: '#dc2626', redBg: '#fee2e2',
  text: '#1f2937', muted: '#6b7280', light: '#9ca3af',
  border: '#e5e7eb', cardBg: '#f9fafb', stripe: '#f3f4f6', white: '#ffffff',
};
const ML = 48;
const MR = 48;
const PW = 612;
const PH = 792;
const CW = PW - ML - MR; // 516

// Recursively replace NaN/null numeric values with 0 throughout an object
function sanitize<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'number') return (isNaN(obj) ? 0 : obj) as T;
  if (Array.isArray(obj)) return obj.map(sanitize) as T;
  if (typeof obj === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(obj as any)) out[k] = sanitize(v);
    return out as T;
  }
  return obj;
}
function scoreColor(s: number) { return s >= 80 ? C.green : s >= 60 ? C.amber : C.red; }
function tierColor(t: string) { return t === 'critical' ? C.red : t === 'high' ? C.amber : t === 'moderate' || t === 'elevated' ? '#ea580c' : C.green; }
function tierBg(t: string) { return t === 'critical' ? C.redBg : t === 'high' ? C.amberBg : t === 'moderate' || t === 'elevated' ? '#fff7ed' : C.greenBg; }

export async function generateFleetReport(): Promise<{ filename: string; downloadUrl: string }> {
  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `fleet-executive-report-${timestamp}.pdf`;
  const filepath = path.join(REPORTS_DIR, filename);

  const score = sanitize(calculateInsuranceScore());
  const risks = sanitize(calculateAllDriverRisks());
  const wellness = sanitize(getFleetWellnessSummary());
  const allWellness = sanitize(predictAllWellness());
  const fleet = sanitize(getFleetSummary());
  const roi = sanitize(calculateFleetROI());
  const green = sanitize(calculateGreenDashboard());
  const forecast = sanitize(getFleetRiskForecast());
  const trends = sanitize(detectDeteriorating());
  const alertBriefing = sanitize(getDailyBriefing());

  await buildPDF(filepath, { score, risks, wellness, allWellness, fleet, roi, green, forecast, trends, alertBriefing });
  return { filename, downloadUrl: `/api/reports/${filename}` };
}

async function buildPDF(filepath: string, d: any): Promise<void> {
  const { score, risks, wellness, allWellness, fleet, roi, green, forecast, trends, alertBriefing } = d;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'letter',
      margins: { top: 50, bottom: 15, left: ML, right: MR },
      autoFirstPage: false,
    });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    const now = new Date();
    let pageCount = 0;

    // ── Helpers ──
    const startPage = () => {
      doc.addPage();
      pageCount++;
    };

    const addFooter = () => {
      doc.save();
      doc.strokeColor(C.border).lineWidth(0.5)
        .moveTo(ML, PH - 48).lineTo(PW - MR, PH - 48).stroke();
      doc.fontSize(7).font('Helvetica').fillColor(C.light)
        .text('FleetShield AI  |  Powered by Geotab Telematics + Claude AI', ML, PH - 40, { lineBreak: false });
      doc.fontSize(7).text(`Page ${pageCount}`, ML, PH - 40, { width: CW, align: 'right', lineBreak: false });
      doc.restore();
    };

    const pageHeader = (title: string, subtitle: string) => {
      const startY = doc.y;
      doc.rect(ML, startY, CW, 4).fill(C.gold);
      doc.fontSize(19).font('Helvetica-Bold').fillColor(C.brand)
        .text(title, ML, startY + 10);
      doc.fontSize(10.5).font('Helvetica').fillColor(C.muted)
        .text(subtitle);
      doc.y += 10;
    };

    const subHead = (text: string) => {
      const y = doc.y;
      doc.fontSize(12).font('Helvetica-Bold').fillColor(C.brand).text(text, ML, y);
      doc.strokeColor(C.border).lineWidth(0.5).moveTo(ML, doc.y + 2).lineTo(PW - MR, doc.y + 2).stroke();
      doc.y += 8;
    };

    const drawKPIRow = (kpis: { label: string; val: string; sub: string; c: string }[], y: number, h = 82) => {
      const cardW = (CW - 24) / 4;
      kpis.forEach((k, i) => {
        const x = ML + i * (cardW + 8);
        doc.roundedRect(x, y, cardW, h, 6).fill(C.cardBg);
        doc.rect(x, y, 4, h).fill(k.c);
        doc.fontSize(8).font('Helvetica').fillColor(C.muted).text(k.label, x + 14, y + 10, { width: cardW - 24 });
        doc.fontSize(22).font('Helvetica-Bold').fillColor(C.text).text(k.val, x + 14, y + 28, { width: cardW - 24 });
        doc.fontSize(10).font('Helvetica').fillColor(k.c).text(k.sub, x + 14, y + 58, { width: cardW - 24 });
      });
      doc.y = y + h + 12;
    };

    const drawMiniCards = (cards: { label: string; n: number | string; c: string; bg: string }[], y: number) => {
      const cardW = (CW - 24) / 4;
      cards.forEach((card, i) => {
        const x = ML + i * (cardW + 8);
        doc.roundedRect(x, y, cardW, 52, 5).fill(card.bg);
        doc.fontSize(22).font('Helvetica-Bold').fillColor(card.c).text(String(card.n), x + 12, y + 8, { width: cardW - 24 });
        doc.fontSize(8.5).font('Helvetica').fillColor(card.c).text(card.label, x + 12, y + 35, { width: cardW - 24 });
      });
      doc.y = y + 62;
    };

    // ═══════════════════════════════════════════════════════════════════
    // PAGE 1: COVER
    // ═══════════════════════════════════════════════════════════════════
    startPage();

    // Brand banner
    doc.rect(0, 0, PW, 190).fill(C.brand);
    doc.rect(0, 190, PW, 4).fill(C.gold);

    doc.fontSize(36).font('Helvetica-Bold').fillColor(C.white)
      .text('FleetShield AI', ML, 42);
    doc.fontSize(15).font('Helvetica').fillColor(C.goldLight)
      .text('Fleet Executive Report', ML, 88);
    doc.fontSize(10).fillColor('#94a3b8')
      .text(now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), ML, 116);
    doc.text(`${fleet.totalVehicles} Vehicles  |  ${fleet.totalDrivers} Drivers  |  90-Day Analysis`, ML, 134);
    doc.fontSize(8).fillColor('#64748b').text('CONFIDENTIAL', ML, 164);

    // 4 KPI Cards
    const cardY = 216;
    const cardW = (CW - 24) / 4;
    const kpis = [
      { label: 'INSURANCE SCORE', val: `${score.overallScore}`, sub: score.grade || 'N/A', c: scoreColor(score.overallScore) },
      { label: 'GREEN SCORE', val: `${green.fleetScore.overallScore}`, sub: green.fleetScore.grade || 'N/A', c: scoreColor(green.fleetScore.overallScore) },
      { label: 'ANNUAL SAVINGS', val: `$${(roi.totalAnnualSavings / 1000).toFixed(0)}K`, sub: `${roi.roiPercent}% ROI`, c: C.green },
      { label: 'RETENTION RISK', val: `$${(wellness.totalRetentionCostAtRisk / 1000).toFixed(0)}K`, sub: `${wellness.highBurnoutRisk} at risk`, c: C.red },
    ];
    kpis.forEach((k, i) => {
      const x = ML + i * (cardW + 8);
      doc.roundedRect(x, cardY, cardW, 82, 6).fill(C.cardBg);
      doc.rect(x, cardY, 4, 82).fill(k.c);
      doc.fontSize(8).font('Helvetica').fillColor(C.muted).text(k.label, x + 14, cardY + 10, { width: cardW - 24 });
      doc.fontSize(22).font('Helvetica-Bold').fillColor(C.text).text(k.val, x + 14, cardY + 28, { width: cardW - 24 });
      doc.fontSize(10).font('Helvetica').fillColor(k.c).text(k.sub, x + 14, cardY + 58, { width: cardW - 24 });
    });

    // Executive Summary
    doc.y = cardY + 104;
    doc.fontSize(14).font('Helvetica-Bold').fillColor(C.brand).text('Executive Summary', ML);
    doc.strokeColor(C.gold).lineWidth(2).moveTo(ML, doc.y + 2).lineTo(ML + 130, doc.y + 2).stroke();
    doc.y += 14;

    const sumLines = [
      [`Insurance Percentile`, `Top ${100 - score.percentile}% of fleets nationally`, C.green],
      [`Premium Savings`, `$${score.premiumImpact.estimatedAnnualSavings.toLocaleString()} estimated annual savings`, C.gold],
      [`Safety Events (30d)`, `${fleet.totalSafetyEvents} events, ${fleet.riskDistribution.critical} critical-risk drivers`, C.amber],
      [`Carbon Footprint`, `${green.carbonFootprint.totalCO2Tons} tons CO2, ${green.carbonFootprint.co2PerKm} kg/km average`, C.green],
      [`Predictive Outlook`, `${forecast.highRiskDrivers} high-risk today, ${forecast.predictedEventsThisWeek} predicted events/week`, C.red],
      [`Payback Period`, `${roi.paybackMonths} months to break even, 3-year value $${roi.projectedThreeYearValue.toLocaleString()}`, C.brand],
    ];
    for (const [label, value, color] of sumLines) {
      const y = doc.y;
      doc.fontSize(10).font('Helvetica-Bold').fillColor(color as string).text('> ', ML, y, { continued: true });
      doc.font('Helvetica-Bold').fillColor(C.text).text(`${label}:  `, { continued: true });
      doc.font('Helvetica').fillColor(C.muted).text(value as string);
      doc.y += 6;
    }

    addFooter();

    // ═══════════════════════════════════════════════════════════════════
    // PAGE 2: INSURANCE INTELLIGENCE
    // ═══════════════════════════════════════════════════════════════════
    startPage();
    pageHeader('Insurance Intelligence', 'Fleet insurability score, components, and premium analysis');

    // Gauge ring
    const gx = ML + 60, gy = doc.y + 55;
    drawGaugeRing(doc, gx, gy, 48, score.overallScore, score.grade || 'N/A');

    // Info next to gauge
    const ix = ML + 140;
    doc.fontSize(11).font('Helvetica').fillColor(C.muted).text('Fleet Insurability Score', ix, gy - 40);
    doc.fontSize(12).font('Helvetica-Bold').fillColor(C.text).text(`Trend: ${(score.trend || 'stable').charAt(0).toUpperCase() + (score.trend || 'stable').slice(1)}`, ix, gy - 20);
    doc.fontSize(11).font('Helvetica').fillColor(C.muted).text(`Industry: Top ${100 - score.percentile}%`, ix, gy - 0);
    doc.fontSize(12).font('Helvetica-Bold').fillColor(C.green).text(`Saves $${score.premiumImpact.estimatedAnnualSavings.toLocaleString()}/yr`, ix, gy + 18);

    doc.y = gy + 72;
    subHead('Score Components');
    const comps = [
      { name: 'Safe Driving', s: score.components.safeDriving.score, w: '35%' },
      { name: 'Compliance', s: score.components.compliance.score, w: '25%' },
      { name: 'Maintenance', s: score.components.maintenance.score, w: '20%' },
      { name: 'Driver Quality', s: score.components.driverQuality.score, w: '20%' },
    ];
    for (const c of comps) drawBar(doc, c.name, c.s, c.w);

    doc.y += 10;

    // Premium Impact card
    drawCard(doc, 'Premium Impact', C.brand, [
      `Benchmark Premium: $${score.premiumImpact.benchmarkPremium.toLocaleString()}/yr`,
      `Score Adjustment: ${score.premiumImpact.percentChange > 0 ? '+' : ''}${score.premiumImpact.percentChange}%`,
      `Annual Savings: $${score.premiumImpact.estimatedAnnualSavings.toLocaleString()}`,
    ]);

    doc.y += 6;
    subHead('Key Recommendations');
    for (const r of score.recommendations.slice(0, 6)) {
      const y = doc.y;
      doc.fontSize(10).font('Helvetica').fillColor(C.gold).text('>  ', ML, y, { continued: true });
      doc.fillColor(C.text).text(r);
      doc.y += 4;
    }

    addFooter();

    // ═══════════════════════════════════════════════════════════════════
    // PAGE 3: DRIVER RISK
    // ═══════════════════════════════════════════════════════════════════
    startPage();
    pageHeader('Driver Risk Analysis', 'Risk profiling, cost analysis, and coaching priorities');

    // Distribution mini-cards
    drawMiniCards([
      { label: 'CRITICAL', n: fleet.riskDistribution.critical, c: C.red, bg: C.redBg },
      { label: 'HIGH', n: fleet.riskDistribution.high, c: C.amber, bg: C.amberBg },
      { label: 'MODERATE', n: fleet.riskDistribution.moderate, c: '#ea580c', bg: '#fff7ed' },
      { label: 'LOW', n: fleet.riskDistribution.low, c: C.green, bg: C.greenBg },
    ], doc.y);

    subHead('Top Riskiest Drivers');

    // Table header
    const thY = doc.y;
    doc.rect(ML, thY, CW, 22).fill(C.brand);
    const rCols = [['DRIVER', 0, 115], ['SCORE', 115, 42], ['TIER', 157, 52], ['TOP EVENT', 209, 108], ['COST', 317, 72], ['RECOMMENDATION', 389, CW - 389]] as const;
    for (const [label, off, w] of rCols) {
      doc.fontSize(8).font('Helvetica-Bold').fillColor(C.white).text(label, ML + off + 6, thY + 6, { width: (w as number) - 10 });
    }
    doc.y = thY + 22;

    risks.slice(0, 12).forEach((r: any, i: number) => {
      const y = doc.y;
      const rh = 22;
      if (i % 2 === 0) doc.rect(ML, y, CW, rh).fill(C.stripe);
      doc.fontSize(9).font('Helvetica').fillColor(C.text).text(r.driverName, ML + 6, y + 5, { width: 109 });
      // Score badge
      doc.roundedRect(ML + 117, y + 3, 32, 16, 4).fill(tierBg(r.tier));
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(tierColor(r.tier)).text(String(r.riskScore), ML + 118, y + 5, { width: 30, align: 'center' });
      doc.fontSize(8).font('Helvetica-Bold').fillColor(tierColor(r.tier)).text(r.tier.toUpperCase(), ML + 163, y + 5, { width: 46 });
      doc.fontSize(8.5).font('Helvetica').fillColor(C.text).text((r.topEventTypes?.[0]?.type || '-').replace(/_/g, ' '), ML + 215, y + 5, { width: 102 });
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(C.text).text(`$${r.annualizedCost.toLocaleString()}`, ML + 323, y + 5, { width: 66 });
      const rec = (r.recommendations?.[0] || '').slice(0, 40);
      doc.fontSize(7.5).font('Helvetica').fillColor(C.muted).text(rec, ML + 395, y + 5, { width: CW - 399 });
      doc.y = y + rh;
    });

    // Total row
    const totalCost = risks.reduce((s: number, r: any) => s + r.annualizedCost, 0);
    const tcY = doc.y + 4;
    doc.roundedRect(ML, tcY, CW, 26, 5).fill(C.brand);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(C.white)
      .text(`Total Annualized Risk Cost: $${totalCost.toLocaleString()}`, ML + 12, tcY + 7);
    doc.y = tcY + 34;

    addFooter();

    // ═══════════════════════════════════════════════════════════════════
    // PAGE 4: SAFETY EVENTS
    // ═══════════════════════════════════════════════════════════════════
    startPage();
    pageHeader('Safety Events Summary', '30-day event analysis and alert intelligence');

    // Severity cards
    const t30d = Date.now() - 30 * 86400000;
    const recent = seedSafetyEvents.filter(e => new Date(e.dateTime).getTime() > t30d);
    const sev = {
      critical: recent.filter(e => e.severity === 'critical').length,
      high: recent.filter(e => e.severity === 'high').length,
      medium: recent.filter(e => e.severity === 'medium').length,
      low: recent.filter(e => e.severity === 'low').length,
    };
    drawMiniCards([
      { label: 'CRITICAL', n: sev.critical, c: C.red, bg: C.redBg },
      { label: 'HIGH', n: sev.high, c: C.amber, bg: C.amberBg },
      { label: 'MEDIUM', n: sev.medium, c: '#ea580c', bg: '#fff7ed' },
      { label: 'LOW', n: sev.low, c: C.green, bg: C.greenBg },
    ], doc.y);

    // Events by type bar chart
    subHead('Events by Type');
    const eventCounts: Record<string, number> = {};
    for (const e of recent) eventCounts[e.type] = (eventCounts[e.type] || 0) + 1;
    const sortedTypes = Object.entries(eventCounts).sort((a, b) => b[1] - a[1]);
    const maxEvt = sortedTypes[0]?.[1] || 1;

    for (const [type, count] of sortedTypes) {
      const y = doc.y;
      const pct = ((count / recent.length) * 100).toFixed(1);
      const bw = Math.max(4, (count / maxEvt) * 200);

      doc.fontSize(9).font('Helvetica').fillColor(C.text).text(type.replace(/_/g, ' '), ML, y + 2, { width: 130 });
      doc.roundedRect(ML + 135, y + 1, 200, 14, 3).fill(C.border);
      doc.roundedRect(ML + 135, y + 1, bw, 14, 3).fill(C.brand);
      doc.fontSize(9).font('Helvetica-Bold').fillColor(C.text).text(String(count), ML + 345, y + 2, { width: 40 });
      doc.fontSize(9).font('Helvetica').fillColor(C.muted).text(`${pct}%`, ML + 390, y + 2, { width: 50 });
      doc.y = y + 20;
    }

    doc.y += 10;

    // Alert briefing card
    drawCard(doc, "Today's Alert Briefing", C.amber, [
      `Critical: ${alertBriefing.criticalCount}  |  High: ${alertBriefing.highCount}  |  Total Triaged: ${alertBriefing.topAlerts?.length || 0}`,
      (alertBriefing.fleetRiskSummary || '').slice(0, 150),
    ]);

    // Top priority alerts
    if (alertBriefing.topAlerts?.length > 0) {
      doc.y += 4;
      subHead('Priority Alerts');
      for (const alert of alertBriefing.topAlerts.slice(0, 5)) {
        const y = doc.y;
        const pc = alert.severity === 'critical' ? C.red : alert.severity === 'high' ? C.amber : C.green;
        const pbg = alert.severity === 'critical' ? C.redBg : alert.severity === 'high' ? C.amberBg : C.greenBg;
        doc.roundedRect(ML, y, 56, 16, 4).fill(pbg);
        doc.fontSize(8).font('Helvetica-Bold').fillColor(pc).text((alert.severity || 'info').toUpperCase(), ML + 3, y + 3, { width: 50, align: 'center' });
        doc.fontSize(9).font('Helvetica').fillColor(C.text).text(
          `${alert.driverName || 'Fleet'}: ${(alert.description || alert.message || '').slice(0, 70)}`,
          ML + 64, y + 2, { width: CW - 64 }
        );
        doc.y = y + 22;
      }
    }

    addFooter();

    // ═══════════════════════════════════════════════════════════════════
    // PAGE 5: WELLNESS & RETENTION
    // ═══════════════════════════════════════════════════════════════════
    startPage();
    pageHeader('Driver Wellness & Retention', 'Burnout detection and retention cost analysis');

    // KPI cards
    drawKPIRow([
      { label: 'AVG WELLNESS', val: `${wellness.avgWellnessScore}`, sub: 'out of 100', c: scoreColor(wellness.avgWellnessScore) },
      { label: 'HIGH RISK', val: `${wellness.highBurnoutRisk}`, sub: 'drivers', c: C.red },
      { label: 'MODERATE RISK', val: `${wellness.moderateBurnoutRisk}`, sub: 'drivers', c: C.amber },
      { label: 'COST AT RISK', val: `$${(wellness.totalRetentionCostAtRisk / 1000).toFixed(0)}K`, sub: 'retention', c: C.red },
    ], doc.y, 78);

    subHead('Drivers Requiring Intervention');

    // Table header
    const whY = doc.y;
    doc.rect(ML, whY, CW, 22).fill(C.brand);
    const wCols = [['DRIVER', 0, 115], ['BURNOUT', 115, 58], ['WELLNESS', 173, 58], ['TOP SIGNAL', 231, 148], ['$ AT RISK', 379, CW - 379]] as const;
    for (const [label, off, w] of wCols) {
      doc.fontSize(8).font('Helvetica-Bold').fillColor(C.white).text(label, ML + off + 6, whY + 6, { width: (w as number) - 10 });
    }
    doc.y = whY + 22;

    const atRisk = allWellness
      .filter((w: any) => w.burnoutRisk === 'high' || w.burnoutRisk === 'moderate')
      .sort((a: any, b: any) => b.burnoutProbability - a.burnoutProbability)
      .slice(0, 10);

    atRisk.forEach((dd: any, i: number) => {
      const y = doc.y;
      const rh = 22;
      if (i % 2 === 0) doc.rect(ML, y, CW, rh).fill(C.stripe);
      const topSig = (dd.signals?.find((s: any) => s.severity === 'critical')?.name
        || dd.signals?.find((s: any) => s.severity === 'warning')?.name
        || 'multiple factors').replace(/_/g, ' ');

      doc.fontSize(9).font('Helvetica').fillColor(C.text).text(dd.driverName, ML + 6, y + 5, { width: 109 });
      // Burnout badge
      const bp = `${(dd.burnoutProbability * 100).toFixed(0)}%`;
      const bc = dd.burnoutProbability > 0.6 ? C.red : C.amber;
      doc.roundedRect(ML + 117, y + 3, 40, 16, 4).fill(dd.burnoutProbability > 0.6 ? C.redBg : C.amberBg);
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(bc).text(bp, ML + 118, y + 5, { width: 38, align: 'center' });
      doc.fontSize(9).font('Helvetica').fillColor(C.text).text(`${dd.overallWellnessScore}/100`, ML + 179, y + 5, { width: 52 });
      doc.fontSize(8.5).font('Helvetica').fillColor(C.muted).text(topSig, ML + 237, y + 5, { width: 142 });
      doc.fontSize(9).font('Helvetica-Bold').fillColor(C.red).text(`$${dd.retentionCost.toLocaleString()}`, ML + 385, y + 5, { width: CW - 389 });
      doc.y = y + rh;
    });

    doc.y += 10;
    subHead('Priority Interventions');
    const wellnessRecs = allWellness.filter((w: any) => w.burnoutRisk === 'high').slice(0, 6);
    for (const w of wellnessRecs) {
      const rec = w.recommendations?.[0] || 'Schedule wellness check-in';
      const y = doc.y;
      doc.fontSize(10).font('Helvetica-Bold').fillColor(C.red).text('>  ', ML, y, { continued: true });
      doc.fillColor(C.text).text(`${w.driverName}:  `, { continued: true });
      doc.font('Helvetica').fillColor(C.muted).text(rec);
      doc.y += 5;
    }

    addFooter();

    // ═══════════════════════════════════════════════════════════════════
    // PAGE 6: SUSTAINABILITY
    // ═══════════════════════════════════════════════════════════════════
    startPage();
    pageHeader('Sustainability & Green Impact', 'Carbon footprint, idle waste, and EV transition readiness');

    // Gauge + carbon stats
    const ggx = ML + 60, ggy = doc.y + 52;
    drawGaugeRing(doc, ggx, ggy, 45, green.fleetScore.overallScore, green.fleetScore.grade || 'N/A');

    const gix = ML + 135;
    doc.fontSize(11).font('Helvetica').fillColor(C.muted).text('Fleet Green Score', gix, ggy - 35);
    doc.fontSize(12).font('Helvetica-Bold').fillColor(C.text).text(`Trend: ${green.fleetScore.trend.charAt(0).toUpperCase() + green.fleetScore.trend.slice(1)}`, gix, ggy - 16);

    // Carbon stats grid
    const cStats = [
      ['Total CO2', `${green.carbonFootprint.totalCO2Tons}t`],
      ['Daily Avg', `${green.carbonFootprint.dailyAvgCO2Kg} kg`],
      ['Per km', `${green.carbonFootprint.co2PerKm} kg`],
      ['Trees Offset', `${green.carbonFootprint.treesEquivalent}`],
    ];
    cStats.forEach(([label, val], i) => {
      const x = gix + (i % 2) * 110;
      const y = ggy + 4 + Math.floor(i / 2) * 26;
      doc.fontSize(8).font('Helvetica').fillColor(C.muted).text((label as string).toUpperCase(), x, y);
      doc.fontSize(11).font('Helvetica-Bold').fillColor(C.text).text(val as string, x, y + 11);
    });

    doc.y = ggy + 70;

    subHead('Score Components');
    const gComps = [
      { name: 'Fuel Efficiency', s: green.fleetScore.components.fuelEfficiency.score, w: '30%' },
      { name: 'Idle Reduction', s: green.fleetScore.components.idleReduction.score, w: '25%' },
      { name: 'Eco Driving', s: green.fleetScore.components.ecoDriving.score, w: '25%' },
      { name: 'Fleet Modernity', s: green.fleetScore.components.fleetModernity.score, w: '20%' },
    ];
    for (const gc of gComps) drawBar(doc, gc.name, gc.s, gc.w);

    doc.y += 8;

    // Idle waste card
    drawCard(doc, 'Idle Waste (30 days)', C.amber, [
      `${green.idleWaste.totalIdleHours} hrs idle  |  ${green.idleWaste.fuelWastedLiters} L wasted  |  $${green.idleWaste.costWasted.toLocaleString()} cost  |  ${green.idleWaste.co2FromIdling} kg CO2`,
    ]);

    // EV readiness card
    drawCard(doc, 'EV Transition Readiness', C.green, [
      `${green.evReadiness.totalCandidates}/${seedVehicles.length} vehicles ready  |  $${green.evReadiness.projectedAnnualSavings.toLocaleString()} projected savings  |  ${green.evReadiness.projectedCO2Reduction}t CO2 reduction/yr`,
    ]);

    doc.y += 4;
    subHead('Sustainability Recommendations');
    for (const rec of green.recommendations.slice(0, 5)) {
      const pc = rec.priority === 'high' ? C.red : rec.priority === 'medium' ? C.amber : C.green;
      const y = doc.y;
      const pbg = rec.priority === 'high' ? C.redBg : rec.priority === 'medium' ? C.amberBg : C.greenBg;
      doc.roundedRect(ML, y, 50, 16, 4).fill(pbg);
      doc.fontSize(8).font('Helvetica-Bold').fillColor(pc).text(rec.priority.toUpperCase(), ML + 3, y + 3, { width: 44, align: 'center' });
      doc.fontSize(9.5).font('Helvetica').fillColor(C.text).text(rec.title, ML + 58, y + 2, { width: CW - 180 });
      doc.fontSize(9).font('Helvetica-Bold').fillColor(C.green).text(`$${rec.projectedSavings.toLocaleString()}/yr`, PW - MR - 110, y + 2, { width: 110, align: 'right' });
      doc.y = y + 22;
    }

    addFooter();

    // ═══════════════════════════════════════════════════════════════════
    // PAGE 7: FINANCIAL ROI
    // ═══════════════════════════════════════════════════════════════════
    startPage();
    pageHeader('Financial ROI Analysis', 'Investment returns, savings breakdown, and projections');

    // Big KPI cards
    drawKPIRow([
      { label: 'ANNUAL SAVINGS', val: `$${(roi.totalAnnualSavings / 1000).toFixed(0)}K`, sub: 'per year', c: C.green },
      { label: 'ROI', val: `${roi.roiPercent}%`, sub: 'return', c: C.gold },
      { label: 'PAYBACK', val: `${roi.paybackMonths} mo`, sub: 'to break even', c: C.brand },
      { label: '3-YEAR VALUE', val: `$${(roi.projectedThreeYearValue / 1000).toFixed(0)}K`, sub: 'projected', c: C.green },
    ], doc.y);

    // Savings breakdown with bar chart
    subHead('Savings Breakdown');
    const savRows = [
      { name: 'Insurance Premium Reduction', v: roi.insurancePremiumSavings },
      { name: 'Accident Prevention', v: roi.accidentPreventionSavings },
      { name: 'Fuel Efficiency', v: roi.fuelSavings },
      { name: 'Driver Retention', v: roi.retentionSavings },
      { name: 'Productivity Gains', v: roi.productivityGains },
    ];
    const maxSav = Math.max(...savRows.map(r => r.v), 1);
    const barColors = [C.brand, C.gold, C.green, C.amber, '#6366f1'];

    for (let i = 0; i < savRows.length; i++) {
      const row = savRows[i];
      const y = doc.y;
      const pct = roi.totalAnnualSavings > 0 ? ((row.v / roi.totalAnnualSavings) * 100).toFixed(1) : '0';
      const bw = Math.max(4, (row.v / maxSav) * 180);

      doc.fontSize(9.5).font('Helvetica').fillColor(C.text).text(row.name, ML, y + 3, { width: 165 });
      doc.roundedRect(ML + 170, y + 2, 180, 16, 3).fill(C.border);
      doc.roundedRect(ML + 170, y + 2, bw, 16, 3).fill(barColors[i]);
      doc.fontSize(9.5).font('Helvetica-Bold').fillColor(C.text).text(`$${row.v.toLocaleString()}`, ML + 360, y + 3, { width: 80 });
      doc.fontSize(9).font('Helvetica').fillColor(C.muted).text(`${pct}%`, ML + 445, y + 3, { width: 50 });
      doc.y = y + 24;
    }

    // Total bar
    const ttY = doc.y + 6;
    doc.roundedRect(ML, ttY, CW, 28, 5).fill(C.brand);
    doc.fontSize(11).font('Helvetica-Bold').fillColor(C.white)
      .text('TOTAL ANNUAL SAVINGS', ML + 12, ttY + 7, { width: 200 });
    doc.fontSize(11).font('Helvetica-Bold').fillColor(C.white)
      .text(`$${roi.totalAnnualSavings.toLocaleString()}`, ML + 360, ttY + 7, { width: 120 });
    doc.y = ttY + 42;

    drawCard(doc, 'Investment Details', C.brand, [
      `Annual Investment: $${roi.investmentCost.toLocaleString()} ($${Math.round(roi.investmentCost / seedVehicles.length / 12)}/vehicle/month)`,
      `Net Annual Savings: $${(roi.totalAnnualSavings - roi.investmentCost).toLocaleString()}`,
      `Per Vehicle: $${Math.round(roi.totalAnnualSavings / seedVehicles.length).toLocaleString()}/vehicle/year`,
    ]);

    // 3-year projection table
    doc.y += 4;
    subHead('3-Year Projection');
    const projThY = doc.y;
    doc.rect(ML, projThY, CW, 22).fill(C.brand);
    const projCols = [['YEAR', 0, 100], ['SAVINGS', 100, 130], ['INVESTMENT', 230, 130], ['CUMULATIVE NET', 360, CW - 360]] as const;
    for (const [label, off, w] of projCols) {
      doc.fontSize(8).font('Helvetica-Bold').fillColor(C.white).text(label, ML + off + 8, projThY + 6, { width: (w as number) - 12 });
    }
    doc.y = projThY + 22;

    let cumulative = 0;
    const years = [
      { label: 'Year 1', savings: roi.totalAnnualSavings, cost: roi.investmentCost },
      { label: 'Year 2', savings: Math.round(roi.totalAnnualSavings * 1.1), cost: roi.investmentCost },
      { label: 'Year 3', savings: Math.round(roi.totalAnnualSavings * 1.2), cost: roi.investmentCost },
    ];
    years.forEach((yr, i) => {
      const y = doc.y;
      cumulative += yr.savings - yr.cost;
      if (i % 2 === 0) doc.rect(ML, y, CW, 24).fill(C.stripe);
      doc.fontSize(9.5).font('Helvetica-Bold').fillColor(C.text).text(yr.label, ML + 8, y + 6, { width: 92 });
      doc.fontSize(9.5).font('Helvetica').fillColor(C.green).text(`$${yr.savings.toLocaleString()}`, ML + 108, y + 6, { width: 122 });
      doc.fontSize(9.5).font('Helvetica').fillColor(C.red).text(`$${yr.cost.toLocaleString()}`, ML + 238, y + 6, { width: 122 });
      doc.fontSize(9.5).font('Helvetica-Bold').fillColor(C.brand).text(`$${cumulative.toLocaleString()}`, ML + 368, y + 6, { width: CW - 370 });
      doc.y = y + 24;
    });

    addFooter();

    // ═══════════════════════════════════════════════════════════════════
    // PAGE 8: PREDICTIVE OUTLOOK
    // ═══════════════════════════════════════════════════════════════════
    startPage();
    pageHeader('Predictive Safety Outlook', 'Forecasting, trend analysis, and early warning signals');

    // Forecast KPI cards
    const topFactor = (forecast.topRiskFactors?.[0] || 'N/A').replace(/_/g, ' ');
    drawKPIRow([
      { label: 'HIGH-RISK TODAY', val: `${forecast.highRiskDrivers}`, sub: 'drivers', c: C.red },
      { label: 'PREDICTED EVENTS', val: `${forecast.predictedEventsThisWeek}`, sub: 'this week', c: C.amber },
      { label: 'TOP RISK FACTOR', val: topFactor.slice(0, 12), sub: 'primary cause', c: C.brand },
      { label: 'RECOMMENDATIONS', val: `${forecast.recommendations?.length || 0}`, sub: 'actions', c: C.green },
    ], doc.y, 78);

    // Declining trends
    const declining = trends.filter((t: any) => t.trendDirection === 'declining' || t.trendDirection === 'rapidly_declining');
    if (declining.length > 0) {
      subHead('Declining Trends - Needs Attention');
      for (const t of declining.slice(0, 10)) {
        const isRapid = t.trendDirection === 'rapidly_declining';
        const y = doc.y;
        doc.roundedRect(ML, y, 60, 16, 4).fill(isRapid ? C.redBg : C.amberBg);
        doc.fontSize(8).font('Helvetica-Bold').fillColor(isRapid ? C.red : C.amber)
          .text(isRapid ? 'RAPID' : 'DECLINING', ML + 3, y + 3, { width: 54, align: 'center' });
        doc.fontSize(9).font('Helvetica-Bold').fillColor(C.text)
          .text(t.driverName, ML + 68, y + 2, { width: 100 });
        doc.fontSize(9).font('Helvetica').fillColor(C.muted)
          .text(`${t.details.slice(0, 52)} (${t.weekOverWeekChange > 0 ? '+' : ''}${t.weekOverWeekChange}% WoW)`, ML + 170, y + 2, { width: CW - 170 });
        doc.y = y + 22;
      }
    }

    doc.y += 8;
    const improving = trends.filter((t: any) => t.trendDirection === 'improving');
    if (improving.length > 0) {
      subHead('Improving Trends - Positive Progress');
      for (const t of improving.slice(0, 6)) {
        const y = doc.y;
        doc.roundedRect(ML, y, 60, 16, 4).fill(C.greenBg);
        doc.fontSize(8).font('Helvetica-Bold').fillColor(C.green)
          .text('IMPROVING', ML + 3, y + 3, { width: 54, align: 'center' });
        doc.fontSize(9).font('Helvetica-Bold').fillColor(C.text)
          .text(t.driverName, ML + 68, y + 2, { width: 100 });
        doc.fontSize(9).font('Helvetica').fillColor(C.muted)
          .text(t.details.slice(0, 60), ML + 170, y + 2, { width: CW - 170 });
        doc.y = y + 22;
      }
    }

    // Forecast recommendations
    if (forecast.recommendations?.length > 0) {
      doc.y += 8;
      subHead('Forecast Recommendations');
      for (const rec of forecast.recommendations.slice(0, 4)) {
        const y = doc.y;
        doc.fontSize(10).font('Helvetica').fillColor(C.gold).text('>  ', ML, y, { continued: true });
        doc.fillColor(C.text).text(rec);
        doc.y += 4;
      }
    }

    addFooter();

    // ═══════════════════════════════════════════════════════════════════
    // PAGE 9: ACTION PLAN
    // ═══════════════════════════════════════════════════════════════════
    startPage();
    pageHeader('Consolidated Action Plan', 'Prioritized actions across all fleet domains');

    const actions: { priority: string; domain: string; action: string; impact: string }[] = [];

    for (const rec of score.recommendations.slice(0, 2))
      actions.push({ priority: 'HIGH', domain: 'Insurance', action: rec, impact: 'Score improvement' });

    for (const r of risks.slice(0, 3)) {
      const te = r.topEventTypes?.[0]?.type?.replace(/_/g, ' ') || 'safety';
      actions.push({ priority: r.tier === 'critical' ? 'CRITICAL' : 'HIGH', domain: 'Safety', action: `Coach ${r.driverName} on ${te} (${r.topEventTypes?.[0]?.count || 0} events)`, impact: `$${r.annualizedCost.toLocaleString()}` });
    }
    for (const w of wellnessRecs.slice(0, 2))
      actions.push({ priority: 'HIGH', domain: 'Wellness', action: `${w.driverName}: ${w.recommendations?.[0] || 'Rest intervention'}`, impact: `$${w.retentionCost.toLocaleString()}` });
    for (const rec of green.recommendations.slice(0, 2))
      actions.push({ priority: rec.priority === 'high' ? 'HIGH' : 'MEDIUM', domain: 'Green', action: rec.title, impact: `$${rec.projectedSavings.toLocaleString()}/yr` });
    for (const t of declining.slice(0, 2))
      actions.push({ priority: t.trendDirection === 'rapidly_declining' ? 'CRITICAL' : 'HIGH', domain: 'Predictive', action: `Intervene: ${t.driverName} - ${t.trendDirection.replace(/_/g, ' ')}`, impact: `${t.weekOverWeekChange}% WoW` });

    const pOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    actions.sort((a, b) => (pOrder[a.priority] ?? 3) - (pOrder[b.priority] ?? 3));

    actions.forEach((a, i) => {
      const y = doc.y;
      const h = 46;
      if (i % 2 === 0) doc.roundedRect(ML, y, CW, h, 4).fill(C.cardBg);

      const pc = a.priority === 'CRITICAL' ? C.red : a.priority === 'HIGH' ? C.amber : C.green;
      const pbg = a.priority === 'CRITICAL' ? C.redBg : a.priority === 'HIGH' ? C.amberBg : C.greenBg;

      // Number circle
      doc.circle(ML + 18, y + 15, 12).fill(pc);
      doc.fontSize(11).font('Helvetica-Bold').fillColor(C.white)
        .text(String(i + 1), ML + 8, y + 9, { width: 20, align: 'center' });

      // Priority badge
      doc.roundedRect(ML + 38, y + 5, 58, 18, 4).fill(pbg);
      doc.fontSize(8).font('Helvetica-Bold').fillColor(pc)
        .text(a.priority, ML + 40, y + 9, { width: 54, align: 'center' });

      // Domain
      doc.fontSize(9).font('Helvetica').fillColor(C.muted)
        .text(a.domain.toUpperCase(), ML + 104, y + 9, { width: 70 });

      // Impact (right-aligned)
      doc.fontSize(9.5).font('Helvetica-Bold').fillColor(C.muted)
        .text(a.impact, PW - MR - 100, y + 9, { width: 100, align: 'right' });

      // Action text
      doc.fontSize(9.5).font('Helvetica').fillColor(C.text)
        .text(a.action, ML + 38, y + 28, { width: CW - 48 });

      doc.y = y + h + 3;
    });

    // Footer signoff
    doc.y += 14;
    doc.strokeColor(C.gold).lineWidth(2).moveTo(ML, doc.y).lineTo(PW - MR, doc.y).stroke();
    doc.y += 10;
    doc.fontSize(10).font('Helvetica').fillColor(C.muted)
      .text('This report was generated by FleetShield AI using data from MyGeotab API and Geotab Ace.', ML);
    doc.y += 4;
    doc.fontSize(10).text('For questions or to discuss recommendations, contact your fleet operations team.', ML);

    addFooter();

    // ── Done ──
    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

// ── Drawing Primitives ─────────────────────────────────────────────────────

function drawBar(doc: PDFKit.PDFDocument, label: string, score: number, weight: string) {
  const y = doc.y;
  const barX = ML + 145;
  const barW = 220;
  const barH = 18;

  doc.fontSize(9.5).font('Helvetica').fillColor(C.text).text(label, ML, y + 2, { width: 100 });
  doc.fontSize(9).font('Helvetica').fillColor(C.muted).text(weight, ML + 102, y + 3, { width: 40 });

  doc.roundedRect(barX, y + 1, barW, barH, 4).fill(C.border);
  const fw = Math.max(4, (score / 100) * barW);
  doc.roundedRect(barX, y + 1, fw, barH, 4).fill(scoreColor(score));

  // Score inside bar
  if (fw > 30) {
    doc.fontSize(9).font('Helvetica-Bold').fillColor(C.white)
      .text(String(score), barX + fw - 26, y + 3, { width: 22, align: 'right' });
  } else {
    doc.fontSize(9).font('Helvetica-Bold').fillColor(C.text)
      .text(String(score), barX + fw + 6, y + 3);
  }

  doc.y = y + barH + 7;
}

function drawGaugeRing(doc: PDFKit.PDFDocument, cx: number, cy: number, r: number, score: number, grade: string) {
  const color = scoreColor(score);
  const lw = 10;
  const start = -Math.PI * 0.75;
  const totalArc = Math.PI * 1.5;

  // Background arc
  drawArcPath(doc, cx, cy, r, start, start + totalArc, C.border, lw);
  // Fill arc
  drawArcPath(doc, cx, cy, r, start, start + (score / 100) * totalArc, color, lw + 2);

  // Score text
  doc.fontSize(26).font('Helvetica-Bold').fillColor(color)
    .text(String(score), cx - 24, cy - 16, { width: 48, align: 'center' });
  doc.fontSize(12).font('Helvetica-Bold').fillColor(C.muted)
    .text(grade, cx - 24, cy + 14, { width: 48, align: 'center' });
}

function drawArcPath(doc: PDFKit.PDFDocument, cx: number, cy: number, r: number, start: number, end: number, color: string, lw: number) {
  const steps = 50;
  const range = end - start;
  if (Math.abs(range) < 0.01) return;
  doc.save();
  doc.strokeColor(color).lineWidth(lw).lineCap('round');
  let first = true;
  for (let i = 0; i <= steps; i++) {
    const a = start + (i / steps) * range;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (first) { doc.moveTo(x, y); first = false; }
    else doc.lineTo(x, y);
  }
  doc.stroke();
  doc.restore();
}

function drawCard(doc: PDFKit.PDFDocument, title: string, accent: string, lines: string[]) {
  const y = doc.y;
  const h = 22 + lines.length * 18;
  doc.roundedRect(ML, y, CW, h, 5).fill(C.cardBg);
  doc.rect(ML, y, 4, h).fill(accent);
  doc.fontSize(11).font('Helvetica-Bold').fillColor(C.text).text(title, ML + 16, y + 7, { width: CW - 28 });
  let ly = y + 26;
  for (const line of lines) {
    doc.fontSize(9.5).font('Helvetica').fillColor(C.muted).text(line, ML + 16, ly, { width: CW - 28 });
    ly += 18;
  }
  doc.y = y + h + 8;
}
