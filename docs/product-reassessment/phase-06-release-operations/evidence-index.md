# Phase 6 — Evidence index

Baseline `c1cc1c06346bc6cccf657f34e6a853c2fa8b7571`.
Branch `review/phase-06-release-operations`.
The current `analysis.md` is the single reviewed recommendation. Original probe
outputs remain unchanged and must be read within the scope of their queries.

## Runtime and execution

Preserved site `meet-beta-fix-appointment-beta-readiness-01dea7.localhost`;
frontend `http://localhost:49510`; runtime
`/home/minte/projects/appointment-worktree-runtimes/fix-appointment-beta-readiness-01dea7`.
Imported Python is the beta worktree at `edaccef`; bench symlink targets readiness
at `3c57fb4`. Both product source trees match `c1cc1c0`, confirmed by git comparison.
Framework reports Frappe 17.0.0-dev. Email muted; scheduler paused. No browser runs,
fixtures, migrations, delivery, load tests or restore drills were performed here.

| Check | Script / output | What it proves and does not prove |
|---|---|---|
| P6-INV-01 | `probes/p6_inventory_probe.py`; `outputs/p6-inventory.txt` | Metadata, hook/account/configuration snapshot; not executed delivery or framework absence |
| P6-AUD-01 | `probes/p6_audit_monitoring_probe.py`; `outputs/p6-audit-monitoring.txt` | Version/log counts, forms and selected DocType presence; not completeness of history, privacy adequacy or monitoring effectiveness |
| P6-RET-01 | `probes/p6_retained_audit_probe.py`; `outputs/p6-retained-audit.txt` | Retained accounts and selected prefix-based counts; not every child/reference or every prior fixture prefix |
| P6-BASE-01 | `probes/outputs/p6-baseline.txt` | Baseline/source equivalence and safety settings; local backup-directory observation does not inventory external backups |
| P6C-VERIFY | `probes/p6c_verify.py`; `outputs/p6c-verification.json` | Read-only mail/rate-limit configuration-presence flags, unique index columns and framework DocType availability; no secret values or network delivery |

All `outputs/` entries above reside under `probes/`. Inspection runs use
Administrator for metadata, not as evidence of customer/staff permissions.

## Reviewed findings and primary evidence

| Finding | Executed evidence | Source support / boundary |
|---|---|---|
| F1 Tenant access | Phase 2 `P2-PROBE-ISO-01`, reviewed analysis and isolation probe output | Unchanged affected desk API paths; missing hooks alone are not proof |
| F2 Capacity | Phase 5 `probes/outputs/p5c-verification.json`, browser BQA-2026-00113 and original conflict probe | Two sequential Guest writes stored on the same calendar/interval; current indexes do not constrain capacity; concurrency/load not executed |
| F3 History | P6-INV/P6-AUD | Eight DocTypes disable tracking, three booking/availability DocTypes enable it; availability has 158 Version rows. Empty/deleted fixture counts cannot prove universal absence |
| F4 Communication | Phase 5 F1 and BQA-2026-00106; P6C configuration flags | `event_override.py:168-179`; Frappe `email_account.py:493-539` supports site-config fallback; `background_jobs.py:98,120-130` exposes explicit deduplication; delivery/retry untested |
| F5 Data handling / visibility | P6 hook/form/log inventory | Footer placeholder links; framework `personal_data_download_request.py:insert,get_user_data` expects User and hook mappings. No appointment mapping shown; legal/privacy adequacy and complete deletion not tested |

Framework sources were inspected locally at
`/home/minte/projects/training-apps/apps/frappe/frappe/`.

Additional source checks:

- `appointment/overrides/google_calendar_override.py` implements authorization
  callback behavior; Booking Event and framework hooks contain calendar sync.
  This is implementation presence, not verified connect/revoke/retry behavior.
- `frappe/rate_limiter.py:16-18` supports a site-wide limiter; the preserved site's
  setting is absent. `appointment/api/gateway.py:184-204` has a separate limiter.
  Reverse-proxy/deployment controls were not surveyed.
- Framework Data Import and personal-data request DocTypes exist. Their presence
  does not prove organization import or accountless-customer requests work.
- `docs/technical/ARCHITECTURE_DIAGRAM.md` and older integration/rename documents
  discuss backups/rollback. These are historical context, not an approved and
  rehearsed production recovery runbook. “No document mentions rollback” was too
  broad; “no verified recovery procedure in this evidence” is supported.

## Reused browser evidence

No Phase 6 browser runs were added. Relevant prior evidence remains in its phase:

- Phase 3: BQA-00087/88/90/91/92/94/95, with reviewed identity/cleanup limits.
- Phase 4: BQA-00096/98/99/102/103, setup, reception updates, walk-in failure and calendar.
- Phase 5: BQA-00106/109/110/111/112/113, confirmation, management, bounded recovery,
  language/mobile and competing booking. These are full IDs prefixed `BQA-2026-`.

The Phase 2 isolation proof is its actual HTTP probe; unrelated anonymous booking
runs are not evidence of cross-tenant access. Likewise the no-availability browser
run is not capacity/concurrency proof. Full run paths and artifacts are in the
respective phase indexes.

## Release gate and blocked verification

The authoritative gate is in `analysis.md`. Confirmed access/capacity/UX failures
remain failures. Recovery, deployment, throughput and relevant framework behavior
remain unverified until exercised. Audit/data handling have identified coverage
gaps; payments/messaging differ from partial calendar implementation.

No safe restoration target was established; restoring over the assessment site
is prohibited. The revised `proposed-recovery-drill.md` defines a separate bounded
verification without destroying its synthetic source. No claim is made that a
safe target could not be provisioned with authorization.

Email mute/pause controls intentionally prevent real dispatch in this assessment.
They do not establish that retry logic is absent or that a future isolated mail
sink test is impossible. Video capture remains a known wrapper limitation, but
no Phase 6 recording was attempted.

## Retained evidence and privacy

P6-RET reports eleven empty business tables and four retained enabled QA users,
with their four Browser Accounts/Sessions. Selected user-prefix defaults, roles,
sessions/auth and owner-based Comment/File matches are zero. It does not inspect
all business children, reference fields or original `p3-` identities. Raw totals
are retained records, not individually classified synthetic records. No cleanup
was needed for these read-only probes or performed against unrelated history.

No passwords, cookies, tokens, mail configuration values, backup contents or
customer-management links are included in the added coordinator evidence.
