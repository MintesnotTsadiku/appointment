"""`/sitemap.xml`: the framework sitemap plus app pages from the `appointment_sitemap_links` hook."""

from frappe.www.sitemap import get_context as framework_context

from appointment.growth.seo import app_sitemap_links, merge_links

no_cache = 1
base_template_path = "www/sitemap.xml"


def get_context(context):
    links = framework_context(context)["links"]
    return {"links": merge_links(links, app_sitemap_links())}
