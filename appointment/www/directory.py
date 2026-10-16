"""Public business directory: server-rendered SEO pages.

Routes (hooks `website_route_rules`):

- `/directory`: the search, the categories and areas that have listed businesses, and the businesses.
- `/directory/<category>`: businesses in one category, with area links.
- `/directory/<category>/<area>`: businesses in one category and area ("Book a salon in Bole").
- `/directory/in/<area>`: every business in one area ("Book online in Bole"). `in` is never a category slug.
- The same paths under `/am/` in Amharic, with hreflang links between the two.
- `/directory?service=<category>&where=<area>`: the search form without JavaScript; it redirects to
  the page above that matches (302).

A page with no listed business is not found (no thin pages); so is every page
when the platform turns the directory off. Links to booking pages carry
`?source=directory`. The look of each card comes from the business's published
release (`growth/directory_look.py`). Styles: `public/css/directory.css`;
progressive enhancement (search counts, live "next free" times): `public/js/directory.js`.
"""

from __future__ import annotations

import json
import math
import os
from collections import Counter
from datetime import datetime
from urllib.parse import quote, urlencode

import frappe
import pytz
from frappe import _
from frappe.utils import cint, get_url, nowdate

from appointment.growth import directory, directory_look
from appointment.growth.brand import brand

no_cache = 1
PAGE_SIZE = 24
TITLE_LIMIT = 60
DESCRIPTION_LIMIT = 155
PLACE = "in"
# The part of the index heading drawn in the accent (a substring of the translated heading; no accent when absent).
INDEX_ACCENT = {"en": "book online", "am": "በኦንላይን ቀጠሮ ይያዙ"}
ZONE = "Africa/Addis_Ababa"

# Category art: a line icon and the landing page hour whose sky tints the tile (`landing.css` worlds).
CATEGORY_ART = {
    "salon-barber": ("scissors", "solo"),
    "spa-beauty": ("lotus", "insights"),
    "clinic": ("stethoscope", "care"),
    "dental": ("tooth", "desk"),
    "tutoring": ("book", "team"),
    "fitness": ("pulse", "moves"),
    "consulting": ("chat", "desk"),
    "legal": ("scales", "grow"),
    "tailoring": ("garment", "insights"),
    "photography": ("camera", "dawn"),
    "real-estate": ("house", "team"),
}
DEFAULT_ART = ("door", "care")

# Where the Addis Ababa sub-cities sit on the stylised map (percent of the map box, north up).
MAP = {
    "gulele": (44, 13), "yeka": (71, 22), "arada": (53, 31), "kolfe-keranio": (16, 40), "addis-ketema": (35, 38),
    "lemi-kura": (89, 38), "lideta": (36, 55), "kirkos": (55, 50), "bole": (74, 60), "nifas-silk-lafto": (38, 73),
    "akaky-kaliti": (58, 88),
}


def get_context(context):
    form = frappe.local.form_dict
    lang = "am" if form.get("lang") == "am" else "en"
    if not directory.enabled():
        raise frappe.PageDoesNotExistError
    categories, areas = directory.categories(), directory.areas()
    if not form.get("category") and (form.get("service") or form.get("where")):
        _redirect_search(lang, categories, areas, form.get("service"), form.get("where"))
    place = str(form.get("category") or "").lower() == PLACE
    category = None if place else _find(categories, form.get("category"))
    area = _find(areas, form.get("area"))
    if (form.get("category") and not (category or place)) or (form.get("area") and not area) or (place and not area):
        raise frappe.PageDoesNotExistError
    missing = _find(areas, form.get("missing")) if category and not area else None
    page = Page(lang, category, area, cint(form.get("page")) or 1, missing=missing)
    context.update(page.context())
    return context


def _find(rows, slug):
    slug = str(slug or "").lower()
    return next((row for row in rows if row.slug == slug), None) if slug else None


