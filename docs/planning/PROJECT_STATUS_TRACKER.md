# Ethiopian Scheduling Platform - Project Status Tracker

## Executive Summary

**Project**: Ethiopian Scheduling Platform (ethi-scheduler)  
**Base**: Fork of rtCamp/frappe-appointment  
**Objective**: Build a local-first scheduling platform with Ethiopian payment rails (telebirr/Chapa/M-PESA), front-desk console, SMS/USSD booking, and compliance with Proclamation 1321/2024.

**Current Status**: ✅ Base app cloned, analyzing existing features  
**Next Step**: Familiarize with existing app, setup Google Calendar, then scaffold custom modules

---

## 🎯 Project Scope Summary

We are building on top of `frappe-appointment` to create:
- **Multi-location, multi-provider scheduling** with front-desk console
- **Local payment integration** (telebirr, Chapa, M-PESA Ethiopia)
- **Low-bandwidth access** (SMS reminders, USSD booking)
- **Localization** (Amharic/English, ETB currency, Africa/Addis_Ababa timezone)
- **Compliance tools** (consent management, audit trails, data subject rights)

---

## 📊 Current State Analysis

### ✅ What Upstream frappe-appointment Provides

| Feature | Status | Notes |
|---------|--------|-------|
| **Core Scheduling** | ✅ Exists | `Appointment Group` doctype with event scheduling |
| **Slot Management** | ✅ Exists | Time slot generation and booking |
| **Google Calendar Sync** | ✅ Exists | Bi-directional sync with Google Calendar |
| **Rescheduling** | ✅ Exists | Built-in reschedule support with notice periods |
| **Zoom Integration** | ✅ Exists | Auto-generate Zoom meeting links |
| **Google Meet** | ✅ Exists | Auto-generate Google Meet links |
| **ERPNext Leave Integration** | ✅ Exists | Blocks slots based on Leave Application |
| **Email Notifications** | ✅ Exists | Email templates and alerts |
| **Buffer Times** | ✅ Exists | Minimum buffer between appointments |
| **Booking Limits** | ✅ Exists | Daily booking frequency limits |
| **Group Appointments** | ✅ Exists | Multiple members per appointment |

### ⚠️ What's Missing (Our Custom Development Needed)

| Feature | Priority | Target Sprint |
|---------|----------|---------------|
| **Provider/Location Management** | 🔴 High | Sprint 1 |
| **Service Catalog** | 🔴 High | Sprint 1 |
| **Payment Integration** | 🔴 High | Sprint 3 |
| **Front-Desk Console** | 🔴 High | Sprint 5 |
| **SMS Notifications** | 🟡 Medium | Sprint 4 |
| **Policy Engine (deposits/cancellations)** | 🔴 High | Sprint 2 |
| **Multi-location Scheduling** | 🔴 High | Sprint 1 |
| **Compliance Tools** | 🟡 Medium | Sprint 6 |
| **Analytics Dashboard** | 🟢 Low | Sprint 7 |
| **USSD Booking** | 🟢 Low | Sprint 9 |
| **Amharic Localization** | 🟡 Medium | Sprint 1 |

---

## 🏗️ Module Architecture Plan

We will create modules within the existing `frappe_appointment` app to keep code organized:

```
frappe_appointment/
├── frappe_appointment/          # ✅ Original module (upstream features)
│   └── doctype/                 # Appointment Group, User Availability, etc.
├── scheduler/                   # 🔧 Core scheduling extensions (NEW MODULE)
│   ├── doctype/
│   │   ├── Provider
│   │   ├── Location
│   │   ├── Service
│   │   ├── EventType (extends Appointment Group)
│   │   ├── Appointment (extends Event)
│   │   └── Policy
│   ├── api/                     # Booking APIs, slot queries
│   └── helpers/                 # Availability logic, conflict detection
├── payments/                    # 💰 Payment integrations (NEW MODULE)
│   ├── doctype/
│   │   └── PaymentIntent
│   ├── drivers/
│   │   ├── telebirr.py
│   │   ├── chapa.py
│   │   └── mpesa.py
│   ├── api/
│   │   └── webhooks/
│   └── helpers/
└── channels/                    # 📱 Communication channels (NEW MODULE)
    ├── doctype/
    │   └── Notification
    ├── api/
    ├── helpers/
    │   ├── sms_providers/
    │   ├── ussd_gateway/
    │   └── templates/
    └── templates/               # Message templates (Amharic/English)
```

