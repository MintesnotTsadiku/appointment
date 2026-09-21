# Phase 3 OpenCode prompt — solo-user experience

Act as an independent usability reviewer encountering Appointment as a solo
professional with one service and one schedule. Execute Phase 3 only. Assess
what exists; do not fix product code, redesign screens, refactor, merge your
branch or start Phase 4.

## Read first

- docs/product-reassessment/README.md
- docs/product-reassessment/phase-01-product-and-domain/analysis.md
- docs/product-reassessment/phase-01-product-and-domain/marketing-delivery-requirements.md
- docs/product-reassessment/phase-02-platform-architecture/analysis.md
- docs/product-reassessment/phase-02-platform-architecture/evidence-index.md
- docs/product-reassessment/browser-qa-access.md
- Applicable AGENTS.md instructions in the selected checkout.

Keep aspirational marketing capabilities. Record delivery gaps and truthful
launch acceptance requirements; removing promises is not the owner's direction.
Do not turn speculative Customer/EventType consolidation into a prerequisite.

## Repository and branch

Repository: https://github.com/MintesnotTsadiku/appointment.git
Default branch: develop
Primary checkout: /home/minte/projects/training-apps/.worktrees/frappe-appointment-beta
Canonical product/app/module: Appointment / appointment / Appointment.
Primary module package: appointment.appointment.

Inspect status and fetch origin/develop. Confirm the finalized Phase 2 analysis
and this prompt are merged; record the exact baseline. Create a separate worktree
from latest origin/develop on review/phase-03-solo-user-experience. Inspect an
existing branch rather than resetting it. Preserve the shared develop checkout
and the preserved runtime source. Commit only Phase 3 documentation, small QA
manifests/fixture helpers and safe evidence under:
`docs/product-reassessment/phase-03-solo-user-experience/`.

## Accepted prior evidence

Phase 2 demonstrates customer reads of other businesses' records via desk HTTP
APIs and additional staff access problems in controlled probes. The current
shared-site implementation is not safe for customer launch. This does not block
isolated synthetic UX assessment or authorize fixes during this phase.

No prior phase proves the solo lifecycle works. Administrator tests and public
first-screen screenshots are insufficient. Ethiopian-time frontend formatting
exists; its correctness still needs visible verification. A duration display
of 0.5 min for a 30-minute fixture was observed in Phase 1. Preserve current
behavior and report what this phase observes rather than assume fixes occurred.

Do not repeat Phase 2's security audit. If wrong-business data appears, record
that consequence and continue only with synthetic data. Do not hide a failure
by changing to Administrator or modifying permissions beyond the intended role.

## Persona and lifecycle

Use a fresh synthetic solo identity and clean business state. Existing retained
identities and encrypted Browser Accounts are documented in browser-qa-access.md;
use them only where their role/state fits. Create a separate fresh solo identity
for first-use behavior when necessary. Give it only the role/access a real solo
user would receive; document bootstrap access separately from product onboarding.
Use a separate customer/Guest browser context for customer steps.

Through visible product controls, complete and record:

1. Sign up or receive access and understand the first screen. If access is
   provisioned by QA, label signup untested; do not present backend user creation
   as a successful signup journey.
2. State the service, duration and price when applicable.
3. Set normal availability and one exception.
4. Publish or find the customer booking link.
5. As a customer, select a time and obtain a confirmed booking.
6. As the solo provider, find the new appointment and understand its details.
7. Reschedule it, inspect the promised customer communication, complete it, and
   record a no-show or cancellation on another appointment.
8. Change availability and confirm subsequent customer booking choices respond.
9. Review the day and identify the next action.

Do not explain hidden organization/provider internals to the test user. Inspect
whether the UI hides them naturally. Count required decisions, screens, unfamiliar
terms, dead ends, recovery steps and administrator interventions. Repeat the key
booking and schedule views at narrow mobile width. Check that times and service
duration remain understandable across the provider/customer views, including the
available Ethiopian-time control; do not expand into the full Phase 5 accessibility
or translated-customer assessment.

