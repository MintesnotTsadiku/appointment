# Appointment App Rename Implementation Plan

## Decision

Rename the existing app in a dedicated branch and worktree created from `beta/architecture-review`. Keep the repository and its history. Do not create a second app and copy modules file by file: that would split migrations, fixtures, patch history, imports, and ownership of the existing data.

Target names:

- product and Desk title: **Appointment**
- Frappe app identifier: `appointment`
- Python package: `appointment`
- repository: retain the existing `appointment` repository

The verified review worktree remains the rollback baseline. Create `refactor/rename-to-appointment` in a separate worktree and provision a separate cloned site before changing code or database identity.

## Product goal

The product began as an extension/fork of rtCamp's Frappe Appointment project and has evolved into Meet.et, a scheduling product aimed at Ethiopian small businesses and service providers. It supports organizations, providers, locations, services, availability, public booking, rescheduling, reception and walk-in flows, and English/Amharic presentation with Ethiopian time concerns. Local payment and messaging integrations are future product work. The rename should establish one coherent technical identity without changing the scheduling domain or customer records.

## Current verified baseline

- Repository: `https://github.com/MintesnotTsadiku/appointment.git`
- Branch: `beta/architecture-review`
- Worktree: `/home/minte/projects/training-apps/.worktrees/frappe-appointment-beta`
- Source bench: `/home/minte/projects/training-apps`
- Frappe: `develop`, commit `71d55e273f7` when the baseline was prepared
- Isolated runtime: `/home/minte/projects/appointment-worktree-runtimes/beta-architecture-review-5839d4`
- Site: `meet-beta-beta-architecture-review-5839d4.localhost`
- UI: `http://127.0.0.14:26300`
- Desk: `http://127.0.0.14:26300/app`
- Private credentials file: `/home/minte/projects/appointment-worktree-runtimes/beta-architecture-review-5839d4/credentials.json`
- Pre-agent backup: `/home/minte/projects/appointment-clone-backups/pre-agent-foundation`
- Original clone backup: `/home/minte/projects/appointment-clone-backups/20260917`

The clone preserves the existing data. Email is muted and the scheduler is paused. Baseline record counts are Appointment 70, Organization 3, Provider 5, Service 79, User 374, and File 7.

Installed on the isolated site: `frappe`, `frappe_appointment`, `agent_harness`, and `agent_plane`. Agent Plane owns browser QA records, policy, runs, and review artifacts; Agent Harness owns Playwright execution. Product QA manifests belong in this app under `qa/manifests`.

Two local compatibility fixes were required against current Frappe and are not part of this app repository:

- Agent Harness `agent_harness/setup/seed.py`: create new workspace records correctly and skip deprecated Workspace Sidebar/Desktop Icon records.
- Agent Plane `agent_plane/setup/security_roles.py`: clear the fresh-site dangling Public Web Research Agent Version default before early role-setting validation.

The shared training environment's Python foundation package versions do not match the versions certified by Agent Harness. Do not update the shared environment in place. Before beta release, provision a dedicated environment and pass the Harness foundation bundle verification.

## Why this needs a controlled migration

The app currently has three identities: the installed Python app is `frappe_appointment`, hooks declare `scheduler` and `Scheduler`, the app switcher uses Appointment, and public pages use Meet.et. Renaming only labels leaves broken dotted paths and an ambiguous installed-app identity. Renaming only the package can break hooks, patches, scheduled jobs, whitelisted endpoints, frontend calls, assets, and existing sites.

## Implementation phases

### 1. Freeze and inventory the contract

Create the new branch/worktree and clone the verified site into a new isolated runtime. Capture:

- installed apps, app versions, patches and scheduled jobs
- every `frappe_appointment`, `scheduler`, `Frappe Appointment`, and asset namespace reference
- whitelisted dotted paths used by the frontend or integrations
- DocType/module ownership and existing record counts
- public booking, reschedule, reception, login, and Desk routes

Add tests for imports, hooks, the important API paths, and data preservation before renaming.

### 2. Establish the canonical application identity

Rename the package directory and package metadata to `appointment`. Set `app_name = "appointment"`, `app_title = "Appointment"`, and update module/app metadata. Update Python imports, patch paths, hooks, fixtures, translations, build paths, asset paths, frontend API strings, and documentation. Keep the Git repository and history.

