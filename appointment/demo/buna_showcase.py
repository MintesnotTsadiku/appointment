"""Buna's Field Atlas refresh keeps one bookable educator and four services."""
from copy import deepcopy


def refine_sections(content, defaults):
    asset = "/assets/appointment/brand-experience/support/buna-v3/"
    for kind in ("hero", "services", "about", "process", "faq", "booking_cta", "locations", "footer"):
        content[kind] = {**content[kind], **deepcopy(defaults[kind])}
    content["hero"].update(image=asset + "terrain-r2.webp", imageAlt={
        "en": "An illustrated journey through Ethiopia's coffee highlands",
        "am": "በኢትዮጵያ የቡና ደጋማ ቦታዎች የሚደረግ በምስል የቀረበ ጉዞ"})
    lead = content["providers"]["items"][0]
    lead["role"] = {"en": "Coffee educator", "am": "የቡና አስተማሪ"}
    lead["specialties"] = [{"en": "Curious about every cup. Here to help you find what you enjoy.",
                            "am": "ስለ እያንዳንዱ ስኒ ጉጉት አላት። የሚወዱትን ጣዕም እንዲያገኙ ትረዳዎታለች።"}]
    content["providers"]["items"] = [lead, {
        "name": {"en": "Dawit Tesfaye", "am": "ዳዊት ተስፋዬ"},
        "role": {"en": "Brewing coach", "am": "የቡና አዘገጃጀት አሰልጣኝ"},
        "specialties": [{"en": "From a careful pour to a better brew. Small details, shared generously.",
                         "am": "ከጥንቃቄ አፈሳሰስ እስከ ተሻለ ቡና። ትንንሽ ዝርዝሮችን በደስታ ያካፍላል።"}],
        "credentials": [],
    }]
    for item, role in zip(content["services"]["items"], ("yirgacheffe", "pour", "espresso", "people")):
        item["image"] = asset + role + "-r2.webp"
    return content
