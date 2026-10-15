"""Independent-provider showcases: one practitioner who is the business, with a published website.

A showcase is a frozen definition (`IndependentShowcase`). `build()` makes it through the product's own
setup calls, as a real owner would: solo setup, the first independent offering, an online location,
one offering per session, guided website setup on the showcase's recipe, and publishing. The caller passes
`record(doctype, name)`, which receives every record that `build()` makes, so the caller keeps its own
ownership list (the seeder's private journal, or a QA fixture's state).

The seeder (`appointment.demo.independent_world`) and the QA fixtures use the same definition, so the
seeded showcase and the fixture copy cannot drift.
"""

import json
from dataclasses import dataclass, field
from typing import Callable

import frappe

DAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
FORMATS = ("in_person", "online")


@dataclass(frozen=True)
class Session:
    name: str
    duration: int
    price: int
    meet: str  # "in_person" (the office) or "online" (the online location)
    summary: str
    name_am: str
    summary_am: str


@dataclass(frozen=True)
class Place:
    name: str
    opens: int
    closes: int
    address_line_1: str = ""
    address_line_2: str = ""
    city: str = "Addis Ababa"
    platform: str = ""
    meeting_link: str = ""
    name_am: str = ""  # Location.location_name_am
    address_am: str = ""  # Location.address_am: the whole address in one line


@dataclass(frozen=True)
class IndependentShowcase:
    key: str  # the catalog key in `catalog.v1.json`
    version: int  # raise it when the content changes; the seeder then republishes the website
    business: str
    owner_email: str
    owner_name: tuple
    slug: str  # the website and the provider page address
    recipe: str
    preferences: dict
    open_days: tuple
    phone: str
    office: Place
    online: Place
    sessions: tuple
    full_name: str
    bio: str
    bio_am: str
    spoken_languages: tuple
    portrait: str
    logo: str
    favicon: str
    short_name: str
    seo: dict
    sections: Callable  # (starter sections, provider, places, services) -> sections by type
    persona: str = "Independent provider"
    qa_fixture: str = ""  # a QA fixture that can make its own copy; the seeder names it in a collision
    timezone: str = "Africa/Addis_Ababa"
    booking: dict = field(default_factory=lambda: {"showPrices": True, "currency": "ETB"})
    full_name_am: str = ""  # the public name in Ge'ez script (Provider.display_name_am)
    business_am: str = ""  # the website's Amharic name (Public Site.site_title_am)

    @property
    def first_session(self):
        """The office session that solo setup makes first; the others follow."""
        return next(row for row in self.sessions if row.meet == "in_person")

    @property
    def location_names(self):
        return (self.office.name, self.online.name)


def problems(showcase):
    """What is missing from a definition. An empty list means the showcase is complete."""
    from appointment.public_experience.recipes import get_recipe

    found = []
    if {row.meet for row in showcase.sessions} != set(FORMATS):
        found.append("sessions in the office and online")
    if any(not (row.name and row.summary and row.name_am and row.summary_am) for row in showcase.sessions):
        found.append("every session in English and Amharic")
    if len({row.name for row in showcase.sessions}) != len(showcase.sessions):
        found.append("unique session names")
    if not (showcase.office.address_line_1 and not showcase.office.platform):
        found.append("an office with a street address")
    if not (showcase.online.platform and showcase.online.meeting_link.startswith("https://")):
        found.append("an online location with a platform and a fixed https meeting link")
    if not (showcase.bio and showcase.bio_am and showcase.spoken_languages):
        found.append("a bio in English and Amharic and spoken languages")
    if any(day not in DAYS for day in showcase.open_days) or not showcase.open_days:
        found.append("open days")
    if not showcase.owner_email.endswith("@example.test"):
        found.append("a non-deliverable owner email")
    for asset in (showcase.portrait, showcase.logo, showcase.favicon):
        if not _asset(asset).is_file():
            found.append(f"packaged asset {asset}")
    try:
        get_recipe(showcase.recipe)
    except Exception:
        found.append(f"certified recipe {showcase.recipe}")
    return found


def collisions(showcase):
    """Records that already use this showcase's identity. The seeder refuses to adopt any of them."""
    checks = [
        ("User", showcase.owner_email),
        ("Provider", showcase.business),
        ("Provider", {"public_slug": showcase.slug}),
        ("Public Site", {"slug": showcase.slug}),
        ("Public Site Slug Alias", {"slug": showcase.slug}),
        *(("Location", name) for name in showcase.location_names),
    ]
    return [f"{doctype} {value}" for doctype, value in checks
            if frappe.db.exists("DocType", doctype) and frappe.db.exists(doctype, value)]


