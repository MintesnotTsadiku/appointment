# Phase 3 — Evidence index

Baseline `edaccef62bb082b3ef02833eaca00f2505f5ed00`, branch
`review/phase-03-solo-user-experience`. Runtime site
`meet-beta-fix-appointment-beta-readiness-01dea7.localhost`, frontend
`http://localhost:49510`, foundation bundle 2026.07.2.

Raw Agent Plane artifacts live under
`/tmp/agent_browser_qa/appointment/<app>-<scenario-id>-<UTC>/`. Screenshots, DOM
snapshots and `report.json` are copied into this folder; multi-megabyte
`trace.zip` files and all private `File` attachments are left in the store (paths
below). The store is ephemeral (`/tmp`), so committed copies are the durable
evidence. No passwords, cookies, tokens or database credentials are included.

## Runs

| Run ID | Ledger | Scenario(s) | Result | Artifact dir (under `/tmp/agent_browser_qa/appointment/`) |
|---|---|---|---|---|
| BQA-2026-00070 | `probes/outputs/` (trial) | solo identity + first screen | Passed | `appointment-p3-solo-identity-check-20260921T094929Z`, `appointment-p3-solo-first-screen-20260921T094934Z` |
| BQA-2026-00071 | `run-b-onboarding.txt` | solo individual onboarding | Failed (F1) | `appointment-p3-solo-onboarding-individual-20260921T095156Z` |
| BQA-2026-00073 | `run-c-booking.txt` (superseded) | Guest anonymity proof | Failed by design (403 navigation) | `appointment-p3-guest-identity-check-20260921T095706Z` |
| BQA-2026-00074 | `run-c-booking.txt` | Guest books a slot | Passed | `appointment-p3-customer-public-booking-20260921T095814Z` |
| BQA-2026-00076 | `run-d2-diagnostic.txt` | status-only update (14:00) | Passed (control for F3) | `appointment-p3-provider-status-submit-diagnostic-20260921T100532Z` |
| BQA-2026-00079 | `run-d-reception.txt` | provider day view + reschedule | Failed; handoff observation invalidated by cleanup; edit failure observed | `appointment-p3-provider-day-view-20260921T101759Z`, `appointment-p3-provider-reschedule-complete-noshow-20260921T101812Z` |
| BQA-2026-00080 | `run-e-status-availability.txt` | complete / cancel / availability change | Partial (F3, F4) | `appointment-p3-provider-complete-appointment-20260921T102333Z`, `appointment-p3-provider-cancel-appointment-20260921T102414Z`, `appointment-p3-provider-availability-change-20260921T102428Z` |
| BQA-2026-00081 | `run-e-complete-retry.txt` | complete retry | Failed update assertions (F3) | `appointment-p3-provider-complete-appointment-20260921T102529Z` |
| BQA-2026-00082 | `run-d3-noshow.txt` | No Show on the 09:00 appointment | Failed update assertions (F3) | `appointment-p3-provider-noshow-on-assefa-20260921T102721Z` |
| BQA-2026-00083 | `run-f-slots.txt` | customer slots after availability change | Failed (F4) | `appointment-p3-customer-slots-after-availability-change-20260921T102952Z` |
| BQA-2026-00084 | `run-g-mobile-customer.txt` | mobile booking first screen | Passed | `appointment-p3-customer-booking-mobile-20260921T103128Z` |
| BQA-2026-00085 | `run-h-mobile-provider.txt` | mobile provider day view | Failed assertion (heading hidden) | `appointment-p3-provider-reception-mobile-20260921T103200Z` |

Every recorded run lacks video; this is a tooling/evidence limitation. Each run also produced `trace.zip` in
its artifact dir (1–12 MB, not committed).

## Manifests executed

| Manifest | Purpose | Identity |
|---|---|---|
| `manifests/phase03_a_trial_identity_first_screen.yaml` | tooling + identity check | `p3-solo-owner@example.test` |
| `manifests/phase03_b_solo_onboarding.yaml` | full individual wizard | `p3-solo-owner@example.test` |
| `manifests/phase03_c0_guest_proof.yaml` | Guest anonymity | `auth: none` |
| `manifests/phase03_c_customer_booking.yaml` | Guest booking | `auth: none` |
| `manifests/phase03_d_provider_reception.yaml` | day view, reschedule, complete, no-show | `p3-solo-owner@example.test` |
| `manifests/phase03_d2_status_diagnostic.yaml` | isolated status-update control | `p3-solo-owner@example.test` |
| `manifests/phase03_d3_noshow_diagnostic.yaml` | No Show control on the failing record | `p3-solo-owner@example.test` |
| `manifests/phase03_e_provider_status_availability.yaml` | complete, cancel, availability change | `p3-solo-owner@example.test` |
| `manifests/phase03_f_slots_after_availability.yaml` | customer response to availability | `auth: none` |
| `manifests/phase03_g_mobile_customer.yaml` | mobile booking | `auth: none` |
| `manifests/phase03_h_mobile_provider.yaml` | mobile reception | `p3-solo-owner@example.test` |

Manifests are staged to `/tmp/p3qa/appointment_p3_*.yaml` before execution
because Agent Plane derives `Browser QA Run.app` from the manifest path/filename
(both fields are limited to 140 chars). The committed file is the source of
truth; staging is byte-identical.

## Findings → evidence and limits

