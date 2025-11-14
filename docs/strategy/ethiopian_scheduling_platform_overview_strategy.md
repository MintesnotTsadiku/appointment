# Overview & Strategy

## 1) Background & Vision
Ethiopia needs a frictionless, local-first appointment platform that works for both solo professionals and multi-location businesses. We’re building a “Calendly-for-Ethiopia” that adds:
- **Local payments** (telebirr, M-PESA Ethiopia, Chapa) with deposits, preauths, refunds.
- **Front‑desk console** for clinics/salons to manage multi‑provider, multi‑location calendars.
- **Low-bandwidth access**: SMS reminders and a USSD booking flow; offline‑tolerant front desk.
- **Localization**: Amharic + English, ETB currency, Africa/Addis_Ababa timezone by default.
- **Compliance by design**: Ethiopia’s Personal Data Protection Proclamation 1321/2024 (consent, purpose limitation, data subject rights, retention, audit).

We will fork and extend `frappe-appointment` (Frappe app by rtCamp) to accelerate availability/slotting, and add payments, front‑desk, policies, and local channels.

## 2) Product One‑liner
> Share a link. Get booked. Get paid. In Amharic, with telebirr/M‑PESA/Chapa, and a front‑desk that works across locations—even offline.

## 3) Core Value Propositions
- **Reduce no‑shows** via deposits, smart reminders, and waitlists.
- **Unify schedules**: providers working across clinics or branches keep one live availability pool.
- **Sell time easily**: paid 1:1s for coaches, mentors, influencers.
- **Run the floor**: salons/clinics see staff rosters, rooms/chairs, walk‑ins and online bookings together.
- **Trust & compliance**: explicit consent capture, export/delete requests, and auditable access logs.

## 4) Target Segments & Primary Use Cases
1. **Doctors & health professionals**: multi‑clinic availability, deposits, front‑desk “book on behalf”, location switching, service durations.
2. **Consultants/coaches/mentors**: one link per offering, pre‑paid sessions, automated Meet/Zoom links, calendar sync (Google first, Microsoft next).
3. **Creators/influencers**: time‑boxed meet‑and‑greets, priced slots, rescheduling limits, instant refunds on host cancel.
4. **Salons/barbers/beauty**: staff rosters, service menu, chairs/rooms, queue for walk‑ins, automated reminders.
5. **Other services**: diagnostics centers, photography, driving schools, repair services—anyone who sells time.

## 5) Competitive Landscape (local & global)
- **Global horizontal**: Calendly (self‑serve links, paid meetings, integrations). Lacks local payments, USSD/SMS booking, ETB localization.
- **Vertical beauty**: Fresha/Booksy set expectations for front‑desk flows, no‑show fees, and marketplace exposure—but no Ethiopia‑specific rails.
- **Local verticals (health/beauty)**: niche EMR or salon apps exist but are siloed. Our wedge is a **horizontal platform** with simple adapters.

## 6) What We’re Building that Others Don’t
- Ethiopia‑ready rails (telebirr, M‑PESA Ethiopia, Chapa) and **cash‑flow tooling** (deposits, balances, refunds).
- **USSD + SMS** flows for booking/confirmations in low‑data contexts.
- **Unified front‑desk & self‑serve** in a single system, multi‑location aware, with **offline‑first queuing**.
- **Data protection baked in** for Ethiopia’s 1321/2024 law.

## 7) Risks & Mitigations
- **Connectivity volatility** → idempotent writes, queued jobs, graceful retries; local cache for day views; background sync.
- **PSP uptime** → support all three rails; health checks + fallback path (alternate PSP, pay-on-arrival with token).
- **Adoption friction** → WhatsApp/Telegram booking cards; CSV import; Google Calendar import wizard; concierge onboarding for first customers.
- **Vertical competition** → position as neutral layer; light EMR/POS adapters; avoid custom one‑offs.

## 8) Go‑to‑Market (Ethiopia)
**Beachhead** (0–3 months): Addis salons/barbers and independent coaches/consultants.
- Offer branded booking pages, free migration/import, and launch bundles (free SMS credits, reduced payment fees for first 60 days).
- Co‑marketing with payment partners; influencer packages.

**Phase 2** (3–9 months): clinics/diagnostics, with front‑desk multi‑location calendars and deposit policies.

**Channels**: PSP partnerships; creator partnerships; WhatsApp/Telegram playbooks; referral incentives for early providers.

**Pricing (ETB)**:
- **Free**: 1 event type, email reminders, link page branding.
- **Pro**: unlimited events, deposits/payments, SMS reminders.
- **Business**: front‑desk, multi‑location, advanced policies, analytics.
- **Enterprise**: SSO, SLA, audit exports, priority support.

## 9) Scope Baseline (MVP)
1) Core availability & conflict checks; booking links/events; rescheduling.
2) Payments v1: telebirr + Chapa hosted checkout; deposit on booking, balance on arrival.
3) Notifications: SMS/email templates (Amharic/English), configurable T‑minus schedules.
4) Front‑desk console: day/week views, provider/location filters, walk‑in queue, overbooking warnings.
5) Providers & locations: rosters, holidays, time‑off (pull from ERPNext Leave if present).
6) Analytics: no‑show rate, utilization, collection totals.
7) Compliance pack: consent capture, privacy notices, data subject request endpoints, audit trail.
8) Calendar sync: Google optional (decouple requirement); Microsoft later.

## 10) Architectural Direction
- **Base**: Frappe/ERPNext stack; fork `frappe-appointment` for availability/slot model and video link generation.
- **Payments**: pluggable driver interfaces (`telebirr`, `chapa`, `mpesa`) with webhook verification and a `PaymentIntent`/`Payment` model.
- **Channels**: SMS provider abstractions; USSD gateway integration with minimal steps; message templates with localization.
- **Front‑desk**: SPA module (React) under `/desk` with real‑time updates via Socket.io/Frappe realtime; offline cache for the day board.
- **Compliance**: middleware for consent/purpose checks, role‑based access, evented audit logs, data exports/deletions.

## 11) KPIs & Outcomes
- No‑show rate reduction (%), deposit capture rate, utilization (% of bookable time), average time‑to‑first‑booking, SMS reminder delivery rate, refund %.

## 12) Roadmap Highlights
- v0.1: links, slots, deposits (telebirr/Chapa), SMS reminders, front‑desk day view.
- v0.2: waitlists, refund rules, basic analytics.
- v0.3: Microsoft calendar, USSD booking, marketplace discovery (optional).

