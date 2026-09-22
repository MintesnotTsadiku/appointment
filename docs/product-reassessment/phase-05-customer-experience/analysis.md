# Phase 5 — Customer booking experience

Baseline: `b8ee8e9` (`origin/develop`, the Phase 3 + Phase 4 integration commit).
Branch: `review/phase-05-customer-experience`. Evidence: [evidence-index.md](evidence-index.md).

**Recommendation: accept this bounded assessment; do not treat the public
customer journey as launch-ready.** Discovery, slot selection, contact
validation, the empty state and keyboard/ARIA basics work. But a customer who
books a real appointment cannot later trust or manage it: the confirmation gives
no usable reference, the product-supplied management link is broken, following
it creates a *second* booking instead of a reschedule, no cancel control exists,
and the booked slot is not the slot removed from availability. The evidence
supports repairing the existing foundation; nothing here establishes that a
rewrite would cost less.

No real customers or customer data exist. Recommendations carry no migration or
backward-compatibility obligation. This assessment changed documentation, QA
manifests, probes and evidence only — no product source, schema, dependency or
runtime configuration.

## Baseline, runtime and protocol

- Loaded Python is the beta worktree at `edaccef` (the bench symlink points at
  the readiness worktree `3c57fb4`; the symlink alone is not proof). `appointment/`
  and `frontend/` are identical between `edaccef` and the review branch `b8ee8e9`
  (the merge changed only `docs/product-reassessment/`), so findings attribute to
  this source.
- Preserved site `meet-beta-fix-appointment-beta-readiness-01dea7.localhost`,
  frontend `http://localhost:49510`, foundation bundle 2026.07.2. Email muted and
  scheduler paused; the site was not reset or migrated.
- **Protocol exception (recorded):** public journeys use the supported anonymous
  `auth: none` mode because `frappe_session` cannot authenticate Guest on this
  runtime (Phase 3 BQA-2026-00086). Anonymity was verified from the saved trace:
  the booking POST carried `sid=Guest; system_user=no`. No staff or Administrator
  session was used for the customer journeys.
- **Fixture-assisted evaluation, not product onboarding:** the bookable business
  is supplied by the existing deterministic `qa_fixtures` because solo
  self-onboarding cannot finish (Phase 3 F1). The customer actions (discover,
  choose, submit, reschedule attempt) were performed through the visible UI; the
  management scenario additionally prepares one synthetic booking because the
  runner deletes new Booking Events at teardown.
- **Recording blocker (unchanged):** `appointment.qa_runner.run` omits
  `capture_video`/`capture_instruction_timeline`, and the installed API defaults
  (`run_browser_qa_manifest(capture_video=0, ...)`) override the manifest flags.
  No actual video artifact exists (`video_file: null`, no `.webm`); the capture
  policy merely labels the channel "failure". Screenshots + traces are used.

## What was exercised

| Area | Method | Outcome |
|---|---|---|
| Anonymity + discovery | BQA-2026-00106 (desktop, `auth:none`) | Anonymous; services listing reached |
| English booking to confirmation | BQA-2026-00106 | Booking created (`BEV00005`), confirmation shown |
| Invalid contact recovery | BQA-2026-00110 | Email error identified; no booking sent; corrected booking succeeds |
| Return / re-book | BQA-2026-00110 | Same email books again; no recognition or history |
| No availability | BQA-2026-00111 | Clear honest empty state and disabled dates |
| Management link | BQA-2026-00107/00108/00109 | Product link host 404s; link does not reschedule |
| Cancel | BQA-2026-00109 (d3) | No cancel control anywhere in the customer surface |
| Conflict / double-book | BQA-2026-00113 + probe | Booked slot not removed; same slot double-bookable |
| Mobile 390×844 | BQA-2026-00112 | Booking completes |
| Keyboard | BQA-2026-00112 | Labels/ARIA present; Enter submits |
| Amharic | BQA-2026-00112 | Landing toggles; booking journey stays English |

## Five prioritized findings

### F1. The confirmation screen gives the customer no reliable record and misstates the booking

- **Finding:** After a successful booking the modal claims "Calendar Invite Sent"
  but shows a blank recipient, shows no booking reference at all, names the
  **organization** as the service, and reports the duration as **"0.5 minutes"**.
  The only management control is a button whose URL points at the internal backend
  origin.
- **Why it matters:** A customer who closes the tab has nothing to identify,
  quote or manage their appointment with; with email muted, no message is
  delivered either. "0.5 minutes" and an organization-as-service name undermine
  trust in what was actually booked.
