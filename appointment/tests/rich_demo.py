"""Versioned, local-only walkthrough data. Never exposed as a web endpoint.

Run with bench --site <demo.localhost> execute appointment.tests.rich_demo.seed.
The private journal is the ownership boundary; names alone never authorize deletion.
"""

import fcntl
import json
import os
from collections import Counter
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

import frappe
from frappe.utils import getdate, nowdate
from frappe.utils.password import update_password

from appointment.scheduler import booking, membership, workspace

VERSION = 1
TZ = "Africa/Addis_Ababa"
CLIENTS = [
    "Liya Tadesse",
    "Abel Kebede",
    "Bethlehem Girma",
    "Nahom Tesfaye",
    "Mahlet Bekele",
    "Kaleb Alemu",
    "Hana Demissie",
    "Yohannes Assefa",
    "Ruth Getachew",
    "Henok Fikru",
    "Selamawit Abebe",
    "Natnael Mekonnen",
    "Mekdes Haile",
    "Biruk Solomon",
    "Sara Yilma",
    "Eyob Worku",
    "Tigist Mulatu",
    "Dagmawit Tsegaye",
    "Samuel Ayele",
    "Blen Yared",
]
# Expand the cast beyond recurring regulars, while keeping every contact synthetic.
CLIENTS = list(dict.fromkeys(CLIENTS + [
    f"{given} {family}"
    for given in ("Aster", "Birtukan", "Daniel", "Eden", "Fikir", "Genet", "Kidan", "Lemlem", "Mulu", "Rediet", "Robel", "Yared")
    for family in ("Abate", "Alemu", "Bekele", "Demissie", "Girma", "Haile", "Kebede", "Mekonnen", "Tadesse", "Tesfaye")
]))
# key, business, owner, category, copy, hours, closed days, services, extra providers, rooms
BUSINESSES = [
    (
        "selam",
        "Selam Movement Practice",
        "Selam Bekele",
        "Fitness & Wellness",
        "Unhurried one-to-one movement coaching in a quiet Gerji studio. Build a routine that fits your working week.",
        (9, 17),
        ["Sunday", "Monday"],
        [("Movement consultation", 45, 900), ("Guided mobility session", 60, 1200)],
        [],
        ["Gerji private studio"],
    ),
    (
        "meron",
        "Meron Tailoring Atelier",
        "Meron Alemu",
        "Other",
        "Thoughtful fittings, everyday alterations and occasion wear, made personal. Visit Meron in her Kazanchis atelier.",
        (10, 18),
        ["Sunday"],
        [("First fitting", 30, 350), ("Occasion wear consultation", 60, 700)],
        [],
        ["Kazanchis fitting studio"],
    ),
    (
        "bloom",
        "Bole Bloom Hair Studio",
        "Hanna Tesfaye",
        "Salon & Spa",
        "A neighbourhood salon for natural hair care, fresh cuts and unrushed styling. Choose your stylist and settle in.",
        (9, 19),
        ["Monday"],
        [("Wash and finish", 60, 1100), ("Cut and shape", 45, 850), ("Scalp care consultation", 30, 500)],
        ["Rahel Girma", "Eden Tadesse"],
        ["Bole main studio", "Bole quiet styling room"],
    ),
    (
        "tena",
        "Tena Family Clinic",
        "Dr. Dawit Haile",
        "Healthcare",
        "A small family clinic in CMC with scheduled consultations and clear arrival times. All people and appointments in this demonstration are fictional.",
        (8, 17),
        ["Sunday"],
        [("General consultation", 30, 700), ("Follow-up visit", 30, 450), ("Wellness consultation", 60, 1000)],
        ["Dr. Saron Mekonnen", "Dr. Yonas Assefa"],
        ["CMC consultation room one", "CMC consultation room two", "CMC consultation room three"],
    ),
    (
        "abugida",
        "Abugida Language Studio",
        "Kalkidan Getachew",
        "Education",
        "Practical language coaching for work, study and everyday confidence. Private sessions in Arat Kilo, at your pace.",
        (10, 19),
        ["Sunday"],
        [("English conversation coaching", 60, 650), ("Amharic starter session", 45, 550)],
        ["Abel Fikru"],
        ["Arat Kilo learning room", "Arat Kilo conversation room"],
    ),
]


