"""Product-owned Agent Plane browser QA entry point.

Executes product manifests under ``qa/manifests`` through Agent Plane's
``run_browser_qa_manifest`` API with ``frappe_session`` authentication.  It never
calls Playwright directly; Agent Harness owns browser execution.
"""

from __future__ import annotations

import json

import frappe


def run(
    manifest_name: str,
    base_url: str | None = None,
    scenario: str | None = None,
    update_baseline: int = 0,
) -> dict:
    frappe.set_user("Administrator")
    from agent_plane.api import run_browser_qa_manifest

    result = run_browser_qa_manifest(
        manifest_name=manifest_name,
        base_url=base_url,
        scenario=scenario,
        update_baseline=update_baseline,
    )
    print(json.dumps(result, indent=2, default=str))
    return result
