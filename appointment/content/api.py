"""Owner-facing content authoring, preview and publication API.

Every handler resolves the authorized business membership through the service
layer before it touches an upstream authoring record. Handlers stay thin.
"""

from __future__ import annotations

import frappe

from appointment.content.monitoring import observed

from appointment.content import entitlements, releases, tenancy


@frappe.whitelist(methods=["POST"])
@observed("media.upload", scope="site")
def upload_gallery_image(public_site: str, content_base64: str, public_consent=0):
    from appointment.content import authoring

    return authoring.upload_image(public_site, content_base64, public_consent)


@frappe.whitelist(methods=["POST"])
@observed("article.create", scope="site")
def create_article(public_site: str, title: str, slug: str, body: str, summary: str = ""):
    from appointment.content import authoring

    return authoring.create_article(public_site, title, slug, body, summary)


@frappe.whitelist(methods=["POST"])
@observed("gallery.create", scope="site")
def create_gallery(public_site: str, title: str, slug: str, summary: str = "", items=None):
    from appointment.content import authoring

    return authoring.create_gallery(public_site, title, slug, summary, items)


@frappe.whitelist(methods=["GET"])
def get_content_draft(ownership: str):
    from appointment.content import authoring

    return authoring.get_draft(ownership)


@frappe.whitelist(methods=["POST"])
def save_article_draft(ownership: str, expected_modified: str, title: str, body: str, summary: str = ""):
    from appointment.content import authoring

    return authoring.save_article(ownership, expected_modified, title, body, summary)


@frappe.whitelist(methods=["GET"])
def content_capabilities(owner_type: str, organization: str | None = None, provider: str | None = None):
    tenancy.require_manage_business(owner_type, organization, provider)
    return {"capabilities": entitlements.list_entitlements(owner_type, organization, provider)}


@frappe.whitelist(methods=["GET"])
def list_owned_content(public_site: str | None = None):
    filters = {"source_doctype": ["in", ["Blog Post", "Newsletter", "Gallery Collection"]]}
    if public_site:
        filters["public_site"] = public_site
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
    for row in rows:
        row["title"] = (
            frappe.db.get_value(row.source_doctype, row.source_name, "title")
            if row.source_doctype in {"Blog Post", "Gallery Collection"}
            else "Newsletter draft"
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
@observed("article.publish", scope="ownership")
def publish_article(ownership: str, expected_modified: str | None = None, locale: str | None = None):
    release = releases.publish_article(ownership, expected_modified, locale)
    return {"release": release.name, "releaseNumber": release.release_number, "hash": release.content_hash, "route": release.route}


@frappe.whitelist(methods=["POST"])
@observed("article.preview", scope="ownership")
def preview_article(ownership: str, locale: str | None = None):
    return releases.preview_article(ownership, locale)


@frappe.whitelist(methods=["POST"])
@observed("gallery.preview", scope="ownership")
def preview_gallery_collection(ownership: str, locale: str | None = None):
    return releases.preview_gallery_collection(ownership, locale)


@frappe.whitelist(methods=["POST"])
@observed("gallery.publish", scope="ownership")
def publish_gallery_collection(ownership: str, locale: str | None = None):
    release = releases.publish_gallery_collection(ownership, locale)
    return {
        "release": release.name,
        "releaseNumber": release.release_number,
        "hash": release.content_hash,
        "route": release.route,
    }


@frappe.whitelist(methods=["POST"])
@observed("content.withdraw", scope="release")
def withdraw_release(release: str, reason: str | None = None):
    doc = releases.withdraw_release(release, reason)
    return {"release": doc.name, "status": doc.status}


@frappe.whitelist(methods=["POST"])
@observed("content.rollback", scope="release")
def rollback_release(release: str, locale: str | None = None):
    doc = releases.rollback_release(release, locale)
    return {"release": doc.name, "releaseNumber": doc.release_number, "hash": doc.content_hash}