Do not rename scheduling DocTypes in this phase. Their names are business contracts and can be reviewed separately after the app identity is stable. If the logical Frappe module is currently `Frappe Appointment`, migrate its module ownership to `Appointment` with an explicit patch rather than relying on file movement.

### 3. Preserve upgrade compatibility

Not applicable. The app was never released under the old identifier, so no
compatibility package, alias, stored-path migration or legacy patch path is
retained. See "Finalization status" below. Existing-site transfer is explicitly
out of scope.

### 4. Validate on cloned production-shaped data

Run migrate twice. Compare the baseline counts and sample relationships. Exercise:

- admin login and Appointment Desk workspace
- organization/provider/location/service configuration
- availability and public booking
- reschedule/cancel flows
- reception and walk-in flows
- English and Amharic presentation
- Socket.IO and background-job startup with outbound email still muted
- legacy API aliases and new canonical API paths

Run product-owned Agent Plane browser manifests with `frappe_session` authentication. Save the Browser QA Run evidence and investigate console/network errors. Use direct Playwright only while developing Agent Harness itself.

### 5. Release and remove compatibility deliberately

Document backup and rollback commands, the minimum supported source version, and the compatibility window. Beta is ready when a fresh install and an upgraded cloned site both pass migration, data comparison, backend tests, browser QA, and a rollback rehearsal. Remove the compatibility package only in a separately announced release after callers have moved.

## Acceptance criteria

- A fresh site installs `appointment` without `frappe_appointment` as its canonical installed app.
- An existing cloned site upgrades without losing records, permissions, files, or relationships.
- Existing supported URLs and API calls either continue through documented aliases or have an explicit migration.
- App switcher, Desk, package metadata, and docs say Appointment consistently; public Meet.et branding changes only if product decides it separately.
- Migration is idempotent and a second migrate is clean.
- Agent Plane browser smoke and scheduling flows pass on the isolated site.
- The dedicated runtime passes Agent Harness dependency preflight before beta sign-off.
- Rollback from the pre-migration backup is demonstrated.

## Finalization status

Decision update: the app was never released under `frappe_appointment` /
`scheduler`, so no backward compatibility is retained. The `frappe_appointment`
shim package, the site-identity migration and the legacy patch paths have been
removed. `appointment` is the single canonical identity and testing targets a
fresh install.

Branch `refactor/rename-to-appointment`, worktree
`/home/minte/projects/training-apps/.worktrees/frappe-appointment-rename`,
isolated runtime `refactor-rename-to-appointment-4c34e9`. The verified
`beta/architecture-review` worktree, its runtime and the shared Python
environment were left untouched.

Reference inventory: `docs/rename/reference-inventory.md`.
Testing guide: `docs/rename/testing-guide.md`.

### What changed

- Outer package and installer metadata moved to `appointment` / **Appointment**.
- Imports, hooks, patches, scheduled jobs, fixtures, assets, build paths,
  frontend API strings and docs use `appointment.*`.
- `patches.txt` lists canonical `appointment.patches.v0_1.*` paths only.
- Fresh install imports email templates from `after_install` and applies the
  `Appointment Settings` Link defaults after the templates exist, so
  `init_singles` cannot fail on a fresh site.
- Primary Frappe module and package renamed: `Frappe Appointment` →
  `Appointment`, `appointment/frappe_appointment/` → `appointment/appointment/`,
  with all module metadata, fixtures and `appointment.appointment.*` dotted
  paths updated.
- Business DocType names are unchanged.

### Validation performed

- Fresh install: `bench new-site --install-app appointment` plus two migrates
  installs only `frappe, appointment`; the second migrate is clean; the three
  email templates and `Appointment Settings` defaults are populated.
- Characterization tests: `appointment.tests.test_app_identity` pass on the
  canonical site.
- Browser QA executed through Agent Plane with `frappe_session`. Earlier runs
  (`BQA-2026-00042`/`00044`/`00045`/`00046`) only proved that routes rendered;
  they did not perform scheduling actions. The corrected action-based runs are
  recorded in the "Beta review fixes" section below.

### Environment prerequisites (not app defects)

