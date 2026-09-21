# Phase 3 — Evidence index

Baseline `edaccef62bb082b3ef02833eaca00f2505f5ed00`. Branch
`review/phase-03-solo-user-experience`. Documented runtime: preserved site
`meet-beta-fix-appointment-beta-readiness-01dea7.localhost`, frontend
`http://localhost:49510`, foundation bundle 2026.07.2, app source
`frappe-appointment-readiness` @ `3c57fb4` (unchanged). Browser follow-up commit: `e22c032`. Coordinator verification inspected stored
artifacts and source; it did not rerun the browser journeys.

Raw Agent Plane artifacts live under
`/tmp/agent_browser_qa/appointment/<app>-<scenario-id>-<UTC>/`. Screenshots, DOM
snapshots and `report.json` are copied into this folder; multi-megabyte
`trace.zip` files and private `File` attachments stay in the store. The `/tmp`
store is ephemeral, so committed copies are the durable evidence. No passwords,
cookies, tokens or database credentials are included.

## Original phase runs (preserved unchanged)

| Run ID | Scenario(s) | Result | Artifact dir (under `/tmp/agent_browser_qa/appointment/`) |
|---|---|---|---|
| BQA-2026-00070 | solo identity + first screen | Passed | `appointment-p3-solo-identity-check-20260921T094929Z`, `-first-screen-20260921T094934Z` |
| BQA-2026-00071 | solo individual onboarding | Failed (F1) | `appointment-p3-solo-onboarding-individual-20260921T095156Z` |
| BQA-2026-00073 | Guest anonymity proof | Failed by design (403) | `appointment-p3-guest-identity-check-20260921T095706Z` |
| BQA-2026-00074 | Guest books a slot | Passed | `appointment-p3-customer-public-booking-20260921T095814Z` |
| BQA-2026-00076 | status-only update (14:00) | Passed | `appointment-p3-provider-status-submit-diagnostic-20260921T100532Z` |
| BQA-2026-00079 | provider day view + reschedule | Failed (F2 original invalid; F3) | `appointment-p3-provider-day-view-20260921T101759Z`, `-reschedule-complete-noshow-20260921T101812Z` |
| BQA-2026-00080 | complete / cancel / availability | Partial | `appointment-p3-provider-complete-appointment-20260921T102333Z`, `-cancel-...T102414Z`, `-availability-...T102428Z` |
| BQA-2026-00081 | complete retry | Failed (F3) | `appointment-p3-provider-complete-appointment-20260921T102529Z` |
| BQA-2026-00082 | No Show on 09:00 | Failed (F3) | `appointment-p3-provider-noshow-on-assefa-20260921T102721Z` |
| BQA-2026-00083 | slots after availability change | Failed (F4) | `appointment-p3-customer-slots-after-availability-change-20260921T102952Z` |
| BQA-2026-00084 | mobile booking first screen | Passed | `appointment-p3-customer-booking-mobile-20260921T103128Z` |
| BQA-2026-00085 | mobile provider day view | Failed assertion (heading hidden) | `appointment-p3-provider-reception-mobile-20260921T103200Z` |

The original customer→provider handoff was invalidated: `run-c-booking.txt`
records `Booking Event:BEV00005` in `fixture_cleanup` before any provider run.
Use the same-run evidence below with its stated identity and persistence limits.

## Bounded follow-up runs (P3B, clearly distinct)

