"""Growth referral loop: business codes, sign-up attribution, qualification, rewards,
customer vouchers and the partner program.

Each test creates its own businesses (organizations and independent providers)
and rolls back to a savepoint. Growth Settings are patched in memory so the
shared settings cache is never changed. See docs/growth/REFERRALS.md.
"""

import contextlib
import random
import re
import unittest
from datetime import datetime, timedelta
from unittest import mock

import frappe
from frappe.utils import add_days, nowdate

from appointment.growth import (
    customer_referral_api, customer_referrals, partners, referral_admin, referral_codes, referral_rewards, referrals,
)
from appointment.public_experience import solo_setup
from appointment.scheduler import booking, independent, payments, registration, workspace
from appointment.tests.test_guest_endpoints import GuestRequest, calls_until_limited

SETTINGS = dict(
    business_referrals_enabled=True, referral_threshold_bookings=3, referral_reward_free_bookings=50,
    customer_referrals_enabled=True, customer_referral_default_percent=10, partner_program_enabled=True,
    partner_reward_free_bookings=25,
)
PATCHED = ("referrals", "referral_rewards", "customer_referrals", "customer_referral_api", "partners", "referral_admin")
DAYS = list(independent.DAYS)


def _unique(name):
    """A per-test business name. Digits only, so code stems still come from the words."""
    return f"{name} {random.randint(10000, 99999)}"


class ReferralCase(unittest.TestCase):
    def setUp(self):
        frappe.set_user("Administrator")
        # Nothing in this module may reach the shared database: commits become no-ops
        # (booking URL sync and other helpers commit) and every test rolls back.
        commit = mock.patch("frappe.db.commit")
        commit.start()
        self.addCleanup(commit.stop)
        frappe.db.savepoint("growth_referrals")
        # Booking URL sync commits; keep everything inside the savepoint.
        self._syncing = frappe.flags.syncing_booking_urls
        frappe.flags.syncing_booking_urls = True
        self.settings = dict(SETTINGS)
        self._stack = contextlib.ExitStack()
        for module in PATCHED:
            self._stack.enter_context(mock.patch(f"appointment.growth.{module}.growth", side_effect=lambda: self.settings))
        self.addCleanup(self._stack.close)

    def tearDown(self):
        frappe.set_user("Administrator")
        frappe.db.rollback(save_point="growth_referrals")
        frappe.flags.syncing_booking_urls = self._syncing

    # Businesses ---------------------------------------------------------------
    def _owner(self, first, last):
        email = f"{first.lower()}.{last.lower()}.{frappe.generate_hash(length=6)}@example.test"
        frappe.get_doc(dict(
            doctype="User", email=email, first_name=first, last_name=last, enabled=1, send_welcome_email=0,
            user_type="Website User", roles=[{"role": "Provider"}],
        )).insert(ignore_permissions=True)
        return email

    def _org(self, name, ref=None, source=None, user=None):
        name = _unique(name)
        user = user or self._owner("Meron", "Alemu")
        referrals.remember_signup(user, ref, source)
        frappe.set_user(user)
        row = workspace.create(name, f"{name} Bole {frappe.generate_hash(length=4)}", "Haircut and style", "Africa/Addis_Ababa", 30, "08:00", "18:00",
                               DAYS, frappe.generate_hash(length=24))
        workspace.publish(row["organization"], 1)
        frappe.set_user("Administrator")
        slug = frappe.db.get_value("Organization", row["organization"], "slug")
        return frappe._dict(key=row["organization"], offering=row["offering"], user=user, slug=slug, organization=row["organization"])

    def _solo(self, name, ref=None, source=None, user=None):
        name = _unique(name)
        user = user or self._owner("Selam", "Tadesse")
        referrals.remember_signup(user, ref, source)
        frappe.set_user(user)
        provider = solo_setup.create(name)["provider"]
        row = independent.create(provider, f"{name} studio {frappe.generate_hash(length=4)}", "Portrait session", "Africa/Addis_Ababa", 30, "08:00", "18:00", DAYS)
        independent.publish(provider, 1)
        frappe.set_user("Administrator")
        return frappe._dict(key="Provider:" + provider, offering=row["offering"], user=user, slug=None, organization=None)

    # Bookings -----------------------------------------------------------------
    def _slots(self, offering, count=6):
        for offset in range(2, 30):
            found = [s for s in booking.slots(offering, add_days(nowdate(), offset))["all_available_slots_for_data"] if s["available"]]
            if len(found) >= count:
                return found
        self.fail("No free slots in the next month.")

    def _book(self, business, slot, name, email=None, code=None, method=None):
        start = self._slots(business.offering)[slot]
        email = email or f"{name.split()[0].lower()}.{frappe.generate_hash(length=6)}@gmail.com"
        frappe.set_user("Guest")
        result = booking.book(
            business.offering, start["start_time"], start["end_time"], name, email, frappe.generate_hash(length=24),
            payment_method=method, referral_source="customer_referral" if code else "", referral_code=code or "",
        )
        frappe.set_user("Administrator")
        return frappe.get_doc("Appointment", result["booking_id"])

    def _took_place(self, doc):
        """Move a booking into the past, as if the visit happened."""
        past = datetime.utcnow() - timedelta(days=1)
        frappe.db.set_value("Appointment", doc.name, "starts_at", past, update_modified=False)

    def _cancel(self, doc):
        doc.reload()
        doc.status = "Cancelled"
        doc.save(ignore_permissions=True)


