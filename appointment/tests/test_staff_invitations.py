"""Invitation authorization, acceptance and exact transaction rollback."""

import sys
import unittest

import frappe

from appointment.content import staff_invitations as invitations
from appointment.tests.test_content_entitlements import EntitlementIsolationTests, _cleanup, require_target


class InvitationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        EntitlementIsolationTests.setUpClass()
        cls.fixture = EntitlementIsolationTests.state

    @classmethod
    def tearDownClass(cls):
        _cleanup(cls.fixture)

    def setUp(self):
        frappe.set_user("Administrator")
        frappe.flags.ignore_permissions = False
        frappe.db.savepoint("staff_invitation_test")
        self.owner = self.fixture["owners"]["A"]
        self.organization = self.fixture["orgs"]["A"]
        self.email = "invite-" + frappe.generate_hash(length=12) + "@example.test"
        frappe.set_user(self.owner)

    def tearDown(self):
        frappe.set_user("Administrator")
        frappe.db.rollback(save_point="staff_invitation_test")
        frappe.clear_cache(user=self.email)

    def create(self):
        result = invitations.invite(self.organization, self.email, "Invited Staff")
        self.assertFalse(result["email_sent"])
        return result["invitation"]

    def token(self, name):
        return frappe.get_doc("Business Staff Invitation", name).get_password("local_token")

    def test_guest_acceptance_creates_account_without_roles_or_membership_and_is_one_use(self):
        name = self.create()
        token = self.token(name)
        frappe.set_user("Guest")
        result = invitations.accept(token, "A strong staff password 2026! " + frappe.generate_hash(length=12))
        self.assertEqual(result["status"], "Accepted")
        self.assertTrue(frappe.db.exists("User", self.email))
        self.assertFalse(frappe.db.exists("Business Membership", {"user": self.email}))
        self.assertNotIn("Organization Manager", frappe.get_roles(self.email))
        with self.assertRaises(frappe.PermissionError):
            invitations.accept(token, "replacement")

    def test_foreign_manager_cannot_read_revoke_or_create_invitation(self):
        name = self.create()
        frappe.set_user(self.fixture["owners"]["B"])
        for operation in (lambda: invitations.inbox(self.organization),
                          lambda: invitations.revoke(name),
                          lambda: invitations.invite(self.organization, self.email, "Foreign")):
            with self.assertRaises(frappe.PermissionError):
                operation()

    def test_revoked_invitation_cannot_create_user(self):
        name = self.create()
        token = self.token(name)
        invitations.revoke(name)
        frappe.set_user("Guest")
        with self.assertRaises(frappe.PermissionError):
            invitations.accept(token, "A strong staff password 2026!")
        self.assertFalse(frappe.db.exists("User", self.email))

    def test_owner_assigns_accepted_account_without_administrator_password_setup(self):
        from appointment.scheduler import membership

        with self.assertRaises(frappe.ValidationError):
            membership.assign_member(self.organization, self.email, "Receptionist")
        name = self.create()
        token = self.token(name)
        frappe.set_user("Guest")
        invitations.accept(token, "A strong staff password 2026! " + frappe.generate_hash(length=12))
        frappe.set_user(self.owner)
        result = membership.assign_member(self.organization, self.email, "Receptionist")
        self.assertFalse(result["created_user"])
        self.assertEqual(result["membership_role"], "Receptionist")
        self.assertNotIn(self.organization, membership.manager_organizations(self.email))

    def test_existing_account_requires_matching_session_and_never_resets_password(self):
        self.email = self.fixture["owners"]["B"]
        name = self.create()
        token = self.token(name)
        frappe.set_user("Guest")
        with self.assertRaises(frappe.PermissionError):
            invitations.accept(token, "attempted replacement")
        frappe.set_user(self.email)
        self.assertEqual(invitations.accept(token)["status"], "Accepted")


def run():
    require_target()
    result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__]))
    if not result.wasSuccessful():
        raise AssertionError("Staff invitation tests failed")
    return {"passed": True, "tests": result.testsRun}
