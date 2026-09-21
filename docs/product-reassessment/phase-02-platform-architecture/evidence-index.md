# Phase 2 — Evidence index

All evidence below comes from the preserved isolated QA site and the branch in
this checkout. No credentials, sessions, tokens, passwords, or private data are
recorded. The isolated runtime was not modified, migrated, or restarted for this
phase; email and the scheduler remain disabled.

## Identifiers

| Item | Value |
|---|---|
| Review branch | `review/phase-02-platform-architecture` |
| Baseline commit (accepted input) | `4d450ffe4c36270d55c406d5d29531e81da29c31` (`origin/develop`) |
| Phase 1 / QA runbook merged | Yes (`4d450ff` is the remote `origin/develop` tip; confirmed via `git rev-parse origin/develop`) |
| Evidence checkout | `/home/minte/projects/training-apps/.worktrees/frappe-appointment-phase-02` |
| Declared runtime source | `fix/appointment-beta-readiness @ 3c57fb4c…` (`apps/appointment` symlink) |
| Loaded runtime package | `/home/minte/projects/training-apps/.worktrees/frappe-appointment-beta/appointment` (develop `4d450ff`, clean) — identical commit to this checkout |
| Runtime site | `meet-beta-fix-appointment-beta-readiness-01dea7.localhost` |
| Frontend / backend | `http://localhost:49510` / `http://127.0.0.1:49511` |
| Scheduler / email | paused `pause_scheduler=1`; muted `mute_emails=1` (read from `common_site_config.json`) |
| Certified environment | `appointment-foundation-runtime/venv`, foundation bundle `2026.07.2` (declared; preflight not re-run this phase) |

Source equivalence: `git diff 3c57fb4..4d450ff --name-only` returns only
`README.md`, `docs/product-reassessment/**`, `package.json`, `pyproject.toml` —
no product code differs. The loaded Python package is the `frappe-appointment-beta`
checkout at the same commit as this evidence branch, so browser/probe results
reflect the baseline source.

## Probe and test entry points

Probes are self-cleaning Python scripts run against the preserved bench with the
certified environment. They create a clearly marked synthetic dataset
(`P2ISO`, `example.invalid`), verify findings, then delete everything they created
in a `finally` block. They never touch retained identities.

```bash
# run_probe.sh sets cwd to the bench sites dir and uses the bench env python
bash probes/run_probe.sh probes/phase02_<name>_probe.py
```

| Run ID | Probe | Command | Output artifact |
|---|---|---|---|
| `P2-PROBE-SMOKE-01` | `phase02_readonly_smoke_probe.py` | `bash probes/run_probe.sh …` | `probes/outputs/phase02_readonly_smoke_probe.txt` |
| `P2-PROBE-INV-01` | `phase02_inventory_probe.py` | `bash probes/run_probe.sh …` | `probes/outputs/phase02_inventory_probe.txt` |
| `P2-PROBE-META-01` | `phase02_metadata_probe.py` | `bash probes/run_probe.sh …` | `probes/outputs/phase02_metadata_probe.txt` |
| `P2-PROBE-ISO-01` | `phase02_isolation_probe.py` | `bash probes/run_probe.sh …` | `probes/outputs/phase02_isolation_probe.txt` |
| `P2-PROBE-CLEAN-01` | `phase02_cleanup_verification_probe.py` | `bash probes/run_probe.sh …` | `probes/outputs/phase02_cleanup_verification.txt` |
| `P2-PROBE-RETAIN-01` | `phase02_retained_identity_probe.py` | `bash probes/run_probe.sh …` | `probes/outputs/phase02_retained_identity_check.txt` |

Executed tests (focused, synthetic, self-cleaning):

| Run ID | Command | Result | Output artifact |
|---|---|---|---|
| `P2-TEST-SCHED-01` | `bench --site <site> run-tests --module appointment.tests.test_scheduling_workflows --skip-before-tests` | 8 passed | `probes/outputs/phase02_tests_scheduling.txt` |
| `P2-TEST-IDENT-01` | `bench --site <site> run-tests --module appointment.tests.test_app_identity --skip-before-tests` | 18 passed, 1 skipped | `probes/outputs/phase02_tests_identity.txt` |

Both test classes run as `Administrator` (`setUpClass → frappe.set_user("Administrator")`,
`test_scheduling_workflows.py:33`) and contain no isolation assertions, so a
green run establishes that the workflows function for an administrator, not that
tenants are isolated.

## Evidence matrix

Legend: **Source** = inspected code/metadata; **Test read** = inspected test
definition; **Test exec** = executed; **Probe** = executed on the isolated site;
**Unresolved** = no evidence produced.

