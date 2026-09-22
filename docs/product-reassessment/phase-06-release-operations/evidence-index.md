# Phase 6 — Evidence index

Baseline `c1cc1c06346bc6cccf657f34e6a853c2fa8b7571` (`origin/develop`). Branch
`review/phase-06-release-operations`. Runtime and source-equivalence checks:
`probes/outputs/p6-baseline.txt`.

This index separates executed evidence (probes/prior browser runs) from source
inspection and from untested requirements. Phase 6 ran **no browser journey**; it
reused reviewed Phases 2–5 browser evidence and added read-only backend probes,
because operational readiness is largely non-visual. No credentials, cookies,
tokens, database credentials, backup contents or customer-management links are
committed.

## Runtime and environment

| Item | Recorded value |
|---|---|
| Accepted baseline | `c1cc1c0` — "docs: accept and merge reviewed Phase 5 assessment" |
| Evidence worktree | `/home/minte/projects/training-apps/.worktrees/frappe-appointment-phase-06` |
| Runtime root | `/home/minte/projects/appointment-worktree-runtimes` |
| Runtime | `fix-appointment-beta-readiness-01dea7` |
| Bench | `.../fix-appointment-beta-readiness-01dea7/bench` |
| Site | `meet-beta-fix-appointment-beta-readiness-01dea7.localhost` |
| Browser frontend / Desk | `http://localhost:49510` / `http://localhost:49510/app` |
| Imported Python package | `.../.worktrees/frappe-appointment-beta/appointment/__init__.py` (`edaccef`) |
| Source equivalence | `appointment/`+`frontend/` at `edaccef` and `3c57fb4` identical to `c1cc1c0` |
| Framework | Frappe 17.0.0-dev; apps: frappe, agent_harness, agent_plane, appointment |
| Safety controls | `mute_emails=1`, `pause_scheduler=1`, scheduler inactive (unchanged) |

## Phase 6 executed probes (read-only)

Paths are relative to this phase folder. None creates or deletes records.

| ID | Script | Output | What it establishes |
|---|---|---|---|
| P6-INV-01 | `probes/p6_inventory_probe.py` | `probes/outputs/p6-inventory.txt` | Loaded app path; installed apps; operational toggles; business counts; `track_changes`; hooks; email accounts/queues; abuse-control presence |
| P6-AUD-01 | `probes/p6_audit_monitoring_probe.py` | `probes/outputs/p6-audit-monitoring.txt` | Version-history counts; Error Log discoverability; privacy/deletion/web-form presence; roles; Appointment fields; Booking Event statuses |
| P6-RET-01 | `probes/p6_retained_audit_probe.py` | `probes/outputs/p6-retained-audit.txt` | Retained QA identities/accounts/sessions; exact disposable-prefix child/default/session/auth leftovers; residual synthetic artifacts |
| P6-BASE-01 | git + filesystem checks | `probes/outputs/p6-baseline.txt` | Accepted baseline, imported source equality, empty backups directory, mute/pause flags |

## Findings mapped to evidence

| Finding | Executed evidence | Source / config evidence | Browser Run IDs (prior phases) | What remains unverified |
|---|---|---|---|---|
| F1 Tenant authorization | Phase 2 `P2-PROBE-ISO-01` (`phase-02.../outputs/phase02_isolation_probe.txt`); P6-INV-01 hooks | `appointment/hooks.py:190-196`; `scheduler/api/desk.py:20-85,435-537` | BQA-2026-00106 (customer, anonymous); Phase 2 customer HTTP session | Files, exports, search, realtime, caches, jobs, full write matrix |
| F2 Audit history | P6-INV-01 `track_changes`; P6-AUD-01 Version rows = 0 | `hooks.py` (no Version/audit hook); Phase 2 `P2-PROBE-META-01` | — | Which changes are "essential"; completeness of any future history |
| F3 Communication/integrations | P6-INV-01 Email Account 0; P6-AUD-01 templates/notifications | `event_override.py:168-179,329-330,706`; `helpers/zoom.py:59,107`; empty payments/channels; `google_calendar_override.py:22-41` | BQA-2026-00106 (confirmation UI); Phase 5 F1 | Real delivery, retry, dedup, failure/cancel; calendar connect/revoke |
| F4 Capacity correctness | Phase 5 `p5c-verification.json`, `p5-conflict-probe.txt` | no `for_update`/lock/idempotency in `appointment/`; `event_override.py:706`; mixed timezone defaults | BQA-2026-00113 (competing booking); BQA-2026-00111 | Exact concurrent race; realistic throughput |
| F5 Privacy/reporting | P6-AUD-01 (Consent absent; deletion request 0; web forms; Error Log groups); P6-INV-01 `user_data_fields` | `Footer.tsx:33-35,262-267`; `pages/analytics/index.tsx:14-20,258`; `dashboard.py:284-386` | Phase 5 privacy/comprehension limit | Legal adequacy; retention policy; failed-booking/no-show reporting |

