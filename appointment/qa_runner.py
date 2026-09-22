"""Product-owned Agent Plane browser QA entry point.

Executes product manifests under ``qa/manifests`` through Agent Plane's
``run_browser_qa_manifest`` API with ``frappe_session`` authentication.  It never
calls Playwright directly; Agent Harness owns browser execution.
"""

from __future__ import annotations

import json
from pathlib import Path

import frappe
import yaml


def run(
    manifest_name: str,
    base_url: str | None = None,
    scenario: str | None = None,
    update_baseline: int = 0,
    fixture_scope: str = "legacy",
) -> dict:
    frappe.set_user("Administrator")
    from agent_plane.api import run_browser_qa_manifest

    from appointment import qa_fixtures

    manifest_path = Path(manifest_name)
    if not manifest_path.is_absolute():
        manifest_path = Path(frappe.get_app_path("appointment", "..", "qa", "manifests")) / manifest_name
    manifest = yaml.safe_load(manifest_path.read_text())
    auth = manifest.get("auth", {})
    if auth.get("type") == "frappe_session" and not auth.get("username"):
        frappe.throw("Authenticated QA requires an explicit persona username.")

    if fixture_scope == "owned_booking":
        from appointment.tests.owned_booking_fixtures import require_target, state_path

        require_target()
        if not state_path().exists():
            frappe.throw("Prepare the exact owned-booking fixture first.")
    elif fixture_scope == "legacy":
        qa_fixtures.setup()
    else:
        frappe.throw("Unknown fixture scope")
    cleanup: dict = {}
    try:
        result = run_browser_qa_manifest(
            manifest_name=manifest_name,
            base_url=base_url,
            scenario=scenario,
            update_baseline=update_baseline,
            capture_video=int(bool(manifest.get("capture_video"))),
            capture_instruction_timeline=int(bool(manifest.get("capture_instruction_timeline"))),
        )
    finally:
        if fixture_scope == "legacy":
            cleanup = qa_fixtures.teardown()
        else:
            cleanup = {
                "retained_exact_fixture": True,
                "finish": "appointment.tests.owned_booking_fixtures.finish_browser",
            }
    if isinstance(result, dict):
        result["fixture_cleanup"] = cleanup
    print(json.dumps(result, indent=2, default=str))
    return result


def preservation_snapshot(output_path: str | None = None) -> dict:
    """Write and return the redacted cloned-data preservation snapshot."""
    from appointment.qa_preservation import snapshot_to_file

    snapshot, path = snapshot_to_file(output_path)
    print(json.dumps({"output_path": path, "snapshot": snapshot}, indent=2, default=str))
    return snapshot
