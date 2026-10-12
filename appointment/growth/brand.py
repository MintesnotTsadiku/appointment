"""The platform's own brand: product name, links, logos and contact details."""

from urllib.parse import urlparse

from frappe.utils import get_url

from appointment.growth import cache
from appointment.growth.language import pick

DOCTYPE = "Platform Brand Settings"


def brand() -> dict:
    """Brand values; `tagline` is in the current language. Every key is always present."""
    values = cache.stored(DOCTYPE)
    product_url = (values.get("product_url") or get_url()).rstrip("/")
    short_host = values.get("short_host") or _host(product_url)
    return dict(
        product_name=values.get("product_name") or short_host,
        product_url=product_url,
        short_host=short_host,
        logo=values.get("logo") or "",
        logo_dark=values.get("logo_dark") or values.get("logo") or "",
        mark=values.get("mark") or "",
        primary_color=values.get("primary_color") or "",
        tagline=pick(values, "tagline"),
        tagline_en=values.get("tagline_en") or "",
        tagline_am=values.get("tagline_am") or "",
        support_email=values.get("support_email") or "",
        telegram_url=values.get("telegram_url") or "",
        og_image=values.get("og_image") or "",
    )


def _host(url: str) -> str:
    host = urlparse(url).netloc or url
    return host.removeprefix("www.")

