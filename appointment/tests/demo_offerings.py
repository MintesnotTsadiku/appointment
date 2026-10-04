"""Bloom demo offerings by what they are, not by record name.

Record names depend on seeding order, so a freshly seeded site numbers them
differently. Tests and QA fixtures look offerings up here; an unseeded site
gets None and the tests skip.
"""

import frappe

BLOOM_OWNER = "bloom.owner@example.test"


def bloom_offering(service_name, provider_name, location_name):
    organization = frappe.db.get_value("Organization", {"owner_user": BLOOM_OWNER}, "name")
    if not organization:
        return None
    rows = frappe.db.sql(
        """select e.name from `tabEventType` e
        join `tabService` s on s.name = e.service
        join `tabProvider` p on p.name = e.provider
        join `tabLocation` l on l.name = e.location
        where s.organization = %s and s.service_name = %s and p.display_name = %s and l.location_name = %s
        order by e.creation limit 1""",
        (organization, service_name, provider_name, location_name),
    )
    return rows[0][0] if rows else None


def wash_hanna():
    return bloom_offering("Wash and finish", "Hanna Tesfaye", "Bole main studio")


def cut_hanna():
    return bloom_offering("Cut and shape", "Hanna Tesfaye", "Bole main studio")


def cut_rahel():
    return bloom_offering("Cut and shape", "Rahel Girma", "Bole quiet styling room")


def cut_eden():
    return bloom_offering("Cut and shape", "Eden Tadesse", "Bole main studio")


def scalp_hanna():
    return bloom_offering("Scalp care consultation", "Hanna Tesfaye", "Bole main studio")
