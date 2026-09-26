"""Governed gallery media: typed video, content-validated imagery and consent.

Arbitrary iframe HTML is never accepted. Hosted video uses typed providers and
normalized identifiers from an allowlist. Images are validated from their
decoded content, not their extension or declared MIME type.
"""

from __future__ import annotations

import hashlib
import re
from urllib.parse import parse_qs, urlparse

import frappe
from frappe import _

from appointment.content.sanitize import safe_url

VIDEO_PROVIDERS = ("youtube", "vimeo")
GALLERY_ROUTE_PREFIX = "/gallery/"
CONSENT_STATES = ("Not Required", "Pending", "Approved")

_YOUTUBE_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")
_VIMEO_ID = re.compile(r"^[0-9]{6,12}$")
_PROVIDER_HOSTS = {
    "youtube": {"youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"},
    "vimeo": {"vimeo.com", "www.vimeo.com", "player.vimeo.com"},
}


class MediaSafetyError(frappe.ValidationError):
    code = "media_safety_error"


def normalize_video(provider: object, identifier: object) -> str:
    """Return a normalized video identifier, or refuse the reference."""

    provider_key = str(provider or "").strip().lower()
    if provider_key not in VIDEO_PROVIDERS:
        raise MediaSafetyError("unsupported video provider")
    value = str(identifier or "").strip()
    if not value:
        raise MediaSafetyError("a video identifier is required")
    if value.startswith("http://") or value.startswith("https://"):
        parsed = urlparse(value)
        host = parsed.netloc.lower()
        if host not in _PROVIDER_HOSTS[provider_key]:
            raise MediaSafetyError("the video link is not from the selected provider")
        if provider_key == "youtube":
            if host.endswith("youtu.be"):
                value = parsed.path.strip("/").split("/")[0]
            else:
                value = parse_qs(parsed.query).get("v", [""])[0] or parsed.path.strip("/").split("/")[-1]
        else:
            value = parsed.path.strip("/").split("/")[-1]
    if provider_key == "youtube" and not _YOUTUBE_ID.match(value):
        raise MediaSafetyError("the YouTube video identifier is not valid")
    if provider_key == "vimeo" and not _VIMEO_ID.match(value):
        raise MediaSafetyError("the Vimeo video identifier is not valid")
    return value


def safe_local_media(path: object) -> str | None:
    url = safe_url(path)
    if not url or not url.startswith("/") or url.startswith("/private/"):
        return None
    return url


def validate_image_asset(file_url: object, public_site=None) -> dict:
    """Decode a local File's bytes and return its verified metadata."""

    url = safe_local_media(file_url)
    if not url:
        raise MediaSafetyError("an image must be a site-local public file")
    filters = {"file_url": url, "is_private": 0}
    if public_site:
        filters.update({"attached_to_doctype": "Public Site", "attached_to_name": public_site})
    file_name = frappe.db.get_value("File", filters, "name")
    if not file_name:
        raise MediaSafetyError("choose a public image from this website's media library")
    content = frappe.get_doc("File", file_name).get_content()
    from appointment.public_experience.media import inspect_image

    mime, width, height = inspect_image(content)
    return {
        "mime": mime,
        "width": width,
        "height": height,
        "bytes": len(content),
        "checksum": hashlib.sha256(content).hexdigest(),
    }


def validate_item(item, public_site=None) -> dict:
    """Validate one gallery item and return its derived media metadata."""

    media_type = (item.media_type or "image").strip()
    if media_type == "image":
        meta = validate_image_asset(item.image, public_site)
        if not (item.alt_text or "").strip():
            raise MediaSafetyError("every gallery image requires alt text")
        item.checksum = meta["checksum"]
        item.width = meta["width"]
        item.height = meta["height"]
        item.video_provider = None
        item.video_id = None
        return meta
    if media_type == "video":
        item.video_id = normalize_video(item.video_provider, item.video_id)
        if not (item.alt_text or "").strip():
            raise MediaSafetyError("every gallery video requires alt text")
        if item.thumbnail:
            thumbnail_url = safe_local_media(item.thumbnail)
            if not thumbnail_url:
                raise MediaSafetyError("a video thumbnail must be a site-local public image")
            item.thumbnail = thumbnail_url
            validate_image_asset(item.thumbnail, public_site)
        if item.poster:
            poster_url = safe_local_media(item.poster)
            if not poster_url:
                raise MediaSafetyError("a video poster must be a site-local public image")
            item.poster = poster_url
            validate_image_asset(item.poster, public_site)
        item.image = None
        item.checksum = None
        return {"provider": item.video_provider, "id": item.video_id}
    raise MediaSafetyError("unsupported media type")


