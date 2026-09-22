# Phase 6 — Release, operations and business readiness

Execute only Phase 6 after the coordinator-reviewed Phase 5 documentation is
accepted and merged into `origin/develop`. Verify its reviewed content is present;
do not substitute the original unreviewed Phase 5 report. If missing, report the
prerequisite gap without merging unless the owner explicitly authorizes it.

Read the reassessment README, browser-qa-access guide, all five reviewed analyses
and evidence indexes, and Phase 1 marketing-delivery requirements. Evaluate what
must work after the demo when actual customers arrive. Existing claims and
configuration screens are leads, not proof of operational readiness.

## Branch and boundaries

Fetch `origin/develop`; create `review/phase-06-release-operations` in a separate
worktree. Record the accepted source baseline. Do not switch shared checkouts or
edit the preserved readiness source. Commit only documentation and evidence under
`docs/product-reassessment/phase-06-release-operations/`.

No product fixes, refactors, migrations or dependency changes. There are no real
customers/data: no legacy backfill or compatibility obligation for current seed
records. Future customer upgrades, backups and recovery still need a sound plan.
Keep marketing aspirations; track unimplemented capabilities and launch evidence.

Reuse the preserved isolated site and certified runtime in browser-qa-access.md.
Check the imported Python app and frontend source, not just the bench symlink.
Keep email muted and scheduler paused. Do not reset the site, overwrite its
files/database, purge queues, send real messages, charge payments, connect real
customer accounts or install dependencies to make a check pass. Credentials remain
local and must never appear in evidence.

## Bounded assessment

Prioritize a few decisive operational checks over a large inventory. For each
capability, distinguish source/configuration presence, executed behavior, a
supported risk and an untested requirement.

1. Tenant ownership, authorization, meaningful audit history, privacy/consent,
   customer correction/export/deletion and retention. Reuse Phase 2's proven
   isolation failures; inspect their operational consequences instead of rerunning
   its entire access matrix. Standard modified_by is not full historical audit.
2. Backup/restore, recovery objectives, rollback, future upgrade safety and support
   diagnostics. Inspect current procedures and artifacts. A backup file or command
   is not proof of successful restore. Do not restore over the assessment site.
   If a safe disposable restoration target is unavailable, record the exact gap
   and proposed bounded drill for approval rather than declaring recovery passed.
3. Email, calendar and other implemented integration failures, retry behavior,
   duplicate callbacks and customer-visible recovery. Use synthetic/local failure
   cases only where they cannot dispatch real messages or payments. Unimplemented
   integrations are delivery gaps, not testable successes or invented incidents.
4. Capacity correctness and operational performance. Phase 5 independently proved
   two sequential bookings on the same calendar/interval; do not call it only a
   hypothetical concurrency risk. Separate occupancy correctness from throughput.
   Inspect safeguards and use bounded load only if safe for the preserved runtime;
   no uncontrolled stress test or broad job generation.
5. Import/onboarding of a future business, including validation and failure recovery.
   Distinguish future import requirements from migration of existing seed data.
6. Monitoring, actionable errors, failed-booking diagnostics, setup-abandonment and
   no-show reporting. Determine what operators can actually detect and explain
   without exposing credentials or private customer data.
7. Subscription/usage limits, abuse controls, support boundaries and concrete
   enterprise separation triggers: contractual isolation, regulation, residency,
   scale or substantial customization. Separate product decisions from controls
   actually implemented. Do not presume dedicated sites fix application defects.

## Evidence discipline

Use Agent Plane/Agent Harness through appointment.qa_runner.run for any visible
journey; no direct Playwright. Verify least-privileged identity. Current capture
and lifecycle-cleanup limitations remain; do not repeat unchanged runs expecting
video or mistake teardown deletion for product data loss. Do not use admin success
as proof of a customer/staff journey.

Backend probes are appropriate for operational behavior, but use deterministic
synthetic records, bounded execution and exact cleanup. Export small allowlisted
outcome summaries. Preserve failed evidence. Do not commit raw session headers,
access tokens, database credentials, backup contents or customer-management links.

Keep the four retained QA identities and Browser Accounts/Sessions intact. Audit
exact child/default/session/auth leftovers as well as parent records. Previous
zero business-table counts did not imply complete cleanup. Leave unrelated
synthetic history and queues alone, and disclose retained artifacts.

Carry forward Phase 5's coverage limits: full keyboard-only operation, privacy
comprehension, real-message management discovery and exact checkout concurrency
were not passed. The fixture User and location had different timezones; 06:30
customer display alone did not prove an incorrect conversion. Slot occupancy and
storage used inconsistent defaults and accepted duplicates. Confirmed defects
must remain in the release gate until implementation and verification resolve them.

## Deliverables

Produce one authoritative `analysis.md`, an `evidence-index.md`, and supporting
probes/reports/screenshots where useful. Include:

- A plain-language operational verdict.
- At most five decisive findings, each with Finding, Why it matters, Evidence,
  Action (keep/improve now/accept temporarily/replace later), and Timing.
- A short beta gate table: requirement, pass/fail/unverified/not applicable,
  proposed responsible role, evidence, and what closes the gap. Do not invent
  assigned owners or treat unexecuted drills as passes.
- The minimum detection, support and recovery capabilities before external users.
- A clean-start comparison and least expensive safe transition. Recommend a
  rewrite only with concrete implementation/verification and retained-value evidence.
- Explicit limitations, owner decisions and exact cleanup results.

Commit/push the Phase 6 branch and return baseline, branch/commit, files, executed
checks, concise conclusions, blocked checks and retained artifacts. Stop for
coordinator review. Do not merge, implement fixes or begin Phase 7.
