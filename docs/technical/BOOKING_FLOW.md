# Booking Flow Documentation

## Overview

This document describes the complete booking flow from provider onboarding through customer booking and rescheduling. The system supports both individual providers and organizations with multiple providers.

---

## Flow Diagram

```
Provider Onboarding
    ↓
Create Provider, Location, Service, EventType
    ↓
Generate Booking URL
    ↓
Customer Visits Booking URL
    ↓
Select Duration (if multiple)
    ↓
Select Date & Time Slot
    ↓
Enter Contact Information
    ↓
Book Appointment
    ↓
Reschedule (if needed)
```

---

## 1. Provider Onboarding

### Step 0: Onboarding Type Selection
- **Route**: `/home`
- **Component**: `OnboardingTypeSelection`
- **Options**: 
  - Individual Provider
  - Organization

### Step 1: Profile Setup
- **API**: `appointment.onboarding.save_profile`
- **Creates**: `Provider` doctype
- **Fields**: 
  - Business name / Full name
  - Display name (optional, for public display)
  - Business type
  - Timezone
  - Language preference

### Step 2: Calendar Connection
- **API**: `appointment.onboarding.connect_calendar`
- **Options**:
  - Built-in calendar (no external integration)
  - Google Calendar (requires OAuth)

### Step 3: Availability Setup
- **API**: `appointment.onboarding.save_availability`
- **Creates**: 
  - `Location` doctype
  - `Opening Hours` child records
- **Features**:
  - Visual weekly schedule grid
  - Quick templates (9-5, Custom, etc.)
  - Per-day availability windows

### Step 4: Service Creation
- **API**: `appointment.onboarding.create_service`
- **Creates**:
  - `Service` doctype
  - `EventType` doctype
  - `User Appointment Availability` doctype
  - `Appointment Slot Duration` doctype
  - `Appointment Time Slot` child records (based on Opening Hours)
- **Key Fields**:
  - Service name
  - Duration (minutes)
  - Description
  - Price (optional)

### Step 5: Success & Booking URL
- **API**: `appointment.onboarding.get_booking_url`
- **Returns**: Booking URL in format: `/schedule/in/{EventType.name}`
- **Displays**: Confetti animation, shareable link

---

## 2. Booking URL Structure

### URL Format
```
/schedule/in/{slug}
```

Where `slug` can be:
- `User Appointment Availability.slug` (for direct availability links)
- `EventType.name` (for service-based booking, fallback)

### Example URLs
- `/schedule/in/General Consultation`
- `/schedule/in/Special Consultation`
- `/schedule/in/administrator` (direct availability slug)

---

## 3. Customer Booking Flow

### 3.1 Initial Page Load
- **Route**: `/schedule/in/:meetId`
- **Component**: `AppointmentPage`
- **API Call**: `appointment.api.personal_meet.get_meeting_windows`
- **Returns**:
  - Provider name
  - Available durations
  - Meeting provider type

### 3.2 Duration Selection (if multiple)
- **Component**: `MeetingCard`
- **Shows**: List of available durations
- **Action**: Clicking a duration updates URL with `?type={duration_id}`

### 3.3 Date & Time Selection
- **Component**: `Booking`
- **API Call**: `appointment.api.personal_meet.get_time_slots`
- **Parameters**:
  - `duration_id`: Selected duration ID
  - `date`: Selected date (YYYY-MM-DD)
  - `user_timezone_offset`: Client timezone offset (minutes)
- **Returns**:
  - Available time slots for the day
  - Available days of week
  - Valid date range
  - Total slots count

### 3.4 Contact Information
- **Component**: Contact form (within `Booking`)
- **Fields**:
  - Full Name (required)
  - Email (required)
  - Guests (optional, can add multiple)

### 3.5 Booking Confirmation
- **API Call**: `appointment.api.personal_meet.book_time_slot`
- **Parameters**:
  - `duration_id`
  - `date`
  - `time_slot`
  - `full_name`
  - `email`
  - `guests` (optional array)
- **Creates**:
  - `Event` doctype (Frappe calendar event)
  - `Appointment` doctype (if extended)
- **Returns**: Success response with appointment details

---

## 4. Time Slot Generation Logic

### 4.1 Data Flow
```
User Appointment Availability
    ↓
Appointment Slot Duration (child)
    ↓
Appointment Time Slot (child, based on Opening Hours)
    ↓
Appointment Group (dummy, created on-the-fly)
    ↓
Time Slot Generation Engine
    ↓
Available Slots (filtered by conflicts, buffer times, etc.)
```