class TestBusinessReferrals(ReferralCase):
    def test_business_code_is_readable_unique_and_stable(self):
        first = self._org("Bloom Hair Lounge")
        second = self._org("Bloom Hair Studio")
        code = referrals.business_code(first.key)
        self.assertRegex(code, r"^BLOOMH\d{3}$")
        self.assertEqual(referrals.business_code(first.key), code, "A code never changes.")
        self.assertNotEqual(referrals.business_code(second.key), code)
        solo = self._solo("ሰላም ስቱዲዮ")
        self.assertRegex(referrals.business_code(solo.key), r"^BOOK\d{3}$", "Names in other scripts use a neutral stem.")
        self.assertEqual(referral_codes.clean(" bloomh-123 "), "BLOOMH123")

    def test_signup_with_ref_and_source_for_organizations_and_independents(self):
        referrer = self._org("Tena Beauty")
        code = referrals.business_code(referrer.key)
        org = self._org("Lomi Spa", ref=code.lower(), source="telegram_share")
        solo = self._solo("Abel Barber", ref=code)
        plain = self._solo("Hanna Nails", source="directory")
        for business, source in ((org, "telegram_share"), (solo, "referral"), (plain, "directory")):
            row = frappe.get_value("Business Signup Source", {"owner_key": business.key}, ["status", "source"], as_dict=True)
            self.assertEqual((row.status, row.source), ("Attached", source))
        for business in (org, solo):
            referral = frappe.get_doc("Business Referral", {"referred_owner_key": business.key})
            self.assertEqual((referral.referrer_owner_key, referral.status, referral.referral_code), (referrer.key, "Pending", code))
        self.assertFalse(frappe.db.exists("Business Referral", {"referred_owner_key": plain.key}))

    def test_signup_api_keeps_ref_and_source_until_the_business_exists(self):
        email = f"dawit.{frappe.generate_hash(length=6)}@example.test"
        frappe.set_user("Guest")
        with mock.patch("frappe.db.commit"):
            registration.signup(email, "Dawit Kebede", "A-long-passphrase-2026", ref="TENA123", source="powered_by_page")
        frappe.set_user("Administrator")
        row = frappe.get_value("Business Signup Source", {"signup_user": email}, ["status", "source", "ref_code"], as_dict=True)
        self.assertEqual((row.status, row.source, row.ref_code), ("Pending", "powered_by_page", "TENA123"))

    def test_self_referral_and_duplicates_are_blocked(self):
        referrer = self._solo("Selam Studio")
        code = referrals.business_code(referrer.key)
        own = self._org("Selam Mobile", ref=code, user=referrer.user)
        self.assertFalse(frappe.db.exists("Business Referral", {"referred_owner_key": own.key}), "An owner cannot refer their own business.")
        self.assertIsNone(referrals.record_signup(code, referrer.key))
        other = self._org("Kidus Barbers", ref=code)
        self.assertIsNone(referrals.record_signup(code, other.key), "A business is referred once.")
        self.assertEqual(frappe.db.count("Business Referral", {"referred_owner_key": other.key}), 1)

    def test_disabled_flag_records_the_source_but_no_referral(self):
        referrer = self._org("Mahlet Salon")
        code = referrals.business_code(referrer.key)
        self.settings["business_referrals_enabled"] = False
        org = self._org("Ruth Spa", ref=code, source="partner")
        self.assertTrue(frappe.db.exists("Business Signup Source", {"owner_key": org.key, "source": "partner"}))
        self.assertFalse(frappe.db.exists("Business Referral", {"referred_owner_key": org.key}))

    def test_qualification_counts_only_real_bookings_and_rewards_both_once(self):
        referrer = self._org("Tsion Hair")
        referred = self._solo("Yonas Cuts", ref=referrals.business_code(referrer.key))
        name = frappe.db.get_value("Business Referral", {"referred_owner_key": referred.key}, "name")
        held = [
            self._book(referred, 0, "Hanna Girma"),
            self._book(referred, 1, "Lulit Bekele"),
            self._book(referred, 2, "Showcase Guest", email=f"guest.{frappe.generate_hash(length=6)}@example.test"),
            self._book(referred, 3, "Kebede Tesfaye"),
            self._book(referred, 4, "Owner Self", email=referred.user),
        ]
        self.assertEqual(frappe.db.get_value("Business Referral", name, "qualifying_bookings"), 0, "Future bookings do not count yet.")
        for doc in held:
            self._took_place(doc)
        self._cancel(held[3])
        self.assertEqual(frappe.db.get_value("Business Referral", name, ["status", "qualifying_bookings"]), ("Pending", 2))
        last = self._book(referred, 5, "Martha Haile")
        self.assertEqual(frappe.db.get_value("Business Referral", name, "status"), "Pending")
        self._took_place(last)
        referral_rewards.check_business(referred.key)
        self.assertEqual(frappe.db.get_value("Business Referral", name, "status"), "Rewarded")
        self.assertEqual(referral_rewards.bonus_free_bookings(referred.key), 50)
        self.assertEqual(referral_rewards.bonus_free_bookings(referrer.key), 50)
        referral_rewards.evaluate(name)
        referral_rewards.reward(name)
        with mock.patch("frappe.db.commit"):
            referral_rewards.daily()
        self.assertEqual(frappe.db.count("Free Booking Credit", {"business_referral": name}), 2, "Rewards are credited exactly once.")
        frappe.set_user(referrer.user)
        view = referrals.overview(referrer.key)
        self.assertEqual(view["referrals"][0]["status"], "Rewarded")
        self.assertEqual((view["referrals"][0]["bookings"], view["threshold"], view["earned_free_bookings"]), (3, 3, 50))
        self.assertIn(f"/signup?ref={view['code']}", view["link"])

    def test_platform_fee_waiver_uses_the_referral_bonus(self):
        business = self._org("Sara Lashes")
        settings = payments.business(business.key)
        settings.accept_bank_transfer = 1
        settings.set("bank_accounts", [{"bank": "Awash", "account_name": "Sara Lashes", "account_number": "0132456789"}])
        settings.insert(ignore_permissions=True)
        frappe.db.set_value("Organization", business.key, "require_payment", 1)
        frappe.db.set_value("Service", frappe.db.get_value("EventType", business.offering, "service"), "price", 400)
        platform = frappe._dict(free_bookings=0, platform_fee_type="Fixed", platform_fee_value=20,
                                collection_mode="Business collects", platform_bank_accounts=[])
        self.assertEqual(referral_rewards.bonus_free_bookings(business.key), 0)
        with mock.patch.object(payments, "platform", return_value=platform):
            first = payments.latest_payment(self._book(business, 0, "Bethlehem Assefa", method=payments.BANK).name)
            payments.mark_paid(first)
            frappe.get_doc(dict(doctype="Free Booking Credit", owner_key=business.key, organization=business.key, free_bookings=5,
                                reason="Referral reward", status="Credited", credit_key=frappe.generate_hash())).insert(ignore_permissions=True)
            second = payments.latest_payment(self._book(business, 1, "Eden Mulugeta", method=payments.BANK).name)
            payments.mark_paid(second)
        fee = lambda payment: frappe.db.get_value("Platform Ledger Entry", {"booking_payment": payment.name, "entry_type": "Platform fee"}, ["status", "note"])
        self.assertEqual(fee(first), ("Due", None), "No bonus yet: the first fee is due.")
        self.assertEqual(fee(second), ("Waived", "Referral bonus"), "The earned credit waives the next fee.")