- The shared training Python environment does not match the certified Agent
  Harness foundation bundle; use a dedicated certified runtime for sign-off.

The Agent Plane fresh-install ordering and deprecated-navigation defects were
fixed upstream (see "Beta readiness follow-up" below); `appointment.qa_bootstrap`
has been removed.

### Next steps

- Test on a fresh site (see `docs/rename/testing-guide.md`).

## Module rename execution (final)

The primary Frappe module was renamed: `Frappe Appointment` → `Appointment`,
package `appointment/frappe_appointment/` → `appointment/appointment/`,
`modules.txt`, DocType/Workspace/Form Tour metadata, fixtures, hooks fixture
filters and all `appointment.frappe_appointment.*` dotted paths updated.
`reload_doc("Frappe Appointment", ...)` is now `reload_doc("Appointment", ...)`.
Business DocType names are unchanged. Checkpoint tag:
`appointment-app-identity-before-module-rename`.

Static gates (all pass): no `appointment.frappe_appointment`, no
`"module": "Frappe Appointment"`, no `reload_doc("Frappe Appointment"`, no
`^Frappe Appointment$` in `modules.txt`; Python compile, 59 app JSON files parse,
`git diff --check` clean.

Fresh install `fresh-appointment-module.localhost`: `frappe + appointment`,
two clean migrates, `Module Def Appointment` owned by `appointment`, no
`Frappe Appointment` module, the ten affected DocTypes owned by `Appointment`,
templates/settings/scheduled jobs canonical. Characterization tests: 15/15 on
the fresh site (one expected data skip) and 15/15 on the cloned data site
(counts 70/3/5/79 preserved).

Agent Plane Browser QA (frappe_session) after the rename:
`BQA-2026-00042`, `BQA-2026-00044`, `BQA-2026-00045` (provider workspace +
reception) and `BQA-2026-00046` (Desk + landing). These runs only asserted that
routes rendered; they did **not** perform the functional actions the manifest
claimed. That gap is fixed in the "Beta review fixes" section below.

## Beta review fixes

Branch `fix/appointment-beta-review-findings`, worktree
`/home/minte/projects/training-apps/.worktrees/frappe-appointment-fix`, isolated
runtime `fix-appointment-beta-review-fi-35bb7b`.

What changed:

- Vite proxies `/app`, `/apps`, `/desk`, `/api`, `/assets`, `/files`, `/private`,
  `/login`, `/logout` to the Frappe backend, and proxies `/socket.io` with
  `changeOrigin: false` to `localhost:<socketio_port>`. Previously `/desk` was
  not proxied, so `/app` → `/desk` was served by the SPA and rendered its own
  404. A 404 can no longer satisfy the Desk smoke.
- The admin/Desk smoke now asserts `url_contains /desk`, `#body`, and the
  "Tasks and Assistants" workspace title before accepting a nonblank screenshot.
- The scheduling smoke now performs real actions (create a service and verify
  persistence, toggle and save availability, create a walk-in and see it in the
  queue, render the public booking calendar, switch EN→AM) using `data-qa-*`
  selectors, with deterministic fixtures created and cleaned by
  `appointment.qa_fixtures`.
- `create_desk_appointment` and `assign_walk_in_to_slot` no longer call
  `.strftime` on the string returned by `frappe.utils.now()`; reception
  appointment creation was broken and is fixed.
- The reception walk-in queue refreshes immediately after a walk-in is created.
- `HierarchyTree.tsx` no longer nests interactive controls; a static
  `frontend/tests/no-nested-interactive.test.mjs` guard runs via
  `npm run test:dom`.
- The landing-page partner logos no longer load from `logo.clearbit.com`; they
  render as local text marks, removing the offline DNS failures.
Browser QA evidence after the fixes:

- `BQA-2026-00023` — Passed; scheduling functional scenarios (app shell,
  provider/service configuration, availability, reception walk-in, public
  booking calendar, language toggle); 0 console, 0 network findings.
- `BQA-2026-00027` — Passed; Frappe Desk workspace + public landing; 0 network
  findings. One upstream desk-frame console finding remains: Frappe's own
  `desk.bundle` socket client logs `Error connecting to socket.io: Invalid
  origin` in this isolated Vite-proxied dev stack. The Desk scenario gates on
  semantic assertions.
