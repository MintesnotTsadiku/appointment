app_name = "appointment"
app_title = "Appointment"
app_publisher = "minte"
app_description = "The appointment scheduling app with team support in Frappe."
app_email = "mtsadiku@gmail.com"
app_license = "GNU AFFERO GENERAL PUBLIC LICENSE (v3)"
# Blog and Newsletter were split out of the framework in Frappe v16+. They are
# pinned in docs/operations/content-dependencies.md. required_apps installs apps
# already present on a Bench; the deployment manifest must fetch the pinned Git
# repositories before installing Appointment.
required_apps = ["blog", "newsletter"]

# App Switcher Configuration
# --------------------------
add_to_apps_screen = [
    {
        "name": "appointment",
        "logo": "/assets/appointment/appointment-logo.png",
        "title": "Appointment",
        "route": "app/appointment",
    }
]


# Includes in <head>
# ------------------
website_route_rules = [
    {
        "from_route": "/schedule/<path:app_path>",
        "to_route": "schedule",
    },
    {
        "from_route": "/<path:app_path>",
        "to_route": "/",
    },
]

# include js, css files in header of desk.html
# app_include_css = "/assets/appointment/css/appointment.css"
app_include_js = [
    "/assets/appointment/js/appointment_link.js",
    "/assets/appointment/js/duration_override.js",
]

# Email templates are imported after the app's doctypes exist so that the
# Appointment Settings Link fields resolve on a fresh install.
after_install = [
    "appointment.tasks.import_email_templates.import_email_templates",
    # A new site marks every patch as done, so the Amharic catalog is imported here too.
    "appointment.patches.v0_1.import_frontend_translations.execute",
    "appointment.patches.v0_1.grant_content_doctype_permissions.execute",
]

after_sync = [
    "appointment.tasks.setup_erpnext_fields.setup_erpnext_fields",
    "appointment.tasks.import_form_tour_google_calendar.import_doc",
]

# Security headers for public-experience API responses (CSP with a nonce,
# nosniff, preview no-store/noindex).
after_request = [
    "appointment.public_experience.csp.after_request",
]

after_migrate = [
    "appointment.tasks.setup_erpnext_fields.setup_erpnext_fields",
    # Keeps the Amharic catalog current with en.json and am.json; only adds or updates.
    "appointment.patches.v0_1.import_frontend_translations.execute",
    "appointment.tasks.import_form_tour_google_calendar.import_doc",
    "appointment.tasks.import_email_templates.import_email_templates",
    # recipe manifests are code-owned; no database registry is reconciled.
    "appointment.public_experience.reconcile.ensure_public_site_unique_indexes",
    "appointment.patches.v0_1.grant_content_doctype_permissions.execute",
]

# include js, css files in header of web template
# web_include_css = "/assets/appointment/css/appointment.css"
# web_include_js = "/assets/appointment/js/appointment.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "appointment/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

doctype_js = {
    "Google Calendar": "public/js/google_calendar_override.js",
    "User": "public/js/user_override.js",
}

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "appointment.utils.jinja_methods",
# 	"filters": "appointment.utils.jinja_filters"
# }

fixtures = [
    # Custom Fields for Appointment module
    {
        "dt": "Custom Field",
        "filters": [
            [
                "module",
                "in",
                {
                    "Appointment",
                },
            ]
        ],
    },
    # Property Setters for Appointment module
    {
        "dt": "Property Setter",
        "filters": [
            [
                "module",
                "in",
                {
                    "Appointment",
                },
            ]
        ],
    },
    # Roles for the multi-business system  
    {
        "dt": "Role",
        "filters": [
            [
                "name",
                "in",
                [
                    "Organization Manager",
                    "Front Desk",
                    "Assistant",
                    "Provider",
                ],
            ]
        ],
    },
]

# Installation
# ------------

# before_install = "appointment.install.before_install"
# after_install = "appointment.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "appointment.uninstall.before_uninstall"
# after_uninstall = "appointment.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "appointment.utils.before_app_install"
# after_app_install = "appointment.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "appointment.utils.before_app_uninstall"
# after_app_uninstall = "appointment.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "appointment.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }

