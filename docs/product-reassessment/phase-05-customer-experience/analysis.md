# Phase 5 — Customer booking experience

Baseline: `b8ee8e9`, containing reviewed Phases 3 and 4.
Branch: `review/phase-05-customer-experience`.
Evidence: [evidence-index.md](evidence-index.md).

**Recommendation: accept the bounded assessment; the customer lifecycle is not
ready for launch.** Anonymous desktop/mobile booking and basic invalid-email
recovery work on the supplied fixture. Confirmations misstate important details,
the management route creates an additional booking instead of changing the
original, and sequential bookings can occupy the same calendar/time interval.
Repair the existing booking lifecycle and verify it end to end; no evidence
shows a rewrite is cheaper. Acceptance of this assessment is not release approval.

There are no real customers or customer data. Preserve useful behavior, not seed
data compatibility. Keep prelaunch marketing aspirations and track delivery
against Phase 1 requirements. This assessment changes documentation/evidence
only; no product source, schema, dependencies or runtime configuration changed.

## Baseline, method and limits

The Phase 3 and 4 reviewed commits were integrated in `b731363` and `b8ee8e9`.
Loaded Python remains the beta worktree at `edaccef`; readiness is the bench
symlink target. The `appointment/` and `frontend/` source trees match the Phase 5
baseline. The designated isolated site remained running, without reset or
migration, with email muted and scheduler paused.

Browser journeys use Agent Plane/Agent Harness through `appointment.qa_runner.run`.
Anonymous `auth: none` is an explicit exception to the original session rule:
Guest session authentication failed in Phase 3. Saved requests support anonymous
execution; no staff session substitutes for a customer. The runner supplies the
bookable business because product onboarding is broken. This is fixture-assisted
customer evaluation, not proof of independent business setup.

Coordinator review inspected key screenshots, manifests, source and saved
responses. One bounded backend check repeated the slot booking twice as Guest
and read both stored outcomes before teardown. It verifies server behavior, not
a new browser journey or concurrent race. No new browser replay was necessary.

No video was produced through the wrapper's current capture configuration.
Email delivery, complete keyboard-only operation, screen-reader usability,
privacy/consent comprehension, DST, payments and external channels are unverified.
The absence of QA email delivery is intentional and is not a production defect.

## Four decisive findings

### F1. Confirmation details and message status are unreliable

- **Finding:** Confirmation shows a blank recipient, the organization as the
  service, “0.5 minutes” for the 30-minute service, and no booking reference,
  while unconditionally claiming an invitation was sent.
- **Why it matters:** Customers need to identify what was booked and distinguish
  a saved booking from successful message delivery. The current screen undermines
  that confidence even though a Booking Event was created.
- **Evidence:** BQA-2026-00106, `p5-a1-confirmation.png` and its DOM snapshot.
  `useBookingSubmit.ts:110-118` maps `booking_id` although the saved response
  contains `event_id`. `ConfirmationModal/index.tsx:94-107` unconditionally renders
  the sent notice; `organization-appointment/index.tsx:240-241` supplies the
  organization name and divides the minutes value by 60. These display defects
  extend Phase 3's findings; they do not prove there is no usable email in a
  correctly configured delivery environment.
- **Action:** improve now. Show a stable reference, correct service/duration and
  recipient, and message status justified by actual delivery/queue state. Verify
  the customer can retain or regain access after closing the tab.
- **Timing:** before beta.

### F2. The tested management route does not manage the original booking

- **Finding:** The generated URL returns 404 on the internal backend origin in
  this runtime. After the fixture rewrites only the host to the customer frontend,
  the page submits a new booking without reschedule/token fields. No cancellation
  control was found on the inspected management route despite its promise.
- **Why it matters:** Correcting the public URL alone would still leave a customer
  creating an additional booking instead of changing the original appointment.
