"""QA fixtures for the Ergata Therapy template (`qa/manifests/growth/template-ergata*.yaml`).

`setup()` creates, and records by exact name:

- Tsion Hailu Counselling: an independent counselling psychologist (owner tsion.hailu.counselling@example.test)
  with six session types (introductory call, first session, in person, online video, phone, couples), one
  Old Airport room, and a published Ergata website at `/tsion-counselling` in English and Amharic. The draft
  starts from guided website setup (`setup.start`), so the recipe's starter copy is used, then the showcase
  facts (credentials, practice story, session copy in both languages) replace it before publishing.
- Hiwot Family Therapy Centre: a small group practice (organization, owner
  hiwot.family.therapy@example.test) with no website yet, so its owner sees the template chooser.

The people, places and credentials are fictional. `cleanup()` deletes only what this module recorded: every
delete uses one exact name or one exact single-value filter, and it does nothing when the record is empty.
"""

import json
import secrets

import frappe

from appointment.demo import showcase

STATE_KEY = "appointment_template_ergata_qa"
SOLO = "tsion.hailu.counselling@example.test"
PRACTICE_OWNER = "hiwot.family.therapy@example.test"
BUSINESS = "Tsion Hailu Counselling"
PRACTICE = "Hiwot Family Therapy Centre"
SLUG = "tsion-counselling"
TZ = "Africa/Addis_Ababa"
DAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
OPEN_DAYS = [day for day in DAYS if day != "Sunday"]
ASSETS = "/assets/appointment/brand-experience/"
PHONE = "000 000 0106"


def t(en, am):
    return {"en": en, "am": am}


def act(intent, en, am, placement="inline"):
    return {"intent": intent, "label": t(en, am), "placement": placement}


# name, duration, price, English summary, Amharic name, Amharic summary
SESSIONS = (
    ("Free introductory call", 15, 0,
     "A short phone call to ask questions and see whether we are a good fit. No preparation needed.",
     "ነጻ የትውውቅ ጥሪ", "ጥያቄዎችዎን ለመጠየቅ እና እንደምንስማማ ለማየት የሚደረግ አጭር የስልክ ጥሪ። ምንም ዝግጅት አያስፈልግም።"),
    ("First session, in person", 60, 1500,
     "A longer first meeting to understand what brings you, agree on confidentiality and choose a first focus.",
     "የመጀመሪያ ቆይታ በአካል", "ወደዚህ ያመጣዎትን ለመረዳት፣ በሚስጥራዊነት ላይ ለመስማማት እና የመጀመሪያ ትኩረት ለመምረጥ የሚደረግ ረዘም ያለ ቆይታ።"),
    ("Individual session, in person", 50, 1200,
     "The regular one-to-one session in the quiet Old Airport room.",
     "የግል ቆይታ በአካል", "ጸጥ ባለው የኦልድ ኤርፖርት ክፍል የሚደረግ መደበኛ የአንድ ለአንድ ቆይታ።"),
    ("Online video session", 50, 1200,
     "The same session over a secure video link, from anywhere you feel private and comfortable.",
     "የኦንላይን ቪዲዮ ቆይታ", "ተመሳሳይ ቆይታ በደህንነቱ በተጠበቀ የቪዲዮ ማስፈንጠሪያ፣ ግላዊ እና ምቹ ከሆነልዎ ቦታ።"),
    ("Phone session", 50, 1000,
     "For days when video is hard: a full session by phone.",
     "የስልክ ቆይታ", "ቪዲዮ በሚያስቸግርበት ቀን፣ ሙሉ ቆይታ በስልክ።"),
    ("Couples session", 80, 2000,
     "Time for both of you to be heard, with a calm structure for difficult conversations.",
     "የጥንዶች ቆይታ", "ሁለታችሁም እንድትደመጡ፣ ለአስቸጋሪ ንግግሮች የተረጋጋ አቀራረብ ያለው ቆይታ።"),
)


def setup():
    frappe.set_user("Administrator")
    cleanup()
    state = {"users": [], "providers": [], "organizations": [], "sites": []}
    _save(state)  # Recorded first, so a failed setup can still be cleaned.
    previous = frappe.flags.syncing_booking_urls
    frappe.flags.syncing_booking_urls = True
    try:
        _solo_practice(state)
        _group_practice(state)
    finally:
        frappe.flags.syncing_booking_urls = previous
        frappe.set_user("Administrator")
        _save(state)
    frappe.db.commit()
    return {"slug": SLUG, "site": (state.get("sites") or [None])[0], "practice": (state.get("organizations") or [None])[0]}


