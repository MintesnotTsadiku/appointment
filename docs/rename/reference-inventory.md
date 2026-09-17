# Appointment app reference inventory

Canonical identity:

| Surface | Value |
| --- | --- |
| Display title | **Appointment** |
| Frappe app identifier | `appointment` |
| Python package | `appointment` |
| Repository | existing `appointment` repository (history retained) |

The app was previously identified as `frappe_appointment` / `scheduler`, but it
was never released under those names, so no compatibility shim, migration or
legacy alias is retained. Everything below is canonical.

## Package layout

- App root: `appointment/` (contains `hooks.py`, `modules.txt`, `patches.txt`).
- Inner module packages keep their historical names:
  `appointment/frappe_appointment`, `appointment/scheduler`,
  `appointment/payments`, `appointment/channels`, `appointment/tasks`,
  `appointment/assistants`.
- Business DocType names are unchanged.

## Hooks

- `app_name = "appointment"`, `app_title = "Appointment"`.
- App switcher `name = "appointment"`, route `app/appointment`, logo
  `/assets/appointment/appointment-logo.png`.
- Scheduled jobs: `appointment.tasks.reminder_google_calendar_auth.send_reminder_mail`
  and `appointment.tasks.verify_availability.verify_appointment_group_members_availabilty`.
- `after_install` imports email templates (after doctypes exist);
  `after_migrate` reconciles them and the `Appointment Settings` defaults.
- `override_doctype_class`, `doc_events`, `has_permission` and
  `override_whitelisted_methods` all point at `appointment.*`.

## Modules

`modules.txt` declares `Frappe Appointment`, `Scheduler`, `Payments`,
`Channels`, `Tasks`, `Assistants`; `Module Def.app_name` is `appointment` for
all six.

## Patches

`appointment/patches.txt` lists only canonical paths:

- pre-model-sync: `appointment.patches.v0_1.change_fieldtype_to_duration`,
  `appointment.patches.v0_1.rename_assistant_activity_log`
- post-model-sync: `appointment.patches.v0_1.add_appointment_manager_role`,
  `appointment.patches.v0_1.add_event_creator`,
  `appointment.patches.v0_1.update_route_appointment`

## APIs, frontend and assets

- `appointment/api/gateway.py` maps the public actions under `appointment.*`.
- All frontend `frappe.call`/`useFrappe*Call`/`fetch` strings and the Vite proxy
  patterns use `appointment.*` and `/assets/appointment/...`.
- Asset namespace: `/assets/appointment/...` (built from
  `appointment/public/`); the logo file is `appointment/appointment-logo.png`.

## Verification entry points

- `appointment/tests/test_app_identity.py` — canonical install, app path, public
  API import, module ownership, scheduled jobs, business-count preservation.
- `qa/manifests/appointment_admin_smoke.yaml` — Desk + landing.
- `qa/manifests/appointment_scheduling_smoke.yaml` — provider workspace,
  configuration, reception and booking routes.
- `appointment/qa_runner.py` — Agent Plane browser QA entry point.
