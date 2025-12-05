"""
Assistants Module API Endpoints
Provides CRUD operations for Virtual Assistants, Client Profiles, and Assignments
"""

import frappe
from frappe import _
from frappe.utils import cint, flt, nowdate, now_datetime, get_datetime


# =====================================================
# VA PROFILE CRUD OPERATIONS
# =====================================================

@frappe.whitelist()
def create_va_profile(data):
    """
    Create a new VA Profile
    
    Args:
        data: Dictionary or JSON string containing VA Profile data
            {
                "full_name": str (required),
                "email": str (required),
                "phone": str (optional),
                "status": str (optional, default: "active"),
                "timezone": str (optional),
                "languages": list (optional, [{"language": "en", "proficiency": "fluent"}])
            }
    
    Returns:
        dict: Created VA Profile data with name
    """
    try:
        if isinstance(data, str):
            data = frappe.parse_json(data)
        
        # Validate required fields
        if not data.get("full_name"):
            frappe.throw(_("Full Name is required"))
        if not data.get("email"):
            frappe.throw(_("Email is required"))
        
        # Create VA Profile document
        va_profile = frappe.new_doc("VA Profile")
        va_profile.full_name = data.get("full_name")
        va_profile.email = data.get("email")
        va_profile.phone = data.get("phone", "")
        va_profile.status = data.get("status", "active")
        va_profile.timezone = data.get("timezone", "UTC")
        
        # Add languages if provided
        if data.get("languages"):
            for lang in data.get("languages", []):
                va_profile.append("languages", {
                    "language": lang.get("language"),
                    "proficiency": lang.get("proficiency", "basic")
                })
        
        va_profile.insert()
        frappe.db.commit()
        
        return {
            "success": True,
            "message": _("VA Profile created successfully"),
            "data": va_profile.as_dict()
        }
    
    except Exception as e:
        frappe.log_error(f"Error creating VA Profile: {str(e)}", "Assistant API: Create VA Profile")
        frappe.throw(_(f"Failed to create VA Profile: {str(e)}"))


@frappe.whitelist()
def get_va_profile(va_name, fields=None):
    """
    Get a single VA Profile by name
    
    Args:
        va_name: Name of the VA Profile
        fields: Optional comma-separated list of fields to return
    
    Returns:
        dict: VA Profile data
    """
    try:
        if not frappe.db.exists("VA Profile", va_name):
            frappe.throw(_("VA Profile not found"))
        
        if fields:
            field_list = [f.strip() for f in fields.split(",")]
            va_profile = frappe.get_doc("VA Profile", va_name)
            return {
                "success": True,
                "data": {field: getattr(va_profile, field, None) for field in field_list if hasattr(va_profile, field)}
            }
        else:
            va_profile = frappe.get_doc("VA Profile", va_name)
            return {
                "success": True,
                "data": va_profile.as_dict()
            }
    
    except Exception as e:
        frappe.log_error(f"Error getting VA Profile: {str(e)}", "Assistant API: Get VA Profile")
        frappe.throw(_(f"Failed to get VA Profile: {str(e)}"))


@frappe.whitelist()
def list_va_profiles(filters=None, fields=None, page_length=20, page_start=0, order_by="modified desc"):
    """
    List VA Profiles with filtering and pagination
    
    Args:
        filters: Dictionary or JSON string with filters
        fields: Optional comma-separated list of fields to return
        page_length: Number of records per page (default: 20)
        page_start: Starting record index (default: 0)
        order_by: Sort order (default: "modified desc")
    
    Returns:
        dict: List of VA Profiles with pagination info
    """
    try:
        if isinstance(filters, str):
            filters = frappe.parse_json(filters)
        if filters is None:
            filters = {}
        
        # Get field list
        field_list = None
        if fields:
            field_list = [f.strip() for f in fields.split(",")]
        
        # Build query
        va_profiles = frappe.get_list(
            "VA Profile",
            filters=filters,
            fields=field_list or ["name", "full_name", "email", "phone", "status", "modified"],
            limit_start=cint(page_start),
            limit_page_length=cint(page_length),
            order_by=order_by
        )
        
        total_count = frappe.db.count("VA Profile", filters=filters)
        
        return {
            "success": True,
            "data": va_profiles,
            "total": total_count,
            "page_start": cint(page_start),
            "page_length": cint(page_length)
        }
    
    except Exception as e:
        frappe.log_error(f"Error listing VA Profiles: {str(e)}", "Assistant API: List VA Profiles")
        frappe.throw(_(f"Failed to list VA Profiles: {str(e)}"))


