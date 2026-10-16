"""QA fixtures for the show-off growth manifests (`qa/manifests/growth/showoff-*.yaml`).

- Lists two showcase businesses in the directory (Tena Family Clinic as a clinic in
  Yeka, Abugida Language Studio as tutoring in Arada) so a guest can browse
  `/directory` -> category -> area -> booking page.
- Remembers whether Bole Bloom Hair Studio already had a Directory Listing and turns a
  listed one off (the showcase seeder lists it), so the owner scenario can opt Bloom in
  from the Grow page.

`cleanup` removes only the listings this fixture created (by name) and returns Bloom's
listing to how it was before `setup`. Showcase records are never changed.
"""

import json

import frappe

from appointment.demo import showcase
from appointment.growth import directory

STATE_KEY = "appointment_growth_showoff_qa"
BLOOM = "Bole Bloom Hair Studio"
LISTINGS = (("Tena Family Clinic", "clinic", "yeka"), ("Abugida Language Studio", "tutoring", "arada"))
FIELDS = ("listed", "category", "area", "listed_at")


def setup():
    frappe.set_user("Administrator")
    cleanup()
    directory.ensure_defaults()
    created = []
    for organization, category, area in LISTINGS:
        if not frappe.db.exists("Organization", organization) or frappe.db.exists("Directory Listing", {"owner_key": organization}):
            continue
        doc = frappe.get_doc(dict(doctype="Directory Listing", owner_key=organization, owner_type="Organization",
                                  organization=organization, listed=1, category=category, area=area))
        doc.insert(ignore_permissions=True)
        created.append(doc.name)
    bloom = frappe.db.get_value("Directory Listing", {"owner_key": BLOOM}, ["name", *FIELDS], as_dict=True)
    frappe.db.set_default(STATE_KEY, json.dumps({"created": created, "bloom": bloom}, default=str))
    if bloom and bloom.listed:
        doc = frappe.get_doc("Directory Listing", bloom.name)
        doc.listed = 0
        doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"created": created}


def cleanup():
    frappe.set_user("Administrator")
    state = json.loads(frappe.db.get_default(STATE_KEY) or "{}")
    for name in state.get("created") or []:
        if name and frappe.db.exists("Directory Listing", name):
            frappe.delete_doc("Directory Listing", name, ignore_permissions=True, force=True)
    if "bloom" in state:
        before = state["bloom"]
        current = frappe.db.get_value("Directory Listing", {"owner_key": BLOOM}, "name")
        if before and current == before.get("name"):
            doc = frappe.get_doc("Directory Listing", current)
            doc.update({field: before.get(field) for field in FIELDS})
            doc.save(ignore_permissions=True)
        elif not before and current:
            frappe.delete_doc("Directory Listing", current, ignore_permissions=True, force=True)
    frappe.db.set_default(STATE_KEY, "")
    frappe.db.commit()


def browser_values(manifest=None):
    values = showcase.browser_values(manifest)
    values["qa_showoff_bloom_slug"] = frappe.db.get_value("Organization", BLOOM, "slug") or "bloom-studio"
    values["qa_showoff_tena_slug"] = frappe.db.get_value("Organization", "Tena Family Clinic", "slug") or "tena-studio"
    # The showcase bookings fall in the current calendar year.
    values["qa_showoff_period"] = f"gc-{frappe.utils.getdate().year}-so-far"
    return values
