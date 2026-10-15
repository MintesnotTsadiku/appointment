"""Customer contacts on the showcase bookings, restricted to the showcase ownership journal.

Phone is the main contact of a customer, so every showcase customer gets a mobile number, a language,
and on a few bookings the other people who come along (`participant_phones`). The walk-ins of the
reception queue get the names and numbers of showcase clients.

The customers are fictional. Their numbers are mobile numbers in E.164 form, because the phone rule
accepts nothing else, but nobody receives a message: the seeder skips customer notifications, the
showcase businesses keep SMS off, and the email addresses use the reserved `example.test` domain.
The public business numbers stay non-dialable placeholders (`placeholder_numbers`).

Only journal-owned records change, and only empty values (and the earlier "Demo walk-in" rows) are
filled, so values a person changed in the app stay. Raise VERSION to run it again.
"""

import hashlib
import re
from collections import Counter

import frappe

VERSION = 1
GUEST_EMAIL = re.compile(r"^guest(\d+)@example\.test$")
WALK_IN_EMAIL = re.compile(r"^walkin(\d+)\.(\w+)@example\.test$")
# Showcases whose bookings sometimes include another person: a family member at the clinic, a friend at the salon.
COMPANIONS = {"tena": (9, 4), "bloom": (15, 7)}


def customer_phone(index):
    """The mobile number of showcase client `index` (`showcase.CLIENTS`). Ergata's clients use +2519112…."""
    return f"+2519113{index + 1:05}"


def companion_phone(seed):
    return f"+2519114{seed % 100000:05}"


def customer_language(index):
    return "am" if index % 3 == 0 else "en"


def walk_in_person(organization, index, status):
    """The showcase client who walks in: (index, name). The same business, provider and status give the same person."""
    from appointment.demo import showcase

    regulars = 20  # The first clients are the regulars who book ahead; walk-ins come from the wider cast.
    digest = int(hashlib.sha256(f"{organization}:{index}:{status}".encode()).hexdigest(), 16)
    client = regulars + digest % (len(showcase.CLIENTS) - regulars)
    return client, showcase.CLIENTS[client]


def configure(state):
    """Fill the contacts. Returns True when this version ran."""
    if (state.get("customer_world") or {}).get("version") == VERSION:
        return False
    owned = {tuple(entry) for entry in state["created"]}
    counts = Counter()
    keys = {business["organization"]: key for key, business in state["businesses"].items()}
    for position, name in enumerate(state["appointments"]):
        if ("Appointment", name) in owned:
            counts["appointments"] += _organization_booking(name, position, keys)
    for info in (state.get("independents") or {}).values():
        couples = {row["id"] for row in info["offerings"] if row["label"].startswith("Couples")}
        for position, name in enumerate(info["appointments"]):
            if ("Appointment", name) in owned:
                counts["appointments"] += _independent_booking(name, position, couples)
    for doctype, name in state["created"]:
        if doctype == "Customer Profile":
            counts["profiles"] += _profile(name)
        elif doctype == "Walk In":
            counts["walk_ins"] += _walk_in(name, keys)
    state["customer_world"] = {"version": VERSION, **counts}
    return True


def _organization_booking(name, position, keys):
    row = frappe.db.get_value("Appointment", name, ["client_email", "client_phone", "participant_phones", "customer_language",
                                                    "organization"], as_dict=True)
    match = GUEST_EMAIL.match(row.client_email or "")
    if not match:
        return 0  # Not a seeded customer, for example a booking made in the browser.
    index = int(match.group(1)) - 1
    values = {}
    if not row.client_phone:
        values["client_phone"] = customer_phone(index)
    if not row.customer_language:
        values["customer_language"] = customer_language(index)
    every, offset = COMPANIONS.get(keys.get(row.organization), (0, 0))
    if every and position % every == offset and not row.participant_phones:
        values["participant_phones"] = companion_phone(position)
    if values:
        frappe.db.set_value("Appointment", name, values, update_modified=False)
    return int(bool(values))


def _independent_booking(name, position, couples):
    """A couples session has the partner's number too."""
    row = frappe.db.get_value("Appointment", name, ["event_type", "participant_phones", "client_email"], as_dict=True)
    if row.event_type not in couples or row.participant_phones or not (row.client_email or "").endswith("@example.test"):
        return 0
    frappe.db.set_value("Appointment", name, "participant_phones", companion_phone(50000 + position), update_modified=False)
    return 1


def _profile(name):
    from appointment.scheduler import business_owner
    from appointment.scheduler.customer_identity import find_by_key

    doc = frappe.get_doc("Customer Profile", name)
    match = GUEST_EMAIL.match(doc.primary_email or "")
    if not match:
        return 0
    index = int(match.group(1)) - 1
    changed = False
    phone = customer_phone(index)
    if not doc.primary_phone and not find_by_key(business_owner.record_key(doc), "", phone).get("phone"):
        doc.primary_phone = phone
        changed = True
    if not doc.preferred_language:
        doc.preferred_language = customer_language(index)
        changed = True
    if changed:
        doc.save(ignore_permissions=True)
    return int(changed)


def _walk_in(name, keys):
    from appointment.helpers.phone import normalize_phone

    row = frappe.db.get_value("Walk In", name, ["client_name", "client_phone", "client_email", "participant_phones", "status",
                                               "assigned_appointment", "location"], as_dict=True)
    match = WALK_IN_EMAIL.match(row.client_email or "")
    if not match:
        return 0
    index, status = int(match.group(1)), match.group(2)
    organization = frappe.db.get_value("Location", row.location, "organization")
    values = {}
    if row.assigned_appointment:
        booked = frappe.db.get_value("Appointment", row.assigned_appointment, ["client_name", "client_phone"], as_dict=True)
        person, phone = booked.client_name, booked.client_phone
    else:
        client, person = walk_in_person(organization, index, status)
        phone = customer_phone(client)
    if (row.client_name or "").startswith("Demo walk-in"):
        values["client_name"] = person
    # An assigned walk-in is the person on its booking; the others replace the earlier non-dialable placeholder.
    if phone and row.client_phone != phone and (row.assigned_appointment or normalize_phone(row.client_phone) != row.client_phone):
        values["client_phone"] = phone
    if status == "waiting" and index == 0 and keys.get(organization) in COMPANIONS and not row.participant_phones:
        values["participant_phones"] = companion_phone(90000 + int(hashlib.sha256(name.encode()).hexdigest(), 16) % 10000)
    if values:
        frappe.db.set_value("Walk In", name, values, update_modified=False)
    return int(bool(values))
