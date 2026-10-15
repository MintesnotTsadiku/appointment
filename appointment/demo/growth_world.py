"""Growth records of the showcases, restricted to the showcase ownership journal.

Each showcase lists itself in the public business directory, as an owner does in Settings: through
`directory.save_owner_listing`, with the category and area of its address. The listing goes in the
journal, so `retire_businesses` and `cleanup` remove it.

Not seeded, on purpose:
- Business referral codes: the product makes one when the owner first opens the referral page.
- Customer referral offers: an owner opt-in. An active offer makes customer codes on demand, which the
  journal does not own and which would then block cleanup of the showcase customers.
- Signup sources: they record how a real owner signed up; the showcases did not sign up through a link.
- Brand and growth settings: `appointment.growth.seed.ensure_defaults` fills them on install and migrate.
"""

import frappe

VERSION = 1
# key: (Directory Category, Directory Area); both are slugs from `appointment.growth.directory_seed`.
LISTINGS = {
    "selam": ("fitness", "bole"),  # Gerji
    "meron": ("tailoring", "kirkos"),  # Kazanchis
    "bloom": ("salon-barber", "bole"),
    "tena": ("clinic", "yeka"),  # CMC
    "abugida": ("tutoring", "arada"),  # Arat Kilo
    "ergata": ("clinic", "bole"),
}


def configure(state):
    """List the showcases that are not listed yet. Returns True when this version ran."""
    from appointment.demo import showcase
    from appointment.growth import directory

    if (state.get("growth_world") or {}).get("version") == VERSION:
        return False
    if not frappe.db.exists("DocType", "Directory Listing") or not directory.enabled():
        return False  # Runs again on the next seed, once the directory is on.
    owned = {tuple(entry) for entry in state["created"]}
    listed = []
    owners = [(key, business["organization"], business["owner"]) for key, business in state["businesses"].items()]
    owners += [(key, "Provider:" + info["provider"], info["owner"]) for key, info in (state.get("independents") or {}).items()]
    for key, owner_key, user in owners:
        if key not in LISTINGS:
            continue
        existing = frappe.db.get_value("Directory Listing", {"owner_key": owner_key}, "name")
        if existing and ("Directory Listing", existing) not in owned:
            continue  # Never adopt a listing the journal does not own.
        category, area = LISTINGS[key]
        if not (frappe.db.get_value("Directory Category", {"name": category, "enabled": 1})
                and frappe.db.get_value("Directory Area", {"name": area, "enabled": 1})):
            continue  # The administrator removed or turned off this category or area.
        if _list(owner_key, user, category, area):
            showcase.remember(state, "Directory Listing", frappe.db.get_value("Directory Listing", {"owner_key": owner_key}, "name"))
            listed.append(key)
    state["growth_world"] = {"version": VERSION, "listed": listed}
    return True


def _list(owner_key, user, category, area):
    from appointment.growth import directory

    frappe.set_user(user)
    try:
        directory.save_owner_listing(owner_key, 1, category, area)
    finally:
        frappe.set_user("Administrator")
    return True
