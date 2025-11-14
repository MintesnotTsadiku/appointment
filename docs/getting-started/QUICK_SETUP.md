# Quick Setup - Google Calendar & Test Data

> **Fast track setup** - Get Google Calendar connected and test data created in 30 minutes

---

## 🚀 Quick Start (3 Steps)

### Step 1: Setup Google Calendar (15 min)

Follow the detailed guide: **[SETUP_GUIDE.md](SETUP_GUIDE.md#part-1-google-calendar-setup)**

**TL;DR:**
1. Create Google Cloud project: https://console.cloud.google.com/projectcreate
2. Enable Calendar API: https://console.cloud.google.com/marketplace/product/google/calendar-json.googleapis.com
3. Create OAuth credentials (Web application)
4. Add redirect URI: `http://localhost:8000?cmd=frappe.integrations.doctype.google_calendar.google_calendar.google_callback`
5. Add Client ID/Secret to Frappe → Google Settings
6. Connect account in Frappe → Google Calendar → New → Authorize

---

### Step 2: Create Test Data Automatically (5 min)

**Option A: Use Script (Recommended)**

```bash
cd /home/minte/projects/frappe-bench
bench --site appointment.com console < apps/frappe_appointment/scripts/create_test_data.py
```

This creates:
- 2 test users (provider, receptionist)
- User availability (Mon-Fri, 9 AM - 5 PM)
- 3 appointment groups (15 min, 30 min, 1 hour)

**Option B: Manual Creation**

Follow: **[SETUP_GUIDE.md](SETUP_GUIDE.md#part-2-create-test-users)**

---

### Step 3: Test Booking (5 min)

1. **Get Booking URL**
   - Go to: Appointment Group list
   - Open any group
   - Copy the public URL

2. **Test Booking**
   - Open URL in private/incognito window
   - Select a time slot
   - Fill form and book
   - Verify in Events list

---

## ✅ Verification

After setup, verify:

- [ ] Google Calendar connected in Frappe
- [ ] At least 2 test users created
- [ ] User availability configured
- [ ] At least 3 appointment groups created
- [ ] Can access booking URLs
- [ ] Successfully booked test appointment
- [ ] Event appears in Frappe Events
- [ ] Event synced to Google Calendar (if connected)

---

## 📚 Full Details

For complete step-by-step instructions, see:
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Comprehensive setup guide

---

## 🆘 Troubleshooting

**No Google Calendar?**
- See: [SETUP_GUIDE.md - Part 1](SETUP_GUIDE.md#part-1-google-calendar-setup)

**No slots showing?**
- Check User Appointment Availability is configured
- Verify working hours are set
- See: [SETUP_GUIDE.md - Troubleshooting](SETUP_GUIDE.md#-troubleshooting)

**Script errors?**
- Make sure Google Calendar is connected first
- Check console output for specific errors
- See: [SETUP_GUIDE.md - Part 2](SETUP_GUIDE.md#part-2-create-test-users)

---

**Time**: ~30 minutes total  
**Ready to explore!** 🎉

---

*For detailed instructions, see [SETUP_GUIDE.md](SETUP_GUIDE.md)*


