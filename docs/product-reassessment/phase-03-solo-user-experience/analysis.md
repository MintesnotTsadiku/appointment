# Phase 3 — Solo-user experience

Source baseline: `edaccef62bb082b3ef02833eaca00f2505f5ed00`.
Branch: `review/phase-03-solo-user-experience`.
Evidence: [evidence-index.md](evidence-index.md).

**Recommendation: accept this assessment with the stated evidence limits; the
solo experience is not ready for customer beta.** Setup cannot finish through
the tested wizard, and downstream booking and schedule behavior is unreliable.
The evidence supports repairing the existing foundation; it does not establish
that a rewrite, a new Customer entity or a single physical booking table is
necessary. Phase 4 may start only after this assessment is accepted and merged.

No real customers or customer data exist. Recommendations have no legacy-data
migration or backward-compatibility obligation. Preserve useful behavior and
compare implementation and verification effort, not the cost of retaining seed
data. This assessment changes documentation and QA evidence only.

## What was tested and what remains limited

The original and follow-up browser runs used `appointment.qa_runner.run` → Agent
Plane → Agent Harness on the preserved isolated site. Fixture setup used
Administrator; provider journeys used a synthetic Provider identity. Separate
anonymous booking runs used `auth: none`: attempting `frappe_session` as Guest
failed (BQA-2026-00086). This is an explicit protocol exception, not evidence of
compliance with the original session requirement.

The same-run booking-to-schedule check used **the provider session throughout**,
including the public booking form. It is not an anonymous-to-provider identity
handoff. Its separate existence assertion failed and returned empty event lists.
Successful creation, the record's later removal at final teardown, and the
runner's cleanup structure support the inference that it remained stored during
inspection. There was no successful direct existence read at that point. Do not
use the original cross-run check: its booking was deleted before inspection.

Screenshots and saved network traces support the findings below. No video was
produced; no new browser journey was rerun during coordinator verification.
Signup, message delivery, general timezone correctness and a complete provider
mobile lifecycle remain unverified. Email is muted and the scheduler paused.

| Lifecycle step | Supported outcome | Limit |
|---|---|---|
| Receive access and understand first screen | Provisioned solo identity reaches first-use choices | Signup untested |
| Create service, duration and price | Skip reaches Create Service; submission fails with HTTP 417 | No successful setup or publication |
| Set hours and an exception | Wizard save fails; Settings weekday closure persists | No date-specific exception control found in inspected wizard/Settings components; exception workflow unverified |
| Find/publish booking link | Not reached through onboarding | Downstream link supplied by QA setup |
| Customer books | Anonymous desktop and 390×844 mobile booking reach confirmation | Backend-provisioned service; closed-day booking also accepted |
| Provider finds booking | Same-run public booking is absent from reception/calendar | Provider authenticated throughout; persistence supported indirectly |
| Reschedule, complete, no-show/cancel | Afternoon reschedule and No Show saved; 09:00 completion fails visibly | Completion success and cancellation not established; 09:45 follow-up blocked by overlay |
| Changed hours affect choices | Saved Wednesday closure does not prevent slots or booking | Tested location-level configuration only |
| Review day | Screen renders, but includes fabricated rows and foreign-provider labels | Cannot certify the view as an accurate work list |
| Mobile | Full customer booking reaches confirmation | Provider mobile remains incomplete |

The tested setup crosses five wizard surfaces (type choice, profile, calendar
connection, availability and service), plus the separate Settings availability
screen. These are not six completed setup steps. Exact user decision counts and
completion speed were not measured reliably. Interventions included provisioned
access, downstream business fixtures and a browser-timezone setting; the setup
was not independently completed by an unaided solo user.

## Five prioritized findings

### F1. The tested solo setup cannot finish

- **Finding:** Continue at Set Availability returns HTTP 500; Skip reaches
  Create Service, which returns HTTP 417 because no location exists. The UI
  reports only a generic service-creation error.
- **Why it matters:** A solo professional cannot finish the tested setup or
  publish a bookable service, and the fallback does not explain how to recover.
- **Evidence:** BQA-2026-00071 and 00094; screenshots
  `08-solo-onb-07-availability-submit-deadend.png`,
  `p3b-13-onboarding-after-skip.png`, `p3b-14-onboarding-create-service-error.png`.
  `appointment/onboarding.py:1095,3752` defines `save_availability` twice; the
  later signature requires `level`, while `Step3Availability.tsx` sends
  `weekly_schedule`. `onboarding.py:2130` rejects the missing location.
- **Action:** improve now. Establish one working solo setup contract, handle
  necessary internal location/provider records without forcing solo users to
  understand them, and show actionable errors. Merely fixing the first endpoint
  is not sufficient acceptance evidence.
- **Timing:** before beta.

### F2. Public booking and the provider's work list are disconnected

- **Finding:** BQA-2026-00090 creates `BEV00005` through the public form, but the
  booked-date reception and calendar omit it. Reception instead shows fabricated
  appointments, including a label for another organization's QA provider.
- **Why it matters:** Providers cannot trust the schedule to show their work.
  Fabricated rows must not be confused with real appointments. Phase 2 separately
  establishes actual cross-tenant data access; foreign labels in generated rows
  alone do not prove a real foreign appointment was disclosed.
