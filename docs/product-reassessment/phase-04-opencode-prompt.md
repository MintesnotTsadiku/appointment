# Phase 4 — organization, administrator, reception and provider experience

Start only after the coordinator accepts Phase 3 and its reviewed documentation
is merged into `origin/develop`. Do not execute Phase 3 again or begin Phase 5.

Act as an independent product/workflow reviewer. Read:

- `docs/product-reassessment/README.md`;
- `docs/product-reassessment/browser-qa-access.md`;
- the reviewed `analysis.md` and `evidence-index.md` for Phases 1–3;
- Phase 1 `marketing-delivery-requirements.md`.

Use actual code, metadata, UI and saved records. Historical completion claims
are not authority. No product implementation, refactoring, schema changes or
runtime reset. Preserve aspirational marketing and record delivery gaps. There
are no real customers or legacy-data compatibility requirements; do not recommend
backfills or adapters to preserve disposable seed records.

## Checkout and runtime

Fetch `origin/develop`; create `review/phase-04-organization-experience` from its
latest accepted head in a separate worktree. Record the baseline and inspect
applicable repository guidance. Do not switch or edit the shared develop checkout
or the preserved readiness worktree.

Use the existing site `meet-beta-fix-appointment-beta-readiness-01dea7.localhost`
in `/home/minte/projects/appointment-worktree-runtimes/fix-appointment-beta-readiness-01dea7`,
frontend `http://localhost:49510`. Read credentials locally only. Reuse the
certified foundation environment and preflight from the QA access guide; do not
modify shared Python/Node installations. Check the actually loaded app source,
not just the runtime's declared worktree. Restart this designated stack if stopped;
no migration is needed for a restart. Keep email muted and scheduler paused.

## Scope and evidence

Use least-privileged organization manager, reception and provider accounts from
the retained QA access guide. Organization Manager is not the Frappe Administrator.
Administrator is for fixture preparation or an explicitly assessed site-admin
journey, never proof that ordinary business staff can complete their work.

Through real controls, attempt the complete organization lifecycle:

1. Manager creates/selects an organization; adds two services, two providers,
   two locations, schedules, booking rules and staff access.
2. Correct one setup mistake; reload and log in again to confirm saved state.
3. Reception books, handles and assigns a walk-in, reschedules one appointment,
   cancels another, and closes/completes a visit.
4. Provider finds assigned work, inspects available customer context, changes
   availability and completes an appointment.
5. Manager reviews activity/workload and available audit history, then removes
   or disables one disposable staff member and verifies the access outcome.
6. Test organization switching if offered. For each role, attempt one bounded
   action outside its authority; verify both visible behavior and server outcome.

A decisive failure may close a step. If setup blocks later evaluation, use a
separately labelled downstream fixture scenario and explicitly distinguish it
from successful UI onboarding. Do not use API calls as substitutes for user steps.
Read-only backend checks may verify final records. Preserve working strengths.
Repeat decisive reachable reception/provider interactions at mobile width.

Phase 2 already proves shared-site access failures. Do not rerun its whole
security matrix. Phase 3 already proves broken solo onboarding, morning time
parsing, ignored location closures and incorrect booking labels. Check their
impact on these organization journeys without repeatedly diagnosing known bugs.

## Browser and fixture rules learned from Phase 3

Use `appointment.qa_runner.run` → Agent Plane → Agent Harness; no direct
Playwright. Verify the actual role/session and include its identity in evidence.

Before lifecycle execution, inspect the capture path. Manifests should request
trace, video and instruction timeline capture, but the current wrapper does not
forward video/timeline flags and API defaults override them. Do not repeatedly
run unchanged manifests expecting video, or claim a null video proves capture
was requested when a manifest disables it. If supported configuration cannot
resolve recording without source changes, report the exact blocker and use
clearly qualified screenshot/trace evidence; do not alter product code.

The current runner applies one identity per manifest and deletes new Booking
Events/Appointment Groups at final teardown by snapshot. Establish how a record
can survive until both roles inspect it BEFORE claiming a handoff. Record its
identity and saved ownership/date/time, verify existence at inspection, and clean
up afterwards. A recreated record is not a preserved handoff. A public form used
under a staff session is not an anonymous customer journey. Where tooling cannot
support the intended check, state the blocker rather than report a false pass.

Inspect screenshots, traces, console and failed network requests. Export small,
redacted response summaries supporting important saved outcomes; ephemeral raw
trace paths alone are not durable evidence. Do not publish cookies, session IDs,
passwords, API keys, booking access tokens or database credentials.

Maintain an exact fixture inventory. Preserve the four retained QA users and
Browser Accounts/Sessions. Never use broad cleanup prefixes as the deletion
boundary. Normal document deletion is preferred; if blocked, inspect the cause
and avoid bypassing child/session/auth cleanup. Verify exact test children,
permissions, sessions and authentication entries as well as parent tables.
Do not purge the job queue or alter scheduler policy to hide a cleanup problem.

## Deliverables and stop condition

Create `docs/product-reassessment/phase-04-organization-experience/` with
`analysis.md`, `evidence-index.md`, manifests, screenshots and trace/recording
locations. Keep raw failed evidence. The analysis must distinguish observation,
supported inference and unresolved decision, with no more than five prioritized
material findings. Each states Finding, Why it matters, Evidence, Action
(keep/improve now/accept temporarily/replace later) and Timing.

Compare the observed organization workflow with a clean-start experience that
reveals complexity gradually. Recommend the least expensive safe path; no
rewrite recommendation without a concrete comparison of implementation,
verification and useful behavior retained. Report what worked, what required
internal product knowledge, and which complete workflow remains blocked.

Commit only Phase 4 documentation/evidence, push its branch and return baseline,
branch/commit, file list, role/run/artifact map, saved outcomes, cleanup results,
concise conclusions and explicit limitations. Stop for coordinator review.
Do not merge, implement fixes or start Phase 5.
