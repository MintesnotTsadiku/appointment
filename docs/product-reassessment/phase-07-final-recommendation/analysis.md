# Phase 7 — Final recommendation

Baseline: `a170cc4b4bcbbb5ac1cb0bde998014fb71f94927`, fetched from
`origin/develop` on 2026-09-22. The coordinator's accepted Phase 6 merge includes
reviewed commit `e584d44`; its Phase 6 files match that commit exactly.
[Evidence index](evidence-index.md) records authority, independent checks and limits.
**Fact** means observed execution or inspected source, **inference** means a
conclusion supported by that evidence, and **decision** means a proposed product
or engineering choice requiring review, not an implemented change.

## 1. Five-sentence verdict

Appointment's service, provider and location concepts fit the intended progression from solo professional to organization, but complete product fit remains unproven by the fixture-assisted journeys.
The safest economical direction is **option 2: retain Frappe and useful UI/framework facilities, replace selected ownership and booking modules with clear contracts on a fresh implementation site**, and treat shared-site operation as conditional on verified isolation.
The existing customer progression and staff updates are useful, but broken setup, unreliable schedules and unsuccessful customer management prevent a complete trustworthy experience.
Operational readiness is unverified for recovery, real delivery/retry and cohort load, while partial audit and framework facilities offer a starting point rather than release evidence.
**Customer beta should not proceed** until the chosen complete workflow and its safety, data-handling and operating gates pass; this assessment grants no release approval.

## 2. Five strengths to preserve

