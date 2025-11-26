# UI Testing Guide - Provider Dashboard

## Routing Structure

- **`/home`** - Provider dashboard (for both individual providers and organization members)
- **`/admin/dashboard`** - System administrator dashboard (platform-wide stats)
- **No `/dashboard` route exists** - Use `/home` for providers

---

## Test Users Created

### 1. Organization User (Multiple Providers, Services, Locations)

**Login Credentials:**
- **Email:** `org.admin@test.et`
- **Password:** `Test@1234`
- **Dashboard URL:** `http://localhost:5173/home`

**Organization Details:**
- **Name:** Addis Comprehensive Medical Center
- **Owner:** Has Provider record (can access dashboard directly)
- **Providers:** 4 providers total (1 owner + 3 team members)
  - Dr. Yohannes Bekele (provider1@addis-medical.et)
  - Dr. Rahel Tadesse (provider2@addis-medical.et)
  - Dr. Michael Alemayehu (provider3@addis-medical.et)
- **Services:** 3 services
  - General Consultation
  - Dental Checkup
  - Eye Examination
- **Locations:** 2 locations
  - Bole Branch (Bole Road, Near Edna Mall)
  - Piassa Branch (Piassa, Churchill Avenue)

**What to Test:**
- ✅ **Should skip onboarding** - Goes directly to dashboard (not onboarding screen)
- Organization context should be visible
- Team management should show 4 providers (1 owner + 3 team members)
- Multiple services should be available
- Multiple locations should be selectable
- Organization-wide statistics

**Note:** This user has a Provider record with `onboarding_complete = 1`, so they skip the onboarding flow and go straight to the dashboard.

---

### 2. Individual Provider User

**Login Credentials:**
- **Email:** `individual.provider@test.et`
- **Password:** `Test@1234`
- **Dashboard URL:** `http://localhost:5173/home`

**Provider Details:**
- **Name:** Dr. Selamawit Gebre
- **Type:** Individual Provider (no organization)
- **Organization:** None

**What to Test:**
- ✅ **Should skip onboarding** - Goes directly to dashboard (not onboarding screen)
- Individual provider context (no organization)
- Personal dashboard
- Individual statistics
- No team management (or disabled)
- Personal services and availability

**Note:** This user has a Provider record with `onboarding_complete = 1`, so they skip the onboarding flow and go straight to the dashboard.

---

## Step-by-Step Testing Instructions

### Step 1: Test Organization User

1. **Open Browser:**
   - Navigate to `http://localhost:5173/login`

2. **Login:**
   - Email: `org.admin@test.et`
   - Password: `Test@1234`
   - Click "Login"

3. **Verify Dashboard (`/home`):**
   - Should show organization context: "Addis Comprehensive Medical Center"
   - Quick Stats should show organization-wide data
   - Setup Checklist should reflect organization setup status
   - Quick Actions should be available

4. **Test Quick Actions:**
   - **New Service** - Should open modal to create service
   - **My Calendar** - Should navigate to `/calendar`
   - **Edit Availability** - Should navigate to `/settings/availability` (should show organization context)
   - **Share Link** - Should open modal with booking link
   - **View Analytics** - Should navigate to `/analytics`
   - **Manage Team** - Should navigate to `/settings/team` (should show 3 providers)

5. **Test Team Management (`/settings/team`):**
   - Should show "Addis Comprehensive Medical Center" as context
   - Should list 3 providers
   - "Invite Member" button should work
   - Should show team statistics

6. **Test Availability Settings (`/settings/availability`):**
   - Should show organization context
   - Should explain availability is connected via Provider → Location
   - Should allow editing availability

7. **Test Analytics (`/analytics`):**
   - Should show organization-wide analytics
   - Should display data for all 3 providers

8. **Test Calendar (`/calendar`):**
   - Should show calendar view
   - Should display appointments for organization providers

---

### Step 2: Test Individual Provider User

1. **Logout from Organization User:**
   - Click logout or clear session

2. **Login as Individual Provider:**
   - Navigate to `http://localhost:5173/login`
   - Email: `individual.provider@test.et`
   - Password: `Test@1234`
   - Click "Login"

3. **Verify Dashboard (`/home`):**
   - Should show individual provider context (no organization)
   - Quick Stats should show personal data
   - Setup Checklist should reflect individual setup
   - Quick Actions should be available

4. **Test Quick Actions:**
   - **New Service** - Should work for individual provider
   - **My Calendar** - Should show personal calendar
   - **Edit Availability** - Should show individual provider context
   - **Share Link** - Should show personal booking link
   - **View Analytics** - Should show personal analytics
   - **Manage Team** - Should be disabled or show "Individual Provider" message

5. **Test Team Management (`/settings/team`):**
   - Should show "Individual Provider" context
   - Should indicate no team (or team management disabled)
   - "Invite Member" should be disabled or show appropriate message

6. **Test Availability Settings (`/settings/availability`):**
   - Should show individual provider context
   - Should allow editing personal availability

