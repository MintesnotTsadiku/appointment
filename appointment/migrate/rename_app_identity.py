"""Idempotent migration of a site's stored app identity.

The app was historically installed as ``frappe_appointment`` while its package,
hooks and installer metadata disagreed about the app title.  This module
rewrites the small set of database-backed references that Frappe resolves by the
installed app name, so an upgraded site becomes identical to a fresh
``appointment`` install.

Primary runbook (run before ``migrate`` because Frappe builds its module map from
the installed-app name at process start)::

    bench --site <site> execute appointment.migrate.rename_app_identity.rename_site_identity
    bench --site <site> migrate

It is also registered as the first ``pre_model_sync`` patch so that a site whose
installed-app list has already been rewritten stays correct across later
migrates.  Every statement is guarded by the legacy value, so repeated runs are
no-ops and a second ``migrate`` is clean.
"""

import json

import frappe

LEGACY_APP = "frappe_appointment"
CANONICAL_APP = "appointment"

# Known database columns that can hold the app token as part of a dotted Python
# path or asset URL.  Only the exact legacy token is replaced.
DOTTED_PATH_COLUMNS = (
    ("Server Script", "script"),
    ("Server Script", "reference"),
    ("Client Script", "script"),
    ("Notification", "condition"),
    ("Notification", "html"),
    ("Report", "query"),
    ("Print Format", "html"),
    ("Property Setter", "value"),
    ("Workspace", "content"),
)


def rename_site_identity() -> dict:
    """Rewrite stored legacy identity to the canonical ``appointment`` app.

    Returns a mapping of the changes applied.  Safe to call repeatedly; every
    statement is constrained to rows still holding the legacy value.
    """
    changed: dict[str, object] = {}
    changed.update(_rename_installed_apps())
    changed.update(_rename_installed_application_rows())
    changed.update(_rename_module_defs())
    changed.update(_rename_scheduled_jobs())
    changed.update(_rename_workspaces())
    changed.update(_rename_default_apps())
    changed.update(_rename_email_template_branding())
    changed.update(_rename_stored_dotted_paths())

    if changed:
        frappe.clear_cache()
        _clear_request_cache()
    return changed


def _clear_request_cache() -> None:
    cache = getattr(frappe.local, "request_cache", None)
    if cache is not None:
        try:
            cache.clear()
        except Exception:
            pass


def _rename_installed_apps() -> dict:
    installed = json.loads(frappe.db.get_global("installed_apps") or "[]")
    if not isinstance(installed, list) or LEGACY_APP not in installed:
        return {}

    installed = [CANONICAL_APP if app == LEGACY_APP else app for app in installed]
    frappe.db.set_global("installed_apps", json.dumps(installed))
    try:
        from frappe.installer import update_site_config

        update_site_config("installed_apps", installed)
    except Exception:
        # site_config mirroring is best effort; the database global is canonical.
        pass

    if _has_table_column("System Settings", "default_app"):
        current_default = frappe.db.get_single_value("System Settings", "default_app")
        if current_default == LEGACY_APP:
            frappe.db.set_single_value("System Settings", "default_app", CANONICAL_APP)
    return {"installed_apps": installed}


def _rename_installed_application_rows() -> dict:
    if not _has_table_column("Installed Application", "app_name"):
        return {}
    updated = frappe.db.sql(
        "UPDATE `tabInstalled Application` SET app_name=%s WHERE app_name=%s",
        (CANONICAL_APP, LEGACY_APP),
    )
    return {"Installed Application": updated} if updated else {}


def _rename_module_defs() -> dict:
    if not _has_table_column("Module Def", "app_name"):
        return {}
    updated = frappe.db.sql(
        "UPDATE `tabModule Def` SET app_name=%s WHERE app_name=%s",
        (CANONICAL_APP, LEGACY_APP),
    )
    return {"Module Def": updated} if updated else {}


def _rename_scheduled_jobs() -> dict:
    if not _has_table_column("Scheduled Job Type", "method"):
        return {}
    updated = frappe.db.sql(
        "UPDATE `tabScheduled Job Type` SET method=REPLACE(method,%s,%s) WHERE method LIKE %s",
        (LEGACY_APP, CANONICAL_APP, f"{LEGACY_APP}.%"),
    )
    return {"Scheduled Job Type": updated} if updated else {}


def _rename_workspaces() -> dict:
    if not _has_table_column("Workspace", "app"):
        return {}
    updated = frappe.db.sql(
        "UPDATE `tabWorkspace` SET app=%s WHERE app=%s",
        (CANONICAL_APP, LEGACY_APP),
    )
    return {"Workspace": updated} if updated else {}


def _rename_default_apps() -> dict:
    if not _has_table_column("User", "default_app"):
        return {}
    updated = frappe.db.sql(
        "UPDATE `tabUser` SET default_app=%s WHERE default_app=%s",
        (CANONICAL_APP, LEGACY_APP),
    )
    return {"User.default_app": updated} if updated else {}


def _rename_email_template_branding() -> dict:
    if not _has_table_column("Email Template", "subject"):
        return {}
    updated = frappe.db.sql(
        "UPDATE `tabEmail Template` SET subject=REPLACE(subject,%s,%s) WHERE subject LIKE %s",
        ("[Frappe Appointment]", "[Appointment]", "%[Frappe Appointment]%"),
    )
    return {"Email Template.subject": updated} if updated else {}


def _has_table_column(doctype: str, column: str) -> bool:
    """True when the physical table and column exist (migration may run pre-sync)."""
    if not frappe.db.table_exists(doctype):
        return False
    return frappe.db.has_column(doctype, column)


def _rename_stored_dotted_paths() -> dict:
    changed = {}
    for doctype, column in DOTTED_PATH_COLUMNS:
        if not _has_table_column(doctype, column):
            continue
        updated = frappe.db.sql(
            f"UPDATE `tab{doctype}` SET `{column}`=REPLACE(`{column}`,%s,%s) WHERE `{column}` LIKE %s",
            (LEGACY_APP, CANONICAL_APP, f"%{LEGACY_APP}%"),
        )
        if updated:
            changed[f"{doctype}.{column}"] = updated
    return changed
