# Organization Onboarding - Backend APIs Complete

## Status: Backend APIs ✅ Complete

**Date Completed**: 2025-11-17  
**Location**: `/appointment/onboarding.py` (lines 652-1178)

---

## ✅ Completed Backend APIs

### 7 New APIs Added:

1. **`save_organization_profile`** (Step 1)
   - Creates/updates Organization record
   - Generates slug from organization name
   - Bumps Provider.onboarding_current_step to 2

2. **`add_organization_provider`** (Step 2)
   - Adds provider to organization
   - Handles existing users vs new users
   - Creates Frappe User if needed
   - Links Provider to Organization
   - Bumps onboarding_current_step to 3

3. **`get_organization_providers`** (Step 2)
   - Returns list of providers for organization
   - Used to display providers in Step 2 UI

4. **`save_organization_availability`** (Step 3)
   - Creates Location for organization
   - Creates Opening Hours from weekly schedule
   - Links all organization providers to Location
   - Bumps onboarding_current_step to 4

5. **`create_organization_service`** (Step 4)
   - Creates Service for organization
   - Creates EventType with slug
   - For each provider:
     - Creates User Appointment Availability
     - Creates Appointment Slot Duration
     - Populates Appointment Time Slot (from Opening Hours)
   - Bumps onboarding_current_step to 5

6. **`get_organization_booking_urls`** (Step 5)
   - Returns organization booking URL
   - Returns service booking URLs
   - Format: `/schedule/org/{org_slug}` and `/schedule/org/{org_slug}/{service_slug}`

7. **`complete_organization_onboarding`** (Step 5)
   - Marks Organization.setup_complete = 1
   - Marks Provider.onboarding_complete = 1
   - Sets onboarding_completed_at timestamp

---

## Key Implementation Details

### Lessons Applied from Individual Provider Implementation

✅ **Avoided common errors:**
1. Create User Appointment Availability during service creation
2. Set correct slug (from EventType name)
3. Create Appointment Slot Duration with correct parentfield ("available_durations")
4. Populate Appointment Time Slot from Opening Hours
5. Convert timedelta to HH:MM:SS strings using `time_to_str()`
6. Handle "builtin" meeting provider
7. Link all records correctly (Provider → Location → Service → EventType)
8. Check for existing records before creating (avoid duplicates)

### Data Flow

```
Organization onboarding creates:
1. Organization (owner_user = current user)
2. Providers (linked to Organization)
3. Location (organization-wide)
4. Opening Hours (child of Location)
5. Service (linked to Organization)
6. EventType (for booking URL)
7. User Appointment Availability (for each provider)
8. Appointment Slot Duration (child of Availability)
9. Appointment Time Slot (child of Availability, from Opening Hours)
```

### Provider Assignment Strategy

- Default: "round_robin" (to be implemented in booking logic)
- Stored in Service.provider_assignment field
- Each provider gets their own User Appointment Availability
- All providers share the same Location/Opening Hours

---

## 🔄 Next Steps

### Frontend Components Needed

1. **Organization Profile Form** (Step 1)
   - Organization name, type, email, phone, timezone, language
   - Similar to individual profile but org-focused

2. **Add Providers Form** (Step 2)
   - List of providers
   - "Add Provider" button → modal/form
   - Provider name, email, phone, specialization
   - "Invite existing" vs "Create new" toggle
   - "Skip for now" option

3. **Organization Availability Grid** (Step 3)
   - Reuse existing weekly schedule grid component
   - Add location name and address fields
   - Quick templates (9-5, 24/7, Custom)

4. **Organization Service Form** (Step 4)
   - Service name, duration, price, description
   - Provider assignment dropdown:
     - "All providers" (default)
     - "Specific providers" (multi-select)
     - "Customer chooses"
   - "Add another service" button

5. **Organization Success Screen** (Step 5)
   - Display organization URL
   - Display list of service URLs
   - Share options (copy, WhatsApp, Telegram, QR)
   - "Go to Dashboard" button

### Frontend Integration Points

Update `OnboardingWizard.tsx` to:
1. Check `onboarding_type` from `get_progress()`
2. If "organization", render organization steps
3. If "individual", render individual steps (current)

