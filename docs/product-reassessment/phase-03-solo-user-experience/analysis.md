# Phase 3 — Solo-user experience

Baseline: `edaccef62bb082b3ef02833eaca00f2505f5ed00`.
Evidence: [evidence-index.md](evidence-index.md).

**Disposition: useful findings, but Phase 3 is not yet complete.** The tested
onboarding save fails, the booking details contain visible errors, and reception
shows unrelated synthetic business data. However, the customer-to-provider
handoff test was invalidated by cleanup, update root cause is not established,
and several required lifecycle steps remain unverified. Complete the bounded
[follow-up](follow-up-opencode-prompt.md) before merging or starting Phase 4.

No product changes are authorized by this report. No real customers/data exist;
there is no backward-compatibility or seed-data migration requirement. Keep the
current assessment runtime and raw evidence for repeatability. Retain marketing
aspirations and track delivery gaps, as directed in the parent README.

## Method and evidence boundaries

A fresh QA-provisioned `p3-solo-owner@example.test` had Provider plus framework
roles and no business structure initially. Signup was not tested. Authenticated
runs recorded that explicit identity through `frappe_session`.

After onboarding failed at the selected Continue action, a backend-provisioned
scenario added one organization, provider, service, location, personal
availability and two Appointment records. This is a downstream diagnostic setup,
not a successful solo onboarding journey or proof the UI created those records.

Customer runs used `auth: none`; a separate identity-endpoint navigation returned
403. These support anonymous-context testing but depart from the mandated
`frappe_session` protocol. A 403 alone is not a positive identity assertion for
every later context. Record the exception; do not label these runs protocol-compliant.

The browser entry point was `appointment.qa_runner.run`. Its finally block runs
fixture cleanup after each invocation. Crucially, the customer booking run's own
output records deletion of `Booking Event:BEV00005`. The provider's subsequent
run therefore cannot establish whether that booking would appear while present.
Source paths still warrant a handoff check, but the observed absence is not proof
of a product lifecycle failure.

## Lifecycle coverage

| Step | Result supported by evidence | Remaining limit |
|---|---|---|
| 1. Access and first screen | Provisioned solo identity reaches the first-use screen | Signup and independent first-user comprehension untested |
| 2. Service/duration/price setup | Intended wizard progression did not reach Create Service | Alternative visible routes not assessed; no proof service creation is absent |
| 3. Hours and exception | Selected availability Continue returns HTTP 500 | One-off exception workflow not assessed; visible Skip for now recovery not tested |
| 4. Publish/find link | Wizard link publication not completed | Scenario link supplied through QA setup |
| 5. Customer booking | Scenario link reaches visible confirmation in BQA-2026-00074 | Booking Event later deleted by runner; durability/handoff not established |
| 6. Provider finds that booking | Unverified | Cleanup deleted the event before provider inspection |
| 7. Reschedule/complete/no-show/cancel | Update attempts on the seeded 09:00 record fail; 14:00 diagnostic selected No Show, and cancellation has a passing request/toast assertion | Successful reschedule and completion not established; no complete lifecycle of the customer's booking; no external communication verification |
| 8. Change hours and observe customer choices | Settings shows Monday closed and save success; subsequent calendar still offers a Monday | No committed before/after database/slot-response output or completed closed-day booking |
| 9. Review day | Day view renders seeded data plus an unrelated QA fixture | Reliable daily review is not demonstrated |
| Mobile | Booking first screen and reception day view captured at 390×844 | No full mobile lifecycle; provider heading visibility assertion failed |

A rendered page or passing automation status does not mean the user's full job
is complete. Decision/screen counts and recovery observations were not measured
systematically enough to report totals.

## Five product findings

### F1. The tested onboarding availability save fails without visible recovery guidance

- **Finding:** Continue at Set Availability sends `weekly_schedule` to an
  endpoint requiring `level`, returning 500 and leaving the screen unchanged.
- **Why it matters:** The intended setup progression breaks at a core solo task.
- **Evidence:** BQA-2026-00071; `08-solo-onb-07-availability-submit-deadend.png`;
  committed console/network errors; duplicate `save_availability` definitions
  at `appointment/onboarding.py:1095,3752`; caller at
  `frontend/src/pages/home/components/Step3Availability.tsx:166-170`. The catch
  logs to console rather than presenting the error.
- **Action:** improve now: give the wizard and settings explicit compatible
  contracts and show actionable failures. Do not merely rename/delete one
  definition without checking both callers.
- **Timing:** before beta.

The screenshot also shows Skip for now and a second navigation footer. Neither
was tested as recovery. “The selected save path is broken” is established;
“no route can reach service creation or publish a link” is not.

### F2. The day view does not reliably distinguish the user's real work

- **Finding:** The solo provider sees another organization's QA fixture;
  source also synthesizes appointment rows when the queried result is empty.
- **Why it matters:** A solo professional must be able to trust which appointments
  are theirs and whether an empty day is actually empty.
- **Evidence:** BQA-2026-00079, `14-provider-reception-today.png` shows
  `QA-BROWSER-01d65f Client` alongside the scenario records;
  `appointment/scheduler/api/desk.py:107-136` starts the unconditional empty-result
  demo fallback. Phase 2 provides separate authorization evidence.
