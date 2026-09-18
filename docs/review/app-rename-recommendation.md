# Rename recommendation: Appointment

Target display title: **Appointment**. Target internal app/package identifier: **appointment**.

The present code is inconsistent: the Python package and installed app are `appointment`, `hooks.py` declares `app_name = "scheduler"` and `app_title = "Scheduler"`, and the app-switcher title is already `Appointment`. The older rename guide targets `scheduler`; do not execute it as a current runbook.

Keep this repository and Git history. A second independently installed app with the same DocTypes introduces ownership collisions and unnecessary transfer work. Do a controlled rename on the isolated clone after establishing a working baseline.

1. Capture database/file backup and counts; retain an untouched rollback checkout.
2. Rename the outer Python package to `appointment`; update package metadata, hooks, imports, whitelisted API paths, patch paths, frontend calls, asset URLs, build paths and runtime adapter together.
3. Preserve business DocType identities and records. If renaming the inner `Frappe Appointment` module, explicitly migrate its Module Def and DocType module links. It is separate from the outer app identifier.
4. Migrate installed-app registration and module ownership explicitly. Inventory database-backed references such as scripts and settings. Preserve patch execution history so old patches do not run again under new names.
5. Provide temporary API/asset aliases if existing clients or public links require them.
6. Rebuild, migrate only the isolated clone, and verify Administrator login, Desk, booking, rescheduling, reception, email templates, stored files and realtime. Compare record counts and business links before/after.
7. Promote only after validation; use the retained source checkout and backup for rollback.

Do not uninstall the original app to perform the rename: uninstalling can delete its DocTypes and records. This proposal does not require moving modules one at a time or redesigning the product.

The rename is not applied as part of cloning; the working clone is the baseline on which the change can be safely implemented and measured.
