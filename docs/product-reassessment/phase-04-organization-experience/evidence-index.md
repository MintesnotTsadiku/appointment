# Phase 4 — Evidence index

Baseline `edaccef62bb082b3ef02833eaca00f2505f5ed00` (`origin/develop`).
Branch `review/phase-04-organization-experience`.

Runtime: preserved site
`meet-beta-fix-appointment-beta-readiness-01dea7.localhost`, frontend
`http://localhost:49510`, bench `/home/minte/projects/appointment-worktree-runtimes/fix-appointment-beta-readiness-01dea7/bench`.
The bench symlink targets readiness at `3c57fb4`; coordinator inspection of
`appointment.__file__` loads the beta worktree at `edaccef`. No differences exist
in `appointment/` or `frontend/` between these commits. The symlink was not proof
of the imported source. No migration/reset; email muted, scheduler paused.

Raw Agent Plane artifacts live under
`/tmp/agent_browser_qa/appointment/appointment-<scenario>-<UTC>/`. Multi-megabyte
`trace.zip` files and private DOM snapshots stay in that ephemeral store; the
small `report.json`, `network-failures.json`, `console-errors.json` and captured
screenshots are copied into this folder as durable evidence. No passwords,
cookies, session ids, booking access tokens or database credentials are
committed.

## Identities (retained QA personas)

| Persona | User (`auth.username`) | Product role |
|---|---|---|
| Manager | `appointment-review-manager@example.test` | Organization Manager |
| Reception | `appointment-review-reception@example.test` | Front-Desk (spelled `Front-Desk`) |
| Provider | `appointment-review-provider@example.test` | Provider |

Administrator was used only to prepare the downstream fixture and read back
records. The report's `authenticate` action in each run records the actual
session user.

## Runs and artifacts

| Run | Identity | Manifest / scenario | Result | Committed screenshots (`screenshots/`) | Report (`traces/`) |
|---|---|---|---|---|---|
| BQA-2026-00096 | Manager | `p4_a_manager_org_setup.yaml` | Passed | `p4-mgr-01-first-screen`, `-02-org-profile`, `-03-org-profile-filled`, `-04-after-org-save` | `appointment-p4-manager-org-setup-20260921T211202Z-report.json` |
| BQA-2026-00097 | Manager | `p4_b_manager_setup_continue.yaml` (early attempt) | Stale `Running` (killed) | `p4-mgr-05-reload-saved-state` (dashboard after reload) | no report (killed before completion) |
| BQA-2026-00098 | Manager | `p4_c_manager_surfaces.yaml` (7 scenarios) | Passed | `p4-mgr-13-home-dashboard`, `-14-settings-manage`, `-15-settings-team`, `-16-settings-location`, `-17-settings-availability`, `-18-admin-denied`, `-19-reception` | `appointment-p4-mgr-<suffix>-…-report.json` (7 files) |
| BQA-2026-00099 | Reception | `p4_d_reception_lifecycle.yaml` (6 scenarios) | Failed (create + walk-in; reschedule/cancel/complete passed) | `p4-rec-01-today`, `-02-create-filled`, `-03-created`, `-04-walkin-filled`, `-05-walkin-queued`, `-06-walkin-assigned`, `-07-reschedule-form`, `-08-rescheduled`, `-09-cancelled`, `-10-completed` | `appointment-p4-rec-<suffix>-…-report.json` (6 files) |
| BQA-2026-00100 | Reception | `p4_rec_create_handoff` retry | Failed (booking not created) | `p4-rec-02-create-filled`, `-03-created` | `appointment-p4-rec-create-handoff-20260921T214134Z-report.json` |
| BQA-2026-00101 | Reception | `p4_rec_walkin` retry 1 | Failed (duplicate-card selector) | `p4-rec-04-walkin-filled`, `p4-rec-05-walkin-queued` | `appointment-p4-rec-walkin-20260921T213827Z-report.json` |
| BQA-2026-00102 | Reception | `p4_rec_walkin` retry 2 | Failed (assignment HTTP 500) | `p4-rec-06-walkin-assigned` (blank) | `appointment-p4-rec-walkin-20260921T214443Z-report.json` (+ network-failures + console-errors) |
| BQA-2026-00103 | Provider | `p4_e_provider_journey.yaml` (4 scenarios) | Failed (calendar empty, context unreachable; availability + reception-complete passed) | `p4-prov-01-calendar`, `-02-context`, `-03-availability`, `-04-completed-via-reception` | `appointment-p4-prov-<suffix>-…-report.json` (4 files) |
| BQA-2026-00104 | Reception | `p4_f_reception_mobile.yaml` (4 scenarios) | Failed (mobile heading hidden) | `p4-rec-mobile-01-today`, `-02-editor`, `p4-rec-11-admin-denied`, `p4-rec-12-manage-attempt` | `appointment-p4-rec-mobile-…` and `-admin-denied`/`-manage-org-attempt` reports |
| BQA-2026-00105 | Provider | `p4_g_provider_mobile.yaml` (3 scenarios) | Passed | `p4-prov-mobile-01-calendar`, `-02-availability`, `p4-prov-05-admin-denied` | `appointment-p4-prov-mobile-…` and `-admin-denied` reports |