has_permission = {
    "Booking Event": "appointment.overrides.event_override.has_permission",
}

# DocType Class
# ---------------
# Override standard doctype classes

override_doctype_class = {
    "Blog Post": "appointment.content.upstream.GovernedBlogPost",
    "Newsletter": "appointment.content.upstream.GovernedNewsletter",
    "Booking Event": "appointment.overrides.event_override.BookingEventOverride",
    "Google Calendar": "appointment.overrides.google_calendar_override.GoogleCalendarOverride",
    "Customize Form": "appointment.overrides.customize_form_override.AppointmentOverrideCustomizeForm",
}

# Document Events
# ---------------
# Hook on document methods and events

extend_doctype_class = {"File": ["appointment.content.media_access.WebsiteFile"]}

doc_events = {
    "Leave Application": {  # Leave Application is a doctype in HR module, which is not a requirement for this app
        "on_submit": "appointment.overrides.leave_application_override.on_submit",
        "on_cancel": "appointment.overrides.leave_application_override.on_cancel_and_on_trash",
        "on_trash": "appointment.overrides.leave_application_override.on_cancel_and_on_trash",
    },
}

# Scheduled Tasks
# ---------------

scheduler_events = {
    # "all": [
    # 	"appointment.tasks.all"
    # ],
    "daily": [
        "appointment.tasks.reminder_google_calendar_auth.send_reminder_mail",
        "appointment.tasks.verify_availability.verify_appointment_group_members_availabililty",
    ],
    "hourly": [
        "appointment.public_experience.hardening.process_pending_outbox",
    ],
    "cron": {
        # Due newsletter campaigns.
        "* * * * *": [
            "appointment.content.newsletter.campaigns.run_due",
        ],
        "*/5 * * * *": [
            "appointment.scheduler.payments.process_holds",
        ],
        "*/15 * * * *": [
            "appointment.scheduler.notifications.send_due_reminders",
            "appointment.scheduler.notification_sms.poll_delivery",
        ],
        # Last month's payment statement to each business owner.
        "0 6 1 * *": [
            "appointment.scheduler.statements.send_monthly_statements",
        ],
    },
    # "hourly": [
    # 	"appointment.tasks.hourly"
    # ],
    # "weekly": [
    # 	"appointment.tasks.weekly"
    # ],
    # "monthly": [
    # 	"appointment.tasks.monthly"
    # ],
}

# Testing
# -------

# before_tests = "appointment.install.before_tests"

# Overriding Methods
# ------------------------------
#
override_whitelisted_methods = {
    "frappe.integrations.doctype.google_calendar.google_calendar.google_callback": "appointment.overrides.google_calendar_override.google_callback",
    "newsletter.newsletter.doctype.newsletter.newsletter.subscribe": "appointment.content.upstream.legacy_subscription_unavailable",
    "newsletter.newsletter.doctype.newsletter.newsletter.confirm_subscription": "appointment.content.upstream.legacy_subscription_unavailable",
    "newsletter.newsletter.doctype.newsletter.newsletter.newsletter_email_read": "appointment.content.upstream.legacy_subscription_unavailable"
}
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "appointment.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
before_request = ["appointment.content.upstream.block_legacy_public_routes"]
# after_request = ["appointment.utils.after_request"]

# Job Events
# ----------
# before_job = ["appointment.utils.before_job"]
# after_job = ["appointment.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"appointment.auth.validate"
# ]

# The booking controller and list predicate enforce the same actor scope.
permission_query_conditions = {
    "Booking Event": "appointment.scheduler.doctype.booking_event.booking_event.get_permission_query_conditions",
    "Appointment": "appointment.scheduler.booking_access.appointment_query",
}
has_permission["Appointment"] = "appointment.scheduler.booking_access.appointment_permission"
for _doctype, _query in {
    "Service": "service",
    "Location": "location",
    "EventType": "eventtype",
    "Provider": "provider",
    "Organization": "organization",
    "Walk In": "walkin",
}.items():
    permission_query_conditions[_doctype] = f"appointment.scheduler.booking_access.{_query}_query"
    has_permission[_doctype] = "appointment.scheduler.booking_access.config_permission"
    doc_events.setdefault(_doctype, {})["validate"] = "appointment.scheduler.booking_access.validate_config"
