"""
Assistants Module API Endpoints
Provides CRUD operations for Virtual Assistants, Client Profiles, and Assignments
"""

import frappe
from frappe import _
from frappe.utils import cint, flt, nowdate, now_datetime, get_datetime


# Helper mappings to keep frontend-friendly payloads while using the current DocTypes
ASSIGNMENT_MODEL_TO_TYPE = {
    "1:1": "dedicated",
    "1:2": "shared_2",
    "1:3": "shared_3",
}
ASSIGNMENT_TYPE_TO_MODEL = {v: k for k, v in ASSIGNMENT_MODEL_TO_TYPE.items()}


def _status_flag(status: str) -> int:
    """Convert API status (active/inactive) to DocType boolean."""
    return 1 if (status or "").lower() == "active" else 0


def _status_label(flag: int) -> str:
    """Convert DocType boolean to API status string."""
    return "active" if cint(flag) else "inactive"


def _map_assignment_status(api_status: str) -> str:
    """
    Map API status to DocType status.
    API uses: active | inactive | ended
    DocType uses: active | paused | ended
    """
    if not api_status:
        return "active"
    api_status = api_status.lower()
    if api_status == "inactive":
        return "paused"
    if api_status in ("active", "ended"):
        return api_status
    return "active"


def _serialize_va_profile(va_doc):
    """Return a response payload aligned with the frontend's expectations."""
    user_info = frappe.db.get_value(
        "User",
        va_doc.user,
        ["full_name", "email", "mobile_no", "enabled", "user_image"],
        as_dict=True,
    ) or {}

    languages = [
        {
            "language": row.language,
            # Expose as `proficiency` to match existing frontend types
            "proficiency": getattr(row, "proficiency_level", None) or getattr(row, "proficiency", None),
        }
        for row in (va_doc.languages or [])
    ]
    skills = [
        {
            "skill": row.skill,
            "proficiency_level": getattr(row, "proficiency_level", None) or getattr(row, "skill_level", None),
        }
        for row in (va_doc.skills or [])
    ]

    return {
        "name": va_doc.name,
        "full_name": user_info.get("full_name") or va_doc.user,
        "email": user_info.get("email") or va_doc.user,
        "phone": user_info.get("mobile_no"),
        "status": _status_label(user_info.get("enabled", 1) and va_doc.is_active),
        "timezone": va_doc.timezone,
        "assistant_tier": va_doc.assistant_tier,
        "max_clients": va_doc.max_clients,
        "current_clients": va_doc.current_clients,
        "languages": languages,
        "skills": skills,
        "avatar_url": user_info.get("user_image"),
        "image_url": user_info.get("user_image"),
        "profile_image": user_info.get("user_image"),
        "modified": va_doc.modified,
        "creation": va_doc.creation,
    }


def _serialize_client_profile(client_doc):
    """Return payload aligned with the existing frontend types."""
    return {
        "name": client_doc.name,
        "full_name": client_doc.full_name,
        "email": client_doc.email,
        "phone": client_doc.phone,
        "status": _status_label(client_doc.is_active),
        "timezone": client_doc.timezone,
        "assigned_assistant": client_doc.assigned_assistant,
        "assignment_type": client_doc.assignment_type,
        "modified": client_doc.modified,
        "creation": client_doc.creation,
    }


