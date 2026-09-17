# Ethiopian Scheduling Platform - Project Summary

> **TL;DR**: Building a Calendly-like scheduling platform for Ethiopia with local payments (telebirr/Chapa/M-PESA), SMS/USSD booking, and front-desk console for multi-location businesses.

---

## 📌 What We're Building

A **scheduling platform** that lets:
- **Solo professionals** (coaches, consultants) share booking links and get paid
- **Businesses** (clinics, salons) manage multi-provider, multi-location calendars
- **Clients** book via web, SMS, or USSD with deposits in ETB

### Key Differentiators
✅ Local payment rails (telebirr, Chapa, M-PESA Ethiopia)  
✅ Low-bandwidth access (SMS reminders, USSD booking)  
✅ Front-desk console for walk-ins + online bookings  
✅ Localization (Amharic/English, ETB currency)  
✅ Compliance with Ethiopia's Data Protection law (1321/2024)  

---

## 🏗️ Architecture

### Base Layer (Existing)
**frappe-appointment** by rtCamp provides:
- Core scheduling and slot generation
- Google Calendar sync
- Zoom/Meet link generation
- Basic rescheduling

### Custom Layer (What We're Building)
Three custom modules within `appointment` app:

1. **scheduler** module
   - Provider, Location, Service management
   - Multi-location conflict detection
   - Policy engine (deposits, cancellations)
   - Front-desk UI (React)

2. **payments** module
   - telebirr, Chapa, M-PESA drivers
   - Webhook verification
   - Refund handling
   - PaymentIntent doctype

3. **channels** module
   - SMS provider abstraction
   - USSD gateway integration
   - Message templates (Amharic/English)
   - Delivery tracking

---

## 🗓️ Development Plan

### Phase 1: Setup (Current)
**Sprint 0 - Familiarization** (1-2 days)
- Understand existing frappe-appointment
- Test booking flow
- Review codebase

**Sprint 1 - Foundations** (1 week)
- ✅ Create 3 custom modules (DONE)
- Build Provider/Location/Service doctypes
- Setup roles & permissions

### Phase 2: Core Features (Weeks 2-5)
**Sprint 2** - Slot engine & policy engine  
**Sprint 3** - Payment integration (telebirr + Chapa)  
**Sprint 4** - SMS notifications  
**Sprint 5** - Front-desk console  

### Phase 3: Compliance & Analytics (Weeks 6-7)
**Sprint 6** - Consent, audit, data subject rights  
**Sprint 7** - Analytics dashboard  

### Phase 4: Polish (Weeks 8-9)
**Sprint 8** - Google Calendar (optional toggle)  
**Sprint 9** - USSD booking (v0.2)  

**Target MVP**: 8-10 weeks

---

## 📊 Your Current Status

```
✅ frappe-appointment cloned and installed
✅ Database migrated successfully
✅ Documentation created:
- ../planning/PROJECT_STATUS_TRACKER.md (full sprint tracking)
- ../getting-started/GETTING_STARTED.md (hands-on guide)
- ../getting-started/QUICK_REFERENCE.md (command cheat sheet)
- PROJECT_SUMMARY.md (this file)
   - README_ETHIOPIAN_SCHEDULER.md (project overview)

⏳ Next: Create test appointment group and explore app

📍 You are here: Sprint 0 - Familiarization
```

---

## 🎯 Immediate Next Steps (Today)

1. **Start your bench** (if not running):
   ```bash
   cd /home/minte/projects/frappe-bench
   bench start
   ```

2. **Login and explore**:
   - Go to http://localhost:8000
   - Login as Administrator
   - Navigate to: Appointment Group

3. **Create first appointment group**:
   - Click "New"
   - Name: "Test Consultation"
   - Duration: 30 minutes
   - Add yourself as member
   - Save

4. **Test booking flow**:
   - Copy the public URL
   - Open in private/incognito window
   - Try booking a slot

5. **(Optional) Setup Google Calendar**:
   - Follow `docs/system_setup_guide.md`
   - Helps understand calendar integration

6. **Explore via console**:
   ```bash
   bench --site appointment.com console
   ```

---

## 📚 Document Navigation

**For quick command lookup:**  
→ `../getting-started/QUICK_REFERENCE.md`

**For learning the app:**  
→ `../getting-started/GETTING_STARTED.md`

**For sprint tasks & progress:**  
→ `PROJECT_STATUS_TRACKER.md`

**For product requirements:**  
→ `scheduling_platform_prd.md`

**For API design & verification:**  
→ `scheduling_platform_implementation_plan_sprint_board.md`

**For project overview:**  
→ `README_ETHIOPIAN_SCHEDULER.md`

---

## 🎓 Key Concepts

### Appointment Group (Base)
Think of it as an "Event Type" in Calendly:
- Defines duration, buffers, reschedule rules
- Has members (who can fulfill the appointment)
- Generates public booking URL
- Handles availability calculation

### What We're Adding

**Provider** = Professional (doctor, stylist, coach)
- Can work across multiple locations
- Has availability rules and time-off
- Linked to services they offer

**Location** = Physical place (clinic, salon branch)
- Has opening hours
- Has resources (rooms, chairs)
- Multiple providers can work here

