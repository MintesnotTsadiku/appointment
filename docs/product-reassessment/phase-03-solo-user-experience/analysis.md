# Phase 3 — Solo-user experience

Source baseline: `edaccef62bb082b3ef02833eaca00f2505f5ed00` (unchanged).
Documentation HEAD at the start of the bounded follow-up: `67f6b59`.
Branch: `review/phase-03-solo-user-experience`. Evidence:
[evidence-index.md](evidence-index.md). Product source and runtime were rechecked
before new runs and are unchanged (`frappe-appointment-readiness` @ `3c57fb4`,
frontend/backend 200).

**Disposition:** the bounded follow-up is complete. The onboarding contract
failure, the schedule-scope/empty-state problem, the edit defect, the availability
propagation failure and the booking-detail errors are now supported by
cleanup-safe, reproducible evidence. One original conclusion (that a confirmed
customer booking "never reaches the schedule") was corrected: it is now
demonstrated only for a record that provably still existed during provider
inspection. No product change is authorized by this report.

No real customers or customer data exist; there is no migration or
backward-compatibility requirement. The assessment runtime, retained QA access
and raw original evidence are preserved.

## Method and evidence boundaries

- Fresh, clearly labelled `P3B` fixtures were recreated after the original
  Phase 3 cleanup (users `p3b-solo-owner`, `p3b-solo-customer`, `p3b-onb`; one
  organization/provider/service/location/availability and three appointments:
  09:00 and 09:45 single-digit hours, 14:00 control).
- Browser work went through `appointment.qa_runner.run` (Agent Plane + Agent
  Harness) only. Identities were verified with `frappe_session`; the customer
  flow used the harness's anonymous `auth: none` mode.
- **Guest/session protocol:** `frappe_session` with `username: Guest` fails
  ("Frappe did not create an authenticated sid", BQA-2026-00086). The harness
  applies one `auth` per manifest and exposes no per-scenario identity, so the
  anonymous public flow can only be represented by `auth: none`, and no single
  run can switch between a Guest customer and a staff provider. Recorded as a
  protocol limitation, not compliance.
- **Handoff without cleanup:** `appointment.qa_runner.run` always runs
  `qa_fixtures.teardown` in `finally`; `_cleanup_run_artifacts` deletes new
  `Booking Event`/`Appointment Group` rows relative to its setup snapshot. A
  customer booking therefore cannot survive into a later provider run. The
  handoff was tested inside **one** run (booking + provider inspection before
  teardown). See finding F2 and the tooling section.

## Lifecycle coverage (revised)

| Step | Result supported by evidence | Remaining limit |
|---|---|---|
| 1. Access and first screen | Provisioned solo identity reaches the first-use screen; clean choice screen | Signup untested |
| 2. Service/duration/price | Wizard reaches Create Service via Skip, but `create_service` returns 417 "Location not found"; not completed | Settings→Location route not attempted |
| 3. Hours and exception | Availability save still returns HTTP 500; **no date-exception UI exists**; a per-day closure in Settings persists | Exception workflow absent in this build |
| 4. Publish/find link | Not reached (service creation failed; link publication unverified) | Scenario link supplied by QA setup |
| 5. Customer booking | Guest booking confirmed, desktop and mobile | Booking is a Booking Event; see F2 |
| 6. Provider finds that booking | Demonstrated failure with the record present for the whole inspection (F2) | Single-run identity deviation |
| 7. Reschedule/complete/no-show | Reschedule and No Show succeed and persist on two-digit-hour records; Completed and any update on a single-digit-hour record fail with a visible "Update failed" toast | None material |
| 8. Change hours → customer choices | Closed Wednesday persisted; slot API still offered 16 slots and the customer booked it (F4) | See F4 |
| 9. Review day | Day view renders; shows fabricated demo rows and another org's fixture | Trust/scope issue |
| Mobile | Full booking completed at 390×844 through confirmation | Provider mobile not re-tested |

Decision/screen/intervention counts for the tested solo portion: **6 wizard
screens** (type selection, Business Profile, Connect Calendar, Set Availability,
Create Service, plus Settings→Availability), about **14 explicit decisions**, and
**QA-provisioned access plus a browser-timezone alignment** as interventions. The
onboarding service step failed before a link screen; the booking/schedule parts
used the labelled scenario.

## Five product findings

### F1. The solo setup contract is broken at availability, and the visible fallback still cannot finish