Note: the committed `traces/*` files are named after the ephemeral artifact
directory and include the BQA id inside. A single multi-scenario run shares one
BQA id but produces one artifact directory per scenario.

## Findings → evidence

| Finding | Runs / screenshots | Report / probe evidence | Source |
|---|---|---|---|
| F1 setup transition and checklist contract | BQA-2026-00096; BQA-2026-00098 `p4-mgr-13-home-dashboard.png`; BQA-2026-00097 `p4-mgr-05-reload-saved-state.png` | `p4-c-manager-surfaces.txt` (home dashboard after org creation) | `appointment/onboarding.py:189-214`; `SetupChecklist.tsx:22,305-314` |
| F2 provider calendar empty | BQA-2026-00103 `p4-prov-01-calendar.png`; BQA-2026-00105 `p4-prov-mobile-01-calendar.png` | `probes/outputs/p4-e-provider-journey.txt`; coordinator `probes/outputs/p4c-filter-result.json` (the original provider-probe output/Error Log was not copied into this folder) | `appointment/dashboard.py:424-429,515-519` |
| F3 booking not created | BQA-2026-00100 `p4-rec-02-create-filled.png`, `p4-rec-03-created.png`; BQA-2026-00099 `p4-rec-01-today.png` | `probes/outputs/p4-d-reception-create.txt` | `frontend/.../CreateAppointmentModal.tsx:140-179` |
| F4 walk-in assignment 500 + crash | BQA-2026-00101/00102 `p4-rec-05-walkin-queued.png`, `p4-rec-06-walkin-assigned.png`; BQA-2026-00104 `p4-rec-mobile-01-today.png` | `probes/outputs/p4-d-reception-walkin.txt`; `network-failures.json`/`console-errors.json`; Error Log `Desk API: Assign Walk-In Error` | `appointment/scheduler/api/desk.py:854`; `Appointment.client_email reqd`; `AddWalkInModal.tsx:174-190` |
| F5 incomplete staff lifecycle | BQA-2026-00098 `p4-mgr-15-settings-team.png`; BQA-2026-00103 `p4-prov-04-completed-via-reception.png` | `probes/outputs/p4-c-manager-surfaces.txt`, `p4-e-provider-journey.txt` | `frontend/.../pages/settings/team.tsx`; `appointment/hooks.py`; DocType `track_changes` |

## Working-evidence pointers

- Manager organization surface / Add Service / Add Location:
  `p4-mgr-14-settings-manage.png`; location list `p4-mgr-16-settings-location.png`.
- Reception lifecycle saved outcomes: `p4-rec-08-rescheduled.png`,
  `p4-rec-09-cancelled.png`, `p4-rec-10-completed.png` with
  response records and later reads preserved in `probes/outputs/p4c-trace-summary.json`.
  Request-payload assertions alone are not proof of persistence.
- Out-of-authority refusals: `p4-mgr-18-admin-denied.png`,
  `p4-rec-11-admin-denied.png`, `p4-prov-05-admin-denied.png` — all HTTP 403 on
  `appointment.dashboard.admin_stats`.
- Mobile: `p4-rec-mobile-01-today.png` (real appointments + walk-in queue),
  `p4-prov-mobile-01-calendar.png` (empty), `p4-prov-mobile-02-availability.png`.

## Fixtures, ownership and cleanup

