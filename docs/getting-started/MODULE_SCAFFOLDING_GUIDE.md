# Module Scaffolding Guide - Creating Modules in frappe_appointment

> **Step-by-step guide** to create modules within the existing `frappe_appointment` app  
> **Status**: ✅ Modules have been created! This guide documents what was done.

---

## 🎯 Overview

Instead of creating separate apps, we're creating **modules** within the existing `frappe_appointment` app:

1. **Scheduler** - Core scheduling extensions (Provider, Location, Service, Policies, Front-Desk)
2. **Payments** - Payment integrations (telebirr, Chapa, M-PESA)
3. **Channels** - Communication channels (SMS, USSD, Email templates)

---

## 📋 Prerequisites

- [ ] Frappe bench is running
- [ ] Site `appointment.com` is active
- [ ] You're in the app directory
- [ ] Developer mode enabled (optional but recommended)

---

## ✅ Module Creation Complete!

The modules have been successfully created. Here's what was done:

### Step 1: Updated modules.txt ✅

Added three new modules to `frappe_appointment/modules.txt`:
```
Frappe Appointment
Scheduler
Payments
Channels
```

### Step 2: Created Module Directories ✅

Created directory structure for each module:
- `frappe_appointment/scheduler/`
- `frappe_appointment/payments/`
- `frappe_appointment/channels/`

### Step 3: Created Module Structure ✅

Each module has:
- `__init__.py` - Module initialization
- `doctype/` - For doctype definitions
- `api/` - For API endpoints
- `helpers/` - For utility functions
- Module-specific directories (drivers/ for payments, templates/ for channels)

### Step 4: Ran Migrations ✅

Migrations completed successfully, modules are registered in Frappe.

---

## 🔄 If You Need to Recreate (Reference)

### Update modules.txt
```bash
cd /home/minte/projects/frappe-bench/apps/frappe_appointment
# Edit frappe_appointment/modules.txt
# Add: Scheduler, Payments, Channels
```

### Create Directories
```bash
cd frappe_appointment
mkdir -p scheduler payments channels
touch scheduler/__init__.py payments/__init__.py channels/__init__.py
mkdir -p scheduler/{doctype,api,helpers}
mkdir -p payments/{doctype,api,helpers,drivers}
mkdir -p channels/{doctype,api,helpers,templates}
```

### Run Migrations
```bash
cd /home/minte/projects/frappe-bench
bench --site appointment.com migrate
```

---

## 📁 Final Module Structure

After scaffolding, your structure will look like:

```
frappe_appointment/
├── frappe_appointment/
│   ├── __init__.py
│   ├── modules.txt                    # Contains: Frappe Appointment, Scheduler, Payments, Channels
│   ├── frappe_appointment/           # Original module
│   │   └── doctype/
│   ├── scheduler/                     # NEW: Scheduler module
│   │   ├── __init__.py
│   │   ├── doctype/                   # Provider, Location, Service, etc.
│   │   ├── api/                       # API endpoints
│   │   └── helpers/                   # Utility functions
│   ├── payments/                      # NEW: Payments module
│   │   ├── __init__.py
│   │   ├── doctype/                   # PaymentIntent, etc.
│   │   ├── api/                       # Payment APIs
│   │   └── helpers/                   # Payment utilities
│   └── channels/                      # NEW: Channels module
│       ├── __init__.py
│       ├── doctype/                   # Notification, etc.
│       ├── api/                       # Channel APIs
│       └── helpers/                   # Channel utilities
├── hooks.py
└── ...
```

---

## ✅ Verification Checklist

After scaffolding, verify:

- [ ] `modules.txt` contains all four modules
- [ ] Module directories exist with `__init__.py`
- [ ] Doctype directories created
- [ ] Modules appear in Frappe desk (search for module names)
- [ ] Can import modules in console
- [ ] Migration completed successfully

---

## 🔧 Next Steps (Sprint 1)

After modules are created:

1. **Create Doctypes** (in scheduler module):
   - Provider
   - Location
   - Service
   - EventType
   - Appointment (extends Event)

2. **Create Doctypes** (in payments module):
   - PaymentIntent

3. **Create Doctypes** (in channels module):
   - Notification

4. **Setup Permissions**:
   - Configure roles
   - Setup access control

5. **Add Localization**:
   - Create translation files
   - Setup timezone/currency defaults

---

## 🆘 Troubleshooting

### Issue: Modules not appearing in desk
```bash
# Clear cache
bench --site appointment.com clear-cache

# Reload modules
bench --site appointment.com console <<< "
import frappe
frappe.reload_doc('frappe_appointment', 'module', 'scheduler')
frappe.reload_doc('frappe_appointment', 'module', 'payments')
frappe.reload_doc('frappe_appointment', 'module', 'channels')
"

# Restart bench
bench restart
```

### Issue: Import errors
```bash
# Check __init__.py files exist
ls frappe_appointment/scheduler/__init__.py
ls frappe_appointment/payments/__init__.py
ls frappe_appointment/channels/__init__.py

# Verify modules.txt format
cat frappe_appointment/modules.txt
```

### Issue: Migration fails
```bash
# Check for syntax errors in modules.txt
# Ensure no trailing spaces or empty lines

# Try verbose migration
bench --site appointment.com migrate --verbose
```

---

## 📚 Related Documentation

- **Project Status**: `docs/planning/PROJECT_STATUS_TRACKER.md`
- **Implementation Plan**: `docs/planning/scheduling_platform_implementation_plan_sprint_board.md`
- **Quick Reference**: `docs/getting-started/QUICK_REFERENCE.md`

---

**Ready to scaffold modules!** 🚀

