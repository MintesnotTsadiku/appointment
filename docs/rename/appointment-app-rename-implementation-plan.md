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

Keep a temporary `frappe_appointment` compatibility package that forwards supported imports and whitelisted methods to `appointment`. Inventory external callers first and document a removal release. Avoid open-ended aliases.

Add a pre-model-sync patch or controlled site migration that updates the installed-app identity and any stored dotted paths at the correct point in Frappe's migration lifecycle. Preserve patch history so old patches are not replayed. Explicitly migrate Module Def ownership, scheduled jobs, hooks, fixtures, and any stored API paths. The migration must be idempotent and safe to resume.

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

