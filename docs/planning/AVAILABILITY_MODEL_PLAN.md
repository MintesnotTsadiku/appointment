# Location → Service → Provider Availability Model

## Overview
Implement a three-tier availability system: Location (base) → Service (override) → Provider (highest priority). Availability is resolved in priority order: Provider availability takes precedence, then Service, then Location. The booking flow allows customers to book at Location level (round-robin assignment), Service level (round-robin to providers offering that service), or Provider level (specific provider booking).

## Current State
- **Location** has `opening_hours` (child table) - currently the only availability source
- **EventType** links Service + Provider + Location together
- Availability is only checked at Location level
- No support for service-specific or provider-specific availability
- No round-robin assignment logic

## Proposed Model

### 1. Data Model Changes

#### Three-Tier Availability Structure

- **Location.opening_hours** (existing, simplified) - Base availability for the location (lowest priority)
  - Simple opening/closing hours per day (one time range per day)
  - Example: Monday: 8:30 AM - 6:00 PM, Tuesday: 8:30 AM - 6:00 PM
  - Defines when the location is open
  - Used for Location-level bookings (round-robin to any provider)
  - Default: 8:30 AM - 6:00 PM for all weekdays (Monday-Friday), closed weekends
  - Structure: day_of_week, start_time, end_time, is_open (one row per day)

- **Service.opening_hours** (new) - Service-specific time ranges with breaks (middle priority)
  - Multiple time ranges per day to support breaks (e.g., lunch break)
  - Example: Monday: 9:00 AM - 12:00 PM, 1:00 PM - 5:00 PM (lunch break 12:00 PM - 1:00 PM)
  - More restrictive than Location (can only restrict, not expand)
  - Must be within Location hours
  - Used for Service-level bookings (round-robin to providers offering that service)
  - Default: Inherits Location hours (8:30 AM - 6:00 PM) - user notified they can customize
  - Structure: day_of_week, start_time, end_time, is_open (multiple rows per day allowed)

- **Provider.opening_hours** (new) - Provider-specific time ranges with breaks (highest priority)
  - Multiple time ranges per day to support breaks
  - Example: Monday: 9:30 AM - 12:00 PM, 2:00 PM - 4:00 PM (personal breaks)
  - Most restrictive (can only restrict, not expand)
  - Must be within Service hours (if Service hours exist) and Location hours
  - Used for Provider-level bookings (specific provider)
  - Default: Inherits Service/Location hours - user notified they can customize
  - Structure: day_of_week, start_time, end_time, is_open (multiple rows per day allowed)

#### Priority Resolution Logic

**Resolution Order (most specific → least specific):**
1. Provider.opening_hours (if defined for that provider)
2. Service.opening_hours (if defined for that service at that location)
3. Location.opening_hours (base/fallback)

**Key Rule:** Each level can only RESTRICT availability, not expand it. Provider hours must be within Service hours (if Service hours exist), and Service hours must be within Location hours.

### 2. Availability Resolution Logic

#### Core Resolution Function
Create `get_availability_for_booking(location_name, service_name=None, provider_name=None)`:
1. Start with Location.opening_hours (base)
2. If service_name provided: Intersect with Service.opening_hours (restrict)
3. If provider_name provided: Intersect with Provider.opening_hours (restrict further)
4. Return merged/intersected availability

#### Booking Flow Availability Display
Create `get_available_booking_options(location_name, service_name=None)`:
- **Level 1 - Location Booking**: Show Location.opening_hours (all available slots)
  - Customer can book any time location is open
  - System assigns to available provider via round-robin
  
- **Level 2 - Service Booking**: Show Service.opening_hours (if defined) OR Location.opening_hours
  - Customer books specific service
  - System assigns to provider offering that service via round-robin
  
- **Level 3 - Provider Booking**: Show Provider.opening_hours (if defined) OR Service.opening_hours OR Location.opening_hours
  - Customer books specific provider
  - Direct assignment to that provider

#### Intersection Logic
- When combining availability levels, use INTERSECTION (AND logic)
- Provider hours ∩ Service hours ∩ Location hours
- Handles multiple ranges per day (breaks are gaps between ranges)
- Example: Location (8:30-18:00) ∩ Service (9:00-12:00, 13:00-17:00) = (9:00-12:00, 13:00-17:00)

### 3. Implementation Steps

#### Step 1: Extend Doctypes
- **Location.opening_hours** (existing, keep as-is):
  - Structure: day_of_week, start_time, end_time, is_open
  - One range per day (simple opening/closing)
  - Add default values: 8:30 AM - 6:00 PM (Mon-Fri)

- Add `opening_hours` child table to **Service** doctype:
  - Same structure as Location.opening_hours (day_of_week, start_time, end_time, is_open)
  - Multiple rows per day allowed (for breaks support)
  - Optional: Can be empty (will use Location availability)
  - Default: Inherit Location hours when service created
  - Add field `use_default_hours` (Check, default: 1) to track if using defaults

- Add `opening_hours` child table to **Provider** doctype:
  - Same structure (day_of_week, start_time, end_time, is_open)
  - Multiple rows per day allowed (for breaks support)
  - Optional: Can be empty (will use Service/Location availability)
  - Default: Inherit Service/Location hours when provider created
  - Add field `use_default_hours` (Check, default: 1) to track if using defaults

