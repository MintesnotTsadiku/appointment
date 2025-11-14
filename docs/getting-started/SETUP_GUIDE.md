# Complete Setup Guide - Google Calendar & Test Data

> **Step-by-step instructions** to setup Google Calendar integration and create test data for exploration

---

## 📋 Prerequisites Checklist

Before starting, ensure:
- [ ] Frappe bench is installed and running
- [ ] frappe-appointment app is installed on your site
- [ ] You have a Google account (Gmail or Google Workspace)
- [ ] You have access to Frappe desk (Administrator login)

---

## Part 1: Google Calendar Setup

### Step 1: Create Google Cloud Project

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/projectcreate
   - Sign in with your Google account

2. **Create New Project**
   - Click "New Project"
   - Project Name: `Frappe Appointment Integration` (or any name)
   - Organization: (leave default if personal)
   - Location: (select closest to you)
   - Click **Create**

3. **Wait for project creation** (takes ~30 seconds)
   - You'll see a notification when done
   - Select the project from the project dropdown (top bar)

---

### Step 2: Setup OAuth Consent Screen

1. **Navigate to Consent Screen**
   - Go to: https://console.cloud.google.com/apis/credentials/consent
   - Or: APIs & Services → OAuth consent screen

2. **Choose User Type**
   - **External** (for personal/testing) - Recommended for now
   - **Internal** (requires Google Workspace)
   - Click **Create**

3. **Fill App Information**
   - **App name**: `Frappe Appointment` (or your choice)
   - **User support email**: Your email address
   - **App logo**: (optional, skip for now)
   - **App domain**: (skip for localhost)
   - **Developer contact information**: Your email
   - Click **Save and Continue**

4. **Add Scopes**
   - Click **Add or Remove Scopes**
   - In the filter box, type: `calendar`
   - Select these scopes:
     - `.../auth/calendar` (full access)
     - OR select these fine-grained scopes:
       - `.../auth/calendar.calendarlist.readonly`
       - `.../auth/calendar.events.freebusy`
       - `.../auth/calendar.events`
       - `.../auth/calendar.calendars.readonly`
       - `.../auth/calendar.calendars`
   - Click **Update**
   - Click **Save and Continue**

5. **Test Users** (if External)
   - Add your email address as a test user
   - Click **Add Users**
   - Enter your email
   - Click **Add**
   - Click **Save and Continue**

6. **Summary**
   - Review the information
   - Click **Back to Dashboard**

---

### Step 3: Enable Calendar API

1. **Go to API Library**
   - Visit: https://console.cloud.google.com/marketplace/product/google/calendar-json.googleapis.com
   - Or: APIs & Services → Library → Search "Calendar API"

2. **Enable API**
   - Click **Enable**
   - Wait for activation (~10 seconds)

---

### Step 4: Create OAuth Credentials

1. **Go to Credentials**
   - Visit: https://console.cloud.google.com/apis/credentials
   - Or: APIs & Services → Credentials

2. **Create OAuth Client ID**
   - Click **+ Create Credentials**
   - Select **OAuth client ID**

3. **Configure OAuth Client**
   - **Application type**: Web application
   - **Name**: `Frappe Appointment Local` (or your choice)

4. **Authorized JavaScript origins**
   - Click **+ Add URI**
   - Add: `http://localhost:8000` (or your Frappe URL)
   - If using HTTPS: `https://your-domain.com`

5. **Authorized redirect URIs**
   - Click **+ Add URI**
   - Add: `http://localhost:8000?cmd=frappe.integrations.doctype.google_calendar.google_calendar.google_callback`
   - Replace `localhost:8000` with your actual Frappe URL
   - **Important**: The URL must match exactly!