def path(lang: str, category=None, area=None, page: int = 1) -> str:
    """Site-relative path of a directory page. An area without a category is the area page `/directory/in/<area>`."""
    parts = ["am"] if lang == "am" else []
    parts.append("directory")
    if category:
        parts.append(category.slug)
    elif area:
        parts.append(PLACE)
    if area:
        parts.append(area.slug)
    url = "/" + "/".join(quote(part) for part in parts)
    return f"{url}?page={page}" if page > 1 else url


def _redirect_search(lang, categories, areas, service, where):
    """The search form without JavaScript: go to the page for the chosen category and area.

    When nothing in that category is in that area, go to the category page, which says so.
    """
    category, area = _find(categories, service), _find(areas, where)
    target = path(lang)
    if category and area:
        found = any(row["category"] == category.name and row["area"] == area.name for row in directory.listings())
        target = path(lang, category, area) if found else f"{path(lang, category)}?{urlencode({'missing': area.slug})}"
    elif category or area:
        target = path(lang, category, area)
    frappe.flags.redirect_location = target
    raise frappe.Redirect(302)


def sitemap_links() -> list[dict]:
    """Every non-empty directory page in both languages, for `/sitemap.xml`."""
    if not directory.enabled():
        return []
    rows = directory.listings()
    if not rows:
        return []
    categories = {row.name: row for row in directory.categories()}
    areas = {row.name: row for row in directory.areas()}
    pages = [(None, None)]
    pages += [(categories[name], None) for name in sorted({row["category"] for row in rows})]
    pages += [(categories[c], areas[a]) for c, a in sorted({(row["category"], row["area"]) for row in rows})]
    pages += [(None, areas[name]) for name in sorted({row["area"] for row in rows})]
    links = []
    for category, area in pages:
        alternates = {lang: get_url(path(lang, category, area)) for lang in ("en", "am")}
        for lang in ("en", "am"):
            links.append(dict(loc=alternates[lang], lastmod=nowdate(), alternates=alternates))
    return links


def _clip(text: str, limit: int) -> str:
    return text if len(text) <= limit else text[: limit - 1].rsplit(" ", 1)[0] + "…"


def _json_ld(data) -> str:
    encoded = json.dumps(data, ensure_ascii=False)
    return encoded.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")


def _split(text: str, needle: str) -> list[dict]:
    """Heading parts: the `needle` is drawn in the italic accent, as on the landing page."""
    index = text.find(needle) if needle else -1
    if index < 0:
        return [dict(text=text, em=False)]
    parts = [dict(text=text[:index], em=False), dict(text=needle, em=True), dict(text=text[index + len(needle):], em=False)]
    return [part for part in parts if part["text"]]


def asset_version() -> str:
    public = os.path.join(frappe.get_app_path("appointment"), "public")
    paths = [os.path.join(public, "css", "directory.css"), os.path.join(public, "js", "directory.js")]
    try:
        return str(int(max(os.path.getmtime(item) for item in paths if os.path.exists(item))))
    except ValueError:
        return "1"


