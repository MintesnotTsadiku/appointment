# Provider Naming System - Implementation Summary

## Overview
Implemented a flexible naming system for the Provider doctype that allows users to control how their name appears publicly.

## Changes Made

### 1. Provider Doctype - New Field
**File**: `frappe_appointment/scheduler/doctype/provider/provider.json`

Added a new field `display_name`:
- **Label**: "Display Name"
- **Type**: Data (text field)
- **Description**: "Short name or preferred name to show publicly (optional). If not provided, uses Full Name or Linked User name."
- **Position**: Between `full_name` and contact information section

### 2. Provider Controller - Smart Naming Logic
**File**: `frappe_appointment/scheduler/doctype/provider/provider.py`

Implemented `before_save()` hook and `get_display_name()` method:

```python
def before_save(self):
    """Auto-populate provider_name if not set"""
    if not self.provider_name:
        self.provider_name = self.get_display_name()

def get_display_name(self):
    """
    Get the display name for the provider based on priority:
    1. Display Name (if provided)
    2. Full Name (if provided)
    3. Linked User's full name
    4. Linked User's email (fallback)
    """
    # Priority 1: Display Name
    if self.display_name:
        return self.display_name
    
    # Priority 2: Full Name
    if self.full_name:
        return self.full_name
    
    # Priority 3 & 4: Get from linked User
    if self.user:
        user_doc = frappe.get_cached_doc("User", self.user)
        if user_doc.full_name:
            return user_doc.full_name
        return user_doc.email
    
    # Fallback: Use email if available
    if self.email:
        return self.email
    
    return "Provider"
```

### 3. Onboarding Updates
**File**: `frappe_appointment/onboarding.py`

Updated `save_profile()` and `set_onboarding_type()` to use the smart naming:
- Removed explicit `provider_name` assignment
- Let the `before_save` hook auto-populate it
- Set `full_name` from user input or User's full name
- The system automatically uses the correct name based on priority

## Naming Priority

The system determines the provider's display name using this priority order:

1. **Display Name** (if user explicitly sets it)
   - Use case: User wants a short/professional name like "Dr. Sarah" instead of "Dr. Sarah Johnson, MD"
   
2. **Full Name** (if provided)
   - Use case: User provides their full legal name during onboarding
   
3. **Linked User's Full Name** (from Frappe User account)
   - Use case: Automatically use the name from their user profile
   
4. **Linked User's Email** (fallback)
   - Use case: When no other name is available

## User Experience

### Scenario 1: Individual Provider with Custom Display Name
```
Full Name: "Dr. Sarah Johnson, MD"
Display Name: "Dr. Sarah"
→ Public booking page shows: "Dr. Sarah"
```

### Scenario 2: Individual Provider without Display Name
```
Full Name: "Mahlet Clinic"
Display Name: (empty)
→ Public booking page shows: "Mahlet Clinic"
```

### Scenario 3: New User (Auto-populated)
```
User Account Full Name: "John Doe"
Full Name: (not yet set)
Display Name: (not yet set)
→ System automatically uses: "John Doe"
```

### Scenario 4: Organization
```
Full Name: "Addis Medical Center"
Display Name: "AMC"
→ Public booking page shows: "AMC"
```

## Benefits

1. **Flexibility**: Users can choose how they appear publicly
2. **Professional**: Allows short, professional names for booking pages
3. **Privacy**: Users can use a display name instead of their full legal name
4. **Automatic**: Falls back to sensible defaults if not explicitly set
5. **Consistent**: Single source of truth for display names across the system

## UI in Frappe Desk

When editing a Provider record, users will see three name fields:

```
┌─────────────────────────────────────────┐
│ Provider Name: [Auto-generated]         │ ← System ID (auto-filled)
│ Full Name: [Mahlet Clinic]              │ ← Full legal name (optional)
│ Display Name: [Mahlet]                  │ ← Public display name (optional)
└─────────────────────────────────────────┘
```

**Guidance text**:
- Full Name: "Full legal name (optional)"
- Display Name: "Short name or preferred name to show publicly (optional). If not provided, uses Full Name or Linked User name."

## Migration

- **Database**: Added `display_name` column to `tabProvider`
- **Existing Records**: Will use existing `full_name` or fall back to user's name
- **No Data Loss**: All existing providers continue to work with their current names

## Testing

To test the naming logic:

```python
import frappe

# Create a provider
provider = frappe.new_doc("Provider")
provider.user = "user@example.com"
provider.full_name = "Dr. Sarah Johnson, MD"
provider.display_name = "Dr. Sarah"  # Optional
provider.insert()

# Check what name is used
print(provider.provider_name)  # Output: "Dr. Sarah"
print(provider.get_display_name())  # Output: "Dr. Sarah"

# Without display_name
provider2 = frappe.new_doc("Provider")
provider2.user = "john@example.com"
provider2.full_name = "John Medical Center"
provider2.insert()

print(provider2.provider_name)  # Output: "John Medical Center"
```

## Files Changed

1. `frappe_appointment/scheduler/doctype/provider/provider.json` - Added `display_name` field
2. `frappe_appointment/scheduler/doctype/provider/provider.py` - Added naming logic
3. `frappe_appointment/onboarding.py` - Updated to use smart naming

## Next Steps

- ✅ Field added to Provider doctype
- ✅ Naming logic implemented
- ✅ Onboarding updated
- ✅ Migration completed
- ⏳ Test with new onboarding flow
- ⏳ Update frontend to show/edit display name (optional)

---

**Date**: 2025-11-16  
**Status**: ✅ IMPLEMENTED