- **Evidence:** BQA-2026-00106 `screenshots/p5-a1-confirmation.png` and
  `traces/p5-a1-confirmation.html` (accessibility snapshot in the report:
  "A calendar invitation has been sent to", "Service … Org", "6:30 AM • 0.5
  minutes", no Booking ID). Request/response in
  `probes/outputs/p5-trace-summary.json` shows the API returns `event_id`, not
  `booking_id`. Source: `frontend/src/pages/booking-v2/hooks/useBookingSubmit.ts:110-118`,
  `.../components/ConfirmationModal/index.tsx:94-107,121-124,222-226`,
  `frontend/src/pages/organization-appointment/index.tsx:240-241,608`.
- **Action:** improve now. Show a real confirmation reference, the actual service
  name and a correct duration unit, and state honestly whether a message was sent.
- **Timing:** before beta.

### F2. Following the management link creates a duplicate booking, and cancel does not exist

- **Finding:** The product returns a "Reschedule or Cancel" URL, but (a) the URL
  host is the internal backend origin and returns HTTP 404, and (b) the page it
  targets (`/schedule/in/:meetId`) ignores the `reschedule` and `event_token`
  parameters entirely, so submitting the visible form sends a booking POST with
  neither field and **creates a new appointment**. No cancel control is rendered
  anywhere, although the page still claims "You can reschedule or cancel up to 24
  hours before".
- **Why it matters:** The customer's only route to change a booking is broken and,
  if reached, silently double-books them rather than rescheduling. A promised
  cancel path does not exist.
- **Evidence:** BQA-2026-00109 `screenshots/p5-d1-product-link.png` (404) and
  `traces/BQA-2026-00109-management-link-report.json`; the management submit
  request body (no `reschedule`/`event_token`) and a second `event_id` in
  `probes/outputs/p5-trace-summary.json`; the cancel-absence accessibility
  snapshot in the same report. Source: `frontend/src/pages/appointment/index.tsx:199-215`
  (no reschedule/event_token forwarded), `appointment/overrides/event_override.py:197-220`
  (link construction), `frontend/src/pages/booking-v2/components/DateTimeSelector/index.tsx:496`
  and `ConfirmationModal/index.tsx:291` (the unbacked reschedule/cancel claim).
- **Action:** improve now. Either implement customer reschedule/cancel on the
  customer host, or remove the button and the claim; do not ship a link that
  duplicates bookings.
- **Timing:** before beta.

### F3. Booking a slot does not remove that slot; the same time can be double-booked

- **Finding:** Booking the 6:30 AM slot (start `2026-09-23 03:30:00+00:00`) left
  that exact slot marked `booked=false, available=true` and instead marked the
  `09:00:00+00:00` slot booked — a 5.5-hour shift. The browser run then offered
  6:30 AM again and accepted a second booking for the same instant.
- **Why it matters:** Customers can take the same provider/time more than once,
  while the provider's schedule blocks the wrong slot. This is a correctness and
  trust failure, not a cosmetic one.
- **Evidence:** `probes/outputs/p5-conflict-probe.txt` (`CHANGED_SLOTS
  [["2026-09-23 09:00:00+00:00", false, true]]`, same slot still available);
  `probes/outputs/p5-trace-summary.json`; BQA-2026-00113
  (`screenshots/p5-f1-slots-with-conflict.png`, `p5-f1-confirmation.png`) where
  the "competing" slot stayed offered. Root mechanism is the same mixed-timezone
  handling Phase 2 F4 flagged; the new consequence is customer-facing double-booking.
- **Action:** improve now. Compare and store booking instants and slot instants in
  one consistent timezone and re-check capacity at write time.
- **Timing:** before beta.

### F4. Configured business hours and the customer's displayed/booked times disagree

- **Finding:** The fixture location opens 09:00–18:00 and availability is
  09:00–17:00 (both `Africa/Addis_Ababa`), yet the same-city customer is offered
  and books **6:30 AM**. The site timezone is empty (`System Settings.time_zone=''`),
  so Frappe's Asia/Kolkata default and the browser's Addis time shift the window.
- **Why it matters:** A customer sees slots before the business opens and may book
  a time the business did not intend; staff and customer views can disagree about
  the same instant. Displaying the customer's timezone is not itself wrong — here
  the *effective business hours* are wrong.
- **Evidence:** `probes/outputs/p5-conflict-probe.txt`; trace request in
  `probes/outputs/p5-trace-summary.json`; the booking page shows
  "Timezone: Africa/Addis_Ababa" while offering 6:30 AM
  (`screenshots/p5-a1-slots-tomorrow.png`); empty site timezone recorded in
  `probes/outputs/p5-cleanup-audit.json`.
- **Action:** improve now. Set a correct business timezone and verify that stored
  instants, customer display and staff views agree.
- **Timing:** before beta.

### F5. The customer booking journey is English-only; Amharic is not offered

- **Finding:** Only the landing page and parts of the home dashboard use
  translations. After choosing Amharic on the public site, the entire booking
  journey remains English; the only Amharic token on the page is the
  "ሰዓት (Local)" time-format label.
- **Why it matters:** If Amharic booking is advertised, Amharic-speaking customers
  cannot complete the main journey in their language.
- **Evidence:** BQA-2026-00112 `traces/BQA-2026-00112-amharic-report.json`
  (booking-page body text is English after the toggle) and
  `screenshots/p5-e3-landing-amharic.png` vs `p5-e3-booking-after-amharic.png`;
  source usage search shows `useTranslation` only in landing/home components.
- **Action:** improve now if Amharic is advertised, otherwise accept temporarily
  and stop advertising Amharic booking until covered.
- **Timing:** before advertising Amharic; not a blocker for an English-only beta.

## What worked well (preserve)

- Clear service discovery with price and a trustworthy slot list; the customer's
  timezone is explicitly displayed (`p5-a0-org-services-desktop.png`,
  `p5-a1-slots-tomorrow.png`).
- The no-availability state is honest and helpful: "No available time slots …
  Select another date / View next available" (`p5-c1-no-availability.png`,
  `BQA-2026-00111`).
