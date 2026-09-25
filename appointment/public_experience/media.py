"""Real image processing and quotas for brand assets.

Decodes with Pillow rather than trusting extension or MIME header, re-encodes
to strip metadata, and enforces byte/dimension and per-business quotas. SVG is
rejected outright.
"""

from __future__ import annotations

import io

import frappe

ALLOWED_FORMATS = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}
MAX_BYTES = 5 * 1024 * 1024
MAX_DIMENSION = 6000
MAX_ASSETS_PER_BUSINESS = 50
MAX_BYTES_PER_BUSINESS = 50 * 1024 * 1024

_ASSET_FIELDS = ("logo_primary", "logo_compact", "favicon")


class MediaError(frappe.ValidationError):
    code = "media_error"


def inspect_image(content: bytes) -> tuple[str, int, int]:
    """Return ``(mime, width, height)`` after a real decode, or raise."""

    from PIL import Image

    if not content:
        raise MediaError("the uploaded file is empty")
    if len(content) > MAX_BYTES:
        raise MediaError("file exceeds the size limit")
    try:
        with Image.open(io.BytesIO(content)) as image:
            image.verify()
        with Image.open(io.BytesIO(content)) as image:
            image_format = image.format
            width, height = image.size
    except Exception as exc:
        raise MediaError("the file is not a valid image") from exc
    if image_format not in ALLOWED_FORMATS:
        raise MediaError("unsupported image format; use JPEG, PNG or WebP")
    if width > MAX_DIMENSION or height > MAX_DIMENSION:
        raise MediaError("image dimensions exceed the limit")
    return ALLOWED_FORMATS[image_format], width, height


def sanitize_image(content: bytes) -> tuple[bytes, str]:
    """Decode, re-encode (stripping metadata) and return ``(bytes, mime)``."""

    from PIL import Image

    mime, _width, _height = inspect_image(content)
    with Image.open(io.BytesIO(content)) as image:
        if mime == "image/jpeg":
            converted = image.convert("RGB")
            out_format = "JPEG"
        elif mime == "image/png":
            converted = image.convert("RGBA")
            out_format = "PNG"
        else:
            converted = image.convert("RGBA")
            out_format = "WEBP"
        buffer = io.BytesIO()
        converted.save(buffer, format=out_format)
    return buffer.getvalue(), mime


def business_asset_usage(owner_type: str, organization: str | None, provider: str | None) -> dict:
    """Total asset count and bytes for a Business across its brand profiles."""

    filters = {"owner_type": owner_type}
    if owner_type == "Organization":
        filters["organization"] = organization
    else:
        filters["provider"] = provider
    profiles = frappe.get_all("Brand Profile", filters=filters, pluck="name", ignore_permissions=True)
    if not profiles:
        return {"count": 0, "bytes": 0}
    rows = frappe.get_all(
        "Brand Profile",
        filters={"name": ["in", profiles]},
        fields=[*_ASSET_FIELDS],
        ignore_permissions=True,
    )
    count = 0
    total = 0
    for row in rows:
        for field in _ASSET_FIELDS:
            value = row.get(field)
            if not value:
                continue
            count += 1
            size = frappe.db.get_value("File", value, "file_size") or 0
            total += int(size)
    return {"count": count, "bytes": total}


def enforce_quota(owner_type: str, organization: str | None, provider: str | None) -> None:
    """Raise when a Business has reached its asset-count or byte quota."""

    usage = business_asset_usage(owner_type, organization, provider)
    if usage["count"] > MAX_ASSETS_PER_BUSINESS:
        raise MediaError("this business has reached its asset limit")
    if usage["bytes"] > MAX_BYTES_PER_BUSINESS:
        raise MediaError("this business has reached its storage limit")