def browser_values(manifest=None):
    values = showcase.browser_values(manifest) if showcase.state_path().exists() else {}
    state = _state()
    values["qa_ergata_slug"] = SLUG
    values["qa_ergata_owner"] = SOLO
    values["qa_ergata_practice_owner"] = PRACTICE_OWNER
    values["qa_ergata_practice"] = (state.get("organizations") or [""])[0]
    return values


def _user(state, email, first, last):
    frappe.get_doc(dict(doctype="User", email=email, first_name=first, last_name=last, send_welcome_email=0, enabled=1,
                        user_type="System User", time_zone=TZ, roles=[{"role": "Provider"}])).insert(ignore_permissions=True)
    state["users"].append(email)
    _save(state)


def _solo_practice(state):
    from appointment.public_experience import setup as website, solo_setup
    from appointment.scheduler import independent
    from appointment.scheduler.booking import offering

    _user(state, SOLO, "Tsion", "Hailu")
    frappe.set_user(SOLO)
    provider = solo_setup.create(BUSINESS)["provider"]
    state["providers"].append(provider)
    _save(state)
    first = SESSIONS[1]
    row = independent.create(provider, "Old Airport counselling room", first[0], TZ, first[1], "09:00", "18:00", OPEN_DAYS)
    frappe.set_user("Administrator")
    event = frappe.get_doc("EventType", row["offering"])
    location = frappe.get_doc("Location", event.location)
    location.update({"address_line_1": "Old Airport area, green gate, first floor, room 2", "city": "Addis Ababa",
                     "phone": PHONE, "timezone": TZ})
    location.save(ignore_permissions=True)
    services = {}
    for name, duration, price, summary, *_ in SESSIONS:
        if name == first[0]:
            service = frappe.get_doc("Service", event.service)
            service.update({"price": price, "description": summary})
            service.save(ignore_permissions=True)
        else:
            service = frappe.get_doc({"doctype": "Service", "service_name": name, "independent_provider": provider,
                                      "duration": duration, "price": price, "description": summary,
                                      "use_default_hours": 1, "is_active": 1}).insert(ignore_permissions=True)
            created = frappe.get_doc({"doctype": "EventType", "event_type_name": name, "service": service.name,
                                      "location": location.name, "provider": provider, "is_active": 1}).insert(ignore_permissions=True)
            offering(created.name)
        services[name] = service.name
    doc = frappe.get_doc("Provider", provider)
    doc.update({"full_name": "Tsion Hailu", "display_name": "Tsion Hailu", "timezone": TZ,
                "bio": "Counselling psychologist in Addis Ababa. Individual and couples sessions in Amharic and English."})
    doc.save(ignore_permissions=True)
    frappe.db.set_value("User", SOLO, "user_image", ASSETS + "providers/tsion-hailu.webp")
    frappe.set_user(SOLO)
    independent.publish(provider, 1)
    draft = website.start("Provider", provider, BUSINESS, SLUG, "ergata-therapy", {"industry": "therapy", "main_action": "booking"})
    frappe.set_user("Administrator")
    state["sites"].append(draft["site"])
    _save(state)
    site = frappe.get_doc("Public Site", draft["site"])
    profile = frappe.get_doc("Brand Profile", site.brand_profile)
    profile.update({"logo_primary": ASSETS + "brands/ergata-showcase-logo.webp", "logo_compact": ASSETS + "brands/ergata-showcase-logo.webp",
                    "favicon": ASSETS + "brands/ergata-showcase-favicon.png", "short_name": "Tsion"})
    profile.save(ignore_permissions=True)
    starter = {row.section_type: json.loads(row.content_json) for row in site.sections}
    content = _showcase_sections(starter, provider, location.name, services)
    for row in site.sections:
        row.content_json = json.dumps(content[row.section_type])
    if "am" not in [row.locale for row in site.enabled_locales]:
        site.append("enabled_locales", {"locale": "am", "enabled": 1, "translation_status": "Complete"})
    site.seo_json = json.dumps({"title": "Tsion Hailu Counselling | Addis Ababa",
                                "description": "Confidential counselling and psychotherapy in Addis Ababa, in person or online, in Amharic or English."})
    site.booking_json = json.dumps({"showPrices": True, "currency": "ETB", "timezone": TZ})
    site.save(ignore_permissions=True)
    frappe.set_user(SOLO)
    website.publish(site.name, frappe.db.get_value("Public Site", site.name, "draft_version"))


