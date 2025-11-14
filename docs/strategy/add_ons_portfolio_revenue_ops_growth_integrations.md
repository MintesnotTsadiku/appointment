# Add‑Ons Portfolio — Revenue, Ops, Growth & Integrations

## 0) Purpose
A menu of productized add‑ons that layer on top of core scheduling + payments. Each entry includes **Who it’s for**, **Value**, **Packaging**, **Key hooks (tech)**, and **Success metrics**. Use this to prioritize roadmap and commercial bundles.

---

## A) Revenue Accelerators

### 1) No‑Show Protection (Deposit & Fee Automation+)
**For**: Clinics, salons, coaches  
**Value**: Auto deposits + late‑cancel fees reduce no‑shows and protect revenue  
**Packaging**: Pro feature; optional % platform fee on fees collected  
**Hooks**: Policy engine (deposit %, fee rules), PSP auto‑charge/refund  
**Metrics**: No‑show rate ↓, deposit adoption %, fee recovery ETB/month

### 2) Yield/Smart Pricing
**For**: Creators, clinics with peak hours  
**Value**: Higher price on peak; discounts off‑peak; fill gaps  
**Packaging**: % of uplift or flat monthly  
**Hooks**: `PricingRule` doctype; slot scoring; A/B test flags  
**Metrics**: Rev/available‑hour ↑; off‑peak utilization ↑

### 3) Waitlist & Gap Filler
**For**: All with variable demand  
**Value**: Auto‑notify waitlist (SMS/WhatsApp) when slots open; move‑up offers  
**Packaging**: Add‑on; pay‑per‑filled slot  
**Hooks**: Event triggers, “move forward” logic, templates  
**Metrics**: Fill‑rate %, incremental ETB from backfilled gaps

### 4) Group Sessions & Workshops
**For**: Coaches, creators, clinics (classes/screenings)  
**Value**: 1‑to‑many events; higher revenue per slot  
**Packaging**: Per‑event fee  
**Hooks**: Capacity >1, ticketing, attendee list, QR check‑in  
**Metrics**: Seats sold %, revenue per event

### 5) Memberships / Packages / Subscriptions
**For**: Salons/gyms/coaches  
**Value**: Prepaid packages and monthly memberships for predictable cashflow  
**Packaging**: Add‑on; % on renewals  
**Hooks**: Entitlement ledger, auto‑renew, invoices  
**Metrics**: MRR, churn %, utilization of entitlements

---

## B) Ops Efficiency & Compliance

### 6) Digital Intake & E‑Consents
**For**: Clinics, advisors  
**Value**: Collect forms before arrival; faster check‑in; versioned consents  
**Packaging**: Per‑provider monthly; per‑form overage  
**Hooks**: Form builder, `ConsentRecord`, file attachments  
**Metrics**: Avg check‑in time ↓, % completed pre‑arrival

### 7) Two‑Way WhatsApp/Telegram Booking Bot
**For**: DM‑heavy segments  
**Value**: Book/reschedule/cancel + pay links inside chat  
**Packaging**: Per‑conversation or per‑booking fee  
**Hooks**: Bot gateway, booking API, quick replies  
**Metrics**: Bot booking %, human handoff rate ↓

### 8) Missed‑Call → Booking (IVR/Callback)
**For**: Phone‑centric clinics/salons  
**Value**: Auto‑SMS booking link after a missed call; optional callback queue  
**Packaging**: Add‑on; per‑SMS + small monthly  
**Hooks**: Telephony webhook → SMS send → status tracking  
**Metrics**: Missed‑call conversion %, CPL

### 9) Queue/Kiosk Mode (Walk‑in Management)
**For**: Salons/clinics  
**Value**: On‑site kiosk/tablet; take ticket; ETA; SMS alerts  
**Packaging**: Per‑location monthly; optional hardware bundle  
**Hooks**: Walk‑in queue doctype, display board  
**Metrics**: Wait time accuracy, walk‑in satisfaction

### 10) Role‑Based Notes & Secure Attachments
**For**: Clinics/advisors  
**Value**: Private notes + documents with access controls & audit  
**Packaging**: Pro feature  
**Hooks**: Permissioned child tables; file vault; audit trail  
**Metrics**: Access violations = 0; audit completeness

---

## C) Growth & Marketing

### 11) Review & Reputation Engine
**For**: All verticals  
**Value**: Post‑visit rating prompts; testimonials to hosted profile  
**Packaging**: Add‑on; per‑location monthly  
**Hooks**: Post‑appointment triggers; review store; embeddable widget  
**Metrics**: Review rate %, avg rating, profile CTR

### 12) Promo Codes & Affiliate Links
**For**: Creators/coaches/salons  
**Value**: Track influencer promos; limited‑time discounts  
**Packaging**: Pro; optional % on redemptions  
**Hooks**: Coupon/affiliate tables; attribution params  
**Metrics**: Redemptions, revenue attributed

