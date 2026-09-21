# Phase 3 — Solo-user experience

Source baseline: `edaccef62bb082b3ef02833eaca00f2505f5ed00` (branch
`review/phase-03-solo-user-experience`, worktree
`/home/minte/projects/training-apps/.worktrees/frappe-appointment-phase-03`).
Evidence paths, Browser QA Run ids and limits are in
[evidence-index.md](evidence-index.md). This phase changes documentation, QA
manifests and probes only; it does not change product code or reset the runtime.

## Compatibility constraint

There are no real customers or customer data. Existing records are disposable
seed/demo/test data, so no backfill, alias or dual-write recommendation is made
below. The pre-customer policy is assumed throughout (a fresh site and rebuilt
fixtures are acceptable).

## Method and identities

- Fresh solo identity `p3-solo-owner@example.test` (bootstrap: System User with
  `All`, `Guest`, `Desk User`, `Provider`) with **no** provider/organization at
  start, so first-use behaviour is observable. Provisioning is labelled
  separately from product signup; **product signup was not exercised**.
- Anonymous Guest context for the customer steps (`auth: none`). A probe opening
  `frappe.auth.get_logged_user` returned HTTP 403 / "Not Permitted", proving no
  privileged session was used.
- Runtime: preserved isolated site `meet-beta-fix-appointment-beta-readiness-01dea7.localhost`,
  frontend `http://localhost:49510`, foundation bundle 2026.07.2. The bench
  resolved the `appointment` package from the beta worktree at `edaccef`; that
  tree is source-equivalent to the declared runtime source
  (`frappe-appointment-readiness` @ `3c57fb4`) except for docs and built
  frontend assets. Frontend provenance is the Vite dev server (live source).
- All browser runs went through `appointment.qa_runner.run` (Agent Plane + Agent
  Harness); Playwright was never called directly.
- Because the individual wizard could not publish a working booking link, the
  customer/schedule steps use a **clearly labelled backend-provisioned
  solo-equivalent scenario** (one organization, one provider = the solo user,
  one service, one location, availability, two appointments today). This made
  downstream behaviour assessable; it cannot make the original journey pass.

## Lifecycle completion table

| # | Step | Status | Why |
|---|---|---|---|
| 1 | Access + understand first screen | Completed | Bootstrap login; clean "Choose how you want to get started" screen. Product signup untested (QA-provisioned access). |
| 2 | State service, duration, price | Blocked | Wizard reached Business Profile (step 1) but the Availability step (step 3) fails before "Create Service". |
| 3 | Normal availability + one exception | Blocked | `POST save_availability` → HTTP 500 `TypeError: save_availability() missing 1 required positional argument: 'level'` (BQA-2026-00071). |
| 4 | Publish / find booking link | Blocked | Step 5 success screen never reached; a link existed only via the labelled backend scenario. |
| 5 | Customer selects a time, confirmed booking | Completed | Guest booking confirmed on the scenario link (BQA-2026-00074). |
| 6 | Provider finds the new appointment | Failed | The confirmed customer booking does not appear in the provider's day view (BQA-2026-00079). |
| 7 | Reschedule, communicate, complete, no-show/cancel | Partial | Complete and cancel worked for a 14:00 appointment; reschedule and "Completed" on a 09:00 appointment silently did nothing (BQA-2026-00079/81/82, BQA-2026-00076/80). |
| 8 | Change availability → customer choices respond | Tested, negative | Monday closed at location level and saved, but the booking API still returned Monday slots and pre-09:00 slots (BQA-2026-00080/83). |
| 9 | Review the day, identify next action | Completed | Day view is readable, but shows fabricated demo rows and another org's QA fixture (BQA-2026-00079). |
| — | Mobile repeat (booking + schedule) | Completed | 390×844 renders; provider heading hidden at mobile width (BQA-2026-00084/85). |

## Five prioritized findings

### F1. Solo onboarding is blocked at Set Availability and fails silently

- **Finding:** After choosing Individual Provider and connecting the built-in
  calendar, the availability step cannot be saved; the wizard never advances and
  the user sees no error.
- **Why it matters:** This is the primary solo job. The user cannot publish a
  booking link or receive bookings, and the failure gives no recovery path.