- **Evidence:** BQA-2026-00109; `p5-d1-product-link.png`, management report and
  `probes/outputs/p5-trace-summary.json`. `p5_fixtures.values` prepares an original
  booking and explicitly rewrites the host for the second scenario. That scenario
  returns new ID `BEV00006`. `appointment/index.tsx:199-215` does not forward
  reschedule/token arguments; the shared submit hook supports them, and backend
  `event_override.py` has a separate update branch when they are supplied.
  `event_override.py:197-220` constructs URLs using `frappe.utils.get_url`.
- **Action:** improve now. Configure and verify the customer-facing origin,
  preserve management identity through the route and update the original record,
  with an understandable cancellation path and authorization checks. A broken
  management action must fail clearly rather than silently create another booking.
  Keep the aspiration and track implementation instead of treating removal of
  marketing promises as the default remedy.
- **Timing:** before launching customer self-service management.

The original link did not itself create the extra booking: it returned 404.
The second test used a host-adjusted, backend-supplied link, not a delivered
customer email. This proves the route defect but leaves real-message discovery
untested. The extra booking is not evidence of an overlapping time by itself.
“No cancellation anywhere in the product” exceeds the inspected routes.

### F3. Two sequential bookings can occupy the same calendar and interval

- **Finding:** Booking the offered `03:30–04:00 UTC` interval does not mark it
  unavailable. Two sequential Guest calls both succeed and persist separate
  Booking Events with identical stored start/end and calendar reference.
- **Why it matters:** A single-provider calendar can accept conflicting work even
  without two customers submitting concurrently.
- **Evidence:** Original slot probe reports the wrong slot (`09:00 UTC`) becoming
  booked, with `03:30 UTC` still available; BQA-2026-00113 offers and confirms the
  conflicting time in the UI. Coordinator `probes/outputs/p5c-verification.json`
  independently records two Guest successes, both subsequent slot reads, and
  both stored events (`09:00–09:30` naive system time, same calendar, status Open)
  before cleanup. This is a server reproduction, not a new HTTP/browser check.
- **Action:** improve now. Use one consistent instant/timezone interpretation for
  slot generation, storage, occupancy checks and final acceptance. Reject a second
  booking for exhausted capacity at write time; verify both ordinary sequential
  attempts and controlled concurrent submissions during implementation.
- **Timing:** before beta.

The empty site timezone exposes inconsistent defaults: `utc_to_sys_time` uses
Frappe's system conversion, while `personal_meet.py:1235` falls back to UTC when
marking slots. This supports a mechanism for the observed 5.5-hour discrepancy;
setting a timezone alone is not proof that every booking path or race is safe.

Separately, the fixture's location is `Africa/Addis_Ababa`, but its User timezone
is `Asia/Kolkata` (recorded by the coordinator). Its 09:00 user-availability
start naturally corresponds to 06:30 Addis time. The original statement that
both availability and location were configured in Addis was unsupported. The
fixture exposes a conflict between user availability and location hours, and
Phase 3 already demonstrates missing location-hour enforcement. Do not count
06:30 display alone as a second proven UTC conversion bug. Define the effective
business timezone/hours and verify a consistently configured case, then mixed
zones and DST; displaying a customer's local time is valid when instants agree.

### F4. Selecting Amharic does not localize the inspected booking page

- **Finding:** The landing language toggle changes landing copy, but the
  subsequently opened organization booking page remains English, apart from
  the local-time-format label.
- **Why it matters:** Language selection does not carry through to the task the
  customer came to complete.
- **Evidence:** BQA-2026-00112 screenshots `p5-e3-landing-amharic.png` and
  `p5-e3-booking-after-amharic.png`; the e3 manifest stops on the booking page.
  The inspected booking-v2, appointment and organization-appointment components
  do not use the translation hook. This is translation-coverage evidence, not a
  completed Amharic lifecycle or a linguistic-quality review.
- **Action:** improve now if Amharic is in the launch scope; translate the whole
  customer workflow and validate it with a competent Amharic reviewer. If the
  owner explicitly chooses an English-only beta, defer Amharic delivery while
  retaining it as a tracked aspiration. Do not silently change language scope.
