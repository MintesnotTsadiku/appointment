# Ethiopian Scheduling Platform Development

> **Building on frappe-appointment to create a local-first scheduling solution for Ethiopia**

---

## 🎯 Quick Start

You are currently in **Sprint 0 - Familiarization Phase**.

### Your Environment
- **Site**: `appointment.com`
- **Bench**: `/home/minte/projects/frappe-bench`
- **Base App**: `frappe-appointment` (from rtCamp)
- **Status**: ✅ Installed and migrated

### Next Immediate Steps

1. **Start the bench** (if not running):
   ```bash
   cd /home/minte/projects/frappe-bench
   bench start
   ```

2. **Login to Frappe**:
   - URL: http://localhost:8000
   - User: Administrator

3. **Create your first Appointment Group**:
   - Go to: Appointment Group → New
   - Fill in basic details (see `docs/getting-started/GETTING_STARTED.md`)
   - Test the booking flow

4. **(Optional) Setup Google Calendar**:
   - Follow: `docs/technical/system_setup_guide.md`
   - Not required for MVP, but helps understand the app

---

## 📚 Key Documents

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **[docs/planning/PROJECT_STATUS_TRACKER.md](docs/planning/PROJECT_STATUS_TRACKER.md)** | Master progress tracker, sprint tasks | Check progress, plan sprints |
| **[docs/getting-started/GETTING_STARTED.md](docs/getting-started/GETTING_STARTED.md)** | Step-by-step familiarization guide | Learning the existing app |
| **[docs/getting-started/QUICK_REFERENCE.md](docs/getting-started/QUICK_REFERENCE.md)** | Command cheat sheet | Quick command lookup |
| **[docs/planning/scheduling_platform_prd.md](docs/planning/scheduling_platform_prd.md)** | Product requirements | Understanding what to build |
| **[docs/planning/scheduling_platform_implementation_plan_sprint_board.md](docs/planning/scheduling_platform_implementation_plan_sprint_board.md)** | Detailed sprint plan with APIs | During development |
| **[docs/strategy/ethiopian_scheduling_platform_overview_strategy.md](docs/strategy/ethiopian_scheduling_platform_overview_strategy.md)** | Vision & strategy | Big picture understanding |

---

## 🏗️ Project Architecture

```
Ethiopian Scheduler = frappe-appointment (base) + 3 custom modules

┌─────────────────────────────────────────────────────────────┐
│                  appointment App                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │ scheduler module │  │ payments     │  │ channels       │ │
│  ├──────────────────┤  ├──────────────┤  ├───────────────┤ │
│  │ • Provider       │  │ • telebirr   │  │ • SMS         │ │
│  │ • Location       │  │ • Chapa      │  │ • USSD        │ │
│  │ • Service        │  │ • M-PESA     │  │ • Templates   │ │
│  │ • Policies       │  │ • Webhooks   │  │ • Delivery    │ │
│  │ • Front-Desk UI  │  │ • Refunds    │  │               │ │
│  └──────────────────┘  └──────────────┘  └───────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ appointment module (original/upstream)            │ │
│  │ • Appointment Group • Slot Engine • Google Calendar     │ │
│  │ • Zoom/Meet Links • Rescheduling                         │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎓 Current State

### ✅ What Exists (from frappe-appointment)
- Appointment Group creation
- Time slot generation
- Google Calendar sync
- Zoom/Google Meet integration
- Rescheduling with constraints
- Buffer times
- Email notifications
- Event management

### 🔧 What We're Building
- **Multi-location scheduling** with location-aware calendars
- **Ethiopian payment gateways** (telebirr, Chapa, M-PESA)
- **Deposit & policy engine** (cancel windows, late fees)
- **Front-desk console** for walk-ins and staff booking
- **SMS reminders** in Amharic/English
- **USSD booking** for low-data access
- **Compliance tools** (consent, audit, data subject rights)
- **Analytics dashboard** (no-show %, utilization, revenue)

---

## 🚀 Development Roadmap

### Sprint 0: Setup & Familiarization (CURRENT)
**Goal**: Understand the existing app  
**Duration**: 1-2 days  
**Tasks**:
- [x] Clone and install frappe-appointment
- [x] Run database migrations
- [ ] Create test appointment group
- [ ] Test booking flow
- [ ] (Optional) Setup Google Calendar
- [ ] Review codebase structure
- [ ] Explore via console

### Sprint 1: Foundations (NEXT)
**Goal**: Create custom modules and core doctypes  
**Duration**: 1 week  
**Deliverables**:
- `scheduler`, `payments`, `channels` modules (within appointment)
- Provider, Location, Service doctypes
- Basic permissions and roles
- Timezone/currency defaults (ETB, Africa/Addis_Ababa)

### Sprint 2: Slot Engine & Policies
**Goal**: Smart availability with conflict detection  
**Duration**: 1 week  
**Deliverables**:
- Multi-location conflict detection
- Policy engine (deposits, cancellations)
- Booking quote API

### Sprint 3-9: See [docs/planning/PROJECT_STATUS_TRACKER.md](docs/planning/PROJECT_STATUS_TRACKER.md)

---

## 🔍 Exploration Commands

### Quick Console Exploration
```bash
cd /home/minte/projects/frappe-bench
bench --site appointment.com console
```

Inside console:
```python
import frappe

# List appointment groups
frappe.get_all("Appointment Group", fields=["name", "group_name"])

# Check app status
frappe.get_installed_apps()

