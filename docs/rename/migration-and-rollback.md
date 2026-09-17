# Appointment rename: migration and rollback

## Compatibility contract

The canonical Frappe app identifier and Python package are `appointment`; the
display title is **Appointment**. Business DocTypes and the inner module
packages keep their existing names.

Supported during the compatibility window:

- Python imports: `import frappe_appointment`, `from frappe_appointment.x import y`.
  The shim package `frappe_appointment/` forwards `__path__`/`__file__` to
  `appointment`, so nested modules and `frappe.get_app_path("frappe_appointment")`
  resolve to the real app.
- Historical patch dotted paths in `Patch Log` continue to match `patches.txt`.
- Public website routes and Desk routes are unchanged.

Explicitly migrated, not aliased:

- Every shipped frontend/HTML API string and asset URL now uses `appointment.*`.
- HTTP calls to `/api/method/frappe_appointment.*` are **not** served, because
  Frappe refuses to resolve a dotted path whose app is not installed (see
  `frappe.utils.get_attr`). Integrators that call the API by URL must move to
  `/api/method/appointment.*`. The shim cannot be registered as a second app
  without duplicating module ownership.

Schedule removal of `frappe_appointment/` in a later, separately announced
release once external callers have moved.

## Upgrade runbook (existing site)

Frappe builds its module map from the installed-app name at process start, so
rewrite the stored identity **before** the first migrate of the new code:

```bash
# From the isolated bench root, with the worktree first on PYTHONPATH.
bench --site <site> execute \
  frappe_appointment.migrate.rename_app_identity.rename_site_identity

# Now the site reports `appointment`; run migrate twice.
bench --site <site> migrate
bench --site <site> migrate
```

`rename_site_identity` is idempotent and guarded by the legacy value. It rewrites
the installed-app global and `site_config.json`, `Module Def.app_name`,
`Installed Application.app_name`, `Scheduled Job Type.method`,
`Workspace.app`, `User.default_app`, `[Frappe Appointment]` email subjects and
known stored dotted paths. It is also registered as the first `pre_model_sync`
patch for sites whose installed-app list is already canonical.

The second migrate must execute **no patches** and must not change record
counts.

## Fresh install

```bash
bench new-site <site>.localhost \
  --db-root-username root --db-root-password <root> \
  --admin-password <admin> --install-app appointment
bench --site <site> migrate
bench --site <site> migrate
```

`list-apps` must show only `frappe` plus dependencies and `appointment`.
Email templates are imported from `after_install` (not `before_install`) and the
`Appointment Settings` Link defaults are applied after the templates exist.

## Rollback

The pre-migration backup used for the rehearsal is
`/home/minte/projects/appointment-clone-backups/rename-source-20260917`, taken
from the verified site before any database identity change.

```bash
bench drop-site <rehearsal>.localhost --db-root-username root \
  --db-root-password <root> --no-backup --force
bench new-site <rehearsal>.localhost --db-root-username root \
  --db-root-password <root> --admin-password <admin>
bench --site <rehearsal>.localhost restore \
  <backup>-database.sql.gz \
  --db-root-username root --db-root-password <root> \
  --with-public-files <backup>-files.tar \
  --with-private-files <backup>-private-files.tar \
  --admin-password <admin>
bench --site <rehearsal>.localhost list-apps   # frappe_appointment, pre-rename
```

On the rehearsal site the installed app is `frappe_appointment` and the business
counts match the baseline (Appointment 70, Organization 3, Provider 5,
Service 79). Check out `beta/architecture-review` (`70c9ca6`) for the matching
code.

## External prerequisites (not part of this app repository)

Recorded as blockers before beta sign-off; they are not caused by the rename:

1. **Agent Plane fresh install.** `bench install-app agent_plane` on a fresh
   site fails in `init_singles` because the `Runtime Settings` DocType JSON has
   `public_web_research_agent_version = "Public Web Research Agent-v1"` before
   that Agent Version is seeded. The local `agent_plane/setup/security_roles.py`
   fix runs too late for the install path. Fresh clones were therefore created by
   restoring the verified site's backup.
2. **Agent Harness foundation version.** The shared training Python environment
   does not match the certified Agent Harness foundation bundle. Browser QA ran
   (see below), but sign-off must use a dedicated certified runtime.
3. **Offline external resources.** The landing page requests
   `https://logo.clearbit.com/*`, which does not resolve in this environment and
   dominates the landing-page console/network findings.
4. **Socket.IO polling noise.** The engine.io handshake and long-poll are healthy
   (`HTTP 200` direct and through the Vite proxy), but the browser run records
   `400` responses for stale polling requests after the transport upgrade; this
   needs confirmation on a certified runtime.
5. **Pre-existing React warning.** `settings/manage` logs a `validateDOMNesting`
   console error from `HierarchyTree.tsx` (button inside button). Unrelated to
   the rename.