def _showcase_sections(starter, provider, location, services):
    """The showcase replaces starter copy with one practitioner's facts; the structure stays the recipe's."""
    content = dict(starter)
    hero = dict(starter["hero"])
    hero.update({
        "eyebrow": t("Counselling psychologist · Addis Ababa", "የምክር ሥነ-ልቦና ባለሙያ · አዲስ አበባ"),
        "body": t("Confidential. No referral needed. Sessions in Amharic or English.",
                  "ሚስጥራዊ ነው። ሪፈራል አያስፈልግም። ቆይታዎች በአማርኛ ወይም በእንግሊዝኛ።"),
    })
    content["hero"] = hero
    content["about"] = {
        "title": t("Hello, I am Tsion", "ሰላም፣ ጽዮን እባላለሁ"),
        "body": t("I am a counselling psychologist with twelve years of practice in Addis Ababa: first in a university counselling centre, then in a hospital outpatient clinic, and now in my own quiet room near Old Airport.\n\n"
                  "Many people tell me they waited a long time before reaching out. That is normal. My work is to make the first step lighter: we go at your pace, in the language that feels most like you, and nothing is shared without your agreement.",
                  "በአዲስ አበባ ለአሥራ ሁለት ዓመታት የሠራሁ የምክር ሥነ-ልቦና ባለሙያ ነኝ፤ መጀመሪያ በአንድ ዩኒቨርሲቲ የምክር ማዕከል፣ ከዚያም በሆስፒታል የተመላላሽ ክሊኒክ፣ አሁን ደግሞ በኦልድ ኤርፖርት አካባቢ ባለው ጸጥ ያለ ክፍሌ።\n\n"
                  "ብዙ ሰዎች እርዳታ ከመጠየቃቸው በፊት ረጅም ጊዜ እንደጠበቁ ይነግሩኛል። ይህ የተለመደ ነው። የእኔ ሥራ የመጀመሪያውን እርምጃ ማቅለል ነው፤ በእርስዎ ፍጥነት፣ ይበልጥ በሚገልጽዎ ቋንቋ እንሄዳለን፤ ያለ እርስዎ ፈቃድም ምንም ነገር አይነገርም።"),
        "highlights": [t("Amharic and English", "አማርኛ እና እንግሊዝኛ"), t("In person, video and phone", "በአካል፣ በቪዲዮ እና በስልክ"),
                       t("Adults and couples", "አዋቂዎች እና ጥንዶች")],
        "image": ASSETS + "support/ergata/room.webp",
        "imageAlt": t("Two soft armchairs face each other across a small wooden table in a sunlit counselling room.",
                      "ፀሐይ በገባበት የምክር ክፍል ውስጥ ሁለት ምቹ ወንበሮች በትንሽ የእንጨት ጠረጴዛ ዙሪያ ፊት ለፊት ተቀምጠዋል።"),
    }
    content["services"] = {**starter["services"], "items": [
        {"id": services[name], "name": t(name, name_am), "summary": t(summary, summary_am), "durationMinutes": duration,
         "price": price, "currency": "ETB", "action": act("service_selection", "Book this session", "ይህን ቆይታ ይያዙ")}
        for name, duration, price, summary, name_am, summary_am in SESSIONS]}
    content["providers"] = {**starter["providers"], "items": [{
        "id": provider[:64], "name": t("Tsion Hailu", "ጽዮን ኃይሉ"), "role": t("Counselling psychologist", "የምክር ሥነ-ልቦና ባለሙያ"),
        "specialties": [t("Anxiety", "ጭንቀት"), t("Grief", "ሐዘን"), t("Burnout", "መዛል"), t("Couples", "ጥንዶች")],
        "credentials": [t("Twelve years in practice", "የአሥራ ሁለት ዓመት ልምድ"), t("Trauma-informed care", "ጉዳትን ያገናዘበ እንክብካቤ"),
                        t("Regular clinical supervision", "መደበኛ የክሊኒካል ክትትል")],
        "image": ASSETS + "providers/tsion-hailu.webp",
        "imageAlt": t("Portrait of Tsion Hailu in a white cotton scarf, smiling gently.", "ነጭ የጥጥ ሻርፕ የለበሰችው ጽዮን ኃይሉ በፈገግታ።"),
        "action": act("provider_selection", "Book with Tsion", "ከጽዮን ጋር ቀጠሮ ይያዙ"),
    }]}
    content["proof"] = {**starter["proof"], "items": [
        {"label": t("Degree", "ትምህርት"), "value": t("MA, Counselling Psychology", "ኤምኤ፣ የምክር ሥነ-ልቦና"), "detail": t("Addis Ababa University", "አዲስ አበባ ዩኒቨርሲቲ")},
        {"label": t("Licence", "ፈቃድ"), "value": t("Licensed counselling psychologist", "ፈቃድ ያላት የምክር ሥነ-ልቦና ባለሙያ"), "detail": t("Addis Ababa City Health Bureau", "የአዲስ አበባ ከተማ ጤና ቢሮ")},
        {"label": t("Membership", "አባልነት"), "value": t("Ethiopian Psychologists' Association", "የኢትዮጵያ ሥነ-ልቦና ባለሙያዎች ማኅበር")},
        {"label": t("Supervision", "ክትትል"), "value": t("Clinical supervision every two weeks", "በየሁለት ሳምንቱ የክሊኒካል ክትትል"), "detail": t("With a senior clinical psychologist", "ከከፍተኛ የክሊኒካል ሥነ-ልቦና ባለሙያ ጋር")},
    ]}
    content["locations"] = {**starter["locations"],
        "intro": t("A quiet first-floor room with its own entrance, a short walk from the Old Airport roundabout.",
                   "የራሱ መግቢያ ያለው ጸጥ ያለ የአንደኛ ፎቅ ክፍል፤ ከኦልድ ኤርፖርት አደባባይ በእግር አጭር መንገድ።"),
        "items": [{"id": location[:64], "name": t("Old Airport counselling room", "የኦልድ ኤርፖርት የምክር ክፍል"),
                   "address": t("Old Airport area, green gate, first floor, room 2, Addis Ababa", "ኦልድ ኤርፖርት አካባቢ፣ አረንጓዴ በር፣ አንደኛ ፎቅ፣ ክፍል 2፣ አዲስ አበባ"),
                   "phone": PHONE,
                   "hours": t("Monday to Saturday, 09:00–18:00. Online sessions by arrangement.", "ከሰኞ እስከ ቅዳሜ፣ 09:00–18:00። የኦንላይን ቆይታዎች በቀጠሮ።"),
                   "directionsAction": act("directions", "Get directions", "አቅጣጫ ያግኙ"),
                   "image": ASSETS + "support/ergata/path.webp",
                   "imageAlt": t("A stone path between green plants leads to an open wooden door in a quiet courtyard.",
                                 "በአረንጓዴ ተክሎች መካከል ያለ የድንጋይ መንገድ ጸጥ ባለ ግቢ ውስጥ ወደተከፈተ የእንጨት በር ያመራል።")}]}
    content["contact"] = {**starter["contact"], "phone": PHONE,
        "body": t("Call or send a message with any question before you book. Messages are read only by Tsion and answered within one working day.",
                  "ከመያዝዎ በፊት ማንኛውም ጥያቄ ካለዎት ይደውሉ ወይም መልእክት ይላኩ። መልእክቶች የሚነበቡት በጽዮን ብቻ ሲሆን በአንድ የሥራ ቀን ውስጥ ምላሽ ያገኛሉ።"),
        "action": act("call", "Call Tsion", "ለጽዮን ይደውሉ", "primary")}
    faq = list(starter["faq"]["items"])
    faq[-1] = {"question": t("How do I pay?", "እንዴት ነው የምከፍለው?"),
               "answer": t("Fees are shown next to each session. You can pay by Telebirr, bank transfer or cash at the session. If cost is a barrier, ask about the small number of reduced-fee places.",
                           "ክፍያው ከእያንዳንዱ ቆይታ አጠገብ ይታያል። በቴሌብር፣ በባንክ ዝውውር ወይም በቆይታው ዕለት በጥሬ ገንዘብ መክፈል ይችላሉ። ወጪው እንቅፋት ከሆነብዎ፣ ስለ ጥቂት የቅናሽ ቦታዎች ይጠይቁ።")}
    faq.append({"question": t("Is online therapy as helpful as meeting in person?", "የኦንላይን ሕክምና እንደ አካል ቆይታ ይጠቅማል?"),
                "answer": t("For many people, yes. Choose a quiet, private place with a steady connection. You receive a secure video link before the session.",
                            "ለብዙ ሰዎች አዎ። ጸጥ ያለ፣ ግላዊ ቦታ እና የተረጋጋ ኢንተርኔት ይምረጡ። ከቆይታው በፊት ደህንነቱ የተጠበቀ የቪዲዮ ማስፈንጠሪያ ይደርስዎታል።")})
    content["faq"] = {**starter["faq"], "items": faq}
    content["footer"] = {"body": t("Counselling and psychotherapy in Addis Ababa, in Amharic and English.",
                                   "በአዲስ አበባ የምክር እና የሥነ-ልቦና ሕክምና አገልግሎት፣ በአማርኛ እና በእንግሊዝኛ።"), "items": []}
    return content


