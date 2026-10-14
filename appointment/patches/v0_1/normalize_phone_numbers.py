"""Store every saved phone number in E.164 form (+251911223344).

Phone-first booking matches customers by phone, so numbers saved as
"0911 22 33 44" and "+251911223344" must be the same text. The patch reads each
phone field, and writes the E.164 form when the number is valid and different.
Numbers that are not valid stay as they are, and are counted. A Customer
Profile also gets its new phone match key; when another profile of the same
business already has that number, the profile is left as it is and counted as
a conflict, so staff can merge the two.

The patch only writes values that change, so it is safe to run again.
"""

import frappe

from appointment.helpers.phone import normalize_phone

FIELDS = (
    ("Customer Profile", "primary_phone"),
    ("Appointment", "client_phone"),
    ("Walk In", "client_phone"),
    ("Provider", "phone"),
    ("Location", "phone"),
    ("Organization", "phone"),
    ("Growth Partner", "phone"),
    ("Client Profile", "phone"),
)
SINGLES = (("Landing Page Settings", "company_phone"),)


def execute():
    report = run()
    print("Phone numbers:", ", ".join(f"{key} {value}" for key, value in report.items()))
    return report


def run():
    report = dict(checked=0, changed=0, unchanged=0, invalid=0, conflicts=0)
    for doctype, field in FIELDS:
        if not frappe.db.table_exists(doctype) or not frappe.db.has_column(doctype, field):
            continue
        rows = frappe.get_all(doctype, filters={field: ["is", "set"]}, fields=["name", field])
        for row in rows:
            _one(report, doctype, row.name, field, row.get(field))
    for doctype, field in SINGLES:
        if frappe.db.exists("DocType", doctype):
            value = frappe.db.get_single_value(doctype, field)
            if value:
                _one(report, doctype, doctype, field, value)
    return report


def _one(report, doctype, name, field, value):
    report["checked"] += 1
    number = normalize_phone(value)
    if not number:
        report["invalid"] += 1
        return
    if number == value:
        report["unchanged"] += 1
        return
    values = {field: number}
    if doctype == "Customer Profile":
        from appointment.scheduler import business_owner, customer_identity

        profile = frappe.db.get_value(doctype, name, ["organization", "independent_provider"], as_dict=True)
        key = customer_identity.match_key(business_owner.record_key(profile), "phone", number)
        if frappe.db.exists(doctype, {"phone_key": key, "name": ["!=", name]}):
            report["conflicts"] += 1
            return
        values["phone_key"] = key
    frappe.db.set_value(doctype, name, values, update_modified=False)
    report["changed"] += 1
