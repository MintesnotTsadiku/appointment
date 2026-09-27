"""Acceptance for tenant-provisioning configuration and Translation DocType i18n.

Restricted to the isolated implementation site. Creates only synthetic records
and removes exactly those records; the registration Single is restored.
"""

import unittest

import frappe

from appointment.scheduler import membership, registration, translation, workspace

SETTINGS_DOCTYPE = "Appointment Registration Settings"
MARKER = "REG-"


def require_target():
    if not frappe.conf.get("worktree_development") or "implement-owned-booking-slice" not in frappe.local.site:
        frappe.throw("This suite is restricted to the isolated owned-booking implementation site.")


class RegistrationAcceptance(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        require_target()
        frappe.set_user("Administrator")
        cls.original = dict(frappe.db.get_singles_dict(SETTINGS_DOCTYPE) or {})
        cls.created = []
        cls.marker = MARKER + frappe.generate_hash(length=8)
        cls.strong_password = "Str0ng-Pass-" + frappe.generate_hash(length=14)

    @classmethod
    def tearDownClass(cls):
        frappe.set_user("Administrator")
        for doctype, name in reversed(cls.created):
            if frappe.db.exists(doctype, name):
                if doctype == "User":
                    from frappe.sessions import clear_sessions

                    clear_sessions(user=name, force=True)
                frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)
        for key in (
            "self_signup_mode",
            "allow_self_service_business_creation",
            "require_admin_approval",
            "allow_invite_provisioning",
        ):
            frappe.db.set_single_value(SETTINGS_DOCTYPE, key, cls.original.get(key, registration.DEFAULTS[key]))
        frappe.db.commit()
        frappe.clear_cache()

    def setUp(self):
        frappe.set_user("Administrator")

    def _set(self, **values):
        for key, value in values.items():
            frappe.db.set_single_value(SETTINGS_DOCTYPE, key, value)
        frappe.db.commit()
        frappe.clear_cache()

    def _insert(self, doctype, **values):
        doc = frappe.get_doc(dict(doctype=doctype, **values)).insert(ignore_permissions=True)
        self.created.append((doctype, doc.name))
        return doc

    def _user(self, label, user_type="Website User", roles=()):
        user = self._insert(
            "User",
            email=f"{self.marker.lower()}-{label}@example.test",
            first_name=f"{self.marker} {label}",
            send_welcome_email=0,
            enabled=1,
            user_type=user_type,
            roles=[{"role": role} for role in roles],
        )
        return user.name

    def test_01_defaults_are_open(self):
        self._set(
            self_signup_mode="Open",
            allow_self_service_business_creation=1,
            require_admin_approval=0,
            allow_invite_provisioning=1,
        )
        public = registration.public_settings()
        self.assertTrue(public["signup_enabled"])
        self.assertEqual(public["self_signup_mode"], "Open")
        self.assertFalse(public["requires_verification"])
        self.assertTrue(public["self_service_business_creation"])

    def test_02_disabled_blocks_and_open_allows_signup(self):
        self._set(self_signup_mode="Disabled")
        with self.assertRaises(frappe.PermissionError):
            registration.signup(f"{self.marker.lower()}-disabled@example.test", "Disabled Signup", self.strong_password)
        self.assertFalse(frappe.db.exists("User", f"{self.marker.lower()}-disabled@example.test"))

        self._set(self_signup_mode="Open", require_admin_approval=0)
        result = registration.signup(f"{self.marker.lower()}-open@example.test", "Open Signup", self.strong_password)
        self.created.append(("User", result["email"]))
        self.assertEqual(result["status"], "active")
        self.assertTrue(frappe.db.get_value("User", result["email"], "enabled"))

    def test_03_unimplemented_verification_is_blocked_and_approval_holds_account(self):
        self._set(self_signup_mode="Verified", require_admin_approval=0)
        email = f"{self.marker.lower()}-verified@example.test"
        self.assertFalse(registration.public_settings()["signup_enabled"])
        self.assertFalse(registration.public_settings()["verification_available"])
        with self.assertRaises(frappe.PermissionError):
            registration.signup(email, "Verified Signup", self.strong_password)
        self.assertFalse(frappe.db.exists("User", email))

        self._set(self_signup_mode="Open", require_admin_approval=1)
        approval = registration.signup(f"{self.marker.lower()}-approval@example.test", "Approval Signup", self.strong_password)
        self.created.append(("User", approval["email"]))
        self.assertEqual(approval["status"], "pending_approval")
        self.assertFalse(frappe.db.get_value("User", approval["email"], "enabled"))

    def test_04_self_service_business_creation_is_gated(self):
        plain = self._user("plain")
        self._set(self_signup_mode="Open", allow_self_service_business_creation=0, require_admin_approval=0)
        frappe.set_user(plain)
        self.assertFalse(registration.may_start_business(plain))
        with self.assertRaises(frappe.PermissionError):
            workspace.require_provider_account()
        frappe.set_user("Administrator")

        self._set(allow_self_service_business_creation=1)
        frappe.set_user(plain)
        self.assertTrue(registration.may_start_business(plain))
        with self.assertRaises(frappe.PermissionError):
            workspace.require_provider_account()
        from appointment.onboarding import set_onboarding_type
        set_onboarding_type("organization")
        provider = frappe.db.get_value("Provider", {"user": plain}, "name")
        self.created.append(("Provider", provider))
        self.assertEqual(workspace.require_provider_account(), plain)
        frappe.set_user("Administrator")

    def test_05_invite_provisioning_is_gated(self):
        manager = self._user("manager", user_type="System User", roles=("Provider", "Organization Manager"))
        org = self._insert(
            "Organization",
            organization_name=f"{self.marker} Provision Org",
            slug=f"{self.marker.lower()}-provision",
            organization_type="Other",
            owner_user=manager,
            is_active=1,
        )
        target = self._user("target")

        self._set(allow_invite_provisioning=0)
        frappe.set_user(manager)
        with self.assertRaises(frappe.PermissionError):
            membership.assign_member(org.name, target, "Receptionist")
        frappe.set_user("Administrator")
        # Administrator is never blocked.
        result = membership.assign_member(org.name, target, "Receptionist")
        self.created.append(("Business Membership", result["membership"]))

        self._set(allow_invite_provisioning=1)
        frappe.set_user(manager)
        result = membership.assign_member(org.name, target, "Receptionist")
        self.created.append(("Business Membership", result["membership"]))
        self.assertEqual(result["delivery"], "local_assignment")
        self.assertFalse(result["email_sent"])
        frappe.set_user("Administrator")

    def test_06_translations_come_from_the_translation_doctype(self):
        self.assertGreater(frappe.db.count("Translation", {"language": "am"}), 50)
        messages = translation.messages("am")["messages"]
        self.assertIn("Sign In", messages)
        self.assertNotEqual(messages["Sign In"], "Sign In")
        languages = translation.languages()["languages"]
        self.assertIn("en", languages)
        self.assertIn("am", languages)
        # Only languages the app ships are offered, not every Frappe language.
        self.assertLess(len(languages), 12)

    def test_07_real_login_survives_authorized_owner_upgrade(self):
        import requests
        self._set(self_signup_mode="Open", allow_self_service_business_creation=1, require_admin_approval=0)
        email = f"{self.marker.lower()}-session@example.test"
        registration.signup(email, "Session Owner", self.strong_password)
        self.created.append(("User", email))
        base = "http://127.0.0.20:25310/api/method/"
        with requests.Session() as session:
            session.trust_env = False
            login = session.post(base + "login", json={"usr": email, "pwd": self.strong_password}, timeout=20)
            self.assertEqual(login.status_code, 200)
            old_sid = session.cookies.get("sid")
            upgrade = session.post(base + "appointment.onboarding.set_onboarding_type", json={"onboarding_type": "organization"}, timeout=20)
            frappe.db.rollback()
            provider = frappe.db.get_value("Provider", {"user": email}, "name")
            if provider:
                self.created.append(("Provider", provider))
            self.assertEqual(upgrade.status_code, 200, upgrade.text[:200])
            self.assertTrue(session.cookies.get("sid") != old_sid, "Authorized self-upgrade must rotate the session")
            identity = session.get(base + "frappe.auth.get_logged_user", timeout=20)
            self.assertEqual(identity.status_code, 200)
            self.assertEqual(identity.json()["message"], email)
            context = session.get(base + "appointment.scheduler.membership.context", timeout=20)
            self.assertEqual(context.json()["message"]["user"], email)

    def test_08_other_user_upgrade_does_not_restore_their_session(self):
        import requests
        email = f"{self.marker.lower()}-other-session@example.test"
        self._set(self_signup_mode="Open", require_admin_approval=0)
        registration.signup(email, "Other Session", self.strong_password)
        self.created.append(("User", email))
        base = "http://127.0.0.20:25310/api/method/"
        with requests.Session() as session:
            session.trust_env = False
            self.assertEqual(session.post(base + "login", json={"usr": email, "pwd": self.strong_password}, timeout=20).status_code, 200)
            frappe.db.rollback()  # See the session committed by the independent login request.
            membership.grant_roles(email, ("Provider",))
            frappe.db.commit()
            self.assertIn(session.get(base + "frappe.auth.get_logged_user", timeout=20).status_code, (401, 403))


def run():
    require_target()
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(RegistrationAcceptance)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    summary = {"tests": result.testsRun, "failures": len(result.failures), "errors": len(result.errors)}
    print(summary)
    if not result.wasSuccessful():
        raise AssertionError("Registration acceptance failed; see the test report.")
    return summary