- **Evidence:** BQA-2026-00071; `screenshots/08-solo-onb-07-availability-submit-deadend.png`
  (Step 3 still shown); `traces/b-onboarding-console-errors.json`
  (`Failed to save availability: TypeError: save_availability() missing 1
  required positional argument: 'level'`) and `traces/b-onboarding-network-failures.json`
  (POST `appointment.onboarding.save_availability` → 500). Cause: two
  `save_availability` definitions in `appointment/onboarding.py` (`:1095`
  weekly-schedule signature shadowed by the level-based one at `:3752`);
  `Step3Availability.tsx:167` calls it with `weekly_schedule`.
- **Action:** improve now.
- **Timing:** before beta (release blocker).

### F2. A confirmed customer booking never reaches the provider's schedule

- **Finding:** The Guest's confirmed booking is absent from the provider's day
  view; an empty day instead shows fabricated demo appointments, and the solo
  provider also saw the QA runner's appointment from a *different* organization.
- **Why it matters:** The provider cannot see the work they have been booked for.
  Fabricated rows and another business's client look real, which destroys trust in
  the schedule.
- **Evidence:** BQA-2026-00074 (booking confirmed, `screenshots/13-customer-booking-confirmation.png`);
  BQA-2026-00079 (`screenshots/15-provider-reception-tomorrow-empty.png` — empty
  day for the booked date; `screenshots/14-provider-reception-today.png` — shows
  `QA-BROWSER-01d65f Client`). `appointment/api/personal_meet.py:457` books via
  `_create_event_for_appointment_group` (Booking Event / Appointment Group),
  while `appointment/scheduler/api/desk.py:59-85` lists only `Appointment` and
  `:107-125` fabricates demo rows.
- **Action:** improve now (unify the booking lifecycle / surface Booking Events;
  never show demo rows to a real provider).
- **Timing:** before beta.

### F3. Appointments starting before 10:00 cannot be updated from reception

- **Finding:** Editing/rescheduling an appointment whose start hour is a single
  digit does nothing: the "Update Appointment" click issues no request and shows
  no feedback. The same action on a 14:00 appointment succeeds.
- **Why it matters:** Morning appointments (a normal solo schedule) cannot be
  rescheduled or completed, and the silent no-op gives no way to recover.
- **Evidence:** BQA-2026-00076 (14:00 update succeeded: toast "Appointment
  updated!"), BQA-2026-00079/81/82 (09:00 update: no request, no toast;
  `screenshots/18-provider-reschedule-silent-noop.png`,
  `screenshots/19-provider-complete-silent-noop.png`,
  `screenshots/20-provider-cancelled-ok.png`). `get_desk_appointments` returns
  Python `timedelta` → JSON `"9:00:00"` (probe
  `probes/phase03_desk_time_format_probe.py`); `EditAppointmentModal.tsx:74`
  does `start_time.substring(0,5)` → `"9:00:"`, and `:178-181` builds an invalid
  date, so `handleSubmit` throws before the API call (also why Duration renders
  the first option, "15 min").
- **Action:** improve now.
- **Timing:** before beta.

### F4. Availability edits do not change customer choices, and booking copy is wrong

- **Finding:** Closing Monday in Settings→Availability saved successfully, but
  the public booking API still returns Monday slots (and slots before the
  configured 09:00 start). The booking page also shows a 30-minute service as
  "0.5 min" and labels it with the organization name.
- **Why it matters:** Customers can book when the provider is unavailable, and
  the wrong duration/price/service label erodes confidence at the decision point.
- **Evidence:** BQA-2026-00080 (`screenshots/24-availability-saved.png`, toast
  "Location availability has been updated."), BQA-2026-00083
  (`screenshots/25-customer-slots-after-availability.png`; assertion that
  Monday Sep 28 is unavailable failed). Probe
  `phase03_availability_check_probe.py` confirms Location Monday `is_open=0`
  persisted while `get_time_slots` still returned Monday slots from 03:30 UTC
  (06:30 local). Duration/label: `screenshots/10-customer-booking-first-screen.png`
  ("P3SOLO Org • 0.5 min") and `13-customer-booking-confirmation.png`
  ("0.5 minutes", Service "P3SOLO Org"); code
  `frontend/src/pages/organization-appointment/index.tsx:241` divides an
  already-minutes value by 60.
