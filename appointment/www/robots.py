"""`/robots.txt`: Website Settings text plus the sitemap location (see appointment.growth.seo)."""

from appointment.growth.seo import robots_txt

no_cache = 1
base_template_path = "www/robots.txt"


def get_context(context):
    return {"robots_txt": robots_txt()}