- **Finding:** Continue at Set Availability sends `weekly_schedule` to an
  endpoint requiring `level` (HTTP 500), and the "Skip for now" recovery reaches
  Create Service but `create_service` fails with 417 "Location not found. Please
  add a location first." The user sees only "Failed to create service. Please try
  again."
- **Why it matters:** A solo professional cannot complete setup or publish a
  bookable service through the wizard, and the recovery path gives a misleading
  error.
- **Evidence:** Original BQA-2026-00071 (`screenshots/08-solo-onb-07-availability-submit-deadend.png`,
  `traces/b-onboarding-*.json`); follow-up BQA-2026-00094
  (`screenshots/p3b-13-onboarding-after-skip.png` shows Create Service reached;
  `screenshots/p3b-14-onboarding-create-service-error.png` shows the failure);
  `traces/p3b-onboarding-skip-report.json`; duplicate `save_availability` at
  `appointment/onboarding.py:1095,3752`; caller
  `Step3Availability.tsx:167`; `Step4Service.tsx` catch shows only a generic message.
- **Action:** improve now: give one compatible availability contract to both
  callers and surface the specific server error.
- **Timing:** before beta (release blocker).

### F2. A live customer booking is not surfaced to the provider's schedule

- **Finding:** In a single run, a visible public booking created Booking Event
  `BEV00005`; that record existed during the provider inspection (removed only at
  run teardown) yet did not appear in the provider's day view or calendar. The
  booked-date day view instead showed fabricated demo rows and another
  organization's fixture.
- **Why it matters:** The provider cannot see the work they have been booked for,
  and the day view cannot be trusted to distinguish real, demo and other-tenant
  rows.
- **Evidence:** Follow-up BQA-2026-00090: `p3b-booking` passed with
  `book_time_slot` 200 and `event_id` in the response
  (`traces/p3b-handoff-booking-report.json`,
  `screenshots/p3b-01-handoff-booking-confirmed.png`); `BEV00005` is in the run's
  trace and in `fixture_cleanup`; the reception and calendar scenarios did not
  find the customer (`screenshots/p3b-02-handoff-reception-booked-date.png`,
  `p3b-03-handoff-calendar.png`). Source: `personal_meet.py:457` writes a Booking
  Event; `desk.py:59-85` and `dashboard.get_appointments` list only `Appointment`;
  `desk.py:107-125` fabricates rows on an empty result. Phase 2 separately
  covers the cross-organization access.
- **Action:** improve now: project customer bookings into the provider's schedule
  (or unify the lifecycle), scope business records on the server, and remove
  fabricated rows from the real view.
- **Timing:** before beta.

### F3. Appointments with single-digit start hours cannot be updated

- **Finding:** The reception desk API returns unpadded times (`"9:00:00"`); the
  edit modal slices the string to `"9:00:"`, fails to parse, and the update never
  fires — for reschedule and for status changes alike. A visible "Update failed"
  toast appears, but nothing is saved. The two-digit control (`"14:00:00"`) works.
- **Why it matters:** Morning appointments (a normal solo schedule) cannot be
  rescheduled or completed, and the failure is only reported as a generic error.
- **Evidence:** Actual HTTP strings captured in
  `probes/outputs/p3b-desk-http.txt` (`start_time="9:00:00"` vs `"14:00:00"`).
  BQA-2026-00087: morning update failed with the "Update failed" assertion passing
  and no update request (`traces/p3b-update-morning-report.json`,
  `screenshots/p3b-05-update-morning-after-submit.png`; the modal's Duration
  showed "15 min [selected]" — the invalid-parse default). The afternoon
  reschedule persisted `start_time=15:00:00` (`screenshots/p3b-06-update-afternoon-reschedule.png`);
  No Show persisted (`screenshots/p3b-07-update-afternoon-noshow.png`,
  BQA-2026-00088). Stored outcomes: `probes/outputs/p3b-verify-outcomes.txt`. Source:
  `EditAppointmentModal.tsx:74,78-80,178-181`.
- **Action:** improve now: normalise the time contract and show the real error.
- **Timing:** before beta for the affected workflow.

### F4. Availability settings do not constrain customer bookings

- **Finding:** Closing Wednesday at the location level and saving persists
  (`is_open=0`), but the public slot API still returns 16 slots with Wednesday in
  `available_days`, and a customer visibly booked **Wednesday, September 30,
  2026**. Separately, the public calendar disables all future days when the
  selected day has no slots, because it reads `available_days` only from that one
  response.
- **Why it matters:** Providers can be double-booked on days they closed, and the
  calendar can hide genuinely available days.
