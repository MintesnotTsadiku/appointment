"""Refresh one existing, seeder-owned independent showcase without visiting its peers."""
import frappe

from appointment.demo import independent_showcase, independent_world, showcase


def refresh(key):
    """Bench maintenance entry point. No creation, cleanup, history or other-world refresh."""
    definition = independent_world.SHOWCASES.get(key)
    if definition is None:
        frappe.throw("Unknown independent showcase.")
    with showcase.locked():
        state = showcase.load_state()
        built = state.get("independents", {}).get(key)
        if not built:
            frappe.throw("The showcase must already be owned by the seeder.")
        _validate_ownership(state, built, definition)
        if built.get("version") == definition.version:
            return {"key": key, "changed": False, "version": definition.version}
        previous = frappe.flags.skip_customer_notification
        frappe.flags.skip_customer_notification = True
        try:
            independent_showcase.refresh(definition, built, lambda dt, name: showcase.remember(state, dt, name))
            built["version"] = definition.version
            showcase.write_state(state)
            frappe.db.commit()
        except Exception:
            frappe.db.rollback()
            raise
        finally:
            frappe.flags.skip_customer_notification = previous
        return {"key": key, "changed": True, "version": definition.version}


def _validate_ownership(state, built, definition):
    owned = {tuple(item) for item in state["created"]}
    targets = [("Provider", built["provider"]), ("Public Site", built["public_site"]),
               ("User", definition.owner_email), *(("Location", name) for name in built["places"].values())]
    for doctype, name in targets:
        if (doctype, name) not in owned or not frappe.db.exists(doctype, name):
            frappe.throw("A required showcase record is missing or not owned by this seeder.")
    if frappe.db.get_value("Public Site", built["public_site"], "slug") != definition.slug:
        frappe.throw("Showcase identity mismatch; refusing to refresh.")