7. **Test Analytics (`/analytics`):**
   - Should show personal analytics only
   - Should not include organization data

---

### Step 3: Test System Admin Dashboard

1. **Login as Administrator:**
   - Navigate to `http://localhost:5173/login`
   - Email: `Administrator` (or your admin email)
   - Password: (your admin password)

2. **Navigate to Admin Dashboard:**
   - Go to `http://localhost:5173/admin/dashboard`

3. **Verify Admin Dashboard:**
   - Should show platform-wide statistics
   - Should display:
     - Total Providers (should show 3+ from test data)
     - Total Organizations (should show 7+)
     - Total Appointments
     - Total Revenue
     - Status breakdowns
     - Top providers
   - Should NOT show individual provider context

---

## What to Look For

### ✅ Expected Behaviors

1. **Organization User:**
   - Organization name visible in header/context
   - Team management shows multiple providers
   - Statistics aggregate across organization
   - Multiple services and locations available

2. **Individual Provider:**
   - No organization context shown
   - Personal statistics only
   - Team management disabled or shows "Individual Provider"
   - Personal services and availability

3. **Admin Dashboard:**
   - Platform-wide statistics
   - All organizations and providers visible
   - System-level analytics

### ❌ Common Issues to Watch For

1. **404 Errors:**
   - All Quick Actions should navigate correctly
   - No broken links

2. **Empty Data:**
   - Dashboard should show actual data, not zeros
   - Statistics should reflect test data

3. **Context Confusion:**
   - Organization user should see org context
   - Individual user should NOT see org context
   - Admin should see platform context

4. **Permission Issues:**
   - Users should only see their own data
   - Organization users should see org data
   - Admin should see all data

---

## Creating More Test Data

If you need to create more test data, use the demo data functions:

```python
# In Frappe console
import frappe
from frappe_appointment.demo_data import (
    generate_organizations,
    generate_providers,
    generate_services,
    generate_locations,
    generate_appointments
)

# Generate organizations
generate_organizations(3)

# Generate providers (will link to organizations)
generate_providers(10)

# Generate services
generate_services(5)

# Generate locations
generate_locations(3)

# Generate appointments (creates EventTypes, Availability, Appointments, Events)
generate_appointments(50, days_back=14)
```

---

## Troubleshooting

### User Can't Login

1. **Check if user exists:**
   ```python
   frappe.db.exists("User", "org.admin@test.et")
   ```

2. **Reset password:**
   ```python
   user = frappe.get_doc("User", "org.admin@test.et")
   user.new_password = "Test@1234"
   user.save(ignore_permissions=True)
   ```

### Dashboard Shows Empty Data

1. **Check if provider is linked to user:**
   ```python
   provider = frappe.get_doc("Provider", {"user": "org.admin@test.et"})
   ```

2. **Check if organization exists:**
   ```python
   frappe.db.exists("Organization", "Addis Comprehensive Medical Center")
   ```

3. **Verify API is working:**
   - Open browser DevTools → Network tab
   - Check API calls to `frappe_appointment.onboarding.get_progress`
   - Check API calls to `frappe_appointment.dashboard.stats`

### 404 Errors on Navigation

1. **Check routes are registered:**
   - See `frontend/src/route.tsx`
   - All routes should be defined

2. **Check components exist:**
   - `/pages/calendar/index.tsx`
   - `/pages/analytics/index.tsx`
   - `/pages/settings/availability.tsx`
   - `/pages/settings/team.tsx`

---

## Quick Reference

| Route | Purpose | User Type |
|-------|---------|-----------|
| `/home` | Provider dashboard | Individual & Organization |
| `/admin/dashboard` | System admin dashboard | Administrator only |
| `/calendar` | Calendar view | All providers |
| `/analytics` | Analytics dashboard | All providers |
| `/settings/availability` | Edit availability | All providers |
| `/settings/team` | Team management | Organization only |

---

## Test Checklist

- [ ] Organization user can login
- [ ] Organization dashboard shows org context
- [ ] Organization dashboard shows 3 providers
- [ ] Organization dashboard shows multiple services
- [ ] Organization dashboard shows multiple locations
- [ ] Team management shows 3 providers
- [ ] Individual provider can login
- [ ] Individual dashboard shows no org context
- [ ] Individual dashboard shows personal data only
- [ ] Team management disabled for individual
- [ ] All Quick Actions work (no 404s)
- [ ] Admin dashboard shows platform stats
- [ ] No empty data issues
- [ ] No console errors

---

## Notes

- **Password:** All test users use password `Test@1234`
- **Frontend URL:** `http://localhost:5173`
- **Backend URL:** `http://localhost:8000`
- **Test data is marked with `is_demo_data = 1`** for easy cleanup

---

## Cleanup Test Data

To remove all test data:

```python
from frappe_appointment.demo_data import clear_all_demo_data
clear_all_demo_data()
```

Or remove specific types:

```python
from frappe_appointment.demo_data import (
    clear_appointments,
    clear_providers,
    clear_organizations,
    clear_services,
    clear_locations
)
```

