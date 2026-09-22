# Phase 6 — Release, operations and business readiness

Baseline: `c1cc1c06346bc6cccf657f34e6a853c2fa8b7571` (`origin/develop`, "docs:
accept and merge reviewed Phase 5 assessment"). Branch:
`review/phase-06-release-operations`. Evidence: [evidence-index.md](evidence-index.md);
runtime and source-equivalence checks in `probes/outputs/p6-baseline.txt`.

This phase changes documentation and read-only probe evidence only. No product
source, schema, dependency, migration or runtime configuration was modified. The
preserved site was not reset, migrated or restored. Email remained muted and the
scheduler paused.

## Plain-language operational verdict

**The product is not ready to be operated for external customers.** The customer
demo can work on prepared data, but the operational capabilities a real business
needs are mostly absent or unverified: one business's data can still be read and
changed by another business's users (confirmed in Phase 2), booking capacity can
be double-spent by ordinary sequential actions (confirmed in Phase 5), there is
no historical audit of booking or configuration changes, no configured way to
send or observe customer email, no demonstrated backup/restore, and no
privacy/consent/data-rights handling for appointment data. These are before-beta
blockers, not polish.

The shared-site Frappe direction itself is still the right foundation. Nothing
in the evidence shows that a rewrite would be cheaper than repairing the existing
authorization, capacity, audit, communication and privacy gaps on this codebase.
The least expensive safe path is to fix those invariants on a fresh site with
regenerated fixtures, then verify them — not to replace the application.

## Scope, method and evidence level

Phase 6 reused the reviewed Phases 1–5 evidence and the preserved isolated
runtime. It did not rerun Phase 2's access matrix or repeat Phase 5's browser
journeys. It added three read-only backend probes and source inspection, because
operational readiness is mostly about behavior that has no UI:

- `p6-inventory-probe` — loaded app path, framework/site configuration, business
  counts, audit flags, hooks, queues, email accounts.
- `p6-audit-monitoring-probe` — version history, error-log discoverability,
  privacy/deletion framework presence, web forms, roles.
- `p6-retained-audit-probe` — retained QA identities plus exact child/default/
  session/auth leftovers for every disposable fixture prefix.

For each capability below, the classification is explicit: **source/config
presence** (it exists in code or configuration), **executed behavior** (it was
run and observed), **supported risk** (a plausible mechanism in inspected code),
or **untested requirement** (no evidence either way). A configuration screen is
a lead, never proof.

The imported Python package is `/home/minte/projects/training-apps/.worktrees/
frappe-appointment-beta/appointment/__init__.py` (`edaccef`). Git diff shows the
`appointment/` and `frontend/` trees at `edaccef` and at the bench symlink target
`3c57fb4` are both identical to the accepted baseline `c1cc1c0`. The imported
source therefore matches the assessed baseline; the symlink was not trusted
alone.

## Five decisive findings

### F1. Shared-site tenant authorization is still broken and has no operational containment

- **Finding:** A synthetic customer or staff account can still read another
  business's records through the application APIs, and a staff account can mutate
  them; the app adds no tenant query scoping for its business DocTypes.
- **Why it matters:** This is a demonstrated customer-information disclosure and
  unauthorized-change path. On one shared site it is a launch blocker on its own,
  regardless of how good the booking UX becomes.
- **Evidence (executed):** Phase 2 `P2-PROBE-ISO-01` (`phase-02-platform-
  architecture/probes/outputs/phase02_isolation_probe.txt`): a customer HTTP
  session received another business's Appointment/Walk In identifiers with HTTP
  200 while standard list access returned 403; a provider changed another
  business's appointment to Cancelled. **Evidence (source/config, Phase 6):**
  `appointment/hooks.py:194-196` declares `has_permission` only for Booking Event;
  the `permission_query_conditions` block is commented out (`hooks.py:190-192`);
  the hook inventory in `probes/outputs/p6-inventory.txt` shows no business
  DocType query condition; `appointment/scheduler/api/desk.py` reads with
  `frappe.get_all` and saves with `ignore_permissions=True`.
- **Action: improve now.** Establish deterministic organization ownership and
  enforce actor + membership + permitted action + linked-record scope on every
  entry point (custom APIs and standard list/document access), then add positive
  and negative permission tests. Do not presume a dedicated site fixes the
  application defect: the same code would still be wrong for a single business.
- **Timing:** before any external users.

### F2. Booking and configuration changes have no historical audit

- **Finding:** Material records carry only creation/`modified_by` metadata;
  version history is disabled for Appointment, Organization, Provider, Service,
  Location, EventType, Walk In and Policy, and zero Version rows exist for them.
- **Why it matters:** Support cannot reconstruct who cancelled or rescheduled an
  appointment, who changed availability or pricing, or who altered staff access.
  `modified_by` shows only the last writer, not the sequence of material changes,
  so disputes and incidents cannot be explained.
- **Evidence (executed):** `probes/outputs/p6-inventory.txt` reports
  `track_changes = 0` for the eight DocTypes above and `1` only for Booking Event,
  User Appointment Availability and Appointment Group.
  `probes/outputs/p6-audit-monitoring.txt` reports 0 Version rows for Appointment,
  Organization, Provider, Service, Location, EventType, Walk In and Policy (only
  User Appointment Availability has 158). Phase 2 `P2-PROBE-META-01` reached the
  same tracking conclusion.
- **Action: improve now.** Define the minimum essential history for the chosen
  beta workflow (who changed status, time, contact, availability and staff
  access), implement it, and verify every write path records it. Enabling
  `track_changes` alone is not sufficient proof.
- **Timing:** before beta for the supported booking lifecycle and staff/config
  changes.

### F3. Customer communication and integration delivery cannot be trusted or observed

- **Finding:** No outgoing Email Account is configured, so customer
  confirmations/reminders cannot actually be delivered in this environment; the
  confirmation UI still unconditionally claims a message was sent, booking email
  is enqueued with no deduplication, and there is no visible delivery status.
  Payments, SMS/USSD/WhatsApp and the calendar connection UI remain unimplemented.
- **Why it matters:** A customer who is told a confirmation was sent but receives
  nothing has no reliable way to know the booking exists. Support cannot tell a
  delivery failure from a UI claim. This is the "after the demo" failure mode.
- **Evidence (executed):** `probes/outputs/p6-inventory.txt`: `Email Account`
  count 0, no outgoing accounts, Email Queue 0. `probes/outputs/p6-audit-
  monitoring.txt`: 3 Email Templates and 2 Notifications exist, but no delivery
  account. **Evidence (source, Phase 5 + Phase 6):** Phase 5 F1 shows
  `ConfirmationModal/index.tsx` unconditionally rendering the sent notice and
  mapping the wrong response key. `appointment/overrides/event_override.py:168-179`
  enqueues `send_meet_email` after commit with only a `job_name`, and
  `:329-330` fabricates `…@system.local` addresses when a member has no email;
  `helpers/zoom.py:59,107` defaults meeting creation to `Asia/Kolkata`. Payments
  and channels packages are empty. Retry behavior is a framework Email Queue job
  (`frappe.email.queue.retry_sending_emails`) that cannot run while the scheduler
  is paused.
- **Action: improve now for the promised capabilities; accept temporarily for
  unimplemented ones, tracked as delivery gaps.** Configure a real outgoing
  account in staging, show delivery state justified by queue records, deduplicate
  retries, stop fabricating addresses, and verify send/failure/retry. Keep the
  marketing aspirations and Phase 1 delivery requirements; do not remove promises
  as the default remedy.
- **Timing:** before offering each capability to customers; email delivery and
  honest status before any confirmation-bearing launch.

### F4. Capacity correctness is not guaranteed, and throughput is unmeasured

- **Finding:** Two ordinary sequential bookings can occupy the same provider
  calendar and interval; there is no write-time atomic reservation, no lock and
  no idempotency guard, so this is a correctness defect, not only a hypothetical
  concurrency risk.
- **Why it matters:** A business can be double-booked by two customers who never
  submitted at the same instant, and nothing detects it. Occupancy correctness
  (whether a slot is really taken) is separate from throughput; Phase 6 found no
  evidence for either at realistic scale.
- **Evidence (executed, Phase 5):** `p5c-verification.json` records two Guest
  successes (`BEV00005`, `BEV00006`) stored at the same `09:00–09:30` on the same
  calendar, status Open, with the slot still shown available; `p5-conflict-
  probe.txt` records the offered slot not being marked unavailable. **Evidence
  (source, Phase 6):** no `for_update`, advisory lock or idempotency key anywhere
  in `appointment/`; `event_override.py:706` checks then inserts without a
  transaction lock; slot occupancy and storage use inconsistent timezone
  defaults (empty site timezone, fixture user `Asia/Kolkata`, location
  `Africa/Addis_Ababa`).
- **Action: improve now.** Use one consistent instant/timezone interpretation for
  slot generation, storage, occupancy and acceptance; reject a second booking for
  exhausted capacity at write time inside a transaction; verify sequential and
  controlled concurrent attempts. Measure throughput separately on a disposable
  environment.
- **Timing:** before beta.

### F5. Privacy/consent/data-rights and operational reporting are largely absent

- **Finding:** The product captures customer name, email, phone and notes with no
  consent step; the footer "Privacy Policy", "Terms of Service" and "Data
  Processing Agreement" links are dead anchors; the framework data-request forms
  exist but do not cover appointment data; there is no retention policy; and the
  only operator diagnostics are a noisy Error Log plus setup reminders, with no
  failed-booking, no-show or setup-abandonment reporting.
- **Why it matters:** Customers are asked for personal data without a stated
  basis, cannot reliably have it exported or deleted, and there is no defined
  retention. Operators cannot see or explain failed bookings, no-shows or where
  businesses abandon setup, which is exactly the support load a beta creates.
- **Evidence (executed):** `probes/outputs/p6-audit-monitoring.txt`: no Consent or
  Privacy Settings DocType; `Personal Data Deletion Request` exists but 0
  requests; guest Web Forms `request-data` and `request-to-delete-data` exist, but
  `user_data_fields` (from `p6-inventory.txt`) lists only framework DocTypes and
  no Appointment/Booking Event/Walk In; Error Log groups 88 rows dominated by
  debug noise ("Get Provider Locations Debug" ×43) and internal errors, with
  appointment identifiers in messages. **Evidence (source):**
  `frontend/src/components/layout/Footer.tsx:33-35` uses `#privacy`/`#terms`/
  `#dpa` anchors; `:262-267` claims "99.9% Uptime", "Data Protection Act
  Compliant" and "Bank-Grade Encryption"; `pages/analytics/index.tsx:14-20,258`
  is a static "coming soon" dashboard; `appointment/dashboard.py:284-386`
  (`alerts`) only covers setup gaps.
- **Action: improve now for privacy/consent and minimum operator reporting;
  accept temporarily for advanced analytics.** Add consent capture and a real
  privacy/terms/retention decision, extend the data-rights mapping to appointment
  data, and provide failed-booking/no-show/setup-abandonment signals. Substantiate
  or stage the factual footer claims before public launch.
- **Timing:** privacy/consent/data-rights before collecting real customer data;
  minimum reporting before external users; analytics after beta.

## Beta gate

Proposed responsible **roles** (not named owners) are given so the coordinator can
assign them. An unexecuted drill is not a pass.

| # | Requirement | Status | Proposed responsible role | Evidence | What closes the gap |
|---|---|---|---|---|---|
| 1 | Shared-site tenant authorization/isolation | **fail** | Platform/backend engineer | Phase 2 ISO-01; `hooks.py:190-196`; p6-inventory hooks | Deterministic ownership + server-side scope on all entry points + negative tests |
| 2 | Meaningful audit history (booking/config/staff) | **fail** | Platform/backend engineer | p6-inventory `track_changes`; p6-audit Version rows = 0 | Define essential history; implement; verify every write path |
| 3 | Backup + restore + recovery objectives | **unverified** | DevOps/operations | Empty backups dir; no procedure; `proposed-recovery-drill.md` | Approved bounded restore drill + RPO/RTO decision |
| 4 | Upgrade safety and rollback | **unverified** | DevOps/operations | Patches dir; CI is build-test only; no rollback doc | Documented forward/rollback procedure rehearsed on disposable target |
| 5 | Customer email delivery, retry, dedup, visible status | **fail** | Platform/backend + operations | p6-inventory Email Account 0; Phase 5 F1; `event_override.py:168-179,329-330` | Configure outgoing account in staging; dedup; show real status; verify failure/retry |
| 6 | Payments / SMS / USSD / WhatsApp / calendar connect | **not implemented** | Product owner + integration engineer | Empty payments/channels; Phase 1 promise table | Stage each promise with sandbox evidence before offering it |
| 7 | Capacity correctness (occupancy) | **fail** | Platform/backend engineer | Phase 5 `p5c-verification.json`; no lock/idempotency | Atomic write-time capacity + one timezone interpretation + concurrent test |
| 8 | Operational throughput at realistic scale | **unverified** | DevOps/operations | No load evidence; preserved runtime not stressed | Bounded load test on disposable staging |
| 9 | Privacy, consent, export/correction/deletion, retention | **fail** | Product owner + privacy/legal + backend | No Consent; dead privacy links; `user_data_fields` excludes appointment data | Consent + real policies + data-rights mapping + retention decision |
| 10 | Future-business import/onboarding + failure recovery | **fail** | Product owner + backend | Phase 3 F1 setup failure; `demo_data.py` is demo generation, not import | Working setup contract + import path with validation/rollback |
| 11 | Monitoring: failed bookings, no-shows, setup abandonment | **unverified** | Support lead + backend | `dashboard.py:284-386`; static analytics; Error Log only | Minimum operator diagnostics + metrics with scope and empty states |
| 12 | Subscription/usage limits and abuse controls | **not implemented** | Product owner + backend | No Subscription DocType; rate limit only in `gateway.py:184-204` | Product decision + minimal controls on public booking endpoints |
| 13 | Enterprise separation triggers | **not applicable (decision)** | Product owner | README product goal | Record concrete triggers: contractual isolation, regulation, residency, scale, customization |
| 14 | Factual marketing claims (uptime, partners, payments) | **unverified** | Product owner + marketing | `Footer.tsx:262-267`; Phase 1 factual-claims note | Substantiate or stage claims before public launch |

Items 1, 2, 7 and 9 are release blockers for any external user. Item 5 is a
blocker for a launch that promises confirmations/reminders. Items 3, 4, 8, 11 and
14 are required before operating real customer data safely even if the first
cohort is small.

## Minimum detection, support and recovery before external users

**Detection (must be able to see failures):**
- A reachable, low-noise error/health surface distinct from the raw Error Log,
  with alerting on failed booking writes, failed email sends and stuck jobs.
- Counts/queues for: bookings created vs failed, email delivery state, no-shows,
  and scheduler/job failures.
- A way to tell "no availability" and "empty schedule" apart from "the query
  failed" (Phase 4 F2 shows they are currently indistinguishable).

**Support (must be able to explain and repair without exposing data):**
- Look up a booking by a stable reference and read its true lifecycle.
- Resend a confirmation and correct a customer's contact, with a record of who
  did it.
- A defined support boundary: least-privilege staff access, no credential or
  cross-tenant data exposure, and documented escalation.

**Recovery (must be able to restore and roll back):**
- A documented backup schedule, off-site/encrypted storage, and a retention
  window.
- A **tested** restore into a disposable target, with measured RPO/RTO.
- A rollback procedure for a failed app/schema upgrade, rehearsed.

## Clean-start comparison and least expensive safe transition

| Concern | Current | Clean-start preference | Least expensive safe step |
|---|---|---|---|
| Ownership/authorization | Ad-hoc per-API; unscoped `get_all`; one DocType hook | Deterministic org ownership enforced at every entry point | Enforce scope centrally; add negative tests; keep the DocTypes |
| Capacity | Check-then-insert, no lock, mixed timezones | One authoritative availability decision; atomic write-time reservation | One instant/timezone contract + transaction-scoped overlap check |
| Lifecycle records | Booking Event and Appointment split, no audit | One lifecycle owner with essential history | Trace synchronization; enable/implement history; don't collapse schema reflexively |
| Communication | Enqueue-only, no account, UI claims sent | Delivery state, dedup, retry, honest status | Configure mail; surface queue state; dedup retries |
| Privacy | No consent; dead policy links | Consent + data-rights + retention by design | Consent step; real policies; extend `user_data_fields`; retention decision |
| Operations | No backup/restore/monitoring plan | Backup/restore/rollback/monitoring as platform capabilities | Approve and run the bounded drill; add minimum detection |

**Recommendation:** repair on the existing Frappe foundation; do not rewrite.
The retained value is substantial — layered availability, service/EventType
binding, walk-in handling, statuses, Frappe's job/email/backup facilities, and the
booking UI. No Phase 1–6 evidence quantifies a rewrite that would be cheaper, and
the pre-customer policy permits a fresh site with regenerated fixtures, which
removes any migration cost argument. A rewrite should be considered only if a
concrete implementation/verification comparison later shows the authorization and
capacity invariants cannot be enforced on this foundation.

## Limitations and qualifications

- No new browser journey was run in Phase 6. UX, accessibility, keyboard-only
  operation, privacy comprehension and real-message discovery remain at their
  Phase 3–5 limits and are **not** marked passed. The fixture user and location
  used different timezones; the 06:30 display alone did not prove a conversion
  bug. Confirmed defects (tenant access, capacity, confirmation details,
  management route, closed-day booking, morning edit) remain in the release gate.
- No backup/restore drill was executed (no safe disposable target; restoring over
  the assessment site is forbidden). This is recorded as a gap with a proposed
  drill, not a pass.
- Email was intentionally muted and the scheduler paused, so delivery, retry and
  scheduled reminders were not executed; their absence is not a production
  defect by itself, but the missing Email Account and unverified retry are real
  gaps.
- No concurrency race or load test was executed; Phase 5's sequential duplicate
  is cited as executed evidence, and throughput remains unmeasured.
- Privacy/retention was assessed from code/configuration, not a legal review.
- The runtime has `developer_mode = 1` and is a disposable worktree stack, not a
  production or staging environment. The loaded source equals the accepted
  baseline, but the runtime is not a recovery target.
- Retained synthetic artifacts are disclosed below; zero business-table counts do
  not mean the database contains no QA history.

## Owner decisions needed

1. The first beta audience and complete workflow, and which advertised
   capabilities must be live for it.
2. Whether the first launch is English-only or includes Amharic (Phase 5 F4).
3. The effective business timezone/hours precedence across location, provider and
   user (Phase 3 F4, Phase 5 F3).
4. Whether an unpaid beta is acceptable while payment integrations are staged.
5. Backup RPO/RTO and retention window, and approval of the bounded recovery
   drill.
6. Concrete enterprise separation triggers and the contractual/data-residency
   posture for premium customers.

## Cleanup and retained artifacts (exact)

`probes/outputs/p6-retained-audit.txt` (read-only, 2026-09-22):

- Business tables all **0**: Appointment, Walk In, Booking Event, Appointment
  Group, EventType, Service, User Appointment Availability, Location, Provider,
  Organization, Policy.
- Disposable users all **0** for prefixes `qa-browser-`, `p3b-`, `p4-`, `p5-`,
  `P3B`, `P4`, `P5`; child/default/session/auth/Comment/File leftovers for those
  prefixes all **0**.
- Retained QA identities intact and enabled: manager (Organization Manager),
  provider (Provider), reception (Front-Desk), customer (All, Guest); Browser
  Accounts BACCT-0061/0063/0065/0067 and Browser Sessions BSESS-0062/0064/0066/
  0068 all present.
- Residual synthetic (disclosed, not product business data): Comment 1731,
  Communication 4, Error Log 88, File 520, Email Queue 0. These are retained QA
  history; no queue purge or broad deletion was performed.
- Email muted, scheduler paused (unchanged).

No fixture records were created by Phase 6 probes, so no new cleanup was required.
No credentials, cookies, tokens, database credentials, backup contents or
customer-management links are included in the committed evidence.