| Run ID | Scenario(s) | Result | Artifact dir / committed artifacts |
|---|---|---|---|
| BQA-2026-00086 | `frappe_session` Guest probe | Auth failed ("did not create an authenticated sid") | `appointment-p3b-guest-session-check-20260921T194520Z`; `traces/p3b-guest-session-report.json` |
| BQA-2026-00087 | update diagnosis (09:00 status; 14:00 reschedule; 09:45 No Show) | 09:00 failed + "Update failed"; 14:00 rescheduled; 09:45 card click blocked by overlay | `appointment-p3b-update-morning-status-...T200159Z`, `-afternoon-reschedule-...T200222Z`, `-morning-noshow-...T200242Z` |
| BQA-2026-00088 | No Show on the 14:00/15:00 record | Passed and persisted | `appointment-p3b-update-afternoon-noshow-20260921T200659Z` |
| BQA-2026-00090 | handoff (booking, exists, reception, calendar) in one run | Provider-session booking passed; existence assertion failed; not shown in reception/calendar | `appointment-p3b-handoff-booking-...T201938Z`, `-exists-...T201959Z`, `-provider-reception-...T202005Z`, `-provider-calendar-...T202016Z` |
| BQA-2026-00091 | close Wednesday via Settings | Passed | `appointment-p3b-availability-close-wednesday-20260921T202225Z` |
| BQA-2026-00092 | customer books the closed Wednesday | Passed (booked Sep 30) | `appointment-p3b-customer-closed-day-20260921T202404Z` |
| BQA-2026-00094 | onboarding Skip recovery | Partial; Create Service reached but 417 | `appointment-p3b-onboarding-skip-recovery-20260921T202602Z` |
| BQA-2026-00095 | mobile (390×844) booking through confirmation | Passed | `appointment-p3b-mobile-booking-20260921T202656Z` |

New committed artifacts use the `p3b-` prefix in `screenshots/` (16 files) and
`traces/` (12 report JSONs). Probe outputs are in `probes/outputs/p3b-*.txt`.

## Findings → evidence

| Finding | Follow-up evidence | Qualification |
|---|---|---|
| F1 onboarding contract | BQA-2026-00094; `p3b-13-onboarding-after-skip.png`, `p3b-14-onboarding-create-service-error.png`; `traces/p3b-onboarding-skip-report.json` | Availability save fails; Skip reaches Create Service; `create_service` 417 "Location not found" |
| F2 live-booking handoff | BQA-2026-00090; `p3b-01/02/03`; `traces/p3b-handoff-*.json`; `trace.zip` and `fixture_cleanup` contain `BEV00005` | Persistence during inspection inferred from creation + final teardown; existence query returned empty lists; provider authenticated throughout |
| F3 update defect | BQA-2026-00087/88; `p3b-04..07`; `traces/p3b-update-*.json`; `probes/outputs/p3b-desk-http.txt`; `p3b-verify-outcomes.txt` | Unpadded-hour mechanism supported; reschedule DB read and later No Show trace/refetch establish separate outcomes |
| F4 availability propagation | BQA-2026-00091/92; `p3b-08..11`; `traces/p3b-availability-report.json`, `traces/p3b-customer-closed-report.json`; `probes/outputs/p3b-availability.txt` | Persisted closure + 16 slots + completed closed-day booking |
| F5 booking detail errors | `p3b-01`, `p3b-16`, original `screenshots/10`,`13`; source `organization-appointment/index.tsx:240-241`; `probes/outputs/p3b-desk-http.txt` (empty site timezone) | Duration/service labels wrong; browser timezone alone is not a defect |

## Fixtures, ownership and cleanup

- Follow-up fixtures (`probes/p3b_bootstrap_probe.py`, `p3b_onb_user_probe.py`):
  users `p3b-solo-owner@example.test` (System User: All, Guest, Desk User,
  Provider), `p3b-solo-customer@example.test`, `p3b-onb@example.test`; scenario
  `P3B Org` / `p3b-org`, Provider `P3B Solo Owner`, Location `P3B Studio`,
  Service `SRV-2026-0006`, EventType `EVT-2026-000001`, availability
  `p3b-scenario`, appointments `P3B-APT-MORN1` (09:00), `P3B-APT-MORN2` (09:45),
  `P3B-APT-AFT` (14:00). Created as Administrator (test setup, not onboarding).