- Add validation functions:
  - Validate Service ranges are within Location hours (check all ranges for each day)
  - Validate Provider ranges are within Service hours (if Service hours exist) and Location hours
  - Allow gaps between ranges (breaks are implicit)

#### Step 2: Create Availability Resolution Functions
- File: `appointment/scheduler/availability.py` (new)
- Function: `get_availability_for_booking(location_name, service_name=None, provider_name=None)`
  - Returns: Intersected availability (Provider ∩ Service ∩ Location)
  - Handles multiple time ranges per day (breaks are gaps between ranges)
  - Returns list of available time ranges per day

- Function: `get_available_booking_options(location_name, service_name=None)`
  - Returns: Dict with three levels
  - Handles multiple ranges per day

- Function: `intersect_time_ranges(location_ranges, service_ranges=None, provider_ranges=None)`
  - Utility to intersect multiple time range lists
  - Handles multiple ranges per day (for breaks)
  - Returns: List of intersected time ranges per day

- Function: `validate_availability_hierarchy(location_name, service_name=None, provider_name=None)`
  - Validates that all Provider ranges ⊆ Service ranges (if Service exists) ⊆ Location ranges
  - Checks each day separately
  - Allows gaps (breaks) - only validates that ranges don't extend beyond parent

- Function: `apply_default_hours(doctype, docname, parent_doctype=None, parent_docname=None)`
  - Applies default hours (8:30 AM - 6:00 PM) or inherits from parent
  - Sets `use_default_hours = 1`
  - Called when creating new Location/Service/Provider

#### Step 3: Update Booking Logic
- Update `get_time_slots_for_day()` to:
  - Accept booking_level parameter: "location", "service", or "provider"
  - Resolve availability based on level using new functions
  - For "location" level: Use Location.opening_hours, round-robin assign provider
  - For "service" level: Use Service.opening_hours, round-robin assign to providers offering that service
  - For "provider" level: Use Provider.opening_hours, direct assignment

- Update round-robin assignment logic:
  - When booking at location level: Select from all providers at that location
  - When booking at service level: Select from providers offering that service at that location
  - Track last assigned provider per service/location for fair distribution

- Update `check_availability()` to use intersection logic
- Ensure backward compatibility (existing bookings default to location-level)

#### Step 4: Update Frontend
- Update availability editor to show all three levels
- Show default hours with notification badges
- Update booking flow to show three booking options
- Add UI for multiple time ranges (breaks support)

#### Step 5: Migration
- Delete all demo data (Locations, Services, Providers, EventTypes, Appointments)
- Recreate demo data with new structure:
  - Locations with default hours (8:30 AM - 6:00 PM, Mon-Fri)
  - Services with default hours (inherited from Location, use_default_hours=1)
  - Providers with default hours (inherited from Service/Location, use_default_hours=1)
  - Show notifications in UI that defaults are being used

### 4. Configuration Strategy

**Default Behavior:**
- Location.opening_hours is always required (base)
- Service.opening_hours is optional (restricts Location)
- Provider.opening_hours is optional (restricts Service/Location)
- Resolution: Provider ∩ Service ∩ Location (intersection, not union)

**Default Values & User Notification:**
- Location: Default 8:30 AM - 6:00 PM (Monday-Friday), closed weekends
- Service: Default inherits Location hours (8:30 AM - 6:00 PM)
  - Show notification: "Using default hours. Click to customize and add breaks."
- Provider: Default inherits Service/Location hours
  - Show notification: "Using default hours. Click to customize your personal schedule."
- Users can change defaults at any time
- No errors for using defaults - only errors if custom hours violate hierarchy

**Validation Rules:**
- Service time ranges must be within Location hours (each range validated)
- Provider time ranges must be within Service hours (if Service hours exist) and Location hours
- If any Provider range extends beyond Service/Location hours → Error
- If any Service range extends beyond Location hours → Error
- Breaks are implicit (gaps between time ranges) - no explicit break field needed

### 5. Files to Modify

**Backend:**
- `appointment/scheduler/doctype/provider/provider.json` - Add opening_hours child table
- `appointment/scheduler/doctype/provider/provider.py` - Add validation for Provider ⊆ Service ⊆ Location
- `appointment/scheduler/doctype/service/service.json` - Add opening_hours child table
- `appointment/scheduler/doctype/service/service.py` - Add validation for Service ⊆ Location
- `appointment/scheduler/availability.py` (new) - Core availability resolution functions
- `appointment/api/personal_meet.py` - Update to use new resolution, add booking_level parameter
- `appointment/scheduler/appointment_group.py` - Update availability checks to use intersection
- `appointment/onboarding.py` - Update availability save functions to support all levels
- `appointment/demo_data.py` - Update to delete and recreate with new structure

**Frontend:**
- `frontend/src/pages/settings/availability.tsx` - Refactor to show all three levels with tabs
- `frontend/src/pages/settings/services.tsx` - Add availability editor section
- `frontend/src/pages/settings/profile.tsx` - Add provider availability section
- `frontend/src/pages/settings/location.tsx` - Keep location availability editor
- `frontend/src/components/availability-editor/` (new) - Reusable availability editor component
- `frontend/src/pages/booking-v2/` (or booking pages) - Update to show three booking levels
- `frontend/src/hooks/useAvailability.ts` (new) - Hook for availability resolution



