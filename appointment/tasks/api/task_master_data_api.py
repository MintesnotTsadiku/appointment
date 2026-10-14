"""
Tasks Module Master Data API Endpoints
Provides CRUD operations for Task Categories, Task Templates, and Task Projects
"""

import frappe
from frappe import _
from frappe.utils import cint
from appointment.assistants.helpers.errors import raise_user_error


# =====================================================
# TASK CATEGORY CRUD OPERATIONS
# =====================================================

@frappe.whitelist()
def create_task_category(data):
    """
    Create a new Task Category
    
    Args:
        data: Dictionary or JSON string
            {
                "name": str (required),
                "description": str (optional)
            }
    
    Returns:
        dict: Created Task Category data
    """
    try:
        if isinstance(data, str):
            data = frappe.parse_json(data)
        
        if not data.get("name"):
            frappe.throw(_("Enter a category name."))
        
        category = frappe.new_doc("Task Category")
        category.name = data.get("name")
        category.description = data.get("description", "")
        
        category.insert()
        frappe.db.commit()
        
        return {
            "success": True,
            "message": _("Task category created."),
            "data": category.as_dict()
        }
    
    except Exception as e:
        raise_user_error(e, _("Could not create the task category. Please try again."), "Task Master Data API: Create Category")


@frappe.whitelist()
def list_task_categories(filters=None):
    """List all Task Categories"""
    try:
        if isinstance(filters, str):
            filters = frappe.parse_json(filters)
        if filters is None:
            filters = {}
        
        categories = frappe.get_all(
            "Task Category",
            filters=filters,
            fields=["name", "description"],
            order_by="name asc"
        )
        
        return {
            "success": True,
            "data": categories,
            "count": len(categories)
        }
    
    except Exception as e:
        raise_user_error(e, _("Could not load task categories. Please try again."), "Task Master Data API: List Categories")


# =====================================================
# TASK TEMPLATE CRUD OPERATIONS
# =====================================================

@frappe.whitelist()
def create_task_template(data):
    """
    Create a new Task Template
    
    Args:
        data: Dictionary or JSON string
            {
                "name": str (required),
                "description": str (optional),
                "tasks": list (optional, [{"title": str, "description": str, ...}])
            }
    
    Returns:
        dict: Created Task Template data
    """
    try:
        if isinstance(data, str):
            data = frappe.parse_json(data)
        
        if not data.get("name"):
            frappe.throw(_("Enter a template name."))
        
        template = frappe.new_doc("Task Template")
        template.name = data.get("name")
        template.description = data.get("description", "")
        
        # Add tasks if provided
        if data.get("tasks"):
            for task_data in data.get("tasks", []):
                template.append("tasks", {
                    "title": task_data.get("title"),
                    "description": task_data.get("description", ""),
                    "priority": task_data.get("priority", "medium"),
                    "estimated_duration": task_data.get("estimated_duration", 0),
                    "sequence": task_data.get("sequence", 0)
                })
        
        template.insert()
        frappe.db.commit()
        
        return {
            "success": True,
            "message": _("Task template created."),
            "data": template.as_dict()
        }
    
    except Exception as e:
        raise_user_error(e, _("Could not create the task template. Please try again."), "Task Master Data API: Create Template")


@frappe.whitelist()
def get_task_template(template_name):
    """Get a Task Template with its tasks"""
    try:
        if not frappe.db.exists("Task Template", template_name):
            frappe.throw(_("This task template no longer exists."))
        
        template = frappe.get_doc("Task Template", template_name)
        
        return {
            "success": True,
            "data": template.as_dict()
        }
    
    except Exception as e:
        raise_user_error(e, _("Could not load the task template. Please try again."), "Task Master Data API: Get Template")


@frappe.whitelist()
def list_task_templates(filters=None):
    """List all Task Templates"""
    try:
        if isinstance(filters, str):
            filters = frappe.parse_json(filters)
        if filters is None:
            filters = {}
        
        templates = frappe.get_all(
            "Task Template",
            filters=filters,
            fields=["name", "description"],
            order_by="name asc"
        )
        
        return {
            "success": True,
            "data": templates,
            "count": len(templates)
        }
    
    except Exception as e:
        raise_user_error(e, _("Could not load task templates. Please try again."), "Task Master Data API: List Templates")


