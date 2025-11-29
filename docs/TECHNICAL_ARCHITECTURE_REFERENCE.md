# Technical Architecture Reference
## Frappe Appointment System - Core Technical Details

This document provides comprehensive technical details extracted from the codebase to support expansion to Physical Resources (inventory) and Task-based services.

---

## 1. Core Doctype Schemas

### 1.1 Service Doctype

**File:** `frappe_appointment/scheduler/doctype/service/service.json`

**Key Fields:**
```json
{
  "service_name": "Data",           // Required, Unique per organization
  "description": "Small Text",      // Optional, max 500 chars
  "duration": "Int",                // Required, default: 30 (minutes)
  "price": "Currency",              // Optional, default: 0 (ETB)
  "buffer_before": "Int",           // Optional, default: 0 (minutes) - Minimum gap before appointment
  "buffer_after": "Int",            // Optional, default: 0 (minutes) - Minimum gap after appointment
  "is_active": "Check",             // Default: 1
  "organization": "Link",           // Link to Organization (optional, for organization-based bookings)
  "service_providers": "Table",     // Child table: Service Provider (multiple providers per service)
  "use_default_hours": "Check",     // Default: 1 - Use Location hours vs custom Service hours
  "opening_hours": "Table"          // Child table: Opening Hours (if use_default_hours = 0)
}
```

**Duration Logic:**
- Duration is stored in **minutes** (Int field)
- Default duration: **30 minutes**
- Used to calculate `end_time` when creating appointments
- Can be overridden at `Service Provider` level (`duration_override` field)
- Can be overridden at `EventType` level (`duration_override` field)

**Buffer Time:**
- `buffer_before`: Blocks slots X minutes **before** each appointment
- `buffer_after`: Blocks slots X minutes **after** each appointment
- Applied during slot filtering in `slot_engine.py::apply_buffer_times()`

**Provider Linkage:**
- Multiple providers per service via `service_providers` child table
- Child table (`Service Provider`) includes:
  - `provider`: Link to Provider
  - `status`: "Active" or "Inactive"
  - `is_primary`: Boolean flag
  - `price_override`: Provider-specific price
  - `duration_override`: Provider-specific duration override

**Availability:**
- Service-specific availability via `opening_hours` child table
- Hierarchy: Location → Service → Provider (Service can only restrict, not expand Location hours)
- Multiple time ranges per day allowed (for breaks like lunch)

---

### 1.2 Appointment Doctype

**File:** `frappe_appointment/scheduler/doctype/appointment/appointment.json`

**Key Fields:**
```json
{
  "appointment_id": "Data",         // Auto-generated, Unique, Read-only (format: APT-YYYYMMDDHHMMSS)
  "event": "Link",                  // Link to Booking Event (optional, for calendar sync)
  "event_type": "Link",             // Link to EventType (Required)
  "provider": "Link",               // Link to Provider (Required)
  "location": "Link",               // Link to Location (Required)
  "service": "Link",                // Link to Service (Required)
  "client_name": "Data",            // Required
  "client_email": "Data",           // Required (Email format)
  "client_phone": "Data",           // Required (Phone format)
  "appointment_date": "Date",       // Required (YYYY-MM-DD)
  "start_time": "Time",             // Required (HH:MM:SS)
  "end_time": "Time",               // Required (HH:MM:SS)
  "status": "Select",               // Required, default: "Pending"
                                    // Options: "Pending", "Confirmed", "Completed", "Cancelled", "No Show"
  "amount_paid": "Currency",        // Optional, default: 0 (ETB)
  "notes": "Small Text",            // Optional, max 500 chars
  "cancellation_reason": "Small Text" // Conditional (shown only when status == "Cancelled")
}
```

**Status Values:**
- `Pending`: Initial booking state
- `Confirmed`: Booked and confirmed
- `Completed`: Appointment finished
- `Cancelled`: Cancelled by client/provider
- `No Show`: Client didn't show up

**Timing:**
- `start_time` and `end_time` are separate **Time** fields (not DateTime)
- Combined with `appointment_date` to form full datetime
- End time is calculated from Service duration if not provided
- Conflict detection compares `appointment_date + start_time` vs `appointment_date + end_time`

