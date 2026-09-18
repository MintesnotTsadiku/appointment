# Fixtures Guide - Ethiopian Scheduler

**Purpose**: Fixtures ensure that roles, doctypes, and initial data are automatically created when someone installs your app or runs `bench migrate`.

---

## 📦 What Are Fixtures?

Fixtures are JSON files containing data that should be installed with your app. They're useful for:
- Roles and permissions
- DocTypes and their structure
- Initial settings and configurations
- Master data (e.g., default appointment types)

When you run `bench migrate` or install the app on a new site, Frappe automatically imports these fixtures.

---

## ✅ What We've Added to Fixtures

### 1. Roles (`appointment/fixtures/role.json`)
- **Organization Manager** - Manages multi-provider organizations
- **Front Desk** - Handles bookings for organizations
- **Assistant** - Manages calendars on behalf of providers
- **Provider** - Delivers services

### 2. DocTypes (via hooks.py)
- **Organization** - Multi-provider business entity
- **Organization Manager** - Child table for organization managers

### 3. Configuration in hooks.py
```python
fixtures = [
    # Custom Fields
    {"dt": "Custom Field", "filters": [...]},
    
    # Property Setters
    {"dt": "Property Setter", "filters": [...]},
    
    # Roles
    "appointment.fixtures.role",
    
    # DocTypes
    {"dt": "DocType", "filters": [["name", "in", ["Organization", "Organization Manager"]]]},
]
```

---

## 🔧 How to Export Data to Fixtures

### Method 1: Export Specific DocTypes (Console)

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe
import json

# Export a specific DocType
doctype_name = 'Organization'
doc = frappe.get_doc('DocType', doctype_name)
doc_dict = doc.as_dict()

# Remove system fields
for field in ['modified', 'modified_by', 'creation', 'owner']:
    doc_dict.pop(field, None)

# Write to file
fixture_path = f'/home/minte/projects/frappe-bench/apps/appointment/appointment/fixtures/{doctype_name.lower().replace(\" \", \"_\")}.json'
with open(fixture_path, 'w') as f:
    json.dump([doc_dict], f, indent=4, sort_keys=True, default=str)

print(f'✅ Exported {doctype_name} to {fixture_path}')
"
```

### Method 2: Export Using bench Command

```bash
cd /home/minte/projects/frappe-bench

# Export all fixtures defined in hooks.py
bench --site appointment.com export-fixtures

# This will:
# 1. Read the fixtures config from hooks.py
# 2. Export data matching the filters
# 3. Save to appointment/fixtures/
```

### Method 3: Export Multiple Records (Bulk)

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe
import json

# Export multiple roles
roles = ['Organization Manager', 'Front Desk', 'Assistant', 'Provider']
roles_data = []

for role_name in roles:
    if frappe.db.exists('Role', role_name):
        role = frappe.get_doc('Role', role_name)
        role_dict = role.as_dict()
        # Remove system fields
        for field in ['modified', 'modified_by', 'creation', 'owner', 'docstatus', 'idx', 'name']:
            role_dict.pop(field, None)
        roles_data.append(role_dict)

# Save to file
with open('/home/minte/projects/frappe-bench/apps/appointment/appointment/fixtures/role.json', 'w') as f:
    json.dump(roles_data, f, indent=4, sort_keys=True, default=str)

print(f'✅ Exported {len(roles_data)} roles')
"
```

---

## 📋 How to Export Landing Page Settings

### Option A: Export Website Settings (if you've configured it)

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe
import json

# Export Website Settings
settings = frappe.get_doc('Website Settings')
settings_dict = settings.as_dict()

# Remove system fields
for field in ['modified', 'modified_by', 'creation', 'owner']:
    settings_dict.pop(field, None)

# Save to file
with open('/home/minte/projects/frappe-bench/apps/appointment/appointment/fixtures/website_settings.json', 'w') as f:
    json.dump([settings_dict], f, indent=4, sort_keys=True, default=str)

print('✅ Exported Website Settings')
"
```

Then add to `hooks.py`:
```python
fixtures = [
    # ... existing fixtures ...
    "appointment.fixtures.website_settings",
]
```

### Option B: Create Custom Landing Page Config

Create a custom doctype for your landing page settings:

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe

# Create Landing Page Settings doctype
doctype = frappe.new_doc('DocType')
doctype.name = 'Landing Page Settings'
doctype.module = 'Appointment'
doctype.custom = 0
doctype.is_single = 1  # Single doctype (like Website Settings)

# Add fields
doctype.append('fields', {
    'fieldname': 'hero_title',
    'fieldtype': 'Data',
    'label': 'Hero Title',
    'default': 'Ethiopian Scheduler'
})

doctype.append('fields', {
    'fieldname': 'hero_subtitle',
    'fieldtype': 'Text',
    'label': 'Hero Subtitle',
    'default': 'Schedule appointments with ease'
})

doctype.append('fields', {
    'fieldname': 'hero_image',
    'fieldtype': 'Attach Image',
    'label': 'Hero Image'
})

# Add more fields as needed...

doctype.insert()
print('✅ Created Landing Page Settings doctype')
"
```

Then export it:
```bash
bench --site appointment.com export-fixtures
```

---

## 🔄 How Fixtures Work (Behind the Scenes)

### 1. During Installation (`bench install-app`)
```
1. Frappe reads hooks.py
2. Finds fixtures = [...]
3. Imports each fixture from the JSON files
4. Creates roles, doctypes, records
```

### 2. During Migration (`bench migrate`)
```
1. Frappe compares fixture JSON with database
2. Updates changed records
3. Creates missing records
4. Does NOT delete existing records
```

