# Phase 5 — Evidence index

Baseline `b8ee8e9` (`origin/develop` = Phase 3 + Phase 4 integration). Branch
`review/phase-05-customer-experience`.

Runtime: preserved site `meet-beta-fix-appointment-beta-readiness-01dea7.localhost`,
frontend `http://localhost:49510`, bench
`/home/minte/projects/appointment-worktree-runtimes/fix-appointment-beta-readiness-01dea7/bench`,
foundation bundle 2026.07.2. Loaded Python: beta worktree at `edaccef`
(`appointment/` and `frontend/` identical to `b8ee8e9`). Email muted, scheduler
paused; no reset or migration.

## Identity and anonymity

| Persona | How | Verification |
|---|---|---|
| Anonymous customer | `auth: none` (explicit protocol exception; `frappe_session` cannot authenticate Guest — BQA-2026-00086) | Report `authenticate` action `{"type":"none"}`; saved trace request cookies `sid=Guest; system_user=no` |
| Retained customer account | not required for this phase | retained `appointment-review-customer@example.test` (present, enabled) |
| Administrator | backend fixture preparation only | never used as a customer journey |

No staff or Administrator session was used to represent a customer. The
fixture-assisted bookable business is labelled as evaluation setup, not
successful solo onboarding.

## Runs and artifacts

Raw Agent Plane artifacts live under
`/tmp/agent_browser_qa/appointment/appointment-p5-*-<UTC>/`. Multi-megabyte
`trace.zip` files stay in that ephemeral store and in site `private/files`
(paths in the run records); committed copies are the durable evidence. No
passwords, cookies, session ids or booking-management tokens are committed
(`event_token` values are redacted).

| Run | Scenarios | Identity | Result | Committed evidence |
|---|---|---|---|---|
| BQA-2026-00106 | `p5_a0_anonymity_check`, `p5_a1_public_booking` | anonymous | Passed | `manifests/p5_a_public_booking.yaml`; `screenshots/p5-a0-org-services-desktop.png`, `p5-a1-*.png`; `traces/BQA-2026-00106-public-booking-report.json`, `traces/p5-a1-confirmation.html` |
| BQA-2026-00107 | `p5_d_management` (early attempt) | anonymous | Failed (preserved) | `/tmp/.../appointment-p5-d1/d2/d3-*20260922T0829*` |
| BQA-2026-00108 | `p5_d_management` (selector fix attempt) | anonymous | Failed (preserved) | `/tmp/.../appointment-p5-d*-*20260922T0839*` |
| BQA-2026-00109 | `p5_d1_product_link_as_supplied`, `p5_d2_management_link_behavior`, `p5_d3_cancel_discoverability` | anonymous | d2, d3 Passed; d1 404 (preserved) | `manifests/p5_d_management.yaml`; `screenshots/p5-d1-product-link.png`, `p5-d2-*.png`; `traces/BQA-2026-00109-management-link-report.json`, `traces/p5-d1-product-link-{console-errors,network-failures}.json`, `traces/p5-d2-management-*.html` |
| BQA-2026-00110 | `p5_b1_invalid_contact`, `p5_b2_corrected_contact`, `p5_b3_returning_customer` | anonymous | Passed | `manifests/p5_b_recovery.yaml`; `screenshots/p5-b1-invalid-email.png`, `p5-b2-corrected-confirmation.png`, `p5-b3-returning-confirmation.png`; `traces/BQA-2026-00110-invalid-contact-report.json` |
| BQA-2026-00111 | `p5_c1_no_availability` | anonymous | Product behavior Passed; manifest click invalid (preserved) | `manifests/p5_c_no_availability.yaml`; `screenshots/p5-c1-no-availability.png`; `traces/BQA-2026-00111-no-availability-report.json`, `traces/p5-c1-no-availability.html` |
| BQA-2026-00112 | `p5_e1_mobile_booking`, `p5_e2_keyboard_booking`, `p5_e3_amharic_comparison` | anonymous | Passed | `manifests/p5_e_accessibility.yaml`; `screenshots/p5-e1-*.png`, `p5-e2-*.png`, `p5-e3-*.png`; `traces/BQA-2026-00112-mobile-report.json`, `traces/BQA-2026-00112-amharic-report.json` |
| BQA-2026-00113 | `p5_f1_competing_booking` | anonymous | Passed | `manifests/p5_f_conflict.yaml`; `screenshots/p5-f1-*.png`; `traces/BQA-2026-00113-conflict-report.json` |

