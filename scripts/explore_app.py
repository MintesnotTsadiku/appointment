"""
Exploration Script for frappe-appointment

Run this in Frappe console to explore the current state:
    bench --site appointment.com console < scripts/explore_app.py

Or copy-paste sections into the console interactively.
"""

import frappe
import json
from frappe.utils import now

print("\n" + "="*80)
print("🔍 FRAPPE-APPOINTMENT EXPLORATION REPORT")
print("="*80 + "\n")

# 1. Check Installed Apps
print("📦 INSTALLED APPS")
print("-" * 40)
apps = frappe.get_installed_apps()
for app in apps:
    print(f"  ✓ {app}")
print()

# 2. Check Appointment Doctypes
print("📋 APPOINTMENT-RELATED DOCTYPES")
print("-" * 40)
appointment_doctypes = [
    "Appointment Group",
    "Appointment Settings", 
    "User Appointment Availability",
    "Appointment Time Slot",
    "Appointment Slot Duration",
    "Members",
    "Event Doctype Link"
]

for dt in appointment_doctypes:
    try:
        if frappe.db.exists("DocType", dt):
            count = frappe.db.count(dt)
            print(f"  ✓ {dt:<35} ({count} records)")
        else:
            print(f"  ✗ {dt:<35} (not found)")
    except Exception as e:
        print(f"  ⚠ {dt:<35} (error: {str(e)[:30]})")
print()

# 3. Check Appointment Groups
print("📅 APPOINTMENT GROUPS")
print("-" * 40)
groups = frappe.get_all("Appointment Group", 
    fields=["name", "group_name", "event_creator", "duration_for_event"],
    limit=10
)
if groups:
    for g in groups:
        duration_mins = (g.duration_for_event or 0) / 60
        print(f"  • {g.group_name}")
        print(f"    ID: {g.name}")
        print(f"    Duration: {duration_mins} mins")
        print(f"    Calendar: {g.event_creator or 'None'}")
        print(f"    URL: /schedule/appointment-group/{g.name}")
        print()
else:
    print("  No appointment groups found. Create one to test!")
print()

# 4. Check Google Calendar Integration
print("🗓️  GOOGLE CALENDAR INTEGRATION")
print("-" * 40)
try:
    google_settings = frappe.get_doc("Google Settings")
    if google_settings.enable:
        print(f"  ✓ Google API is ENABLED")
        print(f"  Client ID: {google_settings.client_id[:20]}..." if google_settings.client_id else "  Client ID: Not set")
    else:
        print(f"  ⚠ Google API is DISABLED")
        print(f"  → Go to 'Google Settings' to enable")
except Exception as e:
    print(f"  ⚠ Google Settings error: {str(e)}")

# Check connected Google Calendars
calendars = frappe.get_all("Google Calendar",
    fields=["name", "user", "calendar_name", "enable"],
    limit=10
)
if calendars:
    print(f"\n  Connected Calendars:")
    for cal in calendars:
        status = "✓ Active" if cal.enable else "⚠ Disabled"
        print(f"    • {cal.calendar_name} ({cal.user}) - {status}")
else:
    print(f"\n  No Google Calendars connected")
    print(f"  → Go to 'Google Calendar' doctype to authorize")
print()

# 5. Check Appointment Settings
print("⚙️  APPOINTMENT SETTINGS")
print("-" * 40)
try:
    settings = frappe.get_doc("Appointment Settings", "Appointment Settings")
    print(f"  Zoom Enabled: {settings.enable_zoom_integration}")
    if settings.enable_zoom_integration:
        print(f"  Zoom Account ID: {settings.zoom_account_id[:20]}..." if settings.zoom_account_id else "  Not configured")
except Exception as e:
    print(f"  ⚠ Error loading settings: {str(e)}")
print()

# 6. Check Recent Events
print("📆 RECENT EVENTS (Bookings)")
print("-" * 40)
events = frappe.get_all("Event",
    fields=["name", "subject", "starts_on", "ends_on", "status", "event_participants"],
    filters={"event_category": "Event"},
    order_by="creation desc",
    limit=5
)
if events:
    for evt in events:
        print(f"  • {evt.subject}")
        print(f"    Status: {evt.status}")
        print(f"    Start: {evt.starts_on}")
        print()
else:
    print("  No events found yet")
print()

# 7. Check User Availability Settings
print("👤 USER AVAILABILITY")
print("-" * 40)
availabilities = frappe.get_all("User Appointment Availability",
    fields=["name", "user", "enabled"],
    limit=5
)
if availabilities:
    for avail in availabilities:
        status = "✓ Enabled" if avail.enabled else "⚠ Disabled"
        print(f"  • {avail.user} - {status}")
else:
    print("  No user availabilities configured")
    print("  → Create in 'User Appointment Availability' doctype")
print()

# 8. Quick Stats
print("📊 QUICK STATS")
print("-" * 40)
stats = {
    "Appointment Groups": frappe.db.count("Appointment Group"),
    "Total Events": frappe.db.count("Event"),
    "User Availabilities": frappe.db.count("User Appointment Availability"),
    "Google Calendars": frappe.db.count("Google Calendar"),
}
for key, val in stats.items():
    print(f"  {key:<25} : {val}")
print()

# 9. Sample Code Snippets
print("💻 SAMPLE CODE TO TRY")
print("-" * 40)
print("""
# Create a test appointment group:
doc = frappe.get_doc({
    "doctype": "Appointment Group",
    "group_name": "Quick Test Booking",
    "duration_for_event": 1800,  # 30 mins
    "meet_provider": "Custom",
    "meet_link": "https://meet.example.com/test",
    "members": [{"user": "Administrator"}]
})
doc.insert()
print(f"Created: /schedule/appointment-group/{doc.name}")

# Query available slots (if helpers exist):
from frappe_appointment.helpers import availability
# ... (check availability.py for functions)

# Check appointment group API:
frappe.get_all("Appointment Group", 
    fields=["name", "group_name"],
    limit=1
)
""")
print()

print("="*80)
print("✅ EXPLORATION COMPLETE")
print("="*80)
print(f"\nGenerated at: {now()}")
print(f"Site: {frappe.local.site}")
print()
print("Next steps:")
print("  1. Review the output above")
print("  2. Create a test Appointment Group if none exist")
print("  3. Test the booking flow: /schedule/appointment-group/[name]")
print("  4. Refer to GETTING_STARTED.md for detailed exercises")
print()