If blocked, capture the earliest failing step and resulting state. Backend setup
may create a clearly labeled separate scenario to assess downstream behavior,
but cannot make the original end-to-end journey pass. Mark every step completed,
blocked, or unverified and explain why. Do not silently omit the rest of the
lifecycle or implement a workaround in the product.

## Runtime, accounts and browser protocol

Use only the preserved isolated site and runtime in browser-qa-access.md:
- Site: meet-beta-fix-appointment-beta-readiness-01dea7.localhost
- Frontend: http://localhost:49510
- Bench: /home/minte/projects/appointment-worktree-runtimes/fix-appointment-beta-readiness-01dea7/bench
- Preserved source: /home/minte/projects/training-apps/.worktrees/frappe-appointment-readiness
- Certified Python: /home/minte/projects/appointment-foundation-runtime/venv
- Foundation bundle: 2026.07.2

Inspect current runtime status, actual imported source and frontend provenance.
Restart only if stopped with the documented frappe-worktree command. Do not
migrate merely to restart, create a new site/Bench, install shared dependencies,
change the preserved source, enable email or unpause the scheduler. Read necessary
local credentials without printing or copying them into evidence.

Verify the installed Agent Plane/Harness and certified browser preflight. Run
browser manifests through `appointment.qa_runner.run`, which delegates to Agent
Plane and Agent Harness. Never call Playwright directly.

Use `auth.type: frappe_session`, explicit `auth.username`, and the actual
least-privileged identity. A role label/default_role is not a username and may
fall back to Administrator. Verify logged-in identity before scoring the journey.
Use separate manifests/contexts for each identity unless the installed runner
explicitly supports switching. Validate the framework's Guest session path for
public access; do not substitute a privileged session or silently use auth:none.

Enable capture_trace, capture_video and capture_instruction_timeline. Verify
actual artifacts and effective video policy before the full journey. A passing
run with video_file null is not compliant recording evidence. If tooling cannot
produce required evidence, preserve the failure and explain the limitation;
use only supported QA configuration rather than modify application code.

Read the runbook's cleanup warning: the runner creates Administrator-owned
fixtures and performs broader cleanup than an exact phase manifest. Before use,
ensure it will not remove others' data or contaminate the solo first-use scenario.
Prepare intended ownership and access explicitly, but do not pre-create the
service/schedule that the user must create through UI. Existing bootstrap data
visible to the solo user is a finding, not something to disguise.

Use synthetic data only. Record exact fixture ownership and cleanup, preserve
retained QA users/Browser Accounts/Sessions, and serialize browser runs. If safe
execution is impossible under the current runner, report the concrete blocker
rather than refactor the runner or bypass the prescribed entry point.

Email is muted and scheduler paused: inspect visible communication states and
safe queued synthetic records when useful, but do not claim external delivery
or timed reminders worked. Do not send real messages or change those controls.

## Evidence and return

Create analysis.md, evidence-index.md, phase manifests, screenshots/, recordings/
and traces/. Use at most five prioritized material findings, each with Finding,
Why it matters, Evidence, Action (keep/improve now/accept temporarily/replace
later) and Timing (before beta/after beta/later).

Inspect screenshots at their actual viewport, recordings, traces, console and
failed network requests. Passing automation alone is not UX evidence. Map each
finding to role, scenario, exact URL, runtime revision, Browser QA Run ID and
artifacts. Keep raw credentials/cookies/tokens and private information out of
commits; use restricted local artifacts or redacted exports if needed. Record
exact locations and retention limits for large uncommitted artifacts.

End with what felt effortless, what required product knowledge, the earliest
likely abandonment point, and the smallest evidenced changes needed for solo
beta readiness. Compare briefly with a clean-start solo journey, preserve
strengths and recommend incremental changes rather than a redesign project.

Commit and push the evidence branch. Return baseline/branch/commit, files,
checks actually executed, lifecycle completion table, concise findings, unresolved
owner decisions, missing artifacts/blocked checks, fixture cleanup and retained
accounts. Stop for coordinator review. Do not merge or begin Phase 4.
