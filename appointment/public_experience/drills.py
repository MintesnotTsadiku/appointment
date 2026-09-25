"""Disaster-recovery rehearsals for the public experience.

The drill proves that a published site resolves from the immutable release even
with a cold cache, and that release rollback round-trips. It intentionally
creates new releases (rollback never edits history) and reports each step.
"""

from __future__ import annotations

import frappe

from appointment.public_experience import publisher, resolver


def _platform_host() -> str:
    hosts = sorted(resolver._platform_hosts())
    return hosts[0] if hosts else (frappe.local.site or "localhost")


def run_recovery_drill(site: str) -> dict:
    steps: list[dict] = []
    doc = frappe.get_doc("Public Site", site)
    current = doc.current_release
    steps.append({"step": "has_active_release", "ok": bool(current)})
    if not current:
        return {"ok": False, "steps": steps}

    publisher.purge_experience_cache(site, current)
    context = resolver.resolve_public_experience(_platform_host(), f"/{doc.slug}")
    steps.append({"step": "resolve_with_cold_cache", "ok": context.release == current})

    release_hash = frappe.db.get_value("Experience Release", current, "release_hash")
    steps.append({"step": "release_hash_present", "ok": bool(release_hash)})

    releases = frappe.get_all(
        "Experience Release",
        filters={"public_site": site},
        fields=["name", "release_number"],
        order_by="release_number desc",
        limit=2,
    )
    if len(releases) >= 2:
        previous = releases[1].name
        reinstated = publisher.rollback_experience(site, previous)
        steps.append({"step": "rollback_rehearsal", "ok": bool(reinstated.name)})
        restored = publisher.rollback_experience(site, current)
        doc.reload()
        steps.append({"step": "rollback_restored", "ok": doc.current_release == restored.name})
    else:
        steps.append({"step": "rollback_rehearsal", "ok": True, "skipped": "single_release"})

    return {"ok": all(step["ok"] for step in steps), "steps": steps}