def state_path():
    return Path(frappe.get_site_path("private", "rich-demo-v1.json")).resolve()


def require_target():
    if not (
        frappe.local.site.endswith(".localhost")
        and frappe.conf.get("worktree_development")
        and frappe.conf.get("rich_demo_enabled") == 1
        and frappe.conf.get("mute_emails")
        and frappe.conf.get("pause_scheduler")
    ):
        frappe.throw(
            "Rich demo requires an explicitly enabled isolated .localhost site, muted email and paused scheduler."
        )
    if frappe.session.user != "Administrator":
        frappe.throw("Run the demo command as the site Administrator.", frappe.PermissionError)


@contextmanager
def local_side_effects():
    """Keep cleanup in the transaction and omit unrelated CRM contact generation."""
    enqueue = frappe.enqueue

    def scoped_enqueue(method, **kwargs):
        if method == "frappe.core.doctype.user.user.create_contact":
            return None
        if method == "frappe.model.delete_doc.delete_dynamic_links":
            kwargs["now"] = True
        return enqueue(method, **kwargs)

    with patch.object(frappe, "enqueue", scoped_enqueue):
        yield


@contextmanager
def locked():
    require_target()
    path = state_path().with_suffix(".lock")
    fd = os.open(path, os.O_CREAT | os.O_RDWR, 0o600)
    with os.fdopen(fd, "w") as handle:
        fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        old = frappe.flags.syncing_booking_urls
        frappe.flags.syncing_booking_urls = True
        try:
            with local_side_effects():
                yield
        finally:
            frappe.set_user("Administrator")
            frappe.flags.syncing_booking_urls = old


def write_state(state):
    temporary = state_path().with_suffix(".pending")
    fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as handle:
        os.fchmod(handle.fileno(), 0o600)
        json.dump(state, handle, indent=2, default=str)
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temporary, state_path())


def load_state():
    state = json.loads(state_path().read_text())
    if state["site"] != frappe.local.site or state["version"] != VERSION:
        frappe.throw("Manifest site/version mismatch; refusing to reuse or clean it.")
    return state


def remember(state, doctype, name):
    entry = [doctype, name]
    if entry not in state["created"]:
        state["created"].append(entry)
    return name


def insert(state, values):
    doc = frappe.get_doc(values).insert(ignore_permissions=True)
    remember(state, doc.doctype, doc.name)
    return doc


def user(state, key, name, persona):
    email = f"{key}@example.test"
    if frappe.db.exists("User", email):
        frappe.throw(f"Pre-existing account {email}; no credentials or roles have been changed.")
    first, _, last = name.partition(" ")
    doc = insert(
        state,
        dict(
            doctype="User",
            email=email,
            first_name=first,
            last_name=last,
            enabled=1,
            send_welcome_email=0,
            user_type="System User",
            time_zone=TZ,
        ),
    )
    password = frappe.generate_hash(length=28)
    update_password(doc.name, password)
    state["personas"].append(dict(key=key, name=name, email=email, password=password, persona=persona))
    return email


def hours(days, opens, closes):
    return [
        dict(day_of_week=day, is_open=int(day in days), start_time=f"{opens:02}:00:00", end_time=f"{closes:02}:00:00")
        for day in workspace.DAYS
    ]