- **Action:** improve now: scope business records on the server and show an honest
  empty state. Confine fabricated demonstrations to an explicit demo experience.
  Verify customer-to-provider visibility with the same booking still present.
- **Timing:** before beta.

The missing customer booking is **not** counted as a reproduced defect: its
record was removed by test cleanup. Nor does the mixed day-view screenshot
prove all visible rows were fabricated; its QA fixture was a real synthetic row.

### F3. Updates on one morning fixture fail; the time-format explanation is provisional

- **Finding:** The tested 09:00 record remains in the edit dialog, with no matching
  update request or success toast after attempted reschedule/status changes.
- **Why it matters:** Users cannot reliably complete those tested actions or
  understand why they failed.
- **Evidence:** BQA-2026-00079/81/82 reports and screenshots 18/19. The 14:00
  diagnostic used No Show, not Completed; cancellation is separately covered.
  `EditAppointmentModal.tsx:74-80` slices/parses time strings; `:178-181` constructs
  the submitted time. This is a plausible fault if values are unpadded.
- **Action:** improve now after a narrow diagnosis: capture the actual HTTP time
  strings, selected form values and validation/error state, then fix the confirmed
  cause and provide visible feedback. Normalize the time contract if implicated.
- **Timing:** before beta for the affected workflow.

The committed time probe is a script, not captured output. It prints Python
values and does not by itself prove HTTP serialization. The submit handler also
catches exceptions and displays an error toast (`:212` onward), so a date exception
alone does not explain the observed silence. Native/custom validation and fixture
values need checking. Do not generalize this to every appointment before 10:00.

### F4. The calendar appears inconsistent with the saved closed-day setting

- **Finding:** Settings displays Monday unavailable with a save-success toast,
  while the later public calendar still presents Monday as selectable.
- **Why it matters:** Users cannot tell whether changing their hours changes
  what customers can choose.
- **Evidence:** BQA-2026-00080, screenshot 24 and availability report;
  BQA-2026-00083, screenshot 25, DOM and failed unavailable-date assertion.
- **Action:** improve now: verify persistence, select the exact closed future date,
  capture its slot response and distinguish a stale calendar indicator from
  server-side availability enforcement. Align the confirmed inconsistent path.
- **Timing:** before beta.

The manifest checks calendar labels; it does not select September 28 and attempt
a booking there. `phase03_availability_check_probe.py` reads configuration but
contains no slot API call, and no output for it is committed. Claims that this
probe proves persisted closure plus returned/bookable slots are unsupported.
The screenshot's early times also require timezone checks before a universal
out-of-hours claim.

### F5. Booking details misstate the service duration and service name

- **Finding:** A scenario configured as a 30-minute consultation displays
  “0.5 min/minutes”; confirmation labels the organization as the Service.
- **Why it matters:** Customers need correct details when choosing and confirming.
- **Evidence:** Screenshots 10/13; scenario fixture sets Service duration 30;
  `frontend/src/pages/organization-appointment/index.tsx:240-241` uses
  `userInfo.name` and divides duration by 60.
- **Action:** improve now: make duration units explicit and display the selected
  service's identity through selection and confirmation. Verify stored start/end
  independently; the display defect alone does not prove booking length is wrong.
- **Timing:** before beta.

## QA limitations, separate from product findings

No video was produced. Most manifests requested it, but diagnostic d2 explicitly
sets capture flags false. The current product wrapper does not pass capture
arguments, while `agent_plane.api.run_browser_qa_manifest` defaults them to false.
This supports a limitation of this invocation path, not impossibility across
Agent Plane. Trace archives are not video or proof of instruction recordings.
Address required evidence capture before relying on the next recorded lifecycle;
do not make a tooling defect one of the product's five UX priorities.

Raw traces are left in ephemeral storage. Screenshots and compact reports retain
useful evidence but do not replace the complete recording requirement. The
review inspected decisive committed screenshots/reports and source, not every
raw trace, and did not rerun browser tests or mutate the runtime.

## Experience and recommendation

The first-use choice and public booking progression offer a promising starting
point. The screenshot of settings gives a clear save confirmation, and reception
is visually scannable. These strengths should survive targeted repairs.

The layered Location/Service/Provider editor and provider filter impose decisions
on a one-person setup. Their appearance in a backend-provisioned organization
scenario is evidence about that route, not proof every solo route exposes them.
“EventType in a URL” alone does not prove a user must understand the internal model.

The earliest observed hard stop is Continue at Set Availability. Its silence is
a plausible abandonment risk, not a measured abandonment rate. Test visible
recovery before declaring the whole onboarding flow impossible.

A clean solo journey asks what is offered, when it is offered and how to share
it, then reliably surfaces each confirmed booking for follow-up. Prioritize the
observed contract failure, trustworthy schedule scope/empty states, the confirmed
edit defect, availability consistency and truthful service details. No rewrite,
new Customer model or mandatory single booking table follows from this evidence.
One coherent lifecycle can use more than one record type if behavior is correct.

**Recommendation:** request a bounded evidence correction before acceptance.
No product fixes are required to complete an assessment: a correctly demonstrated
failure or explicit tooling blocker is sufficient. The required follow-up must
remove cleanup interference, distinguish hypotheses from observed failures and
finish or explicitly account for the untested lifecycle steps. Keep Phase 4 paused.
