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
| BQA-2026-00079 | `run-d-reception.txt` | provider day view + reschedule | Failed (F2, F3) | `appointment-p3-provider-day-view-20260921T101759Z`, `appointment-p3-provider-reschedule-complete-noshow-20260921T101812Z` |
| BQA-2026-00080 | `run-e-status-availability.txt` | complete / cancel / availability change | Partial (F3, F4) | `appointment-p3-provider-complete-appointment-20260921T102333Z`, `appointment-p3-provider-cancel-appointment-20260921T102414Z`, `appointment-p3-provider-availability-change-20260921T102428Z` |
| BQA-2026-00081 | `run-e-complete-retry.txt` | complete retry | Failed (F3) | `appointment-p3-provider-complete-appointment-20260921T102529Z` |
| BQA-2026-00082 | `run-d3-noshow.txt` | No Show on the 09:00 appointment | Failed (F3) | `appointment-p3-provider-noshow-on-assefa-20260921T102721Z` |
| BQA-2026-00083 | `run-f-slots.txt` | customer slots after availability change | Failed (F4) | `appointment-p3-customer-slots-after-availability-change-20260921T102952Z` |
| BQA-2026-00084 | `run-g-mobile-customer.txt` | mobile booking first screen | Passed | `appointment-p3-customer-booking-mobile-20260921T103128Z` |
| BQA-2026-00085 | `run-h-mobile-provider.txt` | mobile provider day view | Failed assertion (heading hidden) | `appointment-p3-provider-reception-mobile-20260921T103200Z` |

Every run recorded `video_file: null` (F5). Each run also produced `trace.zip` in
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

## Findings → evidence

### F1 — Onboarding blocked at Set Availability

- Role/scenario: solo provider, individual wizard. URL `/home`.
- BQA-2026-00071; screenshot `screenshots/08-solo-onb-07-availability-submit-deadend.png`;
  `traces/b-onboarding-console-errors.json`, `traces/b-onboarding-network-failures.json`,
  `traces/b-onboarding-after-step3-dom.html`, `traces/b-onboarding-report.json`.
- Source: `appointment/onboarding.py:1095` (shadowed) vs `:3752`;
  `frontend/src/pages/home/components/Step3Availability.tsx:167`.

### F2 — Customer booking never reaches the provider schedule

- Guest: `screenshots/13-customer-booking-confirmation.png`; BQA-2026-00074
  (`traces/c-booking-report.json`, `traces/c-booking-confirmation-dom.html`).
- Provider: BQA-2026-00079; `screenshots/14-provider-reception-today.png` (shows
  `QA-BROWSER-01d65f Client`), `screenshots/15-provider-reception-tomorrow-empty.png`
  (empty day for the booked date); `traces/d-day-view-report.json`.
- Source: `appointment/api/personal_meet.py:457`, `:759-775`;
  `appointment/scheduler/api/desk.py:59-85`, `:107-125`.

### F3 — Single-digit-hour appointments cannot be updated

- Failure (09:00): BQA-2026-00079/81/82; `screenshots/18-provider-reschedule-silent-noop.png`,
  `screenshots/19-provider-complete-silent-noop.png`;
  `traces/d-reschedule-report.json`, `traces/e-complete-report.json`,
  `traces/d3-noshow-assefa-report.json`.
- Control (14:00 works): BQA-2026-00076; `screenshots/20-provider-cancelled-ok.png`;
  `traces/d2-status-submit-report.json`.
- Mechanism: `probes/phase03_desk_time_format_probe.py` output (desk API returns
  `datetime.timedelta`); `frontend/src/pages/reception/components/EditAppointmentModal.tsx:74,178-181`.

### F4 — Availability change does not reach customers; booking copy wrong

- Change saved: BQA-2026-00080; `screenshots/24-availability-saved.png`;
  `traces/e-availability-report.json`. Persisted state:
  `probes/phase03_availability_check_probe.py`.
- Customer non-response: BQA-2026-00083;
  `screenshots/25-customer-slots-after-availability.png`; `traces/f-slots-report.json`,
  `traces/f-slots-dom.html`.
- Duration/label: `screenshots/10-customer-booking-first-screen.png` ("0.5 min"),
  `screenshots/13-customer-booking-confirmation.png`; source
  `frontend/src/pages/organization-appointment/index.tsx:241`.

### F5 — Missing recording evidence

- `recordings/README.md`; `appointment/qa_runner.py:15-40`; `agent_plane/api.py:1000-1023`;
  every run's `"video_file": null`.

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
