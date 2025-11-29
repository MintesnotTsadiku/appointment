# Booking URLs Reference - All URLs Exposed to Users

This document lists all booking URLs that are generated and exposed to users/customers for booking appointments.

---

## 📋 URL Patterns Overview

### 1. **Personal Provider Booking URLs**
**Format:** `/schedule/in/{slug}`

**Where:**
- `slug` = `User Appointment Availability.slug` (e.g., `rahelworku`, `michaelnegash`)

**Examples:**
- `/schedule/in/rahelworku`
- `/schedule/in/michaelnegash`
- `/schedule/in/biniamnegash`

**Description:**
- Direct personal booking link for individual providers
- Shows all available durations and time slots for that provider
- Can be shared directly with customers

**URL Type:** `personal`

**Stored In:**
- `User Appointment Availability.booking_urls` child table
- `Organization.booking_urls` child table (copied from providers)

---

### 2. **Service/EventType Booking URLs**
**Format:** `/schedule/in/{EventType.name}`  
**Format (with duration):** `/schedule/in/{EventType.name}?type={duration_id}`

**Where:**
- `EventType.name` = EventType document name (e.g., `EVT-2025-0249`)
- `duration_id` = `Appointment Slot Duration.name` (optional query parameter)

**Examples:**
- `/schedule/in/EVT-2025-0249`
- `/schedule/in/EVT-2025-0249?type=bqgbpmaj7n`
- `/schedule/in/EVT-2025-0248`

**Description:**
- Service-specific booking link
- Links directly to a specific service offered by a provider
- When `?type={duration_id}` is included, pre-selects that duration

**URL Type:** `service`

**Stored In:**
- `User Appointment Availability.booking_urls` child table
- `Organization.booking_urls` child table

---

### 3. **Organization Main Booking URLs**
**Format:** `/schedule/org/{Organization.slug}`

**Where:**
- `Organization.slug` = Organization's URL-friendly identifier (e.g., `berhandentalcare`, `mahletmedicalclinic`)

**Examples:**
- `/schedule/org/berhandentalcare`
- `/schedule/org/mahletmedicalclinic`
- `/schedule/org/addispediatriccenter`

**Description:**
- Main booking page for an organization
- Shows all services offered by the organization
- Allows customers to select a service and provider
- Multi-provider booking support

**URL Type:** `organization`

**Stored In:**
- `Organization.booking_urls` child table

---

### 4. **Organization Service-Specific URLs**
**Format:** `/schedule/org/{Organization.slug}/{EventType.name}`  
**Format (with duration):** `/schedule/org/{Organization.slug}/{EventType.name}?type={duration_id}`

**Where:**
- `Organization.slug` = Organization's URL-friendly identifier
- `EventType.name` = EventType document name

**Examples:**
- `/schedule/org/berhandentalcare/EVT-2025-0243`
- `/schedule/org/mahletmedicalclinic/EVT-2025-0246?type=bqgbpmaj7n`

**Description:**
- Direct link to book a specific service at an organization
- Pre-selects the service, shows available providers for that service
- When `?type={duration_id}` is included, pre-selects that duration

**URL Type:** `service`

**Stored In:**
- `Organization.booking_urls` child table

---

### 5. **Provider URLs (within Organization)**
**Format:** `/schedule/org/{Organization.slug}`

**Where:**
- `Organization.slug` = Organization's URL-friendly identifier

**Description:**
- Points to organization main page
- Provider selection happens on the booking page
- Used for tracking which provider the URL is associated with

**URL Type:** `provider`

**Stored In:**
- `Organization.booking_urls` child table

**Note:** These URLs point to the organization main page, not a direct provider page. Provider selection is done on the booking interface.

---

### 6. **Location-Specific URLs** (if implemented)
**Format:** `/schedule/in/{location_slug}`

**Where:**
- `location_slug` = URL-friendly slug created from location name

**Description:**
- Booking link for a specific location
- Shows availability for that location

**URL Type:** `location`

**Stored In:**
- `User Appointment Availability.booking_urls` child table

---

### 7. **Group Booking URLs** (if implemented)
**Format:** `/schedule/gr/{groupId}`

**Description:**
- Group appointment booking (if group functionality is enabled)

**Note:** This route exists but may not be fully implemented.

---

## 🔍 Where URLs Are Stored

### 1. **User Appointment Availability.booking_urls** (Child Table)
Contains booking URLs for individual providers:
- Personal links (`url_type: personal`)
- Service-specific links (`url_type: service`)
- Location-specific links (`url_type: location`)