- The runner's own `QA-BROWSER` fixtures were created/removed each run.
- **Cleanup outcome** (`probes/p3b_cleanup_probe.py`,
  `probes/outputs/p3b-cleanup.txt`): removed 3 Appointments, 1 availability,
  1 EventType, 1 Service, 1 Location, 2 Providers, 1 Organization, 4 Has Role
  rows and the 3 `p3b-*` users; all business counts returned to 0.
  `frappe.delete_doc` was blocked by `QueueOverloaded` (550 queued jobs;
  scheduler paused), so synthetic rows were removed with direct `frappe.db.delete`
  scoped to `P3B*`/`p3b-*`.
- Retained `appointment-review-*` users and 4 Browser Accounts / 4 Browser
  Sessions verified present after cleanup.
- Runs were serialized; no run overlapped another.

## Tooling blockers (see analysis.md)

1. `appointment.qa_runner.run` drops `capture_video`/`capture_instruction_timeline`
   (all runs `video_file: null`); prerequisite is a supported forwarding/configuration path requiring validation. Traces are not video.
2. One `auth` per manifest; `frappe_session` cannot authenticate Guest
   (BQA-2026-00086). Customer runs use `auth: none`; handoff used a single
   provider run.
3. Runner cleanup deletes new Booking Events by snapshot; no preserve facility, so
   the attempted separate-run handoff lost its record at teardown.
4. Product-API cleanup raised QueueOverloaded; the paused scheduler alone does not establish the cause.

## Runtime and tooling notes

- Browser runs used the existing runtime. Coordinator verification found it stopped
  and restarted the designated stack without migration or reset. Email muted and
  scheduler paused. `System Settings.time_zone` is empty (Frappe defaults to
  Asia/Kolkata; `desk.py` falls back to Africa/Addis_Ababa), and the container is
  EAT — the browser timezone was aligned to Asia/Kolkata via a supported manifest
  option for the usable-calendar runs.
- Local operator credentials were read only where required and never printed or
  committed.

## Preservation of original evidence

Original screenshots, reports, outputs and probes are preserved as raw evidence.
The current analysis is the single reviewed recommendation; raw reports may
contain failed assertions or incomplete cleanup claims and must be read against
the qualifications here.

## Coordinator verification and completed cleanup

- `probes/p3c_trace_check.py` extracts only selected response fields from the saved
  network traces. `probes/outputs/p3c-trace-summary.json` durably records creation
  of BEV00005, the failed existence check's empty lists, the reception/calendar
  results, No Show update and refetch, and closed-day booking. No request headers,
  cookies, booking access links or credentials are exported. Identical event IDs
  across separate runs do not imply the same record survived between runs.
- The No Show evidence is the later trace, not `p3b-verify-outcomes.txt`, which
  records Confirmed after the preceding reschedule.
- The existence assertion in BQA-2026-00090 failed. Same-run creation plus final
  teardown deletion and inspection of `qa_runner.run`/`_cleanup_run_artifacts`
  support persistence as an inference, not a successful direct read.
- All eight `p3b_*` manifests set `capture_video` and
  `capture_instruction_timeline` false. The wrapper omission is established by
  source inspection; these runs do not test forwarding true flags.
- `probes/p3c_complete_cleanup.py` completed cleanup for the exact already-deleted
  P3B parent IDs and three users. `probes/outputs/p3c-cleanup-result.json` records
  34 orphan children, 15 sessions, one User authentication entry and three defaults
  before cleanup, and zero afterwards. Session deletion used Frappe's session
  helper to invalidate cache as well as database rows. Parent absence is asserted
  before touching children; no broad prefix deletion is used.
- The same output verifies eight business table counts are zero, all four retained
  QA users and four Browser Accounts/Sessions remain, email is muted, and the
  scheduler is paused. Earlier parent-only cleanup was incomplete; its output is
  retained without treating zero business counts as complete fixture cleanup.
