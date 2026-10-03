"""Platform administrator payments API: balances, ledger entries, settling, and who collects.

Builds on the Bloom payment fixture from test_payments; every test rolls back.
"""

import frappe

from appointment.scheduler import payments, payments_admin
from appointment.tests import test_payments as base
from appointment.tests.test_customer_notifications import OWNER


class TestPaymentsAdmin(base.TestPayments):
    # Reuses TestPayments helpers; its own tests are not repeated here.
    def run(self, result=None):
        if self._testMethodName.startswith("test_admin_"):
            return super().run(result)
        return None

    def setUp(self):
        super().setUp()
        frappe.set_user("Administrator")
        # Start from the platform defaults whatever a QA run left on the site.
        self._business(collection_override="Platform default", override_platform_fee=0, platform_fee_override=0)

    def _confirmed_payment(self, slot=0):
        _result, _doc, payment = self._paid_booking(slot=slot)
        frappe.set_user(OWNER)
        payments.confirm(payment.name)
        frappe.set_user("Administrator")
        return payment

    def _row(self, overview):
        return next(row for row in overview["businesses"] if row["organization"] == self.org)

    def test_admin_only_system_managers_can_use_it(self):
        frappe.set_user(OWNER)
        for call in (payments_admin.overview, payments_admin.entries):
            with self.assertRaises(frappe.PermissionError):
                call()
        with self.assertRaises(frappe.PermissionError):
            payments_admin.save_business(self.org, collection_override="Platform collects")

    def test_admin_balances_and_entries_show_the_fee_due(self):
        self._platform(platform_fee_type="Fixed", platform_fee_value=40, free_bookings=0, collection_mode="Business collects")
        before = self._row(payments_admin.overview())
        payment = self._confirmed_payment()
        row = self._row(payments_admin.overview())
        self.assertEqual(
            (row["fee_due"] - before["fee_due"], row["payout_due"] - before["payout_due"], row["due_entries"] - before["due_entries"], row["collector"]),
            (40, 0, 1, "Business"),
        )

        listed = payments_admin.entries(organization=self.org, status="Due")["entries"]
        mine = [e for e in listed if e.booking_payment == payment.name]
        self.assertEqual([e.amount for e in mine], [40])
        self.assertTrue(mine[0]["booking_reference"])

    def test_admin_settle_marks_due_entries_and_keeps_a_note(self):
        self._platform(platform_fee_type="Fixed", platform_fee_value=40, free_bookings=0, collection_mode="Business collects")
        payment = self._confirmed_payment()
        before = self._row(payments_admin.overview())["settled"]
        name = frappe.db.get_value("Platform Ledger Entry", {"booking_payment": payment.name}, "name")
        self.assertEqual(payments_admin.settle(names=[name], note="Bank ref 55")["settled"], 1)
        entry = frappe.get_doc("Platform Ledger Entry", name)
        self.assertEqual(entry.status, "Settled")
        self.assertIn("Settled by Administrator", entry.note)
        self.assertIn("Bank ref 55", entry.note)
        self.assertEqual(self._row(payments_admin.overview())["settled"] - before, 40)
        self.assertEqual(payments_admin.settle(names=[name])["settled"], 0, "Settled entries stay settled.")

        payments_admin.settle(organization=self.org)
        self.assertFalse(frappe.db.exists("Platform Ledger Entry", {"organization": self.org, "status": "Due"}))

    def test_admin_per_business_override_changes_who_collects(self):
        self._platform(platform_bank_accounts=[])
        with self.assertRaises(frappe.ValidationError):
            payments_admin.save_business(self.org, collection_override="Platform collects")

        self._platform(platform_bank_accounts=[{"bank": "Platform Bank", "account_name": "Platform", "account_number": "9000"}])
        row = self._row(payments_admin.save_business(self.org, collection_override="Platform collects", override_platform_fee=1, platform_fee_override=0))
        self.assertEqual((row["collector"], row["override_platform_fee"]), ("Platform", 1))
        self.assertEqual(payments.bank_accounts(self.org)[0]["account_number"], "9000")

    def test_admin_platform_settings_are_validated(self):
        payments_admin.save_platform(platform_fee_type="Percent", platform_fee_value=5, free_bookings=3)
        platform = payments_admin.overview()["platform"]
        self.assertEqual((platform["platform_fee_type"], platform["platform_fee_value"], platform["free_bookings"]), ("Percent", 5, 3))
        self.assertNotIn("chapa_secret_key", platform)
        with self.assertRaises(frappe.ValidationError):
            payments_admin.save_platform(platform_fee_value=150)
        with self.assertRaises(frappe.ValidationError):
            payments_admin.save_platform(collection_mode="Anyone")
