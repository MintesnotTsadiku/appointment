# Location & Organization Data Model - Robust Multi-Organization Support

## Overview

This document describes the flexible, robust data model that supports:
- **Multiple Organizations per User**: One user can own multiple organizations
- **Organization Branches**: Each organization can have multiple locations (branches)
- **Multi-Organization Providers**: Providers can work for multiple organizations simultaneously
- **Flexible Calendar Exposure**: Providers can expose personal, specific org, or all org calendars

---

## Data Model Architecture

### 1. **Location Ownership Model**

**Location** doctype has two ownership types:

```
Location {
  location_name: "Bole Branch"
  organization: Link(Organization) | null
  // ... other fields
}
```

**Rules:**
- If `organization` is set → **Organization Branch** (shared by all providers in that org)
- If `organization` is null → **Provider Personal Location** (individual provider only)

**Benefits:**
- Clear ownership distinction
- Easy query: `Get all org branches` vs `Get provider personal locations`
- Organization branches are automatically accessible to all org providers

---

### 2. **Provider-Organization Relationship (Many-to-Many)**

**Replaced:**
- Old: Provider has single `organization` field (one-to-one)
- New: Provider has `organizations` child table (many-to-many)

**Provider Organization** child table:
```
Provider Organization {
  organization: Link(Organization)  [Required]
  status: Select("Pending"|"Active"|"Inactive")  [Default: "Active"]
  accept_org_bookings: Check  [Default: 1]
  is_primary: Check  [Default: 0]
  joined_date: Date
}
```

**Benefits:**
- Provider can work for multiple organizations
- Track status per organization (Active/Inactive)
- Control which org bookings provider accepts
- Mark primary organization for display purposes

---

### 3. **Calendar Inheritance & Exposure**

**Location Access Rules:**

1. **Personal Calendar:**
   - Uses Provider's personal locations (`organization` = null)
   - Controlled by Provider's `enable_personal_booking` flag

2. **Organization Calendar:**
   - Uses Organization's branches (`organization` = specific org)
   - Only visible if Provider has Active status in that organization
   - Controlled by Provider Organization's `accept_org_bookings` flag

3. **Provider Calendar Options:**
   - Expose personal calendar only
   - Expose specific organization calendar(s)
   - Expose all organization calendars
   - Expose personal + all organization calendars

---

## Migration Path

### Phase 1: Add New Structure (Backward Compatible)

1. ✅ **Create Provider Organization child table**
   - New doctype: `Provider Organization`
   - Fields: organization, status, accept_org_bookings, is_primary, joined_date

2. ✅ **Add organization field to Location**
   - New field: `organization` (Link to Organization, optional)
   - If set: Organization Branch
   - If null: Provider Personal Location

3. **Update Provider doctype**
   - Add new child table: `organizations` (options: "Provider Organization")
   - Keep old `organization` field temporarily (for backward compatibility)
   - Add helper methods to sync old → new

### Phase 2: Migration Script

**Migrate existing data:**

1. **Migrate Provider → Organizations:**
   ```python
   # For each Provider with existing organization field:
   # - Create Provider Organization child row
   # - Set status = "Active"
   # - Set accept_org_bookings = Provider.accept_org_bookings
   # - Set is_primary = True (if only one org)
   ```

2. **Migrate Locations:**
   ```python
   # For each Location:
   # - If Provider has organization: Set Location.organization = Provider.organization
   # - If Provider has no organization: Keep Location.organization = null
   ```

3. **Link Organization Providers to Organization Branches:**
   ```python
   # For each Organization:
   #   For each Organization Branch (Location where organization = org):
   #     For each Provider in organization:
   #       Link Provider → Location via Provider Location child table
   ```

### Phase 3: Update Logic & UI

1. **Update Location Form:**
   - Auto-detect if user is in organization context
   - Auto-set `organization` field when creating location in org context
   - Show "This location belongs to: [Organization Name]" or "Personal Location"

2. **Update Provider Management:**
   - Replace single organization dropdown with child table grid
   - Allow adding multiple organizations
   - Show organization status, booking acceptance per org

3. **Update Calendar/Booking Logic:**
   - When querying locations for provider:
     - Personal locations: `Location.organization IS NULL AND Location IN Provider.locations`
     - Org locations: `Location.organization IN Provider.organizations WHERE status='Active'`
   - When creating bookings, validate location access

---

## Use Cases

### Use Case 1: Individual Provider
```
User: Dr. Abebe
├── Provider: Dr. Abebe
│   ├── organizations: [] (empty - independent)
│   └── locations: [
│       └── Location: "My Clinic" (organization = null)
│   ]
└── Calendar: Personal only (uses "My Clinic")
```

