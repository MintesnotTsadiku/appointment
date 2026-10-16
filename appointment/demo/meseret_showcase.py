"""Meseret's editorial refresh preserves services and bookable capacity."""
from copy import deepcopy


def refine_sections(content, defaults):
    asset = "/assets/appointment/brand-experience/support/meseret-v3/"
    for kind in ("hero", "services", "about", "process", "faq", "booking_cta", "footer"):
        content[kind] = {**content[kind], **deepcopy(defaults[kind])}
    content["hero"].update(image=asset + "hero-r2.webp", imageAlt={
        "en": "A shopkeeper opens his shop in Addis", "am": "አንድ ነጋዴ በአዲስ አበባ ሱቁን ሲከፍት"})
    lead = content["providers"]["items"][0]
    lead["role"] = {"en": "Accounting & business advice", "am": "የሒሳብና የንግድ ምክር"}
    content["providers"]["items"] = [lead, {
        "name": {"en": "Dawit Tesfaye", "am": "ዳዊት ተስፋዬ"},
        "role": {"en": "Business support", "am": "የንግድ ድጋፍ"},
        "specialties": [], "credentials": [],
    }]
    for item, role in zip(content["services"]["items"], ("bookkeeping", "beginning", "advisers")):
        item["image"] = asset + role + "-r2.webp"
    return content