### 13) Simple CRM & Nurture
**For**: SMB services  
**Value**: Tag clients, drips (win‑back, “time for next visit”)  
**Packaging**: Contacts/month tiers  
**Hooks**: Segments, campaigns, scheduler  
**Metrics**: Repeat bookings %, LTV

### 14) Mini Marketplace Profile
**For**: Discovery‑seeking providers  
**Value**: Optional directory listing; category tags; city search  
**Packaging**: Free listing + paid featured  
**Hooks**: Public profiles; search; moderation  
**Metrics**: Profile views → bookings, featured CTR

---

## D) Financial Services

### 15) Instant & Split Payouts
**For**: Teams/clinics  
**Value**: Faster settlement; auto split provider vs house share  
**Packaging**: % payout fee; enterprise  
**Hooks**: Payout ledger; PSP settlement mapping  
**Metrics**: Payout latency ↓; reconciliation accuracy

### 16) No‑Show Insurance / Refund Protection (Partner)
**For**: Clinics/salons/coaches  
**Value**: Cover last‑minute cancellations; stabilize revenue  
**Packaging**: Pass‑through premium + small platform fee  
**Hooks**: Policy toggle; claim workflow  
**Metrics**: Claims paid, provider NPS

### 17) BNPL / Pay‑in‑2 (Partner)
**For**: High‑ticket services  
**Value**: Higher conversion for expensive sessions  
**Packaging**: Revenue share with BNPL partner  
**Hooks**: Alt payment method; settlement logic  
**Metrics**: Conversion lift on >ETB threshold

---

## E) Data & Benchmarking

### 18) Business Insights & Benchmarks
**For**: Owners/managers  
**Value**: Compare utilization, no‑shows, revenue per slot vs peers  
**Packaging**: Analytics plan  
**Hooks**: Aggregation pipeline; anonymization  
**Metrics**: Adoption; decision usage in ops meetings

### 19) Forecasting & Staffing Recommender
**For**: Salons/clinics  
**Value**: Predict busy hours; recommend staff counts  
**Packaging**: Pro+ add‑on  
**Hooks**: Time‑series model; roster suggestions  
**Metrics**: OT ↓; idle time ↓; on‑time starts ↑

---

## F) Integrations

### 20) POS & Accounting Bridges (Lightweight)
**For**: SMBs/clinics  
**Value**: Push daily sales; VAT receipts; reconcile deposits  
**Packaging**: Connectors library; per‑connector monthly  
**Hooks**: Webhooks; CSV/API mappers  
**Metrics**: Reconciliation time ↓; data errors ↓

### 21) Calendar Deep Sync (Google/Microsoft + Team)
**For**: Consultants/enterprises  
**Value**: Conflict‑free shared calendars; privacy filters  
**Packaging**: Business/Enterprise  
**Hooks**: OAuth; delta sync; privacy masks  
**Metrics**: Sync conflicts ↓; adoption per seat

---

## Prioritization (Near‑Term ROI)
1) Waitlist & Gap Filler  
2) Two‑Way WhatsApp/Telegram Bot  
3) Memberships/Packages  
4) Review Engine  
5) POS/Accounting Bridge (Light)

---

## Mini‑PRDs (Top 3)

### PRD‑A: Waitlist & Gap Filler
**Problem**: Empty gaps and last‑minute cancellations waste revenue.  
**Solution**: Auto‑maintain waitlist; when a slot opens, send SMS/WhatsApp to the next best candidates; optional “move‑up” offers.  
**API**: `POST /waitlist/add`, `POST /waitlist/notify`, `POST /appointment/move_up`  
**Acceptance**: Gap slot filled in <10 minutes for ≥30% of openings; audit trail captured.  
**Risks**: Spam → rate limits; consent flags.  
**Metrics**: Fill‑rate %, incremental ETB/month.

### PRD‑B: Two‑Way WhatsApp/Telegram Bot
**Problem**: Booking happens in DMs; manual back‑and‑forth is slow.  
**Solution**: Conversational flow to search slots, book, reschedule, cancel, and pay.  
**API**: `/bot/session`, `/bot/action/book`, `/payments/create_intent`  
**Acceptance**: End‑to‑end booking within chat; payment confirmation flips status; fallback to human.  
**Risks**: Channel policy limits; deliverability.  
**Metrics**: Bot completion %, handoff %, CSAT.

### PRD‑C: Memberships / Packages
**Problem**: Irregular cashflow and low retention.  
**Solution**: Sell 10‑visit packs or monthly subs; auto‑renew; balance tracking; members‑only pricing.  
**API**: `/membership/create`, `/membership/charge`, `/entitlement/debit`  
**Acceptance**: Entitlements decrement on attendance; renewal notifications; prorated refunds per policy.  
**Risks**: Refund disputes; revenue recognition.  
**Metrics**: MRR, churn, visit utilization %.

