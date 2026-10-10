---
tags: [plan, appointment, operations, go-live]
created: 2026-10-10
status: built and verified 2026-10-10
---

# Go-live preparation

## Decision (2026-10-10)

The user asked for go-live preparation, so that the app can move to a real server soon after the Chapa keys, the AfroMessage token and the Amharic review arrive. This work is app-side preparation only. The hosting decisions in [the deployment plan](DEPLOYMENT_AND_SERVER_PLAN.md) stay open for the user, and nothing is provisioned on a real server.

## Work

### A. Readiness report

`bench --site <site> execute appointment.ops.go_live.report` returns a list of checks with `pass`, `warn` or `fail`, and a short fix for each failure. It reads only: it changes nothing and never prints a secret.

| Area | Checks |
|---|---|
| Site config | `developer_mode` off. `mute_emails` and `pause_scheduler` off. The dev-only keys are absent: `rich_demo_enabled`, `isolated_test_suites`, `allow_tests`, `worktree_development`. `host_name` is HTTPS. `encryption_key` is set. The public-experience platform hosts are set. |
| Email | A default outgoing Email Account exists, is enabled and is not a dev placeholder. |
| SMS | If any business turned SMS on, the gateway is configured. Only whether it is set is reported. |
| Payments | If any business collects online payments, the Chapa keys and the webhook secret are set. The platform payment settings (legal name, receipt prefix, TIN) are filled. |
| Scheduler | The app's scheduled jobs exist and are not stopped. |
| Translations | The Amharic Translation records cover the catalog in `en.json`. |
| Build | `appointment/public/frontend/index.html` exists. `wkhtmltopdf` is available, for receipts and statements. |
| Data | Showcase or QA data is present, which is a warning on production. At least one System Manager besides Administrator. |

The report has tests, and the runbook documents it.

### B. Clean-install drill

1. Create a new local site on the integration bench and install `appointment` with no demo data. Run `migrate` twice to prove the patches can run again.
2. Run the readiness report and expect only dev warnings.
3. Through the real APIs:
   - register the first owner and create a business;
   - publish its booking page;
   - make a guest booking;
   - check that the confirmation email is queued.
4. Record the results, then drop the drill site.

### C. Backup and restore drill

1. Take a backup of the integration site with its files.
2. Restore it into a new local site.
3. Verify:
   - the record counts of the main DocTypes match;
   - private files (receipt and statement PDFs, uploads) open;
   - a staff login works;
   - a public page and a manage link work.
4. Time each step, and write the restore procedure with the measured RTO.
5. Drop the drill site.

### D. Production build from a clean clone

Clone `develop` into a temporary directory, run `npm ci` and the production build there, and confirm:
- the lockfile is complete;
- the output lands in `appointment/public/frontend`;
- `www/index.html` and `www/schedule/index.html` include the built entry.

Do not run a bare `bench build` in the stack: it rebuilds the shared frappe assets for every stack.

### E. Go-live runbook

`docs/operations/GO_LIVE_RUNBOOK.md` gives the steps from a provisioned server to the first business taking bookings:
- install and build;
- site config keys;
- secrets: Chapa keys and webhook, the AfroMessage token, Email Account;
- the scheduler and workers;
- the readiness report;
- backups and restore;
- monitoring;
- rollback;
- turning off dev flags.

It links to the deployment plan for the infrastructure and lists the decisions that are still open.

### F. Guest endpoint review

List every `allow_guest=True` method. For each one, check:
- the rate limit;
- the input validation;
- the token or signature check;
- that it leaks no data across businesses.

Fix clear defects, with tests. Report anything that needs a decision.

## Run record

| Part | Result | Details |
|---|---|---|
| A. Readiness report | Built | `appointment/ops/go_live.py`, tests in `test_go_live`. On the dev site: 11 pass, 7 warn, 10 fail, as expected for a dev site. |
| B. Clean install | Pass | [Drills](DRILLS_2026-10-10.md). Install took 79 s; migrate ran twice with no errors; the owner sign-up, business setup, publishing and guest booking APIs all passed. |
| C. Backup and restore | Pass | [Drills](DRILLS_2026-10-10.md). Counts are identical, all 468 private files are on disk, and login, the public page and the manage link work. The total RTO was about 95 s. The original `encryption_key` must be copied. |
| D. Clean-clone build | Pass | [Guest endpoint review](GUEST_ENDPOINT_REVIEW.md). `npm ci` and the build work on Node 22, and the output is 3.5 MB. |
| E. Runbook | Written | [GO_LIVE_RUNBOOK.md](GO_LIVE_RUNBOOK.md), with the measured restore steps. |
| F. Guest endpoints | 49 reviewed, 4 fixed | [Guest endpoint review](GUEST_ENDPOINT_REVIEW.md). 7 findings need a decision. |

### Defects found and fixed

- **Newsletter campaigns never ran.** `scheduler_events` had two `"cron"` keys, and the merge with develop kept only one, so `campaigns.run_due` was never scheduled. The two dicts are now one, and the job is registered on the dev site.
- **A fresh install had no Amharic.** The catalog was imported only by patches, and a new site marks patches as done without running them. The import now also runs after install and after every migrate. It only adds or updates, reads the existing rows once, and takes about 1 s.
- **Production links could be `http://`.** The platform host was always treated as local. It is now local only while `brand_public_experience_edge_tls` is off, so the production origin is `https://`.
- **Business setup returned `provider_name: null`.** The provider record that `workspace.create` makes now has the owner's `full_name`.
- **Unknown public paths answered 500.** `PublicResolutionError` now answers 404.
- **Build hygiene:** a dev comment was removed from `frontend/index.html`. Node 22 is pinned in `frontend/.nvmrc`, and `engines` requires Node 20 or later.

### Incident

The first clean-install run reached the dev site through `bench serve` with no `--site`. It created one sign-up, business and booking there; the email was muted. They were deleted through the document lifecycle on 2026-10-10. Only audit logs (Activity, Permission, Version) remain.

### Verification after the fixes

| Check | Result |
|---|---|
| Full backend regression, 39 modules, including `test_go_live`, `test_guest_endpoints` and `test_app_identity` | All pass |
| Frontend DOM tests and typecheck (178, unchanged) | Pass |
| Agent Plane BQA-2026-00148, 00149, 00151, 00152 and 00153: my-bookings, booking form, develop-features owner and independent customers, staff-ui owner | Passed. The console entries are known noise: reduced-motion warnings, the sandboxed preview, and the expected 403 for a reused link. BQA-2026-00150 hit an Agent Plane record-save race and passed on retry as 00153. |
