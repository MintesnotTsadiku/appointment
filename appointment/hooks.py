app_name = "appointment"
app_title = "Appointment"
app_publisher = "minte"
app_description = "The appointment scheduling app with team support in Frappe."
app_email = "mtsadiku@gmail.com"
app_license = "GNU AFFERO GENERAL PUBLIC LICENSE (v3)"
# required_apps = []

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
after_install = "appointment.tasks.import_email_templates.import_email_templates"

after_sync = [
    "appointment.tasks.setup_erpnext_fields.setup_erpnext_fields",
    "appointment.tasks.import_form_tour_google_calendar.import_doc",
]

after_migrate = [
    "appointment.tasks.setup_erpnext_fields.setup_erpnext_fields",
    "appointment.tasks.import_form_tour_google_calendar.import_doc",
    "appointment.tasks.import_email_templates.import_email_templates",
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
    "Booking Event": "appointment.overrides.event_override.BookingEventOverride",
    "Google Calendar": "appointment.overrides.google_calendar_override.GoogleCalendarOverride",
    "Customize Form": "appointment.overrides.customize_form_override.AppointmentOverrideCustomizeForm",
}

# Document Events
# ---------------
# Hook on document methods and events

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
    "frappe.integrations.doctype.google_calendar.google_calendar.google_callback": "appointment.overrides.google_calendar_override.google_callback"
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
# before_request = ["appointment.utils.before_request"]
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
