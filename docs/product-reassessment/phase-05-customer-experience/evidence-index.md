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
(`event_token` values are redacted). The trace archives themselves are not committed;
small reports and selected response extracts are the durable evidence.

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
| F1 confirmation misstates details and delivery status | BQA-2026-00106 confirmation (png + html) | `probes/outputs/p5-trace-summary.json` (`event_id`, no `booking_id`); `useBookingSubmit.ts:110-118`; `ConfirmationModal/index.tsx:94-107,121-124,222-226`; `organization-appointment/index.tsx:240-241,608` |
| F2 original URL 404; host-adjusted route creates an additional booking; no cancel in inspected surface | BQA-2026-00109 d1/d2/d3 | `probes/outputs/p5-trace-summary.json` management request body; `appointment/index.tsx:199-215`; `event_override.py:197-220` |
| F3 booked slot not removed → double-booking | BQA-2026-00113; probe | `probes/outputs/p5-conflict-probe.txt` (`CHANGED_SLOTS`); `probes/p5_conflict_probe.py` |
| Timezone qualification (within F3) | BQA-2026-00106; coordinator probe | `probes/outputs/p5c-verification.json`: User Asia/Kolkata, location Africa/Addis_Ababa, site empty; not proof that both schedules use Addis |
| F4 booking page remains English after toggle | BQA-2026-00112 e3 | amharic report body text; `useTranslation` usage search (landing/home only) |

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
- **Original pre-default-cleanup audit** (`probes/outputs/p5-cleanup-audit.json`): business tables
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
3. The runner deletes new Booking Events/Appointment Groups at teardown. The
   management scenario seeded a separate original booking and rewrote its URL
   host for one diagnostic. It was not the earlier public customer booking
   carried across runs or a delivered-email journey.
4. The agent did not establish a supported mid-scenario conflict injection.
   The exact checkout race is untested; a separate bounded server probe confirms
   sequential duplicate acceptance. This is not proof no harness arrangement
   could ever exercise the race.

## Coordinator verification

- `probes/p5c_verify.py` calls the actual booking method twice as Guest for the
  same offered slot, reads back the two distinct stored events on the same
  calendar/interval and records slot state after each write. This is a backend
  reproduction, not a browser replay.
- `probes/outputs/p5c-verification.json` preserves the allowlisted outcomes and
  cleanup record. It records the actual fixture User timezone (Asia/Kolkata),
  location timezone (Africa/Addis_Ababa) and empty site timezone. This replaces
  the unsupported assertion that both availability and location used Addis.
- `probes/outputs/p5c-final-audit.json` is the final audit after the original
  default cleanup and coordinator check. Eleven business tables, disposable users,
  defaults and sessions are empty; four retained enabled users and their four
  Browser Accounts/Sessions remain. Synthetic Comment history remains disclosed.
- The first coordinator attempt failed in output/cleanup bookkeeping after the
  runner cleared its state dictionary. Its business fixtures were removed;
  `probes/p5c_finish.py` removed its one exact residual default after asserting
  the parent user was absent. The corrected probe then produced the stored
  duplicate evidence. No product changes or broad deletions were performed.
- The no-availability scenario demonstrates a visible empty state, not successful
  next-available navigation. The keyboard manifest uses clicks/fills alongside
  Tab and Enter; full keyboard-only completion is untested. The language scenario
  stops at the booking page, so no complete Amharic lifecycle was executed.
- Muted email prevents delivery testing. It does not establish failed production
  delivery. Management evidence must distinguish original-host 404 from the
  host-adjusted diagnostic and cannot certify real-message discoverability.
- Returning-customer evidence shows repeated booking with the same email only;
  customer identity matching/history and substantive privacy expectations were
  not assessed. These are coverage limits, not automatically product defects.
