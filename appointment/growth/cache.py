"""One cache entry per settings single, cleared when the single is saved."""

import frappe

KEYS = {
    "Platform Brand Settings": "appointment:growth:platform_brand",
    "Growth Settings": "appointment:growth:growth_settings",
}


def stored(doctype: str) -> dict:
    """The saved field values of a single, language independent."""
    return frappe.cache.get_value(KEYS[doctype], generator=lambda: _read(doctype))


def clear(doctype: str):
    frappe.cache.delete_value(KEYS[doctype])


def _read(doctype: str) -> dict:
    meta = frappe.get_meta(doctype)
    values = frappe.db.get_singles_dict(doctype)
    # A field never saved reads as its DocType default.
    return {
        f.fieldname: values.get(f.fieldname, f.default)
        for f in meta.fields if f.fieldtype not in frappe.model.no_value_fields
    }
