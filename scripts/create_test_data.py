"""
Quick Test Data Creation Script

Run this in Frappe console to create test users, availability, and appointment groups:

    bench --site appointment.com console < scripts/create_test_data.py

Or copy-paste sections into the console interactively.
"""

import frappe
from frappe.utils import now, add_days, get_datetime

print("\n" + "="*80)
print("🧪 CREATING TEST DATA FOR FRAPPE-APPOINTMENT")
print("="*80 + "\n")

# Get or create Google Calendar (required for appointment groups)
print("📅 Step 1: Checking Google Calendar...")
google_calendars = frappe.get_all("Google Calendar", 
    fields=["name", "enable"],
    limit=1
)

if google_calendars:
    google_calendar_name = google_calendars[0]['name']
    print(f"  ✓ Using existing Google Calendar: {google_calendar_name}")
else:
    print("  ⚠ No Google Calendar found!")
    print("  → Please setup Google Calendar first (see SETUP_GUIDE.md)")
    print("  → Or create one manually in Frappe desk")
    google_calendar_name = None

# Get current user as organizer
current_user = frappe.session.user
print(f"  ✓ Event Organizer: {current_user}\n")

# Step 2: Create Test Users
print("👤 Step 2: Creating Test Users...")

test_users = [
    {
        "email": "provider@test.local",
        "first_name": "Test",
        "last_name": "Provider",
        "roles": ["System Manager"]
    },
    {
        "email": "receptionist@test.local",
        "first_name": "Test",
        "last_name": "Receptionist",
        "roles": ["System Manager"]
    }
]

created_users = []
for user_data in test_users:
    email = user_data["email"]
    
    if frappe.db.exists("User", email):
        print(f"  ⚠ User {email} already exists, skipping...")
        created_users.append(email)
    else:
        try:
            user = frappe.get_doc({
                "doctype": "User",
                "email": email,
                "first_name": user_data["first_name"],
                "last_name": user_data["last_name"],
                "user_type": "System User",
                "send_welcome_email": 0
            })
            user.insert()
            
            # Add roles
            for role in user_data["roles"]:
                user.add_roles(role)
            
            print(f"  ✓ Created user: {email}")
            created_users.append(email)
        except Exception as e:
            print(f"  ✗ Error creating {email}: {str(e)}")

print()

# Step 3: Create User Appointment Availability
print("⏰ Step 3: Creating User Availability...")

for user_email in created_users:
    if not frappe.db.exists("User Appointment Availability", {"user": user_email}):
        try:
            availability = frappe.get_doc({
                "doctype": "User Appointment Availability",
                "user": user_email,
                "enabled": 1
            })
            
            # Add working hours (Monday to Friday, 9 AM to 5 PM)
            working_days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
            for day in working_days:
                availability.append("availability_schedule", {
                    "day_of_week": day,
                    "from_time": "09:00:00",
                    "to_time": "17:00:00"
                })
            
            availability.insert()
            print(f"  ✓ Created availability for {user_email}")
        except Exception as e:
            print(f"  ✗ Error creating availability for {user_email}: {str(e)}")
    else:
        print(f"  ⚠ Availability for {user_email} already exists")

print()

# Step 4: Create Appointment Groups
print("📅 Step 4: Creating Appointment Groups...")

if not google_calendar_name:
    print("  ⚠ Skipping appointment groups (no Google Calendar)")
else:
    appointment_groups = [
        {
            "group_name": "30-Minute Consultation",
            "duration": 1800,  # 30 minutes
            "buffer": 900,  # 15 minutes
            "members": created_users[:1] if created_users else [current_user]
        },
        {
            "group_name": "15-Minute Quick Call",
            "duration": 900,  # 15 minutes
            "buffer": 300,  # 5 minutes
            "members": created_users[:1] if created_users else [current_user]
        },
        {
            "group_name": "1-Hour Deep Dive",
            "duration": 3600,  # 1 hour
            "buffer": 1800,  # 30 minutes
            "members": created_users[:1] if created_users else [current_user]
        }
    ]
    
    created_groups = []
    for group_data in appointment_groups:
        group_name = group_data["group_name"]
        
        if frappe.db.exists("Appointment Group", {"group_name": group_name}):
            print(f"  ⚠ Appointment Group '{group_name}' already exists, skipping...")
            continue
        
        try:
            doc = frappe.get_doc({
                "doctype": "Appointment Group",
                "group_name": group_name,
                "event_creator": google_calendar_name,
                "event_organizer": current_user,
                "duration_for_event": group_data["duration"],
                "minimum_buffer_time": group_data["buffer"],
                "allow_rescheduling": 1,
                "minimum_notice_for_reschedule": 2,  # 2 hours
                "minimum_notice_before_event": 1,  # 1 day
                "event_availability_window": 30,  # 30 days
                "meet_provider": "Custom",
                "meet_link": "https://meet.google.com/test"
            })
            
            # Add members
            for member_email in group_data["members"]:
                doc.append("members", {
                    "user": member_email,
                    "mandatory": 1
                })
            
            doc.insert()
            created_groups.append({
                "name": doc.name,
                "group_name": group_name,
                "url": f"/schedule/appointment-group/{doc.name}"
            })
            print(f"  ✓ Created: {group_name}")
        except Exception as e:
            print(f"  ✗ Error creating {group_name}: {str(e)}")
    
    print()
    
    # Display booking URLs
    if created_groups:
        print("🔗 Booking URLs:")
        base_url = frappe.utils.get_url()
        for group in created_groups:
            full_url = f"{base_url}{group['url']}"
            print(f"  • {group['group_name']}:")
            print(f"    {full_url}")

print()

# Summary
print("="*80)
print("✅ TEST DATA CREATION COMPLETE")
print("="*80)
print(f"\nCreated:")
print(f"  • Users: {len(created_users)}")
print(f"  • Availabilities: {len(created_users)}")
if google_calendar_name:
    print(f"  • Appointment Groups: {len(created_groups) if 'created_groups' in locals() else 0}")
print()
print("Next steps:")
print("  1. Test booking via the URLs above")
print("  2. Check Events list in Frappe desk")
print("  3. Verify Google Calendar sync (if configured)")
print()
print(f"Generated at: {now()}")
print()


