"""Keep published media available throughout publication history."""

import json

import frappe
from frappe import _


class WebsiteFile:
    def validate(self):
        validate(self)
        super().validate()

    def on_trash(self):
        on_trash(self)
        super().on_trash()


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
    return value == url
