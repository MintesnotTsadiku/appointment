"""Site-owned upstream categories and authors; no global support-record reuse."""

import frappe

from appointment.content import tenancy


def article_support(site):
    category = _existing(site, "Blog Category")
    if not category:
        category = frappe.get_doc({"doctype": "Blog Category", "title": "Website " + site.name}).insert(ignore_permissions=True).name
        bind(site, "Blog Category", category)
    blogger = _existing(site, "Blogger")
    if not blogger:
        blogger = frappe.get_doc({"doctype": "Blogger", "short_name": "website-" + site.name,
                                  "full_name": site.site_title}).insert(ignore_permissions=True).name
        bind(site, "Blogger", blogger)
    # Preserve upstream link restrictions and grant only this managed website's
    # author for Blog Post. Never disable user permissions for the whole DocType.
    tenancy.require_manage_business(site.owner_type, site.organization, site.provider)
    frappe.permissions.add_user_permission("Blogger", blogger, frappe.session.user,
                                          ignore_permissions=True, applicable_for="Blog Post")
    return category, blogger


def bind(site, doctype, name):
    if doctype not in {"Blog Category", "Blogger"}:
        raise ValueError("Unsupported article support record")
    tenancy.require_manage_business(site.owner_type, site.organization, site.provider)
    doc = frappe.get_doc({"doctype": "Content Ownership", "owner_type": site.owner_type,
                          "organization": site.organization, "provider": site.provider,
                          "public_site": site.name, "source_doctype": doctype,
                          "source_name": name, "capability": "blog"})
    return doc.insert()


def validate_article(post, site):
    if not site:
        frappe.throw("Article publication requires its owning website.", frappe.PermissionError)
    for field, doctype in (("blog_category", "Blog Category"), ("blogger", "Blogger")):
        name = post.get(field)
        if name and not frappe.db.exists("Content Ownership", {
            "public_site": site, "source_doctype": doctype, "source_name": name,
        }):
            frappe.throw("Choose an article category and author belonging to this website.", frappe.PermissionError)


def _existing(site, doctype):
    rows = frappe.get_all("Content Ownership", filters={"public_site": site.name, "source_doctype": doctype},
                          fields=["source_name"], limit=2)
    if len(rows) > 1:
        frappe.throw("This website has ambiguous article support records.", frappe.PermissionError)
    if rows:
        if not frappe.db.exists(doctype, rows[0].source_name):
            frappe.throw("This website's article support record is missing.", frappe.PermissionError)
        return rows[0].source_name
    return None
