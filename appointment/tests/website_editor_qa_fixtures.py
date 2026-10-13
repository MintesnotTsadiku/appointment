"""QA fixture for the website section editor (`qa/manifests/growth/website-editor*.yaml`).

The runs edit the Ergata showcase of `template_ergata_qa_fixtures` (Yared Tesfaye Counselling, `/yared-counselling`).
`browser_values()` makes sure the showcase exists, then keeps a copy of its section content. `restore()` writes
that copy back and publishes it again, so the public page is the showcase again. Nothing is deleted: the photos
that a run uploads stay in the site's media library, because a published release refers to them.

Run order: the manifest runs (each call of `browser_values` first restores a copy left by an earlier run), then
`bench --site <site> execute appointment.tests.website_editor_qa_fixtures.restore`.
"""

import json
from pathlib import Path

import frappe

from appointment.tests import template_ergata_qa_fixtures as showcase

COPY_KEY = "appointment_website_editor_qa_copy"
UPLOAD = "public/brand-experience/support/ergata/window.webp"


def browser_values(manifest=None):
    frappe.set_user("Administrator")
    site = _showcase_site()
    restore()
    _keep_copy(site)
    values = showcase.browser_values(manifest)
    values.update({"qa_editor_site": site, "qa_editor_upload": str(Path(frappe.get_app_path("appointment")) / UPLOAD)})
    return values


def restore():
    """Write the kept copy back to the showcase draft and publish it as the owner. Does nothing without a copy."""
    copy = json.loads(frappe.db.get_default(COPY_KEY) or "{}")
    if not copy.get("site") or not frappe.db.exists("Public Site", copy["site"]):
        return {"restored": False}
    frappe.set_user("Administrator")
    doc = frappe.get_doc("Public Site", copy["site"])
    doc.set("sections", [])
    for index, (kind, content_json) in enumerate(copy["sections"]):
        doc.append("sections", {"section_id": kind, "section_type": kind, "enabled": 1, "order_index": index,
                                "schema_version": 2, "content_json": content_json})
    doc.website_setup_json = copy["setup"]
    doc.save(ignore_permissions=True)
    from appointment.public_experience import setup

    frappe.set_user(showcase.SOLO)
    try:
        setup.publish(doc.name, frappe.db.get_value("Public Site", doc.name, "draft_version"))
    finally:
        frappe.set_user("Administrator")
    frappe.db.set_default(COPY_KEY, "")
    frappe.db.commit()
    return {"restored": True, "site": doc.name}


def _showcase_site():
    site = frappe.db.get_value("Public Site", {"slug": showcase.SLUG, "status": ["!=", "Archived"]}, "name")
    if not site:
        showcase.setup()
        site = frappe.db.get_value("Public Site", {"slug": showcase.SLUG, "status": ["!=", "Archived"]}, "name")
    return site


def _keep_copy(site):
    doc = frappe.get_doc("Public Site", site)
    rows = sorted(doc.sections, key=lambda row: row.order_index or 0)
    frappe.db.set_default(COPY_KEY, json.dumps({"site": site, "setup": doc.website_setup_json or "{}",
                                                "sections": [[row.section_type, row.content_json] for row in rows]}))
    frappe.db.commit()