- **Evidence:** `p3b-01/02/03` screenshots, `probes/outputs/p3b-h-handoff.txt`, and the
  redacted `probes/outputs/p3c-trace-summary.json`. Creation returns `event_id`,
  final `fixture_cleanup` reports deleting that ID; the intermediate existence
  assertion fails. `personal_meet.py:705` delegates event creation to
  `overrides/event_override.py` (Booking Event at line 660), while
  `scheduler/api/desk.py:74` and `dashboard.py:get_appointments` read Appointment.
  `desk.py:107` generates mock rows for an empty result. Persistence during
  inspection is a supported inference with the identity limit stated above.
- **Action:** improve now. Make confirmed bookings and staff actions share a
  coherent lifecycle, enforce business scope, and show an honest empty state.
  Choose the simplest consistent model without preserving old test-data formats.
- **Timing:** before beta.

### F3. Unpadded morning times break the reception edit form

- **Finding:** The tested 09:00 appointment cannot be completed: the form shows
  “Update failed” without sending an update request. A 14:00 appointment can be
  rescheduled to 15:00 and then marked No Show.
- **Why it matters:** An ordinary morning appointment can become unmanageable
  through the visible form, without an actionable explanation.
- **Evidence:** BQA-2026-00087/88, screenshots `p3b-04..07`, and
  `probes/outputs/p3b-desk-http.txt`: actual HTTP values include `9:00:00` and
  `14:00:00`. `EditAppointmentModal.tsx:74,78-80,178-181` slices the unpadded value
  to `9:00:` and constructs invalid date strings. This supports a broader
  single-digit-hour risk; not every hour/action was executed. The reschedule
  database read is `p3b-verify-outcomes.txt` (still Confirmed at that time).
  `p3c-trace-summary.json` separately captures the later successful No Show
  response and a schedule refetch returning that status.
- **Action:** improve now. Normalize and validate time values consistently;
  verify morning and afternoon reschedule/status outcomes through the UI.
- **Timing:** before beta for this workflow.

### F4. A saved location closure does not prevent customer booking

- **Finding:** Wednesday is saved closed (`is_open=0`), yet the slot API offers
  16 slots and an anonymous customer books Wednesday, September 30, 2026.
- **Why it matters:** A customer can book outside the location's configured
  hours. This is not a demonstrated overlapping-booking or concurrency race.
- **Evidence:** BQA-2026-00091/92; screenshots `p3b-08..11`,
  `probes/outputs/p3b-availability.txt`, and the successful booking response in
  `p3c-trace-summary.json`. The closure remains saved after reload.
- **Action:** improve now. Define and enforce the effective hours across location,
  provider and service in both slot display and booking acceptance. Also verify
  calendar navigation from a day without slots: the current selected-day response
  drives broader calendar markers, so a marker failure must not be mistaken for
  actual lack of availability.
- **Timing:** before beta.

### F5. Booking details misstate the duration and service

- **Finding:** A 30-minute service displays “0.5 min”, and confirmation names the
  organization as the service.
- **Why it matters:** Customers cannot rely on basic details of what they booked.
- **Evidence:** Screenshots `p3b-01-handoff-booking-confirmed.png` and
  `p3b-16-mobile-confirmed.png`; `organization-appointment/index.tsx:240-241`
  assigns `userInfo.name` and divides a minutes value by 60.
- **Action:** improve now. Show the actual service and consistent duration units.
  Separately establish an explicit timezone configuration and verify conversion
  across booking and staff views. The empty site timezone and differing fallback
  zones are a configuration risk; displaying the customer's timezone is not itself
  a defect and these screenshots do not prove an incorrect instant was stored.
- **Timing:** before beta.

## Tooling and cleanup

- **Recording:** the wrapper omits capture arguments and the Agent Plane API
  defaults override manifest flags. All eight follow-up manifests also explicitly
  disable video/timeline capture; their null videos do not independently test
  forwarding requested flags. A supported capture path needs verification before
  future recording-dependent work. No product/QA runner source was changed.
- **Identity and persistence:** one identity per manifest and snapshot-based
  teardown limit a real anonymous-to-provider handoff. This is a specific blocker,
  not permission to bypass the mandated runner or claim identity switching worked.
- **Cleanup:** direct parent deletion left 34 child rows, 15 sessions, one User
  authentication entry and three defaults. Exact orphan cleanup is now complete
  (`p3c-cleanup-result.json`); no targeted orphans remain, business tables are
  empty, and four retained users/Browser Accounts/Browser Sessions remain.
  QueueOverloaded explains why the earlier delete attempt failed; pausing the
  scheduler alone does not establish why the queue accumulated.
- **Runtime:** coordinator verification restarted the designated stopped runtime
  without reset or migration. The source checkouts were not modified; email
  remains muted and the scheduler paused. No secrets are in the new evidence.

## Clean-start comparison and next decision

A clean solo flow asks what is offered, when it is available, and how to share
it. The resulting booking must appear in the same work list used for later
status changes. Internal organization/provider/location records can exist while
remaining invisible to a solo user. Preserve the understandable first-use choice,
booking progression, reachable mobile confirmation and explicit Settings save
feedback; their presence does not prove a complete end-to-end product.

Repairing setup, time handling and display defects is justified now in the
implementation plan. Unifying booking behavior and effective availability needs
careful design and verification; calling all five findings small or localized
would understate that work. No evidence here establishes that a wholesale rewrite
would be cheaper. Retain marketing aspirations and track delivery against the
Phase 1 launch requirements.

Open product decisions are the beta's first complete workflow, whether one-off
availability exceptions are mandatory for that workflow, and supported timezone
behavior. Evidence limitations are explicit and need no further Phase 3 agent
loop: accept the bounded assessment, then assess organization workflows in
Phase 4 after approval and merge. This is not release approval.
