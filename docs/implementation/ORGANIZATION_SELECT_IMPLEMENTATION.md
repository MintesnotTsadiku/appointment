# Organization & Provider Selection Implementation

**Date**: 2025-11-21  
**Status**: ✅ COMPLETE

## Overview

Implemented select-or-create functionality for organizations and providers in the onboarding wizard. Users can now:
- Select existing organizations or create new ones in Step 1
- Edit existing organization details when selected
- Link existing providers or create new ones in Step 2
- Switch between organizations during onboarding

## Changes Made

### Backend APIs (onboarding.py)

#### New/Updated Endpoints:

1. **`get_user_organizations()`** - ✅ Already existed
   - Returns list of organizations user owns or manages
   - Used for dropdown population

2. **`get_organization_profile(organization_id)`** - ✅ Already existed
   - Fetches full details of a specific organization
   - Validates user access (owner or manager)

3. **`save_organization_profile(..., organization_id=None)`** - ✅ Updated
   - Now accepts optional `organization_id` parameter
   - Updates existing org if ID provided, creates new otherwise
   - Stores selected org in `Provider.onboarding_organization`

4. **`search_user_providers()`** - ✅ Already existed
   - Returns providers accessible by current user
   - Used for "link existing provider" feature

5. **`add_organization_provider(..., organization_id=None, existing_provider_id=None)`** - ✅ Updated
   - Now accepts optional `organization_id` to target specific org
   - Accepts `existing_provider_id` to link existing provider
   - Falls back to `Provider.onboarding_organization` if no ID provided

6. **`get_organization_providers(organization_id=None)`** - ✅ Updated
   - Now accepts optional `organization_id` parameter
   - Defaults to `Provider.onboarding_organization` if not provided

#### Helper Functions (already existed):

- `_user_can_manage_organization(user, organization_name)` - Validates access
- `_fetch_user_organizations(user)` - Gets owner + manager orgs
- `_resolve_user_organization(user, organization_id)` - Resolves context org
- `_get_manageable_providers(user)` - Gets accessible providers

### Frontend Changes

#### Type Definitions (`context/onboarding/types.ts`)

```typescript
// Added to OnboardingProgress
selected_organization?: {
  id: string;
  name: string;
  slug: string;
} | null;

// New interfaces
interface Organization { ... }
interface Provider { ... }
```

#### Step 1: Organization Profile (`Step1OrgProfile.tsx`)

**New Features:**
- Organization selector dropdown (shows when user has existing orgs)
- "Create New Organization" option
- Auto-loads selected org data into form
- Remembers selection from `progress.selected_organization`
- Passes `organization_id` to save API

**UI Flow:**
1. If user has orgs → show dropdown with "Create New" + existing orgs
2. Selecting existing org → populates form with current data
3. Selecting "Create New" → clears form for new entry
4. Submit → saves changes and stores selection in context

#### Step 2: Add Providers (`Step2OrgProviders.tsx`)

**New Features:**
- Organization selector (if user manages multiple orgs)
- Two-mode provider addition:
  - **Create New Provider** - Original flow
  - **Link Existing Provider** - New flow
- Shows linkable providers (not already in selected org)
- Provider list filtered by selected organization

**UI Flow:**
1. Optional org selector if user manages multiple
2. Two buttons: "Create New Provider" | "Link Existing Provider"
3. Create mode → show add form (unchanged)
4. Link mode → dropdown of available providers with details
5. Both modes respect selected organization context

### Database Schema

#### Provider Doctype (Provider.json)

**Added Field:**
```json
{
  "fieldname": "onboarding_organization",
  "fieldtype": "Link",
  "label": "Selected Onboarding Organization",
  "options": "Organization",
  "description": "Organization currently being configured in onboarding"
}
```

This field stores which organization the user is currently configuring during onboarding, allowing:
- Step continuity (remembering context across steps)
- API defaults (endpoints know which org to work with)
- Multi-org support (users can manage multiple organizations)

## User Experience Improvements

### Before:
- User creates organization → immediately persisted
- Returning users have no way to edit
- Providers hardcoded to first/only organization
- No way to link existing providers to organizations

### After:
- ✅ Select existing organization or create new
- ✅ Edit organization details when selected
- ✅ Create new providers OR link existing ones
- ✅ Switch between organizations during onboarding
- ✅ Context preserved across wizard steps

## Testing Checklist

- [x] Migration successful (onboarding_organization field added)
- [ ] Create new organization (Step 1 with "Create New")
- [ ] Select existing organization (Step 1 dropdown)
- [ ] Edit existing organization (change details, submit)
- [ ] Create new provider in organization (Step 2)
- [ ] Link existing provider to organization (Step 2)
- [ ] Switch organizations mid-onboarding (verify context updates)
- [ ] Verify provider list updates when org changes
- [ ] Complete onboarding flow end-to-end
- [ ] Verify organization selection persists on page refresh

## Technical Notes

### Context Management

The selected organization flows through:
1. `Provider.onboarding_organization` (database)
2. `progress.selected_organization` (API response)
3. `useOnboarding()` context (React)
4. Component state (UI)

### API Strategy

All organization onboarding APIs support two modes:
- **Explicit**: Pass `organization_id` parameter
- **Implicit**: Falls back to `Provider.onboarding_organization`

This allows flexibility while maintaining a sensible default.

### Error Handling

- Access validation on all org operations
- User must be owner or manager to edit
- Linking prevents duplicates (provider already in org)
- Form validation on all inputs

## Files Modified

### Backend:
- `appointment/onboarding.py` - API endpoints
- `appointment/scheduler/doctype/provider/provider.json` - Added field

### Frontend:
- `frontend/src/context/onboarding/types.ts` - Type definitions
- `frontend/src/pages/home/components/Step1OrgProfile.tsx` - Org selector
- `frontend/src/pages/home/components/Step2OrgProviders.tsx` - Provider linking

## Next Steps

1. Complete manual testing checklist
2. Test with multiple users and multiple organizations
3. Verify permissions (non-owners can't edit)
4. Test edge cases (deleted orgs, removed managers, etc.)
5. Add automated tests for new APIs

## Related Documentation

- [Multi-Business Implementation](../planning/MULTI_BUSINESS_IMPLEMENTATION.md)
- [Organization Backend Complete](../planning/ORGANIZATION_BACKEND_COMPLETE.md)
- [Organization Onboarding Spec](../planning/ORGANIZATION_ONBOARDING_SPEC.md)

---

**Implementation completed**: 2025-11-21  
**All TODOs completed**: ✅  
**Ready for testing**: ✅

