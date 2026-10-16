"""Seven independent, seeder-owned businesses with distinct curated websites.

All people and premises are authored showcase facts. The production seeder owns record creation,
refresh and cleanup; this module only supplies definitions and bilingual page content.
"""
import json
from pathlib import Path
from functools import partial

from appointment.demo.independent_showcase import IndependentShowcase, Place, Session


def text(en, am):
    return {"en": en, "am": am}


def sections(definition, starter, provider, places, services):
    from appointment.public_experience.recipes import _read

    defaults = _read(f'public_experience/manifest/content/{definition["recipe"]}.v3.json')["sections"]
    starter = {**defaults, **starter}
    content = dict(starter)
    asset = f'/assets/appointment/brand-experience/support/{definition["key"]}-v3/'
    content["hero"] = {**starter["hero"], "image": asset + "hero.webp", "imageAlt": definition["eyebrow"]}
    content["about"] = {**starter["about"], "body": definition["bio"]}
    content["services"] = {**starter["services"], "items": [
        {"id": services[row["name"]["en"]], "name": row["name"], "summary": row["summary"],
         "durationMinutes": row["duration"], "price": row["price"], "currency": "ETB",
         "action": {"intent": "service_selection", "label": definition["cta"], "placement": "inline"}}
        for row in definition["services"]]}
    content["providers"] = {**starter["providers"], "items": [
        {"id": provider[:64], "name": definition["person"], "role": definition["eyebrow"], "specialties": [], "credentials": [],
         "image": asset + "portrait.webp", "imageAlt": definition["person"],
         "action": {"intent": "provider_selection", "label": definition["cta"], "placement": "inline"}}]}
    content["locations"] = {**starter["locations"], "items": [
        {"id": places["in_person"][:64], "name": definition["placeLabel"],
         "address": text("Cameroon Street, Bole, Addis Ababa", "ካሜሩን ጎዳና፣ ቦሌ፣ አዲስ አበባ"),
         "body": text("Visits by appointment. Confirm the meeting point before travelling.", "ጉብኝቶች በቀጠሮ ናቸው። ከመነሳትዎ በፊት የመገናኛ ቦታውን ያረጋግጡ።")},
        {"id": places["online"][:64], "name": text("Online video appointment", "የኦንላይን ቪዲዮ ቀጠሮ"),
         "address": text("Your meeting link is included in the booking details.", "የመገናኛ ማስፈንጠሪያዎ በቀጠሮ ዝርዝር ውስጥ ይካተታል።")}]}
    if definition.get("galleryCaptions"):
        content["gallery"] = {**starter.get("gallery", {}), "items": [
            {"image": asset + role + ".webp", "imageAlt": caption, "caption": caption}
            for role, caption in zip(("scene1", "scene2", "hero"), definition["galleryCaptions"])]}
    service_roles = {"enkua": ("hero", "scene1", "scene2", "portrait"),
                     "mizan": ("hero", "scene1", "scene2", "portrait"),
                     "meseret": ("scene1", "portrait", "scene2"),
                     "buna": ("scene2", "scene2", "portrait", "hero"),
                     "hana": ("portrait", "scene1", "scene2", "hero"),
                     "dawit": ("scene2", "scene2", "scene1", "hero"),
                     "selam-homes": ("portrait", "scene1", "hero", "scene2")}
    for index, item in enumerate(content["services"]["items"]):
        roles = service_roles[definition["key"]]
        item.update(image=asset + roles[index % len(roles)] + ".webp", imageAlt=item["name"])
    if definition["key"] == "mizan":
        from appointment.demo.mizan_showcase import refine_sections

        return refine_sections(content, defaults)
    if definition["key"] == "enkua":
        from appointment.demo.enkua_showcase import refine_sections

        return refine_sections(content, defaults)
    return content


def definition(data, index):
    asset = f'/assets/appointment/brand-experience/support/{data["key"]}-v3/'
    name = data["person"]["en"].split(" ", 1)
    return IndependentShowcase(
        key=data["key"], version=data.get("version", 6), business=data["name"]["en"],
        owner_email=f'{data["key"]}.owner@example.test', owner_name=tuple(name),
        slug=data["slug"], recipe=data["recipe"], preferences={"main_action": "booking"},
        open_days=tuple(data.get("openDays", ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"))),
        phone=f"+251 11 000 {110+index:04}",
        office=Place(data["name"]["en"]+" Bole office", *data.get("officeHours", (9, 18)), address_line_1="Cameroon Street", address_line_2="Bole",
                     name_am=data["placeLabel"]["am"], address_am="ካሜሩን ጎዳና፣ ቦሌ፣ አዲስ አበባ"),
        online=Place(data["name"]["en"]+" video room", *data.get("onlineHours", (9, 18)), platform="Google Meet", meeting_link="https://meet.google.com/abc-defg-hij", name_am="የኦንላይን ቪዲዮ ክፍል"),
        sessions=tuple(Session(row["name"]["en"], row["duration"], row["price"], row["meet"], row["summary"]["en"], row["name"]["am"], row["summary"]["am"]) for row in data["services"]),
        full_name=data["person"]["en"], full_name_am=data["person"]["am"], business_am=data["name"]["am"],
        bio=data["bio"]["en"], bio_am=data["bio"]["am"], spoken_languages=("en", "am"),
        portrait=asset+("founder-r2.webp" if data["key"] == "enkua" else "lead-r2.webp" if data["key"] == "mizan" else "portrait.webp"), logo=asset+"logo.webp", favicon=asset+"favicon.png",
        short_name=data["name"]["en"].split()[0],
        seo={"title": data["name"]["en"]+" | Addis Ababa", "description": data["subtitle"]["en"]},
        sections=partial(sections, data), persona=data["eyebrow"]["en"],
        booking={"showPrices": True, "currency": "ETB", "liveAvailability": True, "holidayGreetings": True},
    )


SHOWCASES = tuple(definition(data, index) for index, data in enumerate(json.loads(
    Path(__file__).with_suffix(".json").read_text(encoding="utf-8"))))