---

## 📋 Sprint Progress Tracker

### Sprint 0: Setup & Familiarization (CURRENT)

**Goal**: Understand upstream app, setup development environment, test existing features

| Task | Status | Notes |
|------|--------|-------|
| Clone frappe-appointment repo | ✅ Done | Cloned to local bench |
| Review existing doctypes | ✅ Done | Analyzed Appointment Group, User Availability |
| Setup Google Calendar integration | ⏳ In Progress | Following system_setup_guide.md |
| Test booking flow | ⏳ Pending | Will test after Google setup |
| Test rescheduling | ⏳ Pending | |
| Test Zoom integration (optional) | 🔵 Optional | Can skip for MVP |
| Document gaps vs requirements | ⏳ In Progress | This document |
| Create new branch for development | ⏳ Pending | Will create `develop` branch |

**Acceptance**: Can create appointment groups, book slots, receive confirmations

---

### Sprint 1: Foundations — Doctypes & Modules

**Goal**: Scaffold custom apps and create core doctypes

| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Create **Scheduler** module | ✅ Done | Added to `modules.txt`, directory structure created |
| Create **Payments** module | ✅ Done | Added to `modules.txt`, directory structure created |
| Create **Channels** module | ✅ Done | Added to `modules.txt`, directory structure created |
| Run migrations | ✅ Done | Modules registered in Frappe |
| Create **Provider** doctype | ⏳ Not Started | Name, phone, email, locations (M2M) |
| Create **Location** doctype | ⏳ Not Started | Name, address, timezone, opening hours |
| Create **Service** doctype | ⏳ Not Started | Name, duration, price, buffer times |
| Create **EventType** doctype | ⏳ Not Started | Links to Service, Provider, Location |
| Extend **Appointment** | ⏳ Not Started | Add client details, payment refs, status |
| Setup roles & permissions | ⏳ Not Started | Owner, Manager, Provider, Front-Desk |
| Add timezone default (Africa/Addis_Ababa) | ⏳ Not Started | System settings |
| Add currency default (ETB) | ⏳ Not Started | System settings |
| Create Amharic translation files | ⏳ Not Started | `.csv` files for i18n |

**Agent Verification**:
- [ ] Console: `frappe.get_meta("Provider")` returns fields
- [ ] Console: Create sample Provider/Location/Service records
- [ ] Console: Verify modules can be imported: `import frappe_appointment.scheduler`
- [ ] Browser: Public event URL renders placeholder slots

---

### Sprint 2: Slot Engine & Policies

**Goal**: Smart availability with conflict detection and policy rules

| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Implement working hours logic | ⏳ Not Started | Respects Location opening hours |
| Add time-off blocking | ⏳ Not Started | Blocks based on Provider availability |
| Conflict detection across locations | ⏳ Not Started | Prevents double-booking |
| Enforce buffer times | ⏳ Not Started | Minimum gap before/after appointments |
| Create **Policy** doctype | ⏳ Not Started | Deposit %, cancel windows, late fees |
| Policy engine service | ⏳ Not Started | Returns applicable policies for quotes |
| Booking quote API | ⏳ Not Started | GET `/api/method/ethi_scheduler.api.quote` |

**Agent Verification**:
- [ ] Console: Create overlapping appointments → should fail
- [ ] Console: Book within buffer → should fail
- [ ] Browser: Slot search respects provider time-off

---

### Sprint 3: Payments (telebirr & Chapa)

**Goal**: Deposit capture and payment confirmation

| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Payments module already created | ✅ Done | Created in Sprint 1 |
| Create **PaymentIntent** doctype | ⏳ Not Started | Amount, PSP, status, signatures |
| Implement telebirr driver | ⏳ Not Started | Init payment, webhook verify |
| Implement Chapa driver | ⏳ Not Started | Hosted checkout, webhook verify |
| Webhook endpoints | ⏳ Not Started | `/api/method/frappe_appointment.payments.webhook.*` |
| Update Appointment on payment | ⏳ Not Started | Status: Pending → Confirmed |
| Refund endpoint | ⏳ Not Started | For host cancellations |
| PSP secret management | ⏳ Not Started | Environment variables |

