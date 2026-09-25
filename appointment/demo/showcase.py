"""Versioned, local-only walkthrough data. Never exposed as a web endpoint.

Run with bench --site <demo.localhost> execute appointment.demo.showcase.seed.
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
from appointment.public_experience import publish_brand
from appointment.public_experience.showcase_catalog import recipe_assignments, validate_showcase_catalog
from appointment.public_experience.publisher import publish_experience

VERSION = 1
CONTENT_VERSION = 3
PUBLIC_EXPERIENCE_VERSION = 6
TZ = "Africa/Addis_Ababa"
DEMO_BRAND_RECIPES = recipe_assignments()

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
        "Dawit Haile",
        "Healthcare",
        "A small family clinic in CMC with scheduled consultations and clear arrival times. All people and appointments in this demonstration are fictional.",
        (8, 17),
        ["Sunday"],
        [("General consultation", 30, 700), ("Follow-up visit", 30, 450), ("Wellness consultation", 60, 1000)],
        ["Saron Mekonnen", "Yonas Assefa"],
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


# Specific source material for the rich demo. Public sections read the
# identifiers and operational facts back from the seeded domain records before
# publication, so the copy cannot silently drift from the catalog.
DEMO_CONTENT = {
    "selam": {
        "headline": "A steadier way back into movement",
        "description": "Quiet one-to-one movement coaching in Gerji for people building a kinder, more useful routine around work and everyday life.",
        "contact": {"email": "hello.selam@example.test", "phone": "000 000 0101"},
        "audience": "For desk-bound professionals, returning movers and anyone who wants practical guidance without a crowded class.",
        "story": "Selam Movement Practice grew from short, attentive sessions that fit around real working weeks. Each visit starts with listening, then turns into a small set of movements you can understand and repeat.",
        "provider_bios": ["Selam creates calm, practical movement sessions for people returning to activity or trying to make a routine stick."],
        "services": [
            {"name": "Movement consultation", "description": "A 45-minute conversation and movement check-in to understand your routine, goals and a comfortable place to begin.", "preparation": "Wear clothes you can move in and bring one question about your current routine.", "duration": 45, "price": 900},
            {"name": "Guided mobility session", "description": "A spacious one-to-one session with simple mobility work, pacing and a short take-home sequence.", "preparation": "Arrive five minutes early; no previous movement experience is expected.", "duration": 60, "price": 1200},
        ],
        "locations": [{"address_line_1": "Gerji, off CMC Road", "address_line_2": "Blue gate, second floor, room 3", "phone": "000 000 0101", "arrival": "Use the blue gate and allow a few minutes to settle in before the session."}],
        "benefits": [("A quiet start", "Begin with a conversation about your week before any movement is selected."), ("Useful between visits", "Leave with a short sequence that is realistic to repeat at home or at a desk."), ("Paced for you", "Sessions stay one-to-one, with room to pause, ask questions and adjust.")],
        "faq": [("Do I need to be fit already?", "No. The first visit is designed to meet you where you are and choose an appropriate starting point."), ("What should I bring?", "Comfortable clothing and a little context about what you would like to make easier."), ("How do I choose a session?", "Choose Movement consultation for a first conversation or Guided mobility session if you already know you want to practise.")],
        "cta": {"hero_primary": "Start with a consultation", "hero_secondary": "See the two session options", "booking_title": "Make room for a useful hour", "booking_subtitle": "Pick a session and a time that leaves your week feeling more workable.", "booking_primary": "Find a movement time"},
        "trust": "One practitioner, one private studio, and a deliberately small menu of sessions.",
    },
    "meron": {
        "headline": "Clothes that fit the person wearing them",
        "description": "A Kazanchis atelier for careful fittings, thoughtful alterations and occasion pieces shaped around how you actually want to move.",
        "contact": {"email": "atelier.meron@example.test", "phone": "000 000 0102"},
        "audience": "For people preparing a special outfit, refining a favourite garment or looking for an attentive first fitting.",
        "story": "Meron Tailoring Atelier keeps the fitting table at the centre of the process. Measurements, fabric, movement and the occasion are considered together before a needle touches the garment.",
        "provider_bios": ["Meron leads each fitting with a practical eye for proportion, comfort and the small details that make a garment feel like yours."],
        "services": [
            {"name": "First fitting", "description": "A focused fitting appointment to review the garment, take measurements and agree the alteration plan before work begins.", "preparation": "Bring the garment, the shoes or layers you expect to wear with it, and any reference for the intended fit.", "duration": 30, "price": 350},
            {"name": "Occasion wear consultation", "description": "A longer atelier conversation for an occasion outfit, covering silhouette, fabric choices, timing and the next fitting.", "preparation": "Bring inspiration, a preferred fabric if you have one, and the date you are working towards.", "duration": 60, "price": 700},
        ],
        "locations": [{"address_line_1": "Kazanchis, near the old railway station", "address_line_2": "Courtyard atelier, ground floor", "phone": "000 000 0102", "arrival": "Look for the courtyard entrance; the fitting room is at the back of the ground-floor atelier."}],
        "benefits": [("A measured plan", "Leave the first fitting knowing what will change, what will stay and what happens next."), ("Fit before finish", "Appointments make space to test comfort and movement, not only the mirror view."), ("A human-scale atelier", "One fitting table keeps the conversation direct from first measurement to final adjustment.")],
        "faq": [("Should I bring the shoes for my outfit?", "Yes, especially for trousers, skirts or occasion pieces where the finished length matters."), ("Can I book an alteration without a consultation?", "Start with First fitting so the garment and the intended result can be reviewed together."), ("How far ahead should I book?", "Bring your event date to the consultation; the atelier will discuss a realistic fitting sequence.")],
        "cta": {"hero_primary": "Reserve a fitting", "hero_secondary": "Compare the atelier appointments", "booking_title": "Bring the garment; bring the occasion", "booking_subtitle": "Choose the appointment that gives your piece the right amount of attention.", "booking_primary": "Book an atelier visit"},
        "trust": "A single Kazanchis fitting room, clear next steps and no promise of a finished piece before the garment is assessed.",
    },
    "bloom": {
        "headline": "Natural hair care, with time to breathe",
        "description": "A Bole neighbourhood studio for natural hair care, fresh cuts and unrushed styling, with a choice of stylists and two different rooms.",
        "contact": {"email": "hello.bloom@example.test", "phone": "000 000 0103"},
        "audience": "For clients who want a clear plan for wash day, a considered shape or a calmer styling appointment.",
        "story": "Bole Bloom Hair Studio was set up for appointments that do not feel hurried. The team talks through texture, routine and the look you want, then chooses the right pace and room for the service.",
        "provider_bios": ["Hanna helps clients turn a big hair decision into a manageable appointment, from first wash-and-finish visits to shape changes.", "Rahel brings a patient, detail-led approach to wash care and styling, with special attention to an easy home routine.", "Eden enjoys precise shaping and calm consultations that make room for questions about texture, length and upkeep."],
        "services": [
            {"name": "Wash and finish", "description": "A complete wash, condition and finish shaped around your texture, preferred volume and the time you have today.", "preparation": "Arrive with hair detangled if possible and mention any products or sensitivities at the start.", "duration": 60, "price": 1100},
            {"name": "Cut and shape", "description": "A 45-minute shape appointment with a clear conversation about length, movement and how the cut should behave between visits.", "preparation": "Bring one or two references if helpful; the stylist will confirm the shape before cutting.", "duration": 45, "price": 850},
            {"name": "Scalp care consultation", "description": "A short, practical conversation about your wash routine, comfort and the products already in your bathroom.", "preparation": "Bring a list or photo of products you use if you would like to review them together.", "duration": 30, "price": 500},
        ],
        "locations": [{"address_line_1": "Bole, off Africa Avenue", "address_line_2": "Main studio, first floor above the bookshop", "phone": "000 000 0103", "arrival": "The main studio is upstairs above the bookshop; please arrive with enough time to choose your room."}, {"address_line_1": "Bole, off Africa Avenue", "address_line_2": "Quiet styling room, rear entrance", "phone": "000 000 0103", "arrival": "Ask at the main entrance for the quiet room; the team will guide you through the rear entrance."}],
        "benefits": [("A conversation before the chair", "Talk through texture, time and the result you want before the service begins."), ("Two room options", "Choose the lively main studio or the quieter styling room when the appointment allows."), ("A routine you can repeat", "Leave with practical language for caring for your hair between visits.")],
        "faq": [("Which stylist should I choose?", "Choose Hanna for a broad plan, Rahel for wash-care detail or Eden for shaping and a precise cut conversation."), ("Can I request the quiet room?", "Yes. Select an available appointment and mention the quiet room in your notes; room availability is shown with the booking."), ("What if I am not sure which service fits?", "Start with Scalp care consultation if the main question is your routine, or book a wash and finish for a service-led visit.")],
        "cta": {"hero_primary": "Choose your studio appointment", "hero_secondary": "Meet the three stylists", "booking_title": "Your hair appointment can have a little more time", "booking_subtitle": "Choose a service, stylist and room that fit the kind of visit you want.", "booking_primary": "See Bole availability"},
        "trust": "Three stylists, two rooms and an appointment menu that keeps the conversation visible.",
    },
    "tena": {
        "headline": "Scheduled family appointments, clearly explained",
        "description": "A small CMC clinic offering scheduled consultations, practical arrival information and a calm place to discuss everyday family health questions.",
        "contact": {"email": "appointments.tena@example.test", "phone": "000 000 0104"},
        "audience": "For families and individuals looking for a booked consultation time and straightforward information about what to bring.",
        "story": "Tena Family Clinic is organised around appointment time and clear communication. The team keeps the visit focused, explains the next step in plain language and directs urgent concerns to appropriate services.",
        "provider_bios": ["Dawit provides scheduled family consultations with attention to the client’s questions, visit context and agreed follow-up steps.", "Saron supports booked consultations with a careful listening style and clear explanations of what the appointment can cover.", "Yonas focuses on making routine follow-up visits organised, respectful and easy to navigate."],
        "services": [
            {"name": "General consultation", "description": "A scheduled 30-minute consultation for discussing the concern you bring, relevant context and reasonable next steps.", "preparation": "Bring a list of current medicines or questions if relevant; urgent symptoms should be directed to emergency services.", "duration": 30, "price": 700},
            {"name": "Follow-up visit", "description": "A focused appointment to review an earlier conversation, clarify questions and record the next agreed action.", "preparation": "Bring any notes or instructions from your previous visit and arrive with your questions ready.", "duration": 30, "price": 450},
            {"name": "Wellness consultation", "description": "A longer conversation about everyday wellbeing, routines and questions you would like to discuss with a clinician.", "preparation": "Set aside the full hour and bring any routine or family context that would help the conversation.", "duration": 60, "price": 1000},
        ],
        "locations": [{"address_line_1": "CMC, off Equatorial Guinea Street", "address_line_2": "Tena building, ground floor reception", "phone": "000 000 0104", "arrival": "Check in at the ground-floor reception and arrive 10 minutes early for a scheduled consultation."}, {"address_line_1": "CMC, off Equatorial Guinea Street", "address_line_2": "Tena building, consultation room two", "phone": "000 000 0104", "arrival": "Reception will direct you to the assigned consultation room; appointments are not walk-in visits in this demo."}, {"address_line_1": "CMC, off Equatorial Guinea Street", "address_line_2": "Tena building, consultation room three", "phone": "000 000 0104", "arrival": "Bring your booking details to reception so the team can confirm the room and appointment time."}],
        "benefits": [("A booked time", "Select a provider and appointment slot before arriving instead of waiting without a scheduled time."), ("Plain-language next steps", "The visit makes room to clarify what was discussed and what should happen next."), ("Respectful boundaries", "The site explains what the appointment covers and reminds visitors to use urgent services for emergencies.")],
        "faq": [("Is this an emergency service?", "No. This demonstration is for scheduled consultations; urgent or emergency concerns should be directed to appropriate emergency services."), ("What should I bring?", "Bring your booking details and any relevant questions, medicine list or previous visit notes."), ("Can I book a walk-in slot?", "No. Choose an available scheduled appointment so the clinic can prepare for your visit.")],
        "cta": {"hero_primary": "Choose a consultation time", "hero_secondary": "Read arrival information", "booking_title": "Choose a clear time for the conversation", "booking_subtitle": "Select the consultation, provider and CMC room that fit your visit.", "booking_primary": "View clinic appointments"},
        "trust": "Fictional demonstration content: scheduled consultations only, with no emergency promise and no substitute for professional medical advice.",
    },
    "abugida": {
        "headline": "Language practice for the moments that matter",
        "description": "Practical English and Amharic coaching in Arat Kilo for work, study and everyday conversations, at a pace you can keep.",
        "contact": {"email": "learn.abugida@example.test", "phone": "000 000 0105"},
        "audience": "For learners preparing for a workplace conversation, a study goal or a more confident day-to-day exchange.",
        "story": "Abugida Language Studio treats language practice as a regular habit rather than a performance. Sessions use real situations, useful phrases and a clear next step for the week ahead.",
        "provider_bios": ["Kalkidan builds structured practice around the learner’s real situations, from workplace introductions to longer conversations.", "Abel brings a patient, example-rich style to Amharic and English practice, with room to repeat, ask and try again."],
        "services": [
            {"name": "English conversation coaching", "description": "A 60-minute practice session using work, study or everyday scenarios chosen with the learner.", "preparation": "Bring one situation you expect to face soon, such as an introduction, meeting or phone call.", "duration": 60, "price": 650},
            {"name": "Amharic starter session", "description": "A welcoming 45-minute introduction to useful Amharic phrases, pronunciation and a simple practice plan.", "preparation": "No preparation is needed; bring a situation where you would like to use a few new phrases.", "duration": 45, "price": 550},
        ],
        "locations": [{"address_line_1": "Arat Kilo, near the university gate", "address_line_2": "Learning room, second floor above the stationery shop", "phone": "000 000 0105", "arrival": "Enter above the stationery shop and ask for the learning room; plan a few minutes for the stairs."}, {"address_line_1": "Arat Kilo, near the university gate", "address_line_2": "Conversation room, second floor, room 4", "phone": "000 000 0105", "arrival": "The conversation room is marked at the end of the second-floor corridor."}],
        "benefits": [("Situations, not worksheets", "Practise the conversations you are likely to have at work, in class and around town."), ("A small weekly step", "Each session ends with one manageable prompt to try before the next visit."), ("Room to try again", "Private practice makes it easier to pause, repeat a phrase and ask what sounds natural.")],
        "faq": [("Do I need to know any Amharic?", "No. The starter session is designed for a first useful set of phrases and sounds."), ("Can sessions focus on work?", "Yes. Bring a meeting, introduction, email or phone situation you would like to rehearse."), ("Which room will I use?", "Your booking shows the assigned learning or conversation room; both are in the Arat Kilo studio.")],
        "cta": {"hero_primary": "Choose your first practice", "hero_secondary": "See the coaching options", "booking_title": "Put one real conversation on the calendar", "booking_subtitle": "Choose a language, a provider and a practice room for the next step.", "booking_primary": "Book a language session"},
        "trust": "Two coaches, two focused rooms and session prompts grounded in the learner’s own situations.",
    },
}



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
        enrich_business_records(key, state["businesses"][key])
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


def enrich_business_records(key, business):
    """Apply the versioned content world to the real seeded domain records."""
    detail = DEMO_CONTENT[key]
    organization = frappe.get_doc("Organization", business["organization"])
    organization.update(
        {
            "description": detail["description"],
            "email": detail["contact"]["email"],
            "phone": detail["contact"]["phone"],
            "timezone": TZ,
            "language": "en",
            "enable_public_booking": 1,
            "allow_provider_selection": 1,
        }
    )
    organization.save(ignore_permissions=True)

    for index, provider_id in enumerate(business["providers"]):
        provider = frappe.get_doc("Provider", provider_id)
        # Keep names in the actual Provider records, while bios carry the
        # differentiated specialty and operating style.
        name_map = {
            "selam": ["Selam Bekele"],
            "meron": ["Meron Alemu"],
            "bloom": ["Hanna Tesfaye", "Rahel Girma", "Eden Tadesse"],
            "tena": ["Dawit Haile", "Saron Mekonnen", "Yonas Assefa"],
            "abugida": ["Kalkidan Getachew", "Abel Fikru"],
        }
        provider.update(
            {
                "full_name": name_map[key][index],
                "display_name": name_map[key][index],
                "email": business["owner"] if index == 0 else f"{key}.provider{index}@example.test",
                "bio": detail["provider_bios"][index],
                "timezone": TZ,
                "language": "en",
                "business_type": {"selam": "other", "meron": "other", "bloom": "salon", "tena": "clinic", "abugida": "university"}[key],
                "onboarding_type": "individual" if key == "selam" else "organization",
            }
        )
        provider.save(ignore_permissions=True)

    for index, location_id in enumerate(business["locations"]):
        location = frappe.get_doc("Location", location_id)
        location_detail = detail["locations"][index]
        location.update(
            {
                "address_line_1": location_detail["address_line_1"],
                "address_line_2": location_detail["address_line_2"],
                "city": "Addis Ababa",
                "phone": location_detail["phone"],
                "timezone": TZ,
                "opening_hours": hours(business["days"], business["opens"], business["closes"]),
                "is_active": 1,
            }
        )
        location.save(ignore_permissions=True)

    service_ids = []
    for offering in business["offerings"]:
        if offering["service"] not in service_ids:
            service_ids.append(offering["service"])
    for index, service_id in enumerate(service_ids):
        service_detail = detail["services"][index]
        service = frappe.get_doc("Service", service_id)
        service.update(
            {
                "service_name": service_detail["name"],
                "duration": service_detail["duration"],
                "price": service_detail["price"],
                "description": service_detail["description"],
                "is_active": 1,
                "use_default_hours": 1,
            }
        )
        service.save(ignore_permissions=True)
        for offering in business["offerings"]:
            if offering["service"] == service_id and frappe.db.exists("EventType", offering["id"]):
                event = frappe.get_doc("EventType", offering["id"])
                event.update({"event_type_name": service_detail["name"], "description": service_detail["description"]})
                event.save(ignore_permissions=True)
        for offering in business["offerings"]:
            if offering["service"] == service_id:
                offering.update({"label": service_detail["name"], "duration": service_detail["duration"]})

    business["description"] = detail["description"]
    business["content_version"] = CONTENT_VERSION


def enrich_seeded_records(state):
    for key, business in state["businesses"].items():
        enrich_business_records(key, business)
    state["content_version"] = CONTENT_VERSION


def _localized(text):
    return {"en": text}


def _action(label, intent, placement="inline"):
    return {"intent": intent, "label": _localized(label), "placement": placement}


def _section_rows(rows):
    return rows


def _public_section_rows(key, business):
    detail = DEMO_CONTENT[key]
    service_ids = []
    for offering in business["offerings"]:
        if offering["service"] not in service_ids:
            service_ids.append(offering["service"])
    services = [frappe.get_doc("Service", service_id) for service_id in service_ids]
    providers = [frappe.get_doc("Provider", provider_id) for provider_id in business["providers"]]
    locations = [frappe.get_doc("Location", location_id) for location_id in business["locations"]]
    days = ", ".join(business["days"])
    closed = ", ".join(day for day in workspace.DAYS if day not in business["days"])
    hours_text = f"Open {days}, {business['opens']:02}:00–{business['closes']:02}:00 East Africa Time; closed {closed}."
    service_items = []
    for index, service in enumerate(services):
        service_detail = detail["services"][index]
        service_items.append(
            {
                "id": service.name,
                "name": _localized(service.service_name),
                "summary": _localized(
                    f"{service.description} {service.duration} minutes · ETB {int(service.price):,}. Preparation: {service_detail['preparation']}"
                ),
                "durationMinutes": int(service.duration),
                "price": float(service.price),
                "currency": "ETB",
                "action": _action(f"Choose {service.service_name}", "service_selection"),
            }
        )
    provider_role = {
        "selam": "Movement guide",
        "meron": "Atelier lead",
        "bloom": "Stylist",
        "tena": "Clinician",
        "abugida": "Language coach",
    }[key]
    provider_specialties = {
        "selam": ["Movement coaching", "Mobility practice"],
        "meron": ["Fittings", "Alterations"],
        "bloom": ["Natural hair care", "Styling"],
        "tena": ["Family consultations", "Everyday health questions"],
        "abugida": ["Conversation practice", "Useful phrases"],
    }[key]
    provider_items = [
        {
            "id": provider.name,
            "name": _localized(provider.display_name or provider.full_name or provider.provider_name),
            "role": _localized(provider_role),
            "specialties": [_localized(value) for value in provider_specialties],
            "credentials": [_localized("Provider profile available before booking")],
            "imageRole": "section.detail",
            "action": _action("Choose this provider", "provider_selection"),
        }
        for provider in providers
    ]
    location_items = []
    for index, location in enumerate(locations):
        address = ", ".join(part for part in (location.address_line_1, location.address_line_2, location.city) if part)
        location_items.append(
            {
                "id": location.name,
                "name": _localized(location.location_name),
                "address": _localized(address),
                "phone": location.phone,
                "hours": _localized(f"{hours_text} {detail['locations'][index]['arrival']}"),
                "directionsAction": _action("Get directions", "directions"),
            }
        )
    process_items = [
        {"step": 1, "title": _localized("Choose an appointment"), "description": _localized("Start with the service that best matches the question, goal or visit you have in mind.")},
        {"step": 2, "title": _localized("Share what you need"), "description": _localized("Use the appointment notes and the first conversation to give your provider useful context.")},
        {"step": 3, "title": _localized("Arrive with a clear next step"), "description": _localized(detail["trust"] + " The visit ends with a practical next step to carry forward.")},
    ]
    benefit_items = [
        {"title": _localized(title), "description": _localized(description), "icon": f"benefit-{index + 1}"}
        for index, (title, description) in enumerate(detail["benefits"])
    ]
    faq_items = [{"question": _localized(question), "answer": _localized(answer)} for question, answer in detail["faq"]]
    testimonial_attribution = {
        "selam": "Liya Tadesse · fictional demo client",
        "meron": "Mimi Kebede · fictional demo client",
        "bloom": "Rahel Alemu · fictional demo client",
        "tena": "Abel Girma · fictional demo client",
        "abugida": "Sara Yilma · fictional demo client",
    }[key]
    testimonial_quote = {
        "selam": "The first visit gave me one small routine I could actually return to.",
        "meron": "I left the fitting knowing what would change and what the next visit was for.",
        "bloom": "The conversation made it easier to choose the right service instead of guessing.",
        "tena": "The arrival details made a scheduled clinic visit feel much less uncertain.",
        "abugida": "Practising a situation I was about to face made the next conversation feel possible.",
    }[key]
    proof_items = [
        {"label": _localized("Appointment style"), "value": _localized("One-to-one"), "detail": _localized("A focused visit with a named provider.")},
        {"label": _localized("Service menu"), "value": _localized(f"{len(service_items)} options"), "detail": _localized("A small menu that is easier to compare.")},
        {"label": _localized("Addis locations"), "value": _localized(str(len(location_items))), "detail": _localized("Arrival details are shown before you book.")},
    ]
    section_rows = [
        ("hero", {"eyebrow": _localized(business["name"]), "title": _localized(detail["headline"]), "subtitle": _localized(detail["description"]), "primaryAction": _action(detail["cta"]["hero_primary"], "booking_start", "primary"), "secondaryAction": _action(detail["cta"]["hero_secondary"], "faq_jump", "secondary"), "imageRole": "hero.primary"}),
        ("services", {"title": _localized({"selam": "Choose a pace that fits your week", "meron": "Start with the right atelier conversation", "bloom": "Pick the kind of hair day you want", "tena": "Select the appointment that fits the question", "abugida": "Choose a useful place to practise"}[key]), "intro": _localized(detail["audience"]), "items": service_items}),
        ("providers", {"title": _localized({"selam": "Your movement guide", "meron": "The person at the fitting table", "bloom": "Meet the Bole Bloom team", "tena": "The scheduled consultation team", "abugida": "Your language practice partners"}[key]), "intro": _localized("Meet the people who hold the appointment with you."), "items": provider_items}),
        ("process", {"title": _localized("A clear path into the visit"), "intro": _localized("The public site explains the shape of the appointment before the scheduler takes over."), "items": process_items}),
        ("benefits", {"title": _localized("Small details that make the visit easier"), "items": benefit_items}),
        ("testimonials", {"title": _localized("What the experience is meant to feel like"), "intro": _localized("Fictional demonstration feedback, included to show the complete recipe surface."), "items": [{"quote": _localized(testimonial_quote), "attribution": _localized(testimonial_attribution), "role": _localized("Fictional demonstration"), "consent": True}]}),
        ("proof", {"title": _localized("The useful facts, at a glance"), "items": proof_items}),
        ("locations", {"title": _localized({"selam": "A private Gerji studio", "meron": "Find the Kazanchis atelier", "bloom": "Choose your Bole room", "tena": "Arrive at CMC", "abugida": "Find the Arat Kilo rooms"}[key]), "intro": _localized("Know where to go and what to expect when you arrive."), "items": location_items}),
        ("about", {"title": _localized({"selam": "Movement that belongs in real life", "meron": "The atelier approach", "bloom": "A calmer salon appointment", "tena": "How Tena appointments work", "abugida": "Practice for real situations"}[key]), "body": _localized(f"{detail['story']} {detail['audience']} {detail['trust']}"), "highlights": [_localized(title) for title, _ in detail["benefits"]], "imageRole": "section.detail"}),
        ("faq", {"title": _localized({"selam": "Before your first movement visit", "meron": "Before you come to the atelier", "bloom": "Before your Bole appointment", "tena": "Before a clinic consultation", "abugida": "Before your first practice"}[key]), "items": faq_items}),
        ("contact", {"title": _localized({"selam": "Plan a quieter arrival", "meron": "Plan your fitting visit", "bloom": "Plan your studio visit", "tena": "Know before you arrive", "abugida": "Make the room easy to find"}[key]), "body": _localized(f"{detail['locations'][0]['arrival']} {hours_text} {detail['audience']}"), "phone": detail["contact"]["phone"], "email": detail["contact"]["email"], "action": _action("Call to ask a question", "call", "primary")}),
        ("booking_cta", {"title": _localized(detail["cta"]["booking_title"]), "body": _localized(detail["cta"]["booking_subtitle"]), "action": _action(detail["cta"]["booking_primary"], "booking_start", "primary")}),
        ("footer", {"title": _localized(business["name"]), "body": _localized(f"{detail['trust']} All demonstration details are fictional and appointments are scheduled in {TZ}."), "items": [{"label": _localized("Book an appointment"), "action": _action("Book an appointment", "booking_start", "tertiary")}, {"label": _localized("Contact the team"), "action": _action("Contact the team", "contact", "tertiary")}]}),
    ]
    return _section_rows(section_rows)


def _rich_release_for(site, headline, recipe_key):
    if not site or not site.current_release:
        return None
    if not frappe.db.exists("Experience Release", site.current_release):
        return None
    release = frappe.get_doc("Experience Release", site.current_release)
    active_revision = frappe.db.get_value("Brand Profile", site.brand_profile, "active_revision")
    if not active_revision or release.brand_revision != active_revision:
        return None
    try:
        snapshot = json.loads(release.normalized_json)
    except (TypeError, ValueError):
        return None
    sections = {section.get("type"): section.get("content", {}) for section in snapshot.get("sections", [])}
    if snapshot.get("recipeKey") != recipe_key:
        return None
    if sections.get("hero", {}).get("title", {}).get("en") != headline:
        return None
    if snapshot.get("contentSchemaVersion") != 2 or len(snapshot.get("sections", [])) != 13:
        return None
    return release


def configure_public_experience(state):
    """Create or upgrade one realistic, published site per seeded Business."""

    if state.get("public_experience_version") == PUBLIC_EXPERIENCE_VERSION and state.get("content_version") == CONTENT_VERSION:
        return
    for key, business in state["businesses"].items():
        owner = business["owner"]
        organization = business["organization"]
        slug = frappe.db.get_value("Organization", organization, "slug")
        frappe.set_user(owner)
        profile = None
        site = None
        upgrading = bool(business.get("brand_profile") and business.get("public_site"))
        if upgrading:
            profile = frappe.get_doc("Brand Profile", business["brand_profile"])
            site = frappe.get_doc("Public Site", business["public_site"])

        brand = DEMO_BRAND_RECIPES[key]
        profile_values = {
            "profile_name": f"{business['name']} brand",
            "application_name": business["name"],
            "short_name": business["name"].split()[0],
            "owner_type": "Organization",
            "organization": organization,
            "provider": None,
            "recipe_key": brand["recipe"],
            "recipe_version": 1,
            "brand_inputs_json": json.dumps({"motion": "calm", "presentationDensity": brand["density"], "heroAsset": brand["hero"], "detailAsset": brand["detail"]}, sort_keys=True),
            "lifecycle": "Draft",
        }
        if profile is None:
            profile = insert(state, {"doctype": "Brand Profile", **profile_values})
        else:
            profile.update(profile_values)
            profile.save(ignore_permissions=True)
        revision = publish_brand(profile, profile.draft_version)
        remember(state, "Brand Revision", revision.name)

        section_rows = _public_section_rows(key, business)
        existing_rich_release = _rich_release_for(site, DEMO_CONTENT[key]["headline"], brand["recipe"])
        if existing_rich_release:
            release = existing_rich_release
            remember(state, "Experience Release", release.name)
            for outbox in frappe.get_all("Public Experience Outbox", filters={"idempotency_key": ["like", f"publish:{site.name}:%"]}, pluck="name"):
                remember(state, "Public Experience Outbox", outbox)
            business["brand_profile"] = profile.name
            business["public_site"] = site.name
            business["experience_release"] = release.name
            business["public_experience_path"] = f"/{slug}"
            frappe.set_user("Administrator")
            continue
        public_site_values = {
            "site_title": business["name"],
            "slug": slug,
            "owner_type": "Organization",
            "organization": organization,
            "brand_profile": profile.name,
            "recipe_key": brand["recipe"],
            "recipe_version": 1,
            "content_schema_version": 2,
            "default_locale": "en",
            "enabled_locales": [{"locale": "en", "enabled": 1, "is_default": 1, "translation_status": "Complete"}],
            "seo_json": json.dumps({"title": f"{business['name']} | {DEMO_CONTENT[key]['headline']}", "description": business["description"]}),
            "booking_json": json.dumps({"showPrices": True, "currency": "ETB", "timezone": TZ, "arrivalNote": DEMO_CONTENT[key]["locations"][0]["arrival"]}),
            "public_booking_enabled": 1,
            "sections": [{"section_id": f"{key}-{index}-{section_type}", "section_type": section_type, "order_index": index, "content_json": json.dumps(content)} for index, (section_type, content) in enumerate(section_rows, start=1)],
        }
        if site is None:
            site = insert(state, {"doctype": "Public Site", **public_site_values})
        else:
            public_site_values.update({"status": "Draft", "current_release": None})
            site.update(public_site_values)
            site.save(ignore_permissions=True)
        release = publish_experience(site, site.draft_version)
        remember(state, "Experience Release", release.name)
        for outbox in frappe.get_all("Public Experience Outbox", filters={"idempotency_key": ["like", f"publish:{site.name}:%"]}, pluck="name"):
            remember(state, "Public Experience Outbox", outbox)
        business["brand_profile"] = profile.name
        business["public_site"] = site.name
        business["experience_release"] = release.name
        business["public_experience_path"] = f"/{slug}"
        frappe.set_user("Administrator")
    state["content_version"] = CONTENT_VERSION
    state["public_experience_version"] = PUBLIC_EXPERIENCE_VERSION

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
    validate_showcase_catalog()
    with locked():
        if state_path().exists():
            state = load_state()
            missing = [(dt, name) for dt, name in state["created"] if not frappe.db.exists(dt, name)]
            if missing:
                frappe.throw("Incomplete inventory; inspect the private journal before repair. No data changed.")
            needs_phase_write = state.get("phase") != "ready"
            needs_content_upgrade = state.get("content_version") != CONTENT_VERSION
            needs_public_upgrade = state.get("public_experience_version") != PUBLIC_EXPERIENCE_VERSION
            if needs_phase_write:
                state["phase"] = "ready"
            if needs_content_upgrade:
                enrich_seeded_records(state)
            if needs_public_upgrade or needs_content_upgrade:
                configure_public_experience(state)
            if needs_phase_write or needs_content_upgrade or needs_public_upgrade:
                for dt, name in list(state["created"]):
                    for version in frappe.get_all("Version", filters={"ref_doctype": dt, "docname": name}, pluck="name"):
                        remember(state, "Version", version)
                write_state(state)
                frappe.db.commit()
            return summary(state)
        # Refuse collisions before any role/password or business changes.
        for key, title, *_ in BUSINESSES:
            if frappe.db.exists("Organization", {"organization_name": title}) or frappe.db.exists(
                "Organization", {"slug": f"{key}-studio"}
            ):
                frappe.throw(f"Pre-existing demo business {title}; refusing to adopt it.")
        state = dict(
            version=VERSION,
            content_version=CONTENT_VERSION,
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
            configure_public_experience(state)
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
            "Public Experience Outbox": 1,
            "Experience Release": 2,
            "Public Site": 3,
            "Brand Revision": 4,
            "Brand Profile": 5,
            "Appointment": 6,
            "Business Membership": 7,
            "EventType": 8,
            "Service": 9,
            "Provider": 10,
            "Location": 11,
            "Organization": 12,
            "User": 13,
        }
        try:
            for dt, name in sorted(state["created"], key=lambda item: priority.get(item[0], 4)):
                if frappe.db.exists(dt, name):
                    if dt == "Version":
                        frappe.db.delete("Version", {"name": name})
                    elif dt in {"Public Experience Outbox", "Experience Release", "Brand Revision"}:
                        frappe.db.delete(dt, {"name": name})
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
    public_paths = {
        "demo_" + key: value.get("public_experience_path", value["public_path"])
        for key, value in state["businesses"].items()
    }
    surface_paths = {
        name: path
        for key, value in state["businesses"].items()
        for name, path in (
            (f"demo_{key}_book", value.get("public_experience_path", value["public_path"]) + "/book"),
            (f"demo_{key}_scheduler", value["public_path"]),
        )
    }
    return public_paths | surface_paths | {
        "demo_scheduler_paths": {key: value["public_path"] for key, value in state["businesses"].items()},
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
