"""Independent-provider showcases in the rich demo journal.

An independent showcase is one practitioner who is the business: no organization, their own office and
online locations, sessions, a provider page and a published website on a certified recipe. The definitions
live next to this module (`ergata_showcase.py`) and the QA fixtures use the same ones.

The journal keeps them in `state["independents"][key]`, apart from `state["businesses"]`, because the
organization worlds (content, analytics, dashboards, reception) read every business as an organization.
Every record made here is also in `state["created"]`, so the integrity check, `retire_businesses` and
`cleanup` cover it. Called only by the guarded seeder (`appointment.demo.showcase.seed`).
"""

import hashlib
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import frappe
from frappe.utils import getdate

from appointment.demo import ergata_showcase, independent_showcase, new_template_showcases

SHOWCASES = {definition.key: definition for definition in (ergata_showcase.SHOWCASE, *new_template_showcases.SHOWCASES)}
# Raise it when the authored booking facts change; the next seed writes them again on the owned bookings.
FACTS_VERSION = 3
# Clients of a one-person practice: a smaller, steadier group than a salon's, as in real counselling work.
CLIENTS = (
    "Meskerem Alemu", "Tewodros Bekele", "Hirut Desta", "Getnet Ayalew", "Rahwa Tesfay", "Bereket Haile",
    "Tsion Mulugeta", "Ermias Wondimu", "Feven Gebremedhin", "Yonatan Lemma", "Hanna Kassa", "Mesfin Tadesse",
    "Saba Negash", "Dawit Woldemariam", "Liya Girma", "Selam Abera",
)


def validate():
    """Every definition is complete and matches its catalog entry."""
    from appointment.public_experience.showcase_catalog import load_showcase_catalog

    catalog = load_showcase_catalog()["sites"]
    for key, definition in SHOWCASES.items():
        entry = catalog.get(key)
        if not entry or (entry["slug"], entry["recipe"]) != (definition.slug, definition.recipe):
            frappe.throw(f"Independent showcase {key} does not match its catalog entry.")
        missing = independent_showcase.problems(definition)
        if missing:
            frappe.throw(f"Independent showcase {key} is incomplete: {', '.join(missing)}.")


def configure(state, base_url):
    """Add the missing showcases and refresh outdated ones. Returns the keys that changed."""
    from appointment.demo import showcase

    validate()
    independents = state.setdefault("independents", {})
    changed = []
    for key, definition in SHOWCASES.items():
        if key in independents:
            if independents[key].get("facts_version") != FACTS_VERSION:
                rewrite_facts(independents[key])
                changed.append(key)
            if independents[key].get("version") != definition.version:
                record = lambda doctype, name: showcase.remember(state, doctype, name)  # noqa: E731
                independent_showcase.refresh(definition, independents[key], record)
                independents[key]["version"] = definition.version
                changed.append(key)
            continue
        refuse_collisions(definition)
        add(state, definition, base_url)
        changed.append(key)
    return changed


def refuse_collisions(definition):
    found = independent_showcase.collisions(definition)
    if found:
        hint = f" If the QA fixture made them, run {definition.qa_fixture}.cleanup first." if definition.qa_fixture else ""
        frappe.throw(f"Pre-existing records for {definition.business} ({'; '.join(found)}); refusing to adopt them.{hint}")


def add(state, definition, base_url):
    from appointment.demo import showcase
    from appointment.scheduler import membership

    known = len(state["personas"])
    email = showcase.user(state, f"{definition.key}.owner", definition.full_name, definition.persona,
                          email=definition.owner_email)
    membership.grant_roles(email, ("Provider",))
    built = independent_showcase.build(definition, lambda doctype, name: showcase.remember(state, doctype, name))
    built.update(name=definition.business, owner=email, version=definition.version, appointments=[])
    state["independents"][definition.key] = built
    history(state, definition)
    showcase.record_landings(state["personas"][known:], base_url)


