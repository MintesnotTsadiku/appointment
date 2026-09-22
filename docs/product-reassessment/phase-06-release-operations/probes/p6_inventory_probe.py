"""Phase 6 read-only operational inventory probe.

No writes, no fixtures, no deletes. Reports configuration/source presence for
operational capabilities. Run through the preserved bench env python.
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
    except Exception as exc:  # noqa: BLE001 - report, do not fail the probe
        return "ERR: %s" % exc


def main():
    frappe.init(site=SITE)
    frappe.connect()

    out = {}
    out["frappe_version"] = frappe.__version__
    out["appointment_module_file"] = safe(lambda: frappe.get_module("appointment").__file__)
    out["appointment_version"] = safe(lambda: frappe.get_attr("appointment.__version__"))
    out["installed_apps"] = safe(frappe.get_installed_apps)
    out["db_type"] = safe(lambda: frappe.conf.db_type or "mariadb")
    out["session_user"] = frappe.session.user

    # Operational toggles (values only; no secrets)
    out["conf_mute_emails"] = safe(lambda: frappe.conf.get("mute_emails"))
    out["conf_pause_scheduler"] = safe(lambda: frappe.conf.get("pause_scheduler"))
    out["conf_developer_mode"] = safe(lambda: frappe.conf.get("developer_mode"))
    out["conf_maintenance_mode"] = safe(lambda: frappe.conf.get("maintenance_mode"))
    out["conf_backup_limit"] = safe(lambda: frappe.conf.get("backup_limit"))
    out["system_settings_time_zone"] = safe(
        lambda: frappe.db.get_single_value("System Settings", "time_zone")
    )
    out["system_settings_enable_scheduler"] = safe(
        lambda: frappe.db.get_single_value("System Settings", "enable_scheduler")
    )
    out["scheduler_disabled"] = safe(lambda: frappe.utils.scheduler.is_scheduler_disabled())
    out["scheduler_status"] = safe(lambda: frappe.utils.scheduler.get_scheduler_status())

    # Business data footprint
    out["business_counts"] = {
        dt: safe(lambda dt=dt: frappe.db.count(dt)) for dt in BUSINESS_DOCTYPES
    }

    # Audit configuration
    audit = {}
    for dt in BUSINESS_DOCTYPES:
        meta = safe(lambda dt=dt: frappe.get_meta(dt))
        if isinstance(meta, str):
            audit[dt] = meta
        else:
            audit[dt] = {"track_changes": meta.track_changes}
    out["track_changes"] = audit

    # Framework user data protection / export-delete definitions
    out["user_data_fields_hook"] = safe(lambda: frappe.get_hooks("user_data_fields"))

    # Scheduled jobs and retry/cleanup presence
    out["scheduler_events_hook"] = safe(lambda: frappe.get_hooks("scheduler_events"))
    out["has_permission_hook"] = safe(lambda: frappe.get_hooks("has_permission"))
    out["permission_query_conditions_hook"] = safe(
        lambda: frappe.get_hooks("permission_query_conditions")
    )

    # Communication queue health
    for dt in ["Email Queue", "Email Queue Recipient", "Communication", "Error Log", "Scheduled Job Type", "Scheduled Job Log"]:
        out.setdefault("queue_counts", {})[dt] = safe(lambda dt=dt: frappe.db.count(dt))
    out["email_queue_by_status"] = safe(
        lambda: frappe.db.sql(
            "select status, count(*) from `tabEmail Queue` group by status",
            as_dict=True,
        )
    )
    out["error_log_recent"] = safe(
        lambda: frappe.db.sql(
            "select count(*) from `tabError Log` where creation > date_sub(now(), interval 7 day)",
            as_dict=True,
        )
    )

    # Email account configuration presence (no credentials)
    out["email_account_count"] = safe(lambda: frappe.db.count("Email Account"))
    out["outgoing_email_accounts"] = safe(
        lambda: frappe.db.sql(
            "select name, enable_outgoing, default_outgoing, email_id, service from `tabEmail Account`",
            as_dict=True,
        )
    )

    # Subscription / abuse controls presence
    out["doctype_subscription_exists"] = safe(
        lambda: frappe.db.exists("DocType", "Subscription")
    )
    out["web_form_count"] = safe(lambda: frappe.db.count("Web Form"))
    out["api_key_user_count"] = safe(
        lambda: frappe.db.sql("select count(*) from `tabUser` where api_key is not null", as_dict=True)
    )

    print(json.dumps(out, indent=2, default=str))
    frappe.destroy()


if __name__ == "__main__":
    main()