Organization Step Components:
- `Step1OrgProfile.tsx`
- `Step2OrgProviders.tsx`
- `Step3OrgAvailability.tsx`
- `Step4OrgService.tsx`
- `Step5OrgSuccess.tsx`

---

## Testing Plan

### Backend Testing (Console)

```python
# Test Step 1: Save Profile
frappe.call("appointment.onboarding.save_organization_profile", {
    "organization_name": "Test Clinic",
    "organization_type": "Healthcare",
    "email": "test@clinic.et",
    "phone": "+251911111111",
    "timezone": "Africa/Addis_Ababa",
    "language": "en",
    "description": "Test clinic"
})

# Test Step 2: Add Provider
frappe.call("appointment.onboarding.add_organization_provider", {
    "provider_name": "Dr. Test",
    "email": "dr.test@clinic.et",
    "phone": "+251922222222",
    "specialization": "GP",
    "invite_existing": False
})

# Test Step 2: Get Providers
frappe.call("appointment.onboarding.get_organization_providers")

# Test Step 3: Save Availability
frappe.call("appointment.onboarding.save_organization_availability", {
    "location_name": "Test Clinic - Main",
    "address": "Bole, Addis Ababa",
    "weekly_schedule": {
        "monday": [{"start": "09:00", "end": "17:00"}],
        "tuesday": [{"start": "09:00", "end": "17:00"}],
        "wednesday": [{"start": "09:00", "end": "17:00"}],
        "thursday": [{"start": "09:00", "end": "17:00"}],
        "friday": [{"start": "09:00", "end": "17:00"}]
    }
})

# Test Step 4: Create Service
frappe.call("appointment.onboarding.create_organization_service", {
    "service_name": "General Consultation",
    "duration": 30,
    "price": 500,
    "description": "Standard consultation",
    "provider_assignment": "round_robin",
    "providers": ["all"]
})

# Test Step 5: Get URLs
frappe.call("appointment.onboarding.get_organization_booking_urls")

# Test Step 5: Complete
frappe.call("appointment.onboarding.complete_organization_onboarding")
```

### Frontend Testing (Once Implemented)

1. Clear cache and start fresh onboarding
2. Select "Organization" on type selection
3. Complete Step 1: Organization profile
4. Complete Step 2: Add 2-3 providers
5. Complete Step 3: Set business hours
6. Complete Step 4: Create 2 services
7. Complete Step 5: View booking URLs
8. Test booking URLs (should show slots)

---

## Multi-Provider Booking Logic (Next Phase)

### Round-Robin Implementation Plan

Location: `appointment/api/personal_meet.py`

**Modify `get_time_slots()` for organization URLs:**
1. Detect organization booking URL pattern
2. Get all providers for that service
3. For each time slot, rotate through providers
4. Check availability for each provider
5. Assign booking to next available provider

**Provider Selection Logic:**
1. Customer preference (if they choose specific provider)
2. Round-robin among available providers
3. Conflict detection:
   - Check each provider's existing appointments
   - Check each provider's Google Calendar (if synced)
   - Only show slot if at least one provider is available

**API Changes Needed:**
- `get_meeting_windows()` - handle org URLs
- `get_time_slots()` - round-robin logic
- `book_time_slot()` - assign to specific provider

---

## Files Modified

- ✅ `/appointment/onboarding.py` - Added 7 new APIs (527 lines added)

---

## Files to Create (Frontend)

- `frontend/src/pages/home/components/Step1OrgProfile.tsx`
- `frontend/src/pages/home/components/Step2OrgProviders.tsx`
- `frontend/src/pages/home/components/Step3OrgAvailability.tsx`
- `frontend/src/pages/home/components/Step4OrgService.tsx`
- `frontend/src/pages/home/components/Step5OrgSuccess.tsx`

---

## Estimated Effort

- Frontend Components: 4-6 hours
- Organization Booking URLs: 2-3 hours  
- Round-Robin Logic: 3-4 hours
- Testing & Fixes: 2-3 hours

**Total**: 11-16 hours

---

**Status**: Backend APIs complete ✅  
**Next**: Frontend components OR Multi-provider booking logic  
**Priority**: Frontend components first to enable end-to-end testing



