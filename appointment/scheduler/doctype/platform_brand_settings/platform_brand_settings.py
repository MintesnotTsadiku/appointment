import re
from urllib.parse import urlparse

import frappe
from frappe import _
from frappe.model.document import Document

from appointment.growth import cache

HEX_COLOUR = re.compile(r"^#[0-9a-fA-F]{6}$")


class PlatformBrandSettings(Document):
    def validate(self):
        self.product_name = (self.product_name or "").strip()
        if not self.product_name:
            frappe.throw(_("Enter the product name."))
        for field in ("product_url", "telegram_url"):
            value = (self.get(field) or "").strip()
            if value and urlparse(value).scheme not in ("http", "https"):
                frappe.throw(_("{0} must start with https:// or http://.").format(_(self.meta.get_label(field))))
            self.set(field, value.rstrip("/") if field == "product_url" else value)
        host = (self.short_host or "").strip().lower()
        host = re.sub(r"^https?://", "", host).strip("/")
        if host and not re.fullmatch(r"[a-z0-9.-]+(:\d+)?", host):
            frappe.throw(_("Short host must be a host name such as example.com, without a path."))
        self.short_host = host
        if self.primary_color and not HEX_COLOUR.match(self.primary_color):
            frappe.throw(_("Primary colour must be a hex colour such as #A23B72."))

    def on_update(self):
        cache.clear(self.doctype)
