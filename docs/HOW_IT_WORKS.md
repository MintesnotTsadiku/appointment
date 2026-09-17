# How It Works: Data Model & Availability System Overview

## Table of Contents
1. [Data Model Overview](#data-model-overview)
2. [Core Entities & Relationships](#core-entities--relationships)
3. [Availability Hierarchy](#availability-hierarchy)
4. [How Availability Settings Work](#how-availability-settings-work)
5. [EventType: The Booking Link](#eventtype-the-booking-link)
6. [Real-World Examples](#real-world-examples)

---

## Data Model Overview

The Frappe Appointment system uses a flexible, hierarchical data model that supports:
- **Multiple Organizations per User**: One user can own multiple organizations
- **Organization Branches**: Each organization can have multiple locations (branches)
- **Multi-Organization Providers**: Providers can work for multiple organizations simultaneously
- **Service-Location Linking**: Services are linked to locations through EventTypes
- **Flexible Availability**: Three-level availability hierarchy (Location → Service → Provider)

---

## Core Entities & Relationships

### Visual Data Model

```
┌─────────────────┐
│  Organization   │
│  (e.g., Clinic) │
└────────┬────────┘
         │
         │ (1-to-many)
         │
         ├─────────────────────────────────────┐
         │                                     │
         ▼                                     ▼
┌─────────────────┐                   ┌─────────────────┐
│    Location     │                   │     Service     │
│  (Branch/Office)│                   │  (e.g., Checkup)│
└────────┬────────┘                   └────────┬────────┘
         │                                     │
         │                                     │
         │                                     │
         └──────────────┬──────────────────────┘
                        │
                        │ (Many-to-Many via EventType)
                        │
                        ▼
              ┌─────────────────┐
              │   EventType      │
              │  (The Linker)    │
              └────────┬──────────┘
                       │
                       │ (also links to)
                       │
                       ▼
              ┌─────────────────┐
              │    Provider      │
              │   (Doctor/Staff) │
              └─────────────────┘
```

---

### 1. Organization → Location (One-to-Many)

**Relationship:**
- Location has `organization` field (Link to Organization, optional)
- If `organization` is set → **Organization Branch** (shared by all org providers)
- If `organization` is null → **Provider Personal Location** (individual only)

**Example:**
```
Organization: "Piassa Gym"
  ├─ Location: "Piassa Gym - Bole Road" (organization = "Piassa Gym")
  ├─ Location: "Piassa Gym - Merkato" (organization = "Piassa Gym")
  └─ Location: "Dr. John's Home Office" (organization = null, personal)
```

**Database Schema:**
```json
Location {
  "location_name": "Piassa Gym - Bole Road",
  "organization": "ORG-001",  // Link to Organization (optional)
  "address_line_1": "...",
  "opening_hours": [...],
  "use_default_hours": 0
}
```

---

### 2. Organization → Service (One-to-Many)

**Relationship:**
- Service has `organization` field (Link to Organization)
- Service belongs to one organization
- Services are organization-scoped

**Example:**
```
Organization: "Piassa Gym"
  ├─ Service: "Dental Checkup" (organization = "Piassa Gym")
  ├─ Service: "Teeth Cleaning" (organization = "Piassa Gym")
  └─ Service: "X-Ray" (organization = "Piassa Gym")
```

**Database Schema:**
```json
Service {
  "service_name": "Dental Checkup",
  "organization": "ORG-001",  // Link to Organization
  "duration": 30,
  "price": 500,
  "opening_hours": [...],
  "use_default_hours": 1
}
```

---

### 3. Provider → Organization (Many-to-Many)

**Relationship:**
- Provider has `organizations` child table (Provider Organization)
- Provider can work for multiple organizations simultaneously
- Each link tracks: status, accept_org_bookings, is_primary, joined_date

**Example:**
```
Provider: "Dr. Sarah"
  ├─ Organization: "Piassa Gym" (status: Active, is_primary: true)
  └─ Organization: "City Clinic" (status: Active, is_primary: false)
```

**Database Schema:**
```json
Provider {
  "provider_name": "Dr. Sarah",
  "organizations": [
    {
      "organization": "ORG-001",
      "status": "Active",
      "accept_org_bookings": 1,
      "is_primary": 1
    }
  ]
}
```

---

### 4. Provider → Location (Many-to-Many)

**Relationship:**
- Provider has `locations` child table (Provider Location)
- Provider can work at multiple locations
- Links to both organization branches and personal locations

**Example:**
```
Provider: "Dr. Sarah"
  ├─ Location: "Piassa Gym - Bole Road" (organization branch)
  ├─ Location: "Piassa Gym - Merkato" (organization branch)
  └─ Location: "Dr. Sarah's Home Office" (personal, organization = null)
```

**Database Schema:**
```json
Provider {
  "provider_name": "Dr. Sarah",
  "locations": [
    {
      "location": "LOC-001",
      "is_primary": 1
    }
  ]
}
```

---

### 5. Service ↔ Location (Many-to-Many via EventType)

**Relationship:**
- **EventType** is the linking entity
- EventType connects: Service + Provider + Location
- One EventType = one service offered by one provider at one location
- This is the actual booking link

**Example:**
```
EventType 1:
  - Service: "Dental Checkup"
  - Provider: "Dr. Sarah"
  - Location: "Piassa Gym - Bole Road"

EventType 2:
  - Service: "Dental Checkup" (same service)
  - Provider: "Dr. Sarah" (same provider)
  - Location: "Piassa Gym - Merkato" (different location)

EventType 3:
  - Service: "Teeth Cleaning" (different service)
  - Provider: "Dr. Sarah" (same provider)
  - Location: "Piassa Gym - Bole Road" (same location)
```

**Database Schema:**
```json
EventType {
  "event_type_name": "Dr. Sarah - Dental Checkup - Bole Road",
  "service": "SRV-001",      // Link to Service
  "provider": "PRV-001",     // Link to Provider
  "location": "LOC-001",     // Link to Location
  "is_active": 1,
  "price_override": null,
  "duration_override": null
}
```

**Why EventType is Critical:**
- Without EventType: Service exists but can't be booked
- With EventType: Service can be booked at that location with that provider
- Availability settings only show services that have EventTypes
- This ensures availability is only set for bookable services

---

## Availability Hierarchy

Availability follows a three-level hierarchy where each level can only **restrict** (not expand) the parent level:

```
Location Availability (Base)
    ↓
    ├─ Service Availability (can restrict location hours)
    │     ↓
    │     └─ Provider Availability (can restrict service/location hours)
    │
    └─ Provider Availability (if no service-specific)
```

### Rules:
1. **Location** sets the base availability (e.g., 8:00 AM - 6:00 PM, Mon-Fri)
2. **Service** can restrict location hours (e.g., 9:00 AM - 5:00 PM + lunch break)
3. **Provider** can restrict service/location hours (e.g., 10:00 AM - 4:00 PM, Mon-Thu only)

### Example Flow:

```
Location "Piassa Gym - Bole Road": 
  8:00 AM - 6:00 PM (Mon-Fri)
    ↓
Service "Dental Checkup": 
  9:00 AM - 5:00 PM (Mon-Fri) + lunch break (12:00 PM - 1:00 PM)
    ↓
Provider "Dr. Sarah": 
  10:00 AM - 4:00 PM (Mon-Thu only)
```

**Final Available Slots:**
- Monday-Thursday: 10:00 AM - 12:00 PM, 1:00 PM - 4:00 PM
- Friday: Not available (provider restriction)

---

## How Availability Settings Work

The Availability Settings page (`/settings/availability`) allows configuring availability at three levels:

### Location Tab

**Flow:**
1. User selects a Location from dropdown
2. System loads location's opening_hours
3. User can set base availability for that location
4. All services/providers at that location must work within these hours

**Use Cases:**
- Set organization branch hours
- Set personal location hours
- Base availability that all services inherit

**Data Storage:**
- Stored in `Location.opening_hours` (child table)
- Each row: `day_of_week`, `start_time`, `end_time`, `is_open`

---

### Service Tab

**Flow:**
1. User selects Organization → Shows organizations user owns/manages
2. User selects Location → Shows locations in that organization (filtered)
3. User selects Service → Shows only services that have EventTypes at that location
4. System loads service's opening_hours (or inherits from location)
5. User can set service-specific availability (can restrict location hours)
6. User can inherit from location availability

**Why Location First?**
- Services are linked to locations via EventType
- Only services with EventTypes at the selected location are shown
- This ensures availability is set for services actually available at that location
- Supports multi-location organizations where services may differ by branch

**Data Storage:**
- Stored in `Service.opening_hours` (child table)
- Each row: `day_of_week`, `start_time`, `end_time`, `is_open`
- `use_default_hours` flag: if true, inherits from location

**Filtering Logic:**
```python
# Backend: get_provider_services(organization, location)
# 1. Get services from organization
# 2. Filter by EventType: WHERE location = selected_location AND is_active = 1
# 3. Return only services that have EventTypes at that location
```

---

### Provider Tab

**Flow:**
1. User selects Organization → Shows organizations
2. User selects Location → Shows locations in that organization
3. User selects Service → Shows services with EventTypes at that location
4. System loads provider's opening_hours (or inherits from service/location)
5. User can set provider-specific availability (can restrict service/location hours)

**Use Cases:**
- Set individual provider schedules
- Handle provider-specific time off
- Personal availability within service/location constraints

**Data Storage:**
- Stored in `Provider.opening_hours` (child table)
- Each row: `day_of_week`, `start_time`, `end_time`, `is_open`
- `use_default_hours` flag: if true, inherits from service/location

---

## EventType: The Booking Link

EventType is the critical linking entity that makes services bookable:

### What EventType Does:
1. **Links Service to Location**: Defines which services are available at which locations
2. **Links Provider to Service-Location**: Defines which providers offer which services at which locations
3. **Enables Booking**: Without EventType, a service cannot be booked
4. **Filters Availability UI**: Only services with EventTypes appear in availability settings

### EventType Creation:
EventTypes are typically created when:
- A service is created and linked to providers/locations
- A provider is added to an organization
- A location is created and services are linked to it

### EventType Structure:
```json
{
  "event_type_name": "Dr. Sarah - Dental Checkup - Bole Road",
  "service": "SRV-001",           // Required
  "provider": "PRV-001",          // Required
  "location": "LOC-001",          // Required
  "is_active": 1,                 // Must be active to appear
  "price_override": null,         // Optional service price override
  "duration_override": null       // Optional service duration override
}
```

### Why This Matters for Availability:
- **Service Tab**: Only shows services that have EventTypes at the selected location
- **Provider Tab**: Only shows services that have EventTypes for the selected provider-location combination
- **Booking System**: Only EventTypes with active availability can be booked
- **Data Integrity**: Ensures availability is only set for bookable services

---

## Real-World Examples

### Example 1: Multi-Location Organization

**Scenario:** "Piassa Gym" has two branches offering different services

**Setup:**
```
Organization: "Piassa Gym"
  ├─ Location: "Bole Road Branch"
  │   ├─ Service: "Dental Checkup" (via EventType)
  │   └─ Service: "Teeth Cleaning" (via EventType)
  └─ Location: "Merkato Branch"
      ├─ Service: "Dental Checkup" (via EventType)
      └─ Service: "X-Ray" (via EventType)
```

**Availability Settings:**
1. **Location Tab**: Set "Bole Road Branch" to 8:00 AM - 6:00 PM
2. **Service Tab**: 
   - Select Organization: "Piassa Gym"
   - Select Location: "Bole Road Branch"
   - See: "Dental Checkup", "Teeth Cleaning" (only services with EventTypes at Bole Road)
   - Set "Dental Checkup" to 9:00 AM - 5:00 PM with lunch break
3. **Provider Tab**:
   - Select Organization → Location → Service
   - Set individual provider availability

---

### Example 2: Solo Provider

**Scenario:** Individual provider without organization

**Setup:**
```
Provider: "Dr. John"
  └─ Location: "Dr. John's Home Office" (organization = null, personal)
      └─ Service: "Consultation" (via EventType)
```

**Availability Settings:**
1. **Location Tab**: Set personal location hours
2. **Service Tab**: 
   - No organization selector (solo provider)
   - Select Location: "Dr. John's Home Office"
   - See: "Consultation" (service with EventType at this location)
   - Set service availability
3. **Provider Tab**: Set personal availability

---

### Example 3: Provider Working at Multiple Locations

**Scenario:** Dr. Sarah works at two organization branches

**Setup:**
```
Provider: "Dr. Sarah"
  ├─ Organization: "Piassa Gym"
  │   ├─ Location: "Bole Road Branch"
  │   │   └─ Service: "Dental Checkup" (via EventType)
  │   └─ Location: "Merkato Branch"
  │       └─ Service: "Dental Checkup" (via EventType)
  └─ Personal Location: "Home Office" (organization = null)
      └─ Service: "Consultation" (via EventType)
```

**Availability Settings:**
- Each location has its own availability
- Service availability can differ by location
- Provider availability can differ by location-service combination

---

## Key Takeaways

1. **Organization** owns Locations and Services
2. **Location** can be organization branch or personal
3. **Service** belongs to one organization
4. **EventType** links Service + Provider + Location (the booking link)
5. **Availability** flows: Location → Service → Provider (restrictive hierarchy)
6. **Service Tab** requires Location selection first (to filter by EventType)
7. **Only services with EventTypes** appear in availability settings
8. **Multi-location support** is built-in through EventType relationships

---

## API Endpoints Reference

### Get Locations
```
GET appointment.onboarding.get_provider_locations
Params: { organization?: string }
Returns: { locations: [{ name, location_name }] }
```

### Get Services
```
GET appointment.onboarding.get_provider_services
Params: { organization?: string, location?: string }
Returns: { services: [{ name, service_name, organization }] }
Note: Filters by EventType when location is provided
```

### Get Availability
```
GET appointment.onboarding.get_availability
Params: { 
  level: 'location' | 'service' | 'provider',
  id?: string,              // For location/service
  service_id?: string,       // For provider
  location_id?: string       // For provider
}
Returns: {
  schedule: DaySchedule[],
  use_default_hours: boolean,
  provider?: { name, provider_name, email }  // For provider level
}
```

### Save Availability
```
POST appointment.onboarding.save_availability
Body: {
  level: 'location' | 'service' | 'provider',
  id?: string,              // For location/service
  opening_hours: [...],     // Array of { day_of_week, start_time, end_time, is_open }
  use_default_hours: 0 | 1
}
```

---

## Data Flow: Setting Service Availability

**Complete Flow Example:**

1. **User Action**: Select Organization "Piassa Gym"
2. **System**: Fetches locations where `organization = "Piassa Gym"`
3. **User Action**: Select Location "Bole Road Branch"
4. **System**: 
   - Fetches EventTypes: `WHERE location = "Bole Road Branch" AND is_active = 1`
   - Extracts unique services from EventTypes
   - Returns services: ["Dental Checkup", "Teeth Cleaning"]
5. **User Action**: Select Service "Dental Checkup"
6. **System**: 
   - Fetches service availability: `Service.opening_hours`
   - Fetches location availability: `Location.opening_hours` (for inheritance)
   - Displays availability editor with location as parent
7. **User Action**: Set service hours (9:00 AM - 5:00 PM with lunch)
8. **System**: Validates service hours are within location hours
9. **User Action**: Click "Save Changes"
10. **System**: 
    - Saves to `Service.opening_hours`
    - Sets `Service.use_default_hours = 0`
    - Returns success

---

## Summary

The system uses a flexible, hierarchical model where:
- **Organizations** own locations and services
- **EventTypes** link services to locations (making them bookable)
- **Availability** flows from location → service → provider
- **Service availability** is location-scoped (via EventType filtering)
- **Multi-location** and **solo provider** scenarios are fully supported

This design ensures data integrity, supports complex business scenarios, and provides a clear hierarchy for availability management.





