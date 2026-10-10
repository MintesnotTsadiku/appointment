"""Readiness checks for SMS, payments, the scheduler, translations and data."""

import ast
import os
from pathlib import Path

import frappe

from appointment.ops.checks import FAIL, PASS, WARN, check

QA_MARKER = "QA-BROWSER"
DEMO_JOURNAL = "rich-demo-v1.json"


class Sms:
    area = "SMS"

    def run(self):
        from appointment.scheduler import notification_sms

        users = self.businesses()
        gateway, token = notification_sms.available(), self.token_set()
        if not users:
            state = "set" if gateway else "not set"
            return [check(self.area, "sms_gateway", PASS, f"No business turned SMS on yet. The gateway is {state}.")]
        rows = [check(self.area, "sms_gateway", PASS, f"{users} business(es) use SMS. The gateway URL is set.")]
        if not gateway:
            rows = [check(self.area, "sms_gateway", FAIL, f"{users} business(es) turned SMS on, but SMS Settings has no gateway URL.",
                          "Set the AfroMessage gateway in SMS Settings.")]
        if token:
            rows.append(check(self.area, "sms_token", PASS, "The AfroMessage token is set."))
        else:
            rows.append(check(self.area, "sms_token", FAIL, "The AfroMessage token is not set.",
                              "bench --site <site> set-config afromessage_token <token>"))
        return rows

    def businesses(self):
        return frappe.db.count("Customer Notification Settings", {"sms_enabled": 1})

    def token_set(self):
        """The token is in site config, or in an Authorization header row of SMS Settings."""
        if frappe.conf.get("afromessage_token"):
            return True
        rows = frappe.get_all("SMS Parameter", filters={"parenttype": "SMS Settings", "header": 1},
                              fields=["parameter", "value"])
        return any(row.parameter.lower() == "authorization" and row.value for row in rows)


class Payments:
    area = "Payments"

    def run(self):
        return self.chapa() + [self.platform_details()]

    def chapa(self):
        from appointment.scheduler import payments

        businesses = self.businesses()
        if not businesses:
            return [check(self.area, "chapa_keys", PASS, "No business collects online payments yet. Chapa keys are not needed yet.")]
        missing_key, missing_secret = [], []
        for organization in businesses:
            who = payments.collector(organization)
            # Password fields hold a mask when set. The value itself is never read.
            settings = payments.platform() if who == "Platform" else payments.business(organization)
            if not settings.get("chapa_secret_key"):
                missing_key.append(f"{organization} ({who})")
            if not settings.get("chapa_webhook_secret"):
                missing_secret.append(f"{organization} ({who})")
        return [
            self.chapa_row("chapa_keys", "Chapa secret key", missing_key, len(businesses)),
            self.chapa_row("chapa_webhook_secret", "Chapa webhook secret", missing_secret, len(businesses)),
        ]

    def businesses(self):
        return frappe.get_all("Business Payment Settings", filters={"accept_chapa": 1}, pluck="name")

    def chapa_row(self, key, label, missing, total):
        if not missing:
            return check(self.area, key, PASS, f"The {label} is set for all {total} business(es) that accept Chapa.")
        return check(self.area, key, FAIL, f"The {label} is not set for: {', '.join(missing)}.",
                     "Enter it in Payment Settings (platform) or at /settings/payments (business).")

    def platform_details(self):
        settings = frappe.get_cached_doc("Payment Settings")
        missing = [label for field, label in (("legal_name", "legal name"), ("receipt_prefix", "receipt prefix"), ("tin", "TIN"))
                   if not settings.get(field)]
        if not missing:
            return check(self.area, "platform_receipt_details", PASS, "Payment Settings has the legal name, receipt prefix and TIN.")
        return check(self.area, "platform_receipt_details", WARN,
                     f"Payment Settings has no {', '.join(missing)}. Platform receipts fall back to the site name.",
                     "Fill them in Payment Settings before the platform collects a payment.")


