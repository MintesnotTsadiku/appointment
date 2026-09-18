"""QA bootstrap for disposable sites.

Installs the Agent Plane dependency apps on a **disposable** test site and
works around one current-baseline incompatibility that is outside this app:
Agent Plane's ``after_install`` seed still creates the deprecated
``Workspace Sidebar`` and ``Desktop Icon`` records, which fails on the current
Frappe baseline. Those two seed helpers are skipped for the install; the rest of
the workspace seed runs normally. Agent Plane's ``Runtime Settings`` Single
DocType also carries a Link default (``public_web_research_agent_version``) that
points at an Agent Version which is only created by the app's seed, after
``init_singles`` has already run. ``init_singles`` is temporarily patched to
allow a dangling link *only* for ``Runtime Settings``; every other Single
DocType still goes through normal Link validation. The app's seed/migrate then
persists the Agent Version and reconciles it.

This is dev/QA tooling for disposable sites only, never a supported installation
path. It intentionally fails closed: unknown apps, missing Agent Plane seed
helpers, incomplete installs and monkey-patch leaks are all reported as errors
rather than silently ignored.

Usage::

    bench --site <disposable-site> execute appointment.qa_bootstrap.install
    bench --site <disposable-site> migrate
"""

from __future__ import annotations

import json
from typing import Any

import frappe
import frappe.installer as installer

#: The only dependency apps this disposable-site helper is allowed to install.
ALLOWED_APPS: tuple[str, ...] = ("agent_harness", "agent_plane")

#: Default install order when no explicit list is supplied.
DEFAULT_APPS: tuple[str, ...] = ALLOWED_APPS

#: The single Single DocType whose dangling Link default is a known Agent Plane
#: ordering defect. Link validation stays enabled for every other Single.
_IGNORE_LINK_SINGLES = frozenset({"Runtime Settings"})

#: Agent Plane seed helpers that write records removed from the current Frappe
#: baseline. If either is missing we abort instead of guessing.
_SEED_PATCH_TARGETS = ("_sync_workspace_sidebars", "_sync_desktop_icon")


def _normalize_requested(apps: str | list[str] | tuple[str, ...] | None) -> list[str]:
    """Return a validated, de-duplicated, order-preserving app list."""
    if apps is None:
        requested = list(DEFAULT_APPS)
    elif isinstance(apps, str):
        requested = [part.strip() for part in apps.split(",") if part.strip()]
    else:
        requested = [str(part).strip() for part in apps if str(part).strip()]
    if not requested:
        requested = list(DEFAULT_APPS)
    unknown = [app for app in requested if app not in ALLOWED_APPS]
    if unknown:
        frappe.throw(
            f"Unsupported QA bootstrap app(s): {', '.join(sorted(unknown))}. Allowed apps: {', '.join(ALLOWED_APPS)}.",
            frappe.ValidationError,
        )
    return list(dict.fromkeys(requested))


def _patched_init_singles() -> None:
    """Copy of ``frappe.installer.init_singles``.

    Unlike the original, Link validation is ignored only for the known-broken
    ``Runtime Settings`` Single and remains active everywhere else.
    """
    singles = frappe.get_all("DocType", filters={"issingle": True}, pluck="name")
    for single in singles:
        if frappe.db.get_singles_dict(single):
            continue
        try:
            doc = frappe.new_doc(single)
            doc.flags.ignore_mandatory = True
            doc.flags.ignore_validate = True
            if single in _IGNORE_LINK_SINGLES:
                doc.flags.ignore_links = True
            doc.save()
        except (ImportError, frappe.DoesNotExistError):
            continue


def _noop() -> None:
    """Replacement for Agent Plane's deprecated seed helpers."""


def _install_seed_patch() -> dict[str, Any]:
    """Patch Agent Plane's deprecated sidebar/desktop-icon seed helpers.

    Fails closed if the private helpers are missing so a future Agent Plane
    change cannot turn into a silently broken installation.
    """
    from agent_plane.setup import seed as ap_seed

    originals: dict[str, Any] = {}
    for name in _SEED_PATCH_TARGETS:
        original = getattr(ap_seed, name, None)
        if not callable(original):
            raise RuntimeError(
                f"Agent Plane seed helper `agent_plane.setup.seed.{name}` is missing; "
                "refusing to install Agent Plane without a verified workaround."
            )
        originals[name] = original
    for name in _SEED_PATCH_TARGETS:
        setattr(ap_seed, name, _noop)
    return {"module": ap_seed, "originals": originals}


def _restore_seed_patch(seed_patch: dict[str, Any] | None) -> list[str]:
    """Restore patched seed helpers and return any names that could not be restored."""
    if not seed_patch:
        return []
    module = seed_patch["module"]
    for name, original in seed_patch["originals"].items():
        setattr(module, name, original)
    return [
        f"agent_plane.setup.seed.{name}"
        for name, original in seed_patch["originals"].items()
        if getattr(module, name, None) is not original
    ]


def _run_install(requested: list[str]) -> dict[str, Any]:
    """Install the requested apps and return an accurate structured status."""
    current = list(frappe.get_installed_apps())
    already_installed = [app for app in requested if app in current]
    pending = [app for app in requested if app not in current]

    original_init_singles = installer.init_singles
    seed_patch: dict[str, Any] | None = None
    installed: list[str] = []
    failed: list[str] = []
    errors: list[dict[str, str]] = []

    try:
        installer.init_singles = _patched_init_singles
        if "agent_plane" in pending:
            seed_patch = _install_seed_patch()
        for app in pending:
            try:
                installer.install_app(app, verbose=False)
            except Exception as exc:  # reported accurately, never swallowed
                errors.append({"app": app, "error": f"{type(exc).__name__}: {exc}"})
                failed.append(app)
                break
            if app not in frappe.get_installed_apps():
                errors.append({"app": app, "error": "install_app returned without registering the app."})
                failed.append(app)
                break
            installed.append(app)
    finally:
        installer.init_singles = original_init_singles
        leaked_seed = _restore_seed_patch(seed_patch)

    if installer.init_singles is not original_init_singles:
        leaked_seed.append("frappe.installer.init_singles")
    if leaked_seed:
        raise RuntimeError(f"Monkey-patch leak detected: {', '.join(sorted(leaked_seed))}")

    frappe.clear_cache()
    return {
        "requested": requested,
        "already_installed": already_installed,
        "installed": installed,
        "failed": failed,
        "errors": errors,
        "ok": not failed and not errors,
        "installed_apps": frappe.get_installed_apps(),
    }


def install(apps: str | list[str] | tuple[str, ...] | None = None) -> dict[str, Any]:
    """Install Agent Plane QA dependencies on a disposable site.

    Returns a structured report on success. Raises so that ``bench execute``
    exits non-zero (and the report is captured in the error log) when any
    requested app could not be installed.
    """
    frappe.set_user("Administrator")
    requested = _normalize_requested(apps)
    result = _run_install(requested)
    if not result["ok"]:
        frappe.log_error(
            title="appointment.qa_bootstrap.install failed",
            message=json.dumps(result, indent=2, default=str),
        )
        frappe.throw(
            "QA bootstrap failed to install: "
            + ", ".join(result["failed"])
            + ". See the error log for the full structured report.",
            frappe.ValidationError,
        )
    return result
