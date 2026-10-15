"""QA fixtures for the Amharic names of the showcases (`qa/manifests/growth/amharic-names*.yaml`).

The pages are the seeded showcases (`appointment.demo.showcase.seed`) and the provider page of the
provider-page fixture. The fixture makes no records. The owner scenario changes one Amharic name in
Settings › Business and changes it back; `restore()` writes the seeded Amharic names again on the
seeder's own records (by exact name from the journal), in case a run stopped half way. One scenario
books as a guest with the Bloom QA client, so run `template_bloom_v3_qa_fixtures.setup` before and
its `cleanup` after.
"""

from datetime import datetime, timedelta

import frappe
import pytz

from appointment.demo import showcase


def setup():
    frappe.set_user("Administrator")
    restore()
    return browser_values()


def browser_values(manifest=None):
    from appointment.tests import template_bloom_v3_qa_fixtures

    values = showcase.browser_values(manifest) if showcase.state_path().exists() else {}
    values.update(template_bloom_v3_qa_fixtures.browser_values(manifest))  # the Bloom QA client books once
    for key, _title, _owner, _category, _copy, _hours, closed, *_rest in showcase.BUSINESSES:
        values[f"qa_names_{key}_open_day"] = _open_day(closed)
    return values


def restore():
    """The seeded Amharic names of every showcase business and its providers."""
    frappe.set_user("Administrator")
    if not showcase.state_path().exists():
        return {"restored": 0}
    journal = showcase.load_state()
    owned = {tuple(entry) for entry in journal["created"]}
    restored = 0
    for key, business in journal["businesses"].items():
        organization = business["organization"]
        if ("Organization", organization) not in owned:
            continue
        frappe.db.set_value("Organization", organization, "organization_name_am", showcase.BUSINESS_NAMES_AM[key])
        restored += 1
        for provider in business["providers"]:
            name = frappe.db.get_value("Provider", provider, "display_name")
            if ("Provider", provider) in owned and name in showcase.AMHARIC_NAMES:
                frappe.db.set_value("Provider", provider, "display_name_am", showcase.AMHARIC_NAMES[name])
                restored += 1
    frappe.db.commit()
    return {"restored": restored}


def _open_day(closed):
    """The next day the business opens, from tomorrow in Addis Ababa."""
    day = datetime.now(pytz.timezone("Africa/Addis_Ababa")).date() + timedelta(days=1)
    while day.strftime("%A") in closed:
        day += timedelta(days=1)
    return str(day)
