# Phase 6 — Release, operations and business readiness

Baseline: `c1cc1c06346bc6cccf657f34e6a853c2fa8b7571`.
Branch: `review/phase-06-release-operations`.
Evidence: [evidence-index.md](evidence-index.md).

**Recommendation: accept this bounded operational assessment; do not launch to
external customers.** The unchanged product still has demonstrated tenant-access
and sequential duplicate-booking failures. Material change history, customer-data
handling and recovery need stronger evidence before operating real businesses.
Mail delivery and other integrations must be verified for the capabilities
actually offered. An intentionally muted development site cannot certify or
represent production readiness.

Repair on the existing Frappe foundation is the best-supported direction so far,
not a certification of the shared-site architecture. Phase 7 must compare repair
with a clean-start alternative using implementation and verification effort.
No evidence establishes that a rewrite is cheaper. No real customers or customer
data exist, so there is no obligation to preserve seed formats, old internal APIs
or historical data. A fresh-site implementation remains an option; this assessment
did not reset or alter the preserved site.

## Scope and evidence strength

Phase 6 used source inspection and three read-only probes. The coordinator checked
material references and added `p6c_verify.py` to inspect configuration-presence
flags and booking indexes without reading secret values into evidence. No browser
journey, delivery/retry test, restore, concurrency race or load test was executed.
Prior Phases 2–5 supply the cited executed behavior; it was not rerun here.

The imported package is the beta worktree at `edaccef`, while the bench symlink
points to readiness at `3c57fb4`. Both `appointment/` and `frontend/` trees match
`c1cc1c0`. Source-equivalent prior failures remain relevant, but untested operational
behavior is not converted into a fail or pass by source inspection alone.

No product source/schema/dependencies/configuration changed. Email remains muted
and the scheduler paused. Configuration may reveal readiness gaps, but absence
of records in this deliberately empty QA site is not evidence that the framework
lacks a capability.

## Five decisive findings

### F1. Shared-site authorization remains a demonstrated launch blocker

- **Finding:** Phase 2 reproduced cross-business reads through customer/staff
  APIs and a provider changing another business's appointment; that product source
  is unchanged.
- **Why it matters:** External businesses cannot safely share this application
  while those paths disclose or change each other's records.
- **Evidence:** Phase 2 `P2-PROBE-ISO-01` and reviewed analysis; Phase 6 hook
  inventory; `scheduler/api/desk.py` uses unscoped `get_all` and permission-bypassing
  writes in the affected paths. An absent query hook alone is not the proof—the
  actual requests and saved changes are. The full endpoint matrix is not tested.
- **Action:** improve now. Establish consistent ownership, membership and linked-
  record authorization across custom and standard entry points; verify allowed
  work as well as denied cross-tenant actions. Dedicated sites can reduce
  cross-business exposure but do not establish correct within-business roles.
- **Timing:** before shared-site customer launch; role security before any launch.

### F2. Capacity acceptance fails even without concurrency

- **Finding:** Phase 5 stored two distinct Booking Events on the same calendar
  and interval from sequential Guest calls while the slot remained available.
- **Why it matters:** Ordinary customer actions can promise the same capacity
  twice. Throughput and a simultaneous-request race are separate questions.
- **Evidence:** Phase 5 `probes/outputs/p5c-verification.json`; its browser conflict
  scenario and original slot probe. Coordinator `p6c-verification.json` shows only
  primary-key uniqueness on Booking Event, and name/appointment-ID uniqueness on
  Appointment. These are not capacity constraints. The inspected public write
  path has no effective atomic overlap guard; the failure is established by the
  stored duplicate, not by keyword searches for locks.
- **Action:** improve now. Share one effective availability/timezone decision and
  atomically enforce remaining capacity at acceptance. Define idempotency for
  retries separately from conflict detection. Test sequential duplicates,
  controlled races and retry behavior, then measure throughput for the initial
  cohort. Merely enclosing a check and insert in a transaction is insufficient
  unless competing writes are actually serialized or otherwise constrained.
- **Timing:** before beta.

### F3. Essential change history is incomplete across booking paths

- **Finding:** Eight inspected DocTypes, including Appointment, Organization,
  Provider, Service, Location and Walk In, have `track_changes=0`; other booking
  DocTypes do enable tracking. Complete historical reconstruction is not verified.
- **Why it matters:** Last-writer metadata cannot reliably explain earlier
  reschedules, status changes or staff/configuration decisions during support.
- **Evidence:** `p6-inventory.txt` records tracking enabled for Booking Event,
  User Appointment Availability and Appointment Group. `p6-audit-monitoring.txt`
  contains 158 availability Version rows and 898 Version rows overall. Zero rows
  for deleted/empty business fixtures do not prove that no history can ever exist.
  Phase 4 also verified real `modified_by` attribution on successful mutations.
