# Owned booking foundation — implementation handoff

Implemented 2026-09-22 on `implement/owned-booking-slice`, based on develop
`0035948769856a85baa676bc3a37d6d7d164ac28`. Commit and push are authorized; merge,
beta approval, real dispatch, payments and production changes are not.

## Behavior and selected boundary

An organization offering resolves one service, provider and location in one
business. Guest submission creates a canonical Appointment and creation history
atomically. The authenticated assigned provider sees that same reference in
reception and calendar reads. Managers are scoped to their businesses; ordinary
customers and foreign staff cannot use the covered staff/document surfaces.
Membership revocation is evaluated at request time. Linked-record and write
checks run in the document controller, including generic writes.

Location IANA time governs effective hours; instants and occupancy are stored in
UTC. Layered hours, explicit closures, holidays, duration, minimum notice and
buffers are enforced on write. A locked User row serializes that provider's
capacity across locations/business provider records. Half-open overlaps are
rejected. Same request identity plus same payload returns the stored result;
changed payload is rejected. Browser retries preserve the request identity.
The request transaction owns booking, initial Version and retry result together.

The existing Frappe framework, forms, hours intersection and personal scheduling
remain. Public organization orchestration now writes Appointment instead of an
independently committed Booking Event. There is no dual-write synchronization or
migration of demo bookings. Legacy personal/group Booking Event writes receive
shared provider-capacity guards, but their full lifecycle is not replaced.
Reception mock rows were removed; load failures are visible. Confirmation says
the booking was saved and delivery is unconfirmed; it does not claim email sent.

## Verification

| Check | Result and evidence |
|---|---|
| Separate HTTP clients and database assertions | 9/9 pass: Guest/provider handoff, foreign/customer denial, generic mutation and mixed-link denial, revocation, exact replay, changed-payload rejection, overlaps, controlled concurrent collision/retry, injected failure rollback, hours/holiday/buffers, cross-location occupancy, offset equivalence and DST rejection, authenticated React/Desk/API/WebSocket. [Log](evidence/backend-acceptance.txt). |
| Retained scheduling regressions | 8/8 pass: availability, configuration, catalog, staff create, reschedule, cancellation, walk-in and translation resource presence. Resource presence is not translation review. [Log](evidence/scheduling-regression.txt). |
| Desktop Guest browser | BQA-2026-00024 Passed (catalog + booking). Fresh anonymous context. |
| Authenticated provider browser | BQA-2026-00025 Passed. Explicit provider identity verified through get_logged_user; same stable booking reference returned by reception. |
| Mobile browser | BQA-2026-00026 Passed (catalog + booking), 390×844, Asia/Kolkata. Stored 06:30 UTC / 09:30 Addis Ababa displays 12:00 Asia/Calcutta. |
| Build and static checks | Vite production build passed (Node 24.12.0, 86 PWA precache entries); new core/access/fixture/acceptance modules and QA runner pass Ruff; diff whitespace check passes. |
| Cleanup | Exact test/browser fixtures removed, no remaining owned records or child rows. User sessions cleared and defaults removed. [Browser cleanup](evidence/browser-cleanup.json). QA run evidence intentionally retained. |

Browser execution used `appointment.qa_runner.run` → Agent Plane → Agent Harness,
with certified preflight (Node 24.12.0, Playwright 1.58.2, Chromium 145.0.7632.6).
No direct Playwright execution. Guest uses supported `auth: none`, because Harness
rejects Guest as an authenticated frappe_session; stored owner and the anonymous
request trace establish identity. Provider uses explicit frappe_session user.
The runner forwards trace/video/instruction capture and retains exact fixtures
across identity runs until explicit cleanup.

[Sanitized responses](evidence/browser-handoff-responses.json) correlate Guest
reference `APT-094b258d84ff1600163a` with the provider response and
[stored records/history](evidence/stored-browser-bookings.json). Mobile reference
is `APT-eb0210b1cf953e606816`. All five scenario reports show success and zero
console/network errors. Visual baselines were newly created, so baseline drift
is ignored explicitly; these are functional passes, not baseline approvals.
Screenshots and sampled actual session-video frames were inspected. The mobile
confirmation is scrollable and its full reference is below the initial viewport;
this evidence does not close mobile usability/accessibility review.

- [Guest confirmation](evidence/guest-confirmation.png)
- [Provider handoff](evidence/provider-handoff.png)
- [Mobile confirmation](evidence/mobile-confirmation.png)
- [Raw local artifact locations and SHA-256 hashes](evidence/browser-artifact-index.json)

Raw traces may contain session material and stay local; only allowlisted response
fields and synthetic screenshots are committed. Each scenario has its own video;
the BQA top-level video alone may cover only the catalog. Raw `/tmp` paths are
local and temporary, not a portable archival guarantee. Initial diagnostic runs
BQA-2026-00022/23 also passed; their fixtures were cleaned before the final run.
During development, rejected requests exposed a translation-name shadowing bug
and realtime exposed a callback-host error; both were corrected before final
acceptance. Earlier failures do not count as passes.

## Reproduce and continue

See [runtime runbook](owned-booking-runtime.md). Use only that disposable site.
From its Bench, with the worktree on PYTHONPATH:

```bash
bench --site meet-beta-implement-owned-booking-slice-a95902.localhost execute appointment.tests.test_owned_booking.run
bench --site meet-beta-implement-owned-booking-slice-a95902.localhost run-tests --app appointment --module appointment.tests.test_scheduling_workflows --skip-before-tests
```

For browser checks, call `appointment.tests.owned_booking_fixtures.prepare_browser`,
then `appointment.qa_runner.run` separately with the absolute guest/provider/mobile
manifest paths under `qa/manifests/owned-booking`, base URL
`http://127.0.0.20:25310` and `fixture_scope='owned_booking'`. Use the certified
Harness environment described in the accepted browser QA access document. After
inspection call `verify_browser`, then `finish_browser`; never substitute a
snapshot/prefix/global cleanup. The guard intentionally rejects other sites.
No test/browser fixture accounts remain after this handoff.

## Boundaries still open

This is engineering acceptance of a foundation slice. The complete selected
customer journey, visible onboarding, manager/reception roles and transitions,
self-service change/cancel, repeat customers, rooms/equipment/group capacity,
recurrence, integration delivery/reconciliation and broader exposed endpoints
need their own implementation and acceptance. Slot navigation currently advertises
all weekdays while actual day slots obey closures. Legacy personal/group paths
retain their representation and require broader regression coverage before release.
Existing data with no canonical occupancy fields is not backfilled: deploy only to
a fresh target unless a separately designed migration is approved.

Language choice and reviewed English/Amharic journeys, accessibility, abuse/load,
privacy/retention, topology, support/SLA and recovery remain Phase 7 release gates.
The owner has not selected those policies. No beta-readiness claim is made.
The preserved assessment runtime, database, QA accounts and evidence were not
migrated, reset or repointed.
