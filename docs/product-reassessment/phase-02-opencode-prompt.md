# Phase 2 OpenCode prompt

Act as an independent application architect assessing Appointment's platform
architecture and shared-site safety. Execute Phase 2 only. Do not implement
product fixes, redesign screens, refactor, merge your branch, or start Phase 3.

## Read first

- docs/product-reassessment/README.md
- docs/product-reassessment/phase-01-product-and-domain/analysis.md
- docs/product-reassessment/phase-01-product-and-domain/evidence-index.md
- docs/product-reassessment/phase-01-product-and-domain/marketing-delivery-requirements.md
- docs/product-reassessment/browser-qa-access.md
- Applicable AGENTS.md instructions in the selected checkout.

Use the revised Phase 1 as the accepted input, not an earlier commit's findings.
Keep aspirational marketing copy. Record implementation gaps and launch evidence
needed; removing those promises is not the product owner's chosen direction.
Aspirational capability copy does not establish current capability or substantiate
factual partner, customer-count or uptime claims.

## Repository and branch

Repository: https://github.com/MintesnotTsadiku/appointment.git
Default branch: develop
Primary checkout: /home/minte/projects/training-apps/.worktrees/frappe-appointment-beta
Canonical product/app/module: Appointment / appointment / Appointment.
Primary module package: appointment.appointment.

Inspect status and fetch origin/develop. Confirm the revised Phase 1 and shared
QA runbook are merged before starting. Record the exact baseline. Create a
separate worktree from latest origin/develop on review/phase-02-platform-architecture.
Inspect an existing branch rather than resetting it. Do not alter the shared
develop checkout or preserved runtime source. Only commit Phase 2 documentation,
QA manifests, safe probes and evidence under
`docs/product-reassessment/phase-02-platform-architecture/`.

## Question and scope

Can Appointment safely support most appointment-based businesses on one Frappe
site, with a practical later path to dedicated enterprise sites? Shared-site
architecture is an assumption to evaluate, not a conclusion to defend.

Start with source, metadata, existing tests and narrow read-only probes. Execute
focused tests where they can settle a material safety claim. Avoid exhaustive
exploration, full UI lifecycle replay, broad load tests and implementation work.
Reuse Phase 1 evidence with its stated limitations. If a material claim remains
unverified, state the gap rather than infer a pass or failure.

Evaluate:

1. Organization ownership of all business record categories, including child
   and indirect records. Trace actual ownership and authorization, not only
   the presence of an organization field.
2. Isolation across APIs, query helpers/search, reports/exports, files, realtime,
   background jobs and caches. Check one user's membership in multiple businesses,
   guest access, reception and provider boundaries. Prioritize realistic cross-tenant
   reads/writes, including direct calls rather than relying on hidden UI controls.
3. Whether public, personal, reception, rescheduling, cancellation and walk-in
   paths share authoritative booking constraints and lifecycle transitions.
4. Concurrent capacity reservation, duplicate requests and idempotency. Do not
   equate a sequential conflict check with atomic prevention. For unimplemented
   payments, assess the required boundary and mark callback safety unverified.
5. Timezones, Ethiopian time presentation, daylight-saving transitions, hours,
   exceptions, buffers, recurrence, rooms/equipment and group capacity. Separate
   existing guarantees from requirements conditional on the selected customer.
6. Boundaries for payments, SMS/email/calendar and later channels: authorization,
   durable work, retry ownership and failure visibility without inventing a
   framework merely because an integration is absent.
7. Workers, scheduler, migrations, auditability and data growth on one site.
   A paused QA scheduler is not evidence that scheduled production work functions.
8. Moving one organization to a dedicated site: ownership closure, shared users,
   dependencies, identifiers, files and history. State what a safe export/import
   would require; do not build one or move data during assessment.

## Corrections from Phase 1 to preserve

- Location/service/provider availability intersection already exists in
  appointment/scheduler/availability.py; slot_engine.py calls it. Determine which
  paths actually honor it. Multiple constraint sources are not inherently a defect.
- Slot engine checks both Appointment and Booking Event. Trace lifecycle and
  concurrency behavior before proposing consolidation.
- EventType binds Service, Provider and Location with overrides. Preserve that
  responsibility unless concrete evidence supports a simpler safe alternative.
- No dedicated Customer model does not prove absent history or require a beta
  schema addition. Assess organization scope and identity risks if identity is needed.
- Legacy organization fields and Front Desk / Front-Desk roles require a real
  authorization check before calling them harmless or dangerous.
- Duplicate metadata fields are real, but their runtime/migration consequence
  must be established; they do not create independent database columns.

## Environment and browser rules

Use only the preserved isolated site and runtime in browser-qa-access.md. Reuse
its retained least-privileged identities and encrypted Browser Accounts. Additional
synthetic tenants/users needed for isolation tests are allowed; document exact
ownership, records and cleanup. Never reset or delete retained identities.

Do not modify the preserved runtime source, install a new Bench/site, migrate to
restart, change shared Python/Node installations, enable email or the scheduler,
or synchronize runtime source with your evidence checkout. Record source/build
revision differences. Use the certified foundation environment and preflight.

For necessary browser evidence, use appointment.qa_runner.run through Agent Plane
and Agent Harness, never direct Playwright. Use frappe_session with an explicit
least-privileged auth.username; default_role is not sufficient. Verify the actual
logged-in identity. Administrator is only appropriate for an explicit admin journey.
Read the runbook's fixture ownership and cleanup cautions before execution.

Capture trace, video and instruction timeline. Verify the effective policy and
inspect screenshots, trace, video, console and failed network requests; report
unavailable artifacts. Do not repeat Phase 1's auth:none/no-video run as compliant
authenticated evidence. Backend fixture setup and final-record checks are allowed,
but cannot replace a visible workflow you claim to have evaluated.

Never print or commit credentials, sessions, tokens or private data. Store only
synthetic safe evidence. Preserve informative failures. Do not run destructive
or load probes outside this isolated site.

## Deliverables

Create analysis.md and evidence-index.md in the Phase 2 folder, plus only the
small supporting manifests/probes/artifacts needed to substantiate the findings.

Return a compact analysis containing:
- Verdict: shared-site approach sound, conditionally sound, or unsound, with
  explicit evidence confidence and conditions.
- The three most serious failure modes; distinguish reproduced defects from
  supported risks and unverified guarantees.
- One small current-versus-clean-start architecture diagram.
- At most five actions ordered by risk reduction, preserving working strengths.
- For each material finding: Finding / Why it matters / Evidence /
  Action (keep, improve now, accept temporarily, replace later) /
  Timing (before beta, after beta, later).
- An evidence matrix distinguishing source read, test read, test executed,
  probe/browser observed and unresolved. Cite exact baseline file/line references,
  safe commands/results, run IDs and artifact locations.
- Least expensive safe transition. No rewrite or microservices recommendation
  without concrete comparison to incremental repair, migration risk and lost behavior.

Commit and push the Phase 2 evidence branch. Return branch, baseline, final commit,
files, checks actually executed, concise conclusions, unresolved decisions,
limitations, retained fixtures and cleanup results. Stop for coordinator review.
Do not merge or start Phase 3.