doc_events.setdefault("Booking Event", {})["validate"] = "appointment.scheduler.booking.guard_calendar_capacity"

# Brand and Public Experience persistence. Query and single-record checks share
# appointment.public_experience.access so lists and direct reads agree.

permission_query_conditions["Brand Profile"] = "appointment.public_experience.access.brand_profile_query"
permission_query_conditions["Brand Revision"] = "appointment.public_experience.access.brand_revision_query"

has_permission["Brand Profile"] = "appointment.public_experience.access.brand_profile_permission"
has_permission["Brand Revision"] = "appointment.public_experience.access.brand_revision_permission"
permission_query_conditions["Public Site"] = "appointment.public_experience.access.public_site_query"
permission_query_conditions["Public Site Domain"] = "appointment.public_experience.access.public_site_domain_query"
permission_query_conditions["Experience Release"] = "appointment.public_experience.access.experience_release_query"
has_permission["Public Site"] = "appointment.public_experience.access.public_site_permission"
has_permission["Public Site Domain"] = "appointment.public_experience.access.public_site_domain_permission"
has_permission["Experience Release"] = "appointment.public_experience.access.experience_release_permission"

# Content tenancy: entitlements, ownership, and upstream authoring isolation.
# The same ownership rule answers lists and direct reads; a global Frappe role
# never grants access to another business.
permission_query_conditions["Business Entitlement"] = "appointment.content.access.business_entitlement_query"
permission_query_conditions["Content Ownership"] = "appointment.content.access.content_ownership_query"
permission_query_conditions["File"] = "appointment.content.access.file_query"
has_permission["File"] = "appointment.content.access.file_permission"
permission_query_conditions["Blog Post"] = "appointment.content.access.blog_post_query"
permission_query_conditions["Newsletter"] = "appointment.content.access.newsletter_query"
permission_query_conditions["Published Content Release"] = "appointment.content.access.published_content_release_query"
permission_query_conditions["Gallery Collection"] = "appointment.content.access.gallery_collection_query"

has_permission["Business Entitlement"] = "appointment.content.access.business_entitlement_permission"
has_permission["Content Ownership"] = "appointment.content.access.content_ownership_permission"
has_permission["Blog Post"] = "appointment.content.access.blog_post_permission"
permission_query_conditions["Blog Category"] = "appointment.content.access.blog_category_query"
permission_query_conditions["Blogger"] = "appointment.content.access.blogger_query"
has_permission["Blog Category"] = "appointment.content.access.article_support_permission"
has_permission["Blogger"] = "appointment.content.access.article_support_permission"
has_permission["Newsletter"] = "appointment.content.access.newsletter_permission"
has_permission["Published Content Release"] = "appointment.content.access.published_content_release_permission"
has_permission["Gallery Collection"] = "appointment.content.access.gallery_collection_permission"

# App-owned managed browser validation, restricted to the isolated content site.
agent_plane_browser_qa_suites = ["appointment.tests.content_browser_suite.suites"]

permission_query_conditions["Organization Workbook Import"] = "appointment.organization_import.access.query"
permission_query_conditions["Business Staff Invitation"] = "appointment.content.staff_invitations.query"
has_permission["Business Staff Invitation"] = "appointment.content.staff_invitations.permission"
has_permission["Organization Workbook Import"] = "appointment.organization_import.access.permission"
permission_query_conditions["Business Membership"] = "appointment.organization_import.access.membership_query"
has_permission["Business Membership"] = "appointment.organization_import.access.membership_permission"

for _newsletter_type, _newsletter_query in {
    "Newsletter Audience Member": "audience_query",
    "Newsletter Sender Identity": "sender_query",
    "Business Newsletter Campaign": "campaign_query",
    "Local Email Message": "sink_query",
}.items():
    permission_query_conditions[_newsletter_type] = f"appointment.content.newsletter.core.{_newsletter_query}"
    has_permission[_newsletter_type] = "appointment.content.newsletter.core.permission"
