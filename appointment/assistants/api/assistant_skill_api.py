"""
Assistant Skills API Endpoints
Provides CRUD operations for Assistant Skills
"""

import frappe
from frappe import _
from frappe.utils import cint
from appointment.assistants.helpers.errors import raise_user_error


# =====================================================
# ASSISTANT SKILL CRUD OPERATIONS
# =====================================================

@frappe.whitelist()
def create_assistant_skill(data):
    """
    Create a new Assistant Skill
    
    Args:
        data: Dictionary or JSON string
            {
                "name": str (required),
                "description": str (optional),
                "category": str (optional)
            }
    
    Returns:
        dict: Created Assistant Skill data
    """
    try:
        if isinstance(data, str):
            data = frappe.parse_json(data)
        
        if not data.get("name"):
            frappe.throw(_("Enter a skill name."))
        
        skill = frappe.new_doc("Assistant Skill")
        skill.name = data.get("name")
        skill.description = data.get("description", "")
        skill.category = data.get("category", "")
        
        skill.insert()
        frappe.db.commit()
        
        return {
            "success": True,
            "message": _("Skill created."),
            "data": skill.as_dict()
        }
    
    except Exception as e:
        raise_user_error(e, _("Could not create the skill. Please try again."), "Assistant Skill API: Create")


@frappe.whitelist()
def get_assistant_skill(skill_name):
    """Get a single Assistant Skill"""
    try:
        if not frappe.db.exists("Assistant Skill", skill_name):
            frappe.throw(_("This skill no longer exists."))
        
        skill = frappe.get_doc("Assistant Skill", skill_name)
        
        return {
            "success": True,
            "data": skill.as_dict()
        }
    
    except Exception as e:
        raise_user_error(e, _("Could not load the skill. Please try again."), "Assistant Skill API: Get")


@frappe.whitelist()
def list_assistant_skills(filters=None, fields=None):
    """List all Assistant Skills"""
    try:
        if isinstance(filters, str):
            filters = frappe.parse_json(filters)
        if filters is None:
            filters = {}
        
        field_list = None
        if fields:
            field_list = [f.strip() for f in fields.split(",")]
        
        skills = frappe.get_all(
            "Assistant Skill",
            filters=filters,
            fields=field_list or ["name", "description", "category"],
            order_by="name asc"
        )
        
        return {
            "success": True,
            "data": skills,
            "count": len(skills)
        }
    
    except Exception as e:
        raise_user_error(e, _("Could not load skills. Please try again."), "Assistant Skill API: List")


@frappe.whitelist()
def update_assistant_skill(skill_name, data):
    """Update an existing Assistant Skill"""
    try:
        if isinstance(data, str):
            data = frappe.parse_json(data)
        
        if not frappe.db.exists("Assistant Skill", skill_name):
            frappe.throw(_("This skill no longer exists."))
        
        skill = frappe.get_doc("Assistant Skill", skill_name)
        
        updatable_fields = ["description", "category"]
        for field in updatable_fields:
            if field in data:
                setattr(skill, field, data[field])
        
        skill.save()
        frappe.db.commit()
        
        return {
            "success": True,
            "message": _("Skill updated."),
            "data": skill.as_dict()
        }
    
    except Exception as e:
        raise_user_error(e, _("Could not update the skill. Please try again."), "Assistant Skill API: Update")


@frappe.whitelist()
def delete_assistant_skill(skill_name):
    """Delete an Assistant Skill"""
    try:
        if not frappe.db.exists("Assistant Skill", skill_name):
            frappe.throw(_("This skill no longer exists."))
        
        frappe.delete_doc("Assistant Skill", skill_name, force=1)
        frappe.db.commit()
        
        return {
            "success": True,
            "message": _("Skill deleted.")
        }
    
    except Exception as e:
        raise_user_error(e, _("Could not delete the skill. Please try again."), "Assistant Skill API: Delete")


# =====================================================
# VA SKILL ASSIGNMENT OPERATIONS
# =====================================================

