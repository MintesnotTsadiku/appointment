# Quick Reference Card - Ethiopian Scheduler Development

> **For AI Agents**: This document contains complete setup status and console execution patterns. Use this as context in conversations.

---

## ✅ Setup Status (Everything Ready)

### Environment Configuration
- **Site Name**: `appointment.com`
- **Bench Path**: `/home/minte/projects/frappe-bench`
- **App Path**: `/home/minte/projects/frappe-bench/apps/appointment`
- **Status**: ✅ Fully configured and ready

### Installed & Configured
- ✅ Frappe Framework installed
- ✅ frappe-appointment app installed and migrated
- ✅ Database: MariaDB/MySQL connected
- ✅ Site: `appointment.com` active
- ✅ Developer mode: Can be enabled (see commands below)

### Available Scripts
- ✅ `scripts/explore_app.py` - Exploration script
- ✅ `scripts/create_test_data.py` - Test data creation

### Documentation Structure
- ✅ All docs organized in `docs/` folder
- ✅ Setup guides available
- ✅ Project planning docs ready

**Note for AI Agents**: When suggesting console commands, use the `<<<` syntax for non-interactive execution (see Console Execution section below).

---

## 🎯 Your Site Info
- **Site Name**: `appointment.com`
- **Bench Path**: `/home/minte/projects/frappe-bench`
- **Backend App Path**: `/home/minte/projects/frappe-bench/apps/appointment`
- **Frontend App Path**: `/home/minte/projects/frappe-bench/apps/appointment/frontend`

---

## ⚡ Essential Commands

### Bench Operations
```bash
# Navigate to bench
cd /home/minte/projects/frappe-bench

# Start bench (run all services)
bench start

# Restart services
bench restart

# Clear cache
bench --site appointment.com clear-cache

# Watch logs (in separate terminals)
tail -f sites/appointment.com/logs/web.error.log
tail -f sites/appointment.com/logs/worker.error.log
```

### Console Access - Two Methods

#### Method 1: Interactive Console (for manual exploration)
```bash
# Open Frappe console (interactive)
bench --site appointment.com console

# Then type Python code interactively
```

#### Method 2: Non-Interactive Execution (for scripts/AI agents)
```bash
# Execute Python code directly (recommended for AI agents)
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe

# Your Python code here
records = frappe.get_all('Appointment Group', fields=['name', 'group_name'])
print(f'Found {len(records)} appointment groups')
for r in records:
    print(f'  - {r.group_name}')
"

# Run script file
bench --site appointment.com console < apps/appointment/scripts/explore_app.py
```

**For AI Agents**: Always use Method 2 (`<<<` syntax) when generating commands. This allows non-interactive execution.

### Development Mode
```bash
# Enable developer mode (see code changes without restart)
bench --site appointment.com set-config developer_mode 1
bench --site appointment.com clear-cache

# Disable developer mode
bench --site appointment.com set-config developer_mode 0
```

### Database Operations
```bash
# Migrate (run database migrations)
bench --site appointment.com migrate

# Backup
bench --site appointment.com backup

# Restore
bench --site appointment.com restore [backup-file]

# Database console (MariaDB/MySQL)
bench --site appointment.com mariadb
```

### App Management
```bash
# List installed apps
bench --site appointment.com list-apps

# Create new app
bench new-app [app-name]

# Install app to site
bench --site appointment.com install-app [app-name]

# Uninstall app (careful!)
bench --site appointment.com uninstall-app [app-name]
```

### Build & Assets
```bash
# Build all apps
bench build

# Build specific app
bench build --app appointment

# Watch for changes (auto-rebuild)
bench watch
```

---

## 🔍 Frappe Console Execution (For AI Agents)

### Basic Execution Pattern

**Always use this format for non-interactive execution:**

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe

# Your code here
print('Hello from Frappe console')
"
```

### Common Database Operations

#### Query Records
```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe

# Get all records with fields
records = frappe.get_all('Appointment Group', 
    fields=['name', 'group_name', 'duration_for_event'],
    limit=10
)
print(f'Found {len(records)} appointment groups')
for r in records:
    print(f'  - {r.group_name}')

# Get single document
if records:
    doc = frappe.get_doc('Appointment Group', records[0].name)
    print(f'\\nFirst group details:')
    print(doc.as_dict())
"
```

#### Create Documents
```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe

# Create new document
doc = frappe.new_doc('Appointment Group')
doc.group_name = 'Test Session'
doc.duration_for_event = 1800  # 30 minutes
doc.meet_provider = 'Custom'
doc.meet_link = 'https://meet.example.com/test'

