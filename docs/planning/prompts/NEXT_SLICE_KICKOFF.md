---
tags: [prompt, appointment, kickoff]
created: 2026-10-02
---

# Task: Appointment, next slice: two staff fixes, then customer notifications

You are working on the Appointment app, a Frappe 17 and React/Vite scheduling and booking platform for service businesses: solo professionals and multi-provider businesses. Work through the phases below in order. Stop and ask me at every **Decision** point. Do not guess.

## Environment (already running; do not reprovision)

- This prompt is committed in the repository at `docs/planning/prompts/NEXT_SLICE_KICKOFF.md`. Run every command from the worktree below.

- Machine: the main laptop (WSL2, Ubuntu). Do not touch the parked copy on the mini PC.
- Worktree: `/home/minte/projects/training-apps/.worktrees/frappe-appointment-analytics-operations`
- Branch: `feat/analytics-operations`. It is 12 commits ahead of `origin`. Do not push; commit only when a phase is verified.
- App (Vite + React, hot reload): `http://127.0.0.84:44430`. Desk: `http://127.0.0.84:44430/app` (sign in as `Administrator`). Use this unique URL rather than `localhost`; it works from Windows and WSL and avoids cookie clashes with other stacks.
- If the stack is down, run `frappe-worktree up` from the worktree and wait until `frappe-worktree status` reports the frontend as reachable.
- Site: `meet-beta-feat-analytics-operations-f2ca8e.localhost`
- Bench: `/home/minte/.local/state/frappe-worktree-stack/feat-analytics-operations-f2ca8e/bench`
- Stack (run from the worktree): `frappe-worktree status`, `frappe-worktree up`, `frappe-worktree stop`; tmux session `fw-meet-beta-feat-analytics-operations-f2ca8e` with windows info, redis-cache, redis-queue, backend, socketio, worker and frontend.
- Prefix frontend commands with `export PATH=$HOME/.nvm/versions/node/v22.22.2/bin:$PATH`; the default node is too old. Frappe CLI needs `export PATH=$HOME/.local/bin:$PATH`.
- Frappe CLI (use it for live reads and seeding): `frappectl-dev meet-beta-feat-analytics-operations-f2ca8e auth whoami` should return `frappectl-agent@example.test`.
- Credentials: never print them.
  - Administrator: `/home/minte/.local/state/frappe-worktree-stack/feat-analytics-operations-f2ca8e/credentials.json`
  - Demo personas: `<bench>/sites/<site>/private/rich-demo-v1.json`
- Demo data is synthetic: five businesses (Selam, Meron, Bloom, Tena, Abugida) and about 1,430 appointments, anchor date 2026-09-23. Useful logins: `bloom.owner@`, `bloom.manager@`, `bloom.provider1@`, `bloom.reception@`, `multi.manager@`, `selam.owner@` and `tena.owner@example.test`.
- Site flags: `mute_emails=1` and `pause_scheduler=1`. Keep them. Prove email work through `Email Queue` records, not real delivery.
- Do not reseed, do not delete demo records by hand, and do not migrate unless your change adds schema. If it does, take `bench --site <site> backup --with-files` first.

## Read first

- `AGENTS.md` and `CONTEXT.md` (domain language: Business, Customer, Customer Profile, Offering and the rest).
- `docs/features/STAFF_UI_UPGRADE_AUDIT.md`, especially its "Known limitations".
- `docs/feature/customer-profile-resource-capacity-implementation-plan.md` (customer profiles; resources are out of scope).
- `appointment/scheduler/booking.py`: `book()` and `change()` return `notification_status: "not_sent"` (around lines 303 and 450).
- Use the `frappectl-dev`, `frappe-app-dev`, `code-style` and `technical-writing` skills where they apply.

## Product focus

Appointments and scheduling: bookings, availability, providers, working hours, services, customers, rescheduling and confirmations. Do not work on group or shared capacity, rooms, equipment, vehicles or custom domains in this task.

## Phase 0: confirm the baseline

1. Check `frappe-worktree status` and that `git status` is clean.
2. Run `npm run -s test:dom` in `frontend/`.
3. Run the landing manifest through Agent Plane (command below) and record the run ID.

Report any pre-existing failure separately; do not fix unrelated things.

## Phase 1: two known staff bugs (small, test first)

1. **Booking policy update.** Editing an existing booking policy can fail.
   - `frontend/src/pages/settings/components/PolicyForm.tsx` (around lines 59–61; a comment there describes the problem) sends the form's display name as `policy_name`.
   - `update_policy(policy_name, **kwargs)` in `appointment/scheduler/api/policy_manager.py` (around line 449) loads the document by that argument.
   - Policy documents use a naming series, so the display name is not the document `name`.

   Fix it so the record ID and the editable label stay separate: the frontend sends the document `name` as the identifier, and the label as a field. Keep the toggle and delete calls in `PolicyManager.tsx` working; they already send `policy.name`. `update_policy` also returns `({"error": ...}, 403)` tuples instead of raising, so make permission failures raise `frappe.PermissionError` and update the callers. Add backend tests: update the label of an existing policy, and a refused update by a user who does not own it.