- **Action:** improve now. Define the minimum material history needed for the
  chosen lifecycle, reuse existing Frappe tracking where appropriate, and verify
  status/time/contact, availability and access changes across all write paths.
  Verify tenant-scoped access and retention of history. Do not create a second
  audit system merely because some DocTypes lack tracking.
- **Timing:** before the corresponding customer/staff workflow launches.

### F4. Confirmation claims exceed verified communication behavior

- **Finding:** Phase 5's UI claims an invitation was sent without evidence of
  delivery. This QA site has no Email Account records or configured `mail_server`,
  and sending/retry behavior has not been exercised.
- **Why it matters:** Customers and support need to distinguish a saved booking,
  queued notification and delivery failure; a success label is not a receipt.
- **Evidence:** Phase 5 F1; `p6-inventory.txt`; `p6c-verification.json` checks the
  configuration fallback by presence only. Frappe's
  `EmailAccount.find_default_outgoing` supports site-config accounts as well as
  database records and a muted dummy account, so count zero alone was insufficient.
  `event_override.py:168-179` enqueues `send_meet_email` using `job_name`, without
  `job_id`/`deduplicate`; installed `background_jobs.enqueue` requires those for
  its explicit deduplication option. Actual duplicate delivery was not reproduced.
- **Action:** improve now for offered notifications. Verify a staged/sink delivery
  path, meaningful status, failure/retry and duplicate-handling semantics while
  keeping the assessment site muted. Reuse framework queues/retries; do not claim
  they are absent. Preserve actual customer contacts rather than inventing email
  addresses for missing ones.
- **Timing:** before offering confirmations/reminders through that channel.

Payments and messaging-channel packages remain delivery gaps. Google Calendar
and Zoom code, authorization callbacks and scheduler hooks exist; calendar
integration is partial/unverified, not wholly unimplemented. The ordinary
connection experience and connect/sync/revoke/failure behavior need evidence
before being offered. No real external account or delivery was used here.

### F5. Appointment-specific data handling and operational visibility need closure

- **Finding:** The inspected footer has placeholder policy links; the framework
  personal-data hooks do not map Appointment/Booking Event/Walk In customer data;
  and no complete appointment-specific request/retention process was verified.
  Error logs exist, but useful operational detection is not demonstrated.
- **Why it matters:** The business needs an understandable explanation of data
  use, a verified way to locate/correct/export/remove appropriate records, and a
  way to notice and explain failed bookings without exposing another tenant.
- **Evidence:** `Footer.tsx:33-35`; `p6-inventory.txt` hook inventory and
  `p6-audit-monitoring.txt`. Installed `personal_data_download_request.py:get_user_data`
  reads the hook mapping; its request implementation expects a User, while public
  bookings may be accountless. Framework data request/deletion forms are present.
  Absence of a DocType named Consent is not proof of a legal violation or that
  every booking requires a consent checkbox. Error Log contains 88 rows, 43
  labelled provider-location debug; static analytics is not a functioning
  operational dashboard. No alert/failure-recovery drill was run.
- **Action:** improve now for data handling and minimum support visibility.
  Define notice, purposes, required contact data, retention and request identity
  verification for the selected markets/workflows, including accountless customers.
  Obtain the relevant privacy review; use consent where the chosen purpose requires
  it rather than adding a universal checkbox by assumption. Extend and test
  framework capabilities instead of assuming they cover appointment data.
  Provide scoped booking lookup, error/delivery/job status and an escalation path.
  Advanced no-show/abandonment analytics can follow beta unless the chosen service
  requires them. Substantiate factual security/uptime claims before customer launch.
- **Timing:** data-handling and minimum support process before real customer data;
  advanced reporting after beta where safely deferrable.

## Release gate

Statuses describe the evidence, not legal certification. Responsible roles are
proposals, not assigned people. “Unverified” remains a gate when required for the
chosen release; it is not a pass or proof of absent implementation.

