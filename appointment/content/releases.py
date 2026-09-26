"""Tenant-safe, immutable content publication.

Authoring records live in the upstream Blog app. Public traffic never reads
them. Publishing projects a safe, sanitized snapshot into an immutable
Published Content Release. Route uniqueness, supersession, withdrawal, rollback
and preview are all enforced here.
"""

from __future__ import annotations

import json
from datetime import timedelta

import frappe
from frappe import _
from frappe.utils import now_datetime

from appointment.content import entitlements, tenancy
from appointment.content.canonical import hash_document
from appointment.content.sanitize import (
    excerpt,
    html_to_blocks,
    markdown_to_html,
    safe_url,
)
from appointment.public_experience.reserved import normalize_slug

RELEASE_CONTRACT = "appointment-content-release.v1"
TEMPLATE_COMPAT_VERSION = "public-content.v1"
PREVIEW_TTL_SECONDS = 900
ARTICLE_ROUTE_PREFIX = "/blog/"
_PREVIEW_PREFIX = "content:preview:"


class ContentPublishError(frappe.ValidationError):
    code = "content_publish_error"


class StaleContentError(ContentPublishError):
    code = "stale_content"


class RouteConflictError(ContentPublishError):
    code = "route_conflict"


def safe_media(value: object) -> str | None:
    """Public media must be a site-local, non-private path."""

    url = safe_url(value)
    if not url or not url.startswith("/") or url.startswith("/private/"):
        return None
    return url


def _site_meta(site: str):
    return frappe.db.get_value(
        "Public Site",
        site,
        ["name", "slug", "owner_type", "organization", "provider", "status", "default_locale"],
        as_dict=True,
    )


def _lock_site(name: str) -> None:
    frappe.db.sql(
        "select name from " + chr(96) + "tabPublic Site" + chr(96) + " where name=%s for update",
        name,
    )


def _active_release(site: str, locale: str, route: str):
    return frappe.db.get_value(
        "Published Content Release",
        {"public_site": site, "locale": locale, "route": route, "status": "Active"},
        ["name", "source_name", "source_doctype", "content_hash"],
        as_dict=True,
    )


