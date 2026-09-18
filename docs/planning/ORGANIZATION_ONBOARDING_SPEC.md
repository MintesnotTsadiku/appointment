# Organization Onboarding Specification

## Overview
This document specifies the organization onboarding flow, which allows organizations to set up their booking system with multiple providers.

---

## Onboarding Flow

### Step 0: Type Selection (Already exists)
- User selects "Organization" option
- API: `appointment.onboarding.set_onboarding_type("organization")`
- Creates minimal Organization + Provider record

### Step 1: Organization Profile
**UI Elements:**
- Organization Name (required)
- Organization Type (dropdown: clinic, salon, consultancy, etc.)
- Email (required)
- Phone (required)
- Timezone (dropdown, default: Africa/Addis_Ababa)
- Language (dropdown: English/Amharic)
- Description (optional, textarea)

**API Endpoint:**
```
POST appointment.onboarding.save_organization_profile
{
  "organization_name": "Mahlet Clinic",
  "organization_type": "Healthcare Clinic",
  "email": "contact@mahletclinic.et",
  "phone": "+251911234567",
  "timezone": "Africa/Addis_Ababa",
  "language": "en",
  "description": "Full-service healthcare clinic"
}
```

**Backend Logic:**
1. Get existing Organization for current user (owner_user)
2. Update Organization fields
3. Generate slug from organization_name
4. Set setup_complete = 0
5. Return success

**Data Created/Updated:**
- Organization record (update)

---

### Step 2: Add Providers
**UI Elements:**
- List of providers (initially empty)
- "Add Provider" button
- Provider form (modal/inline):
  - Provider Name (required)
  - Email (required)
  - Phone (optional)
  - Specialization (optional)
  - Option: "Invite existing user" vs "Create new"
- "Skip for now" option (can add later from dashboard)

**API Endpoint:**
```
POST appointment.onboarding.add_organization_provider
{
  "provider_name": "Dr. Sarah Johnson",
  "email": "sarah@mahletclinic.et",
  "phone": "+251911234568",
  "specialization": "General Practitioner",
  "invite_existing": true
}
```

**Backend Logic:**
1. Check if user exists with email
2. If exists and invite_existing:
   - Check if they have a Provider record
   - Link Provider to Organization
   - Send invitation notification
3. If not exists or !invite_existing:
   - Create Frappe User (if needed)
   - Create Provider record
   - Link to Organization
   - Set organization_status = "active"
4. Return provider list

**API Endpoint (Get Providers):**
```
GET appointment.onboarding.get_organization_providers
Response: [
  {
    "name": "PRV-001",
    "provider_name": "Dr. Sarah Johnson",
    "email": "sarah@mahletclinic.et",
    "specialization": "General Practitioner",
    "status": "active"
  }
]
```

**Data Created:**
- Provider records (with organization link)
- User records (if new)

---

### Step 3: Business Hours (Organization-wide availability)
**UI Elements:**
- Same weekly schedule grid as individual provider
- Quick templates: 9-5, 24/7, Custom
- Location Name (optional, default: "Main Location")
- Address (optional)

**API Endpoint:**
```
POST appointment.onboarding.save_organization_availability
{
  "location_name": "Mahlet Clinic - Main Branch",
  "address": "Bole Road, Addis Ababa",
  "weekly_schedule": {
    "monday": [{"start": "09:00", "end": "17:00"}],
    "tuesday": [{"start": "09:00", "end": "17:00"}],
    "wednesday": [{"start": "09:00", "end": "17:00"}],
    "thursday": [{"start": "09:00", "end": "17:00"}],
    "friday": [{"start": "09:00", "end": "17:00"}],
    "saturday": [],
    "sunday": []
  }
}
```

**Backend Logic:**
1. Get Organization
2. Create/update Location (link to Organization)
3. Create Opening Hours child records
4. Link all organization providers to this location
5. Return success

**Data Created:**
- Location record (linked to Organization)
- Opening Hours child records
- Provider Location links (M2M)

---

### Step 4: Services (Organization services)
**UI Elements:**
- Service Name (required): e.g., "General Consultation"
- Duration (dropdown): 15, 30, 45, 60, 90 minutes
- Price (optional, ETB)
- Description (optional)
- Provider Assignment:
  - "All providers" (default)
  - "Specific providers" (multi-select from Step 2 list)
  - "Customer chooses" (show provider selection to customer)
- "Add another service" button

**API Endpoint:**
```
POST appointment.onboarding.create_organization_service
{
  "service_name": "General Consultation",
  "duration": 30,
  "price": 500,
  "description": "Standard medical consultation",
  "provider_assignment": "round_robin",
  "providers": ["all"] // or ["PRV-001", "PRV-002"]
}
```