| Requirement | Assessment | Proposed responsible role | Evidence / closure |
|---|---|---|---|
| Shared-site isolation | Fail | Backend/platform | Phase 2 reproduction; verified ownership and negative/positive access tests |
| Booking capacity | Fail | Backend/platform | Phase 5 stored duplicates; atomic capacity, timezone and retry tests |
| Complete chosen customer/staff lifecycle | Fail | Product + engineering | Reviewed Phases 3–5 blockers; end-to-end acceptance including management |
| Material change history | Partial; completeness unverified | Backend + support | Mixed tracking metadata; test reconstruction across relevant writes |
| Delivery/status/retry | UI status fails; delivery unverified/unconfigured here | Backend + operations | Stage a safe delivery/failure/retry test for offered channels |
| Privacy and data requests | Product mapping/notice gaps; legal adequacy unassessed | Product + privacy specialist + backend | Real policy/process, accountless identity verification, bounded export/correction/deletion drill |
| Backup and restore | Unverified | Operations | Empty local QA backup folder is not proof of no backups elsewhere; approved restore drill required |
| Upgrade recovery/rollback | Unverified | Operations + backend | Version-pinned recovery procedure; test code/schema compatibility and post-restore behavior |
| Operational monitoring/support | Unverified; framework primitives exist | Operations + support | Detect booking, job and delivery failures; scoped lookup, meaningful alerts and escalation |
| Performance/capacity planning | Unverified | Operations + backend | Explicit initial load target and bounded measurements; not speculative enterprise-scale testing |
| Calendar integration | Partial/unverified | Integration engineer | Existing callback/sync code; test connect, sync, revoke and recovery before offering |
| Payments/SMS/USSD/WhatsApp | Delivery gaps | Product + integration engineer | Phase 1 promise ledger; staged evidence for each offered capability |
| Future-business import | Unverified; framework Data Import exists | Product + backend | Decide cohort need; test supported entities, validation and recovery if required |
| Subscription/billing limits | Scope decision; no demonstrated product flow | Product | Decide unpaid/paid beta; do not require subscription machinery for an unpaid cohort |
| Public-endpoint abuse controls | Partial/unverified | Platform/operations | Gateway limiter exists; framework site limiter is available but unset here; verify public-booking coverage and deployment limits |
| Enterprise separation | Decision, not a test result | Product + operations | Define contractual, regulatory/residency, scale and customization triggers |
| Factual marketing claims | Unverified | Product/marketing | Keep aspirations; substantiate uptime/security/compliance/partner claims before launch |

Tenant authorization and booking capacity independently block launch. Fix the
chosen lifecycle, verify minimum history/data handling/support, and demonstrate
recovery before holding real customer data. Delivery, import, integrations and
monetization gates depend on the capabilities offered; do not silently narrow
scope to evade a failed promise. Full keyboard operation, privacy comprehension
and delivered-message discovery remain Phase 5 acceptance gaps.

## Minimum operating model and clean-start comparison

Start with a scoped way to find a booking by stable reference, explain its changes,
distinguish unavailable slots from query failures, and see notification/job states.
Define who responds to failures and what they may access. Prefer useful existing
Frappe logs, queues and tracking over inventing parallel infrastructure; configure
and verify them before treating them as sufficient.

A clean design would share ownership and booking rules across entry points and
make every material write, customer notification and recovery step explainable.
Repairing those boundaries retains functioning UI paths and framework facilities.
Existing layered availability and walk-in handling contain proven defects, so
retain verified strengths rather than claiming every existing subsystem works.
Do not insist on keeping current DocTypes or synchronization solely for seed-data
compatibility. Phase 7 should compare targeted repair, replacement of selected
modules and a broader rebuild, including verification effort and delivery time.

Recovery needs more than application rows: database, public/private files,
versioned code/dependencies and protected configuration/encryption material must
be recoverable together. See [proposed-recovery-drill.md](proposed-recovery-drill.md).
No safe target was established for this phase; the drill remains unexecuted. An
empty backup folder on this QA site and old planning documents do not prove a
production recovery plan exists or that none could exist externally.

## Decisions, limitations and disposition

Owner decisions: first audience and complete workflow; offered languages and
channels; effective hours/timezone precedence; recovery point/time objectives and
retention; paid/unpaid beta and enterprise-separation triggers. Privacy obligations
need evaluation for the selected markets and purposes, not assumptions based on
DocType names. Those decisions do not weaken the demonstrated access/capacity
failures.

This is a sufficient bounded assessment for Phase 7 synthesis after acceptance
and merge. No additional Phase 6 agent loop is required to discover that launch
is blocked. Unexecuted restore, delivery, concurrency and load drills remain
release-verification work and must never become passes in the final report.

No fixtures were created or deleted in Phase 6. The original retained audit found
zero parent business records and zero matches in its selected user-prefix checks,
with all four retained QA identities and Browser Accounts/Sessions present.
It did **not** inspect every child table or all historic prefixes: Has Role was
the only child table queried, and Comment/File matches were by owner, not all
references. Therefore it is a scoped inventory, not an exhaustive orphan audit.
Its totals (Comment 1731, Communication 4, Error Log 88, File 520) are retained
records, not individually proven synthetic artifacts. No unrelated cleanup was
performed. The coordinator's added probe was also read-only; mail stayed muted
and the scheduler paused.
