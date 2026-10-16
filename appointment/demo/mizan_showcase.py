"""Mizan-only content refresh. Staff copy does not add booking capacity."""
from copy import deepcopy


def refine_sections(content, defaults):
    asset = "/assets/appointment/brand-experience/support/mizan-v3/"
    for kind in ("hero", "services", "about", "process", "locations", "booking_cta", "footer"):
        content[kind] = {**content[kind], **deepcopy(defaults[kind])}
    content["hero"].update(image=asset + "hero-r2.webp", imageAlt={"en": "Dawit Bekele checks diagnostic readings", "am": "ዳዊት በቀለ የምርመራ ንባቦችን ሲያይ"})
    lead = content["providers"]["items"][0]
    lead.update(image=asset + "lead-r2.webp", role={"en": "Lead diagnostics technician", "am": "ዋና የምርመራ ቴክኒሺያን"})
    content["providers"]["items"] = [lead, {
        "name": {"en": "Selam Tesfaye", "am": "ሰላም ተስፋዬ"},
        "role": {"en": "Inspection & EV diagnostics", "am": "ምርመራና የኤሌክትሪክ መኪና ፍተሻ"},
        "specialties": [], "credentials": [], "image": asset + "specialist-r2.webp",
        "imageAlt": {"en": "Selam Tesfaye at work", "am": "ሰላም ተስፋዬ በሥራ ላይ"},
    }]
    for item, role in zip(content["services"]["items"], ("screen", "brake", "engine", "lead")):
        item["image"] = asset + role + "-r2.webp"
    content["locations"]["items"][0].update(image=asset + "workshop-r2.webp", imageAlt={"en": "Mizan inspection workshop", "am": "የሚዛን ምርመራ ማዕከል"})
    return content
