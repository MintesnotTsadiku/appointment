# App Rename Migration Guide: frappe_appointment → scheduler

> **IMPORTANT**: This is a complex operation. Follow steps IN ORDER. Do NOT skip steps.
> **Estimated Time**: 2-4 hours
> **Risk Level**: HIGH - Make sure you have backups

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites & Backup](#phase-0-prerequisites--backup)
3. [Phase 1: Database Updates](#phase-1-database-updates-while-app-still-works)
4. [Phase 2: Code File Updates](#phase-2-code-file-updates)
5. [Phase 3: Folder Rename](#phase-3-folder-rename)
6. [Phase 4: Site Configuration](#phase-4-site-configuration)
7. [Phase 5: Reinstall & Verify](#phase-5-reinstall--verify)
8. [Rollback Plan](#rollback-plan)
9. [Troubleshooting](#troubleshooting)

---

## Overview

### What We're Changing

| Component | Before | After |
|-----------|--------|-------|
| App folder | `apps/frappe_appointment/` | `apps/scheduler/` |
| Python module | `frappe_appointment/frappe_appointment/` | `scheduler/scheduler/` |
| Package name (pyproject.toml) | `frappe_appointment` | `scheduler` |
| app_name (hooks.py) | `frappe_appointment` | `scheduler` |
| app_title (hooks.py) | `Scheduler` | `Scheduler` (unchanged) |
| Module name | `Frappe Appointment` | Keep as is OR change |

### What We're NOT Changing (Optional)

The **Frappe Module** names (e.g., "Frappe Appointment", "Scheduler", "Payments", "Channels") in `modules.txt` can stay the same. These are logical groupings within the app, not the app name itself.

### Critical Order of Operations

```
1. BACKUP → 2. DATABASE → 3. CODE → 4. FOLDERS → 5. CONFIG → 6. REINSTALL
```

**Why this order matters:**
- Database updates must happen while the app still works (connections intact)
- Code updates prepare files for the new folder structure
- Folder rename is the "point of no return" - the old app breaks here
- Config update tells Frappe where to find the new app
- Reinstall makes everything work again

---

## Phase 0: Prerequisites & Backup

### 0.1 Stop All Services

```bash
cd /home/minte/projects/frappe-bench
bench stop
```

### 0.2 Full Database Backup

```bash
cd /home/minte/projects/frappe-bench
bench --site appointment.com backup --with-files

# Note the backup location (usually sites/appointment.com/private/backups/)
ls -la sites/appointment.com/private/backups/
```

### 0.3 Full Git Backup

```bash
cd /home/minte/projects/frappe-bench/apps/frappe_appointment

# Commit any uncommitted changes
git add .
git commit -m "chore: pre-rename backup commit"

# Create a backup branch
git branch backup-before-rename

# Push to remote (if available)
git push origin backup-before-rename
```

### 0.4 Copy App Folder (Belt and Suspenders)

```bash
cd /home/minte/projects/frappe-bench/apps
cp -r frappe_appointment frappe_appointment_backup
```

### 0.5 Document Current State

Run this to capture current state:

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe

print('=== CURRENT STATE CAPTURE ===')
print()

# Installed apps
apps = frappe.get_installed_apps()
print(f'Installed apps: {apps}')
print()

# Module definitions
modules = frappe.get_all('Module Def', fields=['name', 'module_name', 'app_name'])
print('Module Definitions:')
for m in modules:
    print(f'  - {m.name} | app: {m.app_name}')
print()

# Count doctypes by module
for module in ['Frappe Appointment', 'Scheduler', 'Payments', 'Channels']:
    count = frappe.db.count('DocType', {'module': module})
    print(f'DocTypes in {module}: {count}')
"
```

Save this output for reference.

---

## Phase 1: Database Updates (While App Still Works)

> **CRITICAL**: This phase MUST be completed while the app is still functioning.
> The database connection will break after folder rename, so we update records first.

### 1.1 Start Services Temporarily

```bash
cd /home/minte/projects/frappe-bench
bench start &
sleep 10  # Wait for services to start
```

### 1.2 Update Module Def Records

The `Module Def` doctype stores app-to-module mappings:

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe

print('Updating Module Def app_name from frappe_appointment to scheduler...')

# Get all module defs that belong to our app
module_defs = frappe.get_all('Module Def', 
    filters={'app_name': 'frappe_appointment'},
    fields=['name', 'app_name', 'module_name']
)

print(f'Found {len(module_defs)} modules to update:')
for md in module_defs:
    print(f'  - {md.name}')

# Update each one
for md in module_defs:
    frappe.db.set_value('Module Def', md.name, 'app_name', 'scheduler', update_modified=False)
    print(f'  Updated: {md.name}')

frappe.db.commit()
print()
print('Module Def update complete!')

# Verify
updated = frappe.get_all('Module Def', 
    filters={'app_name': 'scheduler'},
    fields=['name']
)
print(f'Verification: {len(updated)} modules now have app_name=scheduler')
"
```

### 1.3 Update Installed Applications Table

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe

print('Updating Installed Applications table...')

# Check if record exists
exists = frappe.db.exists('Installed Applications', {'app_name': 'frappe_appointment'})

if exists:
    frappe.db.set_value('Installed Applications', exists, 'app_name', 'scheduler', update_modified=False)
    print(f'Updated Installed Applications record: {exists}')
    frappe.db.commit()
else:
    print('No Installed Applications record found for frappe_appointment')
    # List existing records
    records = frappe.get_all('Installed Applications', fields=['name', 'app_name'])
    print('Existing records:')
    for r in records:
        print(f'  - {r.name}: {r.app_name}')
"
```

### 1.4 Update DefaultValue Records (User Settings)

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe

print('Checking DefaultValue records...')

# Check for any app-specific default values
defaults = frappe.db.sql('''
    SELECT name, defkey, defvalue 
    FROM tabDefaultValue 
    WHERE defvalue LIKE '%frappe_appointment%'
    LIMIT 50
''', as_dict=True)

if defaults:
    print(f'Found {len(defaults)} DefaultValue records to update:')
    for d in defaults:
        new_value = d.defvalue.replace('frappe_appointment', 'scheduler')
        frappe.db.set_value('DefaultValue', d.name, 'defvalue', new_value, update_modified=False)
        print(f'  Updated: {d.defkey}')
    frappe.db.commit()
else:
    print('No DefaultValue records reference frappe_appointment')
"
```

### 1.5 Update System Settings (if any)

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe

print('Checking for app references in System Settings...')

# Check singles tables for references
singles = frappe.db.sql('''
    SELECT doctype, field, value 
    FROM tabSingles 
    WHERE value LIKE '%frappe_appointment%'
''', as_dict=True)

if singles:
    print(f'Found {len(singles)} Singles records with references:')
    for s in singles:
        print(f'  - {s.doctype}.{s.field} = {s.value[:50]}...')
        new_value = s.value.replace('frappe_appointment', 'scheduler')
        frappe.db.sql('''
            UPDATE tabSingles 
            SET value = %s 
            WHERE doctype = %s AND field = %s
        ''', (new_value, s.doctype, s.field))
    frappe.db.commit()
    print('Updated!')
else:
    print('No Singles records reference frappe_appointment')
"
```

### 1.6 Update File Paths in Database (if any)

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe

print('Checking File doctype for app path references...')

files = frappe.db.sql('''
    SELECT name, file_url, file_name 
    FROM tabFile 
    WHERE file_url LIKE '%frappe_appointment%'
    LIMIT 50
''', as_dict=True)

if files:
    print(f'Found {len(files)} files with old path:')
    for f in files:
        new_url = f.file_url.replace('frappe_appointment', 'scheduler')
        frappe.db.set_value('File', f.name, 'file_url', new_url, update_modified=False)
        print(f'  Updated: {f.file_name}')
    frappe.db.commit()
else:
    print('No File records reference frappe_appointment paths')
"
```

### 1.7 Stop Services

```bash
cd /home/minte/projects/frappe-bench
bench stop
# Or kill the background bench start process
pkill -f "bench start"
```

---

## Phase 2: Code File Updates

> **NOTE**: We update files BEFORE renaming folders so we can use existing paths.

### 2.1 Files to Update - Complete List

Here's every file that needs modification:

#### Root Level Files

| File | Changes Needed |
|------|----------------|
| `pyproject.toml` | Change `name = "frappe_appointment"` to `name = "scheduler"` |
| `package.json` | Update name field if exists |

#### Python Module Files (in `frappe_appointment/frappe_appointment/`)

| File | Changes Needed |
|------|----------------|
| `hooks.py` | Change `app_name`, all path references |
| `patches.txt` | Change all `frappe_appointment.patches.*` to `scheduler.patches.*` |
| `__init__.py` | Usually empty, may have version info |

#### All Python Files with Imports

Any `.py` file with:
- `from frappe_appointment import ...`
- `import frappe_appointment`
- `frappe_appointment.module.path`

### 2.2 Update pyproject.toml

Edit `/home/minte/projects/frappe-bench/apps/frappe_appointment/pyproject.toml`:

**Before:**
```toml
[project]
name = "frappe_appointment"
```

**After:**
```toml
[project]
name = "scheduler"
```

### 2.3 Update hooks.py

Edit `/home/minte/projects/frappe-bench/apps/frappe_appointment/frappe_appointment/hooks.py`:

**Changes needed:**

```python
# Line 1: Change app_name
app_name = "scheduler"  # Was: "frappe_appointment"

# Lines 11-18: Update add_to_apps_screen
add_to_apps_screen = [
    {
        "name": "scheduler",  # Was: "frappe_appointment"
        "logo": "/assets/scheduler/logo.png",  # Was: /assets/frappe_appointment/
        "title": "Scheduler",  # Was: "Appointment"
        "route": "app/appointment",
    }
]

# Lines 36-39: Update app_include_js paths
app_include_js = [
    "/assets/scheduler/js/appointment_link.js",  # Was: /assets/frappe_appointment/
    "/assets/scheduler/js/duration_override.js",  # Was: /assets/frappe_appointment/
]

# Line 41: Update before_install
before_install = "scheduler.tasks.import_email_templates.import_email_templates"

# Lines 43-46: Update after_sync
after_sync = [
    "scheduler.tasks.setup_erpnext_fields.setup_erpnext_fields",
    "scheduler.tasks.import_form_tour_google_calendar.import_doc",
]

# Lines 48-52: Update after_migrate
after_migrate = [
    "scheduler.tasks.setup_erpnext_fields.setup_erpnext_fields",
    "scheduler.tasks.import_form_tour_google_calendar.import_doc",
    "scheduler.tasks.import_email_templates.import_email_templates",
]

# Lines 74-77: Update doctype_js paths
doctype_js = {
    "Google Calendar": "public/js/google_calendar_override.js",  # Relative, no change needed
    "User": "public/js/user_override.js",  # Relative, no change needed
}

# Lines 207-209: Update has_permission
has_permission = {
    "Booking Event": "scheduler.overrides.event_override.has_permission",
}

# Lines 215-219: Update override_doctype_class
override_doctype_class = {
    "Booking Event": "scheduler.overrides.event_override.BookingEventOverride",
    "Google Calendar": "scheduler.overrides.google_calendar_override.GoogleCalendarOverride",
    "Customize Form": "scheduler.overrides.customize_form_override.AppointmentOverrideCustomizeForm",
}

# Lines 225-231: Update doc_events
doc_events = {
    "Leave Application": {
        "on_submit": "scheduler.overrides.leave_application_override.on_submit",
        "on_cancel": "scheduler.overrides.leave_application_override.on_cancel_and_on_trash",
        "on_trash": "scheduler.overrides.leave_application_override.on_cancel_and_on_trash",
    },
}

# Lines 240-243: Update scheduler_events
scheduler_events = {
    "daily": [
        "scheduler.tasks.reminder_google_calendar_auth.send_reminder_mail",
        "scheduler.tasks.verify_availability.verify_appointment_group_members_availabililty",
    ],
}

# Line 263-265: Update override_whitelisted_methods
override_whitelisted_methods = {
    "frappe.integrations.doctype.google_calendar.google_calendar.google_callback": "scheduler.overrides.google_calendar_override.google_callback"
}
```

### 2.4 Update patches.txt

Edit `/home/minte/projects/frappe-bench/apps/frappe_appointment/frappe_appointment/patches.txt`:

**Before:**
```
[pre_model_sync]
frappe_appointment.patches.v0_1.change_fieldtype_to_duration

[post_model_sync]
frappe_appointment.patches.v0_1.add_appointment_manager_role
frappe_appointment.patches.v0_1.add_event_creator
frappe_appointment.patches.v0_1.update_route_appointment
```

**After:**
```
[pre_model_sync]
scheduler.patches.v0_1.change_fieldtype_to_duration

[post_model_sync]
scheduler.patches.v0_1.add_appointment_manager_role
scheduler.patches.v0_1.add_event_creator
scheduler.patches.v0_1.update_route_appointment
```

### 2.5 Update All Python Imports

Use this script to find and replace all imports:

```bash
cd /home/minte/projects/frappe-bench/apps/frappe_appointment

# Find all files with old imports
grep -r "from frappe_appointment" --include="*.py" -l

# Preview changes
grep -r "frappe_appointment\." --include="*.py"
```

**Files that need import updates (found 32 files):**

For each Python file, change:
- `from frappe_appointment.` → `from scheduler.`
- `import frappe_appointment` → `import scheduler`
- String references like `"frappe_appointment.module.function"` → `"scheduler.module.function"`

**Important files to update:**

1. `/frappe_appointment/frappe_appointment/api/personal_meet.py`
2. `/frappe_appointment/frappe_appointment/api/group_meet.py`
3. `/frappe_appointment/frappe_appointment/helpers/*.py`
4. `/frappe_appointment/frappe_appointment/overrides/*.py`
5. `/frappe_appointment/frappe_appointment/tasks/*.py`
6. `/frappe_appointment/frappe_appointment/patches/**/*.py`
7. All files in `/frappe_appointment/frappe_appointment/*/doctype/**/*.py`

**Batch sed command (USE WITH CAUTION - review changes):**

```bash
cd /home/minte/projects/frappe-bench/apps/frappe_appointment

# Dry run first - just print what would change
find . -name "*.py" -type f -exec grep -l "frappe_appointment" {} \;

# Actually replace (BE CAREFUL!)
find . -name "*.py" -type f -exec sed -i 's/from frappe_appointment\./from scheduler./g' {} \;
find . -name "*.py" -type f -exec sed -i 's/import frappe_appointment/import scheduler/g' {} \;
find . -name "*.py" -type f -exec sed -i 's/"frappe_appointment\./"scheduler./g' {} \;
find . -name "*.py" -type f -exec sed -i "s/'frappe_appointment\./'scheduler./g" {} \;
```

### 2.6 Update Frontend Files

**Files in `/frontend/` that reference frappe_appointment:**

1. `vite.config.ts` - Update proxy paths if any
2. `package.json` - Update name if references app name
3. `index.html` - Update any asset paths
4. `src/**/*.ts` and `src/**/*.tsx` - Update API paths

**Common patterns to replace:**

```
/assets/frappe_appointment/ → /assets/scheduler/
frappe_appointment. → scheduler.
```

### 2.7 Update Doctype JSON Files (Module Field)

> **DECISION POINT**: Do you want to rename the module from "Frappe Appointment" to "Scheduler"?
> 
> If YES, update all JSON files. If NO (recommended for less risk), skip this step.

If you want to keep module names the same, **SKIP THIS STEP**.

If you want to rename modules, update the `"module"` field in these JSON files:

```bash
# Find all doctype JSON files
find /home/minte/projects/frappe-bench/apps/frappe_appointment -name "*.json" -path "*/doctype/*" | head -20
```

Each doctype JSON has a line like:
```json
"module": "Frappe Appointment",
```

Change to:
```json
"module": "Scheduler",
```

And update `modules.txt` accordingly.

### 2.8 Update Public Assets Paths

Check and update any hardcoded paths in:

```bash
cd /home/minte/projects/frappe-bench/apps/frappe_appointment/frappe_appointment/public

# Find references
grep -r "frappe_appointment" --include="*.js" --include="*.css"
```

---

## Phase 3: Folder Rename

> **⚠️ POINT OF NO RETURN**: After this step, the old app name will not work.
> Make sure Phase 1 and Phase 2 are complete!

### 3.1 Rename the Outer App Folder

```bash
cd /home/minte/projects/frappe-bench/apps

# Rename outer folder
mv frappe_appointment scheduler
```

### 3.2 Rename the Inner Python Module Folder

```bash
cd /home/minte/projects/frappe-bench/apps/scheduler

# Rename inner Python module folder
mv frappe_appointment scheduler
```

### 3.3 Verify Folder Structure

After rename, structure should be:

```
apps/
└── scheduler/                    # Was: frappe_appointment/
    ├── pyproject.toml
    ├── README.md
    ├── frontend/
    ├── docs/
    ├── scripts/
    └── scheduler/                # Was: frappe_appointment/
        ├── __init__.py
        ├── hooks.py
        ├── modules.txt
        ├── patches.txt
        ├── api/
        ├── helpers/
        ├── overrides/
        ├── tasks/
        ├── frappe_appointment/   # Module subfolder (keep name or rename)
        ├── scheduler/            # Module subfolder
        ├── payments/             # Module subfolder
        ├── channels/             # Module subfolder
        └── public/
```

---

## Phase 4: Site Configuration

### 4.1 Update apps.json

Edit `/home/minte/projects/frappe-bench/sites/apps.json`:

```bash
cd /home/minte/projects/frappe-bench/sites

# View current content
cat apps.json

# Edit the file
nano apps.json  # or use your preferred editor
```

**Before:**
```json
["frappe", "frappe_appointment"]
```

**After:**
```json
["frappe", "scheduler"]
```

### 4.2 Update Site's Installed Apps (if separate file exists)

Check if site has its own apps list:

```bash
cat /home/minte/projects/frappe-bench/sites/appointment.com/site_config.json
```

If it contains `installed_apps`, update it similarly.

### 4.3 Clear Bench Cache

```bash
cd /home/minte/projects/frappe-bench

# Clear various caches
rm -rf sites/appointment.com/public/js/*
rm -rf sites/appointment.com/public/css/*
rm -rf sites/.cache/*
rm -rf apps/scheduler/scheduler/__pycache__
find apps/scheduler -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
find apps/scheduler -name "*.pyc" -delete 2>/dev/null || true
```

---

## Phase 5: Reinstall & Verify

### 5.1 Reinstall the App

```bash
cd /home/minte/projects/frappe-bench

# Setup requirements (installs Python dependencies)
bench setup requirements

# Verify the app is recognized
bench --site appointment.com list-apps
```

### 5.2 Run Migrations

```bash
cd /home/minte/projects/frappe-bench

# Run migrate
bench --site appointment.com migrate

# If errors occur, check the error messages carefully
```

### 5.3 Rebuild Assets

```bash
cd /home/minte/projects/frappe-bench

# Build all assets
bench build

# Or build just the app
bench build --app scheduler
```

### 5.4 Clear All Caches

```bash
cd /home/minte/projects/frappe-bench

bench --site appointment.com clear-cache
bench --site appointment.com clear-website-cache
```

### 5.5 Start Services and Test

```bash
cd /home/minte/projects/frappe-bench

# Start bench
bench start
```

### 5.6 Verify Everything Works

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe

print('=== POST-RENAME VERIFICATION ===')
print()

# Check installed apps
apps = frappe.get_installed_apps()
print(f'Installed apps: {apps}')
assert 'scheduler' in apps, 'ERROR: scheduler not in installed apps!'
print('✓ scheduler is in installed apps')
print()

# Check module defs
modules = frappe.get_all('Module Def', 
    filters={'app_name': 'scheduler'},
    fields=['name', 'app_name']
)
print(f'Modules linked to scheduler: {len(modules)}')
for m in modules:
    print(f'  - {m.name}')
print()

# Try importing the app
try:
    import scheduler
    print('✓ Can import scheduler module')
except ImportError as e:
    print(f'✗ Cannot import scheduler: {e}')

# Try importing hooks
try:
    from scheduler import hooks
    print(f'✓ Can import hooks (app_name = {hooks.app_name})')
except ImportError as e:
    print(f'✗ Cannot import hooks: {e}')

# Check a sample doctype
try:
    meta = frappe.get_meta('Appointment Group')
    print(f'✓ Appointment Group doctype accessible (module: {meta.module})')
except Exception as e:
    print(f'✗ Cannot access Appointment Group: {e}')

print()
print('=== VERIFICATION COMPLETE ===')
"
```

### 5.7 Test Key Functionality

1. **Login to Desk**: http://localhost:8000
2. **Check App Switcher**: Should show "Scheduler"
3. **Open Appointment Group List**: http://localhost:8000/app/appointment-group
4. **Create a Test Record**: Verify CRUD works
5. **Check Public Booking Page**: http://localhost:8000/schedule/...

---

## Rollback Plan

If something goes wrong, here's how to restore:

### Option A: Restore from Git

```bash
cd /home/minte/projects/frappe-bench/apps

# Remove the renamed folder
rm -rf scheduler

# Restore from backup branch
git clone --branch backup-before-rename /path/to/remote/repo frappe_appointment
# Or if local:
cp -r frappe_appointment_backup frappe_appointment

# Restore apps.json
echo '["frappe", "frappe_appointment"]' > ../sites/apps.json

# Reinstall
cd /home/minte/projects/frappe-bench
bench setup requirements
bench --site appointment.com migrate
bench build
```

### Option B: Restore Database

```bash
cd /home/minte/projects/frappe-bench

# Restore database backup
bench --site appointment.com restore /path/to/backup.sql.gz

# Restore files if needed
# tar -xzf /path/to/files-backup.tar.gz -C sites/appointment.com/
```

### Option C: Database Rollback Script

If you only need to revert database changes:

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe

print('Reverting database changes...')

# Revert Module Def
frappe.db.sql('''
    UPDATE \`tabModule Def\`
    SET app_name = 'frappe_appointment'
    WHERE app_name = 'scheduler'
''')

# Revert Installed Applications
frappe.db.sql('''
    UPDATE \`tabInstalled Applications\`
    SET app_name = 'frappe_appointment'
    WHERE app_name = 'scheduler'
''')

frappe.db.commit()
print('Database reverted!')
"
```

---

## Troubleshooting

### Issue: "Module 'scheduler' not found"

**Cause**: Python can't find the module.

**Fix**:
```bash
# Make sure folder structure is correct
ls -la /home/minte/projects/frappe-bench/apps/scheduler/scheduler/

# Reinstall
cd /home/minte/projects/frappe-bench
pip install -e apps/scheduler
```

### Issue: "App scheduler not found in apps.json"

**Cause**: apps.json not updated.

**Fix**:
```bash
echo '["frappe", "scheduler"]' > /home/minte/projects/frappe-bench/sites/apps.json
bench setup requirements
```

### Issue: "DocType 'X' not found"

**Cause**: Module Def not updated correctly.

**Fix**:
```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe

# Check module def
modules = frappe.get_all('Module Def', 
    filters={'module_name': 'Frappe Appointment'},
    fields=['name', 'app_name']
)
print(modules)

# Fix if needed
for m in modules:
    if m.app_name != 'scheduler':
        frappe.db.set_value('Module Def', m.name, 'app_name', 'scheduler')
        
frappe.db.commit()
"
```

### Issue: Assets Not Loading

**Cause**: Asset paths not updated or not rebuilt.

**Fix**:
```bash
cd /home/minte/projects/frappe-bench
bench build --app scheduler --force
bench --site appointment.com clear-cache
```

### Issue: Import Errors in Python Files

**Cause**: Some imports still reference old module name.

**Fix**:
```bash
# Find remaining references
grep -r "frappe_appointment" /home/minte/projects/frappe-bench/apps/scheduler --include="*.py"

# Fix each file manually
```

### Issue: "Bench start" fails

**Cause**: Hooks.py has syntax errors or wrong paths.

**Fix**:
```bash
# Test hooks.py syntax
cd /home/minte/projects/frappe-bench/apps/scheduler/scheduler
python -c "import hooks"

# Check for specific errors in hooks
python -c "from scheduler import hooks; print(hooks.app_name)"
```

---

## Checklist Summary

Use this checklist to track progress:

### Phase 0: Prerequisites & Backup
- [ ] Services stopped
- [ ] Database backed up
- [ ] Git backup branch created
- [ ] Folder copied as backup
- [ ] Current state documented

### Phase 1: Database Updates
- [ ] Module Def records updated
- [ ] Installed Applications updated
- [ ] DefaultValue records checked/updated
- [ ] Singles tables checked/updated
- [ ] File paths checked/updated
- [ ] Services stopped after updates

### Phase 2: Code File Updates
- [ ] pyproject.toml updated
- [ ] hooks.py completely updated
- [ ] patches.txt updated
- [ ] All Python imports updated (32+ files)
- [ ] Frontend files updated
- [ ] Public assets paths updated

### Phase 3: Folder Rename
- [ ] Outer folder renamed (frappe_appointment → scheduler)
- [ ] Inner folder renamed (frappe_appointment → scheduler)
- [ ] Folder structure verified

### Phase 4: Site Configuration
- [ ] apps.json updated
- [ ] site_config.json checked
- [ ] Cache directories cleared

### Phase 5: Reinstall & Verify
- [ ] bench setup requirements completed
- [ ] bench migrate completed
- [ ] bench build completed
- [ ] Cache cleared
- [ ] Verification script passed
- [ ] Manual testing completed

---

## Notes for Implementing Agent

1. **Take it slow**: Each phase should be completed fully before moving to the next
2. **Verify at each step**: Run the verification commands provided
3. **Commit after each phase**: If using git, commit changes after each major phase
4. **Keep logs**: Save output of all commands for debugging
5. **Ask before destructive actions**: Confirm with user before folder renames or database changes

---

**Document Version**: 1.0  
**Created**: 2025-11-26  
**Last Updated**: 2025-11-26