def _group_practice(state):
    from appointment.scheduler import workspace

    _user(state, PRACTICE_OWNER, "Hiwot", "Alemayehu")
    frappe.set_user(PRACTICE_OWNER)
    row = workspace.create(PRACTICE, f"{PRACTICE}, Sarbet", "Family therapy session", TZ, 60, "09:00", "18:00",
                           OPEN_DAYS, "template-ergata-" + secrets.token_hex(8))
    frappe.set_user("Administrator")
    state["organizations"].append(row["organization"])
    _save(state)


def cleanup():
    """Delete what `setup` recorded. Nothing is filtered by a list or an empty value."""
    frappe.set_user("Administrator")
    state = _state()
    if not any(state.get(key) for key in ("users", "providers", "organizations", "sites")):
        return
    previous = frappe.flags.syncing_booking_urls
    frappe.flags.syncing_booking_urls = True
    try:
        for site in state.get("sites") or []:
            _remove_site(site)
        for provider in state.get("providers") or []:
            _remove_business("independent_provider", provider, provider=provider)
            _delete_one("Provider", provider)
        for organization in state.get("organizations") or []:
            _remove_business("organization", organization)
            _delete_where("Business Membership", "organization", organization)
            for name in frappe.get_all("Provider Organization", filters={"organization": organization, "parenttype": "Provider"}, pluck="parent"):
                _delete_one("Provider", name)
            _delete_one("Organization", organization)
        for user in state.get("users") or []:
            _delete_where("Provider", "user", user)
            _delete_where("Business Membership", "user", user)
            _delete_one("User", user)
    finally:
        frappe.flags.syncing_booking_urls = previous
    frappe.db.set_default(STATE_KEY, "")
    frappe.db.commit()


