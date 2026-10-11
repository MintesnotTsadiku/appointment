"""Brand and growth settings over HTTP: one guest read and the platform admin editor."""

import base64
import binascii
import json

import frappe
from frappe import _
from frappe.rate_limiter import rate_limit

from appointment.growth.brand import DOCTYPE as BRAND_DOCTYPE
from appointment.growth.brand import brand
from appointment.growth.settings import DOCTYPE as GROWTH_DOCTYPE
from appointment.growth.settings import growth

# Growth fields a visitor's browser needs. Referral rewards and other admin numbers stay private.
PUBLIC_GROWTH = (
    "powered_by_pages", "own_page_text", "own_page_text_en", "own_page_text_am", "book_again_enabled",
    "customer_business_prompt_enabled", "share_message", "share_message_en", "share_message_am", "posters_enabled", "business_referrals_enabled", "customer_referrals_enabled",
    "partner_program_enabled", "tools_enabled", "directory_enabled", "year_review_enabled",
    "template_credit_enabled", "marketing_live_minutes",
)


def public_payload() -> dict:
    """Brand and public growth values for the current language; also injected into the SPA shell."""
    from appointment.growth import directory

    values = growth()
    public = {key: values[key] for key in PUBLIC_GROWTH}
    public["directory_public"] = directory.is_public()
    return dict(brand=brand(), growth=public)


@frappe.whitelist(allow_guest=True, methods=["GET"])
@rate_limit(limit=120, seconds=60)
def public_brand():
    return public_payload()


def is_platform_admin() -> bool:
    # Same rule as the platform payments page (payments_admin._require_admin).
    return "System Manager" in frappe.get_roles()


def _require_admin():
    if not is_platform_admin():
        frappe.throw(_("Only platform administrators can change the platform brand."), frappe.PermissionError)


IMAGE_FIELDS = ("logo", "logo_dark", "mark", "og_image")
MAX_IMAGE_BYTES = 2 * 1024 * 1024


def _editable(doctype: str) -> list[str]:
    return [f.fieldname for f in frappe.get_meta(doctype).fields if f.fieldtype not in frappe.model.no_value_fields]


def _values(doctype: str) -> dict:
    doc = frappe.get_single(doctype)
    return {field: doc.get(field) for field in _editable(doctype)}


@frappe.whitelist()
def get_settings():
    """Every saved brand and growth value, for the Brand & growth staff page."""
    _require_admin()
    return dict(brand=_values(BRAND_DOCTYPE), growth=_values(GROWTH_DOCTYPE))


@frappe.whitelist(methods=["POST"])
def save_settings(brand=None, growth=None):
    """Save the given brand and/or growth values. Unknown fields are ignored."""
    _require_admin()
    for doctype, changes in ((BRAND_DOCTYPE, brand), (GROWTH_DOCTYPE, growth)):
        if isinstance(changes, str):
            changes = json.loads(changes)
        if not changes:
            continue
        allowed = set(_editable(doctype))
        doc = frappe.get_single(doctype)
        doc.update({field: value for field, value in changes.items() if field in allowed})
        doc.save()
    return get_settings()


@frappe.whitelist(methods=["POST"])
def upload_brand_image(field: str, content_base64: str):
    """Store a PNG, JPEG or WebP for one brand image field and return its public URL.

    The image is re-encoded without metadata. The field keeps its old value until the page saves.
    """
    _require_admin()
    if field not in IMAGE_FIELDS:
        frappe.throw(_("Choose a logo, mark or share image field."))
    if not isinstance(content_base64, str) or len(content_base64) > MAX_IMAGE_BYTES * 4 // 3 + 4:
        frappe.throw(_("Choose an image smaller than 2 MB."))
    try:
        content = base64.b64decode(content_base64, validate=True)
    except (ValueError, binascii.Error):
        frappe.throw(_("The image upload is invalid."))
    from frappe.utils.file_manager import save_file

    from appointment.public_experience.media import MediaError, sanitize_image

    try:
        sanitized, mime = sanitize_image(content)
    except MediaError:
        frappe.throw(_("Choose a PNG, JPEG or WebP image."))
    extension = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}[mime]
    file = save_file(f"platform-{field.replace('_', '-')}-{frappe.generate_hash(length=8)}.{extension}",
                     sanitized, BRAND_DOCTYPE, BRAND_DOCTYPE, is_private=0)
    return {"url": file.file_url}