class Page:
    def __init__(self, lang, category, area, number, missing=None):
        self.lang, self.category, self.area, self.number, self.missing = lang, category, area, number, missing
        self.brand = brand()
        self.categories = {row.name: row for row in directory.categories()}
        self.areas = {row.name: row for row in directory.areas()}

    def t(self, text: str) -> str:
        return _(text, lang=self.lang)

    def label(self, row, field):
        return directory.label(row, self.lang, field)

    # -- content ---------------------------------------------------------
    def context(self) -> dict:
        everything = directory.listings()
        rows = [row for row in everything if (not self.category or row["category"] == self.category.name)
                and (not self.area or row["area"] == self.area.name)]
        if not rows:
            raise frappe.PageDoesNotExistError
        pages = max(1, math.ceil(len(rows) / PAGE_SIZE))
        if self.number > pages or self.number < 1:
            raise frappe.PageDoesNotExistError
        shown = rows[(self.number - 1) * PAGE_SIZE: self.number * PAGE_SIZE]
        title, h1, description = self.headings(len(rows))
        canonical = get_url(path(self.lang, self.category, self.area, self.number))
        cards = [self.card(row, eager=index < 2) for index, row in enumerate(shown)]
        other = "en" if self.lang == "am" else "am"
        search = self.search(everything)
        og_image = self.brand.get("og_image") or ""
        return dict(
            no_header=1, no_breadcrumbs=1, lang=self.lang, title=title, h1=h1, h1_parts=self.h1_parts(h1), description=description,
            canonical_url=canonical, product_name=self.brand["product_name"], brand=self.brand,
            alternates=[dict(lang=lang, href=get_url(path(lang, self.category, self.area, self.number))) for lang in ("en", "am")],
            x_default=get_url(path("en", self.category, self.area, self.number)),
            other_language=dict(label="English" if self.lang == "am" else "አማርኛ", code="EN" if self.lang == "am" else "አማ",
                                href=path(other, self.category, self.area, self.number), lang=other),
            home_href="/am" if self.lang == "am" else "/", directory_href=path(self.lang), cards=cards, count=len(rows),
            count_label=self.count_label(len(rows)), breadcrumbs=self.breadcrumbs(), groups=self.groups(everything), kind=self.kind(),
            category_links=self.category_links(everything), area_links=self.area_links(everything),
            pagination=self.pagination(pages), json_ld=_json_ld(self.item_list(cards, canonical)),
            breadcrumb_json_ld=_json_ld(self.breadcrumb_ld()), og_image=get_url(og_image) if og_image.startswith("/") else og_image,
            signup_href="/signup?source=directory", templates_href="/templates", t=self.strings(), stats=self.stats(everything),
            search=search, script_data=_json_ld(dict(search["data"], lang=self.lang, zone=ZONE, live=self.live_labels())),
            map=self.area_map(everything), missing=self.missing_note(),
            clock=datetime.now(pytz.timezone(ZONE)).strftime("%H:%M"), asset_version=asset_version(),
        )

    def kind(self):
        if self.area and not self.category:
            return "place"
        return "area" if self.area else "category" if self.category else "index"

    def headings(self, count):
        product = self.brand["product_name"]
        if self.area:
            area = self.label(self.area, "area_name")
            if self.category:
                phrase = self.phrase()
                h1 = self.t("Book {0} in {1}").format(phrase, area) if self.lang == "en" else f"በ{area} {phrase} ቀጠሮ ይያዙ"
            else:
                h1 = self.t("Book online in {0}").format(area)
            description = (self.t("One business in {0} you can book online. Compare services and pick a time that suits you.").format(area)
                           if count == 1 else
                           self.t("{0} businesses in {1} you can book online. Compare services and pick a time that suits you.").format(count, area))
        elif self.category:
            phrase = self.phrase()
            h1 = self.t("Book {0}").format(phrase) if self.lang == "en" else f"{phrase} ቀጠሮ ይያዙ"
            description = self.label(self.category, "description") or self.t("Businesses you can book online.")
        else:
            h1 = self.t("Find a business and book online")
            description = self.t("Salons, clinics, tutors and more across Ethiopia. Browse by service and area, then book a time online.")
        title = f"{h1} | {product}"
        if self.number > 1:
            title = f"{h1} · {self.t('Page {0}').format(self.number)} | {product}"
        if len(title) > TITLE_LIMIT:
            title = _clip(h1, TITLE_LIMIT)
        return title, h1, _clip(description, DESCRIPTION_LIMIT)

    def h1_parts(self, h1):
        if self.area:
            return _split(h1, self.label(self.area, "area_name"))
        if self.category:
            return _split(h1, self.phrase())
        return _split(h1, INDEX_ACCENT[self.lang])

    def count_label(self, count: int) -> str:
        return self.t("1 business") if count == 1 else self.t("{0} businesses").format(count)

    def phrase(self):
        row = self.category
        if self.lang == "am":
            return row.booking_phrase_am or row.category_name_am or row.category_name
        return row.booking_phrase_en or row.category_name

    def stats(self, rows):
        """The live counts under the hero: businesses, kinds of service and areas listed now."""
        kinds, places = len({row["category"] for row in rows}), len({row["area"] for row in rows})
        return [dict(value=len(rows), label=self.t("Business listed") if len(rows) == 1 else self.t("Businesses listed")),
                dict(value=kinds, label=self.t("Kind of service") if kinds == 1 else self.t("Kinds of service")),
                dict(value=places, label=self.t("Area covered") if places == 1 else self.t("Areas covered"))]

    def search(self, rows):
        """The search form: only categories and areas that have businesses, with counts, and the counts per pair for the script."""
        by_category, by_area = Counter(row["category"] for row in rows), Counter(row["area"] for row in rows)
        pairs = Counter((row["category"], row["area"]) for row in rows)
        categories = [dict(value=row.slug, label=self.label(row, "category_name"), count=by_category[name],
                           selected=bool(self.category and self.category.name == name))
                      for name, row in self.categories.items() if by_category.get(name)]
        areas = [dict(value=row.slug, label=self.label(row, "area_name"), count=by_area[name], selected=bool(self.area and self.area.name == name))
                 for name, row in self.areas.items() if by_area.get(name)]
        data = dict(base=path(self.lang), place=PLACE,
                    pairs={f"{self.categories[c].slug}/{self.areas[a].slug}": n for (c, a), n in pairs.items()},
                    total=len(rows), labels=dict(any=self.t("Show all {0}"), some=self.t("Show {0}"), none=self.t("Nothing listed here yet"),
                                                 one=self.t("1 business"), many=self.t("{0} businesses")))
        return dict(categories=categories, areas=areas, action=path(self.lang), data=data)

    def card(self, row, eager: bool = False) -> dict:
        area, category = self.areas[row["area"]], self.categories[row["category"]]
        look = directory_look.from_release(row["release"]) if row.get("release") else directory_look.from_services(row.get("owner_key"))
        names = dict(row.get("names") or {})
        if look.get("local_title") and not names.get("am"):
            names["am"] = look["local_title"]
        # The business name in the page language (`directory.booking_pages` names), else the English one.
        name = names.get(self.lang) or row["name"]
        tagline = (look.get("tagline") or {}).get(self.lang) or ""
        description = (row.get("descriptions") or {}).get(self.lang) or row["description"]
        site = bool(row.get("release"))
        page_path = row.get("path") or (row.get("href") or "").split("?")[0]
        return dict(**{**row, "name": name, "description": description}, area_label=self.label(area, "area_name"),
                    city=self.label(area, "city"), region=area.city or "", category_label=self.label(category, "category_name"),
                    category_slug=category.slug, area_slug=area.slug, icon=CATEGORY_ART.get(category.slug, DEFAULT_ART)[0],
                    initials="".join(word[0] for word in name.split()[:2]).upper(),
                    logo_url=get_url(row["logo"]) if row["logo"] else "", tagline=tagline,
                    picture=self.picture(look.get("picture"), eager), accent=look.get("accent") or {},
                    offers=[self.offer(item) for item in directory_look.ranked_offers(look, row.get("ranking") or [])],
                    live_path=page_path if site and look.get("live") else "",
                    site_href=self.site_href(page_path, site), book_href=self.book_href(page_path, site))

    def site_href(self, page_path, site):
        if site and self.lang == "am":
            return f"{page_path}/am?source={directory.SOURCE}"
        return self.book_href(page_path, False) if not site else f"{page_path}?source={directory.SOURCE}"

    def book_href(self, page_path, site):
        """The booking page: the website's booking handoff in the page language, else the scheduler page."""
        query = {"source": directory.SOURCE}
        if site:
            if self.lang == "am":
                query["locale"] = "am"
            return f"{page_path}/book?{urlencode(query)}"
        if self.lang == "am":
            query["lang"] = "am"
        return f"{page_path}?{urlencode(query)}"

    def picture(self, picture, eager):
        if not picture:
            return None
        return dict(picture, alt=(picture.get("alt") or {}).get(self.lang) or "", eager=eager)

    def offer(self, item) -> dict:
        names = item.get("names") or {}
        price = item.get("price")
        if price is None:
            price_label = ""
        elif not price:
            price_label = self.t("Free")
        else:
            amount = f"{price:,.0f}" if float(price).is_integer() else f"{price:,.2f}"
            currency = item.get("currency") or "ETB"
            price_label = f"{amount} ብር" if self.lang == "am" and currency == "ETB" else f"{currency} {amount}"
        duration = item.get("duration")
        return dict(name=names.get(self.lang) or names.get("en") or names.get("am") or "", price=price_label,
                    duration=self.t("{0} min").format(duration) if duration else "")

    def groups(self, rows):
        """Index page: each non-empty category with its count, art and non-empty areas."""
        if self.category or self.area:
            return []
        groups = []
        for name, category in self.categories.items():
            mine = [row for row in rows if row["category"] == name]
            if not mine:
                continue
            counts = Counter(row["area"] for row in mine)
            art = CATEGORY_ART.get(category.slug, DEFAULT_ART)
            groups.append(dict(label=self.label(category, "category_name"), href=path(self.lang, category), count=len(mine),
                               count_label=self.count_label(len(mine)), description=self.label(category, "description"),
                               icon=art[0], world=art[1], slug=category.slug,
                               areas=[dict(label=self.label(self.areas[a], "area_name"), href=path(self.lang, category, self.areas[a]), count=counts[a])
                                      for a in self.areas if counts.get(a)]))
        return groups

    def area_map(self, rows):
        """The stylised Addis Ababa map: every sub-city, lit and linked when it has businesses; other towns below it."""
        counts = Counter(row["area"] for row in rows if not self.category or row["category"] == self.category.name)
        pins, towns = [], []
        for name, area in self.areas.items():
            link = dict(label=self.label(area, "area_name"), count=counts.get(name, 0), slug=area.slug,
                        href=path(self.lang, self.category, area) if counts.get(name) else "",
                        current=bool(self.area and self.area.name == name),
                        count_label=self.count_label(counts.get(name, 0)))
            if area.slug in MAP:
                x, y = MAP[area.slug]
                pins.append(dict(link, x=x, y=y))
            elif counts.get(name):
                towns.append(link)
        return dict(pins=pins, towns=towns, lit=[pin for pin in pins if pin["href"]])

    def area_links(self, rows):
        """Category pages: the areas in this category. Area pages: the other areas."""
        if not self.category:
            return []
        counts = Counter(row["area"] for row in rows if row["category"] == self.category.name)
        return [dict(label=self.label(area, "area_name"), href=path(self.lang, self.category, area), count=counts[name],
                     current=bool(self.area and self.area.name == name))
                for name, area in self.areas.items() if counts.get(name)]

    def category_links(self, rows):
        """Area pages: other categories in the same area. Area-only pages: every category in the area."""
        if not self.area:
            return []
        counts = Counter(row["category"] for row in rows if row["area"] == self.area.name)
        return [dict(label=self.label(category, "category_name"), href=path(self.lang, category, self.area), count=counts[name],
                     icon=CATEGORY_ART.get(category.slug, DEFAULT_ART)[0])
                for name, category in self.categories.items() if counts.get(name) and (not self.category or name != self.category.name)]

    def live_labels(self):
        """Labels for the live "next free" times the script adds (`get_next_availability`)."""
        return dict(endpoint="/api/method/appointment.public_experience.api.get_next_availability",
                    next=self.t("Next free time: {when}, {time}"), today=self.t("Today"), tomorrow=self.t("Tomorrow"))

    def missing_note(self):
        if not self.missing:
            return ""
        return self.t("Nothing in {0} lists here yet. Here is everything in this category.").format(self.label(self.missing, "area_name"))

    def breadcrumbs(self):
        crumbs = [dict(label=self.t("Directory"), href=path(self.lang))]
        if self.category:
            crumbs.append(dict(label=self.label(self.category, "category_name"), href=path(self.lang, self.category)))
        if self.area:
            crumbs.append(dict(label=self.label(self.area, "area_name"), href=path(self.lang, self.category, self.area)))
        return crumbs

    def pagination(self, pages):
        if pages <= 1:
            return None
        link = lambda number: path(self.lang, self.category, self.area, number)  # noqa: E731
        return dict(current=self.number, pages=pages,
                    previous=link(self.number - 1) if self.number > 1 else None,
                    next=link(self.number + 1) if self.number < pages else None,
                    label=self.t("Page {0} of {1}").format(self.number, pages))

    # -- structured data ---------------------------------------------------
    def item_list(self, cards, canonical):
        items = []
        for index, card in enumerate(cards, start=(self.number - 1) * PAGE_SIZE + 1):
            business = {
                "@type": "LocalBusiness", "name": card["name"], "url": get_url(card["site_href"]),
                "address": {"@type": "PostalAddress", "addressLocality": card["area_label"], "addressRegion": card["region"], "addressCountry": "ET"},
            }
            if card["logo_url"]:
                business["image"] = card["logo_url"]
            if card["description"]:
                business["description"] = card["description"]
            if card["offers"]:
                business["makesOffer"] = [{"@type": "Offer", "itemOffered": {"@type": "Service", "name": offer["name"]}} for offer in card["offers"]]
            elif card["services"]:
                business["makesOffer"] = [{"@type": "Offer", "itemOffered": {"@type": "Service", "name": name}} for name in card["services"]]
            items.append({"@type": "ListItem", "position": index, "item": business})
        return {"@context": "https://schema.org", "@type": "ItemList", "url": canonical, "numberOfItems": len(items), "itemListElement": items}

    def breadcrumb_ld(self):
        return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": index, "name": crumb["label"], "item": get_url(crumb["href"])}
            for index, crumb in enumerate(self.breadcrumbs(), start=1)]}

    def strings(self) -> dict:
        t = self.t
        return dict(
            eyebrow=t("Business directory"), breadcrumb=t("Breadcrumb"), book=t("Book now"), services=t("Popular services"),
            categories=t("Browse by service"), areas=t("Areas"), other_categories=t("More in this area"),
            previous=t("Previous page"), next=t("Next page"), owner_title=t("Run a business?"), owner_title_em=t("Get your own booking page."),
            owner_body=t("Get a free booking page and appear in this directory."), owner_cta=t("Get your booking page"),
            all_areas=t("All areas"), home=t("Home page"),
            footer=t("Businesses choose to appear here. Booking happens on each business's own page."),
            place=t("Addis Ababa, open for booking"), search_label=t("Find a business"), service=t("Service"), where=t("Where"),
            any_service=t("Any service"), any_area=t("Anywhere"), go=t("Search"), listed=t("Listed businesses"),
            map_title=t("Browse by area"), map_lede=t("Lit areas have businesses you can book online."), beyond=t("Beyond Addis Ababa"),
            website=t("Visit website"), templates=t("Templates"), skip=t("Skip to the businesses"),
            owner_eyebrow=t("For business owners"), owner_points=[t("Free to start"), t("Live in 5 minutes"), t("English and Amharic")],
            more_areas=t("Other areas for this service"), clock=t("Time in Addis Ababa"), menu=t("Main menu"),
        )