- Manager-created organization (UI): `P4 Organization`,
  `owner_user = appointment-review-manager@example.test`.
- Downstream fixture (`probes/p4_fixture_probe.py`, Administrator, labelled):
  `P4 Provider One` (user = retained provider), `P4 Provider Two`
  (`p4-provider-two@example.test`), `P4 Location Alpha/Beta`,
  `P4 Service Alpha/Beta`, two `P4 EventType`s, one `User Appointment
  Availability`, appointments `P4-APT-RESCHED/-CANCEL/-COMPLETE/-WORKLOAD`.
- UI-created records: three `P4 Walk-In Client` walk-ins (two failed
  assignment attempts) and the reschedule/cancel/complete status changes on the
  fixture appointments.
- Cleanup (`probes/p4_cleanup_probe.py`, `probes/outputs/p4-cleanup.txt`):
  removed 3 providers, 1 organization + its manager child, 2 services,
  2 locations, 2 event types, 1 availability, 4 appointments, 3 walk-ins, and
  the disposable user (`p4-provider-two@example.test`) with 4 `Has Role` and 1
  social-login row. The script actually uses prefix filters and direct parent deletes; its normal
  deletion helper is not called. Parent totals were zero, but child/default cleanup
  was incomplete. See the coordinator audit below. No job queue or scheduler
  changes were made.
- `P4` records were created for this phase only; the retained `appointment-review-*`
  users were never renamed or given new credentials.

## Tooling blockers (see analysis.md)

1. `appointment.qa_runner.run` does not forward `capture_video` /
   `capture_instruction_timeline`; `run_browser_qa_manifest` defaults override
   the manifest, so every run reports `video: failure` and `video_file: None`.
   Recordings are not producible through the mandated entry point without a
   source change; screenshots, DOM snapshots, report JSON and traces are used.
2. One `auth` per manifest; no per-scenario identity switching, so the
   customer→provider handoff cannot be one continuous run.
3. `qa_fixtures.teardown()` removes new Booking Events/Appointment Groups by
   snapshot; an Appointment created via the reception UI (client name not
   `QA-BROWSER-%`) survives, which is why the fixture/reception-and-provider
   check uses clearly labelled records.
Walk-in assignment/error rendering is a product finding (F4), not a tooling blocker.

## Preservation of raw evidence

Failed runs and their blank/error screenshots are preserved. BQA-2026-00097 is
a stale `Running` run from an early attempt; it is retained as raw evidence and
is not counted as a pass.

## Verified evidence and final cleanup

- `probes/outputs/p4c-trace-summary.json` exports selected saved response fields:
  successful update records and subsequent reads, walk-in email validation
  failures, calendar responses, and the manager checklist's `action_url` contract.
  `probes/p4c_trace_extract.py` reproduces a broader allowlisted response extract
  from the exact `/tmp` trace paths; the committed summary selects decisive
  records. Headers, cookies and tokens are not exported.
- The checklist response says 3/7 complete and returns snake-case `action_url`.
  The screenshot confirms the checklist exists. The current component expects
  camel-case `actionUrl`; it does not render those action buttons. This is a
  source-supported mechanism, not a new coordinator browser run.
- `probes/p4c_filter_check.py` and `outputs/p4c-filter-result.json` independently
  reproduce the invalid date-range query, with a supported `between` control.
  This read-only check used the empty preserved QA site and created no fixtures.
- `probes/p4c_audit.py` audited only known P4 parent identities and the disposable
  user. `outputs/p4c-before-cleanup.json` lists 38 orphan children plus one user
  default; there were no authentication or session records for that user.
- `probes/p4c_complete_cleanup.py` consumed that exact audit manifest (copied to
  `/tmp/p4-audit.json` for execution), asserted each parent remained absent and
  deleted only matching child identities and the disposable user's default.
  `outputs/p4c-after-cleanup.json` verifies zero targeted leftovers, ten empty
  business tables, four retained users, four Browser Accounts and four Browser
  Sessions, with email muted and scheduler paused. It also records the actually
  imported Python app path.
- The original evidence is preserved. Unsupported claims in raw reports and
  script docstrings are qualified by this index and the single current analysis.
- Coverage gaps remain: manager correction/full setup, staff revocation,
  multi-organization switching, provider availability save and complete mobile
  operations. Site-admin 403 checks are not tenant-isolation certification.
