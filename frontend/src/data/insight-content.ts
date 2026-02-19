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
      'A visual gauge mapping the fleet-wide safety score to a letter grade from A+ (90-100) down to F (below 40).',
    methodology:
      'Grade boundaries: A+ >= 90, A >= 80, B >= 70, C >= 60, D >= 50, F < 50. The ring fill represents the numeric score.',
    actionable:
      'Aim for the A tier (80+) to unlock the best insurance premium discounts.',
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
      'The estimated change in your annual insurance premium based on the current safety score trajectory.',
    methodology:
      'Uses actuarial curves mapping safety scores to loss ratios. A 10-point score improvement typically yields a 3-5% premium decrease.',
    actionable:
      'Share this metric with your insurance broker during renewal negotiations to justify rate adjustments.',
  },
  'dashboard.annualSavings': {
    title: 'Annual Savings',
    explanation:
      'Projected yearly savings from safety score improvements including fewer claims and lower premiums.',
    methodology:
      'Calculated as (premium reduction from score improvement) + (avoided claim costs based on reduced event frequency).',
    actionable:
      'Use this figure in ROI conversations with leadership to justify continued safety investment.',
  },
  'dashboard.harshBraking': {
    title: 'Harsh Braking',
    explanation:
      'Measures sudden deceleration events per 1,000 miles driven. A leading indicator of tailgating and inattentive driving.',
    methodology:
      'Geotab accelerometer data flags decelerations exceeding -8.8 m/s\u00B2. Events are severity-weighted (light / moderate / severe).',
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
      'Engine-on + speed = 0 intervals are summed per trip. Fleet average is weighted by trip duration.',
    actionable:
      'Set idle-shutdown timers and educate drivers on the fuel and emissions cost of idling.',
  },
  'dashboard.wellnessScore': {
    title: 'Fleet Wellness Score',
    explanation:
      'A fleet-wide index (0-100) reflecting driver well-being based on fatigue signals, hours worked, and stress indicators.',
    methodology:
      'Combines hours-of-service utilization, rest-period regularity, late-night driving frequency, and trip-pattern volatility.',
    actionable:
      'Prioritize wellness check-ins for drivers below the fleet average to prevent burnout.',
  },
  'dashboard.retentionRisk': {
    title: 'Retention Risk',
    explanation:
      'The percentage of drivers showing burnout signals who are at risk of leaving within the next 90 days.',
    methodology:
      'Drivers with 2+ burnout indicators (excessive hours, irregular rest, declining performance) are flagged as at-risk.',
    actionable:
      'Engage at-risk drivers with schedule adjustments, recognition, or route preferences before they resign.',
  },
  'dashboard.burnoutSignals': {
    title: 'Burnout Signals',
    explanation:
      'Count of drivers currently exceeding fatigue or hours-driven thresholds that indicate potential burnout.',
    methodology:
      'Flags are raised when a driver exceeds 55 hours/week, has fewer than 10 hours between shifts, or shows a pattern of late-night driving.',
    actionable:
      'Review flagged drivers\' schedules immediately and redistribute workload where possible.',
  },
  'dashboard.financialSavings': {
    title: 'Financial Savings',
    explanation:
      'Total cost savings from all FleetShield interventions during the current reporting period.',
    methodology:
      'Sum of insurance premium reductions, avoided claims, fuel savings from reduced idling, and avoided turnover costs.',
    actionable:
      'Present this to stakeholders as the direct ROI of the FleetShield platform.',
  },
  'dashboard.claimsReduction': {
    title: 'Claims Reduction',
    explanation:
      'The reduction in insurance claims count compared to the pre-FleetShield baseline period.',
    methodology:
      'Compares the trailing 6-month claims count to the 6 months before FleetShield deployment, normalized for fleet size.',
    actionable:
      'Document this metric for your insurance carrier to support premium renegotiation.',
  },

  // ── Insurance ───────────────────────────────────────────────
  'insurance.overallScore': {
    title: 'Insurance Grade',
    explanation:
      'A composite insurance grade (A+ to F) combining four safety components into a single insurability metric.',
    methodology:
      'Weighted average of Safe Driving (35%), Compliance (25%), Maintenance (20%), and Driver Quality (20%) scores.',
    actionable:
      'Improve the lowest-weighted component first for the most efficient grade improvement.',
  },
  'insurance.percentile': {
    title: 'Insurance Percentile',
    explanation:
      'Your fleet\'s ranking among all insured fleets in the same size bracket.',
    methodology:
      'Benchmark data from industry loss-ratio databases, segmented by fleet size (small / medium / large).',
    actionable:
      'Crossing the 80th percentile threshold typically qualifies your fleet for preferred-tier pricing.',
  },
  'insurance.premiumEstimate': {
    title: 'Premium Estimate',
    explanation:
      'Estimated annual insurance premium based on your current safety profile and fleet composition.',
    methodology:
      'Uses base rate * fleet size * vehicle-class multiplier * safety-score discount/surcharge factor.',
    actionable:
      'Compare this estimate against your actual premium to identify negotiation opportunities.',
  },
  'insurance.harshBraking': {
    title: 'Harsh Braking (Insurance)',
    explanation:
      'Insurance component score for harsh braking events, weighted by severity level.',
    methodology:
      'Light events (<-8.8 m/s\u00B2) count 1x, moderate (<-11 m/s\u00B2) count 2x, severe (<-14 m/s\u00B2) count 4x. Normalized per 1K miles.',
    actionable:
      'Reducing severe events has 4x the impact on this score compared to light events.',
  },
  'insurance.speeding': {
    title: 'Speeding (Insurance)',
    explanation:
      'Insurance component measuring speeding as percentage of time over the limit, weighted by excess speed.',
    methodology:
      '1-10 mph over counts 1x, 10-20 mph over counts 2x, 20+ mph over counts 4x. Lower is better.',
    actionable:
      'Eliminating 20+ mph-over events will have the biggest impact on this component.',
  },
  'insurance.seatbelt': {
    title: 'Seatbelt (Insurance)',
    explanation:
      'Insurance component for seatbelt compliance across all monitored trips.',
    methodology:
      'Percentage of total driving seconds where the seatbelt was buckled. Industry target is 99%+.',
    actionable:
      'Even a few unbuckled trips can drop this score significantly. Enforce a strict seatbelt policy.',
  },
  'insurance.idleTime': {
    title: 'Idle Time (Insurance)',
    explanation:
      'Insurance component for excessive idling. High idle time indicates fatigue risk and increases exposure time on the road.',
    methodology:
      'Fleet average idle-to-drive ratio compared to industry benchmarks. Under 15% is good; over 25% is poor.',
    actionable:
      'Install automatic engine shutdown systems to enforce idle limits.',
  },
  'insurance.whatIf': {
    title: 'What-If Simulator',
    explanation:
      'Interactive simulator showing how changing one safety metric affects the overall insurance score and premium.',
    methodology:
      'Recalculates the weighted score formula in real time as you adjust individual component sliders.',
    actionable:
      'Use this tool to build a business case for targeted safety investments.',
  },

  // ── ROI ─────────────────────────────────────────────────────
  'roi.annualSavings': {
    title: 'Total Annual Savings',
    explanation:
      'Total projected yearly savings across all five savings categories: insurance, claims, fuel, retention, and compliance.',
    methodology:
      'Sum of individual savings categories, each calculated from before/after metric comparisons and industry cost benchmarks.',
    actionable:
      'Present this headline number to leadership alongside the ROI percentage for budget approval.',
  },
  'roi.roiPercent': {
    title: 'Return on Investment',
    explanation:
      'The return on your FleetShield investment: (total savings / platform cost) x 100.',
    methodology:
      'Annual platform cost includes subscription + implementation. Savings are projected from the trailing 90-day trend.',
    actionable:
      'An ROI above 300% is typical for well-adopted fleet safety platforms within the first year.',
  },
  'roi.paybackMonths': {
    title: 'Payback Period',
    explanation:
      'The number of months until your FleetShield investment is fully recovered from accumulated savings.',
    methodology:
      'Monthly savings rate divided into total implementation + subscription cost to date.',
    actionable:
      'Most fleets achieve payback within 4-6 months. Accelerate by prioritizing high-impact interventions.',
  },
  'roi.costPerDriver': {
    title: 'Cost per Driver',
    explanation:
      'The monthly FleetShield cost divided by the number of active drivers.',
    methodology:
      'Total monthly platform cost / active driver count. Includes all features and support.',
    actionable:
      'Compare this against the per-driver savings to demonstrate individual-level ROI.',
  },
  'roi.insuranceSavings': {
    title: 'Insurance Savings',
    explanation:
      'Annual savings from lower insurance premiums due to improved safety scores.',
    methodology:
      'Difference between estimated premium at original score vs. current score, annualized.',
    actionable:
      'Lock in savings by scheduling an insurance review when your score crosses a grade boundary.',
  },
  'roi.claimsSavings': {
    title: 'Claims Savings',
    explanation:
      'Savings from fewer accident claims calculated as frequency reduction times average claim cost.',
    methodology:
      'Claims frequency (per million miles) reduction x average cost per claim ($15K-$45K depending on severity).',
    actionable:
      'Even a 10% reduction in claims frequency can save tens of thousands annually.',
  },
  'roi.fuelSavings': {
    title: 'Fuel Savings',
    explanation:
      'Savings from reduced idling and speed optimization across the fleet.',
    methodology:
      'Idle-time reduction x fuel burn rate ($3.50/hr) + speed-optimization fuel efficiency gains.',
    actionable:
      'Idle reduction is the quickest fuel win. Each 1% idle reduction saves roughly $50/vehicle/year.',
  },
  'roi.retentionSavings': {
    title: 'Retention Savings',
    explanation:
      'Savings from lower driver turnover. Average replacement cost is $8,000 to $12,000 per driver.',
    methodology:
      'Avoided turnover count x average replacement cost (recruiting + training + productivity ramp-up).',
    actionable:
      'Retaining even 2-3 additional drivers per year can save $20K-$35K.',
  },
  'roi.complianceSavings': {
    title: 'Compliance Savings',
    explanation:
      'Avoided fines and penalties from maintaining HOS and FMCSA compliance.',
    methodology:
      'Historical violation rate reduction x average fine amount ($1,000-$16,000 per violation).',
    actionable:
      'Proactive HOS monitoring eliminates most compliance violations before they occur.',
  },
  'roi.beforeAfter': {
    title: 'Before / After Comparison',
    explanation:
      'Side-by-side comparison of key fleet metrics before and after FleetShield deployment.',
    methodology:
      'Compares the 90-day period before deployment to the most recent 90-day period, normalized for fleet size changes.',
    actionable:
      'Use this comparison in executive reports and insurance negotiations.',
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
      'Drivers flagged by the predictive model as having an elevated incident probability in the next 7 days.',
    methodology:
      'Machine-learning model trained on historical events, hours driven, rest patterns, weather, and route difficulty.',
    actionable:
      'Assign flagged drivers to lower-risk routes or schedule mandatory rest before their next shift.',
  },
  'predictive.forecastAccuracy': {
    title: 'Forecast Accuracy',
    explanation:
      'The historical accuracy of the predictive model, measured as the percentage of predictions that were confirmed by actual events.',
    methodology:
      'Backtested against 6 months of historical data. Accuracy = (true positives + true negatives) / total predictions.',
    actionable:
      'Accuracy improves over time as the model ingests more fleet-specific data.',
  },
  'predictive.riskTrend': {
    title: 'Risk Trend',
    explanation:
      'The fleet-wide risk trend direction over the last 14 days: increasing, stable, or decreasing.',
    methodology:
      'Compares the average daily risk score for the last 7 days vs. the prior 7 days.',
    actionable:
      'An increasing trend should trigger a fleet-wide safety stand-down or refresher training.',
  },
  'predictive.preShiftScore': {
    title: 'Pre-Shift Score',
    explanation:
      'An individual driver\'s risk score calculated before they start a shift. Scale: 0-100 where higher is safer.',
    methodology:
      'Factors in hours since last rest, cumulative hours this week, time of day, weather forecast, and recent event history.',
    actionable:
      'Drivers scoring below 60 should be reassigned or given additional rest before driving.',
  },
  'predictive.riskFactors': {
    title: 'Risk Factors',
    explanation:
      'The key variables driving a driver\'s current risk level: fatigue, hours, weather conditions, and route history.',
    methodology:
      'SHAP (SHapley Additive exPlanations) values from the ML model ranked by contribution magnitude.',
    actionable:
      'Address the top risk factor first for the most efficient risk reduction.',
  },

  // ── Wellness ────────────────────────────────────────────────
  'wellness.retentionCost': {
    title: 'Retention Cost at Risk',
    explanation:
      'Estimated annual cost if at-risk drivers leave, including replacement hiring, training, and productivity loss.',
    methodology:
      'Number of at-risk drivers x average replacement cost ($8K-$12K) + productivity ramp-up period cost.',
    actionable:
      'Proactive wellness interventions cost a fraction of replacement. Invest in retention programs.',
  },
  'wellness.burnoutSignals': {
    title: 'Burnout Signals',
    explanation:
      'Count of drivers currently showing 2 or more burnout indicators such as excessive hours, short rest periods, or pattern changes.',
    methodology:
      'Burnout indicators: >55 hrs/week, <10 hrs between shifts, >3 late-night shifts/week, declining safety scores.',
    actionable:
      'Schedule one-on-one check-ins with flagged drivers and adjust their routes or schedules.',
  },
  'wellness.fatigueScore': {
    title: 'Fatigue Score',
    explanation:
      'An individual driver fatigue metric based on hours driven, rest period quality, and time-of-day patterns.',
    methodology:
      'Combines cumulative drive time, time since last 8+ hour rest, and circadian rhythm alignment (2-4 AM driving penalized).',
    actionable:
      'Ensure drivers with low fatigue scores receive mandatory rest before their next assignment.',
  },
  'wellness.hoursCompliance': {
    title: 'HOS Compliance',
    explanation:
      'Percentage of drivers operating within Hours of Service (HOS) regulatory limits.',
    methodology:
      'Tracks 11-hour driving limit, 14-hour on-duty limit, and 60/70-hour weekly limit per FMCSA regulations.',
    actionable:
      'Automate HOS warnings at 80% of limit to give drivers time to find safe stopping points.',
  },
  'wellness.interventionSuccess': {
    title: 'Intervention Success Rate',
    explanation:
      'Percentage of wellness interventions (schedule changes, coaching, etc.) that resulted in improved driver metrics within 30 days.',
    methodology:
      'Tracks pre/post intervention safety scores, hours compliance, and fatigue metrics for each intervened driver.',
    actionable:
      'Analyze which intervention types have the highest success rates and standardize those approaches.',
  },

  // ── Alerts ──────────────────────────────────────────────────
  'alerts.urgencyScore': {
    title: 'Urgency Score',
    explanation:
      'AI-computed priority score from 1 (low) to 10 (critical) based on event severity, recency, and the driver\'s history.',
    methodology:
      'Weighted formula: severity (40%) + recency (30%) + driver history (20%) + environmental context (10%).',
    actionable:
      'Address alerts scoring 8+ within 1 hour. Alerts 5-7 should be reviewed same-day.',
  },
  'alerts.priorityLevel': {
    title: 'Priority Level',
    explanation:
      'Alert classification into Critical, High, Medium, or Low based on urgency score and potential impact.',
    methodology:
      'Critical: urgency 9-10, High: 7-8, Medium: 4-6, Low: 1-3. Adjusted by potential financial impact.',
    actionable:
      'Set up push notifications for Critical and High alerts to ensure immediate response.',
  },
  'alerts.category': {
    title: 'Alert Category',
    explanation:
      'Groups alerts by type: Safety Event, Maintenance, Compliance, or Wellness for organized triage.',
    methodology:
      'Auto-classified based on the source rule, diagnostic code, or wellness indicator that triggered the alert.',
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
      'Breaks down savings by category with before/after comparisons, methodology notes, and confidence intervals.',
    actionable:
      'Use this report to justify continued FleetShield investment and request budget for additional safety programs.',
  },
};