class TestCustomerReferrals(ReferralCase):
    def _offer(self, business, **values):
        frappe.set_user(business.user)
        result = customer_referral_api.save_offer(business.key, **{"enabled": 1, "reward_type": "Percent", "percent": 10, **values})
        frappe.set_user("Administrator")
        return result

    def test_voucher_issue_redeem_and_expire(self):
        business = self._org("Bloom Nail Bar")
        self._offer(business, friend_gets_offer=1)
        first = self._book(business, 0, "Hanna Girma")
        frappe.set_user("Guest")
        share = customer_referral_api.share(first.appointment_id)
        self.assertTrue(share["active"])
        self.assertRegex(share["code"], r"^HANNA\d{3}$")
        self.assertIn(f"/schedule/org/{business.slug}?ref={share['code']}", share["link"])
        invite = customer_referral_api.invite(share["code"], slug=business.slug)
        self.assertEqual((invite["valid"], invite["first_name"], invite["percent"], invite["friend_gets_offer"]), (True, "Hanna", 10, True))
        friend = self._book(business, 1, "Lulit Bekele", code=share["code"])
        rewards = frappe.get_all("Customer Referral Reward", filters={"appointment": friend.name}, fields=["role", "customer_profile", "status", "reward_label"])
        self.assertEqual(sorted((r.role, r.customer_profile, r.status, r.reward_label) for r in rewards),
                         [("Friend", friend.customer, "Issued", "10%"), ("Referrer", first.customer, "Issued", "10%")])
        self._book(business, 2, "Hanna Girma", email=first.client_email, code=share["code"])
        self.assertEqual(frappe.db.count("Customer Referral Reward", {"customer_profile": first.customer}), 1, "Own code earns nothing.")

        frappe.set_user(business.user)
        desk = customer_referral_api.booking_referral(friend.name)
        self.assertEqual(desk["referred_by"]["name"], "Hanna Girma")
        voucher = customer_referral_api.customer_rewards(first.customer)["rewards"][0]
        customer_referral_api.redeem(voucher.name, first.name)
        self.assertEqual(frappe.db.get_value("Customer Referral Reward", voucher.name, "status"), "Redeemed")
        with self.assertRaises(frappe.ValidationError):
            customer_referral_api.redeem(voucher.name)
        frappe.set_user("Administrator")
        welcome = frappe.db.get_value("Customer Referral Reward", {"customer_profile": friend.customer}, "name")
        frappe.db.set_value("Customer Referral Reward", welcome, "expires_on", add_days(nowdate(), -1))
        customer_referrals.expire_due()
        self.assertEqual(frappe.db.get_value("Customer Referral Reward", welcome, "status"), "Expired")

    def test_cancelled_friend_booking_voids_the_voucher_and_independents_work(self):
        business = self._solo("Kalkidan Braids")
        self._offer(business, reward_type="Custom", reward_text="Free hair wash")
        first = self._book(business, 0, "Mahlet Tesfaye")
        frappe.set_user("Guest")
        share = customer_referral_api.share(first.appointment_id)
        self.assertIn(f"/schedule/individual/{business.offering}?ref=", share["link"])
        self.assertEqual(customer_referral_api.invite(share["code"], offering=business.offering)["reward_text"], "Free hair wash")
        friend = self._book(business, 1, "Ruth Alemayehu", code=share["code"])
        [voucher] = frappe.get_all("Customer Referral Reward", filters={"appointment": friend.name}, fields=["name", "role", "reward_label"])
        self.assertEqual((voucher.role, voucher.reward_label), ("Referrer", "Free hair wash"))
        self._cancel(friend)
        self.assertEqual(frappe.db.get_value("Customer Referral Reward", voucher.name, "status"), "Expired")

    def test_offer_off_or_platform_off_shows_nothing(self):
        business = self._org("Abyssinia Spa")
        first = self._book(business, 0, "Eden Mulugeta")
        self.assertFalse(customer_referral_api.share(first.appointment_id)["active"])
        self._offer(business)
        self.settings["customer_referrals_enabled"] = False
        self.assertFalse(customer_referral_api.share(first.appointment_id)["active"])

    def test_permissions_across_businesses(self):
        mine, theirs = self._org("Hawi Barbers"), self._org("Lucy Beauty")
        self._offer(theirs)
        first = self._book(theirs, 0, "Bethlehem Assefa")
        share = customer_referral_api.share(first.appointment_id)
        friend = self._book(theirs, 1, "Sara Haile", code=share["code"])
        reward = frappe.db.get_value("Customer Referral Reward", {"appointment": friend.name}, "name")
        self.assertFalse(customer_referral_api.invite(share["code"], slug=mine.slug)["valid"], "A code works only at its own business.")
        frappe.set_user(mine.user)
        for call in (
            lambda: referrals.overview(theirs.key),
            lambda: customer_referral_api.get_offer(theirs.key),
            lambda: customer_referral_api.customer_rewards(first.customer),
            lambda: customer_referral_api.redeem(reward),
            lambda: customer_referral_api.booking_referral(friend.name),
            lambda: referral_admin.overview(),
            lambda: partners.review("missing", "Approved"),
        ):
            with self.assertRaises(frappe.PermissionError):
                call()


