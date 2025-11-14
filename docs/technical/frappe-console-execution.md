# Frappe/ERPNext Console Code Execution Guide

## Overview

This document explains how to execute Python code within the Frappe/ERPNext framework using the console interface. This is particularly useful for AI agents that need to perform database operations, system configuration, or business logic execution within ERPNext.

## Table of Contents

1. [Basic Console Execution](#execution-method)
2. [Creating Doctypes via Console](#creating-doctypes-via-console)
3. [Updating Doctype JSON Files](#updating-doctype-json-files)
4. [Complete Doctype Creation Workflow](#complete-doctype-creation-workflow)
5. [Database Operations](#key-capabilities)
6. [Common Patterns](#common-patterns)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Execution Method

### Basic Syntax
```bash
cd /home/erpnext/frappe-bench && bench --site [site-name] console <<< "
# Your Python code here
"
```

### Example Command Structure
```bash
cd /home/erpnext/frappe-bench && bench --site fsa.acrossexpress.com console <<< "
import frappe

# Database operations
records = frappe.get_all('DocType', fields=['name'])
print(f'Found {len(records)} records')

# Create new document
doc = frappe.new_doc('DocType')
doc.field_name = 'value'
doc.insert()
print('Document created successfully')
"
```

## Creating Doctypes via Console

### Basic Doctype Creation

The most common use case is creating custom doctypes programmatically. Here's how to create a basic doctype:

```bash
cd /home/erpnext/frappe-bench && bench --site [site-name] console <<< "
import frappe

# Create a new doctype
doctype = frappe.new_doc('DocType')
doctype.name = 'Custom Doctype Name'
doctype.module = 'Your App Name'
doctype.custom = 1
doctype.is_submittable = 0  # Set to 1 for submittable doctypes
doctype.istable = 0  # Set to 1 for child tables
doctype.autoname = 'naming_series:'
doctype.naming_rule = 'By \"Naming Series\"'

# Add basic fields
doctype.append('fields', {
    'fieldname': 'naming_series',
    'fieldtype': 'Select',
    'label': 'Naming Series',
    'options': 'CUSTOM-.YYYY.-.#####',
    'reqd': 1
})

doctype.append('fields', {
    'fieldname': 'title',
    'fieldtype': 'Data',
    'label': 'Title',
    'reqd': 1
})

doctype.append('fields', {
    'fieldname': 'status',
    'fieldtype': 'Select',
    'label': 'Status',
    'options': 'Draft\\nActive\\nInactive',
    'default': 'Draft'
})

# Save the doctype
doctype.insert()
print(f'Created doctype: {doctype.name}')
"
```

### Creating Submittable Doctypes

For doctypes that need workflow (Draft → Submit → Cancel):

```bash
cd /home/erpnext/frappe-bench && bench --site [site-name] console <<< "
import frappe

# Create a submittable doctype
doctype = frappe.new_doc('DocType')
doctype.name = 'Moving Quote Request'
doctype.module = 'Mela Movers'
doctype.custom = 1
doctype.is_submittable = 1  # Enable submission workflow
doctype.istable = 0
doctype.autoname = 'naming_series:'
doctype.naming_rule = 'By \"Naming Series\"'

# Add naming series field
doctype.append('fields', {
    'fieldname': 'naming_series',
    'fieldtype': 'Select',
    'label': 'Naming Series',
    'options': 'MQR-.YYYY.-.#####',
    'reqd': 1
})

# Add basic fields
doctype.append('fields', {
    'fieldname': 'customer_name',
    'fieldtype': 'Data',
    'label': 'Customer Name',
    'reqd': 1
})

doctype.append('fields', {
    'fieldname': 'status',
    'fieldtype': 'Select',
    'label': 'Status',
    'options': 'Draft\\nSubmitted\\nApproved\\nRejected',
    'default': 'Draft',
    'reqd': 1
})

doctype.insert()
print(f'Created submittable doctype: {doctype.name}')
"
```

### Creating Child Table Doctypes

For child tables (istable=1):

```bash
cd /home/erpnext/frappe-bench && bench --site [site-name] console <<< "
import frappe

# Create a child table doctype
doctype = frappe.new_doc('DocType')
doctype.name = 'Moving Quote Special Item'
doctype.module = 'Mela Movers'
doctype.custom = 1
doctype.is_submittable = 0
doctype.istable = 1  # This makes it a child table
doctype.autoname = 'naming_series:'
doctype.naming_rule = 'By \"Naming Series\"'

# Add naming series field
doctype.append('fields', {
    'fieldname': 'naming_series',
    'fieldtype': 'Select',
    'label': 'Naming Series',
    'options': 'MQS-.YYYY.-.#####',
    'reqd': 1
})

# Add child table fields
doctype.append('fields', {
    'fieldname': 'item_type',
    'fieldtype': 'Select',
    'label': 'Item Type',
    'options': 'Piano\\nPool Table\\nSafe\\nArtwork\\nAntiques\\nGym Equipment',
    'reqd': 1
})

doctype.append('fields', {
    'fieldname': 'quantity',
    'fieldtype': 'Int',
    'label': 'Quantity',
    'default': 1
})

doctype.append('fields', {
    'fieldname': 'unit_price',
    'fieldtype': 'Currency',
    'label': 'Unit Price'
})

doctype.insert()
print(f'Created child table doctype: {doctype.name}')
"
```

### Creating Field-Based Naming Doctypes

For doctypes that use field values as names:

```bash
cd /home/erpnext/frappe-bench && bench --site [site-name] console <<< "
import frappe

# Create a doctype with field-based naming
doctype = frappe.new_doc('DocType')
doctype.name = 'Property Type'
doctype.module = 'Mela Movers'
doctype.custom = 1
doctype.is_submittable = 0
doctype.istable = 0
doctype.naming_rule = 'By fieldname'
doctype.autoname = 'field:property_name'  # Use field value as name
doctype.title_field = 'property_name'  # Field to display as title

# Add the naming field
doctype.append('fields', {
    'fieldname': 'property_name',
    'fieldtype': 'Data',
    'label': 'Property Name',
    'reqd': 1
})

# Add other fields
doctype.append('fields', {
    'fieldname': 'is_active',
    'fieldtype': 'Check',
    'label': 'Is Active',
    'default': 1
})

doctype.append('fields', {
    'fieldname': 'sort_order',
    'fieldtype': 'Int',
    'label': 'Sort Order',
    'default': 0
})

doctype.insert()
print(f'Created field-based naming doctype: {doctype.name}')
"
```

## Updating Doctype JSON Files

After creating a doctype via console, you typically need to update the JSON file to add more fields, permissions, and configurations.

### JSON File Structure

The doctype JSON file is located at:
```
/apps/your_app/your_app/doctype/doctype_name/doctype_name.json
```

### Common JSON Updates

#### 1. Adding Permissions

```json
{
  "permissions": [
    {
      "create": 1,
      "delete": 1,
      "email": 1,
      "export": 1,
      "print": 1,
      "read": 1,
      "report": 1,
      "role": "System Manager",
      "share": 1,
      "write": 1
    }
  ]
}
```

#### 2. Adding Sections and Fields

```json
{
  "field_order": [
    "naming_series",
    "Section Break-1",
    "customer_name",
    "email",
    "phone",
    "Column Break-2",
    "status",
    "Section Break-3",
    "pricing_details"
  ],
  "fields": [
    {
      "fieldname": "naming_series",
      "fieldtype": "Select",
      "label": "Naming Series",
      "options": "CUST-.YYYY.-.#####",
      "reqd": 1
    },
    {
      "fieldname": "Section Break-1",
      "fieldtype": "Section Break",
      "label": "Customer Information"
    },
    {
      "fieldname": "customer_name",
      "fieldtype": "Data",
      "label": "Customer Name",
      "reqd": 1
    },
    {
      "fieldname": "email",
      "fieldtype": "Data",
      "label": "Email",
      "options": "Email"
    },
    {
      "fieldname": "phone",
      "fieldtype": "Data",
      "label": "Phone",
      "reqd": 1
    },
    {
      "fieldname": "Column Break-2",
      "fieldtype": "Column Break"
    },
    {
      "fieldname": "status",
      "fieldtype": "Select",
      "label": "Status",
      "options": "Active\\nInactive",
      "default": "Active"
    },
    {
      "fieldname": "Section Break-3",
      "fieldtype": "Section Break",
      "label": "Pricing Details"
    },
    {
      "fieldname": "pricing_details",
      "fieldtype": "Table",
      "label": "Pricing Details",
      "options": "Pricing Detail"
    }
  ]
}
```

#### 3. Adding Child Table Links

```json
{
  "fields": [
    {
      "fieldname": "special_items",
      "fieldtype": "Table",
      "label": "Special Items",
      "options": "Moving Quote Special Item"
    },
    {
      "fieldname": "room_images",
      "fieldtype": "Table",
      "label": "Room Images",
      "options": "Moving Quote Room Image"
    }
  ]
}
```

#### 4. Adding Calculated Fields

```json
{
  "fields": [
    {
      "fieldname": "total_rooms",
      "fieldtype": "Int",
      "label": "Total Rooms",
      "read_only": 1,
      "depends_on": "eval:doc.bedroom_count || doc.living_room_count"
    },
    {
      "fieldname": "estimated_total",
      "fieldtype": "Currency",
      "label": "Estimated Total",
      "read_only": 1,
      "depends_on": "eval:doc.base_price || doc.distance_charge"
    }
  ]
}
```

#### 5. Adding Field Dependencies and Validations

```json
{
  "fields": [
    {
      "fieldname": "move_type",
      "fieldtype": "Select",
      "label": "Move Type",
      "options": "Residential\\nCommercial",
      "reqd": 1
    },
    {
      "fieldname": "property_type",
      "fieldtype": "Select",
      "label": "Property Type",
      "options": "Apartment\\nHouse\\nCondo\\nOffice\\nWarehouse",
      "depends_on": "move_type"
    },
    {
      "fieldname": "floor_level",
      "fieldtype": "Select",
      "label": "Floor Level",
      "options": "Ground\\n1-2 Floors\\n3-5 Floors\\n6+ Floors\\nElevator",
      "depends_on": "property_type"
    }
  ]
}
```

### Complete JSON File Example

Here's a complete example of a doctype JSON file:

```json
{
  "actions": [],
  "allow_rename": 1,
  "naming_rule": "By fieldname",
  "autoname": "field:customer_name",
  "creation": "2025-10-22 18:07:42.794769",
  "doctype": "DocType",
  "editable_grid": 1,
  "engine": "InnoDB",
  "field_order": [
    "naming_series",
    "Section Break-1",
    "customer_name",
    "email",
    "phone",
    "Column Break-2",
    "status",
    "total_bookings",
    "Section Break-3",
    "notes"
  ],
  "fields": [
    {
      "fieldname": "naming_series",
      "fieldtype": "Select",
      "label": "Naming Series",
      "options": "CUST-.YYYY.-.#####",
      "reqd": 1
    },
    {
      "fieldname": "Section Break-1",
      "fieldtype": "Section Break",
      "label": "Customer Information"
    },
    {
      "fieldname": "customer_name",
      "fieldtype": "Data",
      "label": "Customer Name",
      "reqd": 1
    },
    {
      "fieldname": "email",
      "fieldtype": "Data",
      "label": "Email",
      "options": "Email"
    },
    {
      "fieldname": "phone",
      "fieldtype": "Data",
      "label": "Phone",
      "reqd": 1
    },
    {
      "fieldname": "Column Break-2",
      "fieldtype": "Column Break"
    },
    {
      "fieldname": "status",
      "fieldtype": "Select",
      "label": "Status",
      "options": "Active\\nInactive",
      "default": "Active"
    },
    {
      "fieldname": "total_bookings",
      "fieldtype": "Int",
      "label": "Total Bookings",
      "read_only": 1,
      "default": 0
    },
    {
      "fieldname": "Section Break-3",
      "fieldtype": "Section Break",
      "label": "Additional Information"
    },
    {
      "fieldname": "notes",
      "fieldtype": "Text Editor",
      "label": "Notes"
    }
  ],
  "index_web_pages_for_search": 1,
  "links": [],
  "modified": "2025-10-22 18:07:42.794769",
  "modified_by": "Administrator",
  "module": "Mela Movers",
  "name": "Service Customer",
  "owner": "Administrator",
  "permissions": [
    {
      "create": 1,
      "delete": 1,
      "email": 1,
      "export": 1,
      "print": 1,
      "read": 1,
      "report": 1,
      "role": "System Manager",
      "share": 1,
      "write": 1
    }
  ],
  "row_format": "Dynamic",
  "sort_field": "creation",
  "sort_order": "DESC",
  "states": [],
  "title_field": "customer_name",
  "track_changes": 1
}
```

## Complete Doctype Creation Workflow

### Step 1: Create Basic Doctype via Console

```bash
cd /home/erpnext/frappe-bench && bench --site [site-name] console <<< "
import frappe

# Create the doctype
doctype = frappe.new_doc('DocType')
doctype.name = 'Service Customer'
doctype.module = 'Mela Movers'
doctype.custom = 1
doctype.is_submittable = 0
doctype.istable = 0
doctype.autoname = 'naming_series:'
doctype.naming_rule = 'By \"Naming Series\"'

# Add minimal fields
doctype.append('fields', {
    'fieldname': 'naming_series',
    'fieldtype': 'Select',
    'label': 'Naming Series',
    'options': 'CUST-.YYYY.-.#####',
    'reqd': 1
})

doctype.append('fields', {
    'fieldname': 'customer_name',
    'fieldtype': 'Data',
    'label': 'Customer Name',
    'reqd': 1
})

doctype.insert()
print(f'Created doctype: {doctype.name}')
"
```

### Step 2: Update JSON File

Edit the JSON file to add all required fields, permissions, and configurations.

### Step 3: Reload Doctype Metadata

```bash
cd /home/erpnext/frappe-bench && bench --site [site-name] console <<< "
import frappe

# Reload the doctype to apply JSON changes
frappe.reload_doctype('Service Customer')
print('Doctype metadata reloaded')
"
```

### Step 4: Test the Doctype

```bash
cd /home/erpnext/frappe-bench && bench --site [site-name] console <<< "
import frappe

# Test creating a record
doc = frappe.new_doc('Service Customer')
doc.customer_name = 'Test Customer'
doc.email = 'test@example.com'
doc.phone = '+1234567890'
doc.insert()
print(f'Created test record: {doc.name}')

# Clean up
frappe.delete_doc('Service Customer', doc.name)
print('Test record cleaned up')
"
```

## Field Types and Configurations

### Common Field Types

#### 1. Data Fields
```json
{
  "fieldname": "customer_name",
  "fieldtype": "Data",
  "label": "Customer Name",
  "reqd": 1,
  "options": "Email",  // For email validation
  "unique": 1,  // For unique values
  "length": 100  // Character limit
}
```

#### 2. Select Fields
```json
{
  "fieldname": "status",
  "fieldtype": "Select",
  "label": "Status",
  "options": "Draft\\nSubmitted\\nApproved\\nRejected",
  "default": "Draft",
  "reqd": 1
}
```

#### 3. Link Fields
```json
{
  "fieldname": "customer",
  "fieldtype": "Link",
  "label": "Customer",
  "options": "Service Customer",
  "reqd": 1
}
```

#### 4. Table Fields (Child Tables)
```json
{
  "fieldname": "special_items",
  "fieldtype": "Table",
  "label": "Special Items",
  "options": "Moving Quote Special Item"
}
```

#### 5. Currency Fields
```json
{
  "fieldname": "total_amount",
  "fieldtype": "Currency",
  "label": "Total Amount",
  "default": 0,
  "precision": 2
}
```

#### 6. Date and Time Fields
```json
{
  "fieldname": "move_date",
  "fieldtype": "Date",
  "label": "Move Date",
  "reqd": 1
},
{
  "fieldname": "created_time",
  "fieldtype": "Datetime",
  "label": "Created Time",
  "read_only": 1
}
```

#### 7. Check Fields (Boolean)
```json
{
  "fieldname": "is_active",
  "fieldtype": "Check",
  "label": "Is Active",
  "default": 1
}
```

#### 8. Text Fields
```json
{
  "fieldname": "description",
  "fieldtype": "Small Text",
  "label": "Description",
  "length": 200
},
{
  "fieldname": "notes",
  "fieldtype": "Text Editor",
  "label": "Notes"
}
```

#### 9. Attach Fields
```json
{
  "fieldname": "document",
  "fieldtype": "Attach",
  "label": "Document"
},
{
  "fieldname": "photo",
  "fieldtype": "Attach Image",
  "label": "Photo"
}
```

#### 10. Section and Column Breaks
```json
{
  "fieldname": "Section Break-1",
  "fieldtype": "Section Break",
  "label": "Customer Information"
},
{
  "fieldname": "Column Break-1",
  "fieldtype": "Column Break"
}
```

### Field Properties

#### Common Properties
- `fieldname`: Unique identifier for the field
- `fieldtype`: Type of field (Data, Select, Link, etc.)
- `label`: Display label for the field
- `reqd`: Required field (1 or 0)
- `read_only`: Read-only field (1 or 0)
- `default`: Default value
- `depends_on`: Field dependencies
- `mandatory_depends_on`: Mandatory dependencies
- `options`: Options for Select/Link fields
- `length`: Character limit for text fields
- `precision`: Decimal places for currency/float fields

#### Advanced Properties
- `unique`: Unique constraint (1 or 0)
- `ignore_user_permissions`: Ignore user permissions (1 or 0)
- `allow_on_submit`: Allow editing after submit (1 or 0)
- `bold`: Bold text (1 or 0)
- `collapsible`: Collapsible section (1 or 0)
- `collapsible_depends_on`: When to collapse
- `print_hide`: Hide in print (1 or 0)
- `print_hide_if_no_value`: Hide if no value (1 or 0)

### Field Dependencies

#### Simple Dependencies
```json
{
  "fieldname": "property_type",
  "fieldtype": "Select",
  "label": "Property Type",
  "depends_on": "move_type"
}
```

#### Complex Dependencies
```json
{
  "fieldname": "floor_level",
  "fieldtype": "Select",
  "label": "Floor Level",
  "depends_on": "eval:doc.move_type == 'Residential' && doc.property_type"
}
```

#### Mandatory Dependencies
```json
{
  "fieldname": "delivery_address",
  "fieldtype": "Small Text",
  "label": "Delivery Address",
  "mandatory_depends_on": "eval:doc.pickup_address"
}
```

## Key Capabilities

### 1. Database Operations
- **Query Records**: `frappe.get_all()`, `frappe.get_list()`
- **Create Documents**: `frappe.new_doc()`
- **Update Records**: `frappe.get_doc()`, modify, `doc.save()`
- **Check Existence**: `frappe.db.exists()`
- **Raw SQL**: `frappe.db.sql()`

### 2. Metadata Inspection
- **Field Definitions**: `frappe.get_meta('DocType')`
- **System Information**: `frappe.get_system_settings()`
- **User Context**: `frappe.get_user()`

### 3. Business Logic Execution
- **Workflow Operations**: Trigger workflows, approvals
- **Custom Functions**: Execute custom Python functions
- **Data Validation**: Business rule enforcement
- **System Configuration**: Setup and maintenance tasks

## Python Controllers and Business Logic

### Creating Python Controllers

After creating a doctype, you typically need to add a Python controller file for business logic:

**File Location:** `/apps/your_app/your_app/doctype/doctype_name/doctype_name.py`

### Basic Controller Structure

```python
import frappe
from frappe.model.document import Document

class ServiceCustomer(Document):
    def before_insert(self):
        """Called before inserting a new document"""
        if not self.referral_code:
            self.referral_code = self.generate_referral_code()
    
    def before_save(self):
        """Called before saving the document"""
        self.validate_phone_number()
        self.calculate_totals()
    
    def validate(self):
        """Called during validation"""
        if not self.email and not self.phone:
            frappe.throw("Either email or phone is required")
    
    def on_submit(self):
        """Called when document is submitted"""
        self.update_customer_status()
    
    def on_cancel(self):
        """Called when document is cancelled"""
        self.revert_customer_status()
    
    def generate_referral_code(self):
        """Generate unique referral code"""
        import random
        import string
        
        while True:
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            if not frappe.db.exists("Service Customer", {"referral_code": code}):
                return code
    
    def validate_phone_number(self):
        """Validate phone number format"""
        if self.phone and not self.phone.startswith('+'):
            frappe.throw("Phone number must start with country code (e.g., +1234567890)")
    
    def calculate_totals(self):
        """Calculate customer totals"""
        if not self.total_bookings:
            self.total_bookings = 0
        if not self.total_spent:
            self.total_spent = 0
    
    def update_customer_status(self):
        """Update customer status on submit"""
        self.status = "Active"
    
    def revert_customer_status(self):
        """Revert customer status on cancel"""
        self.status = "Inactive"
```

### Common Controller Methods

#### 1. Validation Methods
```python
def validate(self):
    """Main validation method"""
    self.validate_required_fields()
    self.validate_data_format()
    self.validate_business_rules()

def validate_required_fields(self):
    """Validate required fields"""
    if not self.customer_name:
        frappe.throw("Customer Name is required")

def validate_data_format(self):
    """Validate data format"""
    if self.email and "@" not in self.email:
        frappe.throw("Invalid email format")

def validate_business_rules(self):
    """Validate business rules"""
    if self.total_spent < 0:
        frappe.throw("Total spent cannot be negative")
```

#### 2. Calculation Methods
```python
def calculate_totals(self):
    """Calculate totals"""
    self.total_rooms = (
        (self.bedroom_count or 0) +
        (self.living_room_count or 0) +
        (self.kitchen_count or 0) +
        (self.bathroom_count or 0) +
        (self.office_count or 0) +
        (self.storage_count or 0)
    )

def calculate_pricing(self):
    """Calculate pricing"""
    self.base_price = self.calculate_base_price()
    self.distance_charge = self.calculate_distance_charge()
    self.floor_charge = self.calculate_floor_charge()
    self.timing_charge = self.calculate_timing_charge()
    self.special_items_charge = self.calculate_special_items_charge()
    
    self.estimated_total = (
        self.base_price +
        self.distance_charge +
        self.floor_charge +
        self.timing_charge +
        self.special_items_charge
    )
    
    # Use manual override if set
    if self.manual_override_price:
        self.final_quote_amount = self.manual_override_price
    else:
        self.final_quote_amount = self.estimated_total
```

#### 3. Auto-creation Methods
```python
def auto_create_customer(self):
    """Auto-create customer if not exists"""
    if not self.customer and self.phone:
        # Check if customer exists by phone
        existing_customer = frappe.db.exists("Service Customer", {"phone": self.phone})
        
        if existing_customer:
            self.customer = existing_customer
        else:
            # Create new customer
            customer = frappe.new_doc("Service Customer")
            customer.customer_name = self.customer_name
            customer.email = self.email
            customer.phone = self.phone
            customer.insert()
            self.customer = customer.name
```

#### 4. Workflow Methods
```python
def create_booking(self):
    """Convert quote to booking"""
    if self.status != "Approved":
        frappe.throw("Only approved quotes can be converted to bookings")
    
    booking = frappe.new_doc("Moving Booking")
    booking.quote_request = self.name
    booking.customer = self.customer
    booking.scheduled_date = self.move_date
    booking.quoted_amount = self.final_quote_amount
    booking.insert()
    
    # Update quote status
    self.status = "Converted"
    self.save(ignore_permissions=True)
    
    return booking.name
```

### Testing Controllers via Console

```bash
cd /home/erpnext/frappe-bench && bench --site [site-name] console <<< "
import frappe

# Test creating a document with business logic
doc = frappe.new_doc('Service Customer')
doc.customer_name = 'Test Customer'
doc.email = 'test@example.com'
doc.phone = '+1234567890'

# The before_insert hook will generate referral_code
doc.insert()
print(f'Created customer: {doc.name}')
print(f'Referral code: {doc.referral_code}')

# Test validation
try:
    doc.email = 'invalid-email'
    doc.save()
except Exception as e:
    print(f'Validation error: {str(e)}')

# Clean up
frappe.delete_doc('Service Customer', doc.name)
"
```

## Common Patterns

### Document Creation
```python
# Create new document
doc = frappe.new_doc('Funding Allocation Rule')
doc.rule_for = 'Department'
doc.department = 'Operations'
doc.valid_from = '2025-01-01'
doc.valid_to = '2025-12-31'

# Add child records
doc.append('lines', {
    'funding_source': 'FS-001',
    'percent': 60
})

# Save to database
doc.insert()
```

### Data Querying
```python
# Get all records with specific fields
records = frappe.get_all('DocType', 
    fields=['name', 'field1', 'field2'],
    filters={'status': 'Active'}
)

# Check if record exists
exists = frappe.db.exists('DocType', {'name': 'specific-record'})
```

### Metadata Inspection
```python
# Get field information
meta = frappe.get_meta('DocType')
for field in meta.fields:
    print(f'{field.fieldname}: {field.fieldtype} (required: {field.reqd})')
```

### Bulk Operations
```python
# Process multiple records
records = frappe.get_all('DocType', fields=['name'])
for record in records:
    doc = frappe.get_doc('DocType', record.name)
    # Modify document
    doc.save()
```

## Use Cases

### 1. Data Migration
- Import data from external systems
- Transform existing data structures
- Bulk updates and corrections

### 2. System Setup
- Initialize configuration records
- Create master data
- Set up business rules and workflows

### 3. Maintenance Tasks
- Data cleanup and validation
- Performance optimization
- System health checks

### 4. Business Process Automation
- Complex calculations
- Automated approvals
- Integration workflows

## Safety Considerations

### 1. Development First
- Always test code in development environment
- Use staging sites for complex operations
- Validate logic before production execution

### 2. Transaction Management
- Frappe automatically wraps operations in transactions
- Use `frappe.db.commit()` for explicit commits
- Handle rollbacks with `frappe.db.rollback()`

### 3. Error Handling
```python
try:
    # Your code here
    doc.insert()
    print("Success")
except Exception as e:
    print(f"Error: {str(e)}")
    frappe.db.rollback()
```

### 4. Data Validation
- Always validate data before insertion
- Check for required fields
- Verify business rules compliance

## Best Practices

### 1. Code Organization
- Use clear variable names
- Add comments for complex logic
- Break large operations into smaller functions

### 2. Performance
- Use `frappe.get_all()` for bulk queries
- Avoid nested loops with database calls
- Use `frappe.db.sql()` for complex queries

### 3. Logging
- Use `print()` statements for progress tracking
- Log important operations and results
- Include timestamps for long-running processes

### 4. Testing
- Test with small datasets first
- Verify results after execution
- Have rollback procedures ready

## Example: Complete Workflow

```bash
cd /home/erpnext/frappe-bench && bench --site fsa.acrossexpress.com console <<< "
import frappe

print('=== Starting Data Setup Process ===')

# 1. Check system status
print('Checking system status...')
user = frappe.get_user()
print(f'Running as: {user}')

# 2. Get metadata
print('\\nInspecting document structure...')
meta = frappe.get_meta('Funding Allocation Rule')
print(f'Fields in Funding Allocation Rule: {len(meta.fields)}')

# 3. Query existing data
print('\\nChecking existing records...')
existing = frappe.get_all('Funding Allocation Rule', fields=['name'])
print(f'Found {len(existing)} existing rules')

# 4. Create new records
print('\\nCreating new records...')
if not frappe.db.exists('Funding Allocation Rule', {'name': 'test-rule'}):
    doc = frappe.new_doc('Funding Allocation Rule')
    doc.rule_for = 'Department'
    doc.department = 'Test Department'
    doc.insert()
    print('✅ Record created successfully')
else:
    print('ℹ️  Record already exists')

print('\\n=== Process Complete ===')
"
```

## Troubleshooting

### Common Doctype Creation Issues

#### 1. Naming Series Errors
```
ValidationError: Fieldname called naming_series must exist to enable autonaming
```
**Solution:** Always add a naming_series field when using autoname:
```python
doctype.append('fields', {
    'fieldname': 'naming_series',
    'fieldtype': 'Select',
    'label': 'Naming Series',
    'options': 'CUST-.YYYY.-.#####',
    'reqd': 1
})
```

#### 2. Field-Based Naming Not Working
```
Records still use naming series instead of field values
```
**Solution:** Reload doctype metadata after JSON changes:
```python
frappe.reload_doctype('Doctype Name')
```

#### 3. Permission Errors
```
PermissionError: Not allowed to create DocType
```
**Solution:** Ensure user has System Manager role or create doctype via console with proper permissions.

#### 4. Child Table Link Errors
```
ValidationError: Could not find Row #1: Doctype: Child Table Name
```
**Solution:** Create child table doctype first, then link it in parent doctype.

#### 5. Field Dependencies Not Working
```
Field dependencies not triggering
```
**Solution:** Check field names match exactly and use proper dependency syntax:
```json
{
  "depends_on": "eval:doc.parent_field == 'value'"
}
```

### Common Issues
1. **Permission Errors**: Ensure user has appropriate roles
2. **Field Validation**: Check required fields and data types
3. **Transaction Conflicts**: Use proper commit/rollback handling
4. **Memory Issues**: Process large datasets in batches
5. **Metadata Caching**: Reload doctypes after JSON changes
6. **Naming Conflicts**: Check for duplicate field names or doctype names

### Debugging Tips
- Use `print()` statements liberally
- Check `frappe.log_error()` for detailed error logs
- Use `frappe.db.sql()` to inspect database state
- Test individual components before full execution
- Use `frappe.get_meta('Doctype Name')` to check doctype configuration
- Verify JSON syntax with online JSON validators
- Check Frappe logs in `/home/erpnext/frappe-bench/logs/`

### Doctype Creation Checklist

#### Before Creating Doctype
- [ ] Plan field structure and relationships
- [ ] Decide on naming strategy (series vs field-based)
- [ ] Identify required vs optional fields
- [ ] Plan field dependencies and validations

#### During Console Creation
- [ ] Create doctype with minimal required fields
- [ ] Add naming_series field if using autoname
- [ ] Set proper module and custom flags
- [ ] Test basic creation before proceeding

#### After JSON Updates
- [ ] Validate JSON syntax
- [ ] Add all required fields and sections
- [ ] Set proper permissions
- [ ] Add field dependencies
- [ ] Reload doctype metadata
- [ ] Test field functionality

#### Testing Phase
- [ ] Create test records
- [ ] Test all field validations
- [ ] Test field dependencies
- [ ] Test business logic in controllers
- [ ] Test permissions for different roles
- [ ] Clean up test data

## Conclusion

Frappe console execution provides a powerful way to interact with ERPNext data and business logic. When used properly with appropriate safety measures, it enables efficient system administration, data management, and business process automation.

Remember to always test thoroughly and maintain proper error handling for production environments.