# Add child table rows
doc.append('members', {
    'user': 'Administrator',
    'mandatory': 1
})

# Insert to database
doc.insert()
print(f'Created: {doc.name}')
print(f'Booking URL: /schedule/appointment-group/{doc.name}')
"
```

#### Update Documents
```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe

# Get existing document
doc = frappe.get_doc('Appointment Group', 'name-here')
doc.group_name = 'Updated Name'
doc.save()
print(f'Updated: {doc.name}')
"
```

#### Check Existence & Count
```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe

# Check if record exists
exists = frappe.db.exists('Appointment Group', 'name-here')
print(f'Exists: {exists}')

# Count records
count = frappe.db.count('Event')
print(f'Total events: {count}')

# Get single value
group_name = frappe.db.get_value('Appointment Group', 'name-here', 'group_name')
print(f'Group name: {group_name}')
"
```

#### Raw SQL Queries
```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe

# Execute raw SQL
results = frappe.db.sql('''
    SELECT name, group_name, creation 
    FROM `tabAppointment Group` 
    ORDER BY creation DESC 
    LIMIT 10
''', as_dict=True)

print(f'Found {len(results)} records')
for r in results:
    print(f'  - {r.group_name} (created: {r.creation})')
"
```

### Metadata Inspection

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe

# Get doctype metadata
meta = frappe.get_meta('Appointment Group')
print(f'Doctype: {meta.name}')
print(f'Module: {meta.module}')
print(f'\\nFields ({len(meta.fields)}):')
for field in meta.fields[:10]:  # First 10 fields
    print(f'  - {field.fieldname} ({field.fieldtype})')

# Get all methods of a doctype class
doc = frappe.get_doc('Appointment Group', 'name-here')
methods = [m for m in dir(doc) if not m.startswith('_')]
print(f'\\nAvailable methods: {len(methods)}')
print(methods[:10])  # First 10 methods
"
```

### System Information

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe

# Current user
print(f'Current user: {frappe.session.user}')

# Site info
print(f'Site: {frappe.local.site}')

# System settings
settings = frappe.get_system_settings()
print(f'\\nSystem settings:')
print(f'  Enable file manager: {settings.enable_file_manager}')
print(f'  Enable scheduler: {settings.enable_scheduler}')

# Installed apps
apps = frappe.get_installed_apps()
print(f'\\nInstalled apps: {apps}')
"
```

### Creating Doctypes via Console

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe

# Create a new custom doctype
doctype = frappe.new_doc('DocType')
doctype.name = 'Test Doctype'
doctype.module = 'Appointment'
doctype.custom = 1
doctype.is_submittable = 0
doctype.istable = 0
doctype.autoname = 'naming_series:'
doctype.naming_rule = 'By \"Naming Series\"'

# Add naming series field
doctype.append('fields', {
    'fieldname': 'naming_series',
    'fieldtype': 'Select',
    'label': 'Naming Series',
    'options': 'TEST-.YYYY.-.#####',
    'reqd': 1
})

# Add title field
doctype.append('fields', {
    'fieldname': 'title',
    'fieldtype': 'Data',
    'label': 'Title',
    'reqd': 1
})

# Insert doctype
doctype.insert()
print(f'Created doctype: {doctype.name}')

# Reload metadata
frappe.reload_doctype('Test Doctype')
print('Doctype metadata reloaded')
"
```

### Error Handling Pattern

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe

try:
    # Your code here
    doc = frappe.get_doc('Appointment Group', 'non-existent')
    print('Document found')
except frappe.DoesNotExistError:
    print('Document does not exist')
except Exception as e:
    print(f'Error: {str(e)}')
    frappe.db.rollback()
"
```

### Bulk Operations

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe

# Process multiple records
groups = frappe.get_all('Appointment Group', fields=['name', 'group_name'])
print(f'Processing {len(groups)} appointment groups...')

for group in groups:
    doc = frappe.get_doc('Appointment Group', group.name)
    # Modify document
    # doc.some_field = 'new_value'
    # doc.save()
    print(f'  Processed: {group.group_name}')

print('Bulk operation complete')
"
```

---

## 🔍 Common Console Operations (Quick Reference)

