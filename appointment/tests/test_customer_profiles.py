"""Customer profiles: identity, booking links, permissions, merge and the linking patch.

Uses the rich demo businesses. Every test rolls back what it creates.
"""

import frappe

from appointment.patches.v0_1 import link_customer_profiles
from appointment.scheduler import booking, customer_identity, customers
from appointment.scheduler.api import desk
from appointment.tests.test_customer_notifications import MANAGER, OFFERING, OTHER_OWNER, OWNER, BloomBookingCase

PROVIDER_USER = "bloom.provider1@example.test"


class TestCustomerProfiles(BloomBookingCase):
    def _profile(self, name="Hanna Profile", email=None, phone=None, organization=None):
        frappe.set_user("Administrator")
        return frappe.get_doc(dict(
            doctype="Customer Profile", organization=organization or self.org, display_name=name,
            primary_email=email, primary_phone=phone,
        )).insert(ignore_permissions=True)

    # Identity -------------------------------------------------------------
    def test_contact_is_normalized_and_keys_are_scoped_to_the_business(self):
        doc = self._profile(email="  Hanna@Example.TEST ", phone="0911 223 344")
        self.assertEqual((doc.primary_email, doc.primary_phone), ("hanna@example.test", "+251911223344"))

        other = frappe.db.get_value("Organization", {"owner_user": OTHER_OWNER}, "name")
        twin = self._profile(email="hanna@example.test", organization=other)
        self.assertNotEqual(doc.email_key, twin.email_key)

    def test_same_email_twice_in_one_business_is_refused(self):
        self._profile(email="dup@example.test")
        with self.assertRaises(frappe.DuplicateEntryError):
            self._profile(name="Someone else", email="DUP@example.test")

    def test_names_never_match(self):
        self._profile(name="Selam Test", email="first@example.test")
        self.assertEqual(customer_identity.find_by_key(self.org, email="second@example.test"), {})

    # Booking links --------------------------------------------------------
    def test_public_booking_creates_then_reuses_the_profile(self):
        first = self._book(email="returning@example.test")
        second = self._book(slot=1, email="Returning@Example.test")

        self.assertNotIn("customer", first)
        ids = {frappe.db.get_value("Appointment", r["booking_id"], "customer") for r in (first, second)}
        self.assertEqual(len(ids), 1)
        self.assertTrue(next(iter(ids)).startswith("CUS-"))

    def test_booking_keeps_its_own_contact_snapshot(self):
        profile = self._profile(name="Profile Name", email="snap@example.test")
        result = self._book(email="snap@example.test", name="Typed Name")
        row = frappe.db.get_value("Appointment", result["booking_id"], ["customer", "client_name"], as_dict=True)
        self.assertEqual((row.customer, row.client_name), (profile.name, "Typed Name"))

    def test_email_and_phone_matching_two_profiles_links_email_and_flags_phone(self):
        by_email = self._profile(name="A", email="split@example.test")
        by_phone = self._profile(name="B", phone="0911000111")
        result = self._book(email="split@example.test", phone="0911000111")

        self.assertEqual(frappe.db.get_value("Appointment", result["booking_id"], "customer"), by_email.name)
        self.assertEqual(frappe.db.get_value("Customer Profile", by_phone.name, "possible_duplicate"), 1)

    def test_staff_booking_with_name_only_creates_a_profile(self):
        frappe.set_user(MANAGER)
        slot = self.slots[0]
        event = frappe.get_doc("EventType", OFFERING)
        doc = frappe.get_doc(dict(
            doctype="Appointment", appointment_id="APT-QA" + frappe.generate_hash(length=10), event_type=OFFERING,
            service=event.service, provider=event.provider, location=event.location, status="Confirmed",
            client_name="Walk-up guest", **_local(slot, event.location),
        ))
        doc.flags.skip_customer_notification = True
        doc.insert()

        self.assertFalse(doc.client_email)
        self.assertEqual(frappe.db.get_value("Customer Profile", doc.customer, "display_name"), "Walk-up guest")

    def test_public_booking_still_requires_email(self):
        start = self.slots[0]
        with self.assertRaises(frappe.ValidationError):
            booking.book(OFFERING, start["start_time"], start["end_time"], "No Email", "", "n" * 24, organization_id=self.org)

    def test_staff_create_links_the_picked_customer(self):
        profile = self._profile(name="Picked Customer")
        frappe.set_user(MANAGER)
        event = frappe.get_doc("EventType", OFFERING)
        local = _local(self.slots[0], event.location)
        original_commit, frappe.db.commit = frappe.db.commit, lambda: None  # desk commits; keep the test rollback.
        try:
            result = desk.create_desk_appointment(
                client_name="Picked Customer", service_name=event.service, provider_name=event.provider,
                location_name=event.location, start_time=str(local["start_time"]),
                appointment_date=str(local["appointment_date"]), customer=profile.name,
            )
        finally:
            frappe.db.commit = original_commit
        self.assertEqual(result["appointment"]["customer"], profile.name)

    def test_customer_of_another_business_is_refused(self):
        other = frappe.db.get_value("Organization", {"owner_user": OTHER_OWNER}, "name")
        foreign = self._profile(name="Foreign", organization=other)
        frappe.set_user("Guest")
        start = self.slots[0]
        event = frappe.get_doc("EventType", OFFERING)
        doc = frappe.get_doc(dict(
            doctype="Appointment", appointment_id="APT-QB" + frappe.generate_hash(length=10), event_type=OFFERING,
            service=event.service, provider=event.provider, location=event.location, status="Confirmed",
            client_name="X", client_email="x@example.test", customer=foreign.name, **_local(start, event.location),
        ))
        frappe.set_user(MANAGER)
        with self.assertRaises(frappe.PermissionError):
            doc.insert()

    # Permissions and projections -----------------------------------------
    def test_manager_searches_by_name_email_and_phone(self):
        self._profile(name="Searchable Sara", email="sara.search@example.test", phone="0911555666")
        frappe.set_user(MANAGER)
        for query in ("Searchable", "sara.search", "0911555666"):
            names = [row["display_name"] for row in customers.search(self.org, query)["customers"]]
            self.assertIn("Searchable Sara", names, query)

    def test_other_business_cannot_search_read_edit_or_merge(self):
        profile = self._profile(email="private@example.test")
        spare = self._profile(name="Spare")
        frappe.set_user(OTHER_OWNER)
        for call in (
            lambda: customers.search(self.org),
            lambda: customers.get(profile.name),
            lambda: customers.save(self.org, profile.name, display_name="Hijacked"),
            lambda: customers.merge(spare.name, profile.name),
        ):
            with self.assertRaises(frappe.PermissionError):
                call()

    def test_provider_sees_only_name_and_history_of_own_customers(self):
        provider = frappe.db.get_value("Provider", {"user": PROVIDER_USER}, "name")
        if frappe.db.get_value("EventType", OFFERING, "provider") != provider:
            self.skipTest("The test offering belongs to another provider.")
        result = self._book(email="mine@example.test", phone="0911777888")
        customer_id = frappe.db.get_value("Appointment", result["booking_id"], "customer")
        stranger = self._profile(name="Not my customer", email="stranger@example.test")

        frappe.set_user(PROVIDER_USER)
        view = customers.get(customer_id)
        self.assertNotIn("primary_email", view)
        self.assertNotIn("primary_phone", view)
        self.assertNotIn("private_notes", view)
        self.assertEqual(len(view["history"]), 1)
        with self.assertRaises(frappe.PermissionError):
            customers.get(stranger.name)
        with self.assertRaises(frappe.PermissionError):
            customers.save(self.org, customer_id, display_name="Renamed")

    def test_guest_cannot_read_profiles(self):
        self._profile(email="guest-hidden@example.test")
        frappe.set_user("Guest")
        self.assertFalse(frappe.has_permission("Customer Profile", "read"))

    def test_receptionist_can_create_but_not_merge(self):
        receptionist = "bloom.reception@example.test"
        frappe.set_user(receptionist)
        created = customers.save(self.org, display_name="Desk Created", primary_phone="0911999000")
        spare = self._profile(name="Spare Two")
        frappe.set_user(receptionist)
        self.assertEqual(created["primary_phone"], "+251911999000")
        with self.assertRaises(frappe.PermissionError):
            customers.merge(spare.name, created["name"])

    def test_preferred_providers_must_work_for_the_business(self):
        other = frappe.db.get_value("Organization", {"owner_user": OTHER_OWNER}, "name")
        foreign_provider = frappe.db.get_value("Provider Organization", {"organization": other, "status": "Active"}, "parent")
        own_provider = frappe.db.get_value("EventType", OFFERING, "provider")
        frappe.set_user(OWNER)
        saved = customers.save(self.org, display_name="Prefers", preferred_providers=[{"provider": own_provider}])
        self.assertEqual(saved["preferred_providers"][0]["provider"], own_provider)
        with self.assertRaises(frappe.ValidationError):
            customers.save(self.org, saved["name"], preferred_providers=[{"provider": foreign_provider}])

    # Merge ------------------------------------------------------------------
    def test_merge_moves_bookings_and_archives_the_duplicate(self):
        first = self._book(email="merge-a@example.test")
        second = self._book(slot=1, email="merge-b@example.test")
        source = frappe.db.get_value("Appointment", first["booking_id"], "customer")
        target = frappe.db.get_value("Appointment", second["booking_id"], "customer")

        frappe.set_user(OWNER)
        self.assertEqual(customers.merge_preview(source, target)["bookings_to_move"], 1)
        self.assertEqual(customers.merge(source, target)["moved"], 1)

        self.assertEqual(frappe.db.get_value("Appointment", first["booking_id"], "customer"), target)
        archived = frappe.db.get_value("Customer Profile", source, ["status", "merged_into", "primary_email"], as_dict=True)
        self.assertEqual((archived.status, archived.merged_into, archived.primary_email), ("Archived", target, None))

    def test_profile_with_bookings_cannot_be_deleted(self):
        result = self._book(email="keep@example.test")
        customer_id = frappe.db.get_value("Appointment", result["booking_id"], "customer")
        frappe.set_user("Administrator")
        with self.assertRaises(frappe.ValidationError):
            frappe.delete_doc("Customer Profile", customer_id, ignore_permissions=True)

    # Linking patch ------------------------------------------------------------
    def test_linking_patch_groups_by_email_and_is_idempotent(self):
        result = self._book(email="legacy@example.test")
        frappe.set_user("Administrator")
        frappe.db.set_value("Appointment", result["booking_id"], "customer", None, update_modified=False)

        before = link_customer_profiles.report().get(self.org, {})
        self.assertGreaterEqual(before.get("bookings", 0), 1)
        link_customer_profiles.execute(commit=False)
        self.assertTrue(frappe.db.get_value("Appointment", result["booking_id"], "customer"))
        self.assertEqual(link_customer_profiles.report().get(self.org, {}).get("bookings", 0), 0)


def _local(slot, location):
    from datetime import datetime

    import pytz

    zone = pytz.timezone(frappe.db.get_value("Location", location, "timezone"))
    start = pytz.UTC.localize(datetime.fromisoformat(slot["start_time"].rstrip("Z"))).astimezone(zone)
    end = pytz.UTC.localize(datetime.fromisoformat(slot["end_time"].rstrip("Z"))).astimezone(zone)
    return dict(appointment_date=start.date(), start_time=start.time().replace(tzinfo=None), end_time=end.time().replace(tzinfo=None))