| Verified fact | Decision and limit |
|---|---|
| Anonymous booking reaches confirmation on desktop and 390×844 mobile; invalid-email correction can lead to a booking ([Phase 5](../phase-05-customer-experience/analysis.md#coverage-and-strengths-to-preserve)). | Keep the discovery/form progression and validation feedback; this does not prove correct capacity or accessible management. |
| Reception reschedule, cancellation and completion persist; a provider completes its own fixture ([saved responses and later reads](../phase-04-organization-experience/probes/outputs/p4c-trace-summary.json)). | Keep usable work-list interactions and lifecycle actions, under corrected authorization and booking contracts. Shared reception UI is not inherently inappropriate for a provider. |
| Service/EventType binds service, provider and location with overrides; layered availability code intersects hours ([Phase 1 model](../phase-01-product-and-domain/analysis.md#current-domain), [source](../../../appointment/scheduler/availability.py)). | Keep these responsibilities and reusable calculations; their existence does not establish consistent enforcement across entry points. |
| Eight recorded scheduling tests pass, including persisted configuration and staff updates ([output](../phase-02-platform-architecture/probes/outputs/phase02_tests_scheduling.txt)). | Keep and adapt these regression cases; administrator-level tests and a public catalog check are insufficient release coverage. |
| Frappe queues/retry, Version, import and data-request facilities exist; some booking types track changes, and calendar code exists ([Phase 6](../phase-06-release-operations/analysis.md#five-decisive-findings)). | Reuse these facilities and translation/time-presentation resources. Verify their Appointment behavior; do not replace infrastructure merely because integration is incomplete. |

## 3. Five weakest points

| Fact and decisive evidence | Consequence / supported inference | Decision |
|---|---|---|
| A customer HTTP session receives another business's desk records while standard list access returns 403; direct provider/reception calls reproduce foreign mutation/creation ([Phase 2 probe](../phase-02-platform-architecture/probes/outputs/phase02_isolation_probe.txt)). | Custom routes bypass useful framework restrictions; inconsistent ownership/access is a launch blocker. Python mutation probes are not full HTTP mutation coverage. | Replace scattered access decisions with enforced ownership, membership, action and linked-record scope; test every exposed path. |
| Two sequential Guest calls persist separate events on the same calendar/interval ([Phase 5 verification](../phase-05-customer-experience/probes/outputs/p5c-verification.json)); a saved closed weekday still permits booking ([Phase 3 F4](../phase-03-solo-user-experience/analysis.md#f4-a-saved-location-closure-does-not-prevent-customer-booking)). | Capacity and effective-hours guarantees fail without any concurrency race. Correcting one timezone default cannot prove all paths safe. | One write-time availability/capacity contract, explicit instant conversion and atomic reservation; retries need their own idempotency rule. |
| Public creation writes Booking Event while staff lists read Appointment; Phase 3's qualified same-run observation omits the booking, and the calendar range query independently fails ([Phase 3 F2](../phase-03-solo-user-experience/analysis.md#f2-public-booking-and-the-providers-work-list-are-disconnected), [Phase 4 query reproduction](../phase-04-organization-experience/probes/outputs/p4c-filter-result.json)). | Fragmented lifecycle responsibility can hide confirmed work. Two tables alone do not require replacement, and the Phase 3 persistence check was inferential. | Establish one lifecycle owner and explicit calendar projection; remove fabricated fallback rows and error-as-empty responses. |
| Solo setup fails; organization checklist links mismatch; confirmation details are wrong; original management URL returns 404 and a host-adjusted route creates another booking ([Phase 3](../phase-03-solo-user-experience/analysis.md), [Phase 4](../phase-04-organization-experience/analysis.md), [Phase 5 F1/F2](../phase-05-customer-experience/analysis.md#four-decisive-findings)). | Setup through later management is not a complete product. These local UI/API defects also show why domain replacement alone will not finish delivery. | Repair current surfaces against the new contracts; require identity-correct end-to-end acceptance. |
| Material history is partial, appointment data-request mapping has gaps, and recovery/delivery/load remain untested ([Phase 6 gate](../phase-06-release-operations/analysis.md#release-gate)). | Operators cannot yet demonstrate that they can explain, protect and recover a customer's work. This is not proof all facilities or external backups are absent. | Extend existing framework facilities, assign support/recovery responsibility and close the required gates before holding real customer data. |

## 4. Clean-start comparison and disposition

**Decision:** build a modular Frappe application around a business-owned booking
lifecycle. Solo setup creates the necessary business/provider/location structure
without teaching those internals; additional staff, services and locations become
visible when needed. An offering binds service, provider and location; one
booking command checks the actor, linked ownership, effective hours, policy,
remaining capacity and retry identity before persisting a change and its history.
Calendar views and notifications consume that lifecycle rather than independently
owning appointments. Keep contact snapshots; add a scoped customer identity only
when the chosen repeat-customer workflow needs it, with explicit matching rules.
This is a design decision supported by the failures above, not a prescribed schema.

| Option | Implementation surface and retained behavior | Verification and operating burden | Relative effort / judgment |
|---|---|---|---|
| **1. Repair and integrate current foundation** | Align existing public/personal/reception writes, ownership checks, Booking Event/Appointment synchronization and UI contracts. Retains the most existing structure and behavior. | Must prove all paths obey the same access/capacity rules, including generic updates and read models; retains synchronization obligations if both records remain authoritative. Framework operations stay familiar. | Probably quickest for individual UI fixes; total integration effort is uncertain and substantial. Safe if common contracts can be established without keeping competing authorities. A viable fallback, not evidence that repair is trivial. |
| **2. Selective domain/booking replacement on Frappe — recommended** | Replace inconsistent ownership and booking orchestration; keep useful calculations, offering concepts, forms, lifecycle interactions and framework services. Install the coherent model on a fresh site and update current callers/tests together. | Same security, lifecycle and operating gates as option 1, plus regression of retained behavior and fresh-install verification. One authority should reduce future cross-path verification, but that saving is an inference to test. | More initial design and caller changes than a local patch, less reconstruction than option 3. Best-supported balance because confirmed defects cross write/read boundaries and no customer compatibility is needed. Not a measured cost advantage. |
| **3. Broader clean rebuild, potentially replacing Frappe** | Recreate domain logic, UI workflows and integrations; if Frappe is replaced, also select/rebuild access, jobs, mail, audit, import, data requests and deployment facilities. | Must satisfy all the same gates and re-establish functioning behavior, operational skills and release tooling. A new platform does not itself solve tenancy or booking correctness. | Largest likely delivery and verification surface; no comparative prototype, capacity result or framework constraint justifies it today. Reconsider only if a bounded implementation demonstrates that the retained foundation prevents the required guarantees or costs more to operate. |

**Inference and counterevidence:** option 2 targets failures that span creation,
occupancy and staff visibility, rather than spending effort synchronizing legacy
representations that nobody needs preserved. Yet the management route and calendar
query have local fixes, staff mutations already work, and existing checks consider
both booking types. Therefore replacement should be limited to responsibility
boundaries: first prove one vertical booking slice. If integrating existing modules
meets the same contract more simply, use option 1 inside that boundary. There is no
basis for discarding working code to satisfy a rewrite label. No precise staffing,
cost, throughput or completion-date estimate is supported.

| Disposition | Clean-start choice | Practical pre-customer action / condition |
|---|---|---|
| **Keep** | Frappe, usable forms, offering semantics, layered-hour calculations, lifecycle statuses and walk-ins. | Retain behavior under regression checks; keep the [marketing delivery ledger](../phase-01-product-and-domain/marketing-delivery-requirements.md) and aspirations. |
| **Improve now** | Option 2's ownership and booking authority, connected read models and honest UX. | Replace selected internals on a fresh implementation site; update all current callers and deterministic fixtures. No backfills, compatibility aliases, adapters or preservation of old test links/IDs. Preserve the assessment site and QA identities separately. |
| **Improve now** | Minimum accountable operations. | Verify material history, scoped support/data requests, failure visibility and recovery using existing Frappe facilities; implement offered integrations against the booking authority. |
| **Accept temporarily** | Manual but verified support/data-request handling; deferred advanced analytics and automated enterprise export. | Only if the initial cohort's volume, promises and response expectations permit it; assign an operator and prove the process. Never defer access safety, capacity or a necessary lifecycle step. Languages, payments and organizations are not silently excluded. |
| **Replace later** | Integration-specific code, duplicated read models or infrastructure only where measured needs demand it. | After evidence of maintenance or operating limits, replace the smallest constrained module. Neither a second framework nor a universal resource/CRM model is a default roadmap item. |

### Tenancy is a separate choice

| Operation | Risk and useful isolation | Operating cost and release consequence |
|---|---|---|
| Shared site | Requires reliable tenant scoping across APIs, files, jobs, caches, search/export and support. Phase 2 disproves current safety; it does not disprove a corrected shared-site model. | Fewer site deployments/backups/upgrades to manage; tenant-aware support, fairness and verification add work. Recommended conditional default only after the access matrix passes. No measured scale/cost advantage is claimed. |
| Dedicated site per business | Reduces cross-business data exposure through site/database boundaries when configured correctly. Does not establish within-business role safety, booking correctness or private-file protection. | Repeats provisioning, configuration, backups/restores, monitoring, upgrades and incident work per site. Can suit an early contractual requirement, but still needs the same product/recovery gates; not an escape hatch for a broken beta. |

Module replacement, framework replacement and tenancy are independent decisions.
Option 2 can run in either topology; neither topology justifies option 3 by itself.

## 5. Before beta: requirements for the chosen complete workflow

**Proposed acceptance envelope, not approved scope:** solo setup through public
booking, durable confirmation, later self-service reschedule/cancel, provider
schedule and completion/no-show, progressively extended to a small organization
with reception, staff and multiple locations. Retain English/Amharic and advertised
integrations in the delivery ledger. The owner must explicitly stage any capability;
until then its offered-workflow gate remains open. The following are requirements
only where they block that envelope or the owner's explicitly chosen variant.

| Gate | Current evidence | Required closure / condition |
|---|---|---|
| Ownership and access | **Fail** (Phase 2). | Positive/negative HTTP and document tests for Guest, customer, provider, reception and manager, independent tenants, linked records and revocation. Cover exposed file/export/search/realtime/job/cache paths. Dedicated operation still requires within-business tests. |
| Correct booking | **Fail** (Phases 3/5); concurrency **unverified**. | One persisted lifecycle; closed days/exceptions/buffers and policies enforced on every offered write path; same-provider cross-location overlaps checked; sequential and controlled concurrent capacity tests, retries and rollback. An exact interval unique key or a transaction alone is insufficient. Verify business/location/user/browser time precedence and DST for supported zones. |
| Complete visible lifecycle | **Fail/partial** (Phases 3–5). | Fresh setup without fixture intervention; public booking seen by the correct provider under distinct sessions; morning/afternoon changes; accurate details/reference; actual customer-origin link securely changes/cancels the original; honest empty/error states. Mobile, full keyboard-only operation and privacy comprehension remain **unverified**, not certified by small ARIA/Tab checks. |
| Organization extension | **Fail/partial** (Phase 4). | Before organizational use: setup/correction survives reload/new login, staff invite/disable/revocation, scoped workload, reception keyboard creation, walk-in assignment without invented email, provider handoff and organization switching where offered. Solo-only staging requires owner approval. |
| Language and promised integrations | Amharic carry-through **fails**; others partial, missing or **unverified**. | Complete translated journeys with competent language review before Amharic support. Offered confirmations/reminders need sink delivery/failure/retry evidence and real-message discovery in a controlled test. Offered payments need sandbox success/failure/duplicate callback/reconciliation/refund checks; offered channels and calendars need create/change/cancel/revoke/recovery evidence. Paid subscription or business import adds its own acceptance only if required by the cohort. See the Phase 1 ledger. |
| Data, support and factual claims | History partial; notice/mapping gaps; effectiveness **unverified** (Phase 6). | Reconstruct material booking/access/configuration changes; scoped support lookup and failure escalation; verified accountless-customer data correction/export/deletion process, retention and understandable notice for selected purposes/markets. Relevant privacy review decides requirements, not a universal checkbox assumption. Substantiate factual uptime/security/compliance/partner claims; retain capability aspirations. |
| Recovery and bounded operation | **Unverified** (Phase 6). | Owner sets recovery objectives and cohort load; separately approve and execute the [recovery drill](../phase-06-release-operations/proposed-recovery-drill.md) and compatible upgrade recovery, including files and protected configuration. Demonstrate failure alerts, queue recovery and public-booking abuse limits; measure representative cohort capacity. No enterprise-scale benchmark is required. |

A test whose result is absent remains a gate, not a forecasted pass. Framework
facility presence, schema cleanup and accepted assessment documents cannot close
these requirements. Self-service could be staged only with an explicitly approved,
verified assisted change/cancellation workflow and clear customer expectations;
merely hiding the failed route is not a complete workflow.

## 6. Proposed 90-day sequence

This is a dependency-ordered planning scenario, not a delivery promise: no team
capacity is known. Dates below are planning windows; extend them if acceptance
fails or the selected promise set needs more work. No tickets or implementation
are authorized by this report.

| Window | Small testable changes in order | Dependency and acceptance evidence |
|---|---|---|
| Days 1–15 | Decide envelope/topology/time policy; define ownership and booking commands; establish a fresh implementation installation and exact fixtures. Repair the QA path needed to retain bookings across distinct personas and capture required evidence. | Owner decisions below first. Demonstrate one owned service/provider/location, allowed/denied access and safe fixture retention/cleanup through mandated Agent Plane/Harness. Preserve the assessment environment. |
| Days 16–30 | Implement scoped public creation and provider read of the same booking; then sequential capacity rejection, serialized competing writes and retry identity; connect layered hours/time conversion. | Ownership contract precedes writes. Stored-result assertions for overlaps, closures, buffers, retries and rollback; an identity-correct public-to-provider slice. Compare integration versus selective replacement at this checkpoint; retain the simpler safe implementation. |
| Days 31–45 | Add reschedule/cancel on the same lifecycle; fix management identity/origin and confirmation mappings; normalize morning times; repair range query, real empty states and setup contracts. | Booking core first. Fresh solo setup through later management, completion/no-show; original identity retained on reschedule, released capacity correct, unauthorized changes denied. |
| Days 46–60 | Extend setup and lifecycle to staff, second provider/location, reception and walk-ins; implement revocation and essential history. Translate offered journeys and repair input/focus errors in small slices. | Core lifecycle and ownership proven. Manager correction/reload, reception keyboard create, email-less walk-in policy, correct provider work, revocation and scoped history; mobile and keyboard acceptance with language review. |
| Days 61–75 | Integrate each selected notification/payment/calendar/channel separately; finish data-request and support procedures, privacy comprehension and truthful delivery status. | Integrations consume the booking contract; purpose/market decisions precede privacy process. Safe sinks/sandboxes prove retry, duplicate/failure handling and customer discovery; data-request manifest proves bounded results. Scope may require extending this window. |
| Days 76–90 | On separately approved targets rehearse backup/restore and upgrade recovery; measure agreed cohort load/abuse controls; close remaining full-journey regressions and prepare a release decision. | Approved targets/objectives and a candidate release required. Versioned drill report, restored ownership/files, measured limits, alerts/escalation and complete gate record. Any unresolved blocker means continue internal testing, not automatic beta at day 90. |

Privacy/recovery design can begin early; their final evidence must use the actual
candidate. Do not leave foundational access/capacity defects until final testing.

## 7. One-to-two-year direction

**Inference:** the present split lifecycle and indirect ownership already make
visibility, support and later separation harder ([Phase 2 F2/F3](../phase-02-platform-architecture/analysis.md#five-material-findings-and-actions-ordered-by-risk)).
**Decision:** establish deterministic ownership and booking commands now; later
add a tested organization export/import dependency closure when a dedicated move
is actually required. Include membership, bookings/history, files and integration
references, then verify access after import; no current seed-data migration is needed.

**Inference:** each additional channel would multiply today's inconsistency if
it bypassed booking rules. **Decision:** add payments, calendars and channels behind
that same contract with observable outcomes and retry ownership. Do not introduce
microservices or a second queue without measured operating need; Phase 6 shows
existing primitives and no load evidence requiring replacement.

**Decision:** grow customer history, resource capacity and analytics from validated
workflows. Contact snapshots and partial real dashboard calculations are useful
counterevidence to starting a speculative CRM/warehouse. If rooms, equipment or
classes are promised in the initial workflow, their correct capacity is a launch
requirement, not something automatically postponed for two years.

## 8. Enterprise-separation triggers

These are proposed decision triggers, not observed customer requirements:

- A signed requirement for a separate data/control boundary: confirm whether a
  separate site suffices or dedicated infrastructure/key custody is also required.
- A selected market's reviewed residency/regulated-hosting requirement that the
  shared deployment cannot meet: verify the complete storage, backup, logging and
  integration locations; a subdomain alone changes none of these guarantees.
- Measured contention from one business that breaches agreed service objectives
  after reasonable limits/tuning, or recovery needs incompatible with shared-site
  restoration: demonstrate the dedicated deployment can meet those objectives.
- Contracted customization or upgrade timing that cannot safely share the product's
  release cycle: price and staff the additional testing, patching and support.

Separate sites do not fix unauthorized within-business actions, duplicate booking,
broken setup or management, misleading delivery states, privacy process gaps or
unrehearsed recovery. They also do not automatically isolate shared workers,
operator credentials or external accounts. Evaluate actual deployment boundaries.
These conditions follow [Phase 6's gate and recovery scope](../phase-06-release-operations/analysis.md#release-gate), not an assumption that enterprise machinery is needed now.

## 9. Three consequential owner choices

1. **Which complete workflow and promises launch first?** A solo-first staged
   cohort reduces staff/reception work; a small-organization cohort validates the
   intended progression earlier but requires its complete access/setup/handoff
   lifecycle. Choose English/Amharic, self-service versus verified assisted
   management, paid/unpaid and offered integrations explicitly against the
   delivery ledger. Broader scope costs more delivery/verification time; narrower
   scope must be communicated and cannot silently erase aspirations. Also settle
   effective hours/timezone precedence and necessary resource/customer-history
   behavior for that workflow.
2. **What deployment and operating commitment will be funded?** Choose a
   conditionally shared default, dedicated initial sites, or contract-triggered
   dedicated sites; select markets, cohort/load bounds, support responsibility,
   retention and recovery objectives. Shared operation concentrates isolation
   work; dedicated operation repeats maintenance and still needs role safety.
   No evidence supports precise cost or recovery promises yet.
3. **How much internal replacement is authorized before inviting customers?**
   Approve option 2 with the day-30 vertical-slice checkpoint, or option 1 against
   exactly the same gates. A broader rebuild needs comparative evidence of lower
   total implementation/verification/operating cost or an unavoidable framework
   constraint. Fund the verification alongside the implementation; lack of rewrite
   evidence does not make incremental repair small or the current model sound.

Stop for coordinator review. This phase neither merges earlier work nor approves
implementation, recovery/load execution, real dispatch or customer release.