- Contact validation is clear and correctly blocks submission; the invalid-email
  state is labelled via `aria-invalid`/`aria-describedby`
  (`p5-b1-invalid-email.png`, `BQA-2026-00110`).
- The booking form has associated labels, and Enter on the confirm button
  submits; the result is a proper `dialog` with a heading
  (`BQA-2026-00112`, form schema / accessibility snapshots).
- No console errors and no application network failures on the happy path across
  English, mobile and keyboard runs.

## Abandonment risks

1. **Nothing durable to return to.** After confirmation the customer has no
   reference and, because email is muted, no delivered message; the management
   link is broken. They cannot find or trust the booking.
2. **Times don't match reality.** Slots appear 2.5 hours before the configured
   opening, and staff/customer views of the same instant can diverge, so a
   customer may book or arrive at the wrong time.
3. **The promised "reschedule or cancel" is a trap.** Following it double-books;
   there is no cancel. A customer who tries to change plans creates a second
   appointment.

## Lifecycle coverage

| Lifecycle step | Status | Evidence / limit |
|---|---|---|
| Discover services, duration, price | Success (fixture business) | BQA-2026-00106; duration shown as "0.5 min" |
| Choose service/provider/location/date/time | Success | BQA-2026-00106; provider filter present |
| Recover: no availability | Success | BQA-2026-00111 honest empty state |
| Recover: invalid contact | Success | BQA-2026-00110 error identified, no POST |
| Recover: stale / slot taken before confirmation | **Demonstrated failure** (server) + **tooling blockage** (exact race) | Probe shows slot not removed (F3); the mid-scenario race cannot be injected through the declarative runner |
| Confirm booking | Success (with F1 defects) | BQA-2026-00106 |
| Understand what happens next | **Demonstrated failure** | Claimed email, no recipient, no reference (F1) |
| Find booking from what a customer receives | **Demonstrated failure** | No durable link/message; product link 404 (F1/F2) |
| Reschedule | **Demonstrated failure** | Link creates a new booking (F2) |
| Cancel | **Demonstrated failure** | No control anywhere (F2) |
| Returning customer | Success but no identity/history | BQA-2026-00110 (`p5-b3-returning-confirmation.png`) |
| English journey | Success | BQA-2026-00106 |
| Amharic journey | **Demonstrated failure (coverage)** | Booking pages untranslated (F5) |
| Mobile 390×844 | Success | BQA-2026-00112 |
| Keyboard navigation / labels | Success (bounded) | Labels + Enter submit; full tab-order traversal not mechanically asserted |

## Unresolved decisions and evidence limits

- **Owner decisions:** the first beta workflow and whether a customer
  self-service reschedule/cancel is in it; whether Amharic is a launch promise;
  which timezone the business and customer displays must agree on.
- **Product defects referenced, not re-diagnosed:** solo onboarding cannot finish
  (Phase 3 F1) and reception creation/walk-in assignment fail (Phase 4 F3/F4);
  these are why a fixture supplies the bookable business here.
- **Limits:** no video (wrapper/capture blocker); only bounded conflict handling
  was exercised (the exact "taken between selection and submit" UI race was not);
  the reschedule link was supplied via a backend-prepared booking rather than an
  email the customer receives; no DST case; payments, SMS/USSD/WhatsApp, calendar
  sync and reminders were out of scope. This is not release approval.
