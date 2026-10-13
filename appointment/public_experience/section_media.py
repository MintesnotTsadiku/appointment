"""Owner photos for website section image slots.

Uploads use the same pipeline as logos and gallery images: a real decode, a re-encode that strips metadata,
the same size, type and library limits, and a public File attached to the owner's Public Site. Only a person
who manages the business can upload or list. A section may only show an upload from its own site's library.
"""

from __future__ import annotations

import base64
import binascii

import frappe
from frappe import _

from appointment.public_experience import media
from appointment.public_experience.section_schemas import is_owner_upload

MAX_LIBRARY_FILES = 200
MAX_LIBRARY_BYTES = 50 * 1024 * 1024
_EXTENSIONS = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}
_IMAGE_SUFFIXES = (".png", ".jpg", ".jpeg", ".webp")


def limits() -> dict:
    return {"maxBytes": media.MAX_BYTES, "maxDimension": media.MAX_DIMENSION, "types": sorted(_EXTENSIONS)}


def upload(site: str, content_base64: str, public_consent) -> dict:
    from appointment.public_experience import setup

    setup.require_site(site)
    if str(public_consent) not in {"1", "True", "true"}:
        frappe.throw(_("Confirm that this image may appear on your public website."))
    content = _decoded(content_base64)
    sanitized, mime = media.sanitize_image(content)
    _require_library_room(site, len(sanitized))
    from frappe.utils.file_manager import save_file

    from appointment.content.media_access import permit_upload

    with permit_upload(site):
        file = save_file(f"section-{frappe.generate_hash(length=16)}.{_EXTENSIONS[mime]}", sanitized,
                         "Public Site", site, is_private=0)
    _mime, width, height = media.inspect_image(sanitized)
    return {"name": file.name, "url": file.file_url, "width": width, "height": height, "bytes": len(sanitized)}


def library(site: str) -> dict:
    """Public images of this website, newest first, with the gallery's alt text when one is known."""
    from appointment.public_experience import setup

    setup.require_site(site)
    rows = frappe.get_all("File", filters={"attached_to_doctype": "Public Site", "attached_to_name": site, "is_private": 0},
                          fields=["name", "file_url", "file_size", "creation"], order_by="creation desc",
                          limit=MAX_LIBRARY_FILES, ignore_permissions=True)
    images = [row for row in rows if is_owner_upload(row.file_url) and row.file_url.lower().endswith(_IMAGE_SUFFIXES)
              and not row.file_url.rsplit("/", 1)[-1].startswith("identity-")]
    alts = _gallery_alt_text([row.file_url for row in images])
    return {"items": [{"name": row.name, "url": row.file_url, "bytes": int(row.file_size or 0),
                       "alt": alts.get(row.file_url) or ""} for row in images], "limits": limits()}


def require_site_media(site_name: str | None, content: object) -> None:
    """Refuse a section that shows an upload from another site's library (or a file that is gone)."""
    for url in _owner_uploads(content):
        owned = site_name and frappe.db.exists("File", {"file_url": url, "is_private": 0, "attached_to_doctype": "Public Site",
                                                         "attached_to_name": site_name})
        if not owned:
            frappe.throw(_("Choose a photo from this website's media library."), frappe.PermissionError)


def _owner_uploads(value: object):
    if isinstance(value, dict):
        if is_owner_upload(value.get("image")):
            yield value["image"]
        for child in value.values():
            yield from _owner_uploads(child)
    elif isinstance(value, list):
        for child in value:
            yield from _owner_uploads(child)


def _decoded(content_base64) -> bytes:
    if not isinstance(content_base64, str) or len(content_base64) > 7 * 1024 * 1024:
        frappe.throw(_("Choose an image smaller than 5 MB."))
    try:
        return base64.b64decode(content_base64, validate=True)
    except (ValueError, binascii.Error):
        frappe.throw(_("The image upload is invalid."))


def _require_library_room(site: str, size: int) -> None:
    rows = frappe.get_all("File", filters={"attached_to_doctype": "Public Site", "attached_to_name": site},
                          fields=["file_size"], ignore_permissions=True)
    if len(rows) >= MAX_LIBRARY_FILES or sum(int(row.file_size or 0) for row in rows) + size > MAX_LIBRARY_BYTES:
        frappe.throw(_("Your website media library is full. Remove unused media before uploading."))


def _gallery_alt_text(urls: list[str]) -> dict[str, str]:
    if not urls:
        return {}
    rows = frappe.get_all("Gallery Item", filters={"image": ["in", urls]}, fields=["image", "alt_text"], ignore_permissions=True)
    return {row.image: row.alt_text for row in rows if row.alt_text}
