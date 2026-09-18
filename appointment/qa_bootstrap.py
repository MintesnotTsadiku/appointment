"""QA bootstrap for disposable sites.

Installs the Agent Plane dependency apps on a **disposable** test site and
works around two current-baseline incompatibilities that are outside this app:

1. Agent Plane's ``Runtime Settings`` DocType carries a Link default
   (``public_web_research_agent_version``) that points at an Agent Version which
   is only created by the app's seed, after ``init_singles`` has already run.
   ``init_singles`` is temporarily patched to allow that link to be dangling;
   the app's seed/migrate then persists the Agent Version and reconciles it.
2. Agent Plane's ``after_install`` seed still creates the deprecated
   ``Workspace Sidebar`` and ``Desktop Icon`` records, which fails on the
   current Frappe baseline. Those two seed helpers are skipped for the install;
   the rest of the workspace seed runs normally.

It is dev/QA tooling for fresh sites only, never a supported installation path.

Usage::

    bench --site <disposable-site> execute appointment.qa_bootstrap.install
    bench --site <disposable-site> migrate
"""

from __future__ import annotations

import frappe
import frappe.installer as installer


def _patched_init_singles() -> None:
    """Copy of frappe.installer.init_singles with ignore_links for singles."""
    singles = frappe.get_all("DocType", filters={"issingle": True}, pluck="name")
    for single in singles:
        if frappe.db.get_singles_dict(single):
            continue
        try:
            doc = frappe.new_doc(single)
            doc.flags.ignore_mandatory = True
            doc.flags.ignore_validate = True
            doc.flags.ignore_links = True
            doc.save()
        except (ImportError, frappe.DoesNotExistError):
            continue


def _skip_deprecated_seed_records():
    """Patch Agent Plane's deprecated sidebar/desktop-icon seed to no-ops."""
    try:
        from agent_plane.setup import seed as ap_seed
    except Exception:
        return None
    originals = (ap_seed._sync_workspace_sidebars, ap_seed._sync_desktop_icon)
    ap_seed._sync_workspace_sidebars = lambda: None
    ap_seed._sync_desktop_icon = lambda: None
    return ap_seed, originals


def install(apps: str | None = None) -> dict:
    """Install the requested apps (default: agent_harness, agent_plane)."""
    frappe.set_user("Administrator")
    requested = [app.strip() for app in (apps or "agent_harness,agent_plane").split(",") if app.strip()]

    original_init_singles = installer.init_singles
    installer.init_singles = _patched_init_singles
    patched_seed = _skip_deprecated_seed_records()
    errors: list[dict[str, str]] = []
    installed: list[str] = []
    try:
        current = set(frappe.get_installed_apps())
        for app in requested:
            if app in current:
                continue
            try:
                installer.install_app(app, verbose=False)
            except Exception as exc:  # noqa: BLE001 - report and continue to migrate
                errors.append({"app": app, "error": f"{type(exc).__name__}: {exc}"})
            installed.append(app)
            current.add(app)
    finally:
        installer.init_singles = original_init_singles
        if patched_seed:
            ap_seed, originals = patched_seed
            ap_seed._sync_workspace_sidebars, ap_seed._sync_desktop_icon = originals

    frappe.clear_cache()
    return {
        "installed": installed,
        "errors": errors,
        "installed_apps": frappe.get_installed_apps(),
    }