## Prior-phase Browser QA evidence reused

Phase 6 adds no new runs. Browser evidence is the reviewed Phases 3–5:

| Phase | Representative runs | Reused for |
|---|---|---|
| Phase 3 | BQA-2026-00087/88/90/91/92/94/95 | Solo setup failure, unpadded-hour edit, closed-day booking, handoff, mobile booking |
| Phase 4 | BQA-2026-00096/98/99/102/103 | Org setup transition, staff lifecycle, walk-in 500, calendar empty |
| Phase 5 | BQA-2026-00106/109/110/111/112/113 | Confirmation details, management route, recovery, no availability, Amharic, conflict |

Full run IDs, screenshots and traces remain in each phase's own `evidence-index.md`
under `docs/product-reassessment/`.

## Beta gate classifications

| Requirement | Status | Primary evidence |
|---|---|---|
| Tenant authorization/isolation | fail | Phase 2 ISO-01; P6-INV-01 hooks |
| Audit history | fail | P6-INV-01; P6-AUD-01 |
| Backup/restore/recovery | unverified | P6-BASE-01 empty backups; `proposed-recovery-drill.md` |
| Upgrade/rollback | unverified | `.github/workflows` (build-test only); no rollback doc |
| Email delivery/retry/status | fail | P6-INV-01 Email Account 0; Phase 5 F1 |
| Payments/SMS/USSD/WhatsApp/calendar | not implemented | Phase 1 promise table; empty packages |
| Capacity correctness | fail | Phase 5 `p5c-verification.json` |
| Throughput | unverified | no load evidence |
| Privacy/consent/data-rights/retention | fail | P6-AUD-01; `user_data_fields` |
| Import/onboarding | fail | Phase 3 F1 |
| Monitoring/reporting | unverified | `dashboard.py:284-386`; static analytics |
| Subscription/abuse controls | not implemented | no Subscription; `gateway.py:184-204` only |
| Enterprise separation triggers | not applicable (decision) | README product goal |
| Factual marketing claims | unverified | `Footer.tsx:262-267`; Phase 1 |

## Tooling and verification blockers

1. No safe disposable restoration target exists in this environment; restoring
   over the assessment site is forbidden, so the recovery drill is deferred to
   owner approval (`proposed-recovery-drill.md`).
2. Email is muted and the scheduler paused per the phase boundary, so scheduled
   reminders, availability emails and Email Queue retry are not executable here.
3. Video/timeline capture remains unavailable through `appointment.qa_runner.run`
   (Phase 3–5 finding); Phase 6 produced no recordings.
4. `frappe.set_user("Administrator")` is used by read-only probes to read
   metadata; this is inspection, not a customer/staff journey and is not used as
   evidence of role behavior.

## Preservation of raw evidence

Probe scripts and outputs are preserved unchanged. Prior-phase screenshots,
traces and reports are not copied here; they remain in their own phase folders as
the durable evidence. Zero business-table counts do not imply the whole database
is free of QA history; residual synthetic artifacts are disclosed in
`analysis.md` and `p6-retained-audit.txt`.
