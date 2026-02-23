# FleetShield AI - Scoring Methodology & Calculation Reference

This document provides full transparency on how every metric, score, and financial figure in FleetShield AI is calculated. All formulas are implemented as pure functions in `backend/src/scoring/` and can be audited directly in the source code.

---

## Table of Contents

1. [Insurance Score](#1-insurance-score)
2. [Driver Risk Score](#2-driver-risk-score)
3. [Annual Cost Exposure](#3-annual-cost-exposure)
4. [ROI & Financial Savings](#4-roi--financial-savings)
5. [What-If Simulator](#5-what-if-simulator)
6. [Wellness & Burnout Detection](#6-wellness--burnout-detection)
7. [Predictive Safety (Pre-Shift Risk)](#7-predictive-safety-pre-shift-risk)
8. [Alert Triage](#8-alert-triage)
9. [Green Score & Sustainability](#9-green-score--sustainability)
10. [Gamification](#10-gamification)
11. [Data Sources & Industry References](#11-data-sources--industry-references)

---

## 1. Insurance Score

**Source file:** `backend/src/scoring/insurance-score-engine.ts`

### Overall Score (0-100)

The fleet insurance score is a weighted composite of four independently scored components:

| Component | Weight | What It Measures |
|-----------|--------|-----------------|
| Safe Driving | 35% | Incident frequency, severity distribution, trends |
| Compliance | 25% | Seatbelt, speeding, HOS violations, driving hours |
| Maintenance | 20% | Vehicle age, fault codes, odometer, fleet condition |
| Driver Quality | 20% | Tenure, risk tier distribution, team size |

**Formula:**
```
overall_score = (safe_driving_score x 0.35)
              + (compliance_score x 0.25)
              + (maintenance_score x 0.20)
              + (driver_quality_score x 0.20)
```

### Grade Scale

| Grade | Score Range |
|-------|------------|
| A+ | 95-100 |
| A | 90-94 |
| B+ | 85-89 |
| B | 75-84 |
| C+ | 70-74 |
| C | 60-69 |
| D | 50-59 |
| F | Below 50 |

### Premium Impact Formula

```
benchmark_premium = fleet_size x $14,200/vehicle/year
savings = (score - 50) x 0.003 x benchmark_premium
```

- **$14,200** = industry average annual premium for Class 8 commercial vehicles
- **0.3% per point** = standard underwriting sensitivity (each score point above 50 saves 0.3% of the benchmark premium)

**Worked example:** Score 72, 25 vehicles
```
benchmark = 25 x $14,200 = $355,000
savings = (72 - 50) x 0.003 x $355,000 = 22 x $1,065 = $23,430/year
```

### Component: Safe Driving (35% weight)

Scored from 4 sub-factors:

| Sub-factor | Thresholds |
|-----------|-----------|
| Event Rate (per 1K miles) | Good: <5, Warning: 5-15, Critical: >15 (industry avg ~12) |
| Total Events (30 days) | Good: <30, Warning: 30-60, Critical: >60 |
| Severity Mix | Good: mostly minor, Warning: some serious, Critical: many severe |
| 30-Day Trend | Good: 3+ fewer events, Warning: -2 to +2, Critical: 3+ more events |

### Component: Compliance (25% weight)

| Sub-factor | Thresholds |
|-----------|-----------|
| Seatbelt Violations | Good: 0, Warning: 1-5, Critical: >5 |
| Speeding Events (30d) | Good: <=5, Warning: 6-15, Critical: >15 |
| HOS Violations | Good: 0, Warning: 1-3, Critical: >3 |
| Avg Daily Driving Hours | Good: <9h, Warning: 9-11h, Critical: >11h |

### Component: Maintenance (20% weight)

| Sub-factor | Thresholds |
|-----------|-----------|
| Fleet Age (avg years) | Good: <3, Warning: 3-5, Critical: >5 |
| Active Fault Codes | Good: <=2, Warning: 3-5, Critical: >5 |
| Faults per Vehicle | Good: <2, Warning: 2-5, Critical: >5 |
| Avg Odometer | Good: <200K km, Warning: 200-400K, Critical: >400K |

### Component: Driver Quality (20% weight)

| Sub-factor | Thresholds |
|-----------|-----------|
| Avg Tenure (years) | Good: >=5, Warning: 2-5, Critical: <2 |
| % Low-Risk Drivers | Good: >=60%, Warning: 40-60%, Critical: <40% |
| % High/Critical Risk | Good: <=10%, Warning: 10-20%, Critical: >20% |

---

## 2. Driver Risk Score

**Source file:** `backend/src/scoring/driver-risk-engine.ts`

### Score (0-100, higher = riskier)

```
risk_score = (frequency_score x 0.40)
           + (severity_score x 0.25)
           + (pattern_score x 0.20)
           + (trend_score x 0.15)
```

| Factor | Weight | What It Measures |
|--------|--------|-----------------|
| Event Frequency | 40% | Safety events per 1,000 miles driven |
| Severity | 25% | Weighted average of event severity (critical=4x, high=2x, moderate=1x) |
| Pattern | 20% | Concentration of habitual behaviors (e.g., always speeding vs varied events) |
| Trend | 15% | Improving vs. worsening trajectory (last 30 days vs prior 30 days) |

### Risk Tiers

| Tier | Score Range | Meaning |
|------|------------|---------|
| Low | 0-25 | Minimal risk, safe driving patterns |
| Moderate | 26-50 | Occasional events, needs monitoring |
| High | 51-75 | Frequent events, coaching required |
| Critical | 76-100 | Constant high-severity events, immediate intervention needed |

---

## 3. Annual Cost Exposure

**Source file:** `backend/src/scoring/driver-risk-engine.ts` (lines 109-110)

**Important:** This is the estimated annual financial *risk* a driver represents -- NOT an actual cost incurred. It is the statistically expected liability from accidents, insurance impact, and operational disruption, based on the driver's risk tier.

| Tier | Annual Cost Exposure | Rationale |
|------|---------------------|-----------|
| Low | $2,000 | Minimal incidents; baseline minor events + minor insurance impact |
| Moderate | $8,000 | ~2-3 events/year, mixed severity; occasional accident risk + elevated insurance |
| High | $25,000 | ~10-15 events/year; ~1 major accident every 3-4 years expected |
| Critical | $65,000 | ~25+ events/year; ~1 major accident every 1-2 years expected |

**Basis:** Average accident cost is $91,000 (FMCSA/NHTSA). A critical-tier driver's accident probability over a year justifies ~$65K in expected cost exposure. This includes vehicle damage, medical, liability, insurance surcharge, and operational downtime.

**How coaching reduces exposure:** Moving a critical driver ($65K) to high ($25K) through targeted coaching saves ~$40K in annual risk exposure. This is *potential* cost avoidance, not a guaranteed savings.

---

## 4. ROI & Financial Savings

**Source file:** `backend/src/scoring/roi-engine.ts`

### Total Annual Savings

Sum of 5 independent categories:

### 4a. Insurance Premium Savings

```
savings = (insurance_score - 50) x 0.003 x (fleet_size x $14,200)
```

See [Section 1](#1-insurance-score) for full details.

### 4b. Accident Prevention Savings

```
high_severity_reduction = high_events_first_45_days - high_events_last_45_days
annualized_reduction = high_severity_reduction x (365 / 45)
prevented_accidents = MIN(annualized_reduction / 200, fleet_size x 0.08)
savings = prevented_accidents x $91,000
```

- **1-in-200 ratio:** FMCSA data shows ~0.5% of telematics high-severity events result in reportable crashes
- **$91,000:** Average commercial vehicle accident cost (FMCSA/NHTSA), includes vehicle repair, medical, liability, downtime
- **Cap:** Maximum prevented accidents capped at 8% of fleet size (conservative limit)

**Worked example:** 25-vehicle fleet
```
50 high-severity events in first 45 days, 40 in last 45 days
Reduction: 10 events
Annualized: 10 x (365/45) = 81 events/year
Prevented accidents: 81 / 200 = 0.4
Savings: 0.4 x $91,000 = $36,400/year
```

### 4c. Fuel Savings (Idle Reduction)

```
gallons_saved = fleet_size x 365 x 0.8 x (current_idle% - target_idle%) / 100
savings = gallons_saved x $3.85
```

| Constant | Value | Source |
|----------|-------|--------|
| Idle fuel burn | 0.8 gal/hr | OEM specification (Class 8 diesel) |
| Diesel price | $3.85/gal | EIA average |
| Current idle | ~13.1% | Fleet telematics data |
| Target idle | 8% | Industry best practice (with APU + training) |

**Worked example:** 25 vehicles
```
gallons = 25 x 365 x 0.8 x (13.1 - 8) / 100 = 3,717 gal/year
savings = 3,717 x $3.85 = $14,310/year
```

### 4d. Driver Retention Savings

```
total_at_risk_cost = SUM(burnout_probability x $35,000) for each at-risk driver
savings = total_at_risk_cost x 0.65
```

| Constant | Value | Source |
|----------|-------|--------|
| Replacement cost | $35,000/driver | ATA (recruiting $3-5K, CDL training $8-12K, onboarding, 6-month productivity ramp-up $15-25K) |
| Intervention success | 65% | DOT/FMCSA wellness program studies (range: 60-75%) |

**Worked example:** 5 at-risk drivers, avg 70% burnout probability
```
at_risk_cost = 5 x ($35,000 x 0.70) = 5 x $24,500 = $122,500
savings = $122,500 x 0.65 = $79,625/year
```

### 4e. Productivity Gains

```
savings = prevented_events x $150/event (capped at $50,000/year)
```

- **$150/event:** Estimated operational disruption cost per safety event (investigation time, paperwork, vehicle inspection, scheduling disruption)
- **$50K cap:** Conservative limit to avoid overestimation

### ROI Percentage

```
investment_cost = fleet_size x ($45 platform + $35 support) x 12 months
roi_percent = ((total_annual_savings - investment_cost) / investment_cost) x 100
```

### Payback Period

```
payback_months = (investment_cost / total_annual_savings) x 12
```

### 3-Year Projection

```
year_1 = total_annual_savings - investment_cost
year_2 = (total_annual_savings x 1.08) - investment_cost
year_3 = (total_annual_savings x 1.08^2) - investment_cost
three_year_value = year_1 + year_2 + year_3
```

- **8% annual compounding:** Reflects sustained improvement from ongoing safety programs

---

## 5. What-If Simulator

**Source file:** `backend/src/scoring/what-if-simulator.ts`

The simulator models how specific safety interventions translate to insurance score improvements and premium savings.

### Score Boost Formulas

Each intervention type has a formula that converts the % reduction/improvement into insurance score points:

| Intervention | Formula | Max Boost |
|-------------|---------|-----------|
| Harsh Braking Reduction | (reduction% / 100) x 0.35 x 15 | 5.25 pts |
| Speeding Reduction | (reduction% / 100) x 0.25 x 18 | 4.50 pts |
| Idling Reduction | (reduction% / 100) x 0.20 x 8 | 1.60 pts |
| Night Driving Reduction | (reduction% / 100) x 0.35 x 6 | 2.10 pts |
| Compliance Improvement | (improvement% / 100) x 0.25 x 20 | 5.00 pts |
| Maintenance Boost | (boost% / 100) x 0.20 x 20 | 4.00 pts |

The multipliers (15, 18, 8, 6, 20, 20) represent the maximum impact points each behavior can contribute to the overall score, scaled by the component weight.

### Converting Score Boost to Dollar Savings

```
annual_savings = score_boost x 0.003 x (fleet_size x $14,200)
```

**Worked example:** 30% speeding reduction, 25 vehicles
```
score_boost = (30/100) x 0.25 x 18 = 1.35 points
savings = 1.35 x 0.003 x (25 x $14,200) = 1.35 x $1,065 = $1,438/year
```

### Pre-Built Scenarios

| Scenario | Key Adjustments | Difficulty |
|----------|----------------|-----------|
| Harsh Braking Coaching | 25% braking reduction | Easy |
| Speed Compliance Program | 30% speeding reduction, 10% compliance | Moderate |
| Anti-Idle Campaign | 40% idle reduction | Easy |
| Night Driving Policy | 35% night driving reduction | Hard |
| Full Safety Package | All of the above combined | Hard |

---

## 6. Wellness & Burnout Detection

**Source file:** `backend/src/scoring/wellness-predictor.ts`

### 6 Burnout Signals

Each signal is classified as **normal**, **warning**, or **critical** based on telematics data:

| Signal | What It Detects | Warning Threshold | Critical Threshold |
|--------|----------------|-------------------|-------------------|
| Shift Irregularity | Schedule variance (std dev of shift start times) | Moderate variance | High variance |
| Consecutive Long Days | Days with >10 hours of driving | 3-4 consecutive days | 5+ consecutive days |
| Rest Compression | Shrinking rest periods between shifts | Rest declining trend | Rest below 8 hours consistently |
| Harsh Event Escalation | Week-over-week increase in safety events | 20%+ increase | 50%+ increase |
| Night Driving Creep | Increasing proportion of night hours | Upward trend | Significant increase |
| Excessive Daily Hours | % of days exceeding 11 hours driving | 20-40% of days | >40% of days |

### Burnout Probability

```
burnout_probability = (critical_signal_count x 0.22) + (warning_signal_count x 0.12) + 0.03
```

- Each **critical** signal adds 22% to burnout probability
- Each **warning** signal adds 12%
- Baseline of 3% for all drivers
- Capped at 95%

**Worked example:** Driver with 3 critical + 2 warning signals
```
probability = (3 x 0.22) + (2 x 0.12) + 0.03 = 0.66 + 0.24 + 0.03 = 0.93 (93%)
```

### Burnout Risk Tiers

| Risk Level | Burnout Probability |
|-----------|-------------------|
| Low | Below 30% |
| Moderate | 30-60% |
| High | Above 60% |

### Retention Cost

```
per_driver_retention_cost = $35,000 x burnout_probability
total_retention_cost_at_risk = SUM of all drivers' retention costs
projected_savings = total_retention_cost_at_risk x 0.65 (intervention success rate)
```

### Wellness Score (0-100)

Inversely proportional to burnout signals. A driver with 0 signals scores near 100; scores decrease as critical and warning signals accumulate.

---

## 7. Predictive Safety (Pre-Shift Risk)

**Source file:** `backend/src/scoring/predictive-safety.ts`

### Pre-Shift Risk Score (0-100, higher = riskier)

Calculated before each shift to flag at-risk drivers:

```
pre_shift_score = fatigue_factor + behavior_trend + recent_severity + workload_factor
```

| Factor | Point Range | What It Measures |
|--------|------------|-----------------|
| Fatigue | 0-30 | Hours since last rest, consecutive long days, night driving pattern |
| Behavior Trend | 0-25 | Recent 7-day event rate compared to 30-day baseline |
| Recent Severity | 0-25 | Critical/high events in last 48 hours and 7 days |
| Workload | 0-20 | Average hours and distance per day |

### Risk Levels

| Level | Score Range | Recommended Action |
|-------|------------|-------------------|
| Low | 0-25 | Clear to drive |
| Elevated | 26-50 | Monitor during shift |
| High | 51-75 | Consider reassignment or additional rest |
| Critical | 76-100 | Do not dispatch without intervention |

### Deterioration Detection

Week-over-week comparison of event rates per driver. Flags drivers whose event frequency is increasing, indicating worsening performance that may lead to an incident.

### Dangerous Zone Detection

Geographic clustering of safety events using grid-based analysis. Identifies the top 10 locations where events concentrate, helping fleet managers add route-specific warnings.

---

## 8. Alert Triage

**Source file:** `backend/src/scoring/alert-triage.ts`

### Urgency Score (0-100)

```
urgency = base_severity + repeat_offender_bonus + recency_bonus + pattern_bonus
```

| Component | Description |
|-----------|-------------|
| Base Severity | From event severity level (critical=80, high=60, moderate=40, low=20) |
| Repeat Offender | +15 if driver has 3+ similar events in 7 days |
| Recency | +10 if event occurred within last 2 hours |
| Pattern | +10 if event clusters with other types in a 2-hour window |

### Priority Classification

| Priority | Score Range | Response Time |
|----------|------------|--------------|
| Critical | 75-100 | Within 1 hour |
| High | 50-74 | Same day |
| Medium | 25-49 | Weekly review |
| Low | 0-24 | Informational |

### Alert Categories

- **Behavioral:** Harsh braking, speeding, aggressive driving patterns
- **Mechanical:** Fault codes, maintenance-related warnings
- **Compliance:** HOS violations, seatbelt issues
- **Pattern:** Clustered recurring events indicating systemic issues

### Processing Pipeline

1. **Cluster** events by (driverId + eventType + 2-hour window)
2. **Score** urgency using the formula above
3. **Categorize** into mechanical/compliance/behavioral/pattern
4. **Generate** specific coaching recommendations per alert

---

## 9. Green Score & Sustainability

**Source file:** `backend/src/scoring/green-score-engine.ts`

### Fleet Green Score (0-100)

```
green_score = (fuel_efficiency x 0.30)
            + (idle_reduction x 0.25)
            + (eco_driving x 0.25)
            + (fleet_modernity x 0.20)
```

| Component | Weight | What It Measures |
|-----------|--------|-----------------|
| Fuel Efficiency | 30% | Average fuel consumption vs class benchmarks |
| Idle Reduction | 25% | Fleet idle percentage vs 8% target |
| Eco Driving | 25% | Harsh events, smooth driving patterns |
| Fleet Modernity | 20% | Vehicle age, emissions standards compliance |

### Carbon Footprint

```
co2_kg = total_fuel_liters x 2.31 kg CO2/liter (diesel combustion factor)
co2_tons = co2_kg / 1000
```

### Idle Waste

```
fuel_wasted_liters = total_idle_hours x 3.8 liters/hour
cost_wasted = fuel_wasted_liters x $1.65/liter (converted diesel cost)
```

### EV Readiness

Evaluates each vehicle for electric transition based on:
- Daily route distance vs EV range
- Depot charging feasibility
- Vehicle age and replacement timeline
- Projected fuel + maintenance savings from EV transition

---

## 10. Gamification

**Source file:** `backend/src/scoring/gamification-engine.ts`

### Points System

| Action | Points |
|--------|--------|
| Safe driving day (no events) | +10 |
| Safe trip completed | +5 |
| Moderate safety event | -5 |
| High-severity event | -15 |
| Critical event | -30 |
| Daily challenge completed | +25 |
| Badge earned | +50 |

### Streak Multiplier

| Streak Length | Multiplier |
|--------------|-----------|
| 0-6 days | 1.0x |
| 7-13 days | 1.5x |
| 14-29 days | 2.0x |
| 30+ days | 3.0x |

### Level System

| Level | Name | Points Required |
|-------|------|----------------|
| 1 | Rookie | 0 |
| 2 | Apprentice | 500 |
| 3 | Professional | 1,500 |
| 4 | Expert | 3,000 |
| 5 | Master | 5,000 |
| 6 | Champion | 7,500 |
| 7 | Legend | 10,000 |

### 13 Achievement Badges

Earned for milestones like "First Safe Day", "7-Day Streak", "30-Day Streak", "Speed Compliant", "Eco Driver", etc.

---

## 11. Data Sources & Industry References

All financial constants and thresholds used in FleetShield AI are sourced from publicly available industry data:

| Constant | Value | Source |
|----------|-------|--------|
| Average accident cost | $91,000 | FMCSA/NHTSA commercial vehicle crash cost data |
| Insurance benchmark premium | $14,200/vehicle/year | Class 8 commercial vehicle insurance industry average |
| Premium sensitivity | 0.3% per score point | Standard actuarial underwriting practice |
| Driver replacement cost | $35,000 | American Trucking Associations (ATA) |
| Intervention success rate | 65% | DOT/FMCSA wellness program studies (range: 60-75%) |
| Event-to-accident ratio | 1 in 200 (0.5%) | FMCSA telematics-to-crash correlation data |
| Idle fuel burn rate | 0.8 gal/hr | OEM Class 8 diesel engine specification |
| Diesel fuel price | $3.85/gal | EIA (Energy Information Administration) average |
| CO2 per liter diesel | 2.31 kg | EPA emissions factor |
| Industry event rate avg | ~12 per 1K miles | Geotab fleet benchmark data |
| Burnout signal weights | 22% critical / 12% warning | ATRI/ATA driver turnover studies |

### Important Disclaimers

- **Cost exposure is not actual cost.** The "Annual Cost Exposure" per driver is a statistical risk estimate, not money spent. A critical-tier driver may cost $0 in a given year if no accident occurs, or $500K+ if a serious accident happens. The $65K figure is the probability-weighted expected value.
- **Savings are potential, not guaranteed.** ROI figures represent cost avoidance -- money that would likely have been spent on accidents, turnover, and inefficiency without intervention. Actual results depend on driver compliance, intervention quality, and environmental factors.
- **Benchmarks are industry averages.** Your actual insurance premiums, fuel costs, and replacement costs may differ from the benchmarks used. The methodology is designed to be directionally accurate for fleet-level decision making.
- **All scoring engines are auditable.** Every formula is implemented as a pure function in `backend/src/scoring/` with no hidden logic. The source code is the authoritative reference.

---

## Source Code Reference

| Scoring Engine | File | Key Function |
|---------------|------|-------------|
| Insurance Score | `backend/src/scoring/insurance-score-engine.ts` | `calculateInsuranceScore()` |
| Driver Risk | `backend/src/scoring/driver-risk-engine.ts` | `calculateDriverRisk()` |
| ROI | `backend/src/scoring/roi-engine.ts` | `calculateFleetROI()` |
| What-If Simulator | `backend/src/scoring/what-if-simulator.ts` | `simulateWhatIf()` |
| Wellness/Burnout | `backend/src/scoring/wellness-predictor.ts` | `calculateWellness()` |
| Predictive Safety | `backend/src/scoring/predictive-safety.ts` | `calculatePreShiftRisk()` |
| Alert Triage | `backend/src/scoring/alert-triage.ts` | `triageAlerts()` |
| Green Score | `backend/src/scoring/green-score-engine.ts` | `calculateGreenScore()` |
| Gamification | `backend/src/scoring/gamification-engine.ts` | `calculateGamification()` |