**Service** = Bookable offering (consultation, haircut)
- Has duration and price
- Deposit rules
- Buffer requirements

**EventType** = Combines Service + Provider + Location
- Extends Appointment Group
- Adds payment/policy info
- Public booking URL

---

## 🔍 Understanding the Flow

### Current Flow (frappe-appointment)
```
Client visits booking link
    ↓
System shows available slots
    ↓
Client selects slot
    ↓
System creates Event
    ↓
Email confirmation sent
    ↓
(Optional) Syncs to Google Calendar
```

### Enhanced Flow (What We're Building)
```
Client visits booking link OR dials USSD
    ↓
System checks multi-location availability
    ↓
Client selects slot
    ↓
System calculates price + deposit (Policy Engine)
    ↓
Client pays deposit via telebirr/Chapa/M-PESA
    ↓
Payment webhook confirms → Appointment CONFIRMED
    ↓
SMS reminder sent (T-48h, T-24h, T-3h)
    ↓
Front-desk sees booking OR client arrives
    ↓
Analytics updated (utilization, revenue, no-shows)
```

---

## 💡 Design Principles

1. **Build on, don't replace**
   - Keep frappe-appointment features intact
   - Extend, don't rewrite
   - Make integrations optional

2. **Ethiopia-first**
   - Default: ETB, Amharic, Africa/Addis_Ababa
   - But support English and internationalization
   - Optimize for low-bandwidth contexts

3. **Compliance by design**
   - Consent capture on first interaction
   - Audit all admin actions
   - Data export/delete built-in

4. **Progressive enhancement**
   - Core works without Google Calendar
   - SMS works if internet fails
   - USSD for zero-data booking

---

## 📈 Success Metrics

**User Acquisition:**
- Provider activation → first booking < 24h
- Client booking completion rate > 80%

**Operations:**
- No-show rate ↓ 30% (after deposits/reminders)
- Provider utilization > 70%

**Technical:**
- Slot search < 1.5s (30-day window, 20 providers)
- PSP webhook success > 95%
- SMS delivery > 99%

**Business:**
- Total revenue processed
- Average deposit capture rate
- Refund rate < 5%

---

## 🛠️ Tech Stack

**Backend:**
- Frappe Framework (Python)
- MariaDB/MySQL
- Redis (queuing)

**Frontend:**
- React (front-desk console)
- Frappe UI components
- Jinja templates (booking page)

**Integrations:**
- Google Calendar API (optional)
- Zoom API (optional)
- telebirr, Chapa, M-PESA payment APIs
- SMS gateway (to be determined)
- USSD gateway (to be determined)

---

## 🚀 When Are We Done?

**MVP is ready when:**
- [ ] Solo provider can create booking link with deposit
- [ ] Client can book and pay via telebirr or Chapa
- [ ] SMS reminders sent in Amharic/English
- [ ] Front-desk can see today's schedule and book walk-ins
- [ ] Multi-location clinic can manage providers across branches
- [ ] Analytics show no-shows, utilization, revenue
- [ ] Consent captured and data export works
- [ ] No critical bugs, < 2s page loads

**Then we can:**
- Onboard beta customers
- Gather feedback
- Iterate on UX
- Add USSD (v0.2)
- Build marketplace (v0.3)

---

## 🤔 FAQ

**Q: Why fork frappe-appointment instead of building from scratch?**  
A: Slot generation and conflict detection are hard. We get that for free, plus Google Calendar sync and meeting links. We focus on what's unique: payments, multi-location, compliance.

**Q: Can we use this outside Ethiopia?**  
A: Yes! The base is generic. Payment drivers and channels are pluggable. Just add your local PSPs and SMS providers.

**Q: What if upstream updates frappe-appointment?**  
A: We can merge updates. Our extensions are in separate apps, so conflicts are minimal.

**Q: Why three separate apps instead of one?**  
A: Modularity. Someone might want payments without channels, or channels without payments. Also easier to test and maintain.

**Q: How much will this cost to run?**  
A: Infrastructure: ~$20-50/mo (VPS). SMS: pay-per-message. PSP fees: ~3% of transactions. Self-hosted, so no SaaS fees.

---

## 🎯 Remember

**You are in Sprint 0** - familiarization phase.

**Goal**: Understand the existing app before building custom features.

**Time**: 1-2 days of exploration.

**Next**: Sprint 1 starts when you're comfortable navigating the codebase and can explain how slot generation works.

**Resources**: All documents are in `/docs/`. Start with `../getting-started/GETTING_STARTED.md`.

---

## 📞 Quick Commands Reference

```bash
# Start
cd /home/minte/projects/frappe-bench
bench start

# Console
bench --site appointment.com console

# Migrate
bench --site appointment.com migrate

# Clear cache
bench --site appointment.com clear-cache

# Watch logs
tail -f sites/appointment.com/logs/web.error.log
```

---

**Current Status**: ✅ Setup Complete | ⏳ Ready to Explore  
**Current Sprint**: Sprint 0 - Familiarization  
**Next Milestone**: Create first test appointment group  

---

*Let's build something amazing for Ethiopia! 🇪🇹*

---

*Last Updated: 2025-11-14*

