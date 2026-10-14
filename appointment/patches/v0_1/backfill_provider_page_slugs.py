"""Give each independent provider with services a provider page address (`Provider.public_slug`).

A provider with an active Public Site adopts the site slug, so its two addresses stay one. Others get an
address made from their name (`provider_page.generate_slug`). Providers that already have an address are
left as they are, so the patch is safe to run again. See docs/growth/PROVIDER_PAGE.md.
"""

import frappe

BATCH = 100


def execute():
    from appointment.scheduler.provider_page import generate_slug
    from appointment.growth.short_links import problem

    providers = set(frappe.get_all("Service", filters={"independent_provider": ["is", "set"]}, pluck="independent_provider"))
    rows = frappe.get_all("Provider", filters={"name": ["in", list(providers) or [""]], "organization": ["is", "not set"]},
                          fields=["name", "provider_name", "public_slug"], order_by="creation asc")
    done = 0
    for row in rows:
        if row.public_slug or frappe.db.exists("Provider Organization", {"parent": row.name, "parenttype": "Provider"}):
            continue
        site = frappe.db.get_value("Public Site", {"owner_type": "Provider", "provider": row.name, "status": ["!=", "Archived"]}, "slug")
        slug = site if site and not problem(site, None, provider=row.name) else generate_slug(row.provider_name or row.name, row.name)
        frappe.db.set_value("Provider", row.name, "public_slug", slug, update_modified=False)
        done += 1
        if done % BATCH == 0:
            frappe.db.commit()  # nosemgrep: long backfills keep their progress
    frappe.db.commit()  # nosemgrep
    print(f"Provider page addresses: {done} set, {len(rows) - done} unchanged or not independent.")