def _remove_site(site):
    _require(site)
    if not frappe.db.exists("Public Site", site):
        return
    profile = frappe.db.get_value("Public Site", site, "brand_profile")
    _delete_where("Public Site Slug Alias", "public_site", site)
    frappe.db.set_value("Public Site", site, "current_release", None, update_modified=False)
    for doctype in ("Published Content Release", "Experience Release"):
        if frappe.db.exists("DocType", doctype):
            for name in frappe.get_all(doctype, filters={"public_site": site}, pluck="name"):
                frappe.db.delete(doctype, {"name": name})
    for outbox in frappe.get_all("Public Experience Outbox", filters={"idempotency_key": ["like", f"publish:{site}:%"]}, pluck="name"):
        _delete_one("Public Experience Outbox", outbox)
    _delete_one("Public Site", site)
    if profile:
        frappe.db.set_value("Brand Profile", profile, "active_revision", None, update_modified=False)
        for revision in frappe.get_all("Brand Revision", filters={"brand_profile": profile}, pluck="name"):
            frappe.db.delete("Brand Revision", {"name": revision})
        _delete_one("Brand Profile", profile)


def _remove_business(field, value, provider=None):
    _require(value)
    bookings = frappe.get_all("Appointment", filters={"provider": provider} if provider else {"organization": value}, pluck="name")
    for name in bookings:
        _delete_where("Appointment Notification", "appointment", name)
        _delete_one("Appointment", name)
    for service in frappe.get_all("Service", filters={field: value}, pluck="name"):
        _delete_where("EventType", "service", service)
        _delete_one("Service", service)
    for doctype in ("Customer Profile", "Location"):
        _delete_where(doctype, field, value)


def _delete_where(doctype, field, value):
    _require(value)
    for name in frappe.get_all(doctype, filters={field: value}, pluck="name"):
        _delete_one(doctype, name)


def _delete_one(doctype, name):
    _require(name)
    if frappe.db.exists(doctype, name):
        frappe.delete_doc(doctype, name, ignore_permissions=True, force=True)


def _require(value):
    if not isinstance(value, str) or not value.strip():
        raise ValueError("Refusing a cleanup filter without one exact value.")


def _state():
    return json.loads(frappe.db.get_default(STATE_KEY) or "{}")


def _save(state):
    frappe.db.set_default(STATE_KEY, json.dumps(state))