6. **Create**
   - Click **Create**
   - **IMPORTANT**: Copy the **Client ID** and **Client Secret** immediately
   - Store them safely (you'll need them in Frappe)

---

### Step 5: Configure in Frappe

1. **Login to Frappe**
   - Go to: http://localhost:8000
   - Login as Administrator

2. **Navigate to Google Settings**
   - Use search bar (Ctrl+K or Cmd+K)
   - Type: `Google Settings`
   - Click on it

3. **Enable and Configure**
   - **Enable Google API**: Check the box
   - **Client ID**: Paste your Client ID from Step 4
   - **Client Secret**: Paste your Client Secret from Step 4
   - Click **Save**

4. **Verify**
   - You should see a success message
   - Settings should be saved

---

### Step 6: Connect Your Google Account

1. **Navigate to Google Calendar**
   - Search: `Google Calendar` in Frappe
   - Click **New**

2. **Authorize Access**
   - Click **Authorize API Access** button
   - You'll be redirected to Google
   - Sign in with your Google account
   - Review permissions
   - Click **Allow** or **Continue**

3. **Complete Authorization**
   - You'll be redirected back to Frappe
   - The Google Calendar record should be created
   - **Calendar Name**: Usually your primary calendar name
   - **User**: Your Frappe user email
   - **Enable**: Should be checked

4. **Verify Connection**
   - Check that the calendar is listed
   - Status should show as enabled

---

## Part 2: Create Test Users

### Step 1: Create Provider User

1. **Navigate to User**
   - Search: `User` in Frappe
   - Click **New**

2. **Fill User Details**
   - **Email Address**: `provider@example.com` (or use a real email)
   - **First Name**: `Test`
   - **Last Name**: `Provider`
   - **Full Name**: Auto-filled
   - **User Type**: System User
   - **Role**: 
     - Add: `System Manager` (for testing)
     - Or create custom role later

3. **Save**
   - Click **Save**
   - Set a password (or use "Reset Password" to send email)

4. **Repeat for More Users** (Optional)
   - Create: `receptionist@example.com`
   - Create: `client@example.com` (for testing bookings)

---

### Step 2: Create User Appointment Availability

1. **Navigate to User Appointment Availability**
   - Search: `User Appointment Availability`
   - Click **New**

2. **Select User**
   - **User**: Select the provider user you created
   - **Enabled**: Check this box

3. **Set Working Hours**
   - **Day of Week**: Monday
   - **From Time**: `09:00:00`
   - **To Time**: `17:00:00`
   - Click **Add Row** for each day
   - Repeat for: Tuesday, Wednesday, Thursday, Friday
   - (Skip weekends or add if needed)

4. **Save**
   - Click **Save**
   - Availability is now configured

---

## Part 3: Create Test Appointment Groups

### Step 1: Create Basic Appointment Group

1. **Navigate to Appointment Group**
   - Search: `Appointment Group`
   - Click **New**

2. **Fill Basic Information**
   - **Group Name**: `30-Minute Consultation`
   - **Event Creator**: Select your Google Calendar (from Step 6)
   - **Event Organizer**: Select Administrator (or provider user)
   - **Duration For Event**: `00:30:00` (30 minutes)

3. **Add Members**
   - In **Members** table, click **Add Row**
   - **User**: Select your provider user
   - **Mandatory**: Check this (required member)

4. **Configure Settings**
   - **Allow Rescheduling**: Check
   - **Minimum Notice for Reschedule**: `2` (hours)
   - **Minimum Buffer Time**: `00:15:00` (15 minutes between appointments)
   - **Minimum Notice Before Event**: `2` (days - how far ahead to book)
   - **Event Availability Window**: `30` (days - how far out to show slots)

5. **Meeting Link**
   - **Meet Provider**: Select `Google Meet` or `Custom`
   - If Custom: **Meet Link**: `https://meet.google.com/your-link`

6. **Save**
   - Click **Save**
   - Note the public URL shown (format: `/schedule/appointment-group/[name]`)

---

### Step 2: Create Another Appointment Group (Different Duration)

1. **Create New Appointment Group**
   - **Group Name**: `15-Minute Quick Call`
   - **Duration**: `00:15:00`
   - **Event Creator**: Same Google Calendar
   - **Event Organizer**: Same user
   - **Members**: Same provider user
   - **Minimum Buffer Time**: `00:05:00` (5 minutes)
   - **Save**

---

### Step 3: Create Group with Multiple Members

1. **Create New Appointment Group**
   - **Group Name**: `Team Meeting`
   - **Duration**: `01:00:00` (1 hour)
   - **Event Creator**: Google Calendar
   - **Event Organizer**: Administrator
   - **Members**: 
     - Add Row 1: Provider user
     - Add Row 2: Administrator
     - Both marked as Mandatory
   - **Save**

---

## Part 4: Test the Booking Flow

### Step 1: Get Booking URL

1. **Open Appointment Group**
   - Go to: Appointment Group list
   - Open your "30-Minute Consultation" group

2. **Copy Public URL**
   - Look for the booking URL
   - Format: `http://localhost:8000/schedule/appointment-group/[name]`
   - Copy this URL

---

### Step 2: Test Booking as Guest

1. **Open in Private/Incognito Window**
   - Open a new private/incognito browser window
   - Paste the booking URL
   - This simulates a client booking

2. **View Available Slots**
   - You should see a calendar view
   - Available time slots should be shown
   - Slots respect:
     - Working hours (9 AM - 5 PM)
     - Buffer times (15 min gaps)
     - Minimum notice (2 days ahead)

3. **Book an Appointment**
   - Click on an available time slot
   - Fill in the booking form:
     - **Name**: `Test Client`
     - **Email**: `client@example.com`
     - **Phone**: (optional)
     - **Notes**: (optional)
   - Click **Book Appointment**

4. **Verify Booking**
   - You should see a confirmation message
   - Check your email (if email notifications are configured)
   - Go back to Frappe desk

---

### Step 3: Verify in Frappe

1. **Check Events**
   - Search: `Event` in Frappe
   - You should see the new booking
   - Check details:
     - Subject: Should include client name
     - Start/End: Should match booked time
     - Status: Should be "Open"

2. **Check Google Calendar** (if connected)
   - Go to: https://calendar.google.com
   - You should see the event synced
   - Event should have:
     - Correct time
     - Client information
     - Meeting link (if configured)

---

## Part 5: Create More Test Data

### Step 1: Create Multiple Bookings

1. **Book Multiple Appointments**
   - Use the booking URL
   - Book 3-5 different time slots
   - Use different client names/emails
   - Spread across different days

2. **Verify in Events List**
   - All should appear in Events
   - Check that buffer times are respected
   - Verify no overlapping bookings

---

### Step 2: Test Rescheduling

1. **Open an Event**
   - Go to Events list
   - Open one of your test bookings

2. **Reschedule**
   - Click **Reschedule** (if available)
   - Select a new time slot
   - Confirm rescheduling

3. **Verify**
   - Check Google Calendar updated
   - Check email notifications (if configured)

---

### Step 3: Test Different Scenarios

1. **Test Buffer Times**
   - Try booking two consecutive slots
   - System should enforce buffer time
   - Next available slot should be after buffer

2. **Test Minimum Notice**
   - Try booking for tomorrow (if minimum notice is 2 days)
   - Should not allow or show error

3. **Test Availability Window**
   - Try booking beyond 30 days (if window is 30)
   - Should not show slots beyond window

---

## Part 6: Console Exploration

### Step 1: Open Frappe Console

```bash
cd /home/minte/projects/frappe-bench
bench --site appointment.com console
```

### Step 2: Query Test Data

```python
import frappe

# List all appointment groups
groups = frappe.get_all("Appointment Group", 
    fields=["name", "group_name", "duration_for_event"],
    limit=10
)
print("Appointment Groups:")
for g in groups:
    print(f"  - {g.group_name} ({g.duration_for_event/60} mins)")

# List all events (bookings)
events = frappe.get_all("Event",
    fields=["name", "subject", "starts_on", "ends_on", "status"],
    order_by="starts_on desc",
    limit=10
)
print("\nRecent Bookings:")
for e in events:
    print(f"  - {e.subject} on {e.starts_on}")

# Check user availability
availabilities = frappe.get_all("User Appointment Availability",
    fields=["name", "user", "enabled"]
)
print("\nUser Availabilities:")
for a in availabilities:
    print(f"  - {a.user}: {'Enabled' if a.enabled else 'Disabled'}")

# Check Google Calendars
calendars = frappe.get_all("Google Calendar",
    fields=["name", "user", "calendar_name", "enable"]
)
print("\nGoogle Calendars:")
for c in calendars:
    status = "Active" if c.enable else "Inactive"
    print(f"  - {c.calendar_name} ({c.user}): {status}")
```

### Step 3: Create Test Data via Console

```python
# Create a test appointment group programmatically
doc = frappe.get_doc({
    "doctype": "Appointment Group",
    "group_name": "Console Test Session",
    "event_creator": "your-google-calendar-name",  # Use actual name
    "event_organizer": "Administrator",
    "duration_for_event": 1800,  # 30 minutes in seconds
    "meet_provider": "Custom",
    "meet_link": "https://meet.example.com/test",
    "members": [
        {"user": "Administrator"}
    ],
    "allow_rescheduling": 1,
    "minimum_notice_for_reschedule": 2,
    "minimum_buffer_time": 900,  # 15 minutes
    "minimum_notice_before_event": 1,
    "event_availability_window": 30
})
doc.insert()
print(f"Created: {doc.name}")
print(f"Booking URL: /schedule/appointment-group/{doc.name}")
```

---

## Part 7: Verification Checklist

### Google Calendar Integration
- [ ] Google Cloud project created
- [ ] OAuth consent screen configured
- [ ] Calendar API enabled
- [ ] OAuth credentials created
- [ ] Credentials added to Frappe Google Settings
- [ ] Google Calendar connected in Frappe
- [ ] Test booking synced to Google Calendar

### Test Users
- [ ] Provider user created
- [ ] User availability configured
- [ ] Working hours set correctly

### Appointment Groups
- [ ] At least 3 appointment groups created
- [ ] Different durations configured
- [ ] Members assigned correctly
- [ ] Buffer times set
- [ ] Booking URLs accessible

### Test Bookings
- [ ] Successfully booked as guest
- [ ] Event created in Frappe
- [ ] Event synced to Google Calendar
- [ ] Multiple bookings created
- [ ] Buffer times enforced
- [ ] Rescheduling tested

---

## 🎯 Next Steps

After completing this setup:

1. **Explore the Frontend**
   - Test booking from different devices
   - Try different browsers
   - Test mobile responsiveness

2. **Review Code**
   - Check `frappe_appointment/helpers/availability.py`
   - Review `frappe_appointment/api/` endpoints
   - Explore doctype structures

3. **Read Documentation**
   - Review `docs/getting-started/GETTING_STARTED.md`
   - Check `docs/planning/PROJECT_STATUS_TRACKER.md`
   - Understand what needs to be built

4. **Plan Custom Development**
   - Review Sprint 1 tasks
   - Plan Provider/Location/Service doctypes
   - Start thinking about payment integration

---

## 🆘 Troubleshooting

### Google Calendar Not Connecting

**Issue**: Authorization fails
- **Fix**: Check redirect URI matches exactly
- **Fix**: Ensure you're added as test user (if External app)
- **Fix**: Check Client ID/Secret are correct

**Issue**: Events not syncing
- **Fix**: Verify Google Calendar is enabled in Frappe
- **Fix**: Check calendar permissions in Google
- **Fix**: Review Frappe logs: `sites/appointment.com/logs/web.error.log`

### No Slots Showing

**Issue**: Booking page shows no available slots
- **Fix**: Check User Appointment Availability is configured
- **Fix**: Verify working hours are set
- **Fix**: Check minimum notice settings
- **Fix**: Ensure date is within availability window

### Buffer Times Not Working

**Issue**: Can book consecutive slots
- **Fix**: Verify minimum_buffer_time is set in Appointment Group
- **Fix**: Check slot generation logic
- **Fix**: Clear cache: `bench --site appointment.com clear-cache`

---

## 📚 Related Documentation

- **System Setup Guide**: `docs/technical/system_setup_guide.md`
- **Getting Started**: `docs/getting-started/GETTING_STARTED.md`
- **Quick Reference**: `docs/getting-started/QUICK_REFERENCE.md`
- **Project Status**: `docs/planning/PROJECT_STATUS_TRACKER.md`

---

## ✅ Success Criteria

You've successfully completed setup when:

1. ✅ Google Calendar is connected and syncing
2. ✅ At least 3 test users created
3. ✅ At least 3 appointment groups created
4. ✅ Successfully booked 5+ test appointments
5. ✅ Events appear in both Frappe and Google Calendar
6. ✅ Buffer times and constraints are working
7. ✅ Can query data via console

---

**Time Estimate**: 1-2 hours for complete setup

**Ready to explore!** 🚀

---

*Last Updated: 2025-11-14*


