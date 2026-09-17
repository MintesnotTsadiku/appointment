# Multi-Business Architecture Implementation

## Status: IN PROGRESS

**Date Started**: 2025-11-16  
**Current Phase**: Phase 1 - Core Data Model

---

## ✅ Completed Tasks

### Phase 1: Core Data Model

1. **✅ Created Custom Roles**
   - Organization Manager
   - Front Desk
   - Assistant
   
2. **✅ Created Organization Manager Child Doctype**
   - Fields: user, full_name, permissions (can_manage_providers, can_manage_services, can_view_financials)
   
3. **✅ Created Organization Doctype**
   - Location: `appointment/appointment/doctype/organization/`
   - Fields:
     - Basic: organization_name, organization_type, slug
     - Contact: email, phone, timezone, language
     - Management: owner_user, managers (child table)
     - Booking: booking_policy, allow_provider_selection, enable_public_booking, require_payment
     - Branding: logo, primary_color, description
     - Status: is_active, setup_complete
   - Permissions: System Manager, Organization Manager

---

## 🚧 Status Update (2025-11-16)

### ⭐ CRITICAL FIX APPLIED:
**Problem**: Booking URLs showed "No open-time slots"  
**Root Cause**: User Appointment Availability not created during onboarding  
**Solution**: Updated `create_service()` in onboarding.py to create:
- User Appointment Availability (with slug = event_type.name)
- Appointment Slot Duration (with service details)

**Status**: ✅ Ready for testing

### Phase 1 Remaining:
- Update Provider doctype (add organization fields, delegation)
- Create Provider Delegation doctype
- Update doctype permissions

**Next**: Awaiting test results before continuing with full organization implementation

---

## 📋 Architecture Overview

### Data Model Hierarchy

```
Organization
├── Manages multiple Providers
├── Owns Locations
├── Defines Services
└── Has Managers (users with Organization Manager role)

Provider
├── Can be independent (organization = null)
├── Or belong to Organization
├── Has Locations (M2M through Provider Location)
├── Offers Services
├── Can delegate to Assistants/Front Desk
└── Has personal booking URL (optional)

Provider Delegation
├── Links Provider → Delegate (User)
├── Defines permissions
├── Status: pending/active/declined

Roles:
├── Organization Manager (manages org)
├── Provider (delivers services)
├── Front Desk (handles org bookings)
└── Assistant (manages on behalf of provider)
```

### Onboarding Flows

**Step 0: Choose Type**
- Individual Provider
- Organization

**Individual Flow:**
1. Profile (name, type, timezone)
2. Calendar (connect or builtin)
3. Availability (weekly schedule)
4. Service (first service)
5. Success (booking URL)
   - Creates: Provider, Location, Service, EventType, User Appointment Availability

**Organization Flow:**
1. Organization Profile (name, type, timezone)
2. Add Providers (optional, can skip)
3. Business Hours (organization-level)
4. Services (multiple)
5. Assign Services to Providers
6. Success (org booking URL)
   - Creates: Organization, Providers (if added), Locations, Services, EventTypes

---

## 🎯 Key Features

### 1. Delegation System
- Providers can invite Assistants
- Organizations can have Front Desk staff
- Delegates can:
  - View calendar
  - Accept/reject bookings
  - Reschedule appointments
  - Manage availability (with permission)

### 2. Booking URLs

**Individual Provider:**
```
/schedule/in/dr-smith
→ Shows Dr. Smith's services
→ Books directly with Dr. Smith
```

**Organization:**
```
/schedule/in/mahlet-clinic
→ Shows clinic services
→ Customer can choose provider or "First Available"
→ System assigns based on policy
```

### 3. Provider Assignment Logic

```python
Priority:
1. Customer preference (if specified)
2. Round-robin (if policy = round_robin)
3. First available (if policy = availability_based)
```

### 4. Dashboard Views

**Organization Manager:**
- All providers' calendars
- Aggregate statistics
- Provider management
- Service management

**Provider:**
- Own calendar
- Organization bookings (if member)
- Delegation management
- Personal booking toggle

**Assistant/Front Desk:**
- Delegated provider's calendar
- Booking management
- Limited settings access

---

## 🔧 Technical Implementation

### New Doctypes Created

1. **Organization**
   - Path: `appointment/appointment/doctype/organization/`
   - Naming: By organization_name
   
2. **Organization Manager** (Child Table)
   - Path: `appointment/appointment/doctype/organization_manager/`
   - Parent: Organization
   
3. **Provider Delegation** (To be created)
   - Links provider to delegate
   - Defines permissions
   
4. **Provider** (To be updated)
   - Add organization link
   - Add delegation fields
   - Add personal booking settings

### API Endpoints

**Onboarding:**
- `appointment.onboarding.get_progress` (update for org/individual)
- `appointment.onboarding.save_profile` (branch by type)
- `appointment.onboarding.create_organization`
- `appointment.onboarding.add_provider_to_org`

**Booking:**
- `appointment.api.personal_meet.get_meeting_windows` (already updated)
- `appointment.api.personal_meet.get_time_slots` (already updated)
- Add: `appointment.api.organization_booking.*`

**Delegation:**
- `appointment.delegation.invite_delegate`
- `appointment.delegation.accept_invitation`
- `appointment.delegation.revoke_access`

---

## 🧪 Testing Checklist (To be created)

### Individual Provider Flow
- [ ] Complete onboarding as individual
- [ ] Booking URL works
- [ ] Calendar shows availability
- [ ] Can book appointment
- [ ] Invite assistant
- [ ] Assistant can manage calendar

### Organization Flow
- [ ] Complete onboarding as organization
- [ ] Add 2 providers
- [ ] Org booking URL works
- [ ] Customer can select provider
- [ ] "First available" works
- [ ] Round-robin assignment works
- [ ] Front desk can manage bookings

### Delegation
- [ ] Provider invites assistant
- [ ] Assistant receives notification
- [ ] Assistant accepts
- [ ] Assistant can view calendar
- [ ] Assistant can manage bookings
- [ ] Provider can revoke access

---

## 📊 Current Progress

**Overall**: 27% (4/15 tasks)

**Phase 1 (Data Model)**: 50% (2/4 tasks) ← Organization & Roles created, Provider update pending
**Phase 2 (Onboarding)**: 0% (0/3 tasks) ← Waiting for testing feedback
**Phase 3 (Booking)**: 33% (1/3 tasks) ← **CRITICAL FIX APPLIED**
**Phase 4 (Dashboard)**: 0% (0/4 tasks) ← Pending
**Phase 5 (Testing)**: 0% (0/1 task) ← Guide created, waiting for user testing

---

## 🔗 Related Documentation

- Original Planning: `docs/planning/provider_dashboard_specification.md`
- Implementation Summary: `docs/planning/IMPLEMENTATION_SUMMARY.md`
- Quick Reference: `docs/getting-started/QUICK_REFERENCE.md`
- PRD: `docs/planning/scheduling_platform_prd.md`

---

**Last Updated**: 2025-11-16 20:00 UTC

