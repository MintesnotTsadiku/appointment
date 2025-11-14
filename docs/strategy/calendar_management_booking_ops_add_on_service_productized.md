# Calendar Management & Booking Ops — Add‑On Service (Productized)

## 1) Definition
A switchable, productized add‑on that supplies trained assistants (in‑house or vetted freelancers) to operate a customer’s scheduling end‑to‑end: triage inbound (DMs/WhatsApp/calls/email), create/edit bookings with deposits and policies, maintain availability, fill gaps, and deliver weekly revenue/utilization reports. Offered on **Fixed**, **Rev‑Share**, or **Hybrid** pricing.

## 2) Outcomes & Value
- **Attendance up** (fewer no‑shows via deposits + reminders)
- **Utilization up** (fewer empty gaps; smarter day shaping)
- **Admin down** (provider spends near‑zero time scheduling)
- **Revenue up** (gap filling + prepaid bookings)

## 3) Packaging & Pricing (ETB examples)
### Tier A — Lite (Fixed)
- Scope: DM/WhatsApp triage + book on behalf (business hours)
- SLA: first response ≤30 min
- Price: ETB 5,000–9,000 / month / provider
- Add‑ons: after‑hours (+ETB 3,000), extra channels (+ETB 1,500)

### Tier B — Pro (Hybrid)
- Scope: Lite + gap‑filling, waitlists, refunds within policy, weekly report
- SLA: first response ≤15 min; completion ≤30 min
- Price: ETB 3,000 base + **8–12%** of **attended** booking revenue (cap ETB 25k)

### Tier C — Enterprise Front‑Desk (Fixed)
- Multi‑provider/location desks (clinics, salons)
- Dedicated queue mgmt, rotas, escalation matrix
- Price: ETB 15,000–45,000 / location (volume discounts)

### One‑time Onboarding
- Service catalog setup, policies, templates, training: ETB 3,000–10,000

## 4) Ideal Customers
- Creators/coaches with heavy DMs and poor conversion
- Clinics/salons with high no‑shows/front‑desk gaps
- Executives/consultants with context switching
- Multi‑location providers needing centralized coordination

## 5) Operating Model
**Roles**: Ops Lead (QA/escalations/reporting), Assistants (daily triage + booking), Tech Liaison (templates/automation/analytics).  
**Coverage**: 09:00–18:00 (Africa/Addis_Ababa) with optional evenings/weekends.  
**Channels**: WhatsApp Business, Instagram DMs, phone, email, web forms.  
**Guardrails**: least‑privilege `Assistant` role; audited actions; no pricing/refunds above threshold without approval.

## 6) SOPs (Condensed)
**A. Triage** — classify inbound: New / Reschedule / Cancel / Question. Use canned replies (Am/En) with link shortcodes. Apply policy checks for reschedule/cancel.

**B. Booking** — quote price + deposit %, send pay link, wait for webhook, flip to **Confirmed**, notify parties.

**C. Gap‑Filling** — morning pass to bring forward; last‑minute openings ping waitlist via SMS; first‑come, first‑served.

**D. No‑Shows** — mark, apply fee per policy, reoffer slot.

**E. Reporting** — weekly: revenue, attendance %, utilization %, refunds/disputes, channel breakdown.

## 7) SLAs & KPIs
**SLAs**: first response ≤15–30 min (tier); booking completion ≤30 min; disputes acknowledged ≤1 business day.  
**KPIs**: attendance rate, utilization %, deposit collection %, lead→booking conversion, time‑to‑book, refund/dispute %, revenue lift vs baseline.

## 8) Workforce Supply (How We Provide Assistants)
**Sourcing**: bilingual (Am/En) VA talent; call‑center/admin alumni preferred.  
**Assessment**: inbox triage simulation, empathy, accuracy.  
**Training**: 2–3 day bootcamp (platform, payments, tone), shadow week, QA rubrics.  
**Scheduling**: staffed rotas with overlap; escalation tree; Slack/Telegram war‑room.

**Compensation**: base + performance bonus tied to attendance/utilization improvements.

## 9) Tooling & Product Hooks
- WhatsApp Business API (or shared sessions initially), reply snippets library, call logging.
- Dashboards: attendance/utilization/revenue per client; assistant activity feed.
- **In‑Product Hooks**:
  - Roles: `Assistant`, `Ops Lead` + permission matrix
  - Doctypes: `RevShareAgreement`, `BookingOpsAssignment`
  - Front‑Desk **Ops Mode**: quick actions, waitlist panel, templates drawer
  - Weekly Ops Report: JSON + CSV export; one‑click send

## 10) Contracts & Policy Snippets
- **SOW**: scope, channels, hours, SLAs, policy enforcement rules
- **Rev‑Share**: % of **attended** revenue, monthly cap, exclusions (tips/products), audit rights
- **Data Processing**: confidentiality, least‑privilege, audit retention
- **Refunds/Disputes**: evidence workflow (DLRs, timestamps, PSP refs)
- **Termination**: 30‑day notice; handover of templates & exports

## 11) Risks & Mitigations
- Brand tone drift → approved message library + QA sampling
- Chargebacks → deposit default, clear policy pre‑payment, timestamped comms
- Over‑reliance on humans → automate nudges, waitlist rules, smart gap suggestions
- Margin squeeze → sane caseloads (e.g., 2–4 creators or 1 clinic/3 chairs per assistant), rev‑share caps

## 12) Sales & Onboarding Flow
1) Diagnose (15 min): demand size, no‑show %, price, deposit willingness  
2) Policy design: deposit %, cancel windows, late‑cancel fee  
3) Pilot (30–45 days): weekly reports, mid‑point tuning  
4) Scale or switch plan (Lite ↔ Pro; add after‑hours)

## 13) Landing Page Block (Copy Snippet)
**Too busy to manage it? We’ll do it for you.**  
- Pro assistants book on your behalf  
- More attended bookings, fewer gaps  
- Flexible pricing: fixed or rev‑share  
**CTA:** Apply for Managed Calendar

## 14) Implementation Hooks — To Add in Main Implementation Plan
**Backend**
- Add Roles: `Assistant`, `Ops Lead` with permissions
- New Doctypes: `RevShareAgreement` (client, tier, cap, period, signature), `BookingOpsAssignment` (client↔assistant, hours, notes)
- Extend `AuditEvent` with `impersonation_context`
- Scheduled job: `ops.weekly_report.generate` (JSON+CSV) and mailer

**Frontend**
- Front‑desk **Ops Mode** UI (templates drawer, waitlist, quick actions)
- Booking link composer: “Copy DM reply” preset
- Client detail panel: policy banner (deposit %, cancel rules), assistant notes
- Reports page: weekly ops KPIs + CSV download

**Acceptance Criteria**
- Assistants can end‑to‑end book with deposit capture; every action logged
- Weekly report downloadable; aggregates match DB within 1%
- Permissions block access to protected notes for assistants

## 15) Pilot Success Targets
- Attendance +20–30%
- Utilization +15–25%
- Net revenue +20% vs baseline

## 16) Timeline to Launch
- Week 1: finalize packages, contracts, training; enable roles & minimal Ops Mode
- Week 2–6: run 3 pilots (2 creators, 1 salon/clinic); weekly QA + reports
- Week 7: publish case studies; open general availability