**Links:**
- `event_type`: Links Service + Provider + Location combination
- `service`: Direct reference to Service (used for duration/price lookup)
- `provider`: Direct reference to Provider (used for conflict checking)
- `location`: Direct reference to Location (used for conflict checking)

---

### 1.3 Provider Doctype

**File:** `frappe_appointment/scheduler/doctype/provider/provider.json`

**Key Fields:**
```json
{
  "provider_name": "Data",          // Required, Unique
  "full_name": "Data",              // Optional
  "display_name": "Data",           // Optional (shown publicly)
  "email": "Data",                  // Email format
  "phone": "Data",                  // Phone format
  "user": "Link",                   // Link to User (for authentication)
  "user_appointment_availability": "Link", // Link to User Appointment Availability (one-to-one)
  "is_active": "Check",             // Default: 1
  "timezone": "Data",               // Default: "Africa/Addis_Ababa"
  "language": "Select",             // Options: "en", "am"
  "business_type": "Select",        // Options: "clinic", "salon", "university", "legal", "other"
  "calendar_preference": "Select",  // Options: "builtin", "google"
  
  // Booking Preferences
  "disable_past_slots_by": "Select",    // Options: "Start Time", "End Time" (default: "Start Time")
  "minimum_booking_notice": "Int",      // Minutes (default: 0)
  "show_booked_slots": "Check",         // Default: 1 - Show booked slots as disabled
  
  // Organization Settings
  "organizations": "Table",             // Child table: Provider Organization (multiple organizations)
  "enable_personal_booking": "Check",   // Default: 1 - Allow direct booking via personal URL
  
  // Delegation
  "delegations": "Table",               // Child table: Provider Delegation
  
  // Locations
  "locations": "Table",                 // Child table: Provider Location
  
  // Availability
  "use_default_hours": "Check",         // Default: 1 - Use Service/Location hours
  "opening_hours": "Table"              // Child table: Opening Hours (if use_default_hours = 0)
}
```

**Schedule/Availability:**
- Provider availability defined via `opening_hours` child table (same structure as Location/Service)
- Hierarchy: Location → Service → Provider (Provider is most specific, can only restrict)
- If `use_default_hours = 1`, inherits from Service → Location
- Multiple time ranges per day supported (for breaks)
- Availability resolution done in `availability.py::get_availability_for_booking()`

**Booking Configuration:**
- `disable_past_slots_by`: Controls when past slots become unavailable
  - "Start Time": Slot disabled once it starts
  - "End Time": Slot disabled only after it ends (more lenient)
