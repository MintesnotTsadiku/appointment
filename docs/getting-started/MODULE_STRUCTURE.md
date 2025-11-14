# Module Structure Reference

> **Quick reference** for the module structure within `frappe_appointment` app

---

## 📁 Current Module Structure

```
frappe_appointment/
├── frappe_appointment/              # Original module (upstream)
│   ├── doctype/
│   │   ├── appointment_group/
│   │   ├── user_appointment_availability/
│   │   └── ...
│   └── ...
│
├── scheduler/                       # ✅ NEW: Core scheduling extensions
│   ├── __init__.py
│   ├── doctype/                     # Provider, Location, Service, EventType, Appointment, Policy
│   ├── api/                         # Booking APIs, slot queries, front-desk APIs
│   └── helpers/                     # Availability logic, conflict detection, policy engine
│
├── payments/                        # ✅ NEW: Payment integrations
│   ├── __init__.py
│   ├── doctype/                     # PaymentIntent
│   ├── api/                         # Payment APIs, webhooks
│   ├── helpers/                     # Payment utilities
│   └── drivers/                     # telebirr.py, chapa.py, mpesa.py
│
└── channels/                        # ✅ NEW: Communication channels
    ├── __init__.py
    ├── doctype/                     # Notification
    ├── api/                         # Channel APIs
    ├── helpers/                     # SMS providers, USSD gateway
    └── templates/                   # Message templates (Amharic/English)
```

---

## 📝 modules.txt

Current content:
```
Frappe Appointment
Scheduler
Payments
Channels
```

**Location**: `frappe_appointment/modules.txt`

---

## 🔧 Module Naming Convention

- **Module names**: Title case (Scheduler, Payments, Channels)
- **Directory names**: Lowercase (scheduler/, payments/, channels/)
- **Import paths**: `frappe_appointment.scheduler`, `frappe_appointment.payments`, `frappe_appointment.channels`

---

## 📦 What Goes Where

### Scheduler Module
- **Doctypes**: Provider, Location, Service, EventType, Appointment, Policy
- **APIs**: `/api/method/frappe_appointment.scheduler.api.*`
- **Helpers**: Availability calculation, conflict detection, policy engine

### Payments Module
- **Doctypes**: PaymentIntent
- **APIs**: `/api/method/frappe_appointment.payments.webhook.*`
- **Drivers**: Payment provider implementations
- **Helpers**: Payment processing, signature verification

### Channels Module
- **Doctypes**: Notification
- **APIs**: `/api/method/frappe_appointment.channels.api.*`
- **Helpers**: SMS/USSD providers, template rendering
- **Templates**: Message templates for different channels

---

## ✅ Verification

Modules are created and ready when:

- [x] `modules.txt` contains all four modules
- [x] Module directories exist with `__init__.py`
- [x] Subdirectories created (doctype/, api/, helpers/)
- [x] Can import: `import frappe_appointment.scheduler`
- [x] Migration completed successfully

---

## 🚀 Next: Create Doctypes

Now that modules are scaffolded, next steps:

1. **Scheduler module**: Create Provider, Location, Service doctypes
2. **Payments module**: Create PaymentIntent doctype
3. **Channels module**: Create Notification doctype

See: `docs/getting-started/MODULE_SCAFFOLDING_GUIDE.md` for details.

---

**Status**: ✅ Modules scaffolded and ready for doctype creation

