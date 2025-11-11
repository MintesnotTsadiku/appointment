# Product Requirements Document (PRD)

## 1) Product Summary
A local-first scheduling platform for Ethiopia. Solo pros get a shareable booking link; enterprises get a front‑desk console to manage multi‑provider, multi‑location schedules. Payments via telebirr/M‑PESA/Chapa; SMS/USSD access; Amharic/English; compliance with Proclamation 1321/2024.

## 2) Goals & Non-Goals
**Goals**
- Reduce no‑shows with deposits/reminders.
- Support multi‑location, multi‑provider scheduling.
- Provide low‑data booking access (SMS/USSD) and localized UX.
- Meet Ethiopia’s data protection requirements.

**Non‑Goals (MVP)**
- Building a full EMR/POS.
- Complex insurance/billing.
- Marketplace discovery (can be a later add‑on).

## 3) Personas
- **Independent Provider (Coach/Consultant)**: wants paid sessions, automatic links, minimal setup.
- **Doctor/Clinician**: works across clinics; wants one availability pool; front‑desk can book on their behalf; deposits.
- **Salon/Clinic Front‑Desk Agent**: needs day/week rosters, walk‑ins queue, quick reschedules.
- **Business Owner/Manager**: wants utilization, revenue collected, no‑show stats.
- **Client/Patient**: wants simple booking and reliable reminders; can pay via mobile money.

## 4) User Stories & Acceptance Criteria (selected MVP)
### 4.1 Booking Links / Event Types
- *As a Provider*, I can create **Event Types** (title, duration, price, deposit rule, buffer, availability rule, location) so that clients can book.
  - **AC**: Creating an event type exposes a public URL; time slots reflect provider/location availability and buffers.

### 4.2 Availability & Conflicts
- *As a Provider*, my available times should exclude my other bookings and time‑off.
  - **AC**: Slot engine prevents double booking across all locations; respects minimum buffer.

### 4.3 Payments & Deposits
- *As a Client*, I can pay a deposit via telebirr/Chapa (v1) or hold a preauth.
  - **AC**: On successful PSP webhook, `Appointment.status` becomes `Confirmed`; on failure, `Cancelled` with reason; refund endpoint exists for host cancellations.

### 4.4 Front‑Desk “Book on Behalf”
- *As a Front‑Desk Agent*, I can book any provider at any location; the system warns on conflicts and applies relevant policies.
  - **AC**: Day/week board filters by location/provider; walk‑in queue assigns a slot or holds in queue with ETA.

### 4.5 Notifications (SMS/Email)
- *As a Client*, I receive reminders (T‑48h/T‑24h/T‑3h configurable) in Amharic or English.
  - **AC**: Delivery status is tracked; bounced/failed deliveries flagged; opt‑out respected.

### 4.6 Rescheduling & Cancellation Policies
- *As a Provider*, I can set reschedule/cancel windows and late‑cancel fees.
  - **AC**: Attempts outside windows are blocked or apply fees automatically via PSP.

### 4.7 USSD Lite Booking (Design‑Ready, v0.2)
- *As a Client* without data, I can dial a USSD code to find next available slot and confirm using my phone number.
  - **AC**: USSD responds within 3 steps; confirmation SMS is sent; appointment shows in front‑desk.

### 4.8 Analytics
- *As a Manager*, I can see no‑show %, utilization %, and total collected per period.
  - **AC**: Dashboard shows last 30/90 days; export to CSV.

## 5) Functional Requirements
### 5.1 Doctypes / Data Model (MVP)
- **Provider**: name, phone/email, locations [M2M], default calendar, working hours, time‑off (link), services offered.
- **Location**: name, address, timezone, opening hours, rooms/chairs, contact phone.
- **Service**: name, duration, price, deposit %, buffer pre/post, resources (rooms/chairs).
- **EventType**: provider(s), service, visibility (public/private), booking window, capacity (1:1, group), policies (reschedule/cancel), calendar link.
- **Appointment**: client (name/phone/email), provider, location, service, start/end, price, deposit, status (Pending/Confirmed/No‑show/Cancelled), source (link/front‑desk/USSD), PSP refs, consent flags.
- **PaymentIntent**: appointment ref, amount, currency (ETB), PSP (telebirr/Chapa/M‑PESA), status (Created/Succeeded/Failed/Refunded), raw callback payload (hash), signature verified bool.
- **Notification**: channel (SMS/Email), to, template, scheduled_at, sent_at, delivery_status, error.
- **Policy**: type (deposit, cancel window, fee), parameters (%, hours), scope (provider/service/location).
- **AuditEvent**: actor, action, resource, timestamp, IP, outcome.
- **ConsentRecord**: subject, purpose, text version, granted_at, revoked_at.

### 5.2 Payments
- Initiate PaymentIntent → redirect/SDK → PSP webhook → capture/confirm → update Appointment.
- Refunds: full/partial on host cancel; reconciled via PSP APIs.

### 5.3 Channels
- SMS reminders with templating and localization; DLR (delivery reports) where supported.
- USSD flow (v0.2) with short menu: select service → pick next available → confirm → receive SMS.

### 5.4 Front‑Desk Console
- Views: Day/Week grid; filters: location, provider, service; actions: create/edit, drag‑reschedule, assign from walk‑in queue.

### 5.5 Access Control
- Roles: Owner, Manager, Provider, Front‑Desk, Client (public); per‑location scoping; audit trail for admin actions.

### 5.6 Localization & Settings
- Language toggle (Amharic/English); ETB currency; timezone Africa/Addis_Ababa; date/time formats.

## 6) Non‑Functional Requirements
- **Availability**: graceful degradation offline; idempotent webhooks.
- **Performance**: slot search < 1.5s for 30‑day window, 20 providers.
- **Security**: PSP secret management, webhook signature verification, encrypted PII at rest, least‑privilege roles.
- **Compliance**: consent, purpose limitation, retention policies, export/delete endpoints within 30 days SLA.
- **Observability**: structured logs, metrics (reminder success, PSP failures), error dashboards.

## 7) Integrations
- **Calendars**: Google (optional), Microsoft (later).
- **Payments**: telebirr (In‑App/redirect), Chapa (hosted), M‑PESA Ethiopia (C2B).
- **Messaging**: SMS gateway (Ethio telecom or aggregator); email (SMTP/API).

## 8) Success Metrics (MVP)
- No‑show rate ↓ 30% after deposits/reminders.
- Provider activation to first booking < 24h.
- 95% PSP webhook success within 60s; < 0.5% payment disputes.
- < 1% failed SMS after retry.

## 9) Release Plan
- **v0.1 (MVP)**: links, availability, deposits (telebirr/Chapa), SMS reminders, front‑desk day view, consent & audit.
- **v0.2**: waitlists, refund rules, analytics dashboard, USSD core.
- **v0.3**: Microsoft calendar, marketplace listing (optional), advanced resource management.

## 10) Open Questions
- Telebirr USSD short code provisioning timeline?
- Aggregator vs direct SMS connection for DLR quality?
- Free plan limits to control SMS costs?