Site `private/files` trace/report locations are recorded on each `Browser QA Run`
record (e.g. `BQA-2026-00109-trace-*`, `-report-*`); they are not copied here.

## Findings → evidence

| Finding | Runs / artifacts | Probe / source |
|---|---|---|
| F1 confirmation gives no durable record; wrong service/duration; blank email claim | BQA-2026-00106 confirmation (png + html) | `probes/outputs/p5-trace-summary.json` (`event_id`, no `booking_id`); `useBookingSubmit.ts:110-118`; `ConfirmationModal/index.tsx:94-107,121-124,222-226`; `organization-appointment/index.tsx:240-241,608` |
| F2 management link broken host (404) and creates a duplicate booking; no cancel | BQA-2026-00109 d1/d2/d3 | `probes/outputs/p5-trace-summary.json` management request body; `appointment/index.tsx:199-215`; `event_override.py:197-220` |
| F3 booked slot not removed → double-booking | BQA-2026-00113; probe | `probes/outputs/p5-conflict-probe.txt` (`CHANGED_SLOTS`); `probes/p5_conflict_probe.py` |
| F4 configured hours vs displayed/booked time | BQA-2026-00106; probe | `probes/outputs/p5-trace-summary.json` (start `03:30:00+00:00`); `probes/outputs/p5-cleanup-audit.json` (empty site timezone) |
| F5 booking journey English-only | BQA-2026-00112 e3 | amharic report body text; `useTranslation` usage search (landing/home only) |

## Fixtures, records and cleanup

- Bookable business and each run's records are created by the existing
  `appointment.qa_fixtures` and removed by the runner's snapshot teardown. The
  management/conflict probe modules (`probes/p5_fixtures.py`) prepare one extra
  Booking Event; teardown removes it. Observed `fixture_cleanup` removed the
  Booking Event(s) created by each run (e.g. `BEV00005`, `BEV00006`).
- `probes/outputs/p5-conflict-probe.txt` records its own teardown (`CLEANUP_REMOVED 11`).
- **Exact orphan cleanup:** `probes/p5_cleanup_orphans.py` audited every
  `DefaultValue` row whose parent is `qa-browser-*`, asserted each parent User no
  longer exists and is not a retained persona, and deleted exactly those row
  names (no prefix sweep). `probes/outputs/p5-cleanup-orphans.json` records 75
  deleted, 0 refused, 0 remaining.
- **Post-cleanup audit** (`probes/outputs/p5-cleanup-audit.json`): business tables
  all 0; no `qa-browser-*` users; all four retained users present and enabled; four
  Browser Accounts (BACCT-0061/0063/0065/0067) and four Browser Sessions
  (BSESS-0062/0064/0066/0068) preserved; email muted; scheduler paused.
- Residual `Comment` rows owned by disposable users (75) reference deleted
  fixture records; they are not business data and were left in place.

## Tooling blockers (see analysis.md)

1. Video/timeline capture is not producible through `appointment.qa_runner.run`
   without a source change: the wrapper omits the flags and the API defaults
   override the manifest. `video_file` is null and no `.webm` exists; the capture
   policy label "failure" is not evidence that a recording exists.
2. One identity per manifest; `frappe_session` cannot authenticate Guest, so the
   public journeys use `auth: none` (recorded exception).
3. The runner deletes new Booking Events/Appointment Groups at teardown, so a
   cross-run customer lifecycle is not supported; same-run lifecycle steps were
   used.
4. The exact "slot taken between selection and submission" UI race cannot be
   injected mid-scenario through the declarative runner; a bounded backend probe
   verified the underlying behavior instead.