@frappe.whitelist()
def update_va_profile(va_name, data):
    """
    Update an existing VA Profile
    
    Args:
        va_name: Name of the VA Profile to update
        data: Dictionary or JSON string with fields to update
    
    Returns:
        dict: Updated VA Profile data
    """
    try:
        if isinstance(data, str):
            data = frappe.parse_json(data)
        
        if not frappe.db.exists("VA Profile", va_name):
            frappe.throw(_("VA Profile not found"))
        
        va_profile = frappe.get_doc("VA Profile", va_name)
        
        # Update fields
        updatable_fields = ["full_name", "email", "phone", "status", "timezone"]
        
        for field in updatable_fields:
            if field in data:
                setattr(va_profile, field, data[field])
        
        # Update languages if provided
        if "languages" in data:
            va_profile.languages = []
            for lang in data.get("languages", []):
                va_profile.append("languages", {
                    "language": lang.get("language"),
                    "proficiency": lang.get("proficiency", "basic")
                })
        
        va_profile.save()
        frappe.db.commit()
        
        return {
            "success": True,
            "message": _("VA Profile updated successfully"),
            "data": va_profile.as_dict()
        }
    
    except Exception as e:
        frappe.log_error(f"Error updating VA Profile: {str(e)}", "Assistant API: Update VA Profile")
        frappe.throw(_(f"Failed to update VA Profile: {str(e)}"))


@frappe.whitelist()
def delete_va_profile(va_name):
    """
    Delete a VA Profile
    
    Args:
        va_name: Name of the VA Profile to delete
    
    Returns:
        dict: Success message
    """
    try:
        if not frappe.db.exists("VA Profile", va_name):
            frappe.throw(_("VA Profile not found"))
        
        frappe.delete_doc("VA Profile", va_name, force=1)
        frappe.db.commit()
        
        return {
            "success": True,
            "message": _("VA Profile deleted successfully")
        }
    
    except Exception as e:
        frappe.log_error(f"Error deleting VA Profile: {str(e)}", "Assistant API: Delete VA Profile")
        frappe.throw(_(f"Failed to delete VA Profile: {str(e)}"))


# =====================================================
# CLIENT PROFILE CRUD OPERATIONS
# =====================================================

@frappe.whitelist()
def create_client_profile(data):
    """
    Create a new Client Profile
    
    Args:
        data: Dictionary or JSON string containing Client Profile data
            {
                "full_name": str (required),
                "email": str (required),
                "phone": str (optional),
                "status": str (optional, default: "active"),
                "timezone": str (optional)
            }
    
    Returns:
        dict: Created Client Profile data with name
    """
    try:
        if isinstance(data, str):
            data = frappe.parse_json(data)
        
        # Validate required fields
        if not data.get("full_name"):
            frappe.throw(_("Full Name is required"))
        if not data.get("email"):
            frappe.throw(_("Email is required"))
        
        # Create Client Profile document
        client_profile = frappe.new_doc("Client Profile")
        client_profile.full_name = data.get("full_name")
        client_profile.email = data.get("email")
        client_profile.phone = data.get("phone", "")
        client_profile.status = data.get("status", "active")
        client_profile.timezone = data.get("timezone", "UTC")
        
        client_profile.insert()
        frappe.db.commit()
        
        return {
            "success": True,
            "message": _("Client Profile created successfully"),
            "data": client_profile.as_dict()
        }
    
    except Exception as e:
        frappe.log_error(f"Error creating Client Profile: {str(e)}", "Assistant API: Create Client Profile")
        frappe.throw(_(f"Failed to create Client Profile: {str(e)}"))


@frappe.whitelist()
def get_client_profile(client_name, fields=None):
    """
    Get a single Client Profile by name
    
    Args:
        client_name: Name of the Client Profile
        fields: Optional comma-separated list of fields to return
    
    Returns:
        dict: Client Profile data
    """
    try:
        if not frappe.db.exists("Client Profile", client_name):
            frappe.throw(_("Client Profile not found"))
        
        if fields:
            field_list = [f.strip() for f in fields.split(",")]
            client_profile = frappe.get_doc("Client Profile", client_name)
            return {
                "success": True,
                "data": {field: getattr(client_profile, field, None) for field in field_list if hasattr(client_profile, field)}
            }
        else:
            client_profile = frappe.get_doc("Client Profile", client_name)
            return {
                "success": True,
                "data": client_profile.as_dict()
            }
    
    except Exception as e:
        frappe.log_error(f"Error getting Client Profile: {str(e)}", "Assistant API: Get Client Profile")
        frappe.throw(_(f"Failed to get Client Profile: {str(e)}"))


