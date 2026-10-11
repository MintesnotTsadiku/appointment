import frappe
from frappe import _
from frappe.model.document import Document

from appointment.growth import cache
from appointment.growth.settings import NUMBERS


class GrowthSettings(Document):
    def validate(self):
        for field in NUMBERS:
            if (self.get(field) or 0) < 0:
                frappe.throw(_("{0} cannot be negative.").format(_(self.meta.get_label(field))))
        if (self.customer_referral_default_percent or 0) > 100:
            frappe.throw(_("The customer discount cannot be more than 100%."))
        if self.marketing_live_minutes is not None and self.marketing_live_minutes < 1:
            frappe.throw(_("The live numbers refresh time must be at least 1 minute."))
        for field in ("share_message_en", "share_message_am"):
            text = (self.get(field) or "").strip()
            if text and "{link}" not in text:
                frappe.throw(_("{0} must contain the {1} placeholder.").format(_(self.meta.get_label(field)), "{link}"))

    def on_update(self):
        cache.clear(self.doctype)