@frappe.whitelist()
def create_tasks_from_template(template_name, client_profile, assignee=None):
    """
    Create tasks from a template for a client
    
    Args:
        template_name: Name of the Task Template
        client_profile: Client Profile name
        assignee: Optional VA Profile name
    
    Returns:
        dict: List of created tasks
    """
    try:
        if not frappe.db.exists("Task Template", template_name):
            frappe.throw(_("This task template no longer exists."))
        
        if not frappe.db.exists("Client Profile", client_profile):
            frappe.throw(_("This client profile no longer exists."))
        
        template = frappe.get_doc("Task Template", template_name)
        created_tasks = []
        
        for template_task in template.tasks:
            task = frappe.new_doc("Task")
            task.title = template_task.title
            task.description = template_task.description or ""
            task.priority = template_task.priority or "Medium"
            task.client_profile = client_profile
            task.status = "Requested"
            
            if assignee:
                task.assignee = assignee
                task.status = "Assigned"
            
            if template_task.estimated_duration:
                task.estimated_duration = template_task.estimated_duration
            
            task.insert()
            created_tasks.append(task.name)
        
        frappe.db.commit()
        
        return {
            "success": True,
            "message": _("Tasks created from the template."),
            "data": {
                "tasks": created_tasks,
                "count": len(created_tasks)
            }
        }
    
    except Exception as e:
        raise_user_error(e, _("Could not create tasks from the template. Please try again."), "Task Master Data API: Create from Template")


# =====================================================
# TASK PROJECT CRUD OPERATIONS
# =====================================================

@frappe.whitelist()
def create_task_project(data):
    """
    Create a new Task Project
    
    Args:
        data: Dictionary or JSON string
            {
                "name": str (required),
                "description": str (optional),
                "client_profile": str (required),
                "start_date": str (optional, date string),
                "end_date": str (optional, date string),
                "status": str (optional, default: "active")
            }
    
    Returns:
        dict: Created Task Project data
    """
    try:
        from frappe.utils import get_datetime, nowdate
        
        if isinstance(data, str):
            data = frappe.parse_json(data)
        
        if not data.get("name"):
            frappe.throw(_("Enter a project name."))
        if not data.get("client_profile"):
            frappe.throw(_("Choose a client profile."))
        
        project = frappe.new_doc("Task Project")
        project.name = data.get("name")
        project.description = data.get("description", "")
        project.client_profile = data.get("client_profile")
        project.status = data.get("status", "active")
        
        if data.get("start_date"):
            project.start_date = get_datetime(data.get("start_date")).date()
        else:
            project.start_date = nowdate()
        
        if data.get("end_date"):
            project.end_date = get_datetime(data.get("end_date")).date()
        
        project.insert()
        frappe.db.commit()
        
        return {
            "success": True,
            "message": _("Project created."),
            "data": project.as_dict()
        }
    
    except Exception as e:
        raise_user_error(e, _("Could not create the project. Please try again."), "Task Master Data API: Create Project")


@frappe.whitelist()
def get_task_project(project_name):
    """Get a Task Project with details"""
    try:
        if not frappe.db.exists("Task Project", project_name):
            frappe.throw(_("This project no longer exists."))
        
        project = frappe.get_doc("Task Project", project_name)
        
        # Get tasks in this project
        tasks = frappe.get_all(
            "Task",
            filters={"project": project_name},
            fields=["name", "title", "status", "priority", "deadline"],
            order_by="deadline asc"
        )
        
        project_dict = project.as_dict()
        project_dict["tasks"] = tasks
        project_dict["tasks_count"] = len(tasks)
        
        return {
            "success": True,
            "data": project_dict
        }
    
    except Exception as e:
        raise_user_error(e, _("Could not load the project. Please try again."), "Task Master Data API: Get Project")


@frappe.whitelist()
def list_task_projects(filters=None, fields=None):
    """List all Task Projects"""
    try:
        if isinstance(filters, str):
            filters = frappe.parse_json(filters)
        if filters is None:
            filters = {}
        
        field_list = None
        if fields:
            field_list = [f.strip() for f in fields.split(",")]
        
        projects = frappe.get_all(
            "Task Project",
            filters=filters,
            fields=field_list or ["name", "description", "client_profile", "status", "start_date", "end_date"],
            order_by="start_date desc"
        )
        
        return {
            "success": True,
            "data": projects,
            "count": len(projects)
        }
    
    except Exception as e:
        raise_user_error(e, _("Could not load projects. Please try again."), "Task Master Data API: List Projects")


@frappe.whitelist()
def get_project_statistics(project_name):
    """
    Get statistics for a Task Project
    
    Returns:
        dict: Project statistics (task counts by status)
    """
    try:
        if not frappe.db.exists("Task Project", project_name):
            frappe.throw(_("This project no longer exists."))
        
        statuses = ["Requested", "Assigned", "In Progress", "Completed", "Cancelled"]
        stats = {}
        
        for status in statuses:
            count = frappe.db.count("Task", filters={"project": project_name, "status": status})
            stats[status] = count
        
        stats["total"] = sum(stats.values())
        
        return {
            "success": True,
            "data": stats
        }
    
    except Exception as e:
        raise_user_error(e, _("Could not load project statistics. Please try again."), "Task Master Data API: Project Statistics")