@frappe.whitelist()
def list_client_profiles(filters=None, fields=None, page_length=20, page_start=0, order_by="modified desc"):
    """
    List Client Profiles with filtering and pagination
    
    Args:
        filters: Dictionary or JSON string with filters
        fields: Optional comma-separated list of fields to return
        page_length: Number of records per page (default: 20)
        page_start: Starting record index (default: 0)
        order_by: Sort order (default: "modified desc")
    
    Returns:
        dict: List of Client Profiles with pagination info
    """
    try:
        if isinstance(filters, str):
            filters = frappe.parse_json(filters)
        if filters is None:
            filters = {}
        
        # Get field list
        field_list = None
        if fields:
            field_list = [f.strip() for f in fields.split(",")]
        
        # Build query
        client_profiles = frappe.get_list(
            "Client Profile",
            filters=filters,
            fields=field_list or ["name", "full_name", "email", "phone", "status", "modified"],
            limit_start=cint(page_start),
            limit_page_length=cint(page_length),
            order_by=order_by
        )
        
        total_count = frappe.db.count("Client Profile", filters=filters)
        
        return {
            "success": True,
            "data": client_profiles,
            "total": total_count,
            "page_start": cint(page_start),
            "page_length": cint(page_length)
        }
    
    except Exception as e:
        frappe.log_error(f"Error listing Client Profiles: {str(e)}", "Assistant API: List Client Profiles")
        frappe.throw(_(f"Failed to list Client Profiles: {str(e)}"))


@frappe.whitelist()
def update_client_profile(client_name, data):
    """
    Update an existing Client Profile
    
    Args:
        client_name: Name of the Client Profile to update
        data: Dictionary or JSON string with fields to update
    
    Returns:
        dict: Updated Client Profile data
    """
    try:
        if isinstance(data, str):
            data = frappe.parse_json(data)
        
        if not frappe.db.exists("Client Profile", client_name):
            frappe.throw(_("Client Profile not found"))
        
        client_profile = frappe.get_doc("Client Profile", client_name)
        
        # Update fields
        updatable_fields = ["full_name", "email", "phone", "status", "timezone"]
        
        for field in updatable_fields:
            if field in data:
                setattr(client_profile, field, data[field])
        
        client_profile.save()
        frappe.db.commit()
        
        return {
            "success": True,
            "message": _("Client Profile updated successfully"),
            "data": client_profile.as_dict()
        }
    
    except Exception as e:
        frappe.log_error(f"Error updating Client Profile: {str(e)}", "Assistant API: Update Client Profile")
        frappe.throw(_(f"Failed to update Client Profile: {str(e)}"))


@frappe.whitelist()
def delete_client_profile(client_name):
    """
    Delete a Client Profile
    
    Args:
        client_name: Name of the Client Profile to delete
    
    Returns:
        dict: Success message
    """
    try:
        if not frappe.db.exists("Client Profile", client_name):
            frappe.throw(_("Client Profile not found"))
        
        frappe.delete_doc("Client Profile", client_name, force=1)
        frappe.db.commit()
        
        return {
            "success": True,
            "message": _("Client Profile deleted successfully")
        }
    
    except Exception as e:
        frappe.log_error(f"Error deleting Client Profile: {str(e)}", "Assistant API: Delete Client Profile")
        frappe.throw(_(f"Failed to delete Client Profile: {str(e)}"))


# =====================================================
# ASSIGNMENT CRUD OPERATIONS
# =====================================================

