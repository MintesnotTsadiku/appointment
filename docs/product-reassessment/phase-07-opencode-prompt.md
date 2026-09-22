# Phase 7 — Clean-start comparison and final recommendation

Execute only Phase 7 after the coordinator accepts and merges the reviewed
Phase 6 documentation into `origin/develop`. Verify the accepted content is
present; do not use the original unreviewed Phase 6 report as authority. If the
merge is missing, report the gap. Do not merge earlier phases without explicit
owner authorization.

Fetch origin/develop and create `review/phase-07-final-recommendation` in a
separate worktree. Record the baseline. Read applicable repository guidance and:

- `docs/product-reassessment/README.md`;
- the single reviewed analysis and evidence index for every Phase 1–6;
- Phase 1 marketing-delivery requirements;
- Phase 6 release gate and proposed recovery drill.

This phase synthesizes the decision. It is not a product implementation, redesign
project, another full assessment sweep or authorization to run recovery/load tests.
Check the few decisive source/evidence references yourself. Do not simply average
agent verdicts or repeat earlier summaries. Use local primary evidence; only
research external facts if a material decision genuinely depends on them.

## Product and decision constraints

Appointment should serve a solo professional and progressively support providers,
locations, reception, services and organizations. Shared-site operation is an
assumption to evaluate, not a conclusion to defend. Dedicated sites may later be
appropriate for contractual isolation, regulation/residency, scale or customization.

There are no real customers or customer data. Do not add backfills, compatibility
aliases, migration adapters or preservation of test IDs/links as a transition cost.
Fresh-site implementation is acceptable. Preserve the assessment runtime and
retained QA identities as evidence infrastructure, not as a legacy product constraint.

Keep aspirational prelaunch marketing and its delivery ledger. Do not silently
remove promises or narrow beta to solo/English-only/unpaid merely to make it pass.
Present conditional scope choices and the owner decisions they require. Distinguish
aspirations from factual uptime/security/compliance claims needing substantiation.

## Evidence qualifications that must survive synthesis

- Phase 2 directly reproduced cross-tenant reads/mutations. Missing hooks alone
  are not the proof. Dedicated sites may reduce cross-business exposure but do
  not prove within-business role safety.
- Phase 3's original cross-run handoff deleted its booking before inspection.
  The reviewed same-run finding used a provider session throughout and persistence
  inference; do not turn it into a fully verified anonymous handoff.
- Phase 4's setup checklist exists but has an action-link contract mismatch.
  Reception input failure is observed in automation with an inferred remount cause.
  Provider completion of its own work through reception is not itself unauthorized.
- Phase 5 independently stored two sequential Guest bookings on the same calendar
  and interval. This is proven capacity failure, not an executed concurrency race.
  The fixture User and location used different timezones; the 06:30 display alone
  did not prove a conversion defect. The management URL returned 404; an explicitly
  host-adjusted route then created an additional booking rather than rescheduling.
- Full keyboard-only use, privacy comprehension and delivered-message discovery
  remain unverified. Small mobile/ARIA checks are not accessibility certification.
- Phase 6 found partial audit tracking, existing Frappe mail/retry/data-import/
  data-request facilities and partial calendar code. They are not all absent,
  and their presence is not proof of complete product behavior.
- No restore, real delivery/retry, concurrent checkout or load drill was executed.
  An empty local QA backup folder is not proof there are no external backups.
  No universal consent-checkbox or jurisdictional compliance conclusion was made.
- Cleanup counts are scoped, not proof of an empty database or exhaustive orphan
  discovery. Existing synthetic history and retained QA access remain preserved.

## Required comparison

Answer: knowing what we know today, how would we build Appointment, and what is
the safest economical path from its current implementation to that product?

Compare at least these options explicitly:

1. Repair the current foundation and integrate its booking/ownership rules.
2. Keep Frappe and useful UI/framework facilities while replacing selected domain
   or booking modules with cleaner interfaces/models on a fresh site.
3. A broader clean rebuild, including its verification and delivery cost.

Separately compare shared-site versus dedicated-site operation where it changes
risk and operating cost. Do not conflate replacing modules, replacing Frappe and
changing tenancy—they are different decisions.

Use concrete defects, working strengths and tests to compare implementation
surface, verification work, operational burden, delivery time and useful behavior
retained. Qualify relative effort estimates; do not invent precise costs, staffing,
benchmarks or dates. Recommend a rewrite only if evidence supports it over the
less expensive safe alternatives. Lack of rewrite evidence is not proof that
incremental repair is trivial or that the current architecture is already sound.

## Deliverables

Create `docs/product-reassessment/phase-07-final-recommendation/analysis.md`
and a concise evidence index. Return the decision, not an inventory:

1. Five-sentence verdict: product fit, architecture, user experience, operational
   readiness and whether customer beta should proceed.
2. Up to five verified strengths to preserve.
3. Up to five weakest points, each with evidence and consequence.
4. Keep / Improve now / Accept temporarily / Replace later table, including the
   clean-start choice and practical action for this pre-customer implementation.
5. Before-beta list containing only requirements that block the chosen complete
   workflow, with scope conditions and explicit unresolved verification gates.
6. A proposed 90-day sequence of small testable changes, dependencies and acceptance
   evidence. Treat it as a planning scenario, not a delivery promise without team
   capacity. Do not implement the changes or publish tickets in this phase.
7. One-to-two-year direction only where present choices create evidenced future
   cost/risk; avoid speculative enterprise machinery.
8. Concrete enterprise-separation triggers and what separate sites do not solve.
9. The three most consequential unresolved owner decisions, with options/tradeoffs.

For each material recommendation distinguish observed fact, supported inference
and product decision. Link to the decisive prior evidence/source references and
state any important counterevidence. Keep the writing plain and concise.

No product code, schemas, dependencies, runtime configuration or secrets in this
branch. No browser/runtime work is necessary unless a small decisive check truly
cannot be resolved from preserved evidence; if used, follow the existing mandated
Agent Plane/Agent Harness and exact-cleanup rules. Do not execute the recovery
drill or dispatch real messages/payments.

Commit and push only Phase 7 documentation/evidence. Return baseline, branch/commit,
files, the recommended option, reasons, principal limitations and three owner
choices. Stop for coordinator review. Do not merge, implement the plan or declare
release approval. This is the final assessment phase, not the implementation phase.