def history(state, definition):
    """Past and upcoming sessions through the normal booking rules, online and at the office.

    Like the organization showcases: a process-local clock books the past through the same validators,
    past sessions end Completed or No Show, a few are cancelled, and each booking gets the same authored
    lifecycle facts as the analytics world.
    """
    from appointment.demo import showcase
    from appointment.scheduler import booking

    info = state["independents"][definition.key]
    anchor = getdate(state["anchor_date"])
    office, online = definition.office, definition.online

    class HistoricalClock(datetime):
        @classmethod
        def now(cls, tz=None):
            instant = datetime.combine(anchor - timedelta(days=100), datetime.min.time()).replace(tzinfo=timezone.utc)
            return instant.astimezone(tz) if tz else instant.replace(tzinfo=None)

    counter = 0
    frappe.set_user(info["owner"])
    try:
        with patch.object(booking, "datetime", HistoricalClock):
            for offset in range(-89, 31):
                day = anchor + timedelta(days=offset)
                if day.strftime("%A") not in definition.open_days or offset in (-9, 6):
                    continue
                count = 3 if offset in (-1, 0, 1, 2) else (1 if offset % 3 else 2)
                busy_until = None
                for slot in range(count):
                    offering = info["offerings"][(slot + offset) % len(info["offerings"])]
                    place = office if offering["meet"] == "in_person" else online
                    start = datetime.combine(day, datetime.min.time()) + timedelta(hours=max(place.opens, 9) + 1 + slot * 2)
                    end = start + timedelta(minutes=offering["duration"])
                    if end > datetime.combine(day, datetime.min.time()) + timedelta(hours=place.closes):
                        continue
                    if busy_until and start < busy_until:
                        continue
                    busy_until = end
                    client = (counter * 7 + offset) % len(CLIENTS)
                    name = _book(state, info, offering, start, end, client, counter)
                    doc = frappe.get_doc("Appointment", name)
                    if counter % 13 == 0:
                        booking.change(name, "cancel", str(doc.modified))
                    elif offset < 0:
                        doc.status = "No Show" if counter % 11 == 0 else "Completed"
                        doc.save(ignore_permissions=True)
                    doc.reload()
                    frappe.db.set_value("Appointment", name, _facts(doc, counter), update_modified=False)
                    counter += 1
    finally:
        frappe.set_user("Administrator")
    info["facts_version"] = FACTS_VERSION
    for name in frappe.get_all("Appointment Notification", filters={"appointment": ["in", info["appointments"] or [""]]}, pluck="name"):
        showcase.remember(state, "Appointment Notification", name)
    return counter


def _facts(doc, index):
    """The analytics world's authored lifecycle facts.

    Its source 2 is a walk-in, which this practice does not take, so those bookings use an online index.
    """
    from appointment.demo.analytics_world import appointment_values

    return appointment_values(doc, index - 2 if index % 4 == 2 else index)


def rewrite_facts(info):
    """Write the current authored facts on the owned bookings again, in booking order.

    A booking that a person changed in the app (a lifecycle event that is not synthetic) keeps its facts.
    """
    import json

    for index, name in enumerate(info["appointments"]):
        doc = frappe.get_doc("Appointment", name)
        events = json.loads(doc.workflow_events or "[]")
        if not all(event.get("synthetic_demo") for event in events):
            continue
        frappe.db.set_value("Appointment", name, _facts(doc, index), update_modified=False)
    info["facts_version"] = FACTS_VERSION


def _book(state, info, offering, start, end, client, counter):
    from appointment.demo import showcase
    from appointment.scheduler import booking

    person = CLIENTS[client]
    handle = person.lower().replace(" ", ".")
    request = f"rich-demo-v1-{hashlib.sha256(info['provider'].encode()).hexdigest()[:8]}-session-{counter:05}"
    result = booking.book(
        offering["id"], start.isoformat() + "+03:00", end.isoformat() + "+03:00", person, f"{handle}@example.test",
        request, user_phone=f"+2519112{client + 1:05}", notes="", language="am" if client % 3 == 0 else "en",
    )
    name = showcase.remember(state, "Appointment", result["booking_id"])
    customer = frappe.db.get_value("Appointment", name, "customer")
    # The booking created this profile only when it is the profile's first booking.
    if customer and frappe.db.count("Appointment", {"customer": customer}) == 1:
        showcase.remember(state, "Customer Profile", customer)
    info["appointments"].append(name)
    return name


def paths(state):
    """Browser paths of the seeded independent showcases, for QA values."""
    values = {}
    for key, info in (state.get("independents") or {}).items():
        values[f"demo_{key}"] = info["public_path"]
        values[f"demo_{key}_book"] = info["public_path"] + "/book"
        values[f"demo_{key}_provider_page"] = info["provider_page"]
    return values


def seeded(key):
    """The journal entry of a seeded independent showcase, or None. Read only; never takes the seeder lock."""
    from appointment.demo import showcase

    if not showcase.state_path().exists():
        return None
    try:
        state = showcase.load_state()
    except Exception:
        return None
    info = (state.get("independents") or {}).get(key)
    if not info or not frappe.db.exists("Public Site", info.get("public_site") or ""):
        return None
    return {**info, "created": [entry for entry in state["created"]]}
