"""Owner-uploaded identity images with decoded content and exact site ownership."""

import base64
import binascii
import io

import frappe

from appointment.content.gallery import validate_image_asset
from appointment.public_experience import media, setup

FIELDS = ("logo_primary", "logo_compact", "favicon")


def upload(site, expected_version, kind, content_base64, public_consent):
    if kind not in FIELDS:
        frappe.throw("Choose a logo or favicon.")
    doc = setup._locked_site(site, expected_version)
    if str(public_consent) not in {"1", "True", "true"}:
        frappe.throw("Confirm that this image may appear on your public website.")
    if not isinstance(content_base64, str) or len(content_base64) > 7 * 1024 * 1024:
        frappe.throw("Choose an image smaller than 5 MB.")
    try:
        content = base64.b64decode(content_base64, validate=True)
    except (ValueError, binascii.Error):
        frappe.throw("The image upload is invalid.")
    sanitized, mime = media.sanitize_image(content)
    if kind == "favicon":
        from PIL import Image, ImageOps

        with Image.open(io.BytesIO(sanitized)) as source:
            buffer = io.BytesIO()
            ImageOps.fit(source.convert("RGBA"), (256, 256)).save(buffer, format="PNG")
            sanitized, mime = buffer.getvalue(), "image/png"
    rows = frappe.get_all("File", filters={"attached_to_doctype": "Public Site", "attached_to_name": site}, fields=["file_size"])
    if len(rows) >= 200 or sum(int(row.file_size or 0) for row in rows) + len(sanitized) > 50 * 1024 * 1024:
        frappe.throw("Your website media library is full. Remove unused media before uploading.")
    from frappe.utils.file_manager import save_file

    extension = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}[mime]
    file = save_file("identity-" + frappe.generate_hash(length=16) + "." + extension,
                     sanitized, "Public Site", site, is_private=0)
    profile = frappe.get_doc("Brand Profile", doc.brand_profile)
    profile.set(kind, file.file_url)
    profile.save()
    doc.save()
    return setup.state(doc)


def validate_profile(profile):
    """Raw document updates must obey the same file boundary as guided uploads."""
    for kind in FIELDS:
        value = profile.get(kind)
        if value and not isinstance(value, str):
            frappe.throw("Choose a valid local identity image.")
        if not value or not value.startswith("/files/"):
            continue
        sites = frappe.get_all("Public Site", filters={"brand_profile": profile.name,
                                  "owner_type": profile.owner_type, "organization": profile.organization,
                                  "provider": profile.provider}, pluck="name", limit=2)
        if len(sites) != 1:
            frappe.throw("Identity uploads require exactly one website for this brand.")
        validate_image_asset(value, sites[0])
