"""Phase 8/deployment tests: DNS expectations and Nginx edge rendering.

Runs via
``bench --site <site> execute appointment.tests.test_public_deployment.run``.
"""

import sys
import unittest

import frappe

from appointment.public_experience.dns import expected_records, verification_value, verify
from appointment.public_experience.edge import (
    DomainRoute,
    EdgeOptions,
    FakeEdgeAdapter,
    NginxSelfManagedAdapter,
    render_config,
)

MARKER = "PD8-"


class TestDns(unittest.TestCase):
    def test_expected_records_for_subdomain_and_apex(self):
        sub = expected_records("clinic.example.com", "tok123", "app.example.net", "Custom Subdomain")
        kinds = {record.record_type for record in sub}
        self.assertEqual(kinds, {"TXT", "CNAME"})
        self.assertIn(verification_value("tok123"), [record.value for record in sub])

        apex = expected_records("example.com", "tok123", "203.0.113.10", "Custom Apex")
        self.assertEqual({record.record_type for record in apex}, {"TXT", "A"})

    def test_verify_matches_and_mismatches(self):
        expected = expected_records("clinic.example.com", "tok123", "app.example.net")
        observed = {
            ("TXT", "_appointment-verify.clinic.example.com"): ["appointment-site-verification=tok123"],
            ("CNAME", "clinic.example.com"): ["app.example.net."],
        }
        result = verify(observed, expected)
        self.assertTrue(result["ok"], result)

        bad = verify({("TXT", "_appointment-verify.clinic.example.com"): ["nope"]}, expected)
        self.assertFalse(bad["ok"])


class TestEdgeRendering(unittest.TestCase):
    def test_render_config_contains_routing_and_headers(self):
        options = EdgeOptions(
            frappe_site="meet.example.localhost", web_port=8000, socketio_port=9000, target_host="app.example.net"
        )
        routes = [DomainRoute("clinic.example.com", "Custom Subdomain", True)]
        config = render_config(routes, options)
        self.assertIn("server_name app.example.net;", config)
        self.assertIn("server_name clinic.example.com;", config)
        self.assertIn("X-Frappe-Site-Name $frappe_site", config)
        self.assertIn("proxy_set_header Upgrade $http_upgrade;", config)
        self.assertIn("location /socket.io/", config)
        self.assertIn("/assets/", config)
        custom = config.split("server_name clinic.example.com;", 1)[1]
        self.assertIn("location = /api/method/appointment.public_experience.api.get_public_ui_config", custom)
        self.assertIn("location = /api/method/appointment.public_experience.api.get_public_experience_snapshot", custom)
        self.assertIn("location ~ ^/(app|login|logout|api|private|desk)(/|$) { return 404; }", custom)
        self.assertIn("location /socket.io/ {", custom)
        files_block = custom.split("location /files/ {", 1)[1].split("}", 1)[0]
        self.assertNotIn("alias", files_block)
        self.assertIn("proxy_pass", files_block)

    def test_tls_block_when_enabled(self):
        options = EdgeOptions(frappe_site="s", target_host="app.example.net", tls=True)
        config = render_config([], options)
        self.assertIn("ssl_certificate /etc/letsencrypt/live/app.example.net/fullchain.pem;", config)
        self.assertIn("Strict-Transport-Security", config)

    def test_fake_and_self_managed_adapters(self):
        fake = FakeEdgeAdapter(routes=[DomainRoute("clinic.example.com", "Custom Subdomain", False)])
        result = fake.reconcile()
        self.assertEqual(result["domains"], ["clinic.example.com"])
        self.assertIn("clinic.example.com", result["config"])

        adapter = NginxSelfManagedAdapter()
        self.assertIsInstance(adapter.options(), EdgeOptions)
        self.assertIsInstance(adapter.active_routes(), list)


class TestDeploymentApi(unittest.TestCase):
    def test_edge_config_preview_requires_system_manager(self):
        from appointment.public_experience import api

        frappe.set_user("Administrator")
        preview = api.edge_config_preview()
        self.assertIn("config", preview)

    def test_domain_dns_instructions_shape(self):
        from appointment.public_experience import api

        frappe.set_user("Administrator")
        # A domain for a site the admin owns; create a minimal one.
        owner = "Administrator"
        org = f"{MARKER}org"
        if not frappe.db.exists("Organization", org):
            frappe.get_doc(
                {
                    "doctype": "Organization",
                    "organization_name": org,
                    "organization_type": "Other",
                    "owner_user": owner,
                }
            ).insert(ignore_permissions=True)
        site = frappe.get_doc(
            {
                "doctype": "Public Site",
                "site_title": f"{MARKER}site",
                "slug": f"{MARKER}site".lower(),
                "owner_type": "Organization",
                "organization": org,
                "recipe_key": "tena-clinic",
                "recipe_version": 1,
                "content_schema_version": 2,
            }
        ).insert(ignore_permissions=True)
        domain = frappe.get_doc(
            {
                "doctype": "Public Site Domain",
                "public_site": site.name,
                "hostname_display": "pd8-clinic.example.com",
                "domain_type": "Custom Subdomain",
            }
        ).insert(ignore_permissions=True)
        try:
            instructions = api.domain_dns_instructions(domain=domain.name)
            self.assertEqual(instructions["hostname"], "pd8-clinic.example.com")
            self.assertTrue(any(record["type"] == "TXT" for record in instructions["records"]))
            self.assertTrue(any(record["type"] == "CNAME" for record in instructions["records"]))
        finally:
            frappe.delete_doc("Public Site Domain", domain.name, force=True, ignore_permissions=True)
            frappe.delete_doc("Public Site", site.name, force=True, ignore_permissions=True)
            frappe.delete_doc("Organization", org, force=True, ignore_permissions=True)
            frappe.db.commit()


def run():
    frappe.set_user("Administrator")
    suite = unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__])
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        raise AssertionError("Public deployment tests failed")
    return {"passed": True, "tests": result.testsRun}