### Use Case 2: Provider in Single Organization
```
User: Dr. Hanna
├── Provider: Dr. Hanna
│   ├── organizations: [
│   │   └── Provider Organization: {
│   │       organization: "Addis Medical Center"
│   │       status: "Active"
│   │       accept_org_bookings: True
│   │   }
│   │ ]
│   └── locations: [] (uses org branches)
└── Organization: "Addis Medical Center"
    └── branches: [
        ├── Location: "Bole Branch" (organization = "Addis Medical Center")
        └── Location: "Piassa Branch" (organization = "Addis Medical Center")
    ]
└── Calendar: Organization calendar (uses Bole + Piassa branches)
```

### Use Case 3: Provider in Multiple Organizations
```
User: Dr. Yohannes
├── Provider: Dr. Yohannes
│   ├── organizations: [
│   │   ├── Provider Organization: {
│   │   │   organization: "Addis Medical Center" (is_primary = True)
│   │   │   status: "Active"
│   │   │   accept_org_bookings: True
│   │   │ }
│   │   └── Provider Organization: {
│   │       organization: "Bole Health Clinic"
│   │       status: "Active"
│   │       accept_org_bookings: True
│   │   }
│   │ ]
│   └── locations: [
│       └── Location: "Home Office" (organization = null) [Personal]
│   ]
├── Organization: "Addis Medical Center"
│   └── branches: ["Bole Branch", "Piassa Branch"]
└── Organization: "Bole Health Clinic"
    └── branches: ["Main Branch"]
└── Calendar Options:
    - Personal: "Home Office"
    - Org 1: "Bole Branch" + "Piassa Branch"
    - Org 2: "Main Branch"
    - All: Can expose all or selective
```

### Use Case 4: User Owning Multiple Organizations
```
User: Business Owner
├── Organization: "Addis Medical Center" (owner_user = Business Owner)
│   └── branches: ["Bole Branch", "Piassa Branch"]
└── Organization: "Addis Dental Care" (owner_user = Business Owner)
    └── branches: ["Main Dental Branch"]
└── Calendar: Can manage both organizations independently
```

---

## API Changes

### Location Creation

**Before:**
```python
create_location(location_name, address, provider_id)
# Location created → linked to provider only
```

**After:**
```python
create_location(location_name, address, organization=None, provider_id=None)
# If organization provided → Organization Branch
# If organization=None → Provider Personal Location
# Auto-link to org providers if organization branch
```

### Provider Organizations

**New APIs:**
```python
# Add provider to organization
add_provider_to_organization(provider_id, organization_id, status="Active")

# Remove provider from organization
remove_provider_from_organization(provider_id, organization_id)

# Get provider's organizations
get_provider_organizations(provider_id)
# Returns: [{organization, status, accept_org_bookings, is_primary}]

# Get organization's providers
get_organization_providers(organization_id)
# Returns: [{provider, status, accept_org_bookings}]
```

### Location Queries

**New Helper Functions:**
```python
# Get all locations accessible to provider
get_provider_locations(provider_id, include_personal=True, include_org=True)
# Returns:
# - Personal locations (organization = null)
# - Org branches (organization IN provider's active organizations)

# Get organization branches
get_organization_branches(organization_id)
# Returns: All locations where organization = organization_id

# Get provider's calendar locations (based on exposure settings)
get_calendar_locations(provider_id, calendar_type="all")
# calendar_type: "personal" | "org" | "all"
```

---

## Backward Compatibility

### Temporary Bridge Logic

**Provider Model:**
- Keep old `organization` field during migration period
- Add `organizations` child table
- Add helper method: `sync_old_to_new_organizations()`
  - If old `organization` exists and `organizations` is empty
  - Create Provider Organization row from old field
  - Set as primary organization

**Location Model:**
- `organization` field is optional (null = personal)
- Existing locations remain personal (organization = null)
- New locations created in org context get organization set automatically

---

## Benefits of New Model

1. **Scalability**: Supports complex multi-org scenarios
2. **Flexibility**: Provider can work for multiple organizations
3. **Clarity**: Clear ownership (Organization Branch vs Personal Location)
4. **Maintainability**: Easier to query and manage
5. **Extensibility**: Easy to add features like org-specific availability, booking rules

---

## Next Steps

1. ✅ Create Provider Organization child table
2. ✅ Add organization field to Location
3. ⏳ Update Provider doctype to use child table
4. ⏳ Create migration script
5. ⏳ Update Location form UI
6. ⏳ Update Provider management UI
7. ⏳ Update booking/calendar logic
8. ⏳ Test all use cases

---

## Migration Checklist

- [ ] Create Provider Organization child table doctype
- [ ] Add organization field to Location doctype
- [ ] Update Provider doctype (add organizations child table)
- [ ] Create migration script (sync old → new)
- [ ] Update Location form to show organization context
- [ ] Update Provider form to show organizations table
- [ ] Update location creation APIs
- [ ] Update location query functions
- [ ] Update booking logic for org branches
- [ ] Update calendar exposure logic
- [ ] Test individual provider flow
- [ ] Test single organization flow
- [ ] Test multi-organization flow
- [ ] Test multi-organization owner flow
- [ ] Document API changes
- [ ] Update onboarding flow if needed