### 4.2 Key Functions

#### `get_time_slots()` (API)
- Entry point for time slot requests
- Validates input parameters
- Creates dummy `Appointment Group` from `User Appointment Availability`
- Calls `_get_time_slots_for_day()`

#### `_get_time_slots_for_day()`
- Handles timezone conversions
- Filters past time slots
- Returns slots for today/tomorrow/yesterday based on timezone

#### `_get_time_slots_for_given_date()`
- Core slot generation logic
- Validates date (within availability window, not weekend/holiday)
- Checks booking frequency limits
- Processes provider availability windows
- Generates slots based on:
  - Opening hours (`Appointment Time Slot`)
  - Duration (`Appointment Slot Duration`)
  - Buffer times
  - Existing bookings (conflicts)
  - Google Calendar conflicts (if enabled)

### 4.3 Slot Filtering Rules
1. **Date Validation**:
   - Must be within `valid_start_date` and `valid_end_date`
   - Must be on an available weekday
   - Must not be a holiday or leave day

2. **Booking Frequency**:
   - Respects `limit_booking_frequency` (if set)
   - Prevents over-booking within time window

3. **Time Window**:
   - Based on `Appointment Time Slot` records (from Opening Hours)
   - Intersection of all mandatory members' availability

4. **Conflicts**:
   - Existing `Event` records (bookings)
   - Google Calendar events (if synced)
   - Buffer times before/after appointments

5. **Past Slots**:
   - Automatically filtered out
   - Based on current time in user's timezone

---

## 5. Rescheduling Flow

### 5.1 Reschedule Request
- **Component**: Reschedule button (shown if `rescheduling_allowed=true`)
- **API Call**: `appointment.api.personal_meet.reschedule_appointment`
- **Parameters**:
  - `appointment_id`: Existing appointment ID
  - `new_date`: New date
  - `new_time_slot`: New time slot

### 5.2 Validation
- Checks if rescheduling is allowed (`allow_rescheduling` flag)
- Validates new date/time is available
- Checks notice period requirements
- Applies cancellation policies (if any)

### 5.3 Update
- Updates `Event` doctype
- Updates Google Calendar (if synced)
- Sends notifications (if configured)

---

## 6. Meeting Provider Types

### 6.1 Built-in
- **Type**: `"builtin"`
- **Features**:
  - No external calendar integration
  - Virtual meeting (no link generation)
  - Simple event creation in Frappe

### 6.2 Google Calendar
- **Type**: `"google"`
- **Features**:
  - Bi-directional sync
  - Conflict detection from Google Calendar
  - Automatic event creation in Google Calendar

### 6.3 Zoom
- **Type**: `"Zoom"`
- **Features**:
  - Auto-generate Zoom meeting links
  - Add Zoom link to event

### 6.4 Google Meet
- **Type**: `"Google Meet"`
- **Features**:
  - Auto-generate Google Meet links
  - Add Meet link to event

### 6.5 Custom
- **Type**: `"Custom"`
- **Features**:
  - Custom meeting link (manually entered)
  - No automatic link generation

---

## 7. Data Models

### 7.1 Provider
- **Doctype**: `Provider`
- **Key Fields**:
  - `provider_name`: Auto-generated from display_name/full_name/user
  - `display_name`: Public display name
  - `full_name`: Legal/full name
  - `user`: Linked Frappe User
  - `organization`: Optional link to Organization
  - `onboarding_type`: "individual" or "organization"
  - `onboarding_current_step`: Current onboarding step (1-5)

### 7.2 Location
- **Doctype**: `Location`
- **Key Fields**:
  - `location_name`
  - `address`
  - `timezone`
  - `opening_hours`: Child table

### 7.3 Service
- **Doctype**: `Service`
- **Key Fields**:
  - `service_name`
  - `provider`: Link to Provider
  - `duration`: Minutes
  - `price`: Optional

### 7.4 EventType
- **Doctype**: `EventType`
- **Key Fields**:
  - `name`: Used as booking URL slug
  - `service`: Link to Service
  - `provider`: Link to Provider
  - `description`

### 7.5 User Appointment Availability
- **Doctype**: `User Appointment Availability`
- **Key Fields**:
  - `user`: Provider user
  - `slug`: URL slug (auto-generated)
  - `meeting_provider`: "builtin", "google", "Zoom", etc.
  - `available_durations`: Child table (Appointment Slot Duration)
  - `appointment_time_slot`: Child table (based on Location Opening Hours)

