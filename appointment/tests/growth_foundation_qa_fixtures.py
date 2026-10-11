"""QA fixtures for the Brand & growth page (qa/manifests/growth/foundation-brand*.yaml).

`setup` records the current brand and growth values; `cleanup` saves them back through the
document lifecycle, so the site ends as it started even when a browser run stops half-way.
`browser_values` adds the saved product name to the showcase values, so manifests can
restore it without a brand literal.
"""

import json

import frappe

from appointment.demo import showcase

STATE_KEY = "appointment_growth_foundation_qa"
DOCTYPES = ("Platform Brand Settings", "Growth Settings")


def _snapshot() -> dict:
    snapshot = {}
    for doctype in DOCTYPES:
        doc = frappe.get_single(doctype)
        fields = [f.fieldname for f in doc.meta.fields if f.fieldtype not in frappe.model.no_value_fields]
        snapshot[doctype] = {field: doc.get(field) for field in fields}
    return snapshot


def setup():
    frappe.set_user("Administrator")
    if not frappe.db.get_default(STATE_KEY):
        frappe.db.set_default(STATE_KEY, json.dumps(_snapshot(), default=str))
    frappe.db.commit()


def cleanup():
    frappe.set_user("Administrator")
    saved = json.loads(frappe.db.get_default(STATE_KEY) or "null")
    if saved:
        for doctype, values in saved.items():
            doc = frappe.get_single(doctype)
            if any(doc.get(field) != value for field, value in values.items()):
                doc.update(values)
                doc.save()
        frappe.db.set_default(STATE_KEY, "")
    frappe.db.commit()


def browser_values(manifest=None):
    saved = json.loads(frappe.db.get_default(STATE_KEY) or "null") or _snapshot()
    name = saved["Platform Brand Settings"]["product_name"]
    return showcase.browser_values(manifest) | {
        "qa_brand_product_name": name,
        "qa_brand_test_name": f"{name} QA",
    }