| Finding | Evidence | Qualification |
|---|---|---|
| F1: onboarding save | BQA-2026-00071; screenshot 08; b-onboarding console/network/report files; duplicate onboarding.py definitions and Step3Availability caller | Selected Continue path fails. Skip for now/other visible recovery not tested. |
| F2: schedule trust/scope | BQA-2026-00079; screenshot 14; desk.py:107-136 demo fallback; Phase 2 permissions evidence | Mixed synthetic businesses observed; not proof the customer's still-existing booking is missing. |
| F3: fixture update failures | BQA-2026-00079/81/82; screenshots 18/19; d-reschedule/e-complete/d3 reports | Morning fixture failed. Unpadded HTTP time and exact root cause remain unverified. |
| F4: closed-day calendar inconsistency | BQA-2026-00080/83; screenshots 24/25; e-availability/f-slots reports and DOM | Save toast plus calendar availability mismatch. No committed persisted-state/slot-response output; no closed-day booking attempted. |
| F5: service detail errors | BQA-2026-00074; screenshots 10/13; scenario bootstrap duration; organization-appointment/index.tsx:240-241 | Wrong displayed units/name; saved interval and price not verified. |

### Booking handoff experiment was interrupted by cleanup

The committed `probes/outputs/run-c-booking.txt` contains:

```json
{"fixture_cleanup":{"removed":["Booking Event:BEV00005", "...other QA fixtures..."]}}
```

This is an abbreviated extract; the full exact removal list remains in the raw
output. `appointment.qa_runner.run` invokes `qa_fixtures.teardown` in finally;
`_cleanup_run_artifacts` removes newly created Booking Events relative to its
snapshot, not only QA-BROWSER-prefixed events. The provider run occurred later.
Therefore screenshot 15 cannot establish a live booking handoff defect. A
follow-up must record the booking identifier, verify its existence and ownership
before provider inspection, and defer its cleanup until that inspection completes.
Do not silently preserve the original “never reaches the schedule” conclusion.

### Probe output and update-control limits

The scripts phase03_desk_time_format_probe.py,
phase03_availability_check_probe.py and phase03_appointment_check_probe.py are
committed, but their captured outputs are not in probes/outputs. The only
non-browser-run output there is phase03_post_cleanup_inventory.txt. The
availability probe does not call get_time_slots. A script's existence is not
execution evidence of its claimed result.

The 14:00 d2 diagnostic selects No Show. Its manifest does not assert the final
stored status. The cancellation scenario does assert the update request and
success toast. Neither establishes a successful Completed transition. Inspect
persisted values before claiming a completed lifecycle. The source's submit
catch displays an error toast, so a proposed date exception does not alone
explain the silent no-op. A missing success request is a symptom, not a diagnosis.

### Authentication and capture limitations

Solo reports record the explicit frappe_session identity. Customer manifests
use auth:none, a deviation from the required protocol. The separate 403 Guest
probe is supporting context, not a positive verification of every subsequent
browser identity. Missing video is documented in recordings/README.md; d2
explicitly disables capture, while most manifests request it. Current wrapper/API
defaults explain why those requests do not yield recording through this path.
No claim is made that all Agent Plane routes are incapable of video.

## Fixtures, ownership and cleanup

- Fresh synthetic identities (bootstrap, `probes/phase03_bootstrap_probe.py`):
  `p3-solo-owner@example.test` (System User: All, Guest, Desk User, Provider) and
  `p3-solo-customer@example.test` (Website/System User: All, Guest). No passwords
  set; browser runs use `frappe_session`.
- Labelled scenario (`probes/phase03_scenario_bootstrap_probe.py`): Organization
  `P3SOLO Org` (`p3solo-org`), Provider `P3 Solo Owner`, Location
  `P3SOLO Studio`, Service `SRV-2026-0006`, EventType `EVT-2026-000001`,
  availability `p3solo-scenario`, and appointments `P3-APT-AF46C99F`,
  `P3-APT-B9AB7966`. Created as Administrator (bootstrap); provider/manager
  linked to the solo user. This is test setup, not product onboarding.
- The runner's `appointment.qa_fixtures` created/removed its own `QA-BROWSER`
  fixtures each run (visible in every run's `fixture_cleanup.removed`). The
  retained `appointment-review-*` users, Browser Accounts and Browser Sessions
  were not touched (their names deliberately avoid the `QA-BROWSER` prefix).
- Cleanup for the Phase 3 synthetic records:
  `probes/phase03_cleanup_probe.py` (run at the end of assessment). It removed
  `P3-APT-B9AB7966`, `P3-APT-AF46C99F`, EventType `EVT-2026-000001`, Service
  `SRV-2026-0006`, the `p3solo-scenario` availability, `P3SOLO Studio`,
  `P3 Solo Owner`, `P3SOLO Org`, and both `p3-*` users. Post-cleanup inventory
  (`probes/outputs/phase03_post_cleanup_inventory.txt`) shows zero business
  records, the four retained QA users intact, and 4 Browser Accounts / 4 Browser
  Sessions preserved. Browser QA Run records from this phase are retained as
  evidence (`artifact_policy: retain`), not fixtures.
- Browser runs were serialized; no run overlapped another.

## Runtime and tooling notes

- Runtime was already running; it was **not** restarted, migrated or reset.
  Frontend/backend returned 200. Email muted and scheduler paused were left as-is.
- Agent Plane/Harness were present; the browser preflight is governed by the
  installed Runtime Settings. `appointment.qa_runner.run` was the only entry
  point used for browser work.
- Local operator credentials were read only where required and never printed or
  committed. Site `site_config.json` secrets are not included.

## Review scope and phase status

Decisive screenshots 08, 13, 14, 18, 24 and 25 were visually inspected, with
focused committed reports, manifests, cleanup output and current source. No
new browser execution, site reset or product change occurred during this review.
The phase remains open because handoff/lifecycle conclusions require the bounded
follow-up in follow-up-opencode-prompt.md. Raw artifacts remain unchanged.
