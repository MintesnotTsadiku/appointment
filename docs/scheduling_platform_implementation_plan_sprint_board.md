# Implementation Plan & Sprint Board

> This plan is split into **Backend** and **Frontend**, with granular tasks, acceptance criteria, API shapes, test/verification steps for an automated agent that has access to the Frappe console and a browser. It also includes a migration approach from `rtCamp/frappe-appointment`.

---

## 0) Repo & Branching
- Fork `rtCamp/frappe-appointment` → `org/ethi-scheduler`.
- Create apps:
  - `ethi_scheduler` (core scheduling, policies, front‑desk UI)
  - `ethi_payments` (payment drivers: telebirr, chapa, mpesa)
  - `ethi_channels` (SMS/Email/USSD)
- Branching: `main` (release), `develop`, feature branches `feat/*`, hotfix `fix/*`.
- CI: lint + unit tests + type checks + export fixtures + `bench build`.

## 1) Data Model Migration (from upstream)
- Keep upstream doctypes for Events/Slots where practical; add **Provider, Location, Service, EventType, Appointment, PaymentIntent, Policy, Notification, ConsentRecord, AuditEvent**.
- Write migration patches:
  - Patch 001: create new doctypes and permissions.
  - Patch 002: copy/transform existing Appointment/Slot data into new structure.
- Idempotent patches with `frappe.reload_doc` and guards for re‑runs.

**Agent verification checklist (console):**
- `frappe.get_meta("Appointment")` returns new fields.
- Create sample Provider/Location/Service and ensure `frappe.db.exists` on inserts.

---

## 2) Backend — Sprints & Tasks

### Sprint 1 — Foundations (env, doctypes, permissions)
**Tasks**
1. Scaffold apps (`bench new-app`) and install into site; enable modules.
2. Create doctypes: Provider, Location, Service, EventType, Appointment.
3. Access control roles: Owner, Manager, Provider, Front‑Desk.
4. Timezone, currency defaults; localization strings (Amharic/English).

**Acceptance**
- Can create Provider/Location/Service/EventType via desk.
- Public event type URL renders slots (placeholder).

**Agent checks**
- Console: create records; list with `frappe.get_all`.
- Browser: hit `/book/<event_public_id>` and see generated slots.

### Sprint 2 — Slot Engine & Policies
**Tasks**
1. Implement availability rules (working hours, time‑off, buffers).
2. Conflict detection across locations/providers.
3. Policy engine (deposit %, cancel/reschedule windows, late‑cancel fee).

**Acceptance**
- Given overlapping events, double‑booking is prevented.
- Buffer respected before/after appointments.
- Policies returned in booking quote API.

**Agent checks**
- Console unit tests simulate overlapping requests.

### Sprint 3 — Payments v1 (telebirr & Chapa)
**Tasks**
1. `PaymentIntent` doctype and service layer.
2. Driver `telebirr`: init payment, signature verify, webhook endpoint.
3. Driver `chapa`: hosted checkout, webhook verify.
4. Update `Appointment.status` on success/failure; refund endpoint for host cancel.

**Acceptance**
- Happy path: Appointment transitions Pending → Confirmed on webhook.
- Failure path: gracefully cancelled with reason.
- Refund endpoint sets PaymentIntent → Refunded.

**Agent checks**
- Browser: open PSP sandbox pages, complete a test payment.
- Console: inject webhook payload; verify signature; observe status change.

### Sprint 4 — Notifications (SMS/Email)
**Tasks**
1. `ethi_channels` sms provider abstraction; templates with i18n.
2. Reminder scheduler (T‑48h/T‑24h/T‑3h configurable).
3. Delivery receipts (DLR) processing; opt‑out flag.

**Acceptance**
- Messages queued and sent; delivery status stored.
- Opt‑out prevents future sends.

**Agent checks**
- Console: enqueue reminders; assert Notification rows with `sent_at`.

### Sprint 5 — Front‑Desk v1 (Day/Week)
**Tasks**
1. React page under `/desk` with provider/location filters.
2. Create/edit appointment; drag‑reschedule with policy checks.
3. Walk‑in queue → assign to next free slot.

**Acceptance**
- Dragging updates backend; conflicts blocked with toast error.
- Walk‑ins appear on board and can be assigned.

**Agent checks**
- Browser: simulate drag; verify appointment start/end updated.

### Sprint 6 — Compliance & Audit
**Tasks**
1. Consent capture on first booking; store `ConsentRecord`.
2. `AuditEvent` middleware for admin changes; export/delete endpoints for data subject requests.
3. Retention policies and scheduled purge job.

**Acceptance**
- Booking flow shows consent text; stored with version.
- Export returns JSON/CSV of subject data; delete masks or purges per policy.

