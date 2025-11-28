# App Rename Quick Checklist

> Quick reference for implementing agent. See `APP_RENAME_MIGRATION_GUIDE.md` for full details.

## Quick Summary

```
frappe_appointment → scheduler
```

## Commands Cheat Sheet

### Backup Commands

```bash
# Stop services
cd /home/minte/projects/frappe-bench && bench stop

# Backup database
bench --site appointment.com backup --with-files

# Backup git
cd /home/minte/projects/frappe-bench/apps/frappe_appointment
git add . && git commit -m "pre-rename backup"
git branch backup-before-rename

# Copy folder
cd /home/minte/projects/frappe-bench/apps
cp -r frappe_appointment frappe_appointment_backup
```

### Database Updates (Run While App Works)

```bash
# Start services first
cd /home/minte/projects/frappe-bench && bench start &
sleep 10

# Update Module Def
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe
frappe.db.sql(\"UPDATE \\\`tabModule Def\\\` SET app_name='scheduler' WHERE app_name='frappe_appointment'\")
frappe.db.sql(\"UPDATE \\\`tabInstalled Applications\\\` SET app_name='scheduler' WHERE app_name='frappe_appointment'\")
frappe.db.commit()
print('Database updated!')
"

# Stop services
pkill -f "bench start"
```

### File Updates - Key Files

| File | Line(s) | Change |
|------|---------|--------|
| `pyproject.toml` | 2 | `name = "scheduler"` |
| `hooks.py` | 1 | `app_name = "scheduler"` |
| `hooks.py` | 13 | `"name": "scheduler"` |
| `hooks.py` | 14 | `"/assets/scheduler/logo.png"` |
| `hooks.py` | 37-38 | `/assets/scheduler/js/...` |
| `hooks.py` | 41, 43-46, 48-52 | `scheduler.tasks...` |
| `hooks.py` | 208, 216-218 | `scheduler.overrides...` |
| `hooks.py` | 227-229 | `scheduler.overrides...` |
| `hooks.py` | 241-242 | `scheduler.tasks...` |
| `hooks.py` | 264 | `scheduler.overrides...` |
| `patches.txt` | 4, 8-10 | `scheduler.patches...` |

### Bulk Python Import Update

```bash
cd /home/minte/projects/frappe-bench/apps/frappe_appointment

# Preview
grep -r "frappe_appointment" --include="*.py" -l

# Replace
find . -name "*.py" -type f -exec sed -i 's/from frappe_appointment\./from scheduler./g' {} \;
find . -name "*.py" -type f -exec sed -i 's/import frappe_appointment/import scheduler/g' {} \;
find . -name "*.py" -type f -exec sed -i 's/"frappe_appointment\./"scheduler./g' {} \;
find . -name "*.py" -type f -exec sed -i "s/'frappe_appointment\./'scheduler./g" {} \;
```

### Folder Rename

```bash
cd /home/minte/projects/frappe-bench/apps

# Outer folder
mv frappe_appointment scheduler

# Inner folder  
cd scheduler
mv frappe_appointment scheduler
```

### Update apps.json

```bash
# View current
cat /home/minte/projects/frappe-bench/sites/apps.json

# Update (replace frappe_appointment with scheduler in the JSON array)
# Usually: ["frappe", "frappe_appointment"] → ["frappe", "scheduler"]
```

### Reinstall

```bash
cd /home/minte/projects/frappe-bench

# Clear cache
rm -rf sites/.cache
find apps/scheduler -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true

# Setup
bench setup requirements

# Migrate
bench --site appointment.com migrate

# Build
bench build --app scheduler

# Clear site cache
bench --site appointment.com clear-cache

# Start
bench start
```

### Verify

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe
apps = frappe.get_installed_apps()
print(f'Apps: {apps}')
assert 'scheduler' in apps
print('SUCCESS!')
"
```

## Files Requiring Import Updates (32 files)

1. `frappe_appointment/api/personal_meet.py`
2. `frappe_appointment/api/group_meet.py`
3. `frappe_appointment/scheduler/doctype/eventtype/eventtype.py`
4. `frappe_appointment/scheduler/doctype/service/service.py`
5. `frappe_appointment/demo_data.py`
6. `frappe_appointment/sync_booking_urls.py`
7. `frappe_appointment/onboarding.py`
8. `frappe_appointment/frappe_appointment/doctype/organization/organization.py`
9. `frappe_appointment/scheduler/doctype/configuration_settings/configuration_settings.py`
10. `frappe_appointment/scheduler/doctype/location/location.py`
11. `frappe_appointment/scheduler/doctype/provider/provider.py`
12. `frappe_appointment/frappe_appointment/doctype/user_appointment_availability/user_appointment_availability.py`
13. `frappe_appointment/helpers/google_calendar.py`
14. `frappe_appointment/scheduler/doctype/booking_event/test_booking_event.py`
15. `frappe_appointment/frappe_appointment/doctype/appointment_group/appointment_group.py`
16. `frappe_appointment/overrides/event_override.py`
17. `frappe_appointment/frappe_appointment/doctype/appointment_time_slot/appointment_time_slot.py`
18. `frappe_appointment/tasks/verify_availability.py`
19. `frappe_appointment/tasks/reminder_google_calendar_auth.py`
20. `frappe_appointment/helpers/ics_file.py`
21. `frappe_appointment/overrides/leave_application_override.py`
22. `frappe_appointment/patches/v0_1/add_appointment_manager_role.py`
23. `frappe_appointment/__init__.py`

## Rollback Command

```bash
# Stop everything
pkill -f "bench start"

# Restore folders
cd /home/minte/projects/frappe-bench/apps
rm -rf scheduler
mv frappe_appointment_backup frappe_appointment

# Restore apps.json
echo '["frappe", "frappe_appointment"]' > ../sites/apps.json

# Restore database (if needed)
bench --site appointment.com restore /path/to/backup.sql.gz

# Reinstall
bench setup requirements
bench --site appointment.com migrate
bench build
```

---

**Use the full guide for detailed instructions!**