@frappe.whitelist()
def create_assignment(data):
    """
    Create a new Assistant Client Assignment
    
    Args:
        data: Dictionary or JSON string containing assignment data
            {
                "va_profile": str (required),
                "client_profile": str (required),
                "assignment_model": str (required, "1:1", "1:2", or "1:3"),
                "start_date": str (optional, date string),
                "status": str (optional, default: "active")
            }
    
    Returns:
        dict: Created assignment data with name
    """
    try:
        if isinstance(data, str):
            data = frappe.parse_json(data)
        
        # Validate required fields
        if not data.get("va_profile"):
            frappe.throw(_("VA Profile is required"))
        if not data.get("client_profile"):
            frappe.throw(_("Client Profile is required"))
        if not data.get("assignment_model"):
            frappe.throw(_("Assignment Model is required"))
        
        # Validate assignment model
        valid_models = ["1:1", "1:2", "1:3"]
        if data.get("assignment_model") not in valid_models:
            frappe.throw(_(f"Assignment Model must be one of: {', '.join(valid_models)}"))
        
        # Create assignment document
        assignment = frappe.new_doc("Assistant Client Assignment")
        assignment.va_profile = data.get("va_profile")
        assignment.client_profile = data.get("client_profile")
        assignment.assignment_model = data.get("assignment_model")
        assignment.status = data.get("status", "active")
        
        if data.get("start_date"):
            assignment.start_date = get_datetime(data.get("start_date")).date()
        else:
            assignment.start_date = nowdate()
        
        assignment.insert()
        frappe.db.commit()
        
        return {
            "success": True,
            "message": _("Assignment created successfully"),
            "data": assignment.as_dict()
        }
    
    except Exception as e:
        frappe.log_error(f"Error creating assignment: {str(e)}", "Assistant API: Create Assignment")
        frappe.throw(_(f"Failed to create assignment: {str(e)}"))


@frappe.whitelist()
def get_assignment(assignment_name, fields=None):
    """
    Get a single Assignment by name
    
    Args:
        assignment_name: Name of the Assignment
        fields: Optional comma-separated list of fields to return
    
    Returns:
        dict: Assignment data
    """
    try:
        if not frappe.db.exists("Assistant Client Assignment", assignment_name):
            frappe.throw(_("Assignment not found"))
        
        if fields:
            field_list = [f.strip() for f in fields.split(",")]
            assignment = frappe.get_doc("Assistant Client Assignment", assignment_name)
            return {
                "success": True,
                "data": {field: getattr(assignment, field, None) for field in field_list if hasattr(assignment, field)}
            }
        else:
            assignment = frappe.get_doc("Assistant Client Assignment", assignment_name)
            return {
                "success": True,
                "data": assignment.as_dict()
            }
    
    except Exception as e:
        frappe.log_error(f"Error getting assignment: {str(e)}", "Assistant API: Get Assignment")
        frappe.throw(_(f"Failed to get assignment: {str(e)}"))


@frappe.whitelist()
def list_assignments(filters=None, fields=None, page_length=20, page_start=0, order_by="modified desc"):
    """
    List Assignments with filtering and pagination
    
    Args:
        filters: Dictionary or JSON string with filters
        fields: Optional comma-separated list of fields to return
        page_length: Number of records per page (default: 20)
        page_start: Starting record index (default: 0)
        order_by: Sort order (default: "modified desc")
    
    Returns:
        dict: List of Assignments with pagination info
    """
    try:
        if isinstance(filters, str):
            filters = frappe.parse_json(filters)
        if filters is None:
            filters = {}
        
        # Get field list
        field_list = None
        if fields:
            field_list = [f.strip() for f in fields.split(",")]
        
        # Build query
        assignments = frappe.get_list(
            "Assistant Client Assignment",
            filters=filters,
            fields=field_list or ["name", "va_profile", "client_profile", "assignment_model", "status", "start_date", "modified"],
            limit_start=cint(page_start),
            limit_page_length=cint(page_length),
            order_by=order_by
        )
        
        total_count = frappe.db.count("Assistant Client Assignment", filters=filters)
        
        return {
            "success": True,
            "data": assignments,
            "total": total_count,
            "page_start": cint(page_start),
            "page_length": cint(page_length)
        }
    
    except Exception as e:
        frappe.log_error(f"Error listing assignments: {str(e)}", "Assistant API: List Assignments")
        frappe.throw(_(f"Failed to list assignments: {str(e)}"))


