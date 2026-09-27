# Launch progress after the visible workflow increment

Updated 2026-09-22. The owner authorized Windows access, foundation review,
visible setup/publication/Guest booking/staff lifecycle, and incremental launch
engineering. Work continues on `implement/owned-booking-slice` in the existing
isolated runtime. No assessment resources were migrated or reset. No merge,
release, customer invitation, real dispatch or payment execution occurred.

## Scope selected for this increment

An existing enabled Provider account can create a business, location, weekly
hours and its first service through `/settings/business`. Creation is a single
transaction and produces a draft. The manager explicitly publishes its booking
page. Guest books through the existing public form. Reception opens that same
reference, reschedules it, shows history and cancels it, releasing capacity.
The new surface is linked from Reception and leaves existing settings available.

This is the shared foundation for solo and organizational workflows; it is not a
silent decision to launch solo-only. Self-signup, invitations/delegated reception
roles and the complete team/location workflow remain separate gates. Setup uses
a zero-priced service and does not enable payment collection or customer messages.
English strings in this increment are not bilingual acceptance or a launch-language
decision. Owner questions about first audience, languages and notifications remain
pending unless answered later in this task.

## Review findings and resolution

### Standards

The foundation review found one documented issue: the prior pushed commit title
lacked the required Conventional Commit prefix. Its history was retained; new
commits use the convention. Two heuristic concerns were addressed: canonical
capacity SQL now has one helper using `ACTIVE`, and `ResolvedOffering` names the
five linked documents. The increment review found no new documented violations.
Duplicated frontend request-key initialization is an optional small refactor,
not a correctness blocker.

### Spec

The following concrete findings were fixed and covered:

1. Non-time edits preserve the original booking zone, UTC instant and occupancy
   even if location configuration changes. Explicit rescheduling uses the recorded
   zone and revalidates hours/capacity.
2. Identical public retries return the stored result after unpublishing. New
   requests must still pass public eligibility checks.
3. Setup retries use the shared User lock plus a locking current read, preventing
   repeatable-read snapshots from missing a competing committed setup.
4. Setup persists a private payload digest/result and rejects changed-payload key
   reuse. Generic configuration edits cannot overwrite those retry fields.
5. A manager can cancel after provider membership or account revocation; historical
   ownership validation is separate from new-time eligibility. Revoked providers
   retain no access through this exception.

6. The broad suite exposed copied legacy calendar queries using `Event` instead
   of `Booking Event` and an undefined event type alias. Those were corrected.
   Lists and calendar reads now enforce owner/public/shared or authorized linked
   record access; supplying another user is rejected outside Administrator.
   An own/foreign linked-private-event HTTP test preserves legitimate organizer
   access. Linked-reference evaluation is not yet load-tested at large scale.
7. Exact cleanup now refreshes its database snapshot before finding records
   committed by independent HTTP requests. One earlier synthetic orphan was
   identified and removed by exact ID.

## Evidence and remaining gates