def build(showcase, record):
    """Make the practice, its offerings and its published website. Returns the ids the caller needs."""
    from appointment.helpers.phone import placeholder_numbers

    previous = frappe.flags.syncing_booking_urls
    frappe.flags.syncing_booking_urls = True
    try:
        with placeholder_numbers():  # The practice shows a non-dialable number.
            provider = _provider(showcase, record)
            places, services, offerings = _sessions(showcase, provider, record)
            apply_profile(showcase, provider)
            apply_places(showcase, places)
            _as(showcase.owner_email, _publish_booking, provider)
            site = _website(showcase, provider, places, services, record)
    finally:
        frappe.flags.syncing_booking_urls = previous
        frappe.set_user("Administrator")
    return {"provider": provider, "places": places, "services": services, "offerings": offerings,
            "public_site": site, "brand_profile": frappe.db.get_value("Public Site", site, "brand_profile"),
            "experience_release": frappe.db.get_value("Public Site", site, "current_release"),
            "public_path": f"/{showcase.slug}", "provider_page": f"/schedule/p/{showcase.slug}"}


def refresh(showcase, built, record):
    """Write the current definition onto an existing showcase and publish its website again."""
    from appointment.helpers.phone import placeholder_numbers

    previous = frappe.flags.syncing_booking_urls
    frappe.flags.syncing_booking_urls = True
    try:
        with placeholder_numbers():
            apply_profile(showcase, built["provider"])
            apply_places(showcase, built["places"])
            _upgrade_template(showcase, built["public_site"])
            site = frappe.get_doc("Public Site", built["public_site"])
            starter = {row.section_type: json.loads(row.content_json) for row in site.sections}
            apply_website(showcase, site, built["provider"], built["places"], built["services"], starter)
            _publish_website(showcase, site.name, record)
    finally:
        frappe.flags.syncing_booking_urls = previous
        frappe.set_user("Administrator")
    built["experience_release"] = frappe.db.get_value("Public Site", built["public_site"], "current_release")
    return built


def _upgrade_template(showcase, site_name):
    """Move the website to the latest version of its template, as an owner does: switch, then publish."""
    from appointment.public_experience import template_switch
    from appointment.public_experience.recipes import get_recipe

    recipe = get_recipe(showcase.recipe)
    site = frappe.get_doc("Public Site", site_name)
    if (site.recipe_key, int(site.recipe_version or 0)) != (recipe.key, recipe.version):
        _as(showcase.owner_email, template_switch.switch, site.name, site.draft_version, recipe.key)


def apply_profile(showcase, provider):
    doc = frappe.get_doc("Provider", provider)
    doc.update({"full_name": showcase.full_name, "display_name": showcase.full_name, "timezone": showcase.timezone,
                "spoken_languages": json.dumps(list(showcase.spoken_languages)),
                "bio": showcase.bio, "bio_am": showcase.bio_am, "display_name_am": showcase.full_name_am})
    doc.save(ignore_permissions=True)
    frappe.db.set_value("User", showcase.owner_email, "user_image", showcase.portrait)


def apply_places(showcase, places):
    """The Amharic names (and the office's Amharic address) of the showcase's places."""
    for meet, place in (("in_person", showcase.office), ("online", showcase.online)):
        if places.get(meet):
            frappe.db.set_value("Location", places[meet], {"location_name_am": place.name_am, "address_am": place.address_am})


def apply_website(showcase, site, provider, places, services, starter):
    """Replace the starter copy with the showcase content, in English and Amharic."""
    from appointment.demo.showcase import showcase_motion

    profile = frappe.get_doc("Brand Profile", site.brand_profile)
    # Showcases use the most expressive motion their template offers (new sites keep the recipe default).
    inputs = json.loads(profile.brand_inputs_json or "{}")
    profile.update({"logo_primary": showcase.logo, "logo_compact": showcase.logo, "favicon": showcase.favicon,
                    "short_name": showcase.short_name,
                    "brand_inputs_json": json.dumps({**inputs, "motion": showcase_motion(showcase.recipe)}, sort_keys=True)})
    profile.save(ignore_permissions=True)
    content = showcase.sections(starter, provider, places, services)
    for row in site.sections:
        row.content_json = json.dumps(content[row.section_type])
    if "am" not in [row.locale for row in site.enabled_locales]:
        site.append("enabled_locales", {"locale": "am", "enabled": 1, "translation_status": "Complete"})
    site.site_title_am = showcase.business_am
    site.seo_json = json.dumps(showcase.seo)
    site.booking_json = json.dumps({**showcase.booking, "timezone": showcase.timezone})
    site.save(ignore_permissions=True)


