# Phase 4 — Evidence index

Baseline `edaccef62bb082b3ef02833eaca00f2505f5ed00` (`origin/develop`).
Branch `review/phase-04-organization-experience`.

Runtime: preserved site
`meet-beta-fix-appointment-beta-readiness-01dea7.localhost`, frontend
`http://localhost:49510`, bench `/home/minte/projects/appointment-worktree-runtimes/fix-appointment-beta-readiness-01dea7/bench`.
Loaded app source: the bench `appointment` symlink resolves to
`.../.worktrees/frappe-appointment-readiness` @ `3c57fb4` (checked, unchanged);
no migration or reset was performed; email muted, scheduler paused.

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
| F1 organization setup self-completes | BQA-2026-00096; BQA-2026-00098 `p4-mgr-13-home-dashboard.png`; BQA-2026-00097 `p4-mgr-05-reload-saved-state.png` | `p4-c-manager-surfaces.txt` (home dashboard after org creation) | `appointment/onboarding.py:189-214` |
| F2 provider calendar empty | BQA-2026-00103 `p4-prov-01-calendar.png`; BQA-2026-00105 `p4-prov-mobile-01-calendar.png` | `probes/outputs/p4-e-provider-journey.txt`; `probes/p4_provider_check_probe.py` output; Error Log `Calendar: Get Appointments Error` | `appointment/dashboard.py:424-429,515-519` |
| F3 booking not created | BQA-2026-00100 `p4-rec-02-create-filled.png`, `p4-rec-03-created.png`; BQA-2026-00099 `p4-rec-01-today.png` | `probes/outputs/p4-d-reception-create.txt` | `frontend/.../CreateAppointmentModal.tsx:140-179` |
| F4 walk-in assignment 500 + crash | BQA-2026-00101/00102 `p4-rec-05-walkin-queued.png`, `p4-rec-06-walkin-assigned.png`; BQA-2026-00104 `p4-rec-mobile-01-today.png` | `probes/outputs/p4-d-reception-walkin.txt`; `network-failures.json`/`console-errors.json`; Error Log `Desk API: Assign Walk-In Error` | `appointment/scheduler/api/desk.py:854`; `Appointment.client_email reqd`; `AddWalkInModal.tsx:174-190` |
| F5 no staff/audit/role separation | BQA-2026-00098 `p4-mgr-15-settings-team.png`; BQA-2026-00103 `p4-prov-04-completed-via-reception.png` | `probes/outputs/p4-c-manager-surfaces.txt`, `p4-e-provider-journey.txt` | `frontend/.../pages/settings/team.tsx`; `appointment/hooks.py`; DocType `track_changes` |

## Working-evidence pointers

- Manager organization surface / Add Service / Add Location:
  `p4-mgr-14-settings-manage.png`; location list `p4-mgr-16-settings-location.png`.
- Reception lifecycle saved outcomes: `p4-rec-08-rescheduled.png`,
  `p4-rec-09-cancelled.png`, `p4-rec-10-completed.png` with
  `request_json_value` `15:00:00` / `Cancelled` / `Completed` in BQA-2026-00099.
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
  social-login row. No broad prefix sweep, no job-queue purge, no scheduler
  change. Post-cleanup all business tables are 0 and the four retained users and
  four Browser Accounts / four Browser Sessions remain.
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
4. `assign_walk_in_to_slot` returns 500 for email-less walk-ins and the SPA
   crashes before a usable error state is shown.

## Preservation of raw evidence

Failed runs and their blank/error screenshots are preserved. BQA-2026-00097 is
a stale `Running` run from an early attempt; it is retained as raw evidence and
is not counted as a pass.