| Gate | Current status | Next acceptance needed |
|---|---|---|
| Windows local review | Unique frontend forwarding installed; Synthetic Provider login/identity verified; setup and Desk HTTP200 from Windows. | Retest forwarding after WSL IP changes. |
| Ownership, capacity, retry, history | 17 isolated HTTP/database acceptance cases pass, including concurrency, rollback, mixed links, revocation and lifecycle release. | Broader exposed endpoint/file/job/search/export audit and complete role matrix before customers. |
| Visible setup and staff lifecycle | Setup→publish→Guest booking→staff reschedule/cancel passed through Appointment QA → Agent Plane → Agent Harness; stored history and freed slots verified. | Self-signup, team invitation, delegated reception, multiple locations, exceptions UI and owner workflow review. |
| Request abuse | Canonical creation limited to60 requests/IP/minute; slots to120/IP/minute, shared across callers of these functions. HTTP429 rejection verified. | Production ingress must enforce trusted forwarded IP headers; distributed abuse, fairness, CAPTCHA strategy and expected peak load remain untested. Limits are engineering defaults, not SLA capacity. |
| Customer data/support | `appointment.scheduler.support.customer_record` permits only the business manager, matches explicit business+email, includes canonical booking/history fields, excludes private retry material. Foreign/provider/customer denials tested. | Verified requester identity, contact corrections/old-email matching, files, legacy records, deletion/retention policy and assigned operator. Endpoint is a bounded support export, not complete regulatory compliance. |
| English/Amharic and accessibility | Existing resources retained. New setup fields have labels; lifecycle uses the existing accessible Dialog component. Desktop browser evidence captured. | Human language review, complete translated journeys, keyboard/screen-reader/mobile acceptance. |
| Notifications/integrations/payments | UI states that messages are not sent. No external effects enabled. | Owner channel/gateway selection, credentials and sandbox lifecycle/retry/failure/reconciliation evidence for every offered promise. |
| Recovery and operations | Existing isolated runtime/runbook maintained; no destructive drill executed. | Exact separate restore target, synthetic manifest, protected backup/key custody, muted restored services, measured restore validation, owner-selected RPO/RTO/support/retention. See accepted recovery drill. |
| Engineering checks | Production build and DOM/realtime checks pass. Full app suite: 12 integration tests plus46 other tests pass, with4 cloned-data checks skipped on this fresh site (54 passes,4 skips). Expanded acceptance is included. | Existing repository-wide TypeScript diagnostics remain; compare baseline rather than claim a clean typecheck. |
| Marketing and launch scope | Marketing delivery ledger retained unchanged. | Explicit staging of offered promises, substantiated factual claims, final owner acceptance and release authorization. |

## Operational use

React: `http://127.0.0.20:25310`; setup: `/settings/business`; reception:
`/reception`; Frappe Desk: `/app`. Use the private review credentials file named
in the runtime runbook. A separate synthetic Provider and September 23 10:00
booking are retained for your walkthrough. Do not paste credentials into
logs or artifacts. Keep the demonstration synthetic and email/scheduler muted.

Customer export is a read-only authenticated GET with `organization` and `email`
to `/api/method/appointment.scheduler.support.customer_record`. Verify the
requester's identity before delivering any export. Its payload has no booking
retry hashes/results. Do not represent an empty email match as proof the customer
has no records elsewhere or under a previous address.

Use the existing [runtime runbook](owned-booking-runtime.md) for startup and logs.
The private setup request fields require migration of a fresh implementation
schema; this migration was applied only to the isolated implementation site.
The preserved assessment site is not a deployment target for this branch.


## Final evidence index

- [Windows authenticated checks](evidence/workflow/windows-auth.json)
- [Full suite: 58 tests, 54 passed and 4 skipped](evidence/workflow/full-suite.txt)
- [Final browser runs and raw local artifact hashes](evidence/workflow/browser-runs.json)
- [Allowlisted browser responses](evidence/workflow/responses.json)
- [UI-created booking lifecycle stored result](evidence/workflow/stored-lifecycle.json)
- [Final readable-history stored result](evidence/workflow/polished-history-stored.json)
- [Exact browser cleanup](evidence/workflow/browser-cleanup.json) and [presentation-run cleanup](evidence/workflow/polished-history-cleanup.json)
- [Published setup](evidence/workflow/visible-business-published.png) and [readable cancellation history](evidence/workflow/visible-cancelled-history.png)
- [Typecheck comparison](evidence/workflow/typecheck-comparison.json):230 unique baseline diagnostics,230 current, none introduced.

BQA-2026-00036/37/38 passed the final UI-created business journey. BQA-2026-00039/40
then verified the final padded dialog and human-readable history labels using a
fresh synthetic offering. All scenario reports show no console/network errors.
Screenshots and actual session-video frames were inspected. Baselines were new,
with drift explicitly ignored; these are functional passes, not design approvals.
Raw trace/video files are local (see hashes), may contain session material, and
are not committed. Only synthetic screenshots and allowlisted results are shared.

The first full-suite attempt exposed the callback-length setup issue, an earlier
fixture orphan, then the legacy recurrence/list defects; final reruns passed
following the corresponding fixes. CSS2.1 warnings from legacy email rendering
remain in test output and did not fail tests. No whole-project typecheck pass is
claimed. The new frontend files pass focused ESLint; the production build and
existing DOM/realtime checks pass.
