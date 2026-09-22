"""Role, business-membership, scope isolation and time-conversion acceptance.

Restricted to the isolated implementation site. Creates only synthetic records
under a unique marker and removes exactly those records during cleanup. It never
deletes records it did not create (for example the retained walkthrough demo).
"""

import json
import unittest
from datetime import datetime

import frappe
import pytz
import requests
from frappe.utils import add_days, nowdate
from frappe.utils.password import update_password

from appointment.helpers.utils import format_ethiopian_time, format_time_in_user_format
from appointment.scheduler import booking

BASE = "http://127.0.0.20:25310"
MARKER = "MEM-"
DAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")


def require_target():
    if not frappe.conf.get("worktree_development") or "implement-owned-booking-slice" not in frappe.local.site:
        frappe.throw("This suite is restricted to the isolated owned-booking implementation site.")


def _insert(state, doctype, **values):
    doc = frappe.get_doc(dict(doctype=doctype, **values)).insert(ignore_permissions=True)
    state["created"].append([doctype, doc.name])
    return doc


def setup():
    require_target()
    frappe.set_user("Administrator")
    frappe.flags.syncing_booking_urls = True
    marker = MARKER + frappe.generate_hash(length=8)
    state = {"marker": marker, "created": [], "businesses": [], "users": [], "day": add_days(nowdate(), 3)}
    hours = [dict(day_of_week=day, start_time="08:00:00", end_time="20:00:00", is_open=1) for day in DAYS]

    def new_user(label, roles):
        user = _insert(
            state,
            "User",
            email=f"{marker.lower()}-{label}@example.test",
            first_name=f"{marker} {label}",
            send_welcome_email=0,
            enabled=1,
            user_type="System User",
            time_zone="Africa/Addis_Ababa",
            roles=[{"role": role} for role in roles],
        )
        state["users"].append(user.name)
        return user

    for suffix in ("A", "B"):
        owner = new_user(f"owner-{suffix.lower()}", ("Provider", "Organization Manager"))
        org = _insert(
            state,
            "Organization",
            organization_name=f"{marker} Business {suffix}",
            slug=f"{marker.lower()}-{suffix.lower()}",
            organization_type="Other",
            owner_user=owner.name,
            enable_public_booking=1,
            is_active=1,
            timezone="Africa/Addis_Ababa",
        )
        business = {"letter": suffix, "owner": owner.name, "org": org.name, "locations": [], "providers": [], "events": []}
        if suffix == "A":
            provider_specs = [("A1", "LA1"), ("A2", "LA2")]
        else:
            provider_specs = [("B1", "LB1")]
        for provider_label, location_label in provider_specs:
            provider_user = new_user(f"provider-{provider_label.lower()}", ("Provider",))
            location = _insert(
                state,
                "Location",
                location_name=f"{marker} {location_label}",
                organization=org.name,
                timezone="Africa/Addis_Ababa",
                is_active=1,
                opening_hours=hours,
            )
            provider = _insert(
                state,
                "Provider",
                provider_name=f"{marker} Provider {provider_label}",
                user=provider_user.name,
                is_active=1,
                use_default_hours=1,
                organizations=[{"organization": org.name, "status": "Active", "accept_org_bookings": 1}],
            )
            service = _insert(
                state,
                "Service",
                service_name=f"{marker} Service {provider_label}",
                organization=org.name,
                duration=30,
                price=0,
                is_active=1,
                use_default_hours=1,
                buffer_before=0,
                buffer_after=0,
            )
            event = _insert(
                state,
                "EventType",
                event_type_name=f"{marker} Offering {provider_label}",
                service=service.name,
                provider=provider.name,
                location=location.name,
                is_active=1,
            )
            business["locations"].append(location.name)
            business["providers"].append(provider.name)
            business["events"].append(event.name)
        state["businesses"].append(business)

    for user in state["users"]:
        state[f"password::{user}"] = frappe.generate_hash(length=32)
        update_password(user, state[f"password::{user}"])
    frappe.db.commit()
    frappe.flags.syncing_booking_urls = False
    return state