**Agent Verification**:
- [ ] Browser: Complete test payment in telebirr sandbox
- [ ] Console: Inject webhook payload → verify signature
- [ ] Console: Check Appointment.status changed to "Confirmed"
- [ ] Console: Trigger refund → PaymentIntent status "Refunded"

---

### Sprint 4: Notifications (SMS/Email)

**Goal**: Reminder system with delivery tracking

| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Channels module already created | ✅ Done | Created in Sprint 1 |
| Create **Notification** doctype | ⏳ Not Started | Channel, template, delivery status |
| SMS provider abstraction | ⏳ Not Started | Pluggable driver interface |
| Create message templates | ⏳ Not Started | Amharic + English versions |
| Reminder scheduler | ⏳ Not Started | T-48h, T-24h, T-3h configurable |
| DLR (delivery receipt) processing | ⏳ Not Started | Update delivery_status field |
| Opt-out flag | ⏳ Not Started | Prevent sends to opted-out clients |

**Agent Verification**:
- [ ] Console: Enqueue reminder → Notification row created
- [ ] Console: Check `sent_at` timestamp populated
- [ ] Console: Verify DLR callback updates status

---

### Sprint 5: Front-Desk Console

**Goal**: Day/week view for multi-provider scheduling

| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Create React page at `/desk` | ⏳ Not Started | Frontend workspace setup |
| Provider/location filters | ⏳ Not Started | Dropdown filters |
| Day view grid | ⏳ Not Started | Shows appointments by provider |
| Week view grid | ⏳ Not Started | 7-day overview |
| Create appointment modal | ⏳ Not Started | Form to book on behalf |
| Drag-reschedule | ⏳ Not Started | Drag appointment to new time |
| Policy check on reschedule | ⏳ Not Started | Show toast error if violates rules |
| Walk-in queue | ⏳ Not Started | List of unassigned walk-ins |
| Assign walk-in to slot | ⏳ Not Started | Button to assign to next free slot |

**Agent Verification**:
- [ ] Browser: Open front-desk, see today's appointments
- [ ] Browser: Drag appointment → time updated in DB
- [ ] Browser: Try to drag into conflicting slot → error shown
- [ ] Browser: Add walk-in to queue → appears in list

---

### Sprint 6: Compliance & Audit

**Goal**: GDPR/Proclamation 1321 compliance tools

| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Create **ConsentRecord** doctype | ⏳ Not Started | Subject, purpose, granted_at, revoked_at |
| Capture consent on first booking | ⏳ Not Started | Checkbox + storage |
| Create **AuditEvent** doctype | ⏳ Not Started | Actor, action, resource, timestamp |
| Audit middleware | ⏳ Not Started | Log admin changes automatically |
| Data export endpoint | ⏳ Not Started | GET `/api/method/.../export_subject` |
| Data deletion endpoint | ⏳ Not Started | POST `/api/method/.../delete_subject` |
| Retention policy job | ⏳ Not Started | Scheduled purge of old data |

**Agent Verification**:
- [ ] Browser: Book as new client → consent form shown
- [ ] Console: Check ConsentRecord created
- [ ] Console: Edit appointment as Manager → AuditEvent logged
- [ ] Console: Run export for phone number → returns JSON
- [ ] Console: Run delete → data masked/purged

---

### Sprint 7: Analytics Dashboard

**Goal**: Key metrics for business owners

| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| No-show % calculation | ⏳ Not Started | Query appointments with status |
| Utilization % calculation | ⏳ Not Started | Booked time / available time |
| Revenue collected | ⏳ Not Started | Sum of confirmed payments |
| Dashboard page | ⏳ Not Started | Charts with 30/90 day filters |
| CSV export | ⏳ Not Started | Download raw data |

**Agent Verification**:
- [ ] Console: Seed test data
- [ ] Browser: Dashboard shows correct metrics
- [ ] Browser: Export CSV → opens in Excel

---

### Sprint 8: Google Calendar (Optional Toggle)

**Goal**: Make existing integration optional, not required

| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| Remove hard dependency | ⏳ Not Started | EventType works without Google Calendar |
| Add enable/disable toggle | ⏳ Not Started | Per-provider setting |
| Bi-directional conflict resolution | ⏳ Not Started | Merge conflicts from Google |
| Refresh token storage | ⏳ Not Started | Secure token management |