def configure(state):
    for key, title, owner, category, description, (opens, closes), closed, services, staff, rooms in BUSINESSES:
        days = [d for d in workspace.DAYS if d not in closed]
        email = user(state, f"{key}.owner", owner, "Solo practitioner" if key == "selam" else "Business owner")
        membership.grant_roles(email, ("Provider", "Organization Manager"))
        frappe.set_user(email)
        base = workspace.create(
            title,
            rooms[0],
            services[0][0],
            TZ,
            services[0][1],
            f"{opens:02}:00",
            f"{closes:02}:00",
            days,
            f"rich-demo-v{VERSION}-{key}-workspace",
        )
        event = frappe.get_doc("EventType", base["offering"])
        org = frappe.get_doc("Organization", base["organization"])
        for dt, name in [
            ("Organization", org.name),
            ("Provider", event.provider),
            ("Location", event.location),
            ("Service", event.service),
            ("EventType", event.name),
        ]:
            remember(state, dt, name)
        org.update(
            dict(
                slug=f"{key}-studio",
                description=description,
                organization_type=category,
                email=email,
                require_payment=0,
                primary_color={"bloom": "#a34e6c", "tena": "#137c78"}.get(key, "#5d60a8"),
            )
        )
        org.save(ignore_permissions=True)
        provider = frappe.get_doc("Provider", event.provider)
        provider.update(
            dict(
                full_name=owner,
                display_name=owner,
                email=email,
                bio=description,
                onboarding_type="individual" if key == "selam" else "organization",
                calendar_preference="builtin",
                enable_personal_booking=0,
            )
        )
        provider.save(ignore_permissions=True)
        providers = [provider.name]
        locations = [event.location]
        for room in rooms[1:]:
            locations.append(
                insert(
                    state,
                    dict(
                        doctype="Location",
                        location_name=room,
                        organization=org.name,
                        timezone=TZ,
                        is_active=1,
                        city="Addis Ababa",
                        opening_hours=hours(days, opens, closes),
                    ),
                ).name
            )
        for index, full_name in enumerate(staff):
            account = user(state, f"{key}.provider{index + 1}", full_name, "Provider")
            frappe.set_user(email)
            result = membership.assign_member(org.name, account, "Provider", full_name=full_name)
            remember(state, "Provider", result["provider"])
            remember(state, "Business Membership", result["membership"])
            providers.append(result["provider"])
        # Every clinician owns a room; salons share locations but capacity remains per provider.
        offerings = []
        for index, (label, duration, price) in enumerate(services):
            if index == 0:
                service = frappe.get_doc("Service", event.service)
                service.update(
                    dict(
                        price=price,
                        description=f"{label} at {title}. Please arrive five minutes before your appointment.",
                    )
                )
                service.save(ignore_permissions=True)
            else:
                service = insert(
                    state,
                    dict(
                        doctype="Service",
                        service_name=label,
                        organization=org.name,
                        duration=duration,
                        price=price,
                        description=f"{label} with dedicated one-to-one time.",
                        is_active=1,
                        use_default_hours=1,
                    ),
                )
            for pindex, provider_id in enumerate(providers):
                location = locations[pindex % len(locations)]
                if index == 0 and pindex == 0:
                    offering_id = event.name
                else:
                    offering_id = insert(
                        state,
                        dict(
                            doctype="EventType",
                            event_type_name=label,
                            service=service.name,
                            provider=provider_id,
                            location=location,
                            is_active=1,
                            description=description,
                        ),
                    ).name
                offerings.append(
                    dict(
                        id=offering_id,
                        provider=provider_id,
                        location=location,
                        service=service.name,
                        label=label,
                        duration=duration,
                        provider_index=pindex,
                        path=f"/schedule/org/{org.slug}/{offering_id}",
                    )
                )
        workspace.publish(org.name, 1)
        state["businesses"][key] = dict(
            name=title,
            organization=org.name,
            owner=email,
            days=days,
            opens=opens,
            closes=closes,
            providers=providers,
            locations=locations,
            offerings=offerings,
            public_path=f"/schedule/org/{org.slug}",
            description=description,
        )
        frappe.set_user("Administrator")
    for key, name, persona, assignments in [
        ("bloom.reception", "Mekdes Abebe", "Location-scoped receptionist", [("bloom", "Receptionist", True)]),
        ("tena.reception", "Tigist Worku", "Clinic receptionist", [("tena", "Receptionist", False)]),
        ("bloom.manager", "Biruk Solomon", "Salon manager", [("bloom", "Manager", False)]),
        (
            "multi.manager",
            "Sara Yilma",
            "Multi-business coordinator",
            [("bloom", "Receptionist", False), ("tena", "Manager", False)],
        ),
    ]:
        account = user(state, key, name, persona)
        for business_key, role, scoped in assignments:
            business = state["businesses"][business_key]
            frappe.set_user(business["owner"])
            result = membership.assign_member(
                business["organization"],
                account,
                role,
                full_name=name,
                locations=business["locations"][:1] if scoped else [],
            )
            remember(state, "Business Membership", result["membership"])
        frappe.set_user("Administrator")


