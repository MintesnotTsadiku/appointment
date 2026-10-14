"""QA fixtures for the Ergata Therapy template (`qa/manifests/growth/template-ergata*.yaml`).

`setup()` creates, and records by exact name:

- Yared Tesfaye Counselling: an independent counselling psychologist (owner yared.tesfaye.counselling@example.test)
  who meets clients in an office in Bole and over online video. Two Location records (the Bole office and an
  online video room without a street address) and six offerings: a free introductory video call, a first session
  and a regular session in each format, and a couples session at the office. Each offering is its own scheduler,
  so a visitor chooses online or office when they book. A published Ergata website at `/yared-counselling` in
  English and Amharic. The draft starts from guided website setup (`setup.start`), so the recipe's starter copy
  is used, then the showcase facts (credentials, practice story, session and place copy in both languages)
  replace it before publishing.
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
SOLO = "yared.tesfaye.counselling@example.test"
PRACTICE_OWNER = "hiwot.family.therapy@example.test"
BUSINESS = "Yared Tesfaye Counselling"
PRACTICE = "Hiwot Family Therapy Centre"
SLUG = "yared-counselling"
TZ = "Africa/Addis_Ababa"
DAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
OPEN_DAYS = [day for day in DAYS if day != "Sunday"]
ASSETS = "/assets/appointment/brand-experience/"
PHONE = "000 000 0106"
OFFICE = "Bole counselling office"
ONLINE = "Online video room"
OFFICE_ADDRESS = "Cameroon Street, Tsehay Building, second floor, office 204"
# A fictional Google Meet room in the real link shape. Only booked customers get it (docs/growth/ONLINE_LOCATIONS.md).
MEETING_LINK = "https://meet.google.com/ytc-room-one"
PLATFORM = "Google Meet"
QA_CLIENT = "Selamawit Bekele"
QA_CLIENT_EMAIL = "selamawit.bekele@example.test"


def t(en, am):
    return {"en": en, "am": am}


def act(intent, en, am, placement="inline"):
    return {"intent": intent, "label": t(en, am), "placement": placement}


# name, duration, price, format, English summary, Amharic name, Amharic summary
SESSIONS = (
    ("Free introductory call", 15, 0, "online",
     "A short video call to ask questions and see whether we are a good fit. No preparation needed.",
     "ነጻ የትውውቅ ጥሪ", "ጥያቄዎችዎን ለመጠየቅ እና እንደምንስማማ ለማየት የሚደረግ አጭር የቪዲዮ ጥሪ። ምንም ዝግጅት አያስፈልግም።"),
    ("First session at the office", 60, 1500, "in_person",
     "A longer first meeting in the Bole office to understand what brings you, agree on confidentiality and choose a first focus.",
     "የመጀመሪያ ቆይታ በቢሮ", "ወደዚህ ያመጣዎትን ለመረዳት፣ በሚስጥራዊነት ላይ ለመስማማት እና የመጀመሪያ ትኩረት ለመምረጥ በቦሌው ቢሮ የሚደረግ ረዘም ያለ ቆይታ።"),
    ("First session online", 60, 1500, "online",
     "The same first meeting over a secure video link, from a quiet place where you can talk freely.",
     "የመጀመሪያ ቆይታ በኦንላይን", "ተመሳሳይ የመጀመሪያ ቆይታ በደህንነቱ በተጠበቀ የቪዲዮ ማስፈንጠሪያ፣ በነጻነት ማውራት ከሚችሉበት ጸጥ ያለ ቦታ።"),
    ("Individual session at the office", 50, 1200, "in_person",
     "The regular one-to-one session in the quiet Bole office.",
     "የግል ቆይታ በቢሮ", "ጸጥ ባለው የቦሌ ቢሮ የሚደረግ መደበኛ የአንድ ለአንድ ቆይታ።"),
    ("Individual session online", 50, 1200, "online",
     "The regular session by video, from anywhere you feel private and comfortable.",
     "የግል ቆይታ በኦንላይን", "መደበኛው ቆይታ በቪዲዮ፣ ግላዊ እና ምቹ ከሆነልዎ ከማንኛውም ቦታ።"),
    ("Couples session at the office", 80, 2000, "in_person",
     "Time for both of you to be heard, with a calm structure for difficult conversations.",
     "የጥንዶች ቆይታ በቢሮ", "ሁለታችሁም እንድትደመጡ፣ ለአስቸጋሪ ንግግሮች የተረጋጋ አቀራረብ ያለው ቆይታ።"),
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
    join = state.get("join_booking")
    if join and frappe.db.exists("Appointment", join):
        from appointment.scheduler import self_service

        doc = frappe.get_doc("Appointment", join)
        values["qa_online_manage_path"] = self_service.manage_url(doc).replace(frappe.utils.get_url(), "")
        values["qa_online_booking"] = join
        values["qa_online_client"] = QA_CLIENT
    desk = state.get("desk_booking")
    if desk and frappe.db.exists("Appointment", desk):
        values["qa_online_desk_booking"] = desk
        values["qa_online_desk_date"] = str(frappe.db.get_value("Appointment", desk, "appointment_date"))
    provider = (state.get("providers") or [""])[0]
    if provider:
        values["qa_online_intro_service"] = frappe.db.get_value(
            "Service", {"independent_provider": provider, "service_name": SESSIONS[0][0]}, "name") or ""
    # The owner adds one more online room in `online-location.yaml`; each run takes a free name.
    values["qa_online_new_location"] = next(
        (name for name in ("Evening video room", "Weekend video room", "Morning video room", "Second video room")
         if not frappe.db.exists("Location", {"location_name": name})), "Late video room")
    return values


def _user(state, email, first, last):
    frappe.get_doc(dict(doctype="User", email=email, first_name=first, last_name=last, send_welcome_email=0, enabled=1,
                        user_type="System User", time_zone=TZ, roles=[{"role": "Provider"}])).insert(ignore_permissions=True)
    state["users"].append(email)
    _save(state)


def _online_location(office, provider):
    """The online video room: an Online Location of this provider with a fixed Google Meet link and longer hours."""
    return frappe.get_doc({"doctype": "Location", "location_name": ONLINE, "independent_provider": provider,
                           "timezone": TZ, "phone": PHONE, "is_active": 1, "location_type": "Online",
                           "video_platform": PLATFORM, "meeting_link_mode": "Fixed link", "meeting_link": MEETING_LINK,
                           "opening_hours": [{"day_of_week": row.day_of_week, "is_open": row.is_open,
                                              "start_time": "08:00" if row.is_open else row.start_time,
                                              "end_time": "20:00" if row.is_open else row.end_time}
                                             for row in office.opening_hours]}).insert(ignore_permissions=True)


def _solo_practice(state):
    from appointment.public_experience import setup as website, solo_setup
    from appointment.scheduler import independent
    from appointment.scheduler.booking import offering

    _user(state, SOLO, "Yared", "Tesfaye")
    frappe.set_user(SOLO)
    provider = solo_setup.create(BUSINESS)["provider"]
    state["providers"].append(provider)
    _save(state)
    first = SESSIONS[1]
    row = independent.create(provider, OFFICE, first[0], TZ, first[1], "09:00", "18:00", OPEN_DAYS)
    frappe.set_user("Administrator")
    event = frappe.get_doc("EventType", row["offering"])
    office = frappe.get_doc("Location", event.location)
    office.update({"address_line_1": OFFICE_ADDRESS, "address_line_2": "Bole", "city": "Addis Ababa",
                   "phone": PHONE, "timezone": TZ})
    office.save(ignore_permissions=True)
    online = _online_location(office, provider)
    places = {"in_person": office.name, "online": online.name}
    services = {}
    for name, duration, price, meet, summary, *_ in SESSIONS:
        if name == first[0]:
            service = frappe.get_doc("Service", event.service)
            service.update({"price": price, "description": summary})
            service.save(ignore_permissions=True)
        else:
            service = frappe.get_doc({"doctype": "Service", "service_name": name, "independent_provider": provider,
                                      "duration": duration, "price": price, "description": summary,
                                      "use_default_hours": 1, "is_active": 1}).insert(ignore_permissions=True)
            created = frappe.get_doc({"doctype": "EventType", "event_type_name": name, "service": service.name,
                                      "location": places[meet], "provider": provider, "is_active": 1}).insert(ignore_permissions=True)
            offering(created.name)
        services[name] = service.name
    doc = frappe.get_doc("Provider", provider)
    doc.update({"full_name": "Yared Tesfaye", "display_name": "Yared Tesfaye", "timezone": TZ,
                "spoken_languages": json.dumps(["am", "en"]),  # chips on the provider page
                "bio": "Counselling psychologist in Addis Ababa. Individual and couples sessions in Amharic and English, at the Bole office or online.",
                "bio_am": "በአዲስ አበባ የምክር ሥነ-ልቦና ባለሙያ። የግልና የጥንዶች ምክር በአማርኛና በእንግሊዝኛ፣ በቦሌ ቢሮ ወይም በኦንላይን።"})
    doc.save(ignore_permissions=True)
    frappe.db.set_value("User", SOLO, "user_image", ASSETS + "providers/yared-tesfaye.webp")
    frappe.set_user(SOLO)
    independent.publish(provider, 1)
    draft = website.start("Provider", provider, BUSINESS, SLUG, "ergata-therapy", {"industry": "therapy", "main_action": "booking"})
    frappe.set_user("Administrator")
    state["sites"].append(draft["site"])
    _save(state)
    site = frappe.get_doc("Public Site", draft["site"])
    profile = frappe.get_doc("Brand Profile", site.brand_profile)
    profile.update({"logo_primary": ASSETS + "brands/ergata-showcase-logo.webp", "logo_compact": ASSETS + "brands/ergata-showcase-logo.webp",
                    "favicon": ASSETS + "brands/ergata-showcase-favicon.png", "short_name": "Yared"})
    profile.save(ignore_permissions=True)
    starter = {row.section_type: json.loads(row.content_json) for row in site.sections}
    content = _showcase_sections(starter, provider, places, services)
    for row in site.sections:
        row.content_json = json.dumps(content[row.section_type])
    if "am" not in [row.locale for row in site.enabled_locales]:
        site.append("enabled_locales", {"locale": "am", "enabled": 1, "translation_status": "Complete"})
    site.seo_json = json.dumps({"title": "Yared Tesfaye Counselling | Bole, Addis Ababa and online",
                                "description": "Confidential counselling and psychotherapy in Amharic or English, at an office in Bole, Addis Ababa, or by online video."})
    site.booking_json = json.dumps({"showPrices": True, "currency": "ETB", "timezone": TZ})
    site.save(ignore_permissions=True)
    frappe.set_user(SOLO)
    website.publish(site.name, frappe.db.get_value("Public Site", site.name, "draft_version"))
    frappe.set_user("Administrator")
    state["join_booking"] = _join_ready_booking(services["Individual session online"])
    state["desk_booking"] = _online_booking(services["First session online"], "Dawit Mengistu", "dawit.mengistu@example.test")
    _save(state)


def _online_booking(service, client, email):
    """An online booking at the first free time from tomorrow, through the normal booking lifecycle."""
    from datetime import datetime, timedelta

    import pytz

    from appointment.scheduler import booking

    event = frappe.get_all("EventType", filters={"service": service}, pluck="name", order_by="creation asc", limit=1)[0]
    parts = booking.offering(event, public=True)
    today = datetime.now(pytz.timezone(TZ)).date()
    slot = next(row for offset in range(1, 15)
                for row in booking.open_slots(parts, today + timedelta(days=offset))["all_available_slots_for_data"] if row["available"])
    result = booking.book(event, slot["start_time"], slot["end_time"], client, email,
                          "ergata-online-" + secrets.token_hex(8), user_phone="0911 000 106", language="en")
    return frappe.db.get_value("Appointment", {"appointment_id": result["booking_id"]}, "name")


def _join_ready_booking(service):
    """One online booking whose join window is open now, for the manage page.

    It is booked through the normal lifecycle at the first free time, then its times move to now, because the
    booking rules refuse a start in the past. Only this QA fixture does that.
    """
    from datetime import datetime, timedelta

    import pytz

    name = _online_booking(service, QA_CLIENT, QA_CLIENT_EMAIL)
    zone = pytz.timezone(TZ)
    start = datetime.now(pytz.UTC).replace(second=0, microsecond=0) - timedelta(minutes=5)
    end = start + timedelta(minutes=50)
    local_start, local_end = start.astimezone(zone), end.astimezone(zone)
    naive = lambda value: value.replace(tzinfo=None)  # noqa: E731
    frappe.db.set_value("Appointment", name, {
        "starts_at": naive(start), "ends_at": naive(end), "occupied_from": naive(start), "occupied_until": naive(end),
        "appointment_date": local_start.date(), "start_time": local_start.strftime("%H:%M:%S"), "end_time": local_end.strftime("%H:%M:%S"),
    }, update_modified=False)
    return name


def _showcase_sections(starter, provider, places, services):
    """The showcase replaces starter copy with one practitioner's facts; the structure stays the recipe's."""
    content = dict(starter)
    hero = dict(starter["hero"])
    hero.update({
        "eyebrow": t("Counselling psychologist · Bole office and online", "የምክር ሥነ-ልቦና ባለሙያ · ቦሌ ቢሮ እና ኦንላይን"),
        "body": t("Confidential. No referral needed. Sessions in Amharic or English.",
                  "ሚስጥራዊ ነው። ሪፈራል አያስፈልግም። ቆይታዎች በአማርኛ ወይም በእንግሊዝኛ።"),
    })
    content["hero"] = hero
    content["about"] = {
        "title": t("Hello, I am Yared", "ሰላም፣ ያሬድ እባላለሁ"),
        "body": t("I am a counselling psychologist with twelve years of practice in Addis Ababa: first in a university counselling centre, then in a hospital outpatient clinic, and now in my own quiet office in Bole and online.\n\n"
                  "Many people tell me they waited a long time before reaching out. That is normal. My work is to make the first step lighter: we go at your pace, in the language that feels most like you, and nothing is shared without your agreement.",
                  "በአዲስ አበባ ለአሥራ ሁለት ዓመታት የሠራሁ የምክር ሥነ-ልቦና ባለሙያ ነኝ፤ መጀመሪያ በአንድ ዩኒቨርሲቲ የምክር ማዕከል፣ ከዚያም በሆስፒታል የተመላላሽ ክሊኒክ፣ አሁን ደግሞ ቦሌ በሚገኘው ጸጥ ያለ ቢሮዬ እና በኦንላይን።\n\n"
                  "ብዙ ሰዎች እርዳታ ከመጠየቃቸው በፊት ረጅም ጊዜ እንደጠበቁ ይነግሩኛል። ይህ የተለመደ ነው። የእኔ ሥራ የመጀመሪያውን እርምጃ ማቅለል ነው፤ በእርስዎ ፍጥነት፣ ይበልጥ በሚገልጽዎ ቋንቋ እንሄዳለን፤ ያለ እርስዎ ፈቃድም ምንም ነገር አይነገርም።"),
        "highlights": [t("Amharic and English", "አማርኛ እና እንግሊዝኛ"), t("At the Bole office or online", "በቦሌ ቢሮ ወይም በኦንላይን"),
                       t("Adults and couples", "አዋቂዎች እና ጥንዶች")],
        "image": ASSETS + "support/ergata/room.webp",
        "imageAlt": t("Two soft armchairs face each other across a small wooden table in a sunlit counselling room.",
                      "ፀሐይ በገባበት የምክር ክፍል ውስጥ ሁለት ምቹ ወንበሮች በትንሽ የእንጨት ጠረጴዛ ዙሪያ ፊት ለፊት ተቀምጠዋል።"),
    }
    content["services"] = {**starter["services"],
        "intro": t("Choose how we meet: in the Bole office or by online video. The length and fee are shown before you book.",
                   "እንዴት እንደምንገናኝ ይምረጡ፤ በቦሌ ቢሮ ወይም በኦንላይን ቪዲዮ። የቆይታው ርዝመት እና ክፍያ ከመያዝዎ በፊት ይታያሉ።"),
        "items": [
        {"id": services[name], "name": t(name, name_am), "summary": t(summary, summary_am), "durationMinutes": duration,
         "price": price, "currency": "ETB", "action": act("service_selection", "Book this session", "ይህን ቆይታ ይያዙ")}
        # No `format`: the template reads it from the offering's location (`sessionFormats`).
        for name, duration, price, _meet, summary, name_am, summary_am in SESSIONS]}
    content["providers"] = {**starter["providers"], "items": [{
        "id": provider[:64], "name": t("Yared Tesfaye", "ያሬድ ተስፋዬ"), "role": t("Counselling psychologist", "የምክር ሥነ-ልቦና ባለሙያ"),
        "specialties": [t("Anxiety", "ጭንቀት"), t("Grief", "ሐዘን"), t("Burnout", "መዛል"), t("Couples", "ጥንዶች")],
        "credentials": [t("Twelve years in practice", "የአሥራ ሁለት ዓመት ልምድ"), t("Trauma-informed care", "ጉዳትን ያገናዘበ እንክብካቤ"),
                        t("Regular clinical supervision", "መደበኛ የክሊኒካል ክትትል")],
        "image": ASSETS + "providers/yared-tesfaye.webp",
        "imageAlt": t("Portrait of Yared Tesfaye in a linen shirt and a sage cardigan, with a calm, attentive expression.",
                      "የተልባ እግር ሸሚዝ እና አረንጓዴ ሹራብ የለበሰው ያሬድ ተስፋዬ፣ በተረጋጋና በትኩረት በሚያዳምጥ ገጽታ።"),
        "action": act("provider_selection", "Book with Yared", "ከያሬድ ጋር ቀጠሮ ይያዙ"),
    }]}
    content["proof"] = {**starter["proof"], "items": [
        {"label": t("Degree", "ትምህርት"), "value": t("MA, Counselling Psychology", "ኤምኤ፣ የምክር ሥነ-ልቦና"), "detail": t("Addis Ababa University", "አዲስ አበባ ዩኒቨርሲቲ")},
        {"label": t("Licence", "ፈቃድ"), "value": t("Licensed counselling psychologist", "ፈቃድ ያለው የምክር ሥነ-ልቦና ባለሙያ"), "detail": t("Addis Ababa City Health Bureau", "የአዲስ አበባ ከተማ ጤና ቢሮ")},
        {"label": t("Membership", "አባልነት"), "value": t("Ethiopian Psychologists' Association", "የኢትዮጵያ ሥነ-ልቦና ባለሙያዎች ማኅበር")},
        {"label": t("Supervision", "ክትትል"), "value": t("Clinical supervision every two weeks", "በየሁለት ሳምንቱ የክሊኒካል ክትትል"), "detail": t("With a senior clinical psychologist", "ከከፍተኛ የክሊኒካል ሥነ-ልቦና ባለሙያ ጋር")},
    ]}
    content["locations"] = {**starter["locations"],
        "intro": t("Meet in a quiet office in Bole, or by secure video from a private place of your own. Both have the same care and the same fee.",
                   "በቦሌ በሚገኝ ጸጥ ያለ ቢሮ፣ ወይም ከራስዎ ግላዊ ቦታ በደህንነቱ በተጠበቀ ቪዲዮ ይገናኙ። ሁለቱም አንድ ዓይነት እንክብካቤ እና አንድ ዓይነት ክፍያ አላቸው።"),
        "items": [
            # No `format` on places either: `placeFormats` gives it by location.
            {"id": places["in_person"][:64], "name": t("Bole counselling office", "የቦሌ የምክር ቢሮ"),
             "address": t(f"{OFFICE_ADDRESS}, Bole, Addis Ababa", "ካሜሩን ጎዳና፣ ፀሐይ ሕንፃ፣ ሁለተኛ ፎቅ፣ ቢሮ ቁጥር 204፣ ቦሌ፣ አዲስ አበባ"),
             "phone": PHONE,
             "hours": t("Monday to Saturday, 09:00–18:00", "ከሰኞ እስከ ቅዳሜ፣ 09:00–18:00"),
             "body": t("A five-minute walk from the Bole Medhane Alem roundabout. The building has a quiet side entrance with a wooden door.",
                       "ከቦሌ መድኃኔዓለም አደባባይ በእግር አምስት ደቂቃ። ሕንፃው የእንጨት በር ያለው ጸጥ ያለ የጎን መግቢያ አለው።"),
             "notes": [t("Parking in the courtyard and a lift to the second floor", "በግቢው ውስጥ የመኪና ማቆሚያ እና ወደ ሁለተኛ ፎቅ አሳንሰር አለ"),
                       t("A small waiting corner, so you never wait in a corridor", "ትንሽ የመቆያ ቦታ አለ፤ በኮሪደር ላይ አይጠብቁም")],
             "directionsAction": act("directions", "Get directions", "አቅጣጫ ያግኙ"),
             "image": ASSETS + "support/ergata/office.webp",
             "imageAlt": t("A wooden door with an arched top stands open at the top of stone steps between large potted plants.",
                           "በትላልቅ የሸክላ ተክሎች መካከል ባሉ የድንጋይ ደረጃዎች ላይ ቅስት ያለው የእንጨት በር ተከፍቷል።")},
            {"id": places["online"][:64], "name": t("Online video sessions", "የኦንላይን ቪዲዮ ቆይታዎች"),
             "address": t("Google Meet. Your private link comes with your booking email.", "ጉግል ሚት። የግል ማስፈንጠሪያዎ ከቀጠሮ ኢሜልዎ ጋር ይደርስዎታል።"),
             "hours": t("Monday to Saturday, 08:00–20:00", "ከሰኞ እስከ ቅዳሜ፣ 08:00–20:00"),
             "notes": [t("Book an online session and choose a time.", "የኦንላይን ቆይታ ይያዙ እና ሰዓት ይምረጡ።"),
                       t("Find a quiet room where nobody can hear you. Earphones help.", "ማንም የማይሰማዎት ጸጥ ያለ ክፍል ያግኙ። የጆሮ ማዳመጫ ይረዳል።"),
                       t("Open the link a few minutes early on a phone or laptop with a camera.", "ካሜራ ባለው ስልክ ወይም ላፕቶፕ ማስፈንጠሪያውን ጥቂት ደቂቃዎች ቀደም ብለው ይክፈቱ።")],
             "body": t("Sessions are never recorded. Yared joins from a closed, private room.",
                       "ቆይታዎች በፍጹም አይቀረጹም። ያሬድ ዝግ ከሆነ ግላዊ ክፍል ይገናኛል።"),
             "image": ASSETS + "support/ergata/online.webp",
             "imageAlt": t("A laptop, a cup of tea and a notebook on a wooden desk by a sheer curtain, ready for a video session.",
                           "ለቪዲዮ ቆይታ የተዘጋጀ፣ ቀጭን መጋረጃ አጠገብ ባለ የእንጨት ጠረጴዛ ላይ ላፕቶፕ፣ ሻይ እና ማስታወሻ ደብተር።")},
        ]}
    content["contact"] = {**starter["contact"], "phone": PHONE,
        "body": t("Call or send a message with any question before you book. Messages are read only by Yared and answered within one working day.",
                  "ከመያዝዎ በፊት ማንኛውም ጥያቄ ካለዎት ይደውሉ ወይም መልእክት ይላኩ። መልእክቶች የሚነበቡት በያሬድ ብቻ ሲሆን በአንድ የሥራ ቀን ውስጥ ምላሽ ያገኛሉ።"),
        "action": act("call", "Call Yared", "ለያሬድ ይደውሉ", "primary")}
    faq = list(starter["faq"]["items"])
    faq[-1] = {"question": t("How do I pay?", "እንዴት ነው የምከፍለው?"),
               "answer": t("Fees are shown next to each session. You can pay by Telebirr or bank transfer, or in cash at the office. If cost is a barrier, ask about the small number of reduced-fee places.",
                           "ክፍያው ከእያንዳንዱ ቆይታ አጠገብ ይታያል። በቴሌብር፣ በባንክ ዝውውር ወይም በቢሮ በጥሬ ገንዘብ መክፈል ይችላሉ። ወጪው እንቅፋት ከሆነብዎ፣ ስለ ጥቂት የቅናሽ ቦታዎች ይጠይቁ።")}
    faq.append({"question": t("Is online therapy as helpful as meeting in person?", "የኦንላይን ሕክምና እንደ አካል ቆይታ ይጠቅማል?"),
                "answer": t("For many people, yes. Choose a quiet, private place with a steady connection. You receive a secure video link before the session, and you can move between online and office sessions at any time.",
                            "ለብዙ ሰዎች አዎ። ጸጥ ያለ፣ ግላዊ ቦታ እና የተረጋጋ ኢንተርኔት ይምረጡ። ከቆይታው በፊት ደህንነቱ የተጠበቀ የቪዲዮ ማስፈንጠሪያ ይደርስዎታል፤ በማንኛውም ጊዜ በኦንላይን እና በቢሮ ቆይታዎች መካከል መቀያየር ይችላሉ።")})
    content["faq"] = {**starter["faq"], "items": faq}
    content["footer"] = {"body": t("Counselling and psychotherapy in Amharic and English, at an office in Bole, Addis Ababa, and online.",
                                   "በአማርኛ እና በእንግሊዝኛ የምክር እና የሥነ-ልቦና ሕክምና አገልግሎት፣ በቦሌ፣ አዲስ አበባ በሚገኝ ቢሮ እና በኦንላይን።"), "items": []}
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
    # Read the row itself: the defaults cache can still hold the value from before the last setup.
    return json.loads(frappe.db.get_value("DefaultValue", {"parent": "__default", "defkey": STATE_KEY}, "defvalue") or "{}")


def _save(state):
    frappe.db.set_default(STATE_KEY, json.dumps(state))
