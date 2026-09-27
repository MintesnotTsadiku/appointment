# First implementation brief: owned booking and provider handoff

Status: bounded foundation implemented and verified on 2026-09-22. The owner
authorized implementation, a separate fresh runtime, focused verification and
commit/push; merge and release are not authorized. See [results and handoff](owned-booking-handoff.md).
The design inventory below records the starting assessment; completed choices
and remaining launch decisions are distinguished here.

## Authority and baseline

Fetched `origin/develop` at `0035948769856a85baa676bc3a37d6d7d164ac28`.
Branch `implement/owned-booking-slice`; source worktree
`/home/minte/projects/training-apps/.worktrees/frappe-appointment-implementation`.
The accepted [Phase 7 recommendation](../product-reassessment/phase-07-final-recommendation/analysis.md)
and its [reviewed evidence](../product-reassessment/phase-07-final-recommendation/evidence-index.md)
govern this work. The [marketing delivery requirements](../product-reassessment/phase-01-product-and-domain/marketing-delivery-requirements.md)
remain in force. The temporary handoff adds execution context, not release approval.

Keep Frappe and useful behavior. Existing demo data needs no compatibility aliases,
backfills or dual writes. Preserve the assessment runtime, evidence and retained
QA identities; do not migrate or reset it. No deadline follows from the illustrative
90-day plan. No tickets, external dispatch, payments or production changes are
authorized by this brief.

## Owner decisions pending

| Decision | Required answer and implication |
|---|---|
| First complete customer workflow | Solo and/or small organizations; industry and necessary rooms/equipment/group capacity; repeat-customer history/matching; self-service or verified assisted changes/cancellation. The first technical slice below does not silently choose a solo-only launch. |
| Languages and integrations | English/Amharic, paid/unpaid customer bookings and product subscription separately, offered payment gateways, confirmation/reminder channels, calendars/meeting services and non-web intake. Each offered promise retains its delivery gate. |
| Operating commitments | Shared/dedicated topology, market, bounded cohort and peak demand, support owner/coverage, retention, acceptable data loss and interruption. Unknown values remain open, not implicit promises. |
| Replacement and verification | Bounded comparison and implementation authorized. Selected orchestration replacement is recorded below. Owner/workflow/language reviewers and release verification capacity remain open. |
| Implementation runtime | Authorized and created: a fresh seedless site, exact synthetic fixtures, isolated services and this worktree. No assessment data imported. See runtime runbook. |
| Time and availability policy | Proposed: location IANA zone interprets operating hours; provider/service restrictions intersect with location hours; explicit closure wins; browser/user zone affects presentation, not ownership or occupancy. These are conservative foundation rules, not an owner-selected launch policy. Business defaults, permitted staff overrides and supported zones remain open for release. |

The owner authorized the common foundation without selecting a launch workflow,
languages, integrations, topology or SLA. Those choices remain open and did not
block the bounded work. Synthetic fixtures are engineering infrastructure, not
acceptance of customer onboarding or a solo-only launch.

## First observable result

A synthetic business has one owned offering (service, provider and location).
A real Guest session books it. A separate authenticated provider session finds
the same persisted booking by stable reference, with correct service, duration,
customer and instant. Another business and an ordinary customer cannot read or
alter its staff data. Booking acceptance enforces hours, remaining capacity and
retry identity, and its material history explains the result.

This is a foundation slice, not the complete launch workflow. Reschedule/cancel,
completion/no-show, fresh visible setup, organization staffing and selected
integrations follow in bounded increments according to the owner's choices.

## Inspected source and affected callers

| Boundary | Existing source / implication |
|---|---|
| Public booking | `frontend/src/pages/booking-v2/hooks/useBookingSubmit.ts` calls `appointment.api.personal_meet.book_time_slot`; that delegates to `_create_event_for_appointment_group` in `appointment/overrides/event_override.py`. The helper inserts Booking Event and explicitly commits. The transaction boundary must accommodate capacity, history and retry identity together. |
| Other public event creation | Whitelisted `create_event_for_appointment_group` exposes another path to the same helper. Inventory its callers and prevent alternate writes from bypassing the selected authority. |
| Provider read | `appointment.scheduler.api.desk.get_desk_appointments` and `appointment.dashboard.get_appointments` read Appointment. Reception and calendar must agree with public confirmation; remove fabricated rows and distinguish read errors from empty results. |
| Staff writes | `create_desk_appointment`, `update_appointment`, `reschedule_appointment`, `assign_walk_in_to_slot` and generic document writes need an explicit disposition. Existing Appointment controller is empty. A public-only fix must not leave another exposed writer able to violate its guarantees. |
| Availability | `appointment/scheduler/availability.py` already intersects layered hours. `slot_engine.check_conflicts` checks both booking types, but Appointment filtering also includes location. Reuse calculations after verifying semantics; provider occupancy must cover overlaps at other locations. |
| Management and integrations | `frontend/src/pages/appointment/index.tsx`, Booking Event hooks, notification and calendar helpers consume booking identity. Track callers now; implement selected lifecycle/integration behavior in subsequent increments without making another authoritative writer. |
| QA infrastructure | `appointment/qa_runner.py` always sets up and tears down fixtures per manifest and omits capture flag forwarding. Exact fixture ownership/retention across separate identity runs and supported capture forwarding are prerequisites for credible handoff evidence. |