def cleanup(state):
    require_target()
    frappe.db.rollback()
    frappe.set_user("Administrator")
    frappe.flags.syncing_booking_urls = True
    orgs = [business["org"] for business in state["businesses"]]
    removed = []
    for name in frappe.get_all("Appointment", filters={"organization": ["in", orgs]}, pluck="name"):
        frappe.delete_doc("Appointment", name, force=True, ignore_permissions=True)
        frappe.db.delete("Version", {"ref_doctype": "Appointment", "docname": name})
        removed.append(["Appointment", name])
    for name in frappe.get_all("Business Membership", filters={"organization": ["in", orgs]}, pluck="name"):
        frappe.delete_doc("Business Membership", name, force=True, ignore_permissions=True)
        removed.append(["Business Membership", name])
    for doctype, name in reversed(state["created"]):
        if frappe.db.exists(doctype, name):
            if doctype == "User":
                from frappe.sessions import clear_sessions

                clear_sessions(user=name, force=True)
            frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)
            if doctype == "User":
                frappe.db.delete("DefaultValue", {"parent": name})
                frappe.db.delete("Has Role", {"parent": name})
            removed.append([doctype, name])
    frappe.db.commit()
    remaining = [[doctype, name] for doctype, name in removed if frappe.db.exists(doctype, name)]
    assert not remaining, remaining
    frappe.flags.syncing_booking_urls = False
    return {"removed_count": len(removed), "remaining_exact_records": remaining}


def _login(user, password):
    session = requests.Session()
    session.trust_env = False
    response = session.post(BASE + "/api/method/login", data={"usr": user, "pwd": password}, timeout=20)
    assert response.status_code == 200, response.text
    return session