- **Timing:** before an Amharic-supported launch; scope remains an owner decision.

## Coverage and strengths to preserve

| Journey | Supported outcome | Limit |
|---|---|---|
| Discover service and choose a time | Listing and booking flow reached | Wrong duration label; no full provider/location-choice matrix |
| Invalid contact | Invalid-email error blocks submission; correction books | Not proof of every contact validation or server-side rule |
| No availability | Clear empty-state message displayed | Manifest attempted an invalid click; next-available recovery not completed |
| Confirm | Anonymous booking creates an event | Display defects in F1; delivery intentionally untested |
| Find/manage later | Product link fails; host-adjusted route creates another event | Link supplied by fixture, not received through email |
| Cancel | No control found in inspected management surface | No completed cancellation or exhaustive all-route absence proof |
| Returning customer | Same email can book again | Customer matching, history and duplicate identity handling not verified; accountless booking is not inherently a defect |
| Competing booking | Sequential duplicate accepted and stored (F3) | Exact mid-checkout takeover and concurrency race untested |
| Mobile | 390×844 booking reaches confirmation | Does not certify every modal or management operation |
| Keyboard/accessibility | Associated labels, some ARIA error state, Tab samples and Enter submission | Pointer clicks/fills used; no keyboard-only traversal, focus-trap/return or screen-reader certification |
| Amharic | Language carry-through fails on booking page | No complete translated journey or language-quality check |
| Privacy and policy comprehension | Some booking-policy copy visible | No substantive privacy/consent/cancellation-policy evaluation |

Preserve the understandable booking progression, explicit customer timezone,
visible invalid-email feedback, mobile confirmation and no-availability message.
The tested happy paths had no reported application network/console errors. Do
not call the slot list trustworthy while F3 remains, infer speed without timing
or user research, or equate these checks with accessibility conformance.

The three strongest customer risks are unreliable capacity, unsuccessful
self-service changes, and misleading confirmation details. Language coverage may
be equally decisive for an Amharic-first launch but depends on the chosen audience.

## Clean-start recommendation and next phase

A clean customer journey identifies the service and effective time clearly,
accepts a booking only while capacity exists, returns an accurate durable
confirmation, and lets the customer manage that same record securely. Reuse the
current discovery/form components where they work; repair the response mapping,
management route and shared booking evaluator before adding more features.
No backward-compatible adapter is required for existing test links or seed data.

Accept this bounded assessment with the gaps above; no further broad Phase 5
agent loop is needed. Phase 6 should assess operational consequences, delivery,
backup/recovery, observability and the release gate using this reviewed evidence.
It must not mark the untested keyboard/privacy/message-discovery work as passed.
Those remain explicit customer acceptance checks before release, even though
Phase 6 can proceed after Phase 5 acceptance and merge.

Open decisions: the first complete launch workflow, whether self-service
reschedule/cancel and Amharic are included, and the intended precedence of
location/provider/user timezones and hours. Existing aspirations remain until
the owner decides; this report does not narrow the product by assumption.

## Cleanup and evidence status

The original `p5-cleanup-audit.json` predates deletion of the 75 orphan defaults;
`p5-cleanup-orphans.json` records that later deletion. It is not a post-cleanup
snapshot. Coordinator `p5c-final-audit.json` now verifies zero QA users/defaults,
zero counts in eleven business tables, and four retained enabled users with their
four Browser Accounts/Sessions. Email is muted and scheduler paused.

The coordinator's first probe attempt hit a bookkeeping error after normal fixture
teardown cleared its state dictionary. The corrected probe preserved that state,
repeated the bounded check and removed its fixtures; the one exact default left
by the first attempt was separately deleted. No broad cleanup or queue purge.
Synthetic Comment records from deleted fixtures remain explicitly disclosed;
zero business-table counts do not mean the entire database contains no QA history.
