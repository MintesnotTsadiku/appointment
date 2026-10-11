"""The list of free tools, their URLs in each language and the sitemap entries."""

from __future__ import annotations

from dataclasses import dataclass

from frappe.utils import get_url, nowdate

LANGS = ("en", "am")


@dataclass(frozen=True)
class Tool:
    slug: str  # URL slug; "" is the /tools index
    group: str  # catalog group with title, description, h1 and FAQ keys
    script: str  # page script in public/js/tools, "" for none
    faq_count: int
    icon: str  # inline icon name in templates/tools/icons.html

    @property
    def source(self) -> str:
        """The sign-up `source` value for this tool."""

        return f"tool_{self.slug or 'index'}"

    def path(self, lang: str = "en") -> str:
        base = "/am/tools" if lang == "am" else "/tools"
        return f"{base}/{self.slug}" if self.slug else base


INDEX = Tool("", "tools.index", "", 0, "grid")
TOOLS = (
    Tool("ethiopian-time-converter", "tools.timeConverter", "time-converter", 6, "clock"),
    Tool("ethiopian-calendar-converter", "tools.calendar", "calendar-converter", 6, "calendar"),
    Tool("amharic-appointment-reminder", "tools.reminder", "reminder", 5, "message"),
    Tool("business-hours-sign", "tools.hoursSign", "hours-sign", 5, "sign"),
)
BY_SLUG = {tool.slug: tool for tool in (INDEX, *TOOLS)}


def get(slug: str) -> Tool:
    return BY_SLUG[slug]


def tools_enabled() -> bool:
    from appointment.growth.settings import growth

    return bool(growth().get("tools_enabled"))


def sitemap_links() -> list[dict]:
    """Every tool page in both languages, with hreflang alternates. Empty when tools are off."""

    if not tools_enabled():
        return []
    links = []
    for tool in (INDEX, *TOOLS):
        alternates = {lang: get_url(tool.path(lang)) for lang in LANGS}
        for lang in LANGS:
            links.append({"loc": alternates[lang], "lastmod": nowdate(), "alternates": alternates})
    return links