### 3. Example Flow:
```
User: bench migrate
Frappe: Reading appointment/hooks.py...
Frappe: Found fixture: appointment.fixtures.role
Frappe: Loading /path/to/fixtures/role.json...
Frappe: Importing 4 roles...
Frappe: ✅ Organization Manager
Frappe: ✅ Front Desk
Frappe: ✅ Assistant
Frappe: ✅ Provider
```

---

## 📝 Fixture File Structure

### Role Fixture (`fixtures/role.json`)
```json
[
    {
        "desk_access": 1,
        "doctype": "Role",
        "home_page": "/home",
        "role_name": "Organization Manager"
    },
    {
        "desk_access": 1,
        "doctype": "Role",
        "home_page": "/home",
        "role_name": "Front Desk"
    }
]
```

### DocType Fixture (auto-exported from JSON files)
The DocType JSON files already exist in:
- `appointment/appointment/doctype/organization/organization.json`
- `appointment/appointment/doctype/organization_manager/organization_manager.json`

These are automatically synced when you use the fixture filter in hooks.py.

---

## 🧪 Testing Fixtures

### Test 1: Fresh Install (New Site)
```bash
cd /home/minte/projects/frappe-bench

# Create new test site
bench new-site test.com --admin-password admin

# Install app (fixtures auto-import)
bench --site test.com install-app appointment

# Verify roles created
bench --site test.com console <<< "
import frappe
roles = frappe.get_all('Role', filters={'name': ['in', ['Organization Manager', 'Front Desk', 'Assistant']]})
print(f'Roles created: {len(roles)}')
for role in roles:
    print(f'  - {role.name}')
"
```

### Test 2: Migration (Existing Site)
```bash
cd /home/minte/projects/frappe-bench

# Run migrate
bench --site appointment.com migrate

# Check logs for fixture imports
# You should see: "Updating customizations for appointment"
```

### Test 3: Re-export After Changes
```bash
# Make changes to a doctype via UI or code
# Then re-export:
bench --site appointment.com export-fixtures

# Commit the updated JSON files
git add appointment/fixtures/
git commit -m "feat: update fixtures"
```

---

## 🎯 Best Practices

### 1. **Version Control**
Always commit fixture files to git:
```bash
git add appointment/fixtures/*.json
git add appointment/hooks.py
git commit -m "feat: add organization roles and doctypes to fixtures"
```

### 2. **Avoid Exporting User Data**
Fixtures should contain:
- ✅ Roles, permissions
- ✅ DocType structures
- ✅ Master data (categories, types)
- ❌ NOT user-specific data (appointments, providers)

### 3. **Use Filters in hooks.py**
Instead of hardcoding filenames, use filters:
```python
# Good: Automatically includes all Organization-related doctypes
{
    "dt": "DocType",
    "filters": [["module", "=", "Appointment"]]
}

# Also good: Specific list
{
    "dt": "DocType",
    "filters": [["name", "in", ["Organization", "Provider"]]]
}
```

### 4. **Export After Major Changes**
Run `bench export-fixtures` after:
- Creating new roles
- Adding new doctypes
- Modifying doctype structures
- Changing permissions

### 5. **Test on Fresh Site**
Periodically test your app installation on a fresh site:
```bash
bench new-site fresh-test.com --admin-password admin
bench --site fresh-test.com install-app appointment
# Verify everything works
bench drop-site fresh-test.com
```

---

## 🚀 Quick Commands Reference

```bash
# Export all fixtures
bench --site appointment.com export-fixtures

# Import fixtures manually
bench --site appointment.com import-fixtures

# Check what fixtures are configured
cat apps/appointment/appointment/hooks.py | grep -A 50 "fixtures ="

# List fixture files
ls -lh apps/appointment/appointment/fixtures/

# View a fixture
cat apps/appointment/appointment/fixtures/role.json | python3 -m json.tool
```

---

## 📚 What to Export for Landing Page

For your landing page, you might want to export:

1. **Website Settings** (if customized)
2. **Web Pages** (if you create custom pages)
3. **Website Theme** (if customized)
4. **Blog Settings** (if using blog)

Example:
```python
# In hooks.py
fixtures = [
    # ... existing fixtures ...
    {
        "dt": "Website Settings",
        "filters": []
    },
    {
        "dt": "Web Page",
        "filters": [["name", "in", ["landing-page", "about-us"]]]
    },
]
```

Then export:
```bash
bench --site appointment.com export-fixtures
```

---

## 🐛 Troubleshooting

### Issue: Fixtures not importing

**Solution**:
```bash
# Clear cache and retry
bench --site appointment.com clear-cache
bench --site appointment.com migrate
```

### Issue: "Duplicate entry" error

**Cause**: Record already exists  
**Solution**: Fixtures won't overwrite by default. Either:
1. Delete the existing record
2. Or modify the fixture to use `sync_on_migrate`

### Issue: Changes not reflected

**Solution**:
```bash
# Re-export after making changes
bench --site appointment.com export-fixtures

# Then migrate
bench --site appointment.com migrate
```

---

## ✅ Current Fixtures Status

**Exported**:
- ✅ Roles: Organization Manager, Front Desk, Assistant, Provider
- ✅ DocTypes: Organization, Organization Manager (via hooks.py filter)
- ✅ Custom Fields (existing)
- ✅ Property Setters (existing)

**Next to Export** (when ready):
- Landing Page Settings
- Default Organization Types
- Default Service Categories
- Email Templates (custom ones)

---

**Last Updated**: 2025-11-16  
**Location**: `/home/minte/projects/frappe-bench/apps/appointment/docs/technical/FIXTURES_GUIDE.md`