- `BQA-2026-00022` — Passed; reception walk-in after the queue-refresh fix.

Other validation:

- Fresh site installs `frappe, appointment`; identity suite 15 tests pass with
  the expected empty-business-data skip.
- Cloned-data site: identity 15/15 and redacted preservation checks pass with
  counts `Appointment 70, Organization 3, Provider 5, Service 79`.
- QA bootstrap unit tests 13/13; scheduling workflow tests 8/8.

Rollback: checking out the checkpoint tag and creating a fresh site installs
`Module Def "Frappe Appointment"` and `Appointment Group` under the old module,
as before.

Merged into `beta/architecture-review` (merge commit `5487141`, docs merge
`c1953ab`) and pushed; `refactor/rename-to-appointment` is pushed.

## Follow-up completion

- **Certified Agent Harness runtime:** a dedicated environment was provisioned
  at `/home/minte/projects/appointment-foundation-runtime/venv` (Python 3.14,
  `uv pip install --require-hashes -r constraints/foundation-py314.txt`). It
  passes `python -m agent_plane.foundation_bundle check-installed`
  (bundle `2026.07.2`). The Agent Harness worker preflight
  `inspect_playwright_runtime()` passes with Node 24.12.0, Playwright 1.58.2 and
  Chromium 145.0.7632.6 (with `AGENT_HARNESS_NODE` set).
- Browser QA sign-off is the corrected action-based set on the isolated
  runtime; adopting the dedicated site-packages for the bench itself is a
  separate environment decision because the shared env must not be mutated.

## Beta readiness follow-up

Branch `fix/appointment-beta-readiness`, worktree
`/home/minte/projects/training-apps/.worktrees/frappe-appointment-readiness`,
isolated runtime `fix-appointment-beta-readiness-01dea7`.

### Agent Plane installation fixed upstream

- `agent-plane` branch `fix/fresh-site-deprecated-navigation` (commit `5889a58`,
  merged to `develop` and pushed): `Workspace Sidebar` and `Desktop Icon` are
  marked deprecated in current Frappe metadata; the seed helpers now skip them.
  Unit tests cover deprecated, missing and supported doctypes.
- The `Runtime Settings.public_web_research_agent_version` Link default had
  already been removed upstream (`ecfe444 Defer research agent link until seed
  completion`).
- A brand-new site installed `frappe, appointment, agent_harness, agent_plane`
  through the normal `frappe-worktree create` path with **no Appointment monkey
  patch**; two migrates were clean, `Agent Version "Public Web Research
  Agent-v1"` exists, the Runtime Settings link resolves, and there are no
  deprecated navigation rows.
- `appointment.qa_bootstrap` and its tests were removed.

### Socket.IO lifecycle

- The app now owns one socket in
  `frontend/src/components/realtime/RealtimeProvider.tsx`; `FrappeProvider` is
  rendered with `enableSocket={false}` because `frappe-react-sdk@1.11.0` creates
  its socket during render with no cleanup. React StrictMode stays enabled.
- `VITE_DISABLE_STRICT_MODE` was removed from `.frappe-worktree.json`.
- `npm run test:realtime` guards the invariants; Agent Plane runs show 0 network
  findings with the realtime handshake asserted positively.

### Product defects found and fixed

- `get_booking_configuration` read `Organization.override_provider_booking_settings`
  (plus the other booking-config fields) that the Organization DocType did not
  define, so public booking slots always failed on a fresh site. Added the four
  fields to `Organization`.
- The availability settings page sent malformed times (`8:30::00`), so saving
  provider availability failed. `convertScheduleToOpeningHours` now normalizes to
  `HH:MM:SS`.
- `AppointmentCard` only exposed its test id on one of two render branches.

### Browser workflows now covered end to end

`BQA-2026-00056` (Passed, Stable Pass, 0 console / 0 network) runs eight
scenarios: app shell, service survives reload, availability survives reload,
public booking creates a confirmed appointment, reschedule persists after
reload, cancel persists after reload, walk-in queues then assigns to a slot, and
Amharic selection survives reload. `BQA-2026-00057` (Passed) covers Frappe Desk
and the landing page.