Source checks corroborate the accepted evidence; no new runtime reproduction is
claimed. The stored Phase 5 duplicate proof is sequential, not a concurrency test.
The Phase 2 customer HTTP read proof is stronger than its in-process mutation
probes; new acceptance must include actual authenticated HTTP mutation checks.

## Integration versus bounded replacement

| Candidate | What changes | Cost to establish before selecting |
|---|---|---|
| Integrate existing modules | Keep useful representations, route all relevant writes through one contract, define one lifecycle owner and make the other representation a derived view where needed. | Can existing hooks and callers obey one transaction and ownership contract without competing synchronization or independent updates? Count caller changes, duplicated rules and regression obligations. |
| Replace booking orchestration selectively | Keep forms, offering semantics, calculations and framework services; replace ownership resolution and write orchestration, updating current callers and fixtures together. | Establish fresh-install/schema work, caller and integration changes, retained behavior, and verification burden. Do not replace whole modules merely to satisfy a rewrite label. |

Selected: canonical Appointment for organization offering bookings, with one
booking command responsible for actor/action scope,
valid linked ownership, availability, serialized capacity, persistence, history
and retry outcome. Frappe document guards enforce the same boundary for staff
and generic document writes. Booking Event is retained for legacy personal/group
flows, with shared capacity guards; no dual write or backfill was introduced. A unique exact interval does not
prevent partial overlaps; a transaction without a shared serialization mechanism
does not settle competing writers. Consider the provider/capacity identity across
locations (and potentially business memberships), with deterministic lock order
if the approved workflow needs multiple resources.

The existing public organization helper created Booking Event and committed
inside orchestration, while reception read Appointment. Integrating both as
authorities would add synchronization and retry ambiguity. The selected bounded
replacement resolves the offering once, writes Appointment plus creation Version
in the request transaction, and retains the existing forms, hours intersection,
Frappe permissions and personal scheduling. Organization catalog/window adapters
now expose the bound offering. Fabricated reception rows were removed. The
changed surfaces and regression evidence are recorded in the handoff. Broader
legacy lifecycle replacement and integrations are outside this selection.

## Bounded increments and acceptance

1. **Runtime and evidence preparation.** After runtime approval, provision the
   distinct fresh target with email muted and scheduler paused; verify actual
   imported source, database/site identity, isolated ports/services and frontend
   provenance. Install/check Agent Plane and Agent Harness and certified preflight.
   Repair the product QA entry point only as needed for explicit persona identity,
   supported capture and exact fixture ownership across multiple runs. Audit
   cleanup, including child rows, sessions/defaults and intentional history.
2. **Owned offering and access boundary.** Create two independent synthetic
   businesses and least-privileged users. Test allowed own reads/writes, denied
   foreign reads/writes, mixed-business linked records, ordinary-customer access,
   unassigned staff and revocation. Cover custom APIs and generic document access.
   Do not infer isolation from UI filtering or role names.
3. **Guest creation and provider handoff.** Through visible controls, create a
   booking as Guest, verify identity, store its reference, then inspect it under
   a distinct provider session before cleanup. Assert the stored record and
   history, honest confirmation/delivery status, correct range reads and empty/error
   states. Fixture setup is labelled infrastructure, not successful onboarding.
4. **Capacity, time and retries.** Reject closed days, exceptions, out-of-hours
   and buffered overlaps at write time, including stale displayed slots and
   cross-location provider conflicts. Run sequential and controlled concurrent
   requests, asserting committed rows and capacity. Proposed retry contract:
   same scoped key and same payload returns the original result; changed payload
   with that key is rejected; a different request cannot consume full capacity.
   Verify concurrent retries and rollback leave no partial booking/history or
   duplicate effects. Check business/customer/browser zone differences and DST
   where supported. Request success alone never closes these checks.
5. **Working-slice review.** Present retained behavior, actual replacement scope,
   passing and missing evidence, and owner feedback. Extend the same lifecycle to
   selected changes/cancellation and other workflow steps only after this scope
   checkpoint. A passing slice is not launch approval.

Essential history must identify business, booking, actor/channel, operation,
timestamp and material values needed to reconstruct the action. Reuse Frappe
tracking if it meets that contract, including initial creation and denied access
to foreign history. Retries must not create a second successful booking action.
Do not persist secrets or management tokens in evidence/history exports.

## Verification responsibility and release boundary

Proposed responsibility: this implementation task prepares code, focused backend
and HTTP checks, stored-result assertions and browser evidence; the owner names
workflow/language reviewers and the eventual support/operations owners. Capacity
for that review remains undecided. Engineering results are recorded in the linked
handoff; they do not substitute for owner or language acceptance.

Browser execution must use `appointment.qa_runner.run` → Agent Plane → Agent
Harness, with least-privileged identities and explicit authentication checks.
Read [browser QA access](../product-reassessment/browser-qa-access.md) for protocol
and preservation constraints; retained assessment accounts must not be reused on
the new site. Resolve Guest-session behavior through the supported runner before
claiming anonymity. Inspect resulting capture artifacts; screenshots are not video.

The complete [Phase 7 gates](../product-reassessment/phase-07-final-recommendation/analysis.md#5-before-beta-requirements-for-the-chosen-complete-workflow)
remain open beyond this slice, including broader access surfaces, complete chosen
journeys, language review, integrations, data handling, abuse/load, support and
recovery. Real dispatch/payments, production changes and the
[recovery drill](../product-reassessment/phase-06-release-operations/proposed-recovery-drill.md)
retain their separate authorization boundaries.