class MembershipAcceptance(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.state = setup()
        cls.a, cls.b = cls.state["businesses"]
        cls.sessions = {}
        cls.sessions["ownerA"] = _login(cls.a["owner"], cls.state[f"password::{cls.a['owner']}"])
        cls.sessions["ownerB"] = _login(cls.b["owner"], cls.state[f"password::{cls.b['owner']}"])
        frappe.set_user("Administrator")

        # Bookings: A1 (provider A1, location LA1), A2 (provider A2, location LA2), B1.
        cls.bookings = {}
        frappe.set_user("Guest")
        for key, business, index, hour in (
            ("A1", cls.a, 0, 9),
            ("A2", cls.a, 1, 10),
            ("B1", cls.b, 0, 11),
        ):
            event = business["events"][index]
            result = booking.book(
                event,
                f"{cls.state['day']}T{hour:02}:00:00+03:00",
                f"{cls.state['day']}T{hour:02}:30:00+03:00",
                f"{cls.state['marker']} Customer {key}",
                f"{cls.state['marker'].lower()}-customer-{key.lower()}@example.test",
                frappe.generate_hash(length=32),
            )
            cls.bookings[key] = result["booking_id"]
        frappe.set_user("Administrator")
        frappe.db.commit()

    @classmethod
    def tearDownClass(cls):
        for session in cls.sessions.values():
            session.get(BASE + "/api/method/logout", timeout=20)
            session.close()
        cls.cleanup = cleanup(cls.state)

    def setUp(self):
        frappe.db.rollback()
        frappe.set_user("Administrator")

    # -- pure time conversion -------------------------------------------------

    def test_01_time_conversion_boundaries(self):
        cases = {
            6: ("ሰዓት 12:00 ጠዋት", "06:00", "06:00 AM"),
            12: ("ሰዓት 6:00 ከሰዓት", "12:00", "12:00 PM"),
            18: ("ሰዓት 12:00 ምሽት", "18:00", "06:00 PM"),
            0: ("ሰዓት 6:00 ሌሊት", "00:00", "12:00 AM"),
            23: ("ሰዓት 5:59 ምሽት", "23:59", "11:59 PM"),
        }
        for hour, (ethiopian, twenty_four, twelve) in cases.items():
            minute = 59 if hour == 23 else 0
            dt = pytz.timezone("Africa/Addis_Ababa").localize(datetime(2026, 9, 23, hour, minute))
            self.assertEqual(format_ethiopian_time(dt), ethiopian, f"hour {hour}")
            # Switching display format never changes the represented instant.
            self.assertEqual(format_time_in_user_format(dt, "24h"), twenty_four)
            self.assertEqual(format_time_in_user_format(dt, "12h"), twelve)

    # -- membership states ----------------------------------------------------

    def _context(self, session):
        response = session.get(BASE + "/api/method/appointment.scheduler.membership.context", timeout=20)
        self.assertEqual(response.status_code, 200, response.text[:200])
        return response.json()["message"]

    def test_02_unassigned_staff_has_explanatory_state(self):
        state = self.state
        staff = _insert(
            state,
            "User",
            email=f"{state['marker'].lower()}-unassigned@example.test",
            first_name=f"{state['marker']} Unassigned",
            send_welcome_email=0,
            enabled=1,
            user_type="System User",
            roles=[{"role": "Front Desk"}],
        )
        password = frappe.generate_hash(length=32)
        update_password(staff.name, password)
        frappe.db.commit()
        self.sessions["unassigned"] = _login(staff.name, password)
        context = self._context(self.sessions["unassigned"])
        self.assertEqual(context["state"], "no_assignment")
        self.assertEqual(context["landing"], "/no-access")
        desk = self.sessions["unassigned"].get(
            BASE + "/api/method/appointment.scheduler.api.desk.get_desk_appointments",
            params={"date": state["day"]},
            timeout=20,
        )
        self.assertEqual(desk.status_code, 403, desk.text[:200])

    def _assign(self, manager_session, business, role, email, locations=None, provider=None):
        payload = {"organization": business["org"], "email": email, "membership_role": role}
        if locations is not None:
            payload["locations"] = json.dumps(locations)
        if provider:
            payload["provider"] = provider
        return manager_session.post(
            BASE + "/api/method/appointment.scheduler.membership.assign_member",
            json=payload,
            timeout=20,
        )

    def test_03_manager_assigns_receptionist_with_location_scope(self):
        state = self.state
        receptionist = _insert(
            state,
            "User",
            email=f"{state['marker'].lower()}-recept@example.test",
            first_name=f"{state['marker']} Receptionist",
            send_welcome_email=0,
            enabled=1,
            user_type="System User",
        )
        password = frappe.generate_hash(length=32)
        update_password(receptionist.name, password)
        frappe.db.commit()

        response = self._assign(
            self.sessions["ownerA"], self.a, "Receptionist", receptionist.name, locations=[self.a["locations"][0]]
        )
        self.assertEqual(response.status_code, 200, response.text[:300])

        # A manager of another business cannot assign staff here.
        foreign = self._assign(self.sessions["ownerB"], self.a, "Receptionist", receptionist.name)
        self.assertEqual(foreign.status_code, 403, foreign.text[:200])

        self.sessions["recept"] = _login(receptionist.name, password)
        context = self._context(self.sessions["recept"])
        self.assertEqual(context["state"], "workspace")
        self.assertEqual(context["selected"]["role"], "Receptionist")
        self.assertEqual(context["landing"], f"/reception?organization={self.a['org']}")

        desk = self.sessions["recept"].get(
            BASE + "/api/method/appointment.scheduler.api.desk.get_desk_appointments",
            params={"date": state["day"], "organization": self.a["org"]},
            timeout=20,
        )
        self.assertEqual(desk.status_code, 200, desk.text[:300])
        body = desk.json()["message"]
        names = {row["name"] for row in body["appointments"]}
        self.assertIn(self.bookings["A1"], names)
        self.assertNotIn(self.bookings["A2"], names)  # different location, out of scope
        self.assertNotIn(self.bookings["B1"], names)  # different business

        # Direct record access and mutation stay denied outside scope.
        for method, url in (
            ("get", BASE + "/api/resource/Appointment/" + self.bookings["A2"]),
            ("get", BASE + "/api/resource/Appointment/" + self.bookings["B1"]),
        ):
            result = getattr(self.sessions["recept"], method)(url, timeout=20)
            self.assertEqual(result.status_code, 403, result.text[:200])
        change = self.sessions["recept"].post(
            BASE + "/api/method/appointment.scheduler.booking.change",
            json={"booking_id": self.bookings["B1"], "action": "cancel", "expected_modified": "2000-01-01 00:00:00"},
            timeout=20,
        )
        self.assertEqual(change.status_code, 403, change.text[:200])

    def test_04_provider_scope_narrows_reception(self):
        # Reassign the same receptionist to provider A2 across all locations.
        result = self.sessions["ownerA"].post(
            BASE + "/api/method/appointment.scheduler.membership.assign_member",
            json={
                "organization": self.a["org"],
                "email": self._recept_email(),
                "membership_role": "Receptionist",
                "provider": self.a["providers"][1],
                "locations": json.dumps([]),
            },
            timeout=20,
        )
        self.assertEqual(result.status_code, 200, result.text[:300])
        desk = self.sessions["recept"].get(
            BASE + "/api/method/appointment.scheduler.api.desk.get_desk_appointments",
            params={"date": self.state["day"], "organization": self.a["org"]},
            timeout=20,
        )
        names = {row["name"] for row in desk.json()["message"]["appointments"]}
        self.assertIn(self.bookings["A2"], names)
        self.assertNotIn(self.bookings["A1"], names)

    def _recept_email(self):
        return frappe.db.get_value("Business Membership", {"organization": self.a["org"], "membership_role": "Receptionist"}, "user")

    def test_05_revoked_membership_removes_access(self):
        membership = frappe.db.get_value(
            "Business Membership", {"organization": self.a["org"], "membership_role": "Receptionist"}, "name"
        )
        response = self.sessions["ownerA"].post(
            BASE + "/api/method/appointment.scheduler.membership.revoke_member",
            json={"membership": membership},
            timeout=20,
        )
        self.assertEqual(response.status_code, 200, response.text[:200])
        context = self._context(self.sessions["recept"])
        self.assertIn(context["state"], ("no_assignment", "selection"))
        if context["state"] == "no_assignment":
            desk = self.sessions["recept"].get(
                BASE + "/api/method/appointment.scheduler.api.desk.get_desk_appointments",
                params={"date": self.state["day"]},
                timeout=20,
            )
            self.assertEqual(desk.status_code, 403, desk.text[:200])

    def test_06_multi_business_switch_and_precedence(self):
        # The receptionist account also becomes owner of business B via a
        # membership-independent path: assign a Receptionist membership in B.
        recept = self._recept_email()
        if not frappe.db.exists("Business Membership", {"organization": self.b["org"], "user": recept}):
            frappe.get_doc(
                {
                    "doctype": "Business Membership",
                    "user": recept,
                    "organization": self.b["org"],
                    "membership_role": "Receptionist",
                    "status": "Active",
                }
            ).insert(ignore_permissions=True)
            from appointment.scheduler import membership as membership_module

            membership_module.grant_roles(recept, ("Front Desk",))
            # Re-enable the previously revoked A membership to create two choices.
            restored = frappe.db.get_value(
                "Business Membership", {"organization": self.a["org"], "user": recept}, "name"
            )
            frappe.db.set_value("Business Membership", restored, "status", "Active")
            frappe.db.commit()

        context = self._context(self.sessions["recept"])
        self.assertEqual(context["state"], "selection")
        self.assertEqual(len(context["workspaces"]), 2)
        select = self.sessions["recept"].post(
            BASE + "/api/method/appointment.scheduler.membership.select_workspace",
            json={"organization": self.b["org"]},
            timeout=20,
        )
        self.assertEqual(select.status_code, 200, select.text[:200])
        selected = select.json()["message"]
        self.assertEqual(selected["selected"]["organization"], self.b["org"])
        self.assertEqual(selected["selected"]["role"], "Receptionist")
        # A parameter for a business the user does not belong to is rejected.
        denied = self.sessions["recept"].post(
            BASE + "/api/method/appointment.scheduler.membership.select_workspace",
            json={"organization": self.a["org"] + "-foreign"},
            timeout=20,
        )
        self.assertEqual(denied.status_code, 403, denied.text[:200])

    def test_07_disabled_user_is_consistent(self):
        recept = self._recept_email()
        frappe.db.set_value("User", recept, "enabled", 0)
        frappe.db.commit()
        context = self._context(self.sessions["recept"])
        self.assertEqual(context["state"], "disabled")
        desk = self.sessions["recept"].get(
            BASE + "/api/method/appointment.scheduler.api.desk.get_desk_appointments",
            params={"date": self.state["day"]},
            timeout=20,
        )
        self.assertEqual(desk.status_code, 403, desk.text[:200])
        frappe.db.set_value("User", recept, "enabled", 1)
        frappe.db.commit()


def run():
    require_target()
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(MembershipAcceptance)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    summary = {
        "tests": result.testsRun,
        "failures": len(result.failures),
        "errors": len(result.errors),
        "cleanup": getattr(MembershipAcceptance, "cleanup", None),
    }
    print(json.dumps(summary))
    if not result.wasSuccessful():
        raise AssertionError("Membership acceptance failed; see the test report.")
    return summary