### 7.6 Appointment Slot Duration
- **Doctype**: `Appointment Slot Duration` (child of User Appointment Availability)
- **Key Fields**:
  - `title`: Display name (e.g., "30 min")
  - `duration`: Seconds
  - `allow_rescheduling`: Boolean

### 7.7 Appointment Time Slot
- **Doctype**: `Appointment Time Slot` (child of User Appointment Availability)
- **Key Fields**:
  - `day`: Weekday (Monday, Tuesday, etc.)
  - `start_time`: Time (HH:MM:SS)
  - `end_time`: Time (HH:MM:SS)

---

## 8. API Endpoints

### 8.1 Onboarding APIs
- `appointment.onboarding.get_progress`
- `appointment.onboarding.set_onboarding_type`
- `appointment.onboarding.save_profile`
- `appointment.onboarding.connect_calendar`
- `appointment.onboarding.save_availability`
- `appointment.onboarding.create_service`
- `appointment.onboarding.get_booking_url`
- `appointment.onboarding.complete`
- `appointment.onboarding.update_step`

### 8.2 Booking APIs
- `appointment.api.personal_meet.get_meeting_windows`
- `appointment.api.personal_meet.get_time_slots`
- `appointment.api.personal_meet.book_time_slot`
- `appointment.api.personal_meet.reschedule_appointment`

---

## 9. Error Handling

### 9.1 Graceful Degradation
- Missing `Appointment Slot Duration`: Returns empty slots (not error)
- Missing `User Appointment Availability`: Falls back to `EventType` lookup
- Missing `EventType`: Returns 404 with helpful message

### 9.2 Validation Errors
- Date required: Returns 400 with error message
- Invalid duration_id: Returns empty slots (graceful)
- No available slots: Returns empty array (not error)

### 9.3 Debug Messages
- **Development Mode**: Detailed debug messages in API responses
- **Production Mode**: No debug messages (cleaner responses)
- Controlled by `frappe.conf.developer_mode`

---

## 10. Testing Checklist

### 10.1 Onboarding
- [ ] Complete individual provider onboarding
- [ ] Verify Provider, Location, Service, EventType created
- [ ] Verify User Appointment Availability created with correct slug
- [ ] Verify Appointment Slot Duration created
- [ ] Verify Appointment Time Slot records created from Opening Hours
- [ ] Verify booking URL is generated correctly

### 10.2 Booking
- [ ] Visit booking URL
- [ ] Select duration (if multiple)
- [ ] Select date
- [ ] See available time slots
- [ ] Book appointment
- [ ] Verify Event created
- [ ] Verify appointment confirmation shown

### 10.3 Rescheduling
- [ ] Click reschedule button
- [ ] Select new date/time
- [ ] Verify Event updated
- [ ] Verify confirmation shown

### 10.4 Edge Cases
- [ ] Booking with "builtin" provider (no Google Calendar)
- [ ] Booking with multiple durations
- [ ] Booking on weekend (should show no slots if not available)
- [ ] Booking past slots (should be filtered)
- [ ] Booking with conflicting existing appointment

---

## 11. Troubleshooting

### 11.1 "No open-time slots" Error
**Possible Causes**:
- `Appointment Time Slot` records not created during onboarding
- Opening Hours not set correctly
- Date is outside availability window
- Date is weekend/holiday
- All slots already booked

**Solution**:
1. Check `User Appointment Availability` → `appointment_time_slot` child table
2. Verify `Opening Hours` in `Location`
3. Check date validation in API response
4. Verify `Appointment Slot Duration` exists and is linked correctly

### 11.2 "Appointment Slot Duration default not found"
**Cause**: Frontend using `duration_id="default"` instead of actual ID

**Solution**: Frontend should use `duration_id` from `get_meeting_windows` response

### 11.3 "Google Calendar None not found"
**Cause**: Google Calendar accessed when `meeting_provider="builtin"`

**Solution**: Code now checks `meeting_provider` before accessing Google Calendar

### 11.4 Booking URL Redirects to Home
**Cause**: `get_meeting_windows` returns error

**Solution**: Check if `User Appointment Availability` or `EventType` exists for slug

---

## 12. Future Enhancements

### Planned Features
- Organization onboarding flow
- Multi-provider booking (round-robin assignment)
- Payment integration (deposits, full payment)
- SMS/Email notifications
- Front-desk console
- Analytics dashboard
- USSD booking

---

**Last Updated**: 2025-11-17  
**Maintained By**: Development Team



