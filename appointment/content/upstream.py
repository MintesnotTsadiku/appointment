"""Keep upstream drafts out of public routes and legacy delivery paths."""

import frappe
from blog.blog.doctype.blog_post.blog_post import BlogPost
from newsletter.newsletter.doctype.newsletter.newsletter import Newsletter


def block_legacy_public_routes():
    request = getattr(frappe.local, "request", None)
    path = (getattr(request, "path", "") or "").strip("/").split("/", 1)[0]
    if path in {"blog", "blog-category", "rss", "rss.xml"}:
        frappe.throw("Use the published business website for articles.", frappe.DoesNotExistError)


class GovernedBlogPost(BlogPost):
    def validate(self):
        if self.published:
            frappe.throw("Publish articles through the website content workspace.")
        self.enable_email_notification = 0
        super().validate()

    def get_context(self, context):
        frappe.throw("This article route is unavailable.", frappe.DoesNotExistError)


class GovernedNewsletter(Newsletter):
    def validate(self):
        if self.published or self.schedule_sending or self.schedule_send:
            frappe.throw("Use the business newsletter workspace to preview and schedule newsletters.")
        super().validate()

    def get_context(self, context):
        frappe.throw("This newsletter route is unavailable.", frappe.DoesNotExistError)

    @frappe.whitelist()
    def send_test_email(self, email):
        _delivery_unavailable()

    @frappe.whitelist()
    def send_emails(self):
        _delivery_unavailable()

    @frappe.whitelist()
    def find_broken_links(self):
        frappe.throw("Newsletter links must pass the local content validator.")

    def queue_all(self):
        _delivery_unavailable()

    def send_newsletter(self, emails, test_email=False):
        _delivery_unavailable()


def _delivery_unavailable():
    frappe.throw("Use the business newsletter workspace. Legacy newsletter delivery is disabled.", frappe.PermissionError)


@frappe.whitelist(allow_guest=True)
def legacy_subscription_unavailable(**kwargs):
    frappe.throw("Use the newsletter form on the business website.", frappe.PermissionError)