### 2. **Organization.booking_urls** (Child Table)
Contains booking URLs for organizations:
- Organization main link (`url_type: organization`)
- Service-specific links (`url_type: service`)
- Provider links (`url_type: provider`)
- Copied provider personal/service URLs from `User Appointment Availability`

---

## 📊 URL Types Summary

| URL Type | Pattern | Example | Purpose |
|----------|---------|---------|---------|
| **personal** | `/schedule/in/{slug}` | `/schedule/in/rahelworku` | Direct provider booking |
| **service** | `/schedule/in/{EventType.name}` | `/schedule/in/EVT-2025-0249` | Service-specific booking |
| **service** | `/schedule/org/{org_slug}/{EventType.name}` | `/schedule/org/berhandentalcare/EVT-2025-0243` | Organization service booking |
| **organization** | `/schedule/org/{org_slug}` | `/schedule/org/berhandentalcare` | Organization main page |
| **provider** | `/schedule/org/{org_slug}` | `/schedule/org/berhandentalcare` | Provider link (points to org page) |
| **location** | `/schedule/in/{location_slug}` | `/schedule/in/bole-road` | Location-specific booking |

---

## 🔗 Frontend Routes

The following routes are defined in `frontend/src/route.tsx`:

```typescript
/schedule/in/:meetId                    // Personal/Service booking
/schedule/org/:orgSlug                  // Organization main page
/schedule/org/:orgSlug/:serviceSlug     // Organization service booking
/schedule/gr/:groupId                   // Group booking (if implemented)
```

---

## 🎯 How URLs Are Generated

### For Providers:
1. **Personal URL**: Created from `User Appointment Availability.slug`
2. **Service URLs**: Created for each `EventType` linked to the provider
3. **Location URLs**: Created for each location linked to the provider

**Function:** `sync_booking_urls_for_provider(provider_name)`

### For Organizations:
1. **Organization Main URL**: Created from `Organization.slug`
2. **Service URLs**: Created for each `EventType` linked to organization services
3. **Provider URLs**: Created for each provider in the organization
4. **Copied Provider URLs**: All provider booking URLs are copied to organization

**Function:** `sync_booking_urls_for_organization(org_name)`

---

## 📝 Query Parameters

### `?type={duration_id}`
- Pre-selects a specific duration when the page loads
- `duration_id` = `Appointment Slot Duration.name`
- Example: `/schedule/in/EVT-2025-0249?type=bqgbpmaj7n`

---

## 🔐 Access Control

- **Access Level**: `public` or `private`
- **Is Active**: URLs can be marked as active/inactive
- **Public URLs**: Accessible to anyone with the link
- **Private URLs**: May require authentication (implementation dependent)

---

## 📍 Base URL

All booking URLs are relative paths. The full URL would be:
- **Development**: `http://localhost:5173/schedule/in/{slug}`
- **Production**: `https://yourdomain.com/schedule/in/{slug}`

---

## 🔄 URL Synchronization

Booking URLs are automatically synchronized when:
- Provider is created/updated
- Organization is created/updated
- Service is created/updated
- EventType is created/updated
- User Appointment Availability is updated

**Note:** During demo data generation, URL sync is skipped to avoid link validation errors, then synced at the end after all data is created.

---

## 📋 Example: Complete URL List for an Organization

For "Berhan Dental Care" organization:

1. **Organization Main**: `/schedule/org/berhandentalcare`
2. **Service URLs**:
   - `/schedule/org/berhandentalcare/EVT-2025-0243`
   - `/schedule/org/berhandentalcare/EVT-2025-0242`
3. **Provider Personal URLs** (copied from providers):
   - `/schedule/in/selamdesta`
   - `/schedule/in/biniamnegash`
4. **Provider Service URLs** (copied from providers):
   - `/schedule/in/EVT-2025-0243`
   - `/schedule/in/EVT-2025-0242`

---

## 🛠️ Viewing URLs in Database

To see all booking URLs for a provider:
```python
availability = frappe.get_doc("User Appointment Availability", "user@email.com")
for url in availability.booking_urls:
    print(f"{url.url_type}: {url.full_url}")
```

To see all booking URLs for an organization:
```python
org = frappe.get_doc("Organization", "Organization Name")
for url in org.booking_urls:
    print(f"{url.url_type}: {url.full_url} - {url.description}")
```

---

**Last Updated:** 2025-11-29

