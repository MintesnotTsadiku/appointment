# 🚀 START HERE - Ethiopian Scheduling Platform

> **Quick orientation guide** - Read this first, then follow the steps below

---

## ✅ What Just Happened

I've set up your Ethiopian Scheduling Platform project with complete documentation:

### 📚 Documentation Created

1. **[../INDEX.md](../INDEX.md)** - Navigation hub for all docs
2. **[../planning/PROJECT_SUMMARY.md](../planning/PROJECT_SUMMARY.md)** - High-level overview (READ THIS FIRST)
3. **[../planning/PROJECT_STATUS_TRACKER.md](../planning/PROJECT_STATUS_TRACKER.md)** - Sprint board with all tasks
4. **[GETTING_STARTED.md](GETTING_STARTED.md)** - Hands-on learning guide
5. **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Complete setup: Google Calendar & test data
6. **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Command cheat sheet
7. **[../README_ETHIOPIAN_SCHEDULER.md](../README_ETHIOPIAN_SCHEDULER.md)** - Main project README

### 🛠️ Technical Setup Done

- ✅ frappe-appointment app installed on `appointment.com` site
- ✅ Database migrations completed
- ✅ Exploration script created (`scripts/explore_app.py`)
- ✅ TODO list created with sprint tasks

---

## 🎯 Your Current Status

```
📍 Phase: Sprint 0 - Familiarization
🎯 Goal: Understand existing frappe-appointment before building custom features
⏱️  Time: 1-2 days of exploration
```

---

## 🚦 Next Steps (Do These Now)

### Step 1: Quick Read (15 minutes)
```bash
# Open in your favorite editor/browser
cd /home/minte/projects/frappe-bench/apps/appointment/docs

# Read in this order:
1. ../planning/PROJECT_SUMMARY.md          (10 min - overview)
2. ../README_ETHIOPIAN_SCHEDULER.md (5 min - project structure)
```

### Step 2: Start Your Environment (2 minutes)
```bash
cd /home/minte/projects/frappe-bench

# Start bench (will run in foreground)
bench start

# Keep this terminal open!
# Open a new terminal for the next steps
```

### Step 3: Login & Explore (5 minutes)
```
1. Open browser: http://localhost:8000
2. Login as: Administrator (use your password)
3. Explore the desk interface
4. Navigate to: Appointment Group
```

### Step 4: Create Test Appointment (10 minutes)

**In Frappe Desk:**
1. Go to: **Appointment Group** (use search bar)
2. Click: **New**
3. Fill in:
   - Group Name: `Test Consultation`
   - Event Creator: (leave empty for now, or setup Google Calendar)
   - Event Organizer: Administrator
   - Members: Click "Add Row", select Administrator
   - Duration: `00:30:00` (30 minutes)
   - Meet Provider: Custom
   - Meet Link: `https://meet.example.com/test`
4. Click: **Save**
5. Copy the public URL shown

**Test Booking:**
1. Open URL in **incognito/private window**
2. You should see available time slots
3. Try booking one
4. Check if confirmation appears

### Step 5: Explore via Console (15 minutes)

**Open new terminal:**
```bash
cd /home/minte/projects/frappe-bench

# Open Frappe console
bench --site appointment.com console
```

**Try these commands:**
```python
import frappe

# List your appointment groups
groups = frappe.get_all("Appointment Group", fields=["name", "group_name"])
print(groups)

# Get details of your test group
doc = frappe.get_doc("Appointment Group", groups[0]['name'])
print(doc.as_dict())

# Check what doctypes exist
frappe.db.sql("SHOW TABLES LIKE '%Appointment%'")

# Exit console
exit()
```

**Run exploration script:**
```bash
bench --site appointment.com console < apps/appointment/scripts/explore_app.py
```

---

## 📖 Recommended First Day Plan

**Morning (2-3 hours):**
- ✅ Read ../planning/PROJECT_SUMMARY.md
- ✅ Read ../README_ETHIOPIAN_SCHEDULER.md
- ✅ Create test appointment group
- ✅ Test booking flow
- ✅ Explore via console

**Afternoon (2-3 hours):**
- ✅ Read GETTING_STARTED.md thoroughly
- ✅ Do the learning exercises
- ✅ (Optional) Setup Google Calendar
- ✅ Browse the codebase:
  - `appointment/helpers/availability.py`
  - `appointment/api/`
  - `appointment/appointment/doctype/`

**End of Day:**
- ✅ Review ../planning/PROJECT_STATUS_TRACKER.md
- ✅ Check your understanding (see below)

