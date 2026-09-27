"""Keep published media available throughout publication history."""

import json
from contextlib import contextmanager

import frappe
from frappe import _

from appointment.content.sanitize import image_sources


class WebsiteFile:
    def before_insert(self):
        if (self.attached_to_doctype == "Public Site" and frappe.session.user != "Administrator"
                and (not self.attached_to_name
                     or frappe.flags.appointment_website_image_upload_site != self.attached_to_name)):
            frappe.throw(_("Use the website image upload controls and confirm public display consent."),
                         frappe.PermissionError)
        super().before_insert()

    def validate(self):
        validate(self)
        super().validate()

    def on_trash(self):
        on_trash(self)
        super().on_trash()


@contextmanager
def permit_upload(site):
    previous = frappe.flags.appointment_website_image_upload_site
    frappe.flags.appointment_website_image_upload_site = site
    try:
        yield
    finally:
        frappe.flags.appointment_website_image_upload_site = previous


def governed_file(doc):
    if not doc.is_new():
        stored = frappe.db.get_value("File", doc.name,
                                     ["attached_to_doctype", "attached_to_name", "file_url"], as_dict=True)
        if stored and stored.attached_to_doctype == "Public Site":
            return stored
    return doc if doc.attached_to_doctype == "Public Site" else None


def validate(doc, method=None):
    if doc.is_new():
        return
    stored = governed_file(doc)
    if not stored:
        return
    fields = ("attached_to_doctype", "attached_to_name", "file_url", "is_private")
    original = frappe.db.get_value("File", doc.name, list(fields), as_dict=True)
    if original and any(doc.get(field) != original.get(field) for field in fields):
        frappe.throw(_("Website image ownership, address and privacy cannot be changed. Upload a new image instead."))


def on_trash(doc, method=None):
    stored = governed_file(doc)
    if not stored or not stored.file_url:
        return
    for doctype, fields in (("Published Content Release", ["content_json", "media_json"]),
                            ("Experience Release", ["normalized_json"])):
        rows = frappe.get_all(doctype, filters={"public_site": stored.attached_to_name}, fields=fields)
        for row in rows:
            if any(_contains(json.loads(row.get(field) or "null"), stored.file_url) for field in fields):
                frappe.throw(_("This image is part of publication history and cannot be deleted."))


def _contains(value, url):
    if isinstance(value, dict):
        return any(_contains(child, url) for child in value.values())
    if isinstance(value, list):
        return any(_contains(child, url) for child in value)
    if value == url:
        return True
    return isinstance(value, str) and "<img" in value.lower() and url in image_sources(value)