class TestPartners(ReferralCase):
    def _apply(self, email, kind="association", name="Addis Beauty Association"):
        return referrals.apply_partner("Tigist Worku", name, email, "0911234567", kind, "We train 200 stylists a year.")

    def test_apply_validates_and_deduplicates(self):
        email = f"tigist.{frappe.generate_hash(length=6)}@abaa.et"
        frappe.set_user("Guest")
        for value, kind in (("not-an-email", "association"), (email, "club")):
            with self.assertRaises(frappe.ValidationError):
                self._apply(value, kind)
        self.assertEqual(self._apply(email.upper())["status"], "received")
        self._apply(email)
        self.assertEqual(frappe.db.count("Growth Partner", {"email": email}), 1)
        self.settings["partner_program_enabled"] = False
        with self.assertRaises(frappe.PermissionError):
            self._apply("other@abaa.et")

    def test_apply_is_rate_limited(self):
        with GuestRequest():
            allowed = calls_until_limited(lambda: self._apply(f"partner.{frappe.generate_hash(length=6)}@abaa.et"), 8)
        self.assertEqual(allowed, 5)

    def test_approval_issues_a_code_and_partner_rewards_are_owed(self):
        email = f"tigist.{frappe.generate_hash(length=6)}@abaa.et"
        frappe.set_user("Guest")
        self._apply(email)
        frappe.set_user("Administrator")
        partner = frappe.db.get_value("Growth Partner", {"email": email}, "name")
        row = partners.review(partner, "Approved")
        self.assertRegex(row["referral_code"], r"^ADDISB\d{3}$")
        referred = self._solo("Nardos Henna", ref=row["referral_code"])
        referral = frappe.get_doc("Business Referral", {"referred_owner_key": referred.key})
        self.assertEqual((referral.referrer_partner, referral.source, referral.referrer_owner_key), (partner, "referral", None))
        referral_rewards.reward(referral.name)
        credit = frappe.get_value("Free Booking Credit", {"business_referral": referral.name, "reason": "Partner reward"},
                                  ["status", "free_bookings", "growth_partner"], as_dict=True)
        self.assertEqual((credit.status, credit.free_bookings, credit.growth_partner), ("Payout owed", 25, partner))
        self.assertEqual(referral_rewards.bonus_free_bookings(referred.key), 50)
        view = referral_admin.overview()
        self.assertEqual(next(p for p in view["partners"] if p["name"] == partner)["qualified_businesses"], 1)
        self.assertTrue(any(s["source"] == "referral" for s in view["sources"]["30"]))