def _parse(raw):
    if isinstance(raw, dict):
        return dict(raw)
    if not raw:
        return {}
    try:
        data = json.loads(raw)
    except (TypeError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


def build_article_projection(post, public_site=None) -> dict:
    """Project a Blog Post into a safe, structured article snapshot."""

    if public_site:
        from appointment.content.support_records import validate_article

        validate_article(post, public_site)
    content_type = (post.get("content_type") or "Markdown").strip().lower()
    raw = post.get("content") or ""
    html = markdown_to_html(raw) if content_type == "markdown" else str(raw)
    blocks = html_to_blocks(html)
    title = (post.get("title") or "").strip()
    upstream_route = (post.get("route") or "").strip().strip("/")
    candidate = upstream_route.rsplit("/", 1)[-1] if upstream_route else ""
    slug = normalize_slug(candidate) or normalize_slug(title) or normalize_slug(post.name)
    summary = (post.get("blog_intro") or "").strip() or excerpt(blocks)
    hero = safe_media(post.get("meta_image"))
    images = [block.get("src") for block in blocks if block.get("type") == "image"]
    if post.get("meta_image") and not hero:
        raise ContentPublishError("Choose a safe public article image.")
    if hero or images:
        from appointment.content.gallery import validate_image_asset

        if not public_site:
            raise ContentPublishError("Article images require their owning website.")
        for image in [hero, *images]:
            if image:
                validate_image_asset(image, public_site)
    category = frappe.db.get_value("Blog Category", post.get("blog_category"), "title") if post.get("blog_category") else None
    # Factory categories identify a website internally; they are not editorial labels.
    if category and category.startswith("Website "):
        category = None
    projection = {
        "type": "article",
        "title": title,
        "slug": slug,
        "excerpt": summary,
        "blocks": blocks,
        "author": frappe.db.get_value("Blogger", post.get("blogger"), "full_name") if post.get("blogger") else None,
        "category": category,
        "publishedOn": str(post.get("published_on") or post.get("creation") or ""),
        "seo": {
            "title": post.get("meta_title") or title,
            "description": post.get("meta_description") or summary,
            "image": hero,
        },
    }
    return {"projection": projection, "hero": hero}


def article_route(slug: str) -> str:
    return f"{ARTICLE_ROUTE_PREFIX}{slug}"


def _release_document(site, content_type, route, locale, projection, media):
    return {
        "contract": RELEASE_CONTRACT,
        "publicSite": site,
        "contentType": content_type,
        "route": route,
        "locale": locale,
        "projection": projection,
    }


def _supersede_existing(site: str, locale: str, route: str) -> str | None:
    existing = _active_release(site, locale, route)
    if not existing:
        return None
    return existing.name


def publish_article(ownership, expected_modified: str | None = None, locale: str | None = None):
    """Publish an immutable article release from an owned Blog Post."""

    own = frappe.get_doc("Content Ownership", ownership) if isinstance(ownership, str) else ownership
    tenancy.require_manage_business(own.owner_type, own.organization, own.provider)
    if own.source_doctype != "Blog Post":
        raise ContentPublishError("this ownership record is not an article")
    post = frappe.get_doc("Blog Post", own.source_name)
    if expected_modified is not None and str(expected_modified) != str(post.get("modified")):
        raise StaleContentError(
            "the article changed since it was loaded",
            details={"expected": str(expected_modified), "stored": str(post.get("modified"))},
        )
    built = build_article_projection(post, own.public_site)
    projection = built["projection"]
    if not projection["blocks"]:
        raise ContentPublishError("the article has no publishable content")
    return publish_projection(
        own,
        capability="blog",
        content_type="article",
        source_doctype="Blog Post",
        source_name=own.source_name,
        projection=projection,
        route=article_route(projection["slug"]),
        locale=locale,
        media={"hero": built["hero"]},
        source_modified=post.get("modified"),
        limit_key="articles",
        route_label="article",
    )


def publish_projection(
    ownership,
    *,
    capability: str,
    content_type: str,
    source_doctype: str,
    source_name: str,
    projection: dict,
    route: str,
    locale: str | None,
    media: dict,
    source_modified=None,
    limit_key: str | None = None,
    route_label: str = "item",
):
    """Create an immutable release for an already-sanitized projection.

    The single place that supersedes a route owner and emits the cache event.
    """

    own = frappe.get_doc("Content Ownership", ownership) if isinstance(ownership, str) else ownership
    entitlements.require_capability(own.owner_type, own.organization, own.provider, capability)
    if not own.public_site:
        raise ContentPublishError("the content is not linked to a public site")
    site = _site_meta(own.public_site)
    if not site:
        raise ContentPublishError("the public site does not exist")
    locale = locale or site.default_locale or "en"

    _lock_site(own.public_site)
    existing = _active_release(own.public_site, locale, route)
    if existing and existing.source_name != source_name:
        raise RouteConflictError(f"that public route is already owned by another {route_label}")
    if not existing and limit_key:
        active_count = frappe.db.count(
            "Published Content Release",
            {"active_owner_key": own.active_owner_key, "content_type": content_type, "status": "Active"},
        )
        entitlements.enforce_limit(
            own.owner_type, own.organization, own.provider, capability, limit_key, active_count + 1
        )
    content_hash = hash_document(
        _release_document(own.public_site, content_type, route, locale, projection, media)
    )
    release = frappe.get_doc(
        {
            "doctype": "Published Content Release",
            "public_site": own.public_site,
            "owner_type": own.owner_type,
            "organization": own.organization,
            "provider": own.provider,
            "content_type": content_type,
            "source_doctype": source_doctype,
            "source_name": source_name,
            "route": route,
            "locale": locale,
            "template_compat_version": TEMPLATE_COMPAT_VERSION,
            "source_modified": source_modified,
            "content_hash": content_hash,
            "content_json": json.dumps(projection, sort_keys=True),
            "media_json": json.dumps(media, sort_keys=True),
            "seo_json": json.dumps(projection.get("seo") or {}, sort_keys=True),
            "status": "Active",
            "supersedes": existing.name if existing else None,
        }
    )
    release.flags.content_release_factory = True
    release.flags.ignore_permissions = True
    release.insert()
    if existing:
        frappe.db.set_value(
            "Published Content Release",
            existing.name,
            {"status": "Superseded", "superseded_by": release.name},
            update_modified=False,
        )
    own.last_release = release.name
    own.status = "Published"
    own.flags.ignore_permissions = True
    own.save()
    _after_publish(own.public_site)
    return release


def publish_gallery_collection(ownership, locale: str | None = None):
    """Publish an immutable gallery-collection release."""

    from appointment.content import gallery as gallery_module

    own = frappe.get_doc("Content Ownership", ownership) if isinstance(ownership, str) else ownership
    tenancy.require_manage_business(own.owner_type, own.organization, own.provider)
    if own.source_doctype != "Gallery Collection":
        raise ContentPublishError("this ownership record is not a gallery collection")
    collection = frappe.get_doc("Gallery Collection", own.source_name)
    built = gallery_module.build_gallery_projection(collection)
    projection = built["projection"]
    if not projection["items"]:
        raise ContentPublishError("the collection has no items")
    return publish_projection(
        own,
        capability="gallery",
        content_type="gallery_collection",
        source_doctype="Gallery Collection",
        source_name=own.source_name,
        projection=projection,
        route=gallery_module.gallery_route(projection["slug"]),
        locale=locale,
        media={"cover": built["cover"]},
        source_modified=collection.get("modified"),
        limit_key="collections",
        route_label="collection",
    )


def withdraw_release(release, reason: str | None = None):
    doc = frappe.get_doc("Published Content Release", release) if isinstance(release, str) else release
    tenancy.require_manage_business(doc.owner_type, doc.organization, doc.provider)
    if doc.status == "Withdrawn":
        return doc
    if doc.status != "Active":
        raise ContentPublishError("only an active release can be withdrawn")
    doc.status = "Withdrawn"
    doc.withdrawn_by = frappe.session.user
    doc.withdrawn_at = now_datetime()
    doc.withdrawn_reason = (reason or "").strip()[:500] or None
    doc.flags.ignore_permissions = True
    doc.flags.content_release_status_change = True
    doc.save()
    own = frappe.db.get_value(
        "Content Ownership",
        {"source_doctype": doc.source_doctype, "source_name": doc.source_name, "public_site": doc.public_site},
        "name",
    )
    if own:
        frappe.db.set_value("Content Ownership", own, "status", "Withdrawn", update_modified=False)
    _after_publish(doc.public_site)
    return doc


def rollback_release(release, locale: str | None = None):
    """Reinstate a prior immutable projection as a new active release."""

    target = frappe.get_doc("Published Content Release", release) if isinstance(release, str) else release
    tenancy.require_manage_business(target.owner_type, target.organization, target.provider)
    if not target.content_json:
        raise ContentPublishError("the target release has no projection")
    locale = locale or target.locale
    _lock_site(target.public_site)
    existing = _active_release(target.public_site, locale, target.route)
    if existing and existing.name == target.name:
        return target
    projection = _parse(target.content_json)
    content_hash = hash_document(
        _release_document(
            target.public_site, target.content_type, target.route, locale, projection, _parse(target.media_json).get("hero")
        )
    )
    reinstated = frappe.get_doc(
        {
            "doctype": "Published Content Release",
            "public_site": target.public_site,
            "owner_type": target.owner_type,
            "organization": target.organization,
            "provider": target.provider,
            "content_type": target.content_type,
            "source_doctype": target.source_doctype,
            "source_name": target.source_name,
            "route": target.route,
            "locale": locale,
            "template_compat_version": target.template_compat_version,
            "source_modified": target.source_modified,
            "content_hash": content_hash,
            "content_json": target.content_json,
            "media_json": target.media_json,
            "seo_json": target.seo_json,
            "status": "Active",
            "supersedes": existing.name if existing else None,
        }
    )
    reinstated.flags.content_release_factory = True
    reinstated.flags.ignore_permissions = True
    reinstated.insert()
    if existing and existing.name != reinstated.name:
        frappe.db.set_value(
            "Published Content Release",
            existing.name,
            {"status": "Superseded", "superseded_by": reinstated.name},
            update_modified=False,
        )
    own = frappe.db.get_value(
        "Content Ownership",
        {"source_doctype": target.source_doctype, "source_name": target.source_name, "public_site": target.public_site},
        "name",
    )
    if own:
        frappe.db.set_value(
            "Content Ownership", own, {"last_release": reinstated.name, "status": "Published"}, update_modified=False
        )
    _after_publish(target.public_site)
    return reinstated


def preview_article(ownership, locale: str | None = None) -> dict:
    """Build an unpersisted, session-bound preview of the current draft."""

    own = frappe.get_doc("Content Ownership", ownership) if isinstance(ownership, str) else ownership
    tenancy.require_manage_business(own.owner_type, own.organization, own.provider)
    entitlements.require_capability(own.owner_type, own.organization, own.provider, "blog")
    if own.source_doctype != "Blog Post":
        raise ContentPublishError("this ownership record is not an article")
    post = frappe.get_doc("Blog Post", own.source_name)
    built = build_article_projection(post, own.public_site)
    projection = built["projection"]
    route = article_route(projection["slug"])
    token = frappe.generate_hash(length=40)
    expires_at = now_datetime() + timedelta(seconds=PREVIEW_TTL_SECONDS)
    payload = {
        "ownerType": own.owner_type,
        "organization": own.organization,
        "provider": own.provider,
        "activeOwnerKey": own.active_owner_key,
        "publicSite": own.public_site,
        "route": route,
        "locale": locale or "en",
        "projection": projection,
        "user": frappe.session.user,
        "expiresAt": str(expires_at),
    }
    try:
        frappe.cache.set_value(f"{_PREVIEW_PREFIX}{token}", payload, expires_in_sec=PREVIEW_TTL_SECONDS)
    except Exception:
        pass
    detail = {"route": route, "locale": locale or "en", "releaseHash": "private-draft",
              "templateCompatVersion": TEMPLATE_COMPAT_VERSION, "publishedAt": "",
              "projection": projection, "hero": built["hero"], "seo": projection.get("seo") or {}}
    return {"token": token, "expiresAt": str(expires_at), "route": route, "projection": projection, "detail": detail}


def preview_gallery_collection(ownership, locale: str | None = None) -> dict:
    """Build a session-bound preview of a gallery collection draft."""

    from appointment.content import gallery as gallery_module

    own = frappe.get_doc("Content Ownership", ownership) if isinstance(ownership, str) else ownership
    tenancy.require_manage_business(own.owner_type, own.organization, own.provider)
    entitlements.require_capability(own.owner_type, own.organization, own.provider, "gallery")
    if own.source_doctype != "Gallery Collection":
        raise ContentPublishError("this ownership record is not a gallery collection")
    collection = frappe.get_doc("Gallery Collection", own.source_name)
    built = gallery_module.build_gallery_projection(collection)
    route = gallery_module.gallery_route(built["projection"]["slug"])
    token = frappe.generate_hash(length=40)
    expires_at = now_datetime() + timedelta(seconds=PREVIEW_TTL_SECONDS)
    payload = {
        "ownerType": own.owner_type,
        "organization": own.organization,
        "provider": own.provider,
        "activeOwnerKey": own.active_owner_key,
        "publicSite": own.public_site,
        "route": route,
        "locale": locale or "en",
        "projection": built["projection"],
        "user": frappe.session.user,
        "expiresAt": str(expires_at),
    }
    try:
        frappe.cache.set_value(f"{_PREVIEW_PREFIX}{token}", payload, expires_in_sec=PREVIEW_TTL_SECONDS)
    except Exception:
        pass
    return {"token": token, "expiresAt": str(expires_at), "route": route, "projection": built["projection"]}


def consume_article_preview(token: str, user: str | None = None) -> dict | None:
    if not token:
        return None
    try:
        entry = frappe.cache.get_value(f"{_PREVIEW_PREFIX}{token}")
    except Exception:
        return None
    if not entry:
        return None
    actor = user or frappe.session.user
    if actor != entry.get("user") and not tenancy.can_manage_business(
        entry.get("ownerType"), entry.get("organization"), entry.get("provider"), actor
    ):
        return None
    return entry


def _after_publish(site: str) -> None:
    def _run():
        from appointment.public_experience.publisher import purge_experience_cache

        try:
            purge_experience_cache(site)
            frappe.publish_realtime("content_release_changed", {"site": site})
        except Exception:
            frappe.log_error(frappe.get_traceback(), "Content release cache purge")

    frappe.db.after_commit.add(_run)


def list_public_articles(site: str, locale: str | None = None, limit: int = 20, offset: int = 0) -> dict:
    filters = {"public_site": site, "content_type": "article", "status": "Active"}
    if locale:
        filters["locale"] = locale
    rows = frappe.get_all(
        "Published Content Release",
        filters=filters,
        fields=["name", "route", "locale", "content_hash", "published_at", "content_json", "media_json", "seo_json", "template_compat_version"],
        order_by="published_at desc",
        limit_start=int(offset),
        limit_page_length=int(limit),
        ignore_permissions=True,
    )
    articles = []
    for row in rows:
        projection = _parse(row.content_json)
        articles.append(
            {
                "route": row.route,
                "locale": row.locale,
                "releaseHash": row.content_hash,
                "templateCompatVersion": row.template_compat_version,
                "publishedAt": str(row.published_at or ""),
                "title": projection.get("title"),
                "slug": projection.get("slug"),
                "excerpt": projection.get("excerpt"),
                "author": projection.get("author"),
                "category": projection.get("category"),
                "hero": _parse(row.media_json).get("hero"),
                "seo": _parse(row.seo_json),
            }
        )
    return {"site": site, "articles": articles, "count": len(articles), "offset": int(offset)}


def get_public_article(site: str, route: str, locale: str | None = None) -> dict | None:
    filters = {"public_site": site, "content_type": "article", "status": "Active", "route": route}
    if locale:
        filters["locale"] = locale
    row = frappe.db.get_value(
        "Published Content Release",
        filters,
        ["name", "route", "locale", "content_hash", "published_at", "content_json", "media_json", "seo_json", "template_compat_version"],
        as_dict=True,
    )
    if not row:
        return None
    return {
        "route": row.route,
        "locale": row.locale,
        "releaseHash": row.content_hash,
        "templateCompatVersion": row.template_compat_version,
        "publishedAt": str(row.published_at or ""),
        "projection": _parse(row.content_json),
        "hero": _parse(row.media_json).get("hero"),
        "seo": _parse(row.seo_json),
    }


def list_public_galleries(site: str, locale: str | None = None, limit: int = 20, offset: int = 0) -> dict:
    filters = {"public_site": site, "content_type": "gallery_collection", "status": "Active"}
    if locale:
        filters["locale"] = locale
    rows = frappe.get_all(
        "Published Content Release",
        filters=filters,
        fields=["name", "route", "locale", "content_hash", "published_at", "content_json", "media_json", "seo_json", "template_compat_version"],
        order_by="published_at desc",
        limit_start=int(offset),
        limit_page_length=int(limit),
        ignore_permissions=True,
    )
    galleries = []
    for row in rows:
        projection = _parse(row.content_json)
        galleries.append(
            {
                "route": row.route,
                "locale": row.locale,
                "releaseHash": row.content_hash,
                "templateCompatVersion": row.template_compat_version,
                "publishedAt": str(row.published_at or ""),
                "title": projection.get("title"),
                "slug": projection.get("slug"),
                "summary": projection.get("summary"),
                "grouping": projection.get("grouping"),
                "tags": projection.get("tags"),
                "itemCount": len(projection.get("items") or []),
                "cover": _parse(row.media_json).get("cover"),
                "seo": _parse(row.seo_json),
            }
        )
    return {"site": site, "galleries": galleries, "count": len(galleries), "offset": int(offset)}


def get_public_gallery(site: str, route: str, locale: str | None = None) -> dict | None:
    filters = {"public_site": site, "content_type": "gallery_collection", "status": "Active", "route": route}
    if locale:
        filters["locale"] = locale
    row = frappe.db.get_value(
        "Published Content Release",
        filters,
        ["name", "route", "locale", "content_hash", "published_at", "content_json", "media_json", "seo_json", "template_compat_version"],
        as_dict=True,
    )
    if not row:
        return None
    return {
        "route": row.route,
        "locale": row.locale,
        "releaseHash": row.content_hash,
        "templateCompatVersion": row.template_compat_version,
        "publishedAt": str(row.published_at or ""),
        "projection": _parse(row.content_json),
        "cover": _parse(row.media_json).get("cover"),
        "seo": _parse(row.seo_json),
    }