| Finding | Source read | Test read | Test exec | Probe observed | Unresolved |
|---|---|---|---|---|---|
| F1 Tenant isolation absent (Appointment/Booking Event/Walk In; role-global perms; unscoped desk/manage APIs; customer HTTP exposure; Organization Manager global) | `appointment.json:151-188`; `booking_event.json:306-330`; `hooks.py:190-196`; `organization.json:241-265`; `desk.py:75,418,473,537,571,624,662,737,867,872,900,919,938`; `manage.py:891-896`; `event_override.py:431-442` | `test_scheduling_workflows.py:30-40` (admin-only) | `P2-TEST-SCHED-01` | `P2-PROBE-ISO-01` lines 1-35 | Concurrency variant (see F2) |
| F2 Non-atomic capacity + divergent constraints | `slot_engine.py:16-145,177-304`; `personal_meet.py:319-442,455-717,1316-1463`; `desk.py:369-418,519-537,606-624,809-867`; `appointment_group.py:140-161`; no `FOR UPDATE`/unique/idempotency (recon B) | — | — | Partially: desk/paths exercised in `P2-PROBE-ISO-01` (sequential conflict only) | Race not executed |
| F3 Enterprise separation/audit | `appointment.json` fields; `booking_event.json:10-48`; metadata `track_changes=0` | `test_app_identity.py:70-76` | `P2-TEST-IDENT-01` | `P2-PROBE-META-01` | Export/import not attempted (by scope) |
| F4 Timezone incoherence + dead Ethiopian formatter | `slot_engine.py:46-50`; `desk.py:39-43`; `policy_engine.py:42-47,212-216,302-306,354-358`; `utils.py:161-232`; `personal_meet.py:156-217` | — | — | Source-only (recon C) | DST/other-zone runtime not exercised |
| F5 Integration boundaries absent | `payments/__init__.py` empty; `channels/__init__.py` empty; `event_override.py:168-179,496-498`; `leave_application_override.py:17,34` | — | — | `P2-PROBE-INV-01` (no payment/SMS records) | Callback safety unverified |
| F6 Role/API hygiene (`Front Desk` vs `Front-Desk`; `Desk User` on UA; manager checks; offline; gateway; routes) | `hooks.py:142-143`; `fixtures/role.json:36`; `provider_delegation.json:41`; `user_appointment_availability.json:156,162`; `manage.py:891-896`; `onboarding.py:48-54`; `policy_manager.py:216-217,338-339,351-352`; `offline.py:171,185,204,231,235-236`; `gateway.py:393-412`; `frontend/src/route.tsx:47-88` | — | — | `P2-PROBE-INV-01` (both role records exist; reception holds `Front-Desk`) | Team UI spelling not driven end-to-end |
| F7 Duplicate metadata fields have no separate columns | `service.json` (`buffer_before/after` ×2); `location.json` (`address_line_1/2`, `city`, `phone`, `timezone` ×2) | — | — | `P2-PROBE-META-01` (2 meta defs, 1 DB column each) | Migration consequence: none observed |

## Key recorded results

`P2-PROBE-ISO-01` (synthetic tenants A and B, `P2ISO`, removed on completion):

```
A.roles                                       ['Provider','All','Guest','Desk User']
A.get_list(Appointment).names                 ['APT-P2ISO-A','APT-P2ISO-B']
A.get_list(Appointment).B_visible             True
A.get_list(Walk In/Service/Provider/Location/BookingEvent).B_visible  True
A.has_perm(Appointment,B,write)               True
A.desk.update_appointment(B,status=Cancelled) success=True, modified_by=p2iso-a-owner@example.invalid
R.desk.create_cross_tenant(B …)               success=True
R.create_service_no_org                       success=True
C.roles                                       ['All','Guest']
C.get_list(Appointment)                       PermissionError
C.HTTP(session) login=200, desk=200, desk_B_visible=True, walkins=200,
               walkins_B_visible=True, frappe.client.get_list=403
M.get_list(Organization).B_visible            True
M.has_perm(Organization,B,write/export)       True/True
```

`P2-PROBE-META-01`: `Appointment/Walk In/Booking Event` carry no organization
column; `track_changes=0` for Appointment/Organization/Service/Location/Walk
In/Provider; `User Permission` count 0; Service `buffer_before` has 2 metadata
definitions and 1 database column.

`P2-PROBE-CLEAN-01` and `P2-PROBE-RETAIN-01`: all business tables 0 rows; no
`P2ISO` users or records; the four retained QA users, 4 Browser Accounts, and 4
Browser Sessions are intact; site user count 9.

## Fixture ownership and cleanup

- Synthetic dataset created by `P2-PROBE-ISO-01`: users
  `p2iso-{a-owner,b-owner,reception,customer,manager}@example.invalid`
  (roles Provider/Provider/Front-Desk/none/Organization Manager), organizations
  `P2ISO Org A/B`, providers/locations/services/event-types, two appointments,
  two walk-ins, two private Booking Events, plus records created through the APIs
  under test. Owned/marked `P2ISO`; all deleted by the probe's `finally` cleanup
  (verified by `P2-PROBE-CLEAN-01`).
- API keys and a login password were generated in-process for the synthetic users
  only, never printed or committed, and removed with the users.
- Retained identities and their Browser Accounts/Sessions were never modified or
  deleted (`P2-PROBE-RETAIN-01`).
- No `qa_fixtures` teardown or QA-BROWSER prefix sweep was run, because this phase
  created no browser-run fixtures and the sweep could remove other phases' records.

## Artifacts not copied

None. This phase produced only small text probe outputs, which are committed
under `probes/outputs/`. No screenshot, video, or trace was produced because no
browser journey was executed in Phase 2; the browser-UI safety claim was tested
instead through the real HTTP API, which is the stronger instrument for a
cross-tenant access defect. Phase 1's static browser artifacts remain the only
browser evidence in the reassessment and are reused with their stated limitations.

## Scope of validation

- Source and metadata were read at the baseline commit; both existing test modules
  were executed and passed under Administrator.
- Tenant isolation, role scope, and the customer HTTP path were reproduced with
  executed probes and a real isolated-site session.
- Concurrent capacity, DST/other-timezone behaviour, payment callbacks, and
  export/import remain unexecuted; they are reported as supported risks or
  unverified rather than as pass or fail.
