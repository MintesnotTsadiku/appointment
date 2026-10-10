"""Go-live readiness report: dev and production-like site config, and no secret in the output.

The tests patch `frappe.local.conf` only. They write nothing to the database.
"""

import json
import unittest
from unittest.mock import patch

import frappe

from appointment.ops import go_live, readiness_services
from appointment.ops.checks import FAIL, PASS, WARN

SECRETS = {
    "encryption_key": "SENTINEL-ENCRYPTION-7f3a",
    "afromessage_token": "SENTINEL-AFROMESSAGE-91c2",
    "db_password": "SENTINEL-DB-PASSWORD-4be8",
}
DEV = {
    "developer_mode": 1, "mute_emails": 1, "pause_scheduler": 1, "rich_demo_enabled": 1,
    "isolated_test_suites": 1, "allow_tests": True, "worktree_development": 1,
    "host_name": "http://127.0.0.1:8000",
}
PRODUCTION = {
    "developer_mode": 0, "mute_emails": 0, "pause_scheduler": 0, "maintenance_mode": 0,
    "host_name": "https://appointments.example.et",
    "brand_public_experience_platform_host": "appointments.example.et",
    "brand_public_experience_platform_hosts": ["appointments.example.et"],
    "brand_public_experience_edge_tls": 1,
    "brand_public_experience_edge_staging_dir": "/srv/edge/staging",
}
DEV_ONLY = ("rich_demo_enabled", "isolated_test_suites", "allow_tests", "worktree_development", "mute_sms")


def production_conf():
    """The site's own conf (database, Redis) with dev keys removed and live values set."""
    conf = {key: value for key, value in frappe.local.conf.items() if key not in DEV_ONLY}
    return {**conf, **PRODUCTION, **SECRETS}


def rows_by_key(result):
    return {row["key"]: row for row in result["checks"]}


class TestGoLiveReport(unittest.TestCase):
    def test_report_shape_and_summary(self):
        result = go_live.report()
        self.assertEqual(result["site"], frappe.local.site)
        self.assertEqual(set(result["summary"]), {PASS, WARN, FAIL})
        self.assertEqual(sum(result["summary"].values()), len(result["checks"]))
        for row in result["checks"]:
            self.assertEqual(set(row), {"area", "key", "status", "detail", "fix"})
            self.assertIn(row["status"], (PASS, WARN, FAIL))
            if row["status"] != PASS:
                self.assertTrue(row["fix"], row["key"])

    def test_every_plan_area_is_checked(self):
        areas = {row["area"] for row in go_live.report()["checks"]}
        self.assertEqual(areas, {"Site config", "Email", "SMS", "Payments", "Scheduler", "Translations", "Build", "Data"})

    def test_report_is_not_whitelisted(self):
        self.assertNotIn(go_live.report, frappe.whitelisted)

    def test_dev_config_fails_site_config_checks(self):
        with patch.dict(frappe.local.conf, DEV):
            rows = rows_by_key(go_live.report())
        for key in ("developer_mode", "mute_emails", "pause_scheduler", "host_name", *DEV_ONLY[:4]):
            self.assertEqual(rows[key]["status"], FAIL, key)
        self.assertEqual(rows["scheduler_enabled"]["status"], FAIL)

    def test_production_config_passes_site_config_checks(self):
        with patch.dict(frappe.local.conf, production_conf(), clear=True):
            result = go_live.report()
        site_rows = [row for row in result["checks"] if row["area"] == "Site config"]
        self.assertTrue(site_rows)
        self.assertEqual([row["key"] for row in site_rows if row["status"] != PASS], [])

    def test_missing_encryption_key_and_hosts_fail(self):
        conf = production_conf()
        for key in ("encryption_key", "brand_public_experience_platform_host", "brand_public_experience_platform_hosts"):
            conf.pop(key)
        with patch.dict(frappe.local.conf, conf, clear=True):
            rows = rows_by_key(go_live.report())
        for key in ("encryption_key", "brand_public_experience_platform_host", "brand_public_experience_platform_hosts"):
            self.assertEqual(rows[key]["status"], FAIL, key)

    def test_no_secret_value_appears_in_output(self):
        for conf in (production_conf(), {**frappe.local.conf, **DEV, **SECRETS}):
            with patch.dict(frappe.local.conf, conf, clear=True), \
                    patch.object(readiness_services.Sms, "businesses", return_value=2), \
                    patch("appointment.scheduler.notification_sms.available", return_value=True):
                output = json.dumps(go_live.report())
            for secret in SECRETS.values():
                self.assertNotIn(secret, output)


class TestServiceChecks(unittest.TestCase):
    def test_sms_not_needed_until_a_business_turns_it_on(self):
        with patch.object(readiness_services.Sms, "businesses", return_value=0):
            rows = readiness_services.Sms().run()
        self.assertEqual([row["status"] for row in rows], [PASS])

    def test_sms_in_use_without_gateway_or_token_fails(self):
        with patch.object(readiness_services.Sms, "businesses", return_value=1), \
                patch.object(readiness_services.Sms, "token_set", return_value=False), \
                patch("appointment.scheduler.notification_sms.available", return_value=False):
            rows = rows_by_key({"checks": readiness_services.Sms().run()})
        self.assertEqual(rows["sms_gateway"]["status"], FAIL)
        self.assertEqual(rows["sms_token"]["status"], FAIL)

    def test_sms_token_from_site_config_passes(self):
        with patch.dict(frappe.local.conf, {"afromessage_token": SECRETS["afromessage_token"]}), \
                patch.object(readiness_services.Sms, "businesses", return_value=1), \
                patch("appointment.scheduler.notification_sms.available", return_value=True):
            rows = readiness_services.Sms().run()
        self.assertEqual([row["status"] for row in rows], [PASS, PASS])
        self.assertNotIn(SECRETS["afromessage_token"], json.dumps(rows))

    def test_chapa_not_needed_until_a_business_accepts_it(self):
        with patch.object(readiness_services.Payments, "businesses", return_value=[]):
            rows = rows_by_key({"checks": readiness_services.Payments().run()})
        self.assertEqual(rows["chapa_keys"]["status"], PASS)
        self.assertIn("not needed yet", rows["chapa_keys"]["detail"])

    def test_chapa_business_without_keys_fails(self):
        with patch.object(readiness_services.Payments, "businesses", return_value=["Readiness Unsaved Business"]), \
                patch("appointment.scheduler.payments.collector", return_value="Business"):
            rows = rows_by_key({"checks": readiness_services.Payments().run()})
        self.assertEqual(rows["chapa_keys"]["status"], FAIL)
        self.assertEqual(rows["chapa_webhook_secret"]["status"], FAIL)

    def test_hooked_methods_include_jobs_lost_to_duplicate_keys(self):
        methods = readiness_services.hooked_methods()
        self.assertIn("appointment.scheduler.payments.process_holds", methods)
        self.assertIn("appointment.content.newsletter.campaigns.run_due", methods)
        self.assertTrue(all("." in method for method in methods))
