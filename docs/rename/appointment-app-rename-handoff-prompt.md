# Handoff Prompt: Rename Frappe Appointment to Appointment

Implement the controlled rename described in `docs/rename/appointment-app-rename-implementation-plan.md`.

The product is a Frappe scheduling application derived from rtCamp's Frappe Appointment and extended for Ethiopian small businesses. It manages organizations, providers, locations, services, availability, public booking, rescheduling, reception and walk-ins, with English/Amharic and Ethiopian time concerns. Preserve that behavior and all existing data. The immediate goal is a coherent app identity: display name **Appointment**, Frappe app identifier and Python package `appointment`. Public Meet.et branding is a separate product decision.

Start from the pushed `beta/architecture-review` branch in `https://github.com/MintesnotTsadiku/appointment.git`. The verified baseline worktree is `/home/minte/projects/training-apps/.worktrees/frappe-appointment-beta`; do not develop the rename in it. Create branch `refactor/rename-to-appointment` and a separate Git worktree. Use `/home/minte/projects/training-apps` as the source bench and the `run-frappe-worktree-stack` workflow to create a separate isolated runtime and clone of the verified site. Do not change `/home/minte/projects/frappe-bench/sites/appointment.com`, the verified baseline site, or the shared training Python environment.

Baseline references:

- Frappe checkout: `/home/minte/projects/training-apps/apps/frappe`, branch `develop`
- verified site: `meet-beta-beta-architecture-review-5839d4.localhost`
- verified UI: `http://127.0.0.14:26300`
- runtime: `/home/minte/projects/appointment-worktree-runtimes/beta-architecture-review-5839d4`
- credentials are private and must be read at runtime from that runtime's `credentials.json`, never copied into source, prompts, logs, or screenshots
- backups: `/home/minte/projects/appointment-clone-backups/pre-agent-foundation` and `/home/minte/projects/appointment-clone-backups/20260917`
- baseline counts: Appointment 70, Organization 3, Provider 5, Service 79, User 374, File 7

Read the repository instructions and context before editing. Use the Frappe development skill for migrations and the isolated worktree stack for runtime work. Keep the repository and history; do not create a second app and copy files module by module. Do not rename business DocTypes during the app-identity migration.

Begin with a complete reference inventory for `frappe_appointment`, `scheduler`, `Frappe Appointment`, package metadata, hooks, patches, scheduled jobs, whitelisted dotted paths, frontend API strings, fixtures, assets, Module Def ownership, and installed-app state. Add characterization checks around important imports, APIs, and data counts. Then implement the canonical `appointment` package and metadata, an explicit idempotent migration for existing sites, and narrow temporary compatibility aliases for supported old import/API paths. Preserve patch history and ensure migration ordering works before model sync where required.

Agent Plane and Agent Harness are installed on the verified isolated site and should also be dependencies in the new worktree adapter. Put product-specific browser manifests in this app under `qa/manifests` and execute them through `agent_plane.api.run_browser_qa_manifest` with `frappe_session`; do not call Playwright directly for product QA. Validate admin login, Desk, public booking, reschedule/cancel, reception/walk-in, organization/provider/service configuration, translations, Socket.IO, console errors, and failed network requests. Keep email muted and the scheduler paused.

Be aware of two local compatibility fixes required by the current Frappe `develop` baseline: Agent Harness has a workspace seed fix in `agent_harness/setup/seed.py`, and Agent Plane clears a dangling fresh-site Runtime Settings link in `agent_plane/setup/security_roles.py`. Also, the shared Python environment fails the certified Agent Harness foundation-version check. Do not overwrite unrelated dirty Agent Harness files or upgrade shared packages. Record these as external prerequisites and use a dedicated certified runtime before beta sign-off.

Run migration twice, compare record counts and representative links, validate a fresh install and upgraded clone, save Agent Plane Browser QA evidence, and rehearse restoration from backup. Do not claim completion until both the new canonical paths and documented legacy aliases pass, a second migrate is clean, data is unchanged, and rollback is proven. Commit in reviewable phases and keep the implementation plan updated with evidence and remaining risks.