- `minimum_booking_notice`: Minimum minutes before slot start to allow booking (e.g., 30 = can't book slots starting in next 30 minutes)
- `show_booked_slots`: Display booked slots as disabled (true) vs hide them (false)

---

### 1.4 Location Doctype

**File:** `frappe_appointment/scheduler/doctype/location/location.json`

**Key Fields:**
```json
{
  "location_name": "Data",          // Required, Unique
  "is_active": "Check",             // Default: 1
  "organization": "Link",           // Link to Organization (optional - if set, it's an Organization Branch)
  "address_line_1": "Data",
  "address_line_2": "Data",
  "city": "Data",                   // Default: "Addis Ababa"
  "phone": "Data",                  // Phone format
  "timezone": "Data",               // Default: "Africa/Addis_Ababa"
  "opening_hours": "Table",         // Child table: Opening Hours (base availability)
  "holidays": "Table"               // Child table: Location Holiday
}
```

**Availability (Opening Hours):**
- Base availability level in hierarchy: **Location → Service → Provider**
- Defined via `opening_hours` child table
- Child table structure:
  - `day_of_week`: Select (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday)
  - `start_time`: Time (HH:MM:SS)
  - `end_time`: Time (HH:MM:SS)
  - `is_open`: Check (default: 1)
- Multiple time ranges per day allowed (for breaks)
- Service and Provider hours must be within Location hours

---

### 1.5 Opening Hours (Child Table)

**File:** `frappe_appointment/scheduler/doctype/opening_hours/opening_hours.json`

**Fields:**
```json
{
  "day_of_week": "Select",          // Required
                                    // Options: "Monday", "Tuesday", "Wednesday", "Thursday", 
                                    //          "Friday", "Saturday", "Sunday"
  "start_time": "Time",             // Required (HH:MM:SS)
  "end_time": "Time",               // Required (HH:MM:SS)
  "is_open": "Check"                // Default: 1
}
```

**Usage:**
- Used by Location, Service, and Provider doctypes
- Allows multiple ranges per day (e.g., 09:00-12:00 and 14:00-18:00)
- Intersected at each level (most specific wins)

---

### 1.6 EventType Doctype

**File:** `frappe_appointment/scheduler/doctype/eventtype/eventtype.json`

**Purpose:** Links Service + Provider + Location combination (used for appointment routing)

**Key Fields:**
```json
{
  "event_type_name": "Data",        // Required
  "service": "Link",                // Link to Service (Required)
  "provider": "Link",               // Link to Provider (Required)
  "location": "Link",               // Link to Location (Required)
  "appointment_group": "Link",      // Optional - Link to Appointment Group (for calendar sync)
  "description": "Small Text",
  "price_override": "Currency",     // Optional - Override service price
  "duration_override": "Int",       // Optional - Override service duration (minutes)
  "is_active": "Check"              // Default: 1
}
```

**Duration Override Hierarchy:**
1. EventType `duration_override` (if set)
2. Service Provider `duration_override` (if set)
3. Service `duration` (default)

---

### 1.7 Configuration Settings

**File:** `frappe_appointment/scheduler/doctype/configuration_settings/configuration_settings.json`

**Type:** Single doctype (global settings)

**Fields:**
- Demo data generation settings
- Statistics display

**Note:** No global buffer or timezone settings found here. Timezone is stored at Location level. Buffers are at Service level.

---

### 1.8 Appointment Settings

**File:** `frappe_appointment/frappe_appointment/doctype/appointment_settings/appointment_settings.json`

**Type:** Single doctype (global settings)

**Fields:**
```json
{
  "default_personal_email_template": "Link",      // Email Template
  "default_group_email_template": "Link",         // Email Template
  "default_availability_alerts_email_template": "Link", // Email Template
  "personal_organisers_email_template": "Link",   // Email Template
  "enable_zoom": "Check",
  "zoom_account_id": "Data",
  "zoom_client_id": "Data",
  "zoom_client_secret": "Password",
  "zoom_access_token": "Password"
}
```

**Note:** Primarily for email templates and Zoom integration. No scheduling/buffer settings.

---

## 2. Current Business Logic (Python Controllers)

### 2.1 Availability Logic

**File:** `frappe_appointment/scheduler/availability.py`

**Function: `get_availability_for_booking()`**
```python
def get_availability_for_booking(
    location_name: str, 
    service_name: Optional[str] = None, 
    provider_name: Optional[str] = None
) -> List[Dict]:
    """
    Get intersected availability for a booking combination.
    
    Priority order (most specific → least specific):
    1. Provider.opening_hours (if defined)
    2. Service.opening_hours (if defined)
    3. Location.opening_hours (base/fallback)
    
    Each level can only RESTRICT availability, not expand it.
    
    Returns:
        List of opening hours dicts:
        [
            {
                "day_of_week": "Monday",
                "start_time": "09:00:00",
                "end_time": "17:00:00",
                "is_open": 1
            },
            ...
        ]
    """
```

**How it works:**
1. Starts with Location `opening_hours` (base)
2. If Service has custom hours (`use_default_hours = 0`), intersects with Service hours
3. If Provider has custom hours (`use_default_hours = 0`), intersects with Provider hours
4. Returns final intersected time ranges

**Slot Generation:**
- Slot generation happens in `frappe_appointment/api/personal_meet.py::_get_time_slots_for_day()`
- Uses `Appointment Group` and `User Appointment Availability` for legacy calendar-based bookings
- For new scheduler-based bookings, slots are generated from:
  1. Opening hours (from `get_availability_for_booking()`)
  2. Service duration (defines slot length)
  3. Existing appointments (filtered out)
  4. Buffer times (applied via `slot_engine.py::apply_buffer_times()`)

---

### 2.2 Conflict Detection

**File:** `frappe_appointment/scheduler/helpers/slot_engine.py`

**Function: `check_conflicts()`**
```python
def check_conflicts(
    provider_name: str,
    location_name: str,
    start_time: datetime,
    end_time: datetime,
    exclude_appointment: Optional[str] = None
) -> List[Dict]:
    """
    Check for conflicting appointments.
    
    Args:
        provider_name: Provider name
        location_name: Location name
        start_time: Proposed start time (datetime)
        end_time: Proposed end time (datetime)
        exclude_appointment: Appointment name to exclude (for rescheduling)
    
    Returns:
        List of conflicting appointments:
        [
            {
                "appointment_name": "APT-00001",
                "appointment_id": "APT-20250120140000",
                "start_time": "2025-01-20 14:00:00",
                "end_time": "2025-01-20 15:00:00",
                "client_name": "John Doe",
                "status": "Pending"
            },
            ...
        ]
    """
```

**Validation Logic:**
1. Checks `Appointment` doctype for appointments with:
   - Same `provider` and `location`
   - Status in `["Pending", "Confirmed"]`
   - Overlapping time ranges (uses `_times_overlap()` helper)
2. Checks `Booking Event` doctype (for calendar-based bookings):
   - Linked to provider's User Appointment Availability
   - Status in `["Open", "Confirmed"]`
   - Overlapping time ranges

**Overlap Detection:**
- Uses `_times_overlap(start1, end1, start2, end2)` helper
- Logic: `start1 < end2 AND start2 < end1` (true = overlap)

**When Conflicts Are Checked:**
- Before creating new appointment (`desk.py::create_desk_appointment()`)
- Before updating appointment time/date (`desk.py::update_appointment()`)
- Before rescheduling (`desk.py::reschedule_appointment()`)
- Before frontend booking (`personal_meet.py::book_time_slot()`)

---

### 2.3 Buffer Time Enforcement

**File:** `frappe_appointment/scheduler/helpers/slot_engine.py`

**Function: `apply_buffer_times()`**
```python
def apply_buffer_times(
    slots: List[Dict],
    buffer_before: int,
    buffer_after: int,
    existing_appointments: List[Dict]
) -> List[Dict]:
    """
    Apply buffer times to slots, removing slots that violate buffer rules.
    
    Args:
        slots: List of available slots
        buffer_before: Minutes to block before each appointment
        buffer_after: Minutes to block after each appointment
        existing_appointments: List of existing appointments
    
    Returns:
        Filtered list of slots with buffers applied
    """
```

**How it works:**
1. For each slot, checks against all existing appointments
2. If `buffer_before > 0`:
   - Blocks slots that end within `buffer_before` minutes before an appointment starts
3. If `buffer_after > 0`:
   - Blocks slots that start within `buffer_after` minutes after an appointment ends
4. Returns only slots that don't violate buffer rules

**Example:**
- Appointment: 14:00-15:00
- `buffer_before = 15`, `buffer_after = 15`
- Blocked slots: 13:45-14:00 (before) and 15:00-15:15 (after)

---

### 2.4 Booking Creation API

**File:** `frappe_appointment/scheduler/api/desk.py`

**Endpoint: `create_desk_appointment()`**
```python
@frappe.whitelist()
@add_response_code
def create_desk_appointment(
    client_name: str,
    client_phone: str,
    client_email: str,
    service_name: str,
    provider_name: str,
    location_name: str,
    appointment_date: str,      # Format: "YYYY-MM-DD"
    start_time: str,            # Format: "HH:MM:SS" or "YYYY-MM-DD HH:MM:SS"
    end_time: str = None,       # Optional - calculated from service duration if not provided
    notes: str = None
):
    """
    Create a new appointment from front-desk console.
    
    Steps:
    1. Validates required fields
    2. Calculates end_time from Service duration if not provided
    3. Checks for conflicts using check_conflicts()
    4. Finds EventType for Service + Provider + Location
    5. Creates Appointment document
    6. Generates appointment_id (format: APT-YYYYMMDDHHMMSS)
    """
```

**File:** `frappe_appointment/api/personal_meet.py`

**Endpoint: `book_time_slot()`**
```python
@frappe.whitelist(allow_guest=True, methods=["POST"])
@add_response_code
def book_time_slot(
    duration_id: str,
    date: str,                  # Format: "YYYY-MM-DD"
    start_time: str,            # ISO datetime string or time string
    end_time: str,              # ISO datetime string or time string
    user_timezone_offset: str,
    user_name: str,
    user_email: str,
    user_phone: str = None,
    other_participants: str = None,
    provider_id: str = None,    # For multi-provider bookings
    organization_id: str = None,
    service_id: str = None,
    time_format: str = "12h",
    **args
):
    """
    Create appointment from frontend booking flow.
    
    Steps:
    1. Validates date is not in the past
    2. Checks for conflicts before creating
    3. Creates Appointment document (or Booking Event for legacy)
    4. Returns booking confirmation
    """
```

---

## 3. API & Frontend Interface

### 3.1 GET Requests - Available Slots

**Endpoint:** `frappe_appointment.api.personal_meet.get_time_slots`

**Request Parameters:**
```typescript
{
  duration_id: string,              // Appointment Slot Duration ID
  date?: string,                    // "YYYY-MM-DD" (single date) or
  start_date?: string,              // "YYYY-MM-DD" (date range start)
  end_date?: string,                // "YYYY-MM-DD" (date range end)
  user_timezone_offset: string,     // Timezone offset (e.g., "-300" for EST)
  organization_id?: string,         // Optional - for organization bookings
  service_id?: string               // Optional - for service-specific bookings
}
```

**Response Structure:**
```typescript
{
  all_available_slots_for_data: Array<{
    start_time: string,             // ISO datetime string (e.g., "2025-01-20T14:00:00+03:00")
    end_time: string,               // ISO datetime string
    provider_id?: string,           // Optional - for multi-provider bookings
    provider_name?: string,         // Optional - provider display name
    booked?: boolean,               // true if slot is already booked
    available?: boolean             // true if slot is available
  }>;
  available_days: string[];         // Array of day names (e.g., ["Monday", "Tuesday"])
  valid_start_date: string;         // ISO date string - earliest bookable date
  valid_end_date?: string;          // ISO date string - latest bookable date (optional)
  duration: string;                 // Duration in seconds (as string)
  is_invalid_date: boolean;         // true if requested date is invalid
  next_valid_date?: string;         // ISO date string - next valid date if invalid
  total_slots_for_day: number;      // Total slots for requested day
  available_slots_count?: number;   // Count of available (non-booked) slots
  booked_slots_count?: number;      // Count of booked slots
  is_organization?: boolean;        // true if organization booking
  provider_count?: number;          // Number of providers available
  booking_config?: {
    disable_past_slots_by: string;  // "Start Time" or "End Time"
    minimum_booking_notice: number; // Minutes
    show_booked_slots: boolean;     // Show booked slots as disabled
  };
  debug_messages?: string[];        // Debug messages (only in developer mode)
  user?: string;                    // User Appointment Availability name
  label?: string;                   // Duration label
  rescheduling_allowed?: boolean;   // Whether rescheduling is allowed
}
```

**Example Response:**
```json
{
  "all_available_slots_for_data": [
    {
      "start_time": "2025-01-20T09:00:00+03:00",
      "end_time": "2025-01-20T09:30:00+03:00",
      "provider_id": "PROV-001",
      "provider_name": "Dr. John Doe",
      "booked": false,
      "available": true
    },
    {
      "start_time": "2025-01-20T09:30:00+03:00",
      "end_time": "2025-01-20T10:00:00+03:00",
      "provider_id": "PROV-001",
      "provider_name": "Dr. John Doe",
      "booked": true,
      "available": false
    }
  ],
  "available_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  "valid_start_date": "2025-01-20T00:00:00+03:00",
  "duration": "1800",
  "is_invalid_date": false,
  "total_slots_for_day": 16,
  "available_slots_count": 14,
  "booked_slots_count": 2,
  "is_organization": false,
  "provider_count": 1,
  "booking_config": {
    "disable_past_slots_by": "Start Time",
    "minimum_booking_notice": 30,
    "show_booked_slots": true
  }
}
```

---

### 3.2 POST Payload - Create Appointment

**Endpoint (Frontend Booking):** `frappe_appointment.api.personal_meet.book_time_slot`

**Request Payload:**
```typescript
{
  duration_id: string,              // Appointment Slot Duration ID
  date: string,                     // "YYYY-M-D" format (e.g., "2025-1-20")
  user_timezone_offset: string,     // Timezone offset (e.g., "-300")
  start_time: string,               // ISO datetime string or time string
  end_time: string,                 // ISO datetime string or time string
  user_name: string,                // Client name
  user_email: string,               // Client email
  user_phone?: string,              // Optional - client phone
  other_participants?: string,      // Optional - comma-separated emails
  notes?: string,                   // Optional - booking notes
  time_format?: string,             // "12h" or "24h" (default: "12h")
  provider_id?: string,             // Optional - for multi-provider bookings
  organization_id?: string,         // Optional - for organization bookings
  service_id?: string,              // Optional - for service-specific bookings
  reschedule?: boolean,             // Optional - true if rescheduling
  event_token?: string              // Optional - for rescheduling existing event
}
```

**Endpoint (Front-Desk Console):** `frappe_appointment.scheduler.api.desk.create_desk_appointment`

**Request Payload:**
```typescript
{
  client_name: string,              // Required
  client_phone: string,             // Required
  client_email: string,             // Required
  service_name: string,             // Required - Service name (not ID)
  provider_name: string,            // Required - Provider name (not ID)
  location_name: string,            // Required - Location name (not ID)
  appointment_date: string,         // Required - "YYYY-MM-DD"
  start_time: string,               // Required - "HH:MM:SS" or "YYYY-MM-DD HH:MM:SS"
  end_time?: string,                // Optional - "HH:MM:SS" (calculated from service if not provided)
  notes?: string                    // Optional
}
```

**Example Frontend Booking Request:**
```json
{
  "duration_id": "DUR-001",
  "date": "2025-1-20",
  "user_timezone_offset": "-300",
  "start_time": "2025-01-20T09:00:00+03:00",
  "end_time": "2025-01-20T09:30:00+03:00",
  "user_name": "Jane Doe",
  "user_email": "jane@example.com",
  "user_phone": "+1234567890",
  "other_participants": "guest1@example.com, guest2@example.com",
  "notes": "First-time consultation",
  "time_format": "12h",
  "provider_id": "PROV-001",
  "organization_id": "ORG-001",
  "service_id": "SRV-001"
}
```

**Example Front-Desk Booking Request:**
```json
{
  "client_name": "Jane Doe",
  "client_phone": "+1234567890",
  "client_email": "jane@example.com",
  "service_name": "General Consultation",
  "provider_name": "PROV-001",
  "location_name": "Main Clinic",
  "appointment_date": "2025-01-20",
  "start_time": "09:00:00",
  "end_time": "09:30:00",
  "notes": "Walk-in appointment"
}
```

**Success Response:**
```json
{
  "success": true,
  "appointment": {
    "name": "APT-00001",
    "appointment_id": "APT-20250120090000",
    "appointment_date": "2025-01-20",
    "start_time": "09:00:00",
    "end_time": "09:30:00",
    "client_name": "Jane Doe",
    "client_email": "jane@example.com",
    "client_phone": "+1234567890",
    "service": "SRV-001",
    "provider": "PROV-001",
    "location": "LOC-001",
    "status": "Confirmed",
    "event_type": "EVT-001"
  },
  "message": "Appointment created successfully"
}
```

**Error Response (Conflict):**
```json
{
  "error": "Time slot conflicts with existing appointment",
  "conflicts": [
    {
      "appointment_name": "APT-00002",
      "appointment_id": "APT-20250120084500",
      "start_time": "2025-01-20 08:45:00",
      "end_time": "2025-01-20 09:15:00",
      "client_name": "John Smith",
      "status": "Confirmed"
    }
  ]
}
```

---

## 4. Duration & Quantity Logic

### 4.1 Duration

**Current Implementation:**
- Duration is stored as **minutes** (Int field)
- Applied at multiple levels:
  1. **Service**: `duration` field (default: 30 minutes)
  2. **Service Provider**: `duration_override` field (overrides Service)
  3. **EventType**: `duration_override` field (overrides Service Provider)
  
**Usage:**
- Calculates `end_time` when creating appointments: `end_time = start_time + duration`
- Defines slot length when generating available slots
- Used in conflict detection (overlapping ranges)

**Example:**
- Service duration: 30 minutes
- Service Provider override: 45 minutes
- EventType override: 60 minutes
- **Final duration**: 60 minutes (EventType wins)

### 4.2 Quantity

**Current Status:** ❌ **NOT IMPLEMENTED**

- No quantity field exists in Service doctype
- No quantity field exists in Appointment doctype
- Slots are generated as single-unit bookings
- Conflict detection assumes one appointment per slot

**For Physical Resources/Tasks:**
- Would need to add `quantity` or `capacity` field to Service
- Would need to track available quantity per time slot
- Would need to modify conflict detection to check capacity, not just overlap

---

## 5. Key Code Locations

### 5.1 Doctype Definitions
- Service: `frappe_appointment/scheduler/doctype/service/`
- Appointment: `frappe_appointment/scheduler/doctype/appointment/`
- Provider: `frappe_appointment/scheduler/doctype/provider/`
- Location: `frappe_appointment/scheduler/doctype/location/`
- EventType: `frappe_appointment/scheduler/doctype/eventtype/`
- Opening Hours: `frappe_appointment/scheduler/doctype/opening_hours/`

### 5.2 Business Logic
- Availability: `frappe_appointment/scheduler/availability.py`
- Slot Engine (conflicts, buffers): `frappe_appointment/scheduler/helpers/slot_engine.py`
- API Endpoints: `frappe_appointment/scheduler/api/desk.py` (front-desk), `frappe_appointment/api/personal_meet.py` (frontend)
- Booking Logic: `frappe_appointment/api/personal_meet.py::book_time_slot()`

### 5.3 Frontend
- Slot Fetching: `frontend/src/pages/booking-v2/hooks/useTimeSlots.ts`
- Booking Submission: `frontend/src/pages/booking-v2/hooks/useBookingSubmit.ts`
- Types: `frontend/src/pages/booking-v2/types.ts`

---

## 6. Architecture Notes for Expansion

### 6.1 Physical Resources (Inventory)

**Requirements:**
1. Add `resource_type` field to Service (e.g., "appointment", "resource", "task")
2. Add `capacity` or `quantity` field to Service (for resources with limited quantity)
3. Add `Resource` doctype to track physical items (e.g., equipment, rooms)
4. Add `Resource Booking` doctype to track resource allocations per time slot
5. Modify conflict detection to check resource availability, not just time overlap
6. Add `quantity` field to Appointment (for multi-unit bookings)

**Current Limitations:**
- No quantity/capacity tracking
- Conflict detection only checks time overlap
- No resource-specific availability (only time-based)

### 6.2 Task-based Services

**Requirements:**
1. Add task status tracking to Appointment (e.g., "assigned", "in_progress", "completed")
2. Add `task_duration` vs `appointment_duration` distinction (task may span multiple appointments)
3. Add task dependencies/linking
4. Modify slot generation to consider task duration (may need longer slots)

**Current Support:**
- Appointment status already supports "Pending", "Confirmed", "Completed"
- Duration is flexible (can be overridden at multiple levels)
- Could extend status field for task states

---

**Document Generated:** 2025-01-20  
**Codebase Version:** As of latest commit  
**Last Updated:** Extracted from current codebase structure


