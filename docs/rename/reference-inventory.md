# Reference inventory: `frappe_appointment` → `appointment`

Captured against `beta/architecture-review` (`70c9ca6`) before the rename, on the
cloned verified site `meet-beta-refactor-rename-to-appointment-4c34e9.localhost`.

## App identity and package metadata

| Surface | Before | After |
| --- | --- | --- |
| Outer Python package | `frappe_appointment/` | `appointment/` |
| `hooks.py app_name` | `"scheduler"` | `"appointment"` |
| `hooks.py app_title` | `"Scheduler"` | `"Appointment"` |
| App switcher `name` | `"frappe_appointment"` | `"appointment"` |
| App switcher route | `app/appointment` (already) | `app/appointment` |
| `pyproject.toml` name | `frappe_appointment` | `appointment` |
| `.frappe-worktree.json app_name` | `frappe_appointment` | `appointment` |
| Advisory app reference | `frappe_appointment` | `appointment` |
| `.gitignore` build paths | `frappe_appointment/...` | `appointment/...` |

Business DocType names and the inner module package names are intentionally
unchanged: `appointment/frappe_appointment`, `appointment/scheduler`,
`appointment/payments`, `appointment/channels`, `appointment/tasks`,
`appointment/assistants`.

## Module Def ownership

Six modules were owned by `frappe_appointment`; all now record
`app_name = appointment`:

`Assistants`, `Channels`, `Frappe Appointment`, `Payments`, `Scheduler`, `Tasks`.

## Patches

`appointment/patches.txt` preserves the five historical dotted paths exactly so
existing `Patch Log` rows are never replayed:

- `frappe_appointment.patches.v0_1.change_fieldtype_to_duration`
- `frappe_appointment.patches.v0_1.rename_assistant_activity_log`
- `frappe_appointment.patches.v0_1.add_appointment_manager_role`
- `frappe_appointment.patches.v0_1.add_event_creator`
- `frappe_appointment.patches.v0_1.update_route_appointment`

A new first `pre_model_sync` patch, `appointment.patches.v0_1.rename_app_identity`,
rewrites stored identity on upgraded sites. It resolves through the
`frappe_appointment` shim while a site is still on the legacy installed-app name.

## Scheduled jobs

- `frappe_appointment.tasks.reminder_google_calendar_auth.send_reminder_mail`
- `frappe_appointment.tasks.verify_availability.verify_appointment_group_members_availabilty`

Both were migrated in the database and are emitted from `hooks.py` as
`appointment.tasks...`.

## Whitelisted dotted paths and frontend API strings

- `appointment/api/gateway.py` maps ~150 public actions; all now
  `appointment.*`.
- All frontend `useFrappe*Call`, `frappe.call` and `fetch` API strings now use
  `appointment.*`.
- The PWA service worker and Vite proxy patterns now match
  `/assets/appointment/...` and `/api/method/appointment.*`.

## Assets

- Asset namespace moved from `/assets/frappe_appointment/...` to
  `/assets/appointment/...` (hooks `app_include_js`, app switcher logo,
  `www/index.html`, `frontend/index.html`, vite base path, PWA icons).
- `frappe-appointment-logo.png` renamed to `appointment-logo.png`.
- The isolated runtime maps `sites/assets/appointment` to the app's `public/`
  directory.

## Database-backed references (pre-migration scan)

A column-level scan of `_7a56dacebfb6a8ce` found literal `frappe_appointment`
references in:

- `tabDefaultValue.defvalue` (installed apps global, `__global`)
- `tabModule Def.app_name`
- `tabScheduled Job Type.method`
- `tabWorkspace.app` (`Scheduler Appointment`, `Tasks and Assistants`)
- `tabInstalled Application.app_name`
- `tabPatch Log.patch` (historical, intentionally retained)
- `tabEmail Template.subject` (`[Frappe Appointment]` prefix)

All except the historical `Patch Log` rows are rewritten by the migration.
Remaining matches for the string `Frappe Appointment` are the unchanged business
module name.

## Verification entry points

- `appointment/tests/test_app_identity.py` — install, module ownership,
  scheduled jobs, shim, data counts.
- `qa/manifests/appointment_admin_smoke.yaml` — Desk + landing.
- `qa/manifests/appointment_scheduling_smoke.yaml` — provider workspace,
  configuration, reception and booking routes.
- `baseline:` `/home/minte/projects/appointment-clone-backups/rename-source-20260917`
