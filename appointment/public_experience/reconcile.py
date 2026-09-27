"""Idempotent database safeguards for the recipe-backed public experience."""

from __future__ import annotations

import frappe

from appointment.public_experience.recipes import list_recipes

SEED_STATUS_KEY = "brand_public_experience_seed_status"


def _ensure_unique_index(doctype: str, fieldname: str) -> str:
    try:
        tick = chr(96)
        rows = frappe.db.sql(
            f"show indexes from {tick}tab{doctype}{tick} where Key_name=%s",
            (fieldname,),
            as_dict=True,
        )
        if any(row.get("Non_unique") == 0 for row in rows):
            return "unique"
        if rows:
            frappe.db.sql(f"drop index {tick}{fieldname}{tick} on {tick}tab{doctype}{tick}")
        frappe.db.add_unique(doctype, fieldname)
        return "created"
    except Exception:
        frappe.log_error(frappe.get_traceback(), f"Unique index reconciliation: {doctype}.{fieldname}")
        return "error"


def ensure_public_site_unique_indexes() -> dict:
    return {
        "Brand Profile.active_owner_key": _ensure_unique_index("Brand Profile", "active_owner_key"),
        "Public Site.active_owner_key": _ensure_unique_index("Public Site", "active_owner_key"),
        "Public Site.slug": _ensure_unique_index("Public Site", "slug"),
        "Public Site Domain.hostname_ascii": _ensure_unique_index("Public Site Domain", "hostname_ascii"),
    }


def get_reconciliation_diagnostics() -> dict:
    return {
        "certified_recipes": [recipe.key for recipe in list_recipes()],
        "public_sites": frappe.db.count("Public Site"),
        "published_sites": frappe.db.count("Public Site", {"status": "Published"}),
        "experience_releases": frappe.db.count("Experience Release"),
        "seed_status": frappe.cache.get_value(SEED_STATUS_KEY) or {"status": "recipe-code-owned"},
    }
