# Phase 2 — Evidence index

This index distinguishes recorded execution from source inspection and conclusions
that remain unverified. Raw probe scripts and outputs are preserved unchanged.
No browser journey or new runtime execution was performed while finalizing this
report; the decisive source paths and recorded results were spot-checked.

## Baseline and environment

| Item | Recorded value |
|---|---|
| Branch | review/phase-02-platform-architecture |
| Product source baseline | 4d450ffe4c36270d55c406d5d29531e81da29c31 |
| Evidence worktree | /home/minte/projects/training-apps/.worktrees/frappe-appointment-phase-02 |
| Bench | /home/minte/projects/appointment-worktree-runtimes/fix-appointment-beta-readiness-01dea7/bench |
| Site | meet-beta-fix-appointment-beta-readiness-01dea7.localhost |
| Declared runtime source | frappe-appointment-readiness at 3c57fb4 |
| Loaded Python package in recorded probe | frappe-appointment-beta/appointment at baseline 4d450ff |
| HTTP probe target | http://127.0.0.1:49511 (as recorded in the probe) |
| Documented internal backend | http://127.0.0.118:49511 |
| Browser frontend | http://localhost:49510 |
| Isolation controls | pause_scheduler=1 and mute_emails=1 recorded by inventory |

The compared revisions differ only in README/docs/package metadata. This supports
application-source equivalence for the probe; it does not establish active
frontend build provenance. No browser claim is based on that comparison.

The scripts use the **Bench Python environment**, as run_probe.sh shows. The
certified browser environment is separately documented in ../browser-qa-access.md;
its preflight was not rerun because this phase performed no browser execution.
The phase did not restart/migrate the runtime or change product source. Probe and
test fixture writes did temporarily change site data.

## Recorded executions

Paths below are relative to this phase folder.

| ID | Script / test module | Output | What it establishes |
|---|---|---|---|
| P2-PROBE-SMOKE-01 | probes/phase02_readonly_smoke_probe.py | probes/outputs/phase02_readonly_smoke_probe.txt | Import/runtime context and selected metadata |
| P2-PROBE-INV-01 | probes/phase02_inventory_probe.py | probes/outputs/phase02_inventory_probe.txt | Roles, accounts, selected permissions, settings and job definitions |
| P2-PROBE-META-01 | probes/phase02_metadata_probe.py | probes/outputs/phase02_metadata_probe.txt | Selected fields, DocPerms, tracking flags and duplicate metadata versus columns |
| P2-PROBE-ISO-01 | probes/phase02_isolation_probe.py | probes/outputs/phase02_isolation_probe.txt | Scoped fixture experiment with Python calls and customer HTTP checks |
| P2-PROBE-CLEAN-01 | probes/phase02_cleanup_verification_probe.py | probes/outputs/phase02_cleanup_verification.txt | Listed business tables empty and no listed P2ISO leftovers after cleanup |
| P2-PROBE-RETAIN-01 | probes/phase02_retained_identity_probe.py | probes/outputs/phase02_retained_identity_check.txt | Four retained users, four Browser Accounts, four Browser Sessions remained |
| P2-TEST-SCHED-01 | appointment.tests.test_scheduling_workflows | probes/outputs/phase02_tests_scheduling.txt | 8 tests run, all passed |
| P2-TEST-IDENT-01 | appointment.tests.test_app_identity | probes/outputs/phase02_tests_identity.txt | 18 tests run: 17 passed, 1 skipped |

The tests used `bench --site <named-site> run-tests --module <module>
--skip-before-tests`. They exercise the named administrator-level cases and
identity/import contracts, not tenant isolation or a complete browser lifecycle.
The public-booking unit test checks catalog visibility, not complete confirmation.

## Probe method and exact result boundaries

The isolation script creates two organizations with separate owner/provider
users, services, locations, EventTypes, appointments and walk-ins. It also creates
two private Booking Events under different user ownership. A reception user and
an Organization Manager user have their respective roles but are **not** assigned
to organization A or B. A customer has only All and Guest roles.

Fixtures use `insert(ignore_permissions=True)` and the process sets
`frappe.flags.ignore_permissions=True`; subsequent Python checks switch users
with `frappe.set_user`. These are controlled in-process checks, not an HTTP
exercise of authentication/dispatch for every role. Do not generalize them to
all externally reachable mutations. The separate customer HTTP session provides
independent evidence of application read exposure; it does not inherit the
probe process's fixture-creation flags.

