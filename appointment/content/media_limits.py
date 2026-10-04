"""Entitlement-backed collection, item and storage limits for gallery content."""

from __future__ import annotations

import frappe

from appointment.content import entitlements


def _media_paths(rows) -> list[str]:
    paths: list[str] = []
    for row in rows:
        for field in ("image", "thumbnail", "poster"):
            value = row.get(field)
            if value:
                paths.append(value)
    return paths


def gallery_usage(owner_key: str, exclude: str | None = None) -> dict:
    filters = {"active_owner_key": owner_key, "status": ["!=", "Archived"]}
    if exclude:
        filters["name"] = ["!=", exclude]
    collections = frappe.get_all(
        "Gallery Collection", filters=filters, pluck="name", ignore_permissions=True
    )
    if not collections:
        return {"collections": 0, "items": 0, "storage_bytes": 0}
    item_filters = {"parent": ["in", collections], "parenttype": "Gallery Collection"}
    item_count = frappe.db.count("Gallery Item", item_filters)
    rows = frappe.get_all(
        "Gallery Item",
        filters=item_filters,
        fields=["image", "thumbnail", "poster"],
        ignore_permissions=True,
    )
    total = 0
    for path in set(_media_paths(rows)):
        size = frappe.db.get_value("File", {"file_url": path}, "file_size")
        total += int(size or 0)
    return {"collections": len(collections), "items": item_count, "storage_bytes": total}


def enforce_gallery_limits(collection) -> None:
    owner_type, organization, provider = (
        collection.owner_type,
        collection.organization,
        collection.provider,
    )
    limits = entitlements.effective_limits(owner_type, organization, provider, "gallery")
    if not limits:
        return
    usage = gallery_usage(collection.active_owner_key, exclude=None if collection.is_new() else collection.name)
    if collection.status != "Archived" and collection.is_new():
        entitlements.enforce_limit(
            owner_type, organization, provider, "gallery", "collections", usage["collections"] + 1
        )
    entitlements.enforce_limit(
        owner_type, organization, provider, "gallery", "items", usage["items"] + len(collection.items)
    )
    storage_ceiling = limits.get("storage_mb")
    if storage_ceiling is not None:
        try:
            ceiling_bytes = int(storage_ceiling) * 1024 * 1024
        except (TypeError, ValueError):
            ceiling_bytes = None
        if ceiling_bytes is not None:
            projected = usage["storage_bytes"] + _current_bytes(collection)
            if projected > ceiling_bytes:
                frappe.throw(
                    frappe._("This would exceed the gallery storage limit."),
                    frappe.ValidationError,
                )


def _current_bytes(collection) -> int:
    total = 0
    for path in set(_media_paths(collection.items)):
        size = frappe.db.get_value("File", {"file_url": path}, "file_size")
        total += int(size or 0)
    return total