def _provider(showcase, record):
    from appointment.public_experience import solo_setup
    from appointment.scheduler import independent

    provider = _as(showcase.owner_email, lambda: solo_setup.create(showcase.business)["provider"])
    record("Provider", provider)
    first, office = showcase.first_session, showcase.office
    row = _as(showcase.owner_email, independent.create, provider, office.name, first.name, showcase.timezone,
              first.duration, f"{office.opens:02}:00", f"{office.closes:02}:00", list(showcase.open_days))
    event = frappe.get_doc("EventType", row["offering"])
    for doctype, name in (("Location", event.location), ("Service", event.service), ("EventType", event.name)):
        record(doctype, name)
    return provider


def _sessions(showcase, provider, record):
    from appointment.scheduler.booking import offering

    first = frappe.get_all("EventType", filters={"provider": provider}, fields=["name", "service", "location"], limit=1)[0]
    office = frappe.get_doc("Location", first.location)
    office.update({"address_line_1": showcase.office.address_line_1, "address_line_2": showcase.office.address_line_2,
                   "city": showcase.office.city, "phone": showcase.phone, "timezone": showcase.timezone})
    office.save(ignore_permissions=True)
    online = _online_location(showcase, provider)
    record("Location", online)
    places = {"in_person": office.name, "online": online}
    services, offerings = {}, []
    for row in showcase.sessions:
        if row.name == showcase.first_session.name:
            service = frappe.get_doc("Service", first.service)
            service.update({"price": row.price, "description": row.summary})
            service.save(ignore_permissions=True)
            event = first.name
        else:
            service = frappe.get_doc({"doctype": "Service", "service_name": row.name, "independent_provider": provider,
                                      "duration": row.duration, "price": row.price, "description": row.summary,
                                      "use_default_hours": 1, "is_active": 1}).insert(ignore_permissions=True)
            record("Service", service.name)
            event = frappe.get_doc({"doctype": "EventType", "event_type_name": row.name, "service": service.name,
                                    "location": places[row.meet], "provider": provider, "is_active": 1}).insert(ignore_permissions=True).name
            record("EventType", event)
            offering(event)
        services[row.name] = service.name
        offerings.append({"id": event, "service": service.name, "location": places[row.meet], "label": row.name,
                          "duration": row.duration, "meet": row.meet})
    return places, services, offerings


def _online_location(showcase, provider):
    """An Online location of this provider with a fixed meeting link and its own hours."""
    online = showcase.online
    return frappe.get_doc({
        "doctype": "Location", "location_name": online.name, "independent_provider": provider,
        "timezone": showcase.timezone, "phone": showcase.phone, "is_active": 1, "location_type": "Online",
        "video_platform": online.platform, "meeting_link_mode": "Fixed link", "meeting_link": online.meeting_link,
        "opening_hours": [{"day_of_week": day, "is_open": int(day in showcase.open_days),
                           "start_time": f"{online.opens:02}:00", "end_time": f"{online.closes:02}:00"} for day in DAYS],
    }).insert(ignore_permissions=True).name


def _publish_booking(provider):
    from appointment.scheduler import independent

    independent.publish(provider, 1)


def _website(showcase, provider, places, services, record):
    """Guided website setup first, so the recipe's starter copy is used; then the showcase facts replace it."""
    from appointment.public_experience import setup as website

    draft = _as(showcase.owner_email, website.start, "Provider", provider, showcase.business, showcase.slug,
                showcase.recipe, dict(showcase.preferences))
    record("Public Site", draft["site"])
    site = frappe.get_doc("Public Site", draft["site"])
    record("Brand Profile", site.brand_profile)
    starter = {row.section_type: json.loads(row.content_json) for row in site.sections}
    apply_website(showcase, site, provider, places, services, starter)
    _publish_website(showcase, site.name, record)
    return site.name


def _publish_website(showcase, site, record):
    from appointment.public_experience import setup as website

    _as(showcase.owner_email, website.publish, site, frappe.db.get_value("Public Site", site, "draft_version"))
    profile = frappe.db.get_value("Public Site", site, "brand_profile")
    for doctype, filters in (("Brand Revision", {"brand_profile": profile}), ("Experience Release", {"public_site": site}),
                             ("Public Experience Outbox", {"idempotency_key": ["like", f"publish:{site}:%"]}),
                             ("Public Site Slug Alias", {"public_site": site})):
        if frappe.db.exists("DocType", doctype):
            for name in frappe.get_all(doctype, filters=filters, pluck="name"):
                record(doctype, name)


def _as(user, function, *args):
    frappe.set_user(user)
    try:
        return function(*args)
    finally:
        frappe.set_user("Administrator")


def _asset(public_url):
    from appointment.public_experience.showcase_catalog import APP_ROOT

    return APP_ROOT / "public" / public_url.removeprefix("/assets/appointment/")
