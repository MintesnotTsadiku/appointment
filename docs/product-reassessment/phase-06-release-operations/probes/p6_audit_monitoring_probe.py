"""Phase 6 read-only audit, monitoring and privacy probe.

No writes. Reports what operators can detect and what accountability artifacts
exist. Exports only aggregate counts and error method/title labels, never PII.
"""

import json

import frappe

SITE = "meet-beta-fix-appointment-beta-readiness-01dea7.localhost"

BUSINESS_DOCTYPES = [
    "Appointment",
    "Organization",
    "Provider",
    "Service",
    "Location",
    "EventType",
    "Walk In",
    "Booking Event",
    "User Appointment Availability",
    "Policy",
    "Appointment Group",
]


def safe(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except Exception as exc:  # noqa: BLE001
        return "ERR: %s" % exc


def main():
    frappe.init(site=SITE)
    frappe.connect()

    out = {}

    # Audit history artifacts
    version_counts = {}
    for dt in BUSINESS_DOCTYPES:
        version_counts[dt] = safe(
            lambda dt=dt: frappe.db.count("Version", {"ref_doctype": dt})
        )
    out["version_counts_by_doctype"] = version_counts
    out["total_version_rows"] = safe(lambda: frappe.db.count("Version"))

    # Error log discoverability (labels only, no PII)
    out["error_log_methods"] = safe(
        lambda: frappe.db.sql(
            "select ifnull(method, '(none)') as method, count(*) as n "
            "from `tabError Log` group by method order by n desc limit 25",
            as_dict=True,
        )
    )
    out["error_log_oldest_newest"] = safe(
        lambda: frappe.db.sql(
            "select min(creation) as oldest, max(creation) as newest from `tabError Log`",
            as_dict=True,
        )
    )

    # Privacy / consent / deletion framework presence
    out["personal_data_deletion_request_exists"] = safe(
        lambda: frappe.db.exists("DocType", "Personal Data Deletion Request")
    )
    out["personal_data_deletion_request_count"] = safe(
        lambda: frappe.db.count("Personal Data Deletion Request")
    )
    out["consent_doctype_exists"] = safe(lambda: frappe.db.exists("DocType", "Consent"))
    out["data_export_doctype_exists"] = safe(lambda: frappe.db.exists("DocType", "Data Export"))
    out["privacy_settings_exists"] = safe(lambda: frappe.db.exists("DocType", "Privacy Settings"))

    # Notification / email template inventory (configuration presence)
    out["email_template_count"] = safe(lambda: frappe.db.count("Email Template"))
    out["notification_count"] = safe(lambda: frappe.db.count("Notification"))
    out["notification_log_count"] = safe(lambda: frappe.db.count("Notification Log"))
    out["appointment_settings_email_fields"] = safe(
        lambda: [
            f.fieldname
            for f in frappe.get_meta("Appointment Settings").fields
            if "email" in (f.fieldname or "") or "template" in (f.fieldname or "")
        ]
    )

    # Public web forms and guest-reachable surfaces
    out["web_forms"] = safe(
        lambda: frappe.db.sql(
            "select name, route, is_standard, login_required, allow_multiple from `tabWeb Form`",
            as_dict=True,
        )
    )

    # Roles available (support boundary question)
    out["roles"] = safe(
        lambda: frappe.db.sql("select name from `tabRole` order by name", as_list=True)
    )

    # Appointment field inventory relevant to contact/privacy
    apt_fields = safe(lambda: [f.fieldname for f in frappe.get_meta("Appointment").fields])
    out["appointment_fields"] = apt_fields

    # Booking Event status field options
    out["booking_event_status_options"] = safe(
        lambda: frappe.get_meta("Booking Event").get_field("status").options
        if frappe.get_meta("Booking Event").get_field("status")
        else None
    )

    # Check whether outgoing email is even possible
    out["default_outgoing_account"] = safe(
        lambda: frappe.get_doc(
            "Email Account", frappe.get_all("Email Account", limit=1)[0].name
        ).name
        if frappe.db.count("Email Account")
        else None
    )

    print(json.dumps(out, indent=2, default=str))
    frappe.destroy()


if __name__ == "__main__":
    main()