**Agent checks**
- Console: trigger export for test user; inspect archive; run purge job.

### Sprint 7 — Analytics v1
**Tasks**
1. Metrics: no‑show %, utilization %, collected revenue; period filters.
2. CSV export.

**Acceptance**
- Dashboard renders last 30/90 days; numbers match seeded data.

**Agent checks**
- Console: seed; compare expected vs actual.

### Sprint 8 — Google Calendar (optional toggle)
**Tasks**
1. Make Google Calendar integration optional; add refresh token storage and sync job.
2. Resolve conflicts bi‑directionally.

**Acceptance**
- Enable/disable per provider without breaking core booking.

**Agent checks**
- Browser OAuth; console job run; verify created events in Google.

### Sprint 9 — USSD Core (v0.2)
**Tasks**
1. USSD session handler (via gateway/partner): list service → next available → confirm.
2. Map MSISDN → client record; send confirmation SMS.

**Acceptance**
- 3‑step USSD to confirm an appointment; appears in front‑desk.

**Agent checks**
- Console: mock USSD requests; assert created Appointment.

---

## 3) Frontend — API Shapes & Screens

### Public Booking Page
**GET** `/api/method/ethi_scheduler.api.list_slots?event_id=UUID&from=ISO&to=ISO`
- **200** `{ slots: [{start,end,tz}, ...], policy: {...}, price: {...} ] }`

**POST** `/api/method/ethi_scheduler.api.create_appointment`
- **Req** `{ event_id, client:{name,phone,email,lang}, slot:{start,end}, payment:{method, deposit_percent} }`
- **Res** `{ appointment_id, payment_intent_id, redirect_url? }`

**Webhook** `/api/method/ethi_payments.webhook.<provider>`
- **Req**: raw PSP payload
- **Res**: `200` if signature valid; transitions Appointment status

### Front‑Desk Board
**GET** `/api/method/ethi_scheduler.api.board?date=YYYY‑MM‑DD&location=ID`
- **200** `{ providers:[...], appointments:[...], walkins:[...] }`

**POST** `/api/method/ethi_scheduler.api.reschedule`
- **Req** `{ appointment_id, new_start, new_end }`
- **Res** `{ ok:true }` (policy errors return 409 with message)

### Notifications
**POST** `/api/method/ethi_channels.api.send_test`
- **Req** `{ channel:"sms", to, template, vars }`

### Compliance
**GET** `/api/method/ethi_scheduler.api.export_subject?phone=+251...`
**POST** `/api/method/ethi_scheduler.api.delete_subject` `{ phone }`

---

## 4) Verification Playbooks (for the Agent)
1. **Create seed data** (console): Providers, Locations, Services, EventTypes.
2. **Slot search**: call `list_slots` and assert count > 0.
3. **Book + pay**: `create_appointment` → complete PSP sandbox → confirm webhook flips status.
4. **Reminders**: schedule reminders in next 2 minutes for a test appointment; observe Notification rows and DLR callback.
5. **Front‑desk drag**: UI drag‑drop; verify updated times in DB.
6. **Consent/Audit**: book as new client; check ConsentRecord; edit appointment as Manager; check AuditEvent.
7. **Export/Delete**: run export for MSISDN; run delete and verify data masked/purged.

---

## 5) Deployment & Environments
- **Dev**: local bench + ngrok for PSP webhook testing.
- **Staging**: single‑tenant; PSP sandbox creds; SMS sandbox if available.
- **Prod**: multi‑tenant; environment vars for PSP secrets; logging to file + aggregator.

**Observability**: frappe logs + metrics endpoint; alert on PSP webhook failures and SMS DLR < 90%.

---

## 6) Security & Compliance Tasks
- Store PSP secrets in env/Doctype protected fields; rotate quarterly.
- Webhook signature verification + replay protection (nonce + 5‑minute window).
- Permission rules per role; sensitive fields read‑masked for Front‑Desk.
- Data retention jobs; consent text versioning.

---

## 7) Cutover Plan from Upstream Repo
1. **Phase‑in**: keep upstream features (Google/Zoom) **optional**. Don’t hard‑require Google in core forms.
2. **Data migration**: transform existing Appointments to new model with Location/Service/PaymentIntent refs.
3. **Feature parity tests**: ensure reschedule and link pages behave as in upstream; add payments & front‑desk on top.
4. **Ongoing**: periodically merge upstream bug fixes; keep custom modules isolated to avoid conflicts.

---

## 8) Backlog (Post‑MVP)
- Microsoft calendar, group events, waitlists, advanced resources (rooms/sequence), marketplace, POS/EMR adapters, WhatsApp booking bot.

