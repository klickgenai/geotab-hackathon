export interface InsightContent {
  title: string;
  explanation: string;
  methodology: string;
  actionable: string;
}

export const insightContent: Record<string, InsightContent> = {
  // ── Dashboard ───────────────────────────────────────────────
  'dashboard.fleetScore': {
    title: 'Fleet Safety Score',
    explanation:
      'A composite 0-100 score aggregated from every driver\'s individual safety score, weighted by miles driven so high-mileage drivers influence the number more.',
    methodology:
      'Each driver\'s score is calculated from harsh-braking rate, speeding %, seatbelt compliance, and idle time. Scores are then weighted by miles driven and averaged fleet-wide.',
    actionable:
      'Focus coaching on the lowest-scoring high-mileage drivers for the biggest score lift.',
  },
  'dashboard.activeDrivers': {
    title: 'Active Drivers',
    explanation:
      'The number of drivers who have recorded at least one trip in the last 7 days.',
    methodology:
      'A driver is marked "active" when the Geotab API returns a trip record with their driver key within the trailing 7-day window.',
    actionable:
      'Compare active vs. total drivers to spot unassigned or inactive personnel who may need schedule review.',
  },
  'dashboard.activeTrucks': {
    title: 'Active Trucks',
    explanation:
      'The number of vehicles that have transmitted a GPS ping within the last 24 hours.',
    methodology:
      'Vehicles are polled via the MyGeotab DeviceStatusInfo feed. Any device with a lastCommunicationTime inside 24 hours counts as active.',
    actionable:
      'Vehicles that drop off the active list may have connectivity issues or need maintenance checks.',
  },
  'dashboard.safetyEvents': {
    title: 'Safety Events (30 days)',
    explanation:
      'Total safety events -- harsh braking, speeding, seatbelt violations, and more -- recorded in the last 30 days.',
    methodology:
      'Events come from Geotab\'s ExceptionEvent API filtered by safety-related rules. The rate is normalized per 1,000 miles driven.',
    actionable:
      'Drill into the event breakdown to find which category is rising fastest and target it with coaching.',
  },
  'dashboard.scoreGauge': {
    title: 'Fleet Score Gauge',
    explanation:
      'A visual gauge mapping the fleet-wide safety score to a letter grade from A+ (95-100) down to F (below 50).',
    methodology:
      'Grade boundaries: A+ (95-100), A (90-94), B+ (85-89), B (75-84), C+ (70-74), C (60-69), D (50-59), F (<50). The ring fill represents the numeric score.',
    actionable:
      'Aim for the B+ tier (85+) to unlock the best insurance premium discounts.',
  },
  'dashboard.percentile': {
    title: 'Fleet Percentile',
    explanation:
      'Shows how your fleet ranks versus the industry average. "78th percentile" means your fleet is safer than 78% of comparable fleets.',
    methodology:
      'Percentile is derived from Geotab benchmark data for fleets of similar size and vehicle class.',
    actionable:
      'Moving from the 75th to the 90th percentile typically triggers an additional 5-8% premium reduction.',
  },
  'dashboard.trend': {
    title: 'Score Trend',
    explanation:
      'The direction your fleet safety score has moved over the last 30 days: improving, stable, or declining.',
    methodology:
      'Compares the current 30-day rolling score to the previous 30-day rolling score. A delta > +2 is "improving"; < -2 is "declining".',
    actionable:
      'A declining trend warrants an immediate review of recent safety events and driver coaching logs.',
  },
  'dashboard.premiumImpact': {
    title: 'Premium Impact',
    explanation:
      'The estimated change in your annual insurance premium based on the current safety score versus the industry benchmark.',
    methodology:
      'Benchmark premium = fleet size x $14,200/vehicle (Class 8 commercial avg). Each point above 50 saves 0.3% of the benchmark premium. Formula: savings = (score - 50) x 0.3% x benchmark.',
    actionable:
      'Share this metric with your insurance broker during renewal negotiations to justify rate adjustments.',
  },
  'dashboard.annualSavings': {
    title: 'Annual Savings',
    explanation:
      'Projected yearly cost avoidance from safety improvements including reduced premiums, fewer accidents, fuel savings, driver retention, and productivity gains.',
    methodology:
      'Sum of 5 categories: insurance savings (score-based premium reduction), accident prevention ($91K avg cost x prevented incidents), fuel savings (idle reduction x $3.85/gal), retention savings ($35K replacement cost x prevented turnover), and productivity gains ($150/event prevented).',
    actionable:
      'Use this figure in ROI conversations with leadership to justify continued safety investment.',
  },
  'dashboard.harshBraking': {
    title: 'Harsh Braking',
    explanation:
      'Measures sudden deceleration events per 1,000 miles driven. A leading indicator of tailgating and inattentive driving.',
    methodology:
      'Geotab accelerometer data flags decelerations exceeding thresholds. Events are severity-weighted: light (1x), moderate (2x), severe (4x). Normalized per 1K miles.',
    actionable:
      'Drivers with high rates benefit most from following-distance coaching and forward-collision warnings.',
  },
  'dashboard.speeding': {
    title: 'Speeding',
    explanation:
      'The percentage of driving time spent above posted speed limits, weighted by the amount of excess speed.',
    methodology:
      'GPS speed is compared to Geotab\'s posted-speed-limit database every second. Time over limit is aggregated per trip.',
    actionable:
      'Set in-cab speed alerts and review routes for areas where drivers consistently exceed limits.',
  },
  'dashboard.seatbeltCompliance': {
    title: 'Seatbelt Compliance',
    explanation:
      'Percentage of trips where the seatbelt was worn for the entire duration of the trip.',
    methodology:
      'Seatbelt status is read from the vehicle\'s OBD-II bus. A trip is non-compliant if the belt is unbuckled while the vehicle is moving.',
    actionable:
      'Implement a zero-tolerance seatbelt policy and use in-cab audio reminders.',
  },
  'dashboard.idleTime': {
    title: 'Idle Time',
    explanation:
      'Average engine idle time per trip expressed as a percentage of total engine run time.',
    methodology:
      'Engine-on + speed = 0 intervals are summed per trip. Fleet average is weighted by trip duration. Industry target: below 15%.',
    actionable:
      'Set idle-shutdown timers and educate drivers on the fuel and emissions cost of idling.',
  },
  'dashboard.wellnessScore': {
    title: 'Fleet Wellness Score',
    explanation:
      'A fleet-wide index (0-100) reflecting driver well-being based on fatigue signals, hours worked, and stress indicators.',
    methodology:
      'Combines hours-of-service utilization, rest-period regularity, late-night driving frequency, and trip-pattern volatility into a weighted score per driver, then averaged across the fleet.',
    actionable:
      'Prioritize wellness check-ins for drivers below the fleet average to prevent burnout.',
  },
  'dashboard.retentionRisk': {
    title: 'Retention Risk',
    explanation:
      'The percentage of drivers showing burnout signals who are at risk of leaving within the next 90 days.',
    methodology:
      'Drivers with 2+ burnout indicators (excessive hours, irregular rest, declining performance) are flagged as at-risk. Each critical signal adds 22% to burnout probability; each warning adds 12%.',
    actionable:
      'Engage at-risk drivers with schedule adjustments, recognition, or route preferences before they resign.',
  },
  'dashboard.burnoutSignals': {
    title: 'Burnout Signals',
    explanation:
      'Count of drivers currently exceeding fatigue or hours-driven thresholds that indicate potential burnout.',
    methodology:
      '6 signals monitored: shift irregularity (schedule variance), consecutive long days (>10h driving), rest compression (shrinking rest periods), harsh event escalation (week-over-week increase), night driving creep (increasing night hours), excessive daily hours (% of days >11h).',
    actionable:
      'Review flagged drivers\' schedules immediately and redistribute workload where possible.',
  },
  'dashboard.financialSavings': {
    title: 'Financial Savings',
    explanation:
      'Total projected cost avoidance from all FleetShield interventions during the current reporting period.',
    methodology:
      'Sum of: insurance premium reduction, accident prevention (fewer high-severity events x $91K avg accident cost), fuel savings (idle reduction), retention savings ($35K/driver), and productivity gains.',
    actionable:
      'Present this to stakeholders as the direct ROI of the FleetShield platform.',
  },
  'dashboard.claimsReduction': {
    title: 'Claims Reduction',
    explanation:
      'The reduction in estimated accident incidents compared to the baseline period.',
    methodology:
      'High-severity events are tracked over 45-day windows. Reduction in events is annualized and converted to prevented accidents using 1-in-200 event-to-accident ratio (0.5%, based on FMCSA data). Savings = prevented accidents x $91,000 avg cost.',
    actionable:
      'Document this metric for your insurance carrier to support premium renegotiation.',
  },

  // ── Insurance ───────────────────────────────────────────────
  'insurance.overallScore': {
    title: 'Insurance Grade',
    explanation:
      'A composite insurance grade (A+ to F) combining four safety components into a single 0-100 insurability metric.',
    methodology:
      'Weighted average of 4 components: Safe Driving (35%) + Compliance (25%) + Maintenance (20%) + Driver Quality (20%). Each component is scored 0-100 independently, then multiplied by its weight and summed.',
    actionable:
      'Improve the lowest-scoring component first -- it has the most room to lift the total.',
  },
  'insurance.percentile': {
    title: 'Insurance Percentile',
    explanation:
      'Your fleet\'s ranking among all insured fleets in the same size bracket.',
    methodology:
      'Benchmark data from industry loss-ratio databases, segmented by fleet size. A score of 80+ puts you in the top 20% of fleets.',
    actionable:
      'Crossing the 80th percentile threshold typically qualifies your fleet for preferred-tier pricing.',
  },
  'insurance.premiumEstimate': {
    title: 'Annual Premium Impact',
    explanation:
      'Estimated annual insurance savings compared to the industry-average premium for your fleet size and vehicle class.',
    methodology:
      'Benchmark: $14,200/vehicle/year (Class 8 commercial average). Total benchmark = vehicles x $14,200. Each point above 50 saves 0.3% of the benchmark. Formula: savings = (score - 50) x 0.003 x benchmark. Example: score 72 with 25 vehicles = (72-50) x 0.003 x $355,000 = $23,430/year.',
    actionable:
      'Compare this estimate against your actual premium to identify negotiation opportunities with your broker.',
  },
  'insurance.harshBraking': {
    title: 'Safe Driving Component',
    explanation:
      'Insurance component score based on incident frequency, severity distribution, and 30-day trends. Weighted at 35% of the total score.',
    methodology:
      'Sub-factors: event rate per 1,000 miles (industry avg ~12), total event count, severity mix (light/moderate/severe weighted 1x/2x/4x), and 30-day trend direction. Score 0-100 where 100 = safest.',
    actionable:
      'Reducing severe events has 4x the impact on this score compared to light events.',
  },
  'insurance.speeding': {
    title: 'Driver Quality Component',
    explanation:
      'Insurance component measuring driver tenure, risk distribution, and overall team experience. Weighted at 20% of the total score.',
    methodology:
      'Sub-factors: average driver tenure (years), % of drivers in low-risk tier, % in high/critical tiers, total driver count. Experienced, low-risk teams score highest.',
    actionable:
      'Retaining experienced drivers and coaching high-risk ones improves this component fastest.',
  },
  'insurance.seatbelt': {
    title: 'Compliance Component',
    explanation:
      'Insurance component for regulatory and policy compliance. Weighted at 25% of the total score.',
    methodology:
      'Sub-factors: seatbelt violations (0 = full score), speeding events per 30 days, HOS violations, average daily driving hours vs 11h limit. Each metric scored against fleet-specific thresholds.',
    actionable:
      'Zero-tolerance seatbelt + HOS policies deliver the fastest compliance score lift.',
  },
  'insurance.idleTime': {
    title: 'Maintenance Component',
    explanation:
      'Insurance component for vehicle condition and fleet modernity. Weighted at 20% of the total score.',
    methodology:
      'Sub-factors: average vehicle age (years), active fault codes, faults per vehicle, average odometer. Newer vehicles with fewer faults score highest.',
    actionable:
      'Clear active fault codes and prioritize PM schedules to improve this score.',
  },
  'insurance.whatIf': {
    title: 'What-If Simulator',
    explanation:
      'Interactive tool showing how specific safety improvements translate to insurance score increases and premium savings.',
    methodology:
      'Each slider maps to a score boost formula. Example: Harsh Braking Reduction -- boost = (reduction% / 100) x 0.35 x 15 max pts. Speeding Reduction -- boost = (reduction% / 100) x 0.25 x 18 max pts. Total boost converts to dollar savings via the 0.3%-per-point premium formula.',
    actionable:
      'Use this tool to build a business case: pick interventions with the best savings-to-difficulty ratio.',
  },

  // ── ROI ─────────────────────────────────────────────────────
  'roi.annualSavings': {
    title: 'Total Annual Savings',
    explanation:
      'Total projected yearly cost avoidance across five categories. These are potential savings from preventing costly events, not guaranteed refunds.',
    methodology:
      'Sum of: (1) Insurance premium savings from score improvement, (2) Accident prevention: reduced high-severity events x 1/200 accident conversion x $91K avg cost, (3) Fuel: idle reduction x 0.8 gal/hr x $3.85/gal, (4) Retention: at-risk drivers x $35K replacement cost x 65% intervention success, (5) Productivity: prevented events x $150/event.',
    actionable:
      'Present this headline number to leadership alongside the ROI percentage for budget approval.',
  },
  'roi.roiPercent': {
    title: 'Return on Investment',
    explanation:
      'The return on your FleetShield investment: (total savings - investment cost) / investment cost x 100.',
    methodology:
      'Investment cost = fleet size x ($45 platform + $35 support) x 12 months/year. ROI = ((annual savings - investment) / investment) x 100. Example: $80K savings on $24K investment = 233% ROI.',
    actionable:
      'An ROI above 200% is strong. Accelerate by prioritizing the highest-value intervention categories.',
  },
  'roi.paybackMonths': {
    title: 'Payback Period',
    explanation:
      'The number of months until your FleetShield investment is fully recovered from accumulated savings.',
    methodology:
      'Formula: (annual investment cost / annual savings) x 12 months. Example: $24K investment / $80K savings = 3.6 months payback.',
    actionable:
      'Most fleets achieve payback within 3-6 months. Accelerate by prioritizing high-impact interventions.',
  },
  'roi.costPerDriver': {
    title: '3-Year Projected Value',
    explanation:
      'The cumulative net value (savings minus cost) projected over 3 years, assuming 8% annual improvement from compounding safety gains.',
    methodology:
      'Year 1: annual savings - investment. Year 2: (annual savings x 1.08) - investment. Year 3: (annual savings x 1.08^2) - investment. Total = sum of all 3 years.',
    actionable:
      'Use this long-term projection to justify multi-year safety program commitments.',
  },
  'roi.insuranceSavings': {
    title: 'Insurance Premium Savings',
    explanation:
      'Annual savings from lower insurance premiums due to your improved safety score vs. the industry baseline.',
    methodology:
      'Benchmark: $14,200/vehicle/year. Premium reduction = (insurance score - 50) x 0.3% of benchmark. Example: score 72 with 25 vehicles = 22 pts x 0.3% x $355K = $23,430/year saved vs. industry average.',
    actionable:
      'Lock in savings by scheduling an insurance review when your score crosses a grade boundary (e.g., C to B).',
  },
  'roi.claimsSavings': {
    title: 'Accident Prevention Savings',
    explanation:
      'Estimated cost avoidance from prevented accidents, based on the reduction in high-severity safety events over time.',
    methodology:
      'Compares high-severity events in the first 45 days vs. last 45 days, annualizes the reduction, then converts to prevented accidents using a 1-in-200 ratio (FMCSA data: ~0.5% of telematics events result in reportable crashes). Savings = prevented accidents x $91,000 (avg accident cost including vehicle damage, medical, liability, downtime). Source: FMCSA/NHTSA.',
    actionable:
      'Even preventing 0.5 accidents/year saves ~$45K. Focus on reducing critical and high-severity events.',
  },
  'roi.fuelSavings': {
    title: 'Fuel Savings',
    explanation:
      'Savings from reduced engine idling across the fleet.',
    methodology:
      'Formula: vehicles x 365 days x 0.8 gal/hr idle burn rate x (current idle% - target idle%) x $3.85/gal diesel. Current idle: ~13% (fleet avg). Target: 8% (industry best practice). Example: 25 vehicles x 365 x 0.8 x 5.1% x $3.85 = ~$14,300/year.',
    actionable:
      'Install idle-shutdown timers and APUs. Each 1% idle reduction saves ~$2,800/year for a 25-vehicle fleet.',
  },
  'roi.retentionSavings': {
    title: 'Driver Retention Savings',
    explanation:
      'Savings from preventing driver turnover. Replacement cost is $35,000 per driver (recruiting, training, onboarding, lost productivity during ramp-up).',
    methodology:
      'Identifies at-risk drivers using burnout probability (from wellness engine). Total at-risk cost = sum of ($35,000 x each driver\'s burnout probability). Projected savings = at-risk cost x 65% intervention success rate. Source: ATA replacement cost data; DOT/FMCSA wellness intervention studies.',
    actionable:
      'Proactive wellness interventions cost a fraction of $35K replacement. Target high-burnout drivers first.',
  },
  'roi.complianceSavings': {
    title: 'Productivity Gains',
    explanation:
      'Value of productivity recovered from fewer safety events disrupting operations (investigations, vehicle downtime, scheduling disruptions).',
    methodology:
      'Each prevented safety event saves an estimated $150 in operational disruption (investigation time, paperwork, vehicle inspection). Capped at $50K/year. Total = prevented events x $150.',
    actionable:
      'Reducing event volume frees up safety managers and dispatchers to focus on growth, not firefighting.',
  },
  'roi.beforeAfter': {
    title: 'Before / After Comparison',
    explanation:
      'Side-by-side comparison of key fleet metrics from the first 45 days vs. the most recent 45 days of the 90-day monitoring window.',
    methodology:
      'Metrics compared: total events, high-severity events, avg safety score, event rate per 1K miles, avg rest hours. Dollar impact is calculated from the change in each metric using the corresponding cost formula.',
    actionable:
      'Use this comparison in executive reports and insurance negotiations to show measurable progress.',
  },
  'roi.retentionRate': {
    title: 'Retention Rate',
    explanation:
      'Driver retention rate improvement since FleetShield deployment.',
    methodology:
      'Compares annualized turnover rate (departures / average headcount) before vs. after deployment.',
    actionable:
      'Pair retention data with wellness scores to identify which interventions are most effective.',
  },

  // ── Predictive ──────────────────────────────────────────────
  'predictive.highRiskDrivers': {
    title: 'High-Risk Drivers',
    explanation:
      'Drivers flagged by the predictive model as having an elevated incident probability before their next shift.',
    methodology:
      'Pre-shift risk score (0-100) combines 4 factors: Fatigue (0-30 pts: rest hours, consecutive days, night driving), Behavior Trend (0-25 pts: recent event rate vs. baseline), Recent Severity (0-25 pts: critical/high events in last 48h and 7d), Workload (0-20 pts: daily hours and distance). Levels: low (0-25), elevated (26-50), high (51-75), critical (76-100).',
    actionable:
      'Assign flagged drivers to lower-risk routes or schedule mandatory rest before their next shift.',
  },
  'predictive.forecastAccuracy': {
    title: 'Forecast Accuracy',
    explanation:
      'The historical accuracy of the predictive model, measured as the percentage of predictions confirmed by actual events.',
    methodology:
      'Backtested against 90 days of historical data. Accuracy = (true positives + true negatives) / total predictions.',
    actionable:
      'Accuracy improves over time as the model ingests more fleet-specific data.',
  },
  'predictive.riskTrend': {
    title: 'Risk Trend',
    explanation:
      'The fleet-wide risk trend direction over the last 14 days: increasing, stable, or decreasing.',
    methodology:
      'Compares the average daily risk score for the last 7 days vs. the prior 7 days. Week-over-week event rate change determines deterioration.',
    actionable:
      'An increasing trend should trigger a fleet-wide safety stand-down or refresher training.',
  },
  'predictive.preShiftScore': {
    title: 'Pre-Shift Risk Score',
    explanation:
      'An individual driver\'s risk score calculated before they start a shift. Scale: 0-100 where lower is safer.',
    methodology:
      'Sum of 4 factors: Fatigue Factor (0-30): hours since rest, consecutive long days, night driving pattern. Behavior Trend (0-25): event rate in last 7 days vs. 30-day baseline. Recent Severity (0-25): count of critical/high events in 48h and 7d windows. Workload Factor (0-20): avg hours and distance per day.',
    actionable:
      'Drivers scoring above 50 should be reassigned or given additional rest before driving.',
  },
  'predictive.riskFactors': {
    title: 'Risk Factors',
    explanation:
      'The key variables driving a driver\'s current risk level, ranked by contribution to the overall score.',
    methodology:
      'Each factor contributes a specific point range: Fatigue (up to 30), Behavior (up to 25), Severity (up to 25), Workload (up to 20). The highest-contributing factor is the primary risk driver.',
    actionable:
      'Address the top risk factor first for the most efficient risk reduction.',
  },

  // ── Wellness ────────────────────────────────────────────────
  'wellness.retentionCost': {
    title: 'Retention Cost at Risk',
    explanation:
      'The estimated financial exposure if at-risk drivers leave, based on $35,000 average replacement cost per driver (recruiting, CDL training, onboarding, 6-month productivity ramp-up).',
    methodology:
      'For each driver: retention cost = $35,000 x burnout probability. Burnout probability = (critical signals x 0.22) + (warning signals x 0.12) + 0.03 baseline. Total = sum across all drivers. Source: American Trucking Associations (ATA) driver replacement cost data.',
    actionable:
      'Proactive wellness interventions (schedule adjustments, coaching) cost far less than $35K replacement. Target high-probability drivers first.',
  },
  'wellness.burnoutSignals': {
    title: 'Burnout Signal Detection',
    explanation:
      '6 telematics-based signals are continuously monitored to detect early signs of driver burnout before it leads to turnover or accidents.',
    methodology:
      'Signals: (1) Shift Irregularity: schedule variance std dev. (2) Consecutive Long Days: days with >10h driving. (3) Rest Compression: shrinking rest periods between shifts. (4) Harsh Event Escalation: week-over-week event rate increase. (5) Night Driving Creep: increasing night hours. (6) Excessive Daily Hours: % of days exceeding 11h. Each signal classified as normal/warning/critical.',
    actionable:
      'Schedule one-on-one check-ins with flagged drivers and adjust their routes or schedules.',
  },
  'wellness.fatigueScore': {
    title: 'Wellness Score',
    explanation:
      'An individual driver wellness metric (0-100) reflecting fatigue risk based on work patterns from telematics data.',
    methodology:
      'Inversely proportional to burnout signals: 100 = no signals detected, score decreases as critical and warning signals accumulate. Drivers with 3+ critical signals typically score below 40.',
    actionable:
      'Ensure drivers with low wellness scores receive mandatory rest before their next assignment.',
  },
  'wellness.hoursCompliance': {
    title: 'Average Wellness Score',
    explanation:
      'Fleet-wide average of individual driver wellness scores, indicating overall workforce well-being.',
    methodology:
      'Simple average of all driver wellness scores (0-100). A fleet average above 70 indicates a generally healthy workforce; below 50 indicates systemic overwork.',
    actionable:
      'If fleet average is below 60, review scheduling policies and workload distribution fleet-wide.',
  },
  'wellness.interventionSuccess': {
    title: 'Intervention Impact',
    explanation:
      'Wellness interventions (schedule changes, coaching, rest mandates) succeed in retaining 65% of at-risk drivers, based on DOT/FMCSA wellness program studies.',
    methodology:
      'Projected savings = total retention cost at risk x 65% intervention success rate. This is a conservative estimate -- industry studies show 60-75% success for structured wellness programs.',
    actionable:
      'Analyze which intervention types (schedule adjustment, coaching, route change) have the highest success in your fleet and standardize them.',
  },

  // ── Alerts ──────────────────────────────────────────────────
  'alerts.urgencyScore': {
    title: 'Urgency Score',
    explanation:
      'AI-computed priority score (0-100) based on event severity, recency, and the driver\'s history pattern.',
    methodology:
      'Base severity score + repeat offender bonus (if 3+ similar events in 7d) + recency bonus (events in last 2h score higher) + pattern bonus (if clustered with other event types). Priority: critical (75-100), high (50-74), medium (25-49), low (0-24).',
    actionable:
      'Address critical alerts (75+) within 1 hour. High alerts (50-74) should be reviewed same-day.',
  },
  'alerts.priorityLevel': {
    title: 'Priority Level',
    explanation:
      'Alert classification into Critical, High, Medium, or Low based on computed urgency score.',
    methodology:
      'Critical: score 75-100 (immediate action). High: 50-74 (same-day review). Medium: 25-49 (weekly review). Low: 0-24 (informational). Categories: mechanical, compliance, behavioral, pattern.',
    actionable:
      'Set up push notifications for Critical and High alerts to ensure immediate response.',
  },
  'alerts.category': {
    title: 'Alert Category',
    explanation:
      'Groups alerts by type: Behavioral, Mechanical, Compliance, or Pattern for organized triage.',
    methodology:
      'Auto-classified based on the source event type. Behavioral: harsh braking, speeding. Mechanical: fault codes, maintenance. Compliance: HOS, seatbelt. Pattern: clustered recurring events.',
    actionable:
      'Filter by category to delegate alerts to the right team (safety manager, mechanic, HR).',
  },

  // ── Safety Severity ─────────────────────────────────────────
  'safety.critical': {
    title: 'Critical Events',
    explanation:
      'Events requiring immediate action: collisions, rollovers, major speeding (30+ mph over the limit).',
    methodology:
      'Filtered from Geotab ExceptionEvents where severity = critical or speed excess > 30 mph.',
    actionable:
      'Investigate within 1 hour. Pull the driver from service if needed. File incident report.',
  },
  'safety.high': {
    title: 'High-Severity Events',
    explanation:
      'Events needing same-day review: repeated harsh braking, sustained speeding, seatbelt violations.',
    methodology:
      'Events where severity = high or the driver has 3+ similar events in the trailing 7 days.',
    actionable:
      'Schedule a coaching session with the driver within 24 hours.',
  },
  'safety.medium': {
    title: 'Medium-Severity Events',
    explanation:
      'Events for weekly review: occasional harsh events, minor speeding, short idle violations.',
    methodology:
      'Events where severity = medium and no pattern of repeat offenses detected.',
    actionable:
      'Include in the weekly safety briefing and monitor for pattern development.',
  },
  'safety.low': {
    title: 'Low-Severity Events',
    explanation:
      'Informational events: single minor events that represent coaching opportunities rather than urgent concerns.',
    methodology:
      'First-time or isolated events with minimal severity. Logged for trend analysis.',
    actionable:
      'Use these as positive coaching moments to reinforce good habits before issues escalate.',
  },

  // ── Vehicles ────────────────────────────────────────────────
  'vehicles.odometer': {
    title: 'Odometer',
    explanation:
      'Current vehicle mileage used for maintenance scheduling, warranty tracking, and depreciation calculations.',
    methodology:
      'Read from the vehicle\'s OBD-II system via Geotab device. Updated with each trip.',
    actionable:
      'Set up mileage-based maintenance alerts (e.g., oil change every 10K miles).',
  },
  'vehicles.age': {
    title: 'Vehicle Age',
    explanation:
      'The age of the vehicle in years. Older vehicles typically have higher insurance rates and maintenance frequency.',
    methodology:
      'Calculated from the model year in the Geotab device profile.',
    actionable:
      'Vehicles over 7 years old should be evaluated for replacement based on TCO analysis.',
  },
  'vehicles.faults': {
    title: 'Active Faults',
    explanation:
      'Active diagnostic trouble codes (DTCs) from the vehicle\'s OBD system indicating potential mechanical issues.',
    methodology:
      'Read from Geotab\'s FaultData API. Filtered to active (not cleared) codes.',
    actionable:
      'Schedule maintenance for vehicles with active faults before they lead to breakdowns or safety events.',
  },

  // ── Reports ─────────────────────────────────────────────────
  'reports.executiveSummary': {
    title: 'Executive Summary',
    explanation:
      'A high-level fleet performance overview designed for leadership meetings and insurance underwriter presentations.',
    methodology:
      'Aggregates top-line KPIs, trend data, and financial impact into a single-page format.',
    actionable:
      'Generate this report monthly and share it with your insurance broker before renewal periods.',
  },
  'reports.financialImpact': {
    title: 'Financial Impact Report',
    explanation:
      'A detailed cost analysis showing FleetShield ROI with supporting data for each savings category.',
    methodology:
      'Breaks down savings by category with before/after comparisons, methodology notes, and industry benchmark sources.',
    actionable:
      'Use this report to justify continued FleetShield investment and request budget for additional safety programs.',
  },

  // ── Driver Risk ───────────────────────────────────────────────
  'drivers.riskScore': {
    title: 'Driver Risk Score',
    explanation:
      'A 0-100 score measuring individual driver risk based on their safety event history. Higher = riskier.',
    methodology:
      'Weighted formula: Event Frequency (40%): events per 1,000 miles driven. Severity (25%): weighted avg of event severity (critical=4x, high=2x, moderate=1x). Pattern (20%): concentration of habitual behaviors. Trend (15%): improving vs. worsening trajectory. Tiers: low (0-25), moderate (26-50), high (51-75), critical (76-100).',
    actionable:
      'Focus coaching on critical and high-tier drivers first for the biggest fleet-wide safety improvement.',
  },
  'drivers.annualCostExposure': {
    title: 'Annual Cost Exposure',
    explanation:
      'The estimated annual financial risk this driver represents to the fleet, NOT an actual cost incurred. This is the statistically expected cost based on their risk tier.',
    methodology:
      'Cost exposure by tier: Low = $2,000/yr (minimal incidents), Moderate = $8,000/yr (occasional accidents), High = $25,000/yr (~1 major accident every 3-4 years), Critical = $65,000/yr (~1 major accident every 1-2 years). Based on actuarial data: avg accident cost $91K (FMCSA/NHTSA) x accident probability by tier.',
    actionable:
      'A critical driver at $65K exposure can be reduced to high ($25K) with targeted coaching, saving ~$40K in risk. This is potential cost avoidance, not a guaranteed savings.',
  },
};