| Recorded check | Result | Classification |
|---|---|---|
| Provider A get_list Appointment | A and B visible | Python permission-aware list execution |
| Provider A get_list Walk In / Service / Provider / Location | B visible | Python list execution |
| Provider A get_list Booking Event | Other user's private event visible | List execution, not a cross-user document-write test |
| Provider A get_list Organization | PermissionError | Explicit counterexample to “all staff can read every record” |
| Provider A desk.update_appointment(B, Cancelled) | success; status Cancelled; modified_by is A user | Persisted direct Python API mutation |
| Unassigned reception desk.create_desk_appointment | B service/provider/location appointment created | Persisted direct Python API mutation |
| Unassigned reception manage.create_service without organization | success | Ownerless service created by direct API |
| Customer API-key requests | 401 for desk and standard list | Authentication failed; not access proof |
| Customer session login | 200 | Recorded HTTP login success |
| Customer session desk appointments / walk-ins | 200; B identifiers present | Reproduced HTTP read exposure |
| Customer session standard Appointment list | 403 | Standard role restriction upheld; custom desk route bypasses it |
| Unassigned Organization Manager list | A and B visible | Python list execution |
| Same manager has_permission(write B / export Organization) | true / true | Permission checks only; no write or export executed |

The HTTP check identified returned synthetic record IDs in response text, rather
than retaining full customer-data payloads. The inspected desk code returns
client name/email/phone among its fields. Customer writes, unauthenticated Guest
access, every staff HTTP path and every entity/action combination were not tested.

## Findings mapped to evidence

| Finding | Source and execution support | What remains unverified |
|---|---|---|
| F1 Authorization | ISO-01 above; `appointment/scheduler/api/desk.py:20-85,435-537`; `appointment/api/manage.py:880-901`; `appointment/helpers/overrides.py`; `appointment/hooks.py:190-196`; INV-01 DocPerms | Comprehensive file/export/search/realtime/cache/job and multi-membership coverage; complete write matrix |
| F2 Capacity and lifecycle | `appointment/scheduler/availability.py:21-68`; `appointment/scheduler/helpers/slot_engine.py:68-145`; `appointment/api/personal_meet.py:319-442,1316-1463`; `appointment/scheduler/api/desk.py:369-418,435-537`; Appointment controller | Concurrent race, retry behavior, supported override policy, full status synchronization and all constraint-bypass cases |
| F3 Ownership/accountability | META-01 fields and track_changes flags; existing model relationships | Target ownership enforcement, audit completeness and future export/import behavior; current seed-data backfill is not required |
| F4 Time interpretation | `slot_engine.py:46-65,155-174`; `desk.py:39-43`; `frontend/src/pages/organization-appointment/index.tsx:28`; `frontend/src/pages/booking-v2/components/DateTimeSelector/TimeSlotsPanel/index.tsx:16,43-48`; `frontend/src/pages/booking-v2/utils/ethiopianTime.ts:26-28` | Runtime timezone/DST failures; correctness across browser locations |
| F5 Integrations | Empty payments/channels packages; existing calendar/Zoom helpers; `appointment/overrides/event_override.py:168-179` queues after commit | Delivery, retries, duplicates, callbacks, reconciliation and customer-visible recovery |

META-01 records Booking Event `track_changes=1` and six listed business types
with `track_changes=0`; it does not establish “no audit anywhere.” Repeated
Service/Location metadata has one database column for each inspected name; form,
metadata precedence and migration effects were not tested. An unreferenced
Python Ethiopian formatter does not negate the active frontend formatter.

No missing “recon” artifact is needed to support these conclusions. Broad
absence claims such as “no lock anywhere” are not treated as reproduced evidence.

## Reproduction and cleanup cautions

Do not rerun probes merely to read this report. For an authorized isolated-site
reproduction, first inspect the script, current runtime, existing fixture names,
and cleanup effects. Use an **absolute script path** because the runner changes
its working directory:

```bash
PHASE_DIR=/home/minte/projects/training-apps/.worktrees/frappe-appointment-phase-02/docs/product-reassessment/phase-02-platform-architecture
bash "$PHASE_DIR/probes/run_probe.sh" "$PHASE_DIR/probes/phase02_isolation_probe.py"
```

The isolation probe uses fixed P2ISO names, creates users/records and mutates
fixtures. Serialize it and confirm those names are unused. It records created
names and attempts deletion in a finally block; cleanup success must be checked
independently, not inferred from the word “self-cleaning.” Credentials are
created only in process and not included in evidence. Preserve the current
scripts/outputs as the historical execution record; changes to a reproduction
must be recorded with new outputs rather than silently attributed to ISO-01.

CLEAN-01 and RETAIN-01 recorded zero rows in the listed business tables, no P2ISO
users and all four retained QA identities/accounts/sessions present after the
run. These are post-run records, not a live inventory guarantee. No QA-BROWSER
sweep was invoked by the isolation probe; the scheduling tests have their own
fixture lifecycle. Session invalidation beyond user removal was not separately
reported. Future agents must follow ../browser-qa-access.md for preservation.

## Artifacts and scope

Only the listed scripts and text outputs were produced; no browser screenshots,
video or trace exists for Phase 2. HTTP evidence is appropriate for the API access
claim and does not substitute for the visible workflows required in Phase 3.
No raw evidence was rewritten while finalizing the assessment.
