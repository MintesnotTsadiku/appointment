# Getting Started - Familiarizing with frappe-appointment

This guide will help you explore the existing `frappe-appointment` app before starting custom development.

---

## 🎯 Objectives

1. ✅ Understand how the current app works
2. ✅ Setup Google Calendar integration (optional but recommended)
3. ✅ Create sample appointment groups and test booking flow
4. ✅ Explore the codebase structure
5. ✅ Identify what can be reused vs what needs to be built

---

## 📋 Prerequisites Checklist

- [ ] Frappe bench is installed and running
- [ ] frappe-appointment app is installed on your site
- [ ] You have access to Frappe console
- [ ] (Optional) Google Cloud account for Calendar API

---

## 🚀 Quick Start Steps

### Step 1: Verify Installation

```bash
cd /home/minte/projects/frappe-bench
bench --site [your-site-name] list-apps
```

You should see `frappe_appointment` in the list.

### Step 2: Start Your Site

```bash
bench start
```

Open your browser to: `http://localhost:8000` (or your configured port)

---

## 🔍 Exploring via Frappe Console

Open Frappe console to explore existing doctypes:

```bash
bench --site [your-site-name] console
```

### Check Existing Doctypes

```python
# List all appointment-related doctypes
import frappe

# Check if Appointment Group exists
print(frappe.get_meta("Appointment Group"))

# Check if User Appointment Availability exists
print(frappe.get_meta("User Appointment Availability"))

# List all existing appointment groups
appointment_groups = frappe.get_all("Appointment Group", fields=["name", "group_name", "event_creator"])
print(appointment_groups)

# Check existing settings
settings = frappe.get_doc("Appointment Settings", "Appointment Settings")
print(settings.as_dict())
```

### Check Google Calendar Integration

```python
# Check if Google Calendar is configured
google_calendars = frappe.get_all("Google Calendar", fields=["name", "user", "calendar_name"])
print(google_calendars)

# Check Google Settings
try:
    google_settings = frappe.get_doc("Google Settings")
    print(f"Google API Enabled: {google_settings.enable}")
except:
    print("Google Settings not configured yet")
```

### Explore Existing Events

```python
# List recent events (if any)
events = frappe.get_all("Event", 
    fields=["name", "subject", "starts_on", "ends_on", "status"],
    limit=10
)
print(events)
```

---

## 🗓️ Setting Up Google Calendar (Optional)

Follow the detailed guide: [`system_setup_guide.md`](./system_setup_guide.md)

### Quick Summary:

1. **Create Google Cloud Project**
   - Go to https://console.cloud.google.com/projectcreate
   - Create a new project

2. **Setup OAuth Consent Screen**
   - Navigate to APIs & Credentials → Consent Screen
   - Choose "External" user type
   - Fill in app name and support email

3. **Enable Calendar API**
   - Visit https://console.cloud.google.com/marketplace/product/google/calendar-json.googleapis.com
   - Click "Enable"

4. **Create OAuth Credentials**
   - Go to Credentials → Create Credentials → OAuth Client ID
   - Application type: Web application
   - Authorized redirect URI:
     ```
     http://localhost:8000?cmd=frappe.integrations.doctype.google_calendar.google_calendar.google_callback
     ```
   - Save Client ID and Client Secret

5. **Configure in Frappe**
   - Login as Administrator
   - Go to: Google Settings
   - Enable Google API
   - Enter Client ID and Client Secret
   - Save

6. **Connect Your Google Account**
   - Go to: Google Calendar (doctype)
   - Click "New"
   - Click "Authorize API Access"
   - Follow OAuth flow

---

## 🧪 Testing the Booking Flow

### Create an Appointment Group via UI

1. **Login to Frappe Desk**
   - Go to: Appointment Group (search in awesome bar)
   - Click "New"

2. **Fill in Details:**
   - Group Name: `Test Consultation`
   - Event Creator: (select your Google Calendar if configured)
   - Event Organizer: (select your user)
   - Members: Add yourself
   - Duration: 30 minutes
   - Meet Provider: Custom (or Google Meet if you want)
   - Save

3. **Get the Booking Link**
   - After saving, you'll see a shareable link
   - Copy the link (format: `/schedule/appointment-group/[name]`)

4. **Test Booking**
   - Open the link in an incognito/private browser window
   - You should see available time slots
   - Try booking an appointment
   - Check if you receive confirmation email

### Create via Console (Advanced)

```python
import frappe

# Create a test appointment group programmatically
doc = frappe.get_doc({
    "doctype": "Appointment Group",
    "group_name": "Test Coaching Session",
    "event_creator": "your-google-calendar-name",  # or leave empty
    "event_organizer": "your-email@example.com",
    "duration_for_event": 1800,  # 30 minutes in seconds
    "meet_provider": "Custom",
    "meet_link": "https://meet.example.com/test",
    "members": [
        {"user": "your-email@example.com"}
    ]
})
doc.insert()
print(f"Created: {doc.name}")
print(f"Booking URL: /schedule/appointment-group/{doc.name}")
```

---

## 📁 Codebase Structure Overview

