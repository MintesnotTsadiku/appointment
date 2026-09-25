"""Hardening helpers for the public experience.

Outbox processing, conservative security headers for public responses, and a
strict upload policy (JPEG/PNG/WebP only; SVG and oversize rejected). These are
pure decision functions plus one idempotent worker.
"""

from __future__ import annotations

import json

import frappe
from frappe.utils import now_datetime

ALLOWED_UPLOAD_TYPES = ("image/jpeg", "image/png", "image/webp")
MAX_UPLOAD_BYTES = 5 * 1024 * 1024
MAX_DIMENSION = 6000

_PUBLIC_CSP = (
    "default-src 'self'; "
    "img-src 'self' data:; "
    "style-src 'self' 'unsafe-inline'; "
    "script-src 'self'; "
    "frame-ancestors 'none'; "
    "base-uri 'self'; "
    "form-action 'self'"
)


def public_response_headers() -> dict:
    """Security headers every public-experience response must carry."""

    return {
        "Content-Security-Policy": _PUBLIC_CSP,
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "geolocation=(), camera=(), microphone=()",
    }


def preview_response_headers() -> dict:
    """Preview responses are private and never indexed or cached."""

    headers = public_response_headers()
    headers["Cache-Control"] = "no-store"
    headers["X-Robots-Tag"] = "noindex, nofollow"
    return headers


def validate_upload(
    filename: object,
    content_type: object,
    size: int | None = None,
    width: int | None = None,
    height: int | None = None,
) -> str | None:
    """Return a reason to reject an upload, or ``None`` when it is acceptable."""

    name = str(filename or "").lower()
    if name.endswith(".svg"):
        return "SVG uploads are not allowed"
    if content_type not in ALLOWED_UPLOAD_TYPES:
        return "unsupported file type; use JPEG, PNG or WebP"
    if size is not None and size > MAX_UPLOAD_BYTES:
        return "file exceeds the size limit"
    if (width is not None and width > MAX_DIMENSION) or (height is not None and height > MAX_DIMENSION):
        return "image dimensions exceed the limit"
    return None


def process_pending_outbox(limit: int = 50) -> dict:
    """Idempotently complete pending outbox records.

    Replays cache purge and realtime notification after a crash between the
    database commit and the normal after-commit callback. Failed records are
    retried up to five times.
    """

    names = frappe.get_all(
        "Public Experience Outbox",
        filters={"status": ["in", ["Pending", "Failed"]], "attempts": ["<", 5]},
        pluck="name",
        order_by="creation asc",
        limit=int(limit),
    )
    processed = 0
    failed = 0
    for name in names:
        doc = None
        try:
            doc = frappe.get_doc("Public Experience Outbox", name)
            doc.attempts = (doc.attempts or 0) + 1
            payload = json.loads(doc.payload_json or "{}")
            if not isinstance(payload, dict) or not payload.get("site"):
                raise ValueError("outbox payload has no site")

            from appointment.public_experience.publisher import purge_experience_cache

            purge_experience_cache(payload["site"], payload.get("release"))
            frappe.publish_realtime(doc.event, payload)
            doc.status = "Done"
            doc.processed_at = now_datetime()
            doc.last_error = None
            doc.flags.ignore_permissions = True
            doc.save()
            processed += 1
        except Exception as exc:
            failed += 1
            if doc is not None:
                doc.status = "Failed"
                doc.last_error = str(exc)[:140]
                doc.flags.ignore_permissions = True
                doc.save()
            frappe.log_error(frappe.get_traceback(), f"Outbox processing: {name}")
    return {"processed": processed, "failed": failed}