### Quick Data Queries
```python
import frappe

# List all appointment groups
frappe.get_all("Appointment Group", 
    fields=["name", "group_name"], 
    limit=10)

# Get specific document
doc = frappe.get_doc("Appointment Group", "name-here")
print(doc.as_dict())

# Count records
frappe.db.count("Event")

# Check if record exists
frappe.db.exists("Appointment Group", "name-here")

# Get single value
frappe.db.get_value("Appointment Group", "name-here", "group_name")

# SQL query
frappe.db.sql("""
    SELECT name, group_name, creation 
    FROM `tabAppointment Group` 
    ORDER BY creation DESC 
    LIMIT 10
""", as_dict=True)
```

### Create Test Data
```python
import frappe

# Create appointment group
doc = frappe.get_doc({
    "doctype": "Appointment Group",
    "group_name": "Test Session",
    "duration_for_event": 1800,  # 30 minutes
    "meet_provider": "Custom",
    "members": [{"user": "Administrator"}]
})
doc.insert()
print(f"Created: {doc.name}")
```

### Debug & Inspection
```python
import frappe

# Get doctype metadata
meta = frappe.get_meta("Appointment Group")
print([f.fieldname for f in meta.fields])

# Get all methods of a doctype
doc = frappe.get_doc("Appointment Group", "name-here")
print([m for m in dir(doc) if not m.startswith('_')])

# Current user info
print(frappe.session.user)

# Site info
print(frappe.local.site)
print(frappe.conf)
```

---

## 🌐 Important URLs

### Admin/Desk
- **Login**: http://localhost:8000
- **Desk Home**: http://localhost:8000/app
- **Appointment Group List**: http://localhost:8000/app/appointment-group
- **Appointment Settings**: http://localhost:8000/app/appointment-settings
- **Google Settings**: http://localhost:8000/app/google-settings
- **User Availability**: http://localhost:8000/app/user-appointment-availability

### Public Booking Pages
- **Booking Page Format**: http://localhost:8000/schedule/appointment-group/[name]
- Example: http://localhost:8000/schedule/appointment-group/test-session

### API Endpoints (for testing)
- **Desk API Base**: http://localhost:8000/api/method/
- **Resources**: http://localhost:8000/api/resource/

---

## 📁 Key Directories

```
/home/minte/projects/frappe-bench/
├── apps/
│   └── appointment/
│       ├── appointment/          # Main Python code
│       │   ├── doctype/                 # Doctype definitions
│       │   ├── api/                     # API endpoints
│       │   ├── helpers/                 # Utility functions
│       │   ├── overrides/               # Doctype overrides
│       │   ├── tasks/                   # Scheduled jobs
│       │   └── www/                     # Web pages
│       ├── frontend/                    # Frontend code (React/Vue)
│       ├── docs/                        # Documentation
│       └── scripts/                     # Utility scripts
├── sites/
│   └── appointment.com/
│       ├── private/                     # Private files
│       ├── public/                      # Public files
│       ├── logs/                        # Log files
│       └── site_config.json             # Site configuration
└── config/
    └── pids/                            # Process IDs
```

---

## 🔐 Default Credentials

- **Username**: Administrator
- **Password**: Check your `.env` or `site_config.json`

---

## 🛠️ Troubleshooting

### Issue: Port already in use
```bash
# Find process using port 8000
lsof -i :8000

# Kill process
kill -9 [PID]

# Or stop bench properly
bench stop
```

### Issue: Assets not loading
```bash
bench build --app appointment
bench clear-cache
bench restart
```

### Issue: Permission denied
```bash
# Fix permissions
chmod -R 755 sites/appointment.com
```

### Issue: Database connection error
```bash
# Check if MariaDB is running
sudo systemctl status mariadb

# Start MariaDB
sudo systemctl start mariadb

# Restart bench
bench restart
```

### Issue: Module not found
```bash
# Reinstall apps
bench --site appointment.com migrate
bench restart
```

### Issue: Console execution fails
```bash
# Ensure you're in the correct directory
cd /home/minte/projects/frappe-bench

# Check site exists
ls sites/appointment.com

# Try with explicit path
bench --site appointment.com console <<< "import frappe; print('OK')"
```

---

## 📚 Development Workflow

### Daily Workflow
1. Start bench: `bench start`
2. Open console in another terminal: `bench --site appointment.com console`
3. Make code changes
4. If doctype changes: `bench --site appointment.com migrate`
5. If frontend changes: `bench build`
6. Test in browser
7. Commit changes

### Creating New Doctype
1. Use desk UI: http://localhost:8000/app/doctype/new
2. Or: Create JSON files in `[app]/[module]/doctype/[doctype_name]/`
3. Run: `bench --site appointment.com migrate`
4. Add controller: `[doctype_name].py` in same folder