- **Evidence:** Follow-up BQA-2026-00091 (save) and BQA-2026-00092
  (customer booked the closed day): `screenshots/p3b-08-availability-wednesday-closed.png`,
  `p3b-09-availability-after-reload.png`, `p3b-10-customer-closed-day-slots.png`
  ("16 slots available"), `p3b-11-customer-closed-day-booked.png`;
  `probes/outputs/p3b-availability.txt` (persisted `is_open=0` plus 16 slots for
  Wednesdays); `traces/p3b-availability-report.json`,
  `traces/p3b-customer-closed-report.json`. The original no-dots/disabled
  calendar is visible at `screenshots/p3b-...` and was caused by the selected
  date returning `available_days: null`.
- **Action:** improve now: enforce the saved hours in slot generation and book
  acceptance, and derive calendar availability from the full week, not one date.
- **Timing:** before beta.

### F5. Booking details misstate duration, service identity and timezone

- **Finding:** A 30-minute service displays "0.5 min"/"0.5 minutes", the
  confirmation labels the Service as the organization name ("P3B Org"), and the
  timezone shown is the browser's (Asia/Calcutta), not the business's
  (Africa/Addis_Ababa). The site `System Settings.time_zone` is empty.
- **Why it matters:** Customers see incorrect duration/service/time details on the
  booking decision and confirmation screens.
- **Evidence:** `screenshots/p3b-01-handoff-booking-confirmed.png`,
  `screenshots/p3b-16-mobile-confirmed.png`, `screenshots/10-customer-booking-first-screen.png`;
  source `organization-appointment/index.tsx:240-241` uses `userInfo.name` and
  divides an already-minutes value by 60; `probes/outputs/p3b-desk-http.txt`
  records the empty site timezone.
- **Action:** improve now: correct the units and show the selected service's name
  and the business timezone; set an explicit site timezone.
- **Timing:** before beta.

## Tooling limitations (separate from the product findings)

1. **No video/instruction recording through the mandated wrapper.**
   `appointment.qa_runner.run` does not forward `capture_video` /
   `capture_instruction_timeline`, and `agent_plane.api.run_browser_qa_manifest`
   defaults them to `False`, overriding manifests. Every run reported
   `video_file: null`. Smallest prerequisite: forward those flags in
   `qa_runner.run` (one line) or stop the API defaulting them to `False`. Traces
   are not a substitute for video. No application code was changed.
2. **No cross-identity switching; frappe_session cannot authenticate Guest.**
   BQA-2026-00086 (`traces/p3b-guest-session-report.json`). The handoff used one
   provider-session run; customer manifests use `auth: none`. Prerequisite:
   per-scenario auth or a supported Guest session.
3. **Runner cleanup deletes new Booking Events by snapshot.** A two-run
   customer→provider handoff is impossible without a preserve/skip-cleanup
   facility; the single-run method was used and is documented. A preserve hook
   would be the smallest tooling addition.
4. **Product-API cleanup was blocked by the runtime job queue.**
   `frappe.delete_doc` raised `QueueOverloaded (550 queued jobs; scheduler
   paused)`. The synthetic fixtures were removed with direct `frappe.db.delete`
   on `P3B*`/`p3b-*` rows only (`probes/outputs/p3b-cleanup.txt`).
5. **Browser timezone had to be aligned** to the server's implicit default
   (`Asia/Kolkata`) to make the public calendar usable, because the site timezone
   is unset and the browser day (EAT) differed from the server day.

## Experience and recommendation

The first-use choice and the public booking progression are promising, and
availability Settings gives a clear save confirmation. The public booking is
fast and works on mobile. These strengths should survive targeted repairs.

The earliest hard stop remains Continue at Set Availability; the Skip fallback
reaches Create Service but cannot finish. A clean solo journey would ask what is
offered, when, and how to share it, then reliably surface each confirmed booking
for follow-up. The five findings are localized: a broken save contract, a
missing booking projection and honest empty states, the time-format defect,
availability enforcement, and truthful booking details. No rewrite, new Customer
model or mandatory single booking table follows from this evidence.

**Recommendation:** accept the corrected evidence; keep Phase 4 paused. The
before-beta blockers are the five product findings, with the QA video forward as
the evidence prerequisite.

## Unresolved owner decisions

- Which first customer/workflow defines beta acceptance (wizard vs organization
  route), and whether a solo user should ever see provider/organization concepts.
- Whether availability exceptions (holidays, one-off closures) are in beta; no
  such UI exists today.
- The supported timezone range and whether the site should set an explicit
  timezone now.