def _serialize_assignment(assignment_doc):
    """Map DocType fields to frontend-friendly names."""
    return {
        "name": assignment_doc.name,
        "va_profile": assignment_doc.assistant,
        "client_profile": assignment_doc.client_profile,
        "assignment_model": ASSIGNMENT_TYPE_TO_MODEL.get(
            assignment_doc.assignment_type, "1:1"
        ),
        "start_date": assignment_doc.start_date,
        "end_date": assignment_doc.end_date,
        "status": "inactive" if assignment_doc.status == "paused" else assignment_doc.status,
        "modified": assignment_doc.modified,
        "creation": assignment_doc.creation,
    }


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

        status = data.get("status", "active")
        user_id = data.get("user") or data.get("email")
        phone = data.get("phone")

        # Ensure backing User exists (or create a lightweight one)
        if not frappe.db.exists("User", user_id):
            user_doc = frappe.new_doc("User")
            user_doc.email = data.get("email")
            user_doc.first_name = data.get("full_name")
            user_doc.full_name = data.get("full_name")
            user_doc.mobile_no = phone
            user_doc.enabled = _status_flag(status)
            user_doc.send_welcome_email = 0
            user_doc.insert(ignore_permissions=True)
        else:
            user_doc = frappe.get_doc("User", user_id)
            if data.get("full_name"):
                user_doc.full_name = data.get("full_name")
            if phone:
                user_doc.mobile_no = phone
            user_doc.enabled = _status_flag(status)
            user_doc.save(ignore_permissions=True)

        # Create VA Profile document
        va_profile = frappe.new_doc("VA Profile")
        va_profile.user = user_doc.name
        va_profile.assistant_tier = data.get("assistant_tier") or va_profile.assistant_tier
        va_profile.max_clients = data.get("max_clients") or va_profile.max_clients
        va_profile.current_clients = data.get("current_clients") or va_profile.current_clients
        va_profile.is_active = _status_flag(status)
        va_profile.timezone = data.get("timezone", "Africa/Addis_Ababa")

        # Add languages if provided
        if data.get("languages"):
            for lang in data.get("languages", []):
                va_profile.append("languages", {
                    "language": lang.get("language"),
                    "proficiency_level": lang.get("proficiency") or lang.get("proficiency_level") or "intermediate"
                })

        va_profile.insert()
        frappe.db.commit()
        
        return {
            "success": True,
            "message": _("VA Profile created successfully"),
            "data": _serialize_va_profile(va_profile)
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
        
        va_profile = frappe.get_doc("VA Profile", va_name)
        serialized = _serialize_va_profile(va_profile)

        if fields:
            field_list = [f.strip() for f in fields.split(",")]
            filtered = {field: serialized.get(field) for field in field_list}
            return {
                "success": True,
                "data": filtered
            }

        return {
            "success": True,
            "data": serialized
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

        # Map API filters to DocType fields
        if "status" in filters:
            filters["is_active"] = _status_flag(filters.pop("status"))
        
        va_records = frappe.get_list(
            "VA Profile",
            filters=filters,
            fields=["name"],
            limit_start=cint(page_start),
            limit_page_length=cint(page_length),
            order_by=order_by
        )

        data = []
        for record in va_records:
            va_doc = frappe.get_doc("VA Profile", record.name)
            serialized = _serialize_va_profile(va_doc)
            if fields:
                field_list = [f.strip() for f in fields.split(",")]
                serialized = {field: serialized.get(field) for field in field_list}
            data.append(serialized)

        total_count = frappe.db.count("VA Profile", filters=filters)

        return {
            "success": True,
            "data": data,
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

        # Update VA Profile specific fields
        if "assistant_tier" in data:
            va_profile.assistant_tier = data.get("assistant_tier")
        if "max_clients" in data:
            va_profile.max_clients = data.get("max_clients")
        if "current_clients" in data:
            va_profile.current_clients = data.get("current_clients")
        if "timezone" in data:
            va_profile.timezone = data.get("timezone")
        if "status" in data:
            va_profile.is_active = _status_flag(data.get("status"))

        if "languages" in data:
            va_profile.languages = []
            for lang in data.get("languages", []):
                va_profile.append("languages", {
                    "language": lang.get("language"),
                    "proficiency_level": lang.get("proficiency") or lang.get("proficiency_level") or "intermediate"
                })

        va_profile.save()

        # Update backing user data
        user_doc = frappe.get_doc("User", va_profile.user)
        if "full_name" in data:
            user_doc.full_name = data.get("full_name")
        if "email" in data and data.get("email"):
            user_doc.email = data.get("email")
        if "phone" in data:
            user_doc.mobile_no = data.get("phone")
        if "status" in data:
            user_doc.enabled = _status_flag(data.get("status"))
        user_doc.save(ignore_permissions=True)
        frappe.db.commit()
        
        return {
            "success": True,
            "message": _("VA Profile updated successfully"),
            "data": _serialize_va_profile(va_profile)
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

        status = data.get("status", "active")
        user_id = data.get("user") or data.get("email")
        phone = data.get("phone")

        if not frappe.db.exists("User", user_id):
            user_doc = frappe.new_doc("User")
            user_doc.email = data.get("email")
            user_doc.first_name = data.get("full_name")
            user_doc.full_name = data.get("full_name")
            user_doc.mobile_no = phone
            user_doc.enabled = _status_flag(status)
            user_doc.send_welcome_email = 0
            user_doc.insert(ignore_permissions=True)
        else:
            user_doc = frappe.get_doc("User", user_id)
            if data.get("full_name"):
                user_doc.full_name = data.get("full_name")
            if phone:
                user_doc.mobile_no = phone
            user_doc.enabled = _status_flag(status)
            user_doc.save(ignore_permissions=True)

        # Create Client Profile document
        client_profile = frappe.new_doc("Client Profile")
        client_profile.user = user_doc.name
        client_profile.full_name = data.get("full_name")
        client_profile.email = data.get("email")
        client_profile.phone = phone or ""
        client_profile.timezone = data.get("timezone", "Africa/Addis_Ababa")
        client_profile.is_active = _status_flag(status)
        client_profile.company = data.get("company")
        client_profile.address = data.get("address")
        client_profile.city = data.get("city")
        client_profile.country = data.get("country")
        client_profile.preferred_language = data.get("preferred_language") or client_profile.preferred_language
        client_profile.communication_preferences = data.get("communication_preferences")

        client_profile.insert()
        frappe.db.commit()
        
        return {
            "success": True,
            "message": _("Client Profile created successfully"),
            "data": _serialize_client_profile(client_profile)
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
        
        client_profile = frappe.get_doc("Client Profile", client_name)
        serialized = _serialize_client_profile(client_profile)

        if fields:
            field_list = [f.strip() for f in fields.split(",")]
            filtered = {field: serialized.get(field) for field in field_list}
            return {
                "success": True,
                "data": filtered
            }

        return {
            "success": True,
            "data": serialized
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

        # Map API filters to DocType fields
        if "status" in filters:
            filters["is_active"] = _status_flag(filters.pop("status"))
        
        client_records = frappe.get_list(
            "Client Profile",
            filters=filters,
            fields=["name"],
            limit_start=cint(page_start),
            limit_page_length=cint(page_length),
            order_by=order_by
        )

        data = []
        for record in client_records:
            client_doc = frappe.get_doc("Client Profile", record.name)
            serialized = _serialize_client_profile(client_doc)
            if fields:
                field_list = [f.strip() for f in fields.split(",")]
                serialized = {field: serialized.get(field) for field in field_list}
            data.append(serialized)

        total_count = frappe.db.count("Client Profile", filters=filters)

        return {
            "success": True,
            "data": data,
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

        if "full_name" in data:
            client_profile.full_name = data.get("full_name")
        if "email" in data:
            client_profile.email = data.get("email")
        if "phone" in data:
            client_profile.phone = data.get("phone")
        if "status" in data:
            client_profile.is_active = _status_flag(data.get("status"))
        if "timezone" in data:
            client_profile.timezone = data.get("timezone")
        if "company" in data:
            client_profile.company = data.get("company")
        if "address" in data:
            client_profile.address = data.get("address")
        if "city" in data:
            client_profile.city = data.get("city")
        if "country" in data:
            client_profile.country = data.get("country")
        if "preferred_language" in data:
            client_profile.preferred_language = data.get("preferred_language")
        if "communication_preferences" in data:
            client_profile.communication_preferences = data.get("communication_preferences")

        client_profile.save()

        # Update backing user data
        if client_profile.user:
            user_doc = frappe.get_doc("User", client_profile.user)
            if "full_name" in data:
                user_doc.full_name = data.get("full_name")
            if "email" in data and data.get("email"):
                user_doc.email = data.get("email")
            if "phone" in data:
                user_doc.mobile_no = data.get("phone")
            if "status" in data:
                user_doc.enabled = _status_flag(data.get("status"))
            user_doc.save(ignore_permissions=True)
        frappe.db.commit()
        
        return {
            "success": True,
            "message": _("Client Profile updated successfully"),
            "data": _serialize_client_profile(client_profile)
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
        if not data.get("va_profile") and not data.get("assistant"):
            frappe.throw(_("VA Profile is required"))
        if not data.get("client_profile"):
            frappe.throw(_("Client Profile is required"))
        if not data.get("assignment_model"):
            frappe.throw(_("Assignment Model is required"))

        assignment_type = ASSIGNMENT_MODEL_TO_TYPE.get(data.get("assignment_model"))
        if not assignment_type:
            frappe.throw(_("Assignment Model must be one of: 1:1, 1:2, 1:3"))

        # Create assignment document
        assignment = frappe.new_doc("Assistant Client Assignment")
        assignment.assistant = data.get("va_profile") or data.get("assistant")
        assignment.client_profile = data.get("client_profile")
        assignment.assignment_type = assignment_type
        assignment.status = _map_assignment_status(data.get("status", "active"))
        
        if data.get("start_date"):
            assignment.start_date = get_datetime(data.get("start_date")).date()
        else:
            assignment.start_date = nowdate()
        
        assignment.insert()
        frappe.db.commit()
        
        return {
            "success": True,
            "message": _("Assignment created successfully"),
            "data": _serialize_assignment(assignment)
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
        
        assignment = frappe.get_doc("Assistant Client Assignment", assignment_name)
        serialized = _serialize_assignment(assignment)

        if fields:
            field_list = [f.strip() for f in fields.split(",")]
            filtered = {field: serialized.get(field) for field in field_list}
            return {
                "success": True,
                "data": filtered
            }

        return {
            "success": True,
            "data": serialized
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
        
        # Map API filters to DocType fields
        mapped_filters = filters.copy()
        if "status" in mapped_filters:
            mapped_filters["status"] = _map_assignment_status(mapped_filters.pop("status"))
        if "assignment_model" in mapped_filters:
            assignment_type = ASSIGNMENT_MODEL_TO_TYPE.get(mapped_filters.pop("assignment_model"))
            if assignment_type:
                mapped_filters["assignment_type"] = assignment_type
        if "va_profile" in mapped_filters:
            mapped_filters["assistant"] = mapped_filters.pop("va_profile")
        
        assignments_raw = frappe.get_list(
            "Assistant Client Assignment",
            filters=mapped_filters,
            fields=["name", "assistant", "client_profile", "assignment_type", "status", "start_date", "end_date", "modified"],
            limit_start=cint(page_start),
            limit_page_length=cint(page_length),
            order_by=order_by
        )

        assignments = []
        for row in assignments_raw:
            serialized = {
                "name": row.name,
                "va_profile": row.assistant,
                "client_profile": row.client_profile,
                "assignment_model": ASSIGNMENT_TYPE_TO_MODEL.get(row.assignment_type, "1:1"),
                "start_date": row.start_date,
                "end_date": row.end_date,
                "status": "inactive" if row.status == "paused" else row.status,
                "modified": row.modified,
            }
            if fields:
                field_list = [f.strip() for f in fields.split(",")]
                serialized = {field: serialized.get(field) for field in field_list}
            assignments.append(serialized)

        total_count = frappe.db.count("Assistant Client Assignment", filters=mapped_filters)

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

        if "va_profile" in data or "assistant" in data:
            assignment.assistant = data.get("va_profile") or data.get("assistant")
        if "client_profile" in data:
            assignment.client_profile = data.get("client_profile")
        if "assignment_model" in data:
            assignment.assignment_type = ASSIGNMENT_MODEL_TO_TYPE.get(
                data.get("assignment_model"), assignment.assignment_type
            )
        if "status" in data:
            assignment.status = _map_assignment_status(data.get("status"))
        
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
            "data": _serialize_assignment(assignment)
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
        filters = {"assistant": va_profile, "status": _map_assignment_status(status)}
        
        assignments_raw = frappe.get_all(
            "Assistant Client Assignment",
            filters=filters,
            fields=["name", "client_profile", "assignment_type", "start_date", "end_date"],
            order_by="start_date desc"
        )

        assignments = [
            {
                "name": row.name,
                "client_profile": row.client_profile,
                "assignment_model": ASSIGNMENT_TYPE_TO_MODEL.get(row.assignment_type, "1:1"),
                "start_date": row.start_date,
                "end_date": row.end_date,
            }
            for row in assignments_raw
        ]
        
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
        filters = {"client_profile": client_profile, "status": _map_assignment_status(status)}
        
        assignments_raw = frappe.get_all(
            "Assistant Client Assignment",
            filters=filters,
            fields=["name", "assistant", "assignment_type", "start_date", "end_date"],
            order_by="start_date desc"
        )

        assignments = [
            {
                "name": row.name,
                "va_profile": row.assistant,
                "assignment_model": ASSIGNMENT_TYPE_TO_MODEL.get(row.assignment_type, "1:1"),
                "start_date": row.start_date,
                "end_date": row.end_date,
            }
            for row in assignments_raw
        ]
        
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
        stats = {
            "by_model": {},
            "by_status": {},
            "total": 0
        }

        # Count by assignment type, return as model aliases
        for model, assignment_type in ASSIGNMENT_MODEL_TO_TYPE.items():
            count = frappe.db.count("Assistant Client Assignment", filters={"assignment_type": assignment_type})
            stats["by_model"][model] = count

        # Map DocType statuses to API statuses
        status_mappings = {
            "active": "active",
            "paused": "inactive",
            "ended": "ended",
        }
        for doc_status, api_status in status_mappings.items():
            count = frappe.db.count("Assistant Client Assignment", filters={"status": doc_status})
            stats["by_status"][api_status] = count

        stats["total"] = frappe.db.count("Assistant Client Assignment")
        
        return {
            "success": True,
            "data": stats
        }
    
    except Exception as e:
        frappe.log_error(f"Error getting assignment statistics: {str(e)}", "Assistant API: Statistics")
        frappe.throw(_(f"Failed to get assignment statistics: {str(e)}"))