```
frappe_appointment/
├── frappe_appointment/
│   ├── doctype/
│   │   ├── appointment_group/          # Main scheduling entity
│   │   ├── appointment_settings/       # Global settings
│   │   ├── appointment_time_slot/      # Slot generation logic
│   │   ├── user_appointment_availability/  # Per-user availability
│   │   ├── members/                    # Child table for group members
│   │   └── ...
│   ├── api/                            # Public booking APIs
│   ├── helpers/                        # Utility functions
│   ├── overrides/                      # Doctype class overrides
│   │   ├── event_override.py           # Extends core Event doctype
│   │   ├── google_calendar_override.py # Custom Google Calendar logic
│   │   └── ...
│   ├── tasks/                          # Scheduled jobs
│   └── www/                            # Web pages
│       └── schedule/                   # Public booking page
├── frontend/                           # React/Vue frontend (if any)
├── docs/                               # Documentation
└── hooks.py                            # App configuration
```

---

## 🔑 Key Files to Examine

### 1. Slot Generation Logic
```bash
# Location: frappe_appointment/helpers/availability.py
# Contains logic for computing available time slots
```

### 2. Booking API
```bash
# Location: frappe_appointment/api/
# Public APIs for booking appointments
```

### 3. Google Calendar Integration
```bash
# Location: frappe_appointment/overrides/google_calendar_override.py
# How Google Calendar sync works
```

### 4. Event Override
```bash
# Location: frappe_appointment/overrides/event_override.py
# Custom behavior for Event doctype
```

---

## 🧭 Exploring via Browser

### Desk Views (Admin)

1. **Appointment Group List**
   - URL: `/app/appointment-group`
   - See all appointment groups

2. **Appointment Settings**
   - URL: `/app/appointment-settings`
   - Global configuration

3. **User Appointment Availability**
   - URL: `/app/user-appointment-availability`
   - Set per-user availability rules

4. **Google Calendar**
   - URL: `/app/google-calendar`
   - Manage Google Calendar connections

### Public Pages

1. **Booking Page**
   - URL: `/schedule/appointment-group/[group-name]`
   - What clients see when booking

---

## 🎓 Learning Exercises

### Exercise 1: Create & Book
1. Create an appointment group with 30-min slots
2. Set your availability (working hours)
3. Generate the booking link
4. Book a test appointment
5. Check: Event created in Events list
6. (If Google Calendar connected) Check: Event synced to Google

### Exercise 2: Reschedule
1. Find your test appointment in Events
2. Try to reschedule it
3. Observe the reschedule constraints (minimum notice)

### Exercise 3: Buffer Times
1. Create an appointment group with 15-min buffer
2. Book two consecutive slots
3. Observe: next available slot is 15 mins after previous end time

### Exercise 4: Availability Alerts
1. Configure "Send email alerts" in appointment group
2. Set minimum threshold to -1 (always alert)
3. Wait for daily scheduled job
4. Check: Email sent with available slots

---

## 🐛 Common Issues & Fixes

### Issue 1: "Google Calendar not found"
**Solution**: Make sure you've authorized Google Calendar API access in the Google Calendar doctype.

### Issue 2: No slots appearing
**Solution**: 
- Check User Appointment Availability is set
- Verify appointment group has members added
- Check duration is reasonable (not exceeding daily hours)

### Issue 3: Can't create appointment group
**Solution**: 
- Ensure you have "System Manager" role
- Check if required fields are filled

---

## 📊 Testing Checklist

- [ ] Can create appointment group
- [ ] Booking link is accessible
- [ ] Time slots appear correctly
- [ ] Can book an appointment as guest
- [ ] Email confirmation sent (if configured)
- [ ] Event appears in Events list
- [ ] (Optional) Event synced to Google Calendar
- [ ] Can reschedule within allowed window
- [ ] Cannot reschedule too close to appointment time
- [ ] Buffer times are respected

---

## 🎯 What You Should Understand Before Development

1. **How slots are generated** (helpers/availability.py)
2. **How appointment groups work** (doctype structure)
3. **Event doctype relationship** (upstream uses core Event doctype)
4. **Google Calendar sync mechanism** (optional but good to know)
5. **Webhook integration** (appointment group has webhook field)
6. **Email templating** (response_email_template)

---

## 🔜 Next Steps After Familiarization

Once you're comfortable with the existing app:

1. ✅ Review `../planning/PROJECT_STATUS_TRACKER.md` for full development plan
2. ✅ Create development branch: `git checkout -b develop`
3. ✅ Start Sprint 1: Scaffold custom apps
   ```bash
   bench new-app ethi_scheduler
   bench new-app ethi_payments
   bench new-app ethi_channels
   ```
4. ✅ Begin creating custom doctypes (Provider, Location, Service)

---

## 💡 Pro Tips

1. **Use Frappe Console Frequently**
   - Faster than UI for exploration
   - Can inspect data structures easily
   - Can test functions directly

2. **Enable Developer Mode**
   ```bash
   bench --site [site] set-config developer_mode 1
   bench --site [site] clear-cache
   ```

3. **Watch Logs**
   ```bash
   # In one terminal
   tail -f sites/[site]/logs/web.error.log
   
   # In another
   tail -f sites/[site]/logs/worker.error.log
   ```

4. **Use Form Tours**
   - frappe-appointment includes interactive form tours
   - Look in `form_tour/` directory

---

## 📞 Quick Reference Commands

```bash
# Start bench
bench start

# Console
bench --site [site] console

# Clear cache
bench --site [site] clear-cache

# Restart
bench restart

# Check logs
bench --site [site] logs

# Enable developer mode
bench --site [site] set-config developer_mode 1

# Migrate
bench --site [site] migrate

# Build assets
bench build
```

---

**Ready to start?** Begin with Step 1 and work your way through. Take notes on what you find useful vs what needs to change!

---

*Last Updated: 2025-11-14*

