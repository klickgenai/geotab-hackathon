# Geotab Vibe Coding Competition - Reference Guide

> **IMPORTANT: Every agent/session MUST read this file before making changes.**
> This is the single source of truth for competition rules, requirements, and judging criteria.

## Timeline
- **Competition Window**: Feb 12 - Mar 2, 2026
- **Official Submission Deadline**: March 2, 2026, 11:59 PM EST
- **OUR DEADLINE: February 25, 2026** (owner traveling after this date)
- **Judging**: Mar 3 - 22, 2026
- **Winner Announcement**: Mar 23, 2026

### Our 7-Day Sprint (Feb 18-25)
- **Days 1-2 (Feb 18-19)**: Geotab API integration (MyGeotab + Ace), fix existing issues
- **Days 3-4 (Feb 20-21)**: Polish features, ensure everything works with live demo data
- **Days 5-6 (Feb 22-23)**: UX polish, testing, edge cases, demo prep
- **Day 7 (Feb 24-25)**: Record 3-min video, finalize repo, write story, submit

## Prize Pool ($25,000 Total)
| Prize | Amount | Criteria |
|-------|--------|----------|
| **The Vibe Master** | $10,000 | Best overall - Innovation, utility, execution |
| **The Innovator** | $5,000 | Exceptional technical creativity and AI use |
| **The Disruptor** | $2,500 | Most unique "outside-the-box" idea |
| **Best Use of Google Tools** | $2,500 | Best AI reasoning with Google Tools |
| **Green Award** | $2,500 | Best sustainability/EV optimization solution |
| **Most Collaborative** | $2,500 | Most active helping others on Reddit/GitHub |

**We are targeting: The Vibe Master ($10,000) - Best overall solution.**

## Submission Requirements (Due Mar 2, 2026)
1. **The Demo**: A 3-minute video showing the solution in action
2. **The Code**: Public GitHub repository (including prompts used)
3. **The Story**: Brief description of problem solved and "vibe coding" journey
4. **Submit at**: https://luma.com/h6ldbaxp

## Judging Criteria (6 Dimensions)
1. **Working Demo** - Does it function properly? Live, functional, not just mockups.
2. **Problem-Solution Fit** - Addresses genuine fleet-management needs?
3. **Dual-API Integration** - Uses BOTH `my.geotab.com` API AND Geotab Ace APIs?
4. **User Experience** - Intuitive and polished UI/UX?
5. **Innovation** - Unique approach or creative features?
6. **Vibe Factor** - Effective AI-assisted development demonstrated?

### CRITICAL: Dual-API Integration Requirement
Judges explicitly look for use of BOTH:
- **MyGeotab API** (`my.geotab.com`) - For vehicle data, trips, diagnostics, GPS, etc.
- **Geotab Ace** - Geotab's AI assistant API for conversational fleet queries

Our project MUST integrate both APIs, not just seed data.

## Our Path: Stand-Alone Platform
From the Geotab Vibe Guide's "Choose Your Path", we are building:
- **Path D (Advanced)** + **Stand-Alone Platform**: Separate website/dashboard that visualizes fleet data
- Our FleetShield AI is a standalone Next.js + Express platform with AI-powered analytics
- We connect to Geotab API for real fleet data and use Claude for AI intelligence

## Competition Context (From Orientation Webinar)

### What Judges Want to See
- **Be impressive** - Cool demos win. Innovation over production-readiness (per Felipe Hoffa)
- **Tell a story** - Why this matters, what problem it solves
- **Working prototype** - Must function with real/demo Geotab data
- **Production-readiness as tiebreaker** - Unit tests, error handling, scalability thinking
- **AI-assisted development** - Show the "vibe coding" journey and prompts used

### Demo Tips (From Hackathon Guide)
- Lead with problem statement
- Live demo using real Geotab demo data
- Highlight 2-3 key features
- Brief technical explanations
- Explain next-phase roadmap
- Keep under 3 minutes (submission) / 5 minutes (presentation)

### Common Pitfalls to AVOID
- Over-polishing UI at expense of functionality
- Over-engineering unnecessary features
- Presentation-only with no working code
- **Neglecting one required API** (MUST use both my.geotab.com + Ace)
- Ignoring demo-data constraints
- Not having a backup plan for live demo

### Success Strategies
- Master one problem thoroughly
- Use AI scaffolding; customize afterward
- Test with real Geotab demo data
- Prepare live-demo backup plan
- Demonstrate passion and tell the story

## Geotab Vibe Guide Resources
- **Main Repo**: https://github.com/fhoffa/geotab-vibe-guide
- **Key Files for AI**:
  - `AGENT_SUMMARY.md` - Repository orientation
  - `skills/README.md` - Skill pack selection
  - `VIBE_CODING_CONTEXT.md` - Minimal-token API reference
  - `skills/geotab/references/ACE_API.md` - Ace API integration guide
  - `skills/geotab/references/API_QUICKSTART.md` - MyGeotab API quickstart
- **Reddit Thread**: r/geotab (for Most Collaborative prize)
- **Demo Database**: Free at Geotab registration portal

## Geotab API Integration Notes
- Demo databases have live-simulated data: trips, engine diagnostics, fuel, safety events
- Use `.env` for credentials, never hardcode
- Test authentication once before loops (prevent account lockout)
- Demo database entities: vehicles, drivers, trips, zones, diagnostics, fault codes
- The app works in "seed data mode" without credentials, but MUST demonstrate real API use for submission

## FleetShield AI - Our Competitive Advantages
1. **Predictive Safety Analytics** - AI-powered incident prediction (not just historical data)
2. **Insurance Intelligence** - ROI calculator showing premium reduction potential
3. **Voice AI for Drivers** - Real-time conversational interface for drivers
4. **AI Alert Triage** - Intelligent prioritization of fleet alerts
5. **What-If Simulator** - Interactive scenario modeling for fleet managers
6. **Live Fleet Map** - Real-time GPS visualization
7. **Wellness Monitoring** - Driver fatigue and wellness tracking

## Integration Checklist (Pre-Submission)
- [ ] MyGeotab API connected with demo database credentials
- [ ] Geotab Ace API integrated for conversational fleet queries
- [ ] Live demo works with real Geotab demo data (not just seed)
- [ ] 3-minute demo video recorded
- [ ] Code in public GitHub repo
- [ ] Prompts/vibe coding journey documented
- [ ] Story/description written
- [ ] Submitted at luma.com deadline