@frappe.whitelist()
def update_assignment(assignment_name, data):
    """
    Update an existing Assignment
    
    Args:
        assignment_name: Name of the Assignment to update
        data: Dictionary or JSON string with fields to update
    
    Returns:
        dict: Updated Assignment data
    """
    try:
        if isinstance(data, str):
            data = frappe.parse_json(data)
        
        if not frappe.db.exists("Assistant Client Assignment", assignment_name):
            frappe.throw(_("Assignment not found"))
        
        assignment = frappe.get_doc("Assistant Client Assignment", assignment_name)
        
        # Update fields
        updatable_fields = ["va_profile", "client_profile", "assignment_model", "status"]
        
        for field in updatable_fields:
            if field in data:
                setattr(assignment, field, data[field])
        
        if "start_date" in data and data["start_date"]:
            assignment.start_date = get_datetime(data["start_date"]).date()
        
        if "end_date" in data:
            if data["end_date"]:
                assignment.end_date = get_datetime(data["end_date"]).date()
            else:
                assignment.end_date = None
        
        assignment.save()
        frappe.db.commit()
        
        return {
            "success": True,
            "message": _("Assignment updated successfully"),
            "data": assignment.as_dict()
        }
    
    except Exception as e:
        frappe.log_error(f"Error updating assignment: {str(e)}", "Assistant API: Update Assignment")
        frappe.throw(_(f"Failed to update assignment: {str(e)}"))


@frappe.whitelist()
def delete_assignment(assignment_name):
    """
    Delete an Assignment
    
    Args:
        assignment_name: Name of the Assignment to delete
    
    Returns:
        dict: Success message
    """
    try:
        if not frappe.db.exists("Assistant Client Assignment", assignment_name):
            frappe.throw(_("Assignment not found"))
        
        frappe.delete_doc("Assistant Client Assignment", assignment_name, force=1)
        frappe.db.commit()
        
        return {
            "success": True,
            "message": _("Assignment deleted successfully")
        }
    
    except Exception as e:
        frappe.log_error(f"Error deleting assignment: {str(e)}", "Assistant API: Delete Assignment")
        frappe.throw(_(f"Failed to delete assignment: {str(e)}"))


# =====================================================
# ASSIGNMENT QUERIES
# =====================================================

@frappe.whitelist()
def get_clients_for_va(va_profile, status="active"):
    """
    Get all clients assigned to a VA
    
    Args:
        va_profile: VA Profile name
        status: Assignment status filter (default: "active")
    
    Returns:
        dict: List of client assignments
    """
    try:
        filters = {"va_profile": va_profile, "status": status}
        
        assignments = frappe.get_all(
            "Assistant Client Assignment",
            filters=filters,
            fields=["name", "client_profile", "assignment_model", "start_date", "end_date"],
            order_by="start_date desc"
        )
        
        return {
            "success": True,
            "data": assignments,
            "count": len(assignments)
        }
    
    except Exception as e:
        frappe.log_error(f"Error getting clients for VA: {str(e)}", "Assistant API: Get Clients for VA")
        frappe.throw(_(f"Failed to get clients: {str(e)}"))


@frappe.whitelist()
def get_vas_for_client(client_profile, status="active"):
    """
    Get all VAs assigned to a client
    
    Args:
        client_profile: Client Profile name
        status: Assignment status filter (default: "active")
    
    Returns:
        dict: List of VA assignments
    """
    try:
        filters = {"client_profile": client_profile, "status": status}
        
        assignments = frappe.get_all(
            "Assistant Client Assignment",
            filters=filters,
            fields=["name", "va_profile", "assignment_model", "start_date", "end_date"],
            order_by="start_date desc"
        )
        
        return {
            "success": True,
            "data": assignments,
            "count": len(assignments)
        }
    
    except Exception as e:
        frappe.log_error(f"Error getting VAs for client: {str(e)}", "Assistant API: Get VAs for Client")
        frappe.throw(_(f"Failed to get VAs: {str(e)}"))


@frappe.whitelist()
def get_assignment_statistics():
    """
    Get assignment statistics (counts by model and status)
    
    Returns:
        dict: Assignment statistics
    """
    try:
        models = ["1:1", "1:2", "1:3"]
        statuses = ["active", "inactive", "ended"]
        
        stats = {
            "by_model": {},
            "by_status": {},
            "total": 0
        }
        
        for model in models:
            count = frappe.db.count("Assistant Client Assignment", filters={"assignment_model": model})
            stats["by_model"][model] = count
        
        for status in statuses:
            count = frappe.db.count("Assistant Client Assignment", filters={"status": status})
            stats["by_status"][status] = count
        
        stats["total"] = frappe.db.count("Assistant Client Assignment")
        
        return {
            "success": True,
            "data": stats
        }
    
    except Exception as e:
        frappe.log_error(f"Error getting assignment statistics: {str(e)}", "Assistant API: Statistics")
        frappe.throw(_(f"Failed to get assignment statistics: {str(e)}"))