**Agent Verification**:
- [ ] Browser: Create EventType without Google Calendar → works
- [ ] Browser: Enable Google Calendar → OAuth flow
- [ ] Console: Run sync job → events created in Google
- [ ] Console: Disable → sync stops

---

### Sprint 9: USSD Core (v0.2)

**Goal**: Basic USSD booking flow

| Task | Status | Acceptance Criteria |
|------|--------|---------------------|
| USSD session handler | ⏳ Not Started | 3-step flow |
| List available services | ⏳ Not Started | USSD menu |
| Show next available slot | ⏳ Not Started | Query availability |
| Confirm booking | ⏳ Not Started | Create appointment |
| Map MSISDN to client | ⏳ Not Started | Auto-create client record |
| Send confirmation SMS | ⏳ Not Started | After USSD confirmation |

**Agent Verification**:
- [ ] Console: Mock USSD request → session created
- [ ] Console: Complete flow → Appointment created
- [ ] Console: Check confirmation SMS queued
- [ ] Browser: Appointment appears in front-desk

---

## 🚀 Next Immediate Actions

1. **Complete Google Calendar Setup** (Sprint 0)
   - Follow `/docs/system_setup_guide.md`
   - Test creating an appointment group
   - Test booking flow
   
2. **Create Development Branch**
   ```bash
   cd /home/minte/projects/frappe-bench/apps/frappe_appointment
   git checkout -b develop
   git push origin develop
   ```

3. **Scaffold Custom Modules** (Sprint 1 Start)
   ```bash
   cd /home/minte/projects/frappe-bench/apps/frappe_appointment
   # Add modules to modules.txt
   # Create module directories
   # Run migrations
   # See: docs/getting-started/MODULE_SCAFFOLDING_GUIDE.md
   ```

4. **Create First Doctypes**
   - Provider
   - Location
   - Service

---

## 📝 Development Guidelines

### Keep Upstream Features
- ✅ Keep Google Calendar integration (make optional)
- ✅ Keep Zoom/Meet link generation
- ✅ Keep slot generation logic (extend, don't replace)
- ✅ Keep ERPNext Leave integration (optional feature)

### Isolate Custom Code
- 🔧 All Ethiopian-specific features in separate modules within frappe_appointment
- 🔧 Use Frappe's override mechanism, not direct edits to upstream code
- 🔧 Periodically merge upstream bug fixes
- 🔧 Keep modules organized: scheduler/, payments/, channels/

### Testing Strategy
- Console verification for backend logic
- Browser testing for UI flows
- Automated tests for payment webhooks
- Load testing for slot queries (< 1.5s for 30 days)

---

## 📚 Key Documents

| Document | Purpose |
|----------|---------|
| `scheduling_platform_prd.md` | Product requirements & user stories |
| `scheduling_platform_implementation_plan_sprint_board.md` | Detailed sprint tasks & API shapes |
| `ethiopian_scheduling_platform_overview_strategy.md` | Vision & market strategy |
| `system_setup_guide.md` | Google Calendar & Zoom setup |
| `PROJECT_STATUS_TRACKER.md` | This file - progress tracking |

---

## 🎯 Success Metrics (MVP Launch)

- [ ] No-show rate ↓ 30% (baseline: TBD)
- [ ] Provider activation → first booking < 24h
- [ ] 95% PSP webhook success within 60s
- [ ] < 1% failed SMS after retry
- [ ] Front-desk page load < 2s
- [ ] Slot search < 1.5s for 30-day window

---

## 🔐 Security Checklist

- [ ] PSP secrets in environment variables
- [ ] Webhook signature verification
- [ ] Replay protection (nonce + 5-min window)
- [ ] Role-based permissions enforced
- [ ] PII encrypted at rest
- [ ] Audit logs for sensitive actions
- [ ] Consent capture on booking
- [ ] Data export/delete endpoints working

---

## 🌍 Localization Checklist

- [ ] Amharic translation files created
- [ ] English fallback working
- [ ] ETB currency symbol displayed
- [ ] Timezone: Africa/Addis_Ababa default
- [ ] Date format: DD/MM/YYYY
- [ ] Phone format: +251...
- [ ] SMS templates in Amharic + English
- [ ] Email templates in Amharic + English

---

**Last Updated**: 2025-11-14  
**Maintained By**: Development Team  
**Status**: Sprint 0 - Setup & Familiarization

---

*This document will be updated after each sprint completion. Always refer to this for current project status.*