class Scheduler:
    area = "Scheduler"

    def run(self):
        return [self.enabled(), self.process(), self.jobs()]

    def enabled(self):
        from frappe.utils.scheduler import is_scheduler_inactive

        if not is_scheduler_inactive(verbose=False):
            return check(self.area, "scheduler_enabled", PASS, "The scheduler is enabled.")
        return check(self.area, "scheduler_enabled", FAIL, "The scheduler is inactive.",
                     "bench --site <site> scheduler enable, and remove pause_scheduler.")

    def process(self):
        from frappe.utils.scheduler import is_scheduler_process_running

        try:
            running = is_scheduler_process_running()
        except Exception:
            running = False
        if running:
            return check(self.area, "scheduler_process", PASS, "The scheduler process sends a heartbeat.")
        return check(self.area, "scheduler_process", WARN,
                     "No scheduler heartbeat was found in the queue Redis for this bench_id.",
                     "Start the bench schedule process (systemd or supervisor).")

    def jobs(self):
        expected = hooked_methods()
        rows = frappe.get_all("Scheduled Job Type", filters={"method": ["in", list(expected)]}, fields=["method", "stopped"])
        found = {row.method: row.stopped for row in rows}
        missing = sorted(expected - set(found))
        stopped = sorted(method for method, flag in found.items() if flag)
        if not missing and not stopped:
            return check(self.area, "scheduled_jobs", PASS, f"All {len(expected)} app scheduled jobs exist and run.")
        parts = [f"missing: {', '.join(missing)}" if missing else "", f"stopped: {', '.join(stopped)}" if stopped else ""]
        return check(self.area, "scheduled_jobs", FAIL, "Scheduled jobs " + "; ".join(p for p in parts if p) + ".",
                     "bench --site <site> migrate. If a job is still missing, check hooks.py for a duplicate key.")


class Translations:
    area = "Translations"
    key = "amharic_catalog"

    def run(self):
        from appointment.scheduler.translation import _app_english_sources

        sources = _app_english_sources()
        if not sources:
            return [check(self.area, self.key, WARN, "The en.json catalog was not found.",
                          "Deploy the full app repository, including frontend/src/lib/i18n.")]
        done = set(frappe.get_all("Translation", filters={"language": "am"}, pluck="source_text", limit_page_length=0))
        covered = len(sources & done)
        detail = f"Amharic covers {covered} of {len(sources)} catalog strings."
        if covered == len(sources):
            return [check(self.area, self.key, PASS, detail)]
        status = FAIL if not covered else WARN
        return [check(self.area, self.key, status, detail, "bench --site <site> migrate imports the reviewed Amharic catalog.")]


class Data:
    area = "Data"

    def run(self):
        return [self.showcase(), self.qa(), self.system_managers()]

    def showcase(self):
        if os.path.exists(frappe.get_site_path("private", DEMO_JOURNAL)):
            return check(self.area, "showcase_data", WARN, "The rich showcase journal exists. Showcase businesses are on this site.",
                         "Launch on a clean site. Do not copy a showcase site to production.")
        return check(self.area, "showcase_data", PASS, "No showcase journal was found.")

    def qa(self):
        counts = {
            "QA organizations": frappe.db.count("Organization", {"organization_name": ["like", f"{QA_MARKER}-%"]}),
            "QA users": frappe.db.count("User", {"name": ["like", "%@qa.local"]}),
            "test users": frappe.db.count("User", {"name": ["like", "%@example.com"]}),
        }
        found = {label: count for label, count in counts.items() if count}
        if not found:
            return check(self.area, "qa_data", PASS, "No QA or test records were found.")
        detail = ", ".join(f"{count} {label}" for label, count in found.items())
        return check(self.area, "qa_data", WARN, f"QA or test records are present: {detail}.",
                     "Launch on a clean site, or remove these records through their teardown commands.")

    def system_managers(self):
        users = frappe.get_all("Has Role", filters={"role": "System Manager", "parenttype": "User",
                                                    "parent": ["not in", ["Administrator", "Guest"]]}, pluck="parent")
        enabled = frappe.db.count("User", {"name": ["in", users or [""]], "enabled": 1})
        if enabled:
            return check(self.area, "system_managers", PASS, f"{enabled} enabled System Manager(s) besides Administrator.")
        return check(self.area, "system_managers", FAIL, "Only Administrator is a System Manager.",
                     "Create a named System Manager account for the platform operator.")


def hooked_methods():
    """Every method in hooks.py scheduler_events, read from the source.

    A literal dict with a repeated key, such as two "cron" entries, keeps only
    the last one at import time. Reading the source finds the lost jobs too.
    """
    source = Path(frappe.get_app_path("appointment", "hooks.py")).read_text(encoding="utf-8")
    for node in ast.parse(source).body:
        if isinstance(node, ast.Assign) and any(getattr(t, "id", "") == "scheduler_events" for t in node.targets):
            # Cron expressions and frequency names have no dot; method paths do.
            return {leaf.value for leaf in ast.walk(node.value)
                    if isinstance(leaf, ast.Constant) and isinstance(leaf.value, str) and "." in leaf.value}
    return set()
