"""Enkua-only editorial content, applied by the idempotent showcase seeder."""
from copy import deepcopy


def refine_sections(content, defaults):
    asset = "/assets/appointment/brand-experience/support/enkua-v3/"
    # A refresh starts from the previous release. Restore this revision's authored copy.
    for kind in ("hero", "gallery", "services", "about", "locations", "process", "booking_cta", "contact"):
        content[kind] = {**content[kind], **deepcopy(defaults[kind])}
    content["hero"].update(image=asset + "hero-r2.webp", imageAlt={"en": "Liya Tadesse, studio producer", "am": "ሊያ ታደሰ፣ የስቱዲዮ አዘጋጅ"})
    content["about"].update(image=asset + "working-r2.webp", imageAlt={"en": "Dawit Girma at his camera", "am": "ዳዊት ግርማ በካሜራው ሲሠራ"})
    person = content["providers"]["items"][0]
    person.update(image=asset + "founder-r2.webp", role={"en": "Photographer & founder", "am": "ፎቶግራፍ አንሺና መሥራች"})
    captions = [
        ("graduation", "The next chapter", "ቀጣዩ ምዕራፍ"),
        ("family", "Your kind of together", "የእርስዎ አብሮነት"),
        ("business", "A face behind the business", "ከንግዱ ጀርባ ያለው ሰው"),
        ("products", "Objects with presence", "ጎልተው የሚታዩ ምርቶች"),
        ("couple", "Love looks good here", "ፍቅር እዚህ ይደምቃል"),
    ]
    content["gallery"]["items"] = [
        {"image": asset + role + "-r2.webp", "imageAlt": {"en": en, "am": am}, "caption": {"en": en, "am": am}}
        for role, en, am in captions
    ]
    for item, role in zip(content["services"]["items"], ("hero", "founder", "products", "studio")):
        item["image"] = asset + role + "-r2.webp"
    content["locations"]["items"][0].update(image=asset + "studio-r2.webp", imageAlt={"en": "The daylight photography studio in Bole", "am": "በቦሌ የሚገኘው በቀን ብርሃን የሚያበራ የፎቶ ስቱዲዮ"})
    return content
