"""Public business directory: server-rendered SEO pages.

Routes (hooks `website_route_rules`):

- `/directory`: categories and areas that have listed businesses.
- `/directory/<category>`: businesses in one category, with area links.
- `/directory/<category>/<area>`: businesses in one category and area ("Book a salon in Bole").
- The same paths under `/am/` in Amharic, with hreflang links between the two.

A page with no listed business is not found (no thin pages); so is every page
when the platform turns the directory off. Links to booking pages carry
`?source=directory`.
"""

from __future__ import annotations

import json
import math
from collections import Counter
from urllib.parse import quote

import frappe
from frappe import _
from frappe.utils import cint, get_url, nowdate

from appointment.growth import directory
from appointment.growth.brand import brand

no_cache = 1
PAGE_SIZE = 24
TITLE_LIMIT = 60
DESCRIPTION_LIMIT = 155


def get_context(context):
    form = frappe.local.form_dict
    lang = "am" if form.get("lang") == "am" else "en"
    if not directory.enabled():
        raise frappe.PageDoesNotExistError
    category = _find(directory.categories(), form.get("category"))
    area = _find(directory.areas(), form.get("area"))
    if (form.get("category") and not category) or (form.get("area") and not area):
        raise frappe.PageDoesNotExistError
    page = Page(lang, category, area, cint(form.get("page")) or 1)
    context.update(page.context())
    return context


def _find(rows, slug):
    slug = str(slug or "").lower()
    return next((row for row in rows if row.slug == slug), None) if slug else None


def path(lang: str, category=None, area=None, page: int = 1) -> str:
    """Site-relative path of a directory page."""
    parts = ["am"] if lang == "am" else []
    parts.append("directory")
    if category:
        parts.append(category.slug)
        if area:
            parts.append(area.slug)
    url = "/" + "/".join(quote(part) for part in parts)
    return f"{url}?page={page}" if page > 1 else url


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


class Page:
    def __init__(self, lang, category, area, number):
        self.lang, self.category, self.area, self.number = lang, category, area, number
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
        cards = [self.card(row) for row in shown]
        return dict(
            no_header=1, no_breadcrumbs=1, lang=self.lang, title=title, h1=h1, description=description,
            canonical=canonical, product_name=self.brand["product_name"], brand=self.brand,
            alternates=[dict(lang=lang, href=get_url(path(lang, self.category, self.area, self.number))) for lang in ("en", "am")],
            x_default=get_url(path("en", self.category, self.area, self.number)),
            other_language=dict(label="English" if self.lang == "am" else "አማርኛ",
                                href=path("en" if self.lang == "am" else "am", self.category, self.area, self.number),
                                lang="en" if self.lang == "am" else "am"),
            home_href="/", directory_href=path(self.lang), cards=cards, count=len(rows), count_label=self.count_label(len(rows)),
            breadcrumbs=self.breadcrumbs(), groups=self.groups(everything), kind=self.kind(),
            category_links=self.category_links(everything), area_links=self.area_links(everything),
            pagination=self.pagination(pages), json_ld=_json_ld(self.item_list(cards, canonical)),
            breadcrumb_json_ld=_json_ld(self.breadcrumb_ld()), og_image=self.brand.get("og_image") or "",
            signup_href="/signup?source=directory", t=self.strings(),
        )

    def kind(self):
        return "area" if self.area else "category" if self.category else "index"

    def headings(self, count):
        product = self.brand["product_name"]
        if self.category and self.area:
            area = self.label(self.area, "area_name")
            phrase = self.phrase()
            h1 = self.t("Book {0} in {1}").format(phrase, area) if self.lang == "en" else f"በ{area} {phrase} ቀጠሮ ይያዙ"
            description = self.t("{0} businesses in {1} you can book online. Compare services and pick a time that suits you.").format(count, area)
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

    def count_label(self, count: int) -> str:
        return self.t("1 business") if count == 1 else self.t("{0} businesses").format(count)

    def phrase(self):
        row = self.category
        if self.lang == "am":
            return row.booking_phrase_am or row.category_name_am or row.category_name
        return row.booking_phrase_en or row.category_name

    def card(self, row) -> dict:
        area, category = self.areas[row["area"]], self.categories[row["category"]]
        return dict(**row, area_label=self.label(area, "area_name"), city=area.city or "",
                    category_label=self.label(category, "category_name"),
                    initials="".join(word[0] for word in row["name"].split()[:2]).upper(),
                    logo_url=get_url(row["logo"]) if row["logo"] else "")

    def groups(self, rows):
        """Index page: each non-empty category with its non-empty areas."""
        if self.category:
            return []
        groups = []
        for name, category in self.categories.items():
            mine = [row for row in rows if row["category"] == name]
            if not mine:
                continue
            counts = Counter(row["area"] for row in mine)
            groups.append(dict(label=self.label(category, "category_name"), href=path(self.lang, category), count_label=self.count_label(len(mine)),
                               description=self.label(category, "description"),
                               areas=[dict(label=self.label(self.areas[a], "area_name"), href=path(self.lang, category, self.areas[a]), count=counts[a])
                                      for a in self.areas if counts.get(a)]))
        return groups

    def area_links(self, rows):
        """Category pages: the areas in this category. Area pages: the other areas."""
        if not self.category:
            return []
        counts = Counter(row["area"] for row in rows if row["category"] == self.category.name)
        return [dict(label=self.label(area, "area_name"), href=path(self.lang, self.category, area), count=counts[name],
                     current=bool(self.area and self.area.name == name))
                for name, area in self.areas.items() if counts.get(name)]

    def category_links(self, rows):
        """Area pages: other categories in the same area."""
        if not self.area:
            return []
        counts = Counter(row["category"] for row in rows if row["area"] == self.area.name)
        return [dict(label=self.label(category, "category_name"), href=path(self.lang, category, self.area), count=counts[name])
                for name, category in self.categories.items() if counts.get(name) and name != self.category.name]

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
                "@type": "LocalBusiness", "name": card["name"], "url": get_url(card["href"]),
                "address": {"@type": "PostalAddress", "addressLocality": card["area_label"], "addressRegion": card["city"], "addressCountry": "ET"},
            }
            if card["logo_url"]:
                business["image"] = card["logo_url"]
            if card["description"]:
                business["description"] = card["description"]
            if card["services"]:
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
            previous=t("Previous page"), next=t("Next page"), owner_title=t("Run a business?"),
            owner_body=t("Get a free booking page and appear in this directory."), owner_cta=t("Get your booking page"),
            all_areas=t("All areas"), home=t("Home page"),
            footer=t("Businesses choose to appear here. Booking happens on each business's own page."),
        )