def appointments(state):
    anchor = getdate(state["anchor_date"])

    # A process-local clock recreates historical bookings through the same validators.
    # No HTTP handler, site clock or product rule is changed.
    class HistoricalClock(datetime):
        @classmethod
        def now(cls, tz=None):
            instant = datetime.combine(anchor - timedelta(days=100), datetime.min.time()).replace(tzinfo=timezone.utc)
            return instant.astimezone(tz) if tz else instant.replace(tzinfo=None)

    counter = 0
    with patch.object(booking, "datetime", HistoricalClock):
        for business in state["businesses"].values():
            frappe.set_user(business["owner"])
            for offset in range(-89, 31):
                day = anchor + timedelta(days=offset)
                if day.strftime("%A") not in business["days"] or offset in (-9, 6):
                    continue
                for provider in business["providers"]:
                    choices = [e for e in business["offerings"] if e["provider"] == provider]
                    # Busy anchor days, quieter afternoons and intentionally empty days.
                    count = 4 if offset in (-1, 0, 1, 2) else (1 if offset % 3 else 2)
                    for slot in range(count):
                        offering = choices[(slot + offset) % len(choices)]
                        start = datetime.combine(day, datetime.min.time()) + timedelta(
                            hours=business["opens"] + 1 + slot * 2
                        )
                        end = start + timedelta(minutes=offering["duration"])
                        if end.hour > business["closes"] or (end.hour == business["closes"] and end.minute):
                            continue
                        customer_index = (counter // 3) % 20 if counter % 3 == 0 else counter % len(CLIENTS)
                        customer = CLIENTS[customer_index]
                        result = booking.book(
                            offering["id"],
                            start.isoformat() + "+03:00",
                            end.isoformat() + "+03:00",
                            customer,
                            f"guest{customer_index + 1}@example.test",
                            f"rich-demo-v1-booking-{counter:06}",
                            notes="",
                        )
                        name = remember(state, "Appointment", result["booking_id"])
                        doc = frappe.get_doc("Appointment", name)
                        if counter % 13 == 0:
                            booking.change(name, "cancel", str(doc.modified))
                        elif (
                            counter % 17 == 0
                            and end + timedelta(minutes=30) <= datetime.combine(day, datetime.min.time()) + timedelta(hours=business["closes"])
                        ):
                            booking.change(
                                name,
                                "reschedule",
                                str(doc.modified),
                                str(day),
                                (start + timedelta(minutes=30)).strftime("%H:%M"),
                            )
                            state["rescheduled"].append(name)
                        elif offset < 0:
                            doc.status = "No Show" if counter % 11 == 0 else "Completed"
                            doc.save(ignore_permissions=True)
                        state["appointments"].append(name)
                        counter += 1
    frappe.set_user("Administrator")


def summary(state):
    return dict(
        site=state["site"],
        version=state["version"],
        anchor_date=state["anchor_date"],
        credentials_path=str(state_path()),
        counts=dict(Counter(dt for dt, _ in state["created"])),
        personas=[{k: v for k, v in row.items() if k != "password"} for row in state["personas"]],
    )


def seed(base_url="http://127.0.0.174:41960", anchor_date=None):
    with locked():
        if state_path().exists():
            state = load_state()
            missing = [(dt, name) for dt, name in state["created"] if not frappe.db.exists(dt, name)]
            if missing:
                frappe.throw("Incomplete inventory; inspect the private journal before repair. No data changed.")
            if state.get("phase") != "ready":
                state["phase"] = "ready"
                write_state(state)
            return summary(state)
        # Refuse collisions before any role/password or business changes.
        for key, title, *_ in BUSINESSES:
            if frappe.db.exists("Organization", {"organization_name": title}) or frappe.db.exists(
                "Organization", {"slug": f"{key}-studio"}
            ):
                frappe.throw(f"Pre-existing demo business {title}; refusing to adopt it.")
        state = dict(
            version=VERSION,
            site=frappe.local.site,
            phase="prepared",
            base_url=base_url,
            anchor_date=str(getdate(anchor_date or nowdate())),
            created=[],
            personas=[],
            businesses={},
            appointments=[],
            rescheduled=[],
            scenarios=[
                "Public booking",
                "Busy reception",
                "Provider calendar",
                "Location scope",
                "Manager team",
                "Multi-business switching",
                "Cancellation and reschedule",
            ],
        )
        try:
            configure(state)
            appointments(state)
            for persona in state["personas"]:
                frappe.set_user(persona["email"])
                context = membership.context()
                persona["landing"] = context["landing"]
                persona["url"] = base_url + context["landing"]
            frappe.set_user("Administrator")
            for dt, name in list(state["created"]):
                for version in frappe.get_all("Version", filters={"ref_doctype": dt, "docname": name}, pluck="name"):
                    remember(state, "Version", version)
            write_state(state)  # Durable ownership journal precedes database commit.
            frappe.db.commit()
        except Exception:
            frappe.db.rollback()
            raise
        state["phase"] = "ready"
        write_state(state)
        return summary(state)


def cleanup():
    with locked():
        state = load_state()
        # Link checks intentionally remain enabled: later user-created dependents block cleanup.
        priority = {
            "Version": 0,
            "Appointment": 1,
            "Business Membership": 2,
            "EventType": 3,
            "Service": 4,
            "Provider": 5,
            "Location": 6,
            "Organization": 7,
            "User": 8,
        }
        try:
            for dt, name in sorted(state["created"], key=lambda item: priority.get(item[0], 4)):
                if frappe.db.exists(dt, name):
                    if dt == "Version":
                        frappe.db.delete("Version", {"name": name})
                    else:
                        frappe.delete_doc(dt, name, ignore_permissions=True, delete_permanently=True)
            frappe.db.commit()
        except Exception:
            frappe.db.rollback()
            raise
        state_path().unlink()
        return {"removed": len(state["created"]), "site": frappe.local.site}


def browser_values(manifest=None):
    state = load_state()
    from frappe.utils import add_days

    bloom = state["businesses"]["bloom"]
    candidate = frappe.get_all(
        "Appointment",
        filters={
            "organization": bloom["organization"],
            "provider": bloom["providers"][0],
            "appointment_date": add_days(state["anchor_date"], 1),
            "start_time": ["in", ["10:00:00", "11:00:00"]],
        },
        fields=["name", "client_name"],
        limit=1,
    )
    return {"demo_" + key: value["public_path"] for key, value in state["businesses"].items()} | {
        "demo_lifecycle_booking": candidate[0].name if candidate else "",
        "demo_lifecycle_customer": candidate[0].client_name if candidate else "",
        "demo_browser_booking": next(
            (
                name
                for name in state["appointments"]
                if frappe.db.get_value("Appointment", name, "client_email") == "fikir.walkthrough@example.test"
            ),
            "",
        ),
        "demo_today": state["anchor_date"],
        "demo_bloom_offering": state["businesses"]["bloom"]["offerings"][0]["path"],
    }


def enroll_walkthrough_booking(email="fikir.walkthrough@example.test"):
    """Add the exact browser-created appointment to this site's cleanup inventory."""
    with locked():
        state = load_state()
        if email != "fikir.walkthrough@example.test":
            frappe.throw("Only the documented synthetic walkthrough customer may be enrolled.")
        matches = frappe.get_all(
            "Appointment", filters={"client_email": email}, fields=["name", "organization", "creation"]
        )
        if len(matches) != 1 or matches[0].organization != state["businesses"]["bloom"]["organization"]:
            frappe.throw("Expected one Bole walkthrough appointment; inventory is unchanged.")
        if matches[0].creation.timestamp() <= state_path().stat().st_mtime - 1:
            frappe.throw("The appointment predates this seed; refusing to adopt it.")
        name = matches[0].name
        remember(state, "Appointment", name)
        if name not in state["appointments"]:
            state["appointments"].append(name)
        for version in frappe.get_all("Version", filters={"ref_doctype": "Appointment", "docname": name}, pluck="name"):
            remember(state, "Version", version)
        write_state(state)
        return {"booking": name, "inventory_count": len(state["created"])}


def refresh_versions():
    """Inventory history produced by documented staff browser journeys."""
    with locked():
        state = load_state()
        before = len(state["created"])
        for doctype, name in list(state["created"]):
            if doctype != "Appointment":
                continue
            for version in frappe.get_all("Version", filters={"ref_doctype": doctype, "docname": name}, pluck="name"):
                remember(state, "Version", version)
        if len(state["created"]) != before:
            write_state(state)
        return {"new_versions": len(state["created"]) - before, "inventory_count": len(state["created"])}
