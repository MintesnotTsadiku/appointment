"""Yared Tesfaye Counselling: the Ergata Therapy template showcase (`/yared-counselling`).

One definition for the seeder (`appointment.demo.independent_world`) and for the QA fixture
(`appointment.tests.template_ergata_qa_fixtures`), so the two never drift. The people, places and
credentials are fictional. The office phone stays non-dialable on purpose (`placeholder_numbers`).
"""

from appointment.demo.independent_showcase import IndependentShowcase, Place, Session

ASSETS = "/assets/appointment/brand-experience/"
SLUG = "yared-counselling"
OWNER = "yared.tesfaye.counselling@example.test"
BUSINESS = "Yared Tesfaye Counselling"
PHONE = "+251 11 000 0106"
OFFICE_ADDRESS = "Cameroon Street, Tsehay Building, second floor, office 204"
# A fictional Google Meet room in the real link shape. Only booked customers get it (docs/growth/ONLINE_LOCATIONS.md).
MEETING_LINK = "https://meet.google.com/ytc-room-one"
PLATFORM = "Google Meet"


def t(en, am):
    return {"en": en, "am": am}


def act(intent, en, am, placement="inline"):
    return {"intent": intent, "label": t(en, am), "placement": placement}


SESSIONS = (
    Session("Free introductory call", 15, 0, "online",
            "A short video call to ask questions and see whether we are a good fit. No preparation needed.",
            "ነጻ የትውውቅ ጥሪ", "ጥያቄዎችዎን ለመጠየቅ እና እንደምንስማማ ለማየት የሚደረግ አጭር የቪዲዮ ጥሪ። ምንም ዝግጅት አያስፈልግም።"),
    Session("First session at the office", 60, 1500, "in_person",
            "A longer first meeting in the Bole office to understand what brings you, agree on confidentiality and choose a first focus.",
            "የመጀመሪያ ቆይታ በቢሮ", "ወደዚህ ያመጣዎትን ለመረዳት፣ በሚስጥራዊነት ላይ ለመስማማት እና የመጀመሪያ ትኩረት ለመምረጥ በቦሌው ቢሮ የሚደረግ ረዘም ያለ ቆይታ።"),
    Session("First session online", 60, 1500, "online",
            "The same first meeting over a secure video link, from a quiet place where you can talk freely.",
            "የመጀመሪያ ቆይታ በኦንላይን", "ተመሳሳይ የመጀመሪያ ቆይታ በደህንነቱ በተጠበቀ የቪዲዮ ማስፈንጠሪያ፣ በነጻነት ማውራት ከሚችሉበት ጸጥ ያለ ቦታ።"),
    Session("Individual session at the office", 50, 1200, "in_person",
            "The regular one-to-one session in the quiet Bole office.",
            "የግል ቆይታ በቢሮ", "ጸጥ ባለው የቦሌ ቢሮ የሚደረግ መደበኛ የአንድ ለአንድ ቆይታ።"),
    Session("Individual session online", 50, 1200, "online",
            "The regular session by video, from anywhere you feel private and comfortable.",
            "የግል ቆይታ በኦንላይን", "መደበኛው ቆይታ በቪዲዮ፣ ግላዊ እና ምቹ ከሆነልዎ ከማንኛውም ቦታ።"),
    Session("Couples session at the office", 80, 2000, "in_person",
            "Time for both of you to be heard, with a calm structure for difficult conversations.",
            "የጥንዶች ቆይታ በቢሮ", "ሁለታችሁም እንድትደመጡ፣ ለአስቸጋሪ ንግግሮች የተረጋጋ አቀራረብ ያለው ቆይታ።"),
)


def sections(starter, provider, places, services):
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
        {"id": services[row.name], "name": t(row.name, row.name_am), "summary": t(row.summary, row.summary_am),
         "durationMinutes": row.duration, "price": row.price, "currency": "ETB",
         "action": act("service_selection", "Book this session", "ይህን ቆይታ ይያዙ")}
        # No `format`: the template reads it from the offering's location (`sessionFormats`).
        for row in SESSIONS]}
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


SHOWCASE = IndependentShowcase(
    key="ergata",
    version=2,
    business=BUSINESS,
    owner_email=OWNER,
    owner_name=("Yared", "Tesfaye"),
    slug=SLUG,
    recipe="ergata-therapy",
    preferences={"industry": "therapy", "main_action": "booking"},
    open_days=("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"),
    phone=PHONE,
    office=Place("Bole counselling office", 9, 18, address_line_1=OFFICE_ADDRESS, address_line_2="Bole"),
    online=Place("Online video room", 8, 20, platform=PLATFORM, meeting_link=MEETING_LINK),
    sessions=SESSIONS,
    full_name="Yared Tesfaye",
    bio="Counselling psychologist in Addis Ababa. Individual and couples sessions in Amharic and English, at the Bole office or online.",
    bio_am="በአዲስ አበባ የምክር ሥነ-ልቦና ባለሙያ። የግልና የጥንዶች ምክር በአማርኛና በእንግሊዝኛ፣ በቦሌ ቢሮ ወይም በኦንላይን።",
    spoken_languages=("am", "en"),  # chips on the provider page
    portrait=ASSETS + "providers/yared-tesfaye.webp",
    logo=ASSETS + "brands/ergata-showcase-logo.webp",
    favicon=ASSETS + "brands/ergata-showcase-favicon.png",
    short_name="Yared",
    seo={"title": "Yared Tesfaye Counselling | Bole, Addis Ababa and online",
         "description": "Confidential counselling and psychotherapy in Amharic or English, at an office in Bole, Addis Ababa, or by online video."},
    sections=sections,
    persona="Independent counselling psychologist",
    qa_fixture="appointment.tests.template_ergata_qa_fixtures",
)
