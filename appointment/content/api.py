"""Owner-facing content authoring, preview and publication API.

Every handler resolves the authorized business membership through the service
layer before it touches an upstream authoring record. Handlers stay thin.
"""

from __future__ import annotations

import frappe

from appointment.content import entitlements, releases, tenancy


@frappe.whitelist(methods=["GET"])
def content_capabilities(owner_type: str, organization: str | None = None, provider: str | None = None):
    tenancy.require_manage_business(owner_type, organization, provider)
    return {"capabilities": entitlements.list_entitlements(owner_type, organization, provider)}


@frappe.whitelist(methods=["GET"])
def list_owned_content(public_site: str | None = None):
    filters = {"public_site": public_site} if public_site else {}
    rows = frappe.get_list(
        "Content Ownership",
        filters=filters,
        fields=[
            "name",
            "source_doctype",
            "source_name",
            "public_site",
            "capability",
            "status",
            "last_release",
            "modified",
        ],
        order_by="modified desc",
        limit_page_length=0,
    )
    return {"items": rows}


@frappe.whitelist(methods=["GET"])
def list_releases(public_site: str):
    frappe.has_permission("Public Site", doc=public_site, throw=True)
    rows = frappe.get_list(
        "Published Content Release",
        filters={"public_site": public_site},
        fields=[
            "name",
            "content_type",
            "source_name",
            "route",
            "locale",
            "status",
            "content_hash",
            "published_by",
            "published_at",
            "supersedes",
            "superseded_by",
        ],
        order_by="creation desc",
        limit_page_length=0,
    )
    return {"releases": rows}


@frappe.whitelist(methods=["POST"])
def publish_article(ownership: str, expected_modified: str | None = None, locale: str | None = None):
    release = releases.publish_article(ownership, expected_modified, locale)
    return {"release": release.name, "releaseNumber": release.release_number, "hash": release.content_hash, "route": release.route}


@frappe.whitelist(methods=["POST"])
def preview_article(ownership: str, locale: str | None = None):
    return releases.preview_article(ownership, locale)


@frappe.whitelist(methods=["POST"])
def withdraw_release(release: str, reason: str | None = None):
    doc = releases.withdraw_release(release, reason)
    return {"release": doc.name, "status": doc.status}


@frappe.whitelist(methods=["POST"])
def rollback_release(release: str, locale: str | None = None):
    doc = releases.rollback_release(release, locale)
    return {"release": doc.name, "releaseNumber": doc.release_number, "hash": doc.content_hash}