- **Action:** improve now.
- **Timing:** before beta.

### F5. The prescribed QA entry point cannot produce the required recording evidence

- **Finding:** Every Phase 3 run reported `video_file: null`; no `.webm`/`.mp4`
  exists. Manifest `capture_video`/`capture_instruction_timeline: true` is
  ignored.
- **Why it matters:** The phase protocol requires recording evidence; a passing
  run without video is not compliant, and silent evidence gaps undermine later
  phases' confidence.
- **Evidence:** `recordings/README.md`; `appointment/qa_runner.py:15-40` does not
  forward capture flags; `agent_plane/api.py:1000-1023` defaults
  `capture_video=0` → `False`, overriding the manifest. Trace capture
  (`trace.zip`) *is* honoured and preserved.
- **Action:** accept temporarily as an assessment/tooling limitation; improve the
  runner before relying on recorded evidence. Do not call Playwright directly.
- **Timing:** before beta for the evidence process; this is not a product-code
  defect.

## What felt effortless

- The first screen ("Choose how you want to get started") is clear, and choosing
  Individual Provider is obvious.
- The public booking journey (on a published link) is fast: single screen,
  service/slot details, confirmation, and a reschedule/cancel link.
- Availability Settings is visually rich and saves with clear confirmation.
- The reception day view is legible at desktop and mobile widths.

## What required product knowledge

- The difference between Individual Provider and Organization, and where to find
  a booking link (wizard step 5 vs the dashboard "Share Link" tile).
- The three availability levels (Location / Service / Provider) and their
  hierarchy, which a solo user must reason about.
- That the booking link is `/schedule/in/{EventType}` for solo vs
  `/schedule/org/{org}/{service}` for an organization.
- That a "provider" filter and provider names appear on a solo booking page.
- Terms such as "EventType", "Provider", "Front-Desk", "Schedule/availability
  levels" leak into surfaces a solo user should not need.

## Earliest likely abandonment point

**Step 3 (Set Availability).** After investing in business profile and calendar
setup, the user clicks Continue and the screen simply does not change — no error,
no spinner, no guidance. This is the earliest hard stop and the most likely place
a solo professional gives up.

## Smallest evidenced changes for solo beta readiness

1. Fix the duplicated `save_availability` so the wizard's availability step
   saves (F1) — one function/contract.
2. Make the customer's booking visible to the provider in reception, and remove
   fabricated/demo and cross-organization rows from the real schedule (F2).
3. Normalise time values end-to-end so single-digit hours parse, and show a
   visible error when an update fails (F3).
4. Make the booking page authoritative: apply the provider's saved hours to slot
   generation, and stop dividing duration by 60; show the service name, not the
   organization (F4).
5. Fix the runner to forward `capture_video`/`capture_instruction_timeline` so
   phases can produce required recordings (F5).

No redesign project is indicated. These are localized repairs on an otherwise
coherent direction.

## Clean-start comparison

A clean solo journey would be: one identity with a Provider, one "what you
offer" form (name, duration, price), one availability editor, and one shareable
link — with a single record type owning the booking lifecycle so the customer's
confirmation and the provider's schedule are the same fact. The current product
has the right concepts but splits the lifecycle between Booking Event /
Appointment Group / Appointment and exposes the organization/provider hierarchy
to a single-person business. The least-cost safe path is to preserve the
concepts and unify the lifecycle and the final availability decision rather than
rewrite.

## Evidence limits and unresolved decisions

- Recording (video) evidence is unavailable through the prescribed runner (F5);
  traces and screenshots substitute.
- Product signup was not tested; access was QA-provisioned.
- Email is muted and the scheduler paused, so the confirmation's "Calendar
  Invite Sent" was only observed as copy, not delivery.
- Mobile coverage is first-screen only (booking first screen, reception day
  view), not the full lifecycle.
- F3's mechanism (single-digit-hour parsing) is supported by the differential
  behaviour and the raw `timedelta` probe; product-side reproduction is
  recommended before implementing.
- Owner decisions still open: whether a solo user should ever see
  organization/provider concepts; whether the individual wizard or the
  organization path is the canonical solo flow; and the supported timezone range
  for beta.