**Backend Logic:**
1. Get Organization and Location
2. Create Service record (linked to Organization)
3. Create EventType record (with slug = service_name)
4. For each provider (or all):
   - Create/update User Appointment Availability
   - Create Appointment Slot Duration
   - Populate Appointment Time Slot (from Location Opening Hours)
5. If provider_assignment = "round_robin":
   - Store assignment logic in Service metadata
6. Return booking URL

**Data Created:**
- Service record (linked to Organization)
- EventType record (slug for booking URL)
- User Appointment Availability (for each provider)
- Appointment Slot Duration (for each provider)
- Appointment Time Slot (for each provider, from Opening Hours)

---

### Step 5: Success & Booking URLs
**UI Elements:**
- Confetti animation
- Success message: "Your organization is ready!"
- Booking URL display:
  - Organization URL: `/schedule/org/{org_slug}`
  - Service URLs: `/schedule/org/{org_slug}/{service_slug}`
- Share options:
  - Copy link
  - WhatsApp
  - Telegram
  - QR Code
- "Go to Dashboard" button
- Preview booking page (optional)

**API Endpoint:**
```
GET appointment.onboarding.get_organization_booking_urls
Response: {
  "organization_url": "/schedule/org/mahlet-clinic",
  "services": [
    {
      "name": "General Consultation",
      "url": "/schedule/org/mahlet-clinic/general-consultation",
      "qr_code": "data:image/png;base64,..."
    }
  ]
}
```

**Backend Logic:**
1. Get Organization and Services
2. Mark Organization.setup_complete = 1
3. Mark Provider.onboarding_complete = 1
4. Generate QR codes for each service URL
5. Return URLs

**API Endpoint (Complete):**
```
POST appointment.onboarding.complete_organization_onboarding
```

---

## Data Model Summary

### Organization
```python
{
  "name": "ORG-001",
  "organization_name": "Mahlet Clinic",
  "organization_type": "Healthcare Clinic",
  "slug": "mahlet-clinic",
  "email": "contact@mahletclinic.et",
  "phone": "+251911234567",
  "timezone": "Africa/Addis_Ababa",
  "language": "en",
  "description": "Full-service healthcare clinic",
  "owner_user": "Administrator",
  "booking_policy": "round_robin",
  "allow_provider_selection": 1,
  "enable_public_booking": 1,
  "is_active": 1,
  "setup_complete": 1
}
```

### Provider (with Organization link)
```python
{
  "name": "PRV-001",
  "provider_name": "Dr. Sarah Johnson",
  "user": "sarah@mahletclinic.et",
  "organization": "ORG-001",
  "organization_status": "active",
  "specialization": "General Practitioner",
  "accept_org_bookings": 1,
  "enable_personal_booking": 0
}
```

### Service (Organization service)
```python
{
  "name": "SRV-001",
  "service_name": "General Consultation",
  "organization": "ORG-001",
  "duration": 30,
  "price": 500,
  "provider_assignment": "round_robin"
}
```

---

## API Contract Summary

| Step | Endpoint | Method | Purpose |
|------|----------|--------|---------|
| 1 | `save_organization_profile` | POST | Save org profile |
| 2 | `add_organization_provider` | POST | Add provider |
| 2 | `get_organization_providers` | GET | List providers |
| 3 | `save_organization_availability` | POST | Save business hours |
| 4 | `create_organization_service` | POST | Create service |
| 5 | `get_organization_booking_urls` | GET | Get URLs |
| 5 | `complete_organization_onboarding` | POST | Mark complete |

---

## Key Differences from Individual Onboarding

1. **Multiple Providers**: Step 2 allows adding multiple providers
2. **Organization-wide Location**: Step 3 creates location for entire org
3. **Provider Assignment**: Step 4 includes round-robin logic
4. **Multiple URLs**: Step 5 generates org URL + service URLs
5. **Delegation**: Organizations can have managers/front-desk

---

## Lessons Learned from Individual Implementation

### Must-haves to avoid errors:
1. ✅ Create User Appointment Availability during service creation
2. ✅ Set correct slug (from EventType name)
3. ✅ Create Appointment Slot Duration with correct parentfield
4. ✅ Populate Appointment Time Slot from Opening Hours
5. ✅ Convert timedelta to HH:MM:SS strings
6. ✅ Handle "builtin" meeting provider
7. ✅ Link all records correctly (Provider → Location → Service → EventType)
8. ✅ Set provider_name before insert
9. ✅ Check for existing records before creating (avoid duplicates)

---

**Created**: 2025-11-17  
**Status**: Specification complete, ready for implementation