def validate_collection(collection) -> dict:
    """Validate collection-level media and consent rules."""

    from appointment.content import tenancy

    key = tenancy.require_business_owner(collection.owner_type, collection.organization, collection.provider)
    if collection.owner_type == "Organization":
        collection.provider = None
    else:
        collection.organization = None
    collection.active_owner_key = key
    if collection.cover:
        cover = safe_local_media(collection.cover)
        if not cover:
            raise MediaSafetyError("the cover must be a site-local public image")
        collection.cover = cover
        validate_image_asset(collection.cover, collection.public_site)
    seen_orders: set[int] = set()
    pending_consent = False
    for index, item in enumerate(collection.items):
        validate_item(item, collection.public_site)
        if item.sort_order in seen_orders:
            raise MediaSafetyError("each gallery item needs a unique sort order")
        seen_orders.add(item.sort_order)
        if item.consent_status not in CONSENT_STATES:
            raise MediaSafetyError("unknown consent status")
        if item.consent_status == "Pending":
            pending_consent = True
        if index == 0 and item.consent_status == "Approved" and collection.consent_review_status == "Not Required":
            collection.consent_review_status = "Approved"
    if pending_consent:
        collection.consent_review_status = "Pending"
    if collection.status == "Published" and pending_consent:
        raise MediaSafetyError("a gallery with pending image consent cannot be published")
    return {"items": len(collection.items)}


def ordered_items(collection) -> list:
    items = list(collection.items)
    if collection.ordering_mode == "date":
        items.sort(key=lambda row: (str(row.display_date or ""), row.sort_order or 0))
    else:
        items.sort(key=lambda row: (row.sort_order or 0, row.name or ""))
    return items


def gallery_route(slug: str) -> str:
    return f"{GALLERY_ROUTE_PREFIX}{slug}"


def build_gallery_projection(collection) -> dict:
    """Project a collection into a safe, structured public snapshot."""

    items = []
    for row in ordered_items(collection):
        entry = {
            "mediaType": row.media_type,
            "caption": row.caption or "",
            "altText": row.alt_text or "",
            "credit": row.credit or "",
            "date": str(row.display_date or ""),
            "focalX": int(row.focal_x if row.focal_x is not None else 50),
            "focalY": int(row.focal_y if row.focal_y is not None else 50),
            "aspectRatio": row.aspect_ratio or None,
            "consentStatus": row.consent_status,
        }
        if row.media_type == "video":
            entry.update(
                {
                    "videoProvider": row.video_provider,
                    "videoId": row.video_id,
                    "thumbnail": safe_local_media(row.thumbnail),
                    "poster": safe_local_media(row.poster),
                }
            )
        else:
            entry.update(
                {
                    "image": safe_local_media(row.image),
                    "width": row.width,
                    "height": row.height,
                    "checksum": row.checksum,
                }
            )
        items.append(entry)
    title = collection.title or ""
    return {
        "projection": {
            "type": "gallery_collection",
            "title": title,
            "slug": collection.slug,
            "summary": collection.summary or "",
            "cover": safe_local_media(collection.cover),
            "grouping": {
                "type": collection.grouping_type,
                "value": collection.grouping_value or None,
                "date": str(collection.display_date or "") or None,
            },
            "tags": [tag.strip() for tag in (collection.tags or "").split(",") if tag.strip()],
            "items": items,
            "seo": {
                "title": collection.seo_title or title,
                "description": collection.seo_description or collection.summary or "",
                "image": safe_local_media(collection.cover),
            },
        },
        "cover": safe_local_media(collection.cover),
    }
