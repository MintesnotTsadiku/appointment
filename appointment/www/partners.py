"""Partner program page: `/partners` (English) and `/am/partners` (Amharic). See appointment/growth/partner_page.py."""

from appointment.growth import partner_page

# Listed in /sitemap.xml with hreflang alternates by `partner_page.sitemap_links` (hook appointment_sitemap_links).
sitemap = 0
no_cache = 1


def get_context(context):
    return partner_page.build(context)