### Adding New Module (within appointment)
1. Add module name to: `appointment/modules.txt`
2. Create directory: `appointment/[module_name]/`
3. Create `__init__.py` in module directory
4. Create subdirectories: `doctype/`, `api/`, `helpers/` as needed
5. Migrate: `bench --site appointment.com migrate`
6. Develop in: `appointment/[module_name]/`

---

## 🎓 Learning Resources

### Frappe Documentation
- **Framework**: https://frappeframework.com/docs
- **Doctypes**: https://frappeframework.com/docs/user/en/basics/doctypes
- **API**: https://frappeframework.com/docs/user/en/api

### frappe-appointment Specific
- **README**: `apps/appointment/README.md`
- **System Setup**: `apps/appointment/docs/technical/system_setup_guide.md`
- **Setup Guide**: `apps/appointment/docs/getting-started/SETUP_GUIDE.md`
- **Your PRD**: `apps/appointment/docs/planning/scheduling_platform_prd.md`
- **Implementation Plan**: `apps/appointment/docs/planning/scheduling_platform_implementation_plan_sprint_board.md`

---

## 🔄 Git Workflow

### Current Setup
```bash
cd /home/minte/projects/frappe-bench/apps/appointment

# Check current branch
git branch

# Create development branch
git checkout -b develop

# Push to remote
git push -u origin develop
```

### Feature Development
```bash
# Create feature branch
git checkout develop
git checkout -b feat/provider-doctype

# Make changes, then commit
git add .
git commit -m "feat: add Provider doctype"

# Push
git push origin feat/provider-doctype

# Merge to develop when done
git checkout develop
git merge feat/provider-doctype
```

---

## 🚀 Next Actions Checklist

Sprint 0 - Familiarization:
- [ ] Run exploration script: `bench --site appointment.com console < apps/appointment/scripts/explore_app.py`
- [ ] Setup Google Calendar: Follow `docs/getting-started/SETUP_GUIDE.md`
- [ ] Create test data: `bench --site appointment.com console < apps/appointment/scripts/create_test_data.py`
- [ ] Create test appointment group via UI
- [ ] Book a test appointment
- [ ] Review codebase structure
- [ ] Read through key files in `helpers/` and `api/`

Sprint 1 - Start Development:
- [ ] Create development branch: `git checkout -b develop`
- [ ] Create `scheduler` app: `bench new-app scheduler`
- [ ] Create `payments` app: `bench new-app payments`
- [ ] Create `channels` app: `bench new-app channels`
- [ ] Install apps to site
- [ ] Create first doctypes: Provider, Location, Service

---

## 💡 Pro Tips

1. **Keep Multiple Terminals Open**
   - Terminal 1: `bench start`
   - Terminal 2: `bench --site appointment.com console` (interactive)
   - Terminal 3: `tail -f logs`
   - Terminal 4: Git operations

2. **Use Developer Mode**
   - See errors in browser console
   - Reload forms without restarting
   - Access to Form Builder

3. **Console is Your Friend**
   - Faster than UI for testing
   - Direct database access
   - Test functions immediately
   - Use `<<<` syntax for non-interactive execution

4. **Version Control Everything**
   - Commit often
   - Use descriptive messages
   - Keep feature branches small

5. **Read Frappe Source Code**
   - Located in: `apps/frappe/frappe/`
   - Great learning resource
   - Understand framework patterns

---

## 🤖 For AI Agents - Key Patterns

### When Generating Console Commands

**Always use this format:**
```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe

# Your code here
"
```

### Common Patterns to Use

1. **Query Data**: `frappe.get_all()`, `frappe.get_doc()`
2. **Create Records**: `frappe.new_doc()`, `doc.insert()`
3. **Update Records**: `frappe.get_doc()`, modify, `doc.save()`
4. **Check Existence**: `frappe.db.exists()`
5. **Metadata**: `frappe.get_meta()`
6. **Error Handling**: Wrap in `try/except` blocks

### Important Notes

- Site name is always: `appointment.com`
- Bench path: `/home/minte/projects/frappe-bench`
- Always use `<<<` for non-interactive execution
- Import `frappe` at the start of every script
- Use `print()` for output/debugging
- Handle errors with try/except

---

**Last Updated**: 2025-11-14  
**Bookmark this page** for quick reference during development!  
**For AI Agents**: Use this document as context in conversations for accurate command generation.
