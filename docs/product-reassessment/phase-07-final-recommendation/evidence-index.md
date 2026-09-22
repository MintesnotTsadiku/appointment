# Phase 7 — Evidence index

## Baseline and authority

- Date: 2026-09-22. Repository: `MintesnotTsadiku/appointment`.
- Fetched `origin/develop`: `a170cc4b4bcbbb5ac1cb0bde998014fb71f94927`,
  `docs: accept and merge reviewed Phase 6 assessment`.
- Merge parents: `c1cc1c06346bc6cccf657f34e6a853c2fa8b7571` and
  reviewed Phase 6 `e584d44b82eaef3ce003af3aba785372568690f0`.
- Verified reviewed commit ancestry; `git diff e584d44 origin/develop --
  docs/product-reassessment/phase-06-release-operations` is empty. The original
  unreviewed Phase 6 commit/report is not authority.
- Branch: `review/phase-07-final-recommendation`; separate worktree:
  `/home/minte/projects/training-apps/.worktrees/frappe-appointment-phase-07`.
  Original Appointment checkout was clean on `scheduling`; no checkout switched.
- Read repository README, CONTRIBUTING, reassessment README and browser QA access
  guidance. No tracked Appointment AGENTS.md or CONTEXT.md was found. The older
  CONTRIBUTING instructions to create a site/use main are superseded here by the
  user's explicit documentation-only scope and fetched develop baseline.
- Initial task cwd was Church Management System; its existing modified test file
  was untouched. The supplied runtime-discovery command was unavailable at its
  specified path. No runtime was needed or selected for execution; preserved
  evidence supplies runtime provenance, with its historical qualifications.

Read the **single current reviewed analysis and evidence index** for each phase:

| Phase | Reviewed authority |
|---|---|
| 1 | [Analysis](../phase-01-product-and-domain/analysis.md), [index](../phase-01-product-and-domain/evidence-index.md), [marketing delivery requirements](../phase-01-product-and-domain/marketing-delivery-requirements.md) |
| 2 | [Analysis](../phase-02-platform-architecture/analysis.md), [index](../phase-02-platform-architecture/evidence-index.md) |
| 3 | [Analysis](../phase-03-solo-user-experience/analysis.md), [index](../phase-03-solo-user-experience/evidence-index.md) |
| 4 | [Analysis](../phase-04-organization-experience/analysis.md), [index](../phase-04-organization-experience/evidence-index.md) |
| 5 | [Analysis](../phase-05-customer-experience/analysis.md), [index](../phase-05-customer-experience/evidence-index.md) |
| 6 | [Analysis and release gate](../phase-06-release-operations/analysis.md), [index](../phase-06-release-operations/evidence-index.md), [proposed recovery drill](../phase-06-release-operations/proposed-recovery-drill.md) |

## Decisive checks performed in Phase 7

These are local file/source inspections, not new runtime reproductions.
`git diff edaccef origin/develop -- appointment frontend` is empty: the product
source matches the imported revision recorded in later phases. This does not
newly certify the running process, frontend build or deployment configuration.

| Decision supported | Primary material independently inspected | Result and counterevidence |
|---|---|---|
| Ownership/access replacement | [Phase 2 isolation output](../phase-02-platform-architecture/probes/outputs/phase02_isolation_probe.txt); [desk API](../../../appointment/scheduler/api/desk.py), lines 20–85 and 435–537 | Customer HTTP desk/walk-in reads return B identifiers; standard list is 403. Provider mutation persists in Python probe. Source corroborates unscoped get_all and save(ignore_permissions=True). Missing hooks alone are not proof; Python fixture flags and direct-call scope remain qualifications. |
| Capacity authority | [Phase 5 stored verification](../phase-05-customer-experience/probes/outputs/p5c-verification.json); [slot engine](../../../appointment/scheduler/helpers/slot_engine.py), lines 68–118 | Both sequential Guest attempts succeed; same calendar/start/end stored. Existing checks consider both record types, but Appointment filtering includes location as well as provider. This is not an executed concurrency race. |
| Keep calculations; replace competing orchestration | [availability](../../../appointment/scheduler/availability.py), lines 21–68; [event creation](../../../appointment/overrides/event_override.py), lines 659–680; desk read above | Layered intersection exists; public path creates Booking Event and staff path reads Appointment. Supports a single authority, not a mandatory single physical table. |
| Retain staff behavior; repair calendar and setup contracts | [Phase 4 response summary](../phase-04-organization-experience/probes/outputs/p4c-trace-summary.json), [filter result](../phase-04-organization-experience/probes/outputs/p4c-filter-result.json); [dashboard](../../../appointment/dashboard.py), lines 424–429 and 515–519 | Saved mutations and later reads support retained behavior. Invalid range filter becomes empty success. Checklist exists and returns action_url. Reviewed UI/source evidence qualifies its mismatch with actionUrl; the setup checklist is not absent. |
| Local UX repair remains necessary | [management page](../../../frontend/src/pages/appointment/index.tsx), lines 199–215; [submit hook](../../../frontend/src/pages/booking-v2/hooks/useBookingSubmit.ts), lines 95–118 | Route omits supported reschedule/token arguments; hook maps booking_id. Reviewed Phase 5 responses use event_id. Fixing domain internals alone does not repair these contracts. |
| Preserve regression assets | [scheduling test output](../phase-02-platform-architecture/probes/outputs/phase02_tests_scheduling.txt) | Eight recorded passes, including configuration, reception creation and status changes. These are not least-privileged end-to-end or isolation tests. No tests rerun here. |
| Reuse operational facilities, retain open gates | [Phase 6 verification](../phase-06-release-operations/probes/outputs/p6c-verification.json); event_override.py lines 168–179; local Frappe sources below | Email Queue, Data Import, personal data requests and Version exist. Explicit queue deduplication/retry facilities exist; the call uses job_name without the explicit deduplication parameters. No duplicate delivery or successful retry is thereby proven. |