@frappe.whitelist()
def assign_skill_to_va(va_profile, skill_name, proficiency_level="intermediate"):
    """
    Assign a skill to a VA Profile
    
    Args:
        va_profile: VA Profile name
        skill_name: Assistant Skill name
        proficiency_level: Proficiency level (basic, intermediate, advanced, expert)
    
    Returns:
        dict: Success message
    """
    try:
        if not frappe.db.exists("VA Profile", va_profile):
            frappe.throw(_("This VA profile no longer exists."))
        
        if not frappe.db.exists("Assistant Skill", skill_name):
            frappe.throw(_("This skill no longer exists."))
        
        va_profile_doc = frappe.get_doc("VA Profile", va_profile)
        
        # Check if skill already assigned
        existing_skills = [s.skill for s in va_profile_doc.skills if s.skill == skill_name]
        if existing_skills:
            frappe.throw(_("This assistant already has this skill."))
        
        # Add skill
        va_profile_doc.append("skills", {
            "skill": skill_name,
            # DocType field is skill_level; keep API param name proficiency_level for compatibility
            "skill_level": proficiency_level
        })
        
        va_profile_doc.save()
        frappe.db.commit()
        
        return {
            "success": True,
            "message": _("Skill added to the assistant.")
        }
    
    except Exception as e:
        raise_user_error(e, _("Could not add the skill to the assistant. Please try again."), "Assistant Skill API: Assign")


@frappe.whitelist()
def remove_skill_from_va(va_profile, skill_name):
    """
    Remove a skill from a VA Profile
    
    Args:
        va_profile: VA Profile name
        skill_name: Assistant Skill name
    
    Returns:
        dict: Success message
    """
    try:
        if not frappe.db.exists("VA Profile", va_profile):
            frappe.throw(_("This VA profile no longer exists."))
        
        va_profile_doc = frappe.get_doc("VA Profile", va_profile)
        
        # Find and remove skill
        skills_to_remove = [s for s in va_profile_doc.skills if s.skill == skill_name]
        if not skills_to_remove:
            frappe.throw(_("This assistant does not have this skill."))
        
        for skill_row in skills_to_remove:
            va_profile_doc.remove(skill_row)
        
        va_profile_doc.save()
        frappe.db.commit()
        
        return {
            "success": True,
            "message": _("Skill removed from the assistant.")
        }
    
    except Exception as e:
        raise_user_error(e, _("Could not remove the skill from the assistant. Please try again."), "Assistant Skill API: Remove")


@frappe.whitelist()
def get_va_skills(va_profile):
    """
    Get all skills assigned to a VA Profile
    
    Args:
        va_profile: VA Profile name
    
    Returns:
        dict: List of skills with proficiency levels
    """
    try:
        if not frappe.db.exists("VA Profile", va_profile):
            frappe.throw(_("This VA profile no longer exists."))
        
        va_profile_doc = frappe.get_doc("VA Profile", va_profile)
        
        skills = []
        for skill_row in va_profile_doc.skills:
            skill_doc = frappe.get_doc("Assistant Skill", skill_row.skill)
            skills.append({
                "skill": skill_row.skill,
                "skill_name": skill_doc.name,
                "description": skill_doc.description,
                "category": skill_doc.category,
                "proficiency_level": getattr(skill_row, "proficiency_level", None) or getattr(skill_row, "skill_level", None)
            })
        
        return {
            "success": True,
            "data": skills,
            "count": len(skills)
        }
    
    except Exception as e:
        raise_user_error(e, _("Could not load the assistant's skills. Please try again."), "Assistant Skill API: Get VA Skills")


@frappe.whitelist()
def get_vas_by_skill(skill_name, proficiency_level=None):
    """
    Get all VAs that have a specific skill
    
    Args:
        skill_name: Assistant Skill name
        proficiency_level: Optional proficiency level filter
    
    Returns:
        dict: List of VA Profiles with the skill
    """
    try:
        if not frappe.db.exists("Assistant Skill", skill_name):
            frappe.throw(_("This skill no longer exists."))
        
        # Get all VA Profiles
        va_profiles = frappe.get_all("VA Profile", fields=["name", "user", "is_active"])
        
        matching_vas = []
        for va in va_profiles:
            va_doc = frappe.get_doc("VA Profile", va.name)
            user_info = frappe.db.get_value(
                "User",
                va.user,
                ["full_name", "email", "mobile_no"],
                as_dict=True,
            ) or {}

            for skill_row in va_doc.skills:
                if skill_row.skill == skill_name:
                    row_level = getattr(skill_row, "proficiency_level", None) or getattr(skill_row, "skill_level", None)
                    if not proficiency_level or row_level == proficiency_level:
                        matching_vas.append({
                            "va_profile": va.name,
                            "full_name": user_info.get("full_name") or va.user,
                            "email": user_info.get("email") or va.user,
                            "status": "active" if va.is_active else "inactive",
                            "proficiency_level": row_level
                        })
                    break
        
        return {
            "success": True,
            "data": matching_vas,
            "count": len(matching_vas)
        }
    
    except Exception as e:
        raise_user_error(e, _("Could not load assistants with this skill. Please try again."), "Assistant Skill API: Get VAs by Skill")