# Get doctype info
frappe.get_meta("Appointment Group")
```

### Run Full Exploration Script
```bash
bench --site appointment.com console < apps/appointment/scripts/explore_app.py
```

---

## 💻 Development Workflow

### Daily Flow
1. **Start bench**: `bench start`
2. **Make changes** in code
3. **If doctype changed**: `bench --site appointment.com migrate`
4. **If frontend changed**: `bench build`
5. **Test** in browser/console
6. **Commit** changes

### Creating New Apps (Sprint 1)
```bash
cd /home/minte/projects/frappe-bench

# Create apps
bench new-app ethi_scheduler
bench new-app ethi_payments  
bench new-app ethi_channels

# Install to site
bench --site appointment.com install-app ethi_scheduler
bench --site appointment.com install-app ethi_payments
bench --site appointment.com install-app ethi_channels

# Migrate
bench --site appointment.com migrate
```

### Git Workflow
```bash
cd /home/minte/projects/frappe-bench/apps/appointment

# Create development branch
git checkout -b develop
git push -u origin develop

# Feature development
git checkout -b feat/provider-doctype
# ... make changes ...
git commit -m "feat: add Provider doctype"
git push origin feat/provider-doctype

# Merge to develop
git checkout develop
git merge feat/provider-doctype
```

---

## 🛠️ Useful Commands

### Bench Operations
```bash
# Start/stop
bench start
bench restart
bench stop

# Clear cache
bench --site appointment.com clear-cache

# Migrate database
bench --site appointment.com migrate

# Build assets
bench build

# Console
bench --site appointment.com console

# Watch logs
tail -f sites/appointment.com/logs/web.error.log
```

### Developer Mode
```bash
# Enable (recommended during development)
bench --site appointment.com set-config developer_mode 1
bench --site appointment.com clear-cache

# Disable
bench --site appointment.com set-config developer_mode 0
```

---

## 📋 Sprint 0 Checklist

**Learning the App**:
- [ ] Read through `scheduling_platform_prd.md`
- [ ] Review `docs/planning/PROJECT_STATUS_TRACKER.md`
- [ ] Understand existing frappe-appointment features
- [ ] Explore the codebase structure

**Hands-on Exploration**:
- [ ] Create an Appointment Group via UI
- [ ] Set your availability (User Appointment Availability)
- [ ] Generate and test a booking link
- [ ] Book a test appointment
- [ ] Try rescheduling
- [ ] Test buffer times

**Optional (Recommended)**:
- [ ] Setup Google Calendar integration
- [ ] Test calendar sync
- [ ] Review slot generation logic in `helpers/availability.py`
- [ ] Check API endpoints in `api/` folder

**Preparation for Sprint 1**:
- [ ] Create development branch
- [ ] Review custom app structure in Frappe docs
- [ ] Plan Provider/Location/Service doctype fields
- [ ] Set up local development environment

---

## 🎯 Success Criteria for Sprint 0

You're ready to move to Sprint 1 when you can:

1. ✅ Create an appointment group with custom settings
2. ✅ Generate and access a booking link
3. ✅ Successfully book an appointment as a guest
4. ✅ Explain how the slot generation works
5. ✅ Navigate the codebase confidently
6. ✅ Use Frappe console to query data
7. ✅ Understand what needs to be added for Ethiopian requirements

---

## 🆘 Getting Help

### Common Issues

**Issue**: Can't create appointment group  
**Fix**: Make sure you're logged in as Administrator and have System Manager role

**Issue**: No slots showing  
**Fix**: Check User Appointment Availability is configured for the members

**Issue**: Database table errors  
**Fix**: Run `bench --site appointment.com migrate`

**Issue**: Changes not reflecting  
**Fix**: 
```bash
bench --site appointment.com clear-cache
bench restart
```

### Resources
- **Frappe Docs**: https://frappeframework.com/docs
- **Frappe Forum**: https://discuss.frappe.io/
- **frappe-appointment GitHub**: https://github.com/rtCamp/frappe-appointment

---

## 🔗 Key URLs

- **Desk Home**: http://localhost:8000/app
- **Appointment Groups**: http://localhost:8000/app/appointment-group
- **Settings**: http://localhost:8000/app/appointment-settings
- **Google Settings**: http://localhost:8000/app/google-settings
- **Booking Page**: http://localhost:8000/schedule/appointment-group/[name]

---

## 📊 Project Metrics (Target)

By MVP launch, we aim for:
- ⬇️ 30% reduction in no-shows (vs baseline)
- ⚡ < 24h from provider signup to first booking
- ✅ 95% PSP webhook success rate
- 📱 < 1% failed SMS deliveries
- 🚀 < 1.5s slot search for 30-day window

---

## 🤝 Contributing

This is a custom fork for Ethiopian market. Core workflow:

1. **Create feature branch** from `develop`
2. **Implement** with tests
3. **Document** changes in relevant .md files
4. **Update** `docs/planning/PROJECT_STATUS_TRACKER.md`
5. **Merge** to `develop` when ready
6. **Release** to `main` when sprint complete

---

## 📝 License

Base app (frappe-appointment): AGPLv3  
Custom extensions: (To be determined)

---

## 🎉 Ready to Start?

1. **Read**: `docs/getting-started/GETTING_STARTED.md` for step-by-step exploration
2. **Reference**: `docs/getting-started/QUICK_REFERENCE.md` for commands
3. **Track**: `docs/planning/PROJECT_STATUS_TRACKER.md` for progress
4. **Build**: Follow sprint tasks when ready

---

**Current Phase**: Sprint 0 - Familiarization  
**Next Phase**: Sprint 1 - Create custom apps and doctypes  
**Target MVP**: ~8-10 sprints (2-3 months)

Let's build something great for Ethiopia! 🇪🇹

---

*Last Updated: 2025-11-14*  
*Maintainer: Development Team*