Framework source spot-checks used installed local files under
`/home/minte/projects/training-apps/apps/frappe/frappe/`: `utils/background_jobs.py`
lines 90–140 (enqueue/retry/deduplicate contract),
`email/doctype/email_queue/email_queue.py` (retry handling), and
`website/doctype/personal_data_download_request/personal_data_download_request.py`
(User-oriented data retrieval). These are corroborating implementation-presence
checks; the durable reviewed framework findings are in Phase 6. No external fact
materially changed the decision, so no external research was needed.

## Qualifications carried into the recommendation

- Phase 3's original cross-run handoff had already deleted the booking. The
  reviewed same-run check used the provider session throughout; persistence at
  inspection is inferred from creation/final cleanup, while the existence query
  failed. It is not a verified anonymous-to-provider handoff.
- Phase 4 reception input loss is observed in automation; nested-component
  remount is an inferred cause, not a proven universal human-input failure.
  Provider completion of its own work through reception is not itself unauthorized.
- Phase 5's fixture User used Asia/Kolkata and location Africa/Addis_Ababa;
  06:30 display alone does not prove a conversion defect. The original management
  link returned 404; the explicitly host-adjusted diagnostic then created another
  booking. Neither test established delivered-message discovery.
- Full keyboard-only use, privacy comprehension and real-message discovery are
  unverified. Small mobile/ARIA checks are not accessibility certification.
  Prior video capture was unavailable; screenshots/traces are not recordings.
- Phase 6 found partial tracking and calendar code plus existing framework
  mail/retry/import/data-request capabilities. Presence is not complete product
  behavior; absence of some tracking flags is not absence of all audit history.
- No restore, real delivery/retry, concurrent checkout or load drill was executed
  in the assessment. An empty local QA backup directory does not inventory
  external backups. No universal consent-checkbox or jurisdictional compliance
  conclusion is supported or proposed.
- Cleanup counts are scoped, not proof of an empty database or exhaustive orphan
  discovery. Synthetic history and retained QA access remain preserved. No Phase 7
  fixture creation, cleanup, browser run, service change or secret access occurred.

## Coordinator verification

Read the Codex task **Complete Phase 7 recommendation** and checked the submitted
report against its instructions. Independently re-read the Phase 2 customer HTTP
isolation output and Phase 5 stored duplicate-booking JSON, and spot-checked desk
query scoping, slot conflict filtering and management submission arguments. These
confirm the decisive access/capacity findings and preserve the distinction between
sequential duplication and an unexecuted concurrency race. The product-source diff
from `edaccef` to the accepted baseline is empty. No new runtime tests were run.

The final recommendation requires an early repair-versus-replacement scope check;
module replacement is not a proven cost saving. Material booking history belongs
in the first working slice, with staff/configuration coverage extended afterward.
The assessment deliverables are complete; implementation and release gates remain
open. This is the consolidated recommendation, not a second assessment.

## Documentation validation and disposition

Phase 7 adds only `analysis.md` and this index. Validation checks local Markdown
link targets and anchors, whitespace, branch/base ancestry and documentation-only
scope. Product tests/builds are unnecessary for this documentation change and
would not close any open gate. Commit/push publishes the assessment for coordinator
review; it is not a merge, implementation authorization or release approval.