---

## 🧪 Check Your Understanding

After Sprint 0, you should be able to answer:

1. **What is an Appointment Group?**
   - [ ] I can explain it

2. **How does slot generation work?**
   - [ ] I understand the basics

3. **What features does frappe-appointment provide?**
   - [ ] I can list 5+ features

4. **What are we adding for Ethiopia?**
   - [ ] I can explain our custom features

5. **Where is the slot generation code?**
   - [ ] I found it in the codebase

6. **How do I create a test appointment group?**
   - [ ] I did this successfully

7. **How do I use Frappe console?**
   - [ ] I ran some queries

**If you checked all boxes** → Ready for Sprint 1! 🎉  
**If not** → Spend another half-day exploring

---

## 🎯 Sprint 0 Completion Checklist

Before moving to Sprint 1, complete these:

### Must Do:
- [ ] Read ../planning/PROJECT_SUMMARY.md
- [ ] Read ../README_ETHIOPIAN_SCHEDULER.md  
- [ ] Create test Appointment Group
- [ ] Successfully book a test slot
- [ ] Run exploration script
- [ ] Browse codebase structure

### Should Do:
- [ ] Read GETTING_STARTED.md exercises
- [ ] Review ../planning/PROJECT_STATUS_TRACKER.md
- [ ] Understand slot generation logic
- [ ] Explore doctype JSON files
- [ ] Test rescheduling

### Nice to Have:
- [ ] Setup Google Calendar integration
- [ ] Test calendar sync
- [ ] Review API endpoints
- [ ] Read upstream frappe-appointment docs

---

## 🚀 Moving to Sprint 1

**When you're ready, Sprint 1 involves:**

1. Create development branch
2. Scaffold 3 custom apps:
   - `ethi_scheduler`
   - `ethi_payments`
   - `ethi_channels`
3. Create first doctypes (Provider, Location, Service)

**Commands you'll run:**
```bash
# Create branch
git checkout -b develop

# Create apps
bench new-app ethi_scheduler
bench new-app ethi_payments
bench new-app ethi_channels

# Install apps
bench --site appointment.com install-app ethi_scheduler
# ... and so on
```

**Full details in:** ../planning/PROJECT_STATUS_TRACKER.md → Sprint 1

---

## 📞 Quick Help

**Bench won't start?**
```bash
bench restart
# or
bench stop
bench start
```

**Can't create appointment group?**
- Make sure you're logged in as Administrator
- Check User Appointment Availability is set

**Slots not showing?**
- User needs availability configured
- Check working hours are reasonable

**Want to reset?**
```bash
bench --site appointment.com migrate --reset
# Warning: This resets data!
```

---

## 🗺️ Documentation Map

```
START_HERE.md (👈 You are here)
    ↓
../planning/PROJECT_SUMMARY.md (Overview)
    ↓
../README_ETHIOPIAN_SCHEDULER.md (Project structure)
    ↓
GETTING_STARTED.md (Hands-on learning)
    ↓
../planning/PROJECT_STATUS_TRACKER.md (Sprint tasks)
    ↓
QUICK_REFERENCE.md (Commands)

For navigation: ../INDEX.md
```

---

## 🎉 You're All Set!

Everything is ready for you to start:

✅ **Environment**: Bench installed, site migrated  
✅ **Documentation**: Comprehensive guides created  
✅ **Planning**: Sprint board with all tasks  
✅ **Tools**: Exploration scripts ready  

**Current task**: Explore and familiarize  
**Next milestone**: Sprint 1 - Create custom apps  
**Target MVP**: 8-10 weeks from now  

---

## 💬 Quick Summary for Stakeholders

*Use this when explaining the project:*

> We're building a scheduling platform for Ethiopia based on frappe-appointment. Think Calendly, but with local payment rails (telebirr/Chapa/M-PESA), SMS/USSD booking, multi-location support for clinics/salons, and compliance with Ethiopian data protection laws. 
>
> We're currently in Sprint 0 (familiarization). Sprint 1 starts with creating 3 custom Frappe apps. Target MVP in 8-10 weeks.
>
> Key features: booking links, deposits, front-desk console, SMS reminders in Amharic, analytics dashboard, and USSD booking for low-data contexts.

---

**Action**: Open [../planning/PROJECT_SUMMARY.md](../planning/PROJECT_SUMMARY.md) now!

---

*Good luck! You're building something amazing for Ethiopia! 🇪🇹*

---

*Created: 2025-11-14*