2. **Same service at several locations.** The business page lists one row per offering, but the `workspace.overview` API (`appointment/scheduler/workspace.py`) returns no location name, so rows for the same service at different locations look identical. Add the location to the API response and show it in the row. Add a test.

Then verify both in the browser through Agent Plane as `bloom.owner@example.test`, commit, and continue.

## Phase 2: customer notifications. Plan first, then build email

Today a booking is confirmed instantly, but the customer is never told, and the existing reminders go to staff only.

1. **Plan.** Write `docs/features/CUSTOMER_NOTIFICATIONS_PLAN.md` in plain technical English. Cover:
   - which events notify the customer: confirmation, staff reschedule, staff cancel, and a reminder before the appointment;
   - per-business settings: on or off per event, and reminder lead time;
   - templates in English and Amharic, using business identity and safe links only;
   - delivery through Frappe's email queue and background jobs;
   - a reminder job, run by the scheduler, that is idempotent;
   - real `notification_status` values;
   - where staff see delivery status;
   - opt-out handling;
   - tenant isolation and abuse limits;
   - tests.

   Base it on the existing code; do not invent endpoints.
2. **Decision:** stop and show me the plan summary. Ask me to choose:
   - the SMS provider (or "email only for now");
   - the default reminder lead time;
   - whether customers can opt out per business.
3. **Build email first**, after I answer. Write tests for the job and the templates. Prove queued mails with `Email Queue` records, because email is muted. Show delivery status where the plan says.
4. **Verify in the browser** through Agent Plane. Cover:
   - a guest booking on `/bloom-studio/book`, leading to a queued confirmation;
   - a staff reschedule and a cancel as `bloom.manager@`;
   - the business notification settings page;
   - the status display.

   Run each at desktop 1440×900 and mobile 390×844, in English and Amharic.

Customer profiles are the next slice after this one. Do not start them here.

## Browser QA: Agent Plane only (never invoke Playwright directly)

```bash
cd /home/minte/.local/state/frappe-worktree-stack/feat-analytics-operations-f2ca8e/bench
PYTHONPATH=$PWD/apps/appointment:$PWD/apps/agent_plane:$PWD/apps/agent_harness \
  bench --site meet-beta-feat-analytics-operations-f2ca8e.localhost execute appointment.qa_runner.run \
  --kwargs '{"manifest_name":"<absolute path to manifest>","base_url":"http://127.0.0.84:44430"}'
```

- Add manifests under `qa/manifests/<feature>/`. Copy the style of `qa/manifests/landing/day-world.yaml` (guest) and `qa/manifests/rich-demo/owner.yaml` (signed in; `auth.type: frappe_session` with a demo persona's `username`; the runner looks up the password).
- The `base_url` inside older manifests (for example `127.0.0.174:41960`) is stale. The `base_url` in the run command overrides it, so always pass `http://127.0.0.84:44430`.
- Run artifacts are also attached privately to the site as `BQA-…` files.
- Useful actions: `click`, `press` (selector + key), `select`, `fill`, `scroll` (`delta_y` ≤ 5000), `wait_for`, `screenshot`, `get_dom_snapshot`, `get_console_errors` and `get_network_errors`.
- Useful assertions: `visible_selector`, `visible_text`, `text_contains` and `url_contains`.
- Selectors must match exactly one element.
- Prefer `press` when a fixed overlay might cover the target.
- Give a disabled button's assertion a short `timeout_ms`.
- The runner refuses to save a trace while a sign-in screen is visible, so end each scenario on an app page.
- Runs take 5 to 15 minutes; run them in the background.
- Read each scenario's `report.json` under `/tmp/agent_browser_qa/<artifact_root>/` and look at the screenshots yourself before claiming anything works.
- Known quirks:
  - an occasional realtime `socket.io` 400 during navigation;
  - an occasional font CDN timeout from the network (the app serves its own fonts);
  - the runner's legacy fixture scope can fail with `QueueOverloaded` because about 550 orphaned jobs sit in a wrongly named Redis queue. Prefer the existing demo personas, and report it if it blocks you.

## Rules

- Keep screenshots, DOM snapshots and traces in Agent Plane artifacts. Never commit them. Record run IDs and results in the plan or feature doc.
- Run focused tests before broad ones:
  - `frontend/`: `npx tsc -p tsconfig.app.json --noEmit` (report only errors in files you touched), `npx eslint <paths>`, `npm run -s test:dom`;
  - Frappe: `bench --site <site> run-tests --module <module>`.
- Add every new string to both `frontend/src/lib/i18n/translations/en.json` and `am.json`. Avoid English strings that differ only in letter case from existing ones; the store is case-insensitive. Add a patch to import new Amharic strings (copy `appointment/patches/v0_1/import_landing_world_translations.py`) and run its `execute` on this site.
- Use shadcn components from `frontend/src/components/` and the existing staff shell for staff pages.
- Keep files small and code readable, and follow the existing patterns.
- Small commits per phase, each ending with the co-author trailer your harness provides.

## Done means

Each phase is committed with its tests passing, and its Agent Plane run is green apart from the known quirks. Its doc records the run IDs, and `git status` is clean before the next phase starts.

## Report back after each phase

What changed (files), the tests and their results, the Agent Plane run IDs with console and network error counts, decisions taken, and anything left open.
