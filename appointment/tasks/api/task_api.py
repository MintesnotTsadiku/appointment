"""
Tasks Module API Endpoints
Provides CRUD operations for Task management
"""

import frappe
from frappe import _
from frappe.utils import cint, flt, nowdate, now_datetime, get_datetime
from appointment.assistants.helpers.display_names import add_task_names
from appointment.assistants.helpers.errors import raise_user_error


# =====================================================
# TASK CRUD OPERATIONS
# =====================================================

@frappe.whitelist()
def create_task(data):
    """
    Create a new Task
    
    Args:
        data: Dictionary or JSON string containing task data
            {
                "title": str (required),
                "description": str (optional),
                "status": str (optional, default: "Requested"),
                "priority": str (optional, default: "Medium"),
                "deadline": str (optional, datetime string),
                "assignee": str (optional, VA Profile name),
                "client_profile": str (required),
                "category": str (optional, Task Category name),
                "project": str (optional, Task Project name),
                "estimated_duration": int (optional, minutes),
                "is_daily_briefing": int (optional, 0 or 1)
            }
    
    Returns:
        dict: Created task data with name
    """
    try:
        if isinstance(data, str):
            data = frappe.parse_json(data)
        
        # Validate required fields
        if not data.get("title"):
            frappe.throw(_("Enter a task title."))
        if not data.get("client_profile"):
            frappe.throw(_("Choose a client profile."))
        
        # Create task document
        task = frappe.new_doc("Task")
        task.title = data.get("title")
        task.description = data.get("description", "")
        task.status = data.get("status", "Requested")
        task.priority = data.get("priority", "Medium")
        task.client_profile = data.get("client_profile")
        
        if data.get("deadline"):
            task.deadline = get_datetime(data.get("deadline"))
        
        if data.get("assignee"):
            task.assignee = data.get("assignee")
        
        if data.get("category"):
            task.category = data.get("category")
        
        if data.get("project"):
            task.project = data.get("project")
        
        if data.get("estimated_duration"):
            task.estimated_duration = cint(data.get("estimated_duration"))
        
        if data.get("is_daily_briefing") is not None:
            task.is_daily_briefing = cint(data.get("is_daily_briefing"))
        
        # Add dependencies if provided
        if data.get("dependencies"):
            for dep in data.get("dependencies", []):
                task.append("dependencies", {
                    "depends_on_task": dep.get("depends_on_task"),
                    "dependency_type": dep.get("dependency_type", "finish_to_start")
                })
        
        task.insert()
        frappe.db.commit()
        
        return {
            "success": True,
            "message": _("Task created."),
            "data": _task_payload(task)
        }
    
    except Exception as e:
        raise_user_error(e, _("Could not create the task. Please try again."), "Task API: Create")


@frappe.whitelist()
def get_task(task_name, fields=None):
    """
    Get a single task by name
    
    Args:
        task_name: Name of the task
        fields: Optional comma-separated list of fields to return
    
    Returns:
        dict: Task data
    """
    try:
        if not frappe.db.exists("Task", task_name):
            frappe.throw(_("This task no longer exists."))
        
        if fields:
            field_list = [f.strip() for f in fields.split(",")]
            task = frappe.get_doc("Task", task_name)
            return {
                "success": True,
                "data": add_task_names([{field: getattr(task, field, None) for field in field_list if hasattr(task, field)}])[0]
            }
        else:
            task = frappe.get_doc("Task", task_name)
            return {
                "success": True,
                "data": _task_payload(task)
            }
    
    except Exception as e:
        raise_user_error(e, _("Could not load the task. Please try again."), "Task API: Get")


@frappe.whitelist()
def list_tasks(filters=None, fields=None, page_length=20, page_start=0, order_by="modified desc"):
    """
    List tasks with filtering and pagination
    
    Args:
        filters: Dictionary or JSON string with filters
        fields: Optional comma-separated list of fields to return
        page_length: Number of records per page (default: 20)
        page_start: Starting record index (default: 0)
        order_by: Sort order (default: "modified desc")
    
    Returns:
        dict: List of tasks with pagination info
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
        tasks = frappe.get_list(
            "Task",
            filters=filters,
            fields=field_list or ["name", "title", "status", "priority", "deadline", "assignee", "client_profile", "modified"],
            limit_start=cint(page_start),
            limit_page_length=cint(page_length),
            order_by=order_by
        )
        
        total_count = frappe.db.count("Task", filters=filters)
        
        return {
            "success": True,
            "data": add_task_names(tasks),
            "total": total_count,
            "page_start": cint(page_start),
            "page_length": cint(page_length)
        }
    
    except Exception as e:
        raise_user_error(e, _("Could not load tasks. Please try again."), "Task API: List")


@frappe.whitelist()
def update_task(task_name, data):
    """
    Update an existing task
    
    Args:
        task_name: Name of the task to update
        data: Dictionary or JSON string with fields to update
    
    Returns:
        dict: Updated task data
    """
    try:
        if isinstance(data, str):
            data = frappe.parse_json(data)
        
        if not frappe.db.exists("Task", task_name):
            frappe.throw(_("This task no longer exists."))
        
        task = frappe.get_doc("Task", task_name)
        
        # Update fields
        updatable_fields = [
            "title", "description", "status", "priority", "deadline",
            "assignee", "category", "project", "estimated_duration",
            "actual_duration", "is_daily_briefing"
        ]
        
        for field in updatable_fields:
            if field in data:
                if field in ["deadline"] and data[field]:
                    setattr(task, field, get_datetime(data[field]))
                elif field in ["estimated_duration", "actual_duration", "is_daily_briefing"]:
                    setattr(task, field, cint(data[field]) if data[field] is not None else None)
                else:
                    setattr(task, field, data[field])
        
        # Update dependencies if provided
        if "dependencies" in data:
            task.dependencies = []
            for dep in data.get("dependencies", []):
                task.append("dependencies", {
                    "depends_on_task": dep.get("depends_on_task"),
                    "dependency_type": dep.get("dependency_type", "finish_to_start")
                })
        
        task.save()
        frappe.db.commit()
        
        return {
            "success": True,
            "message": _("Task updated."),
            "data": _task_payload(task)
        }
    
    except Exception as e:
        raise_user_error(e, _("Could not update the task. Please try again."), "Task API: Update")


@frappe.whitelist()
def delete_task(task_name):
    """
    Delete a task
    
    Args:
        task_name: Name of the task to delete
    
    Returns:
        dict: Success message
    """
    try:
        if not frappe.db.exists("Task", task_name):
            frappe.throw(_("This task no longer exists."))
        
        frappe.delete_doc("Task", task_name, force=1)
        frappe.db.commit()
        
        return {
            "success": True,
            "message": _("Task deleted.")
        }
    
    except Exception as e:
        raise_user_error(e, _("Could not delete the task. Please try again."), "Task API: Delete")


# =====================================================
# TASK STATUS & WORKFLOW OPERATIONS
# =====================================================

@frappe.whitelist()
def update_task_status(task_name, status):
    """
    Update task status with workflow validation
    
    Args:
        task_name: Name of the task
        status: New status (Requested, Assigned, In Progress, Completed, Cancelled)
    
    Returns:
        dict: Updated task data
    """
    try:
        if not frappe.db.exists("Task", task_name):
            frappe.throw(_("This task no longer exists."))
        
        valid_statuses = ["Requested", "Assigned", "In Progress", "Completed", "Cancelled"]
        if status not in valid_statuses:
            frappe.throw(_("Choose a valid task status: {0}.").format(", ".join(valid_statuses)))
        
        task = frappe.get_doc("Task", task_name)
        task.status = status
        
        # Auto-set completion date
        if status == "Completed" and not task.actual_duration:
            if task.estimated_duration:
                task.actual_duration = task.estimated_duration
        
        task.save()
        frappe.db.commit()
        
        return {
            "success": True,
            "message": _("Task status updated."),
            "data": _task_payload(task)
        }
    
    except Exception as e:
        raise_user_error(e, _("Could not change the task status. Please try again."), "Task API: Update Status")


@frappe.whitelist()
def assign_task(task_name, assignee):
    """
    Assign a task to a VA Profile
    
    Args:
        task_name: Name of the task
        assignee: VA Profile name
    
    Returns:
        dict: Updated task data
    """
    try:
        if not frappe.db.exists("Task", task_name):
            frappe.throw(_("This task no longer exists."))
        
        if assignee and not frappe.db.exists("VA Profile", assignee):
            frappe.throw(_("This VA profile no longer exists."))
        
        task = frappe.get_doc("Task", task_name)
        task.assignee = assignee
        
        if assignee and task.status == "Requested":
            task.status = "Assigned"
        
        task.save()
        frappe.db.commit()
        
        return {
            "success": True,
            "message": _("Task assigned."),
            "data": _task_payload(task)
        }
    
    except Exception as e:
        raise_user_error(e, _("Could not assign the task. Please try again."), "Task API: Assign")


# =====================================================
# TASK QUERIES & FILTERS
# =====================================================

@frappe.whitelist()
def get_tasks_by_client(client_profile, status=None):
    """
    Get all tasks for a specific client
    
    Args:
        client_profile: Client Profile name
        status: Optional status filter
    
    Returns:
        dict: List of tasks
    """
    try:
        filters = {"client_profile": client_profile}
        if status:
            filters["status"] = status
        
        tasks = frappe.get_all(
            "Task",
            filters=filters,
            fields=["name", "title", "status", "priority", "deadline", "assignee", "modified"],
            order_by="deadline asc, priority desc"
        )
        
        return {
            "success": True,
            "data": add_task_names(tasks),
            "count": len(tasks)
        }
    
    except Exception as e:
        raise_user_error(e, _("Could not load tasks. Please try again."), "Task API: Get by Client")


@frappe.whitelist()
def get_tasks_by_assignee(assignee, status=None):
    """
    Get all tasks assigned to a VA
    
    Args:
        assignee: VA Profile name
        status: Optional status filter
    
    Returns:
        dict: List of tasks
    """
    try:
        filters = {"assignee": assignee}
        if status:
            filters["status"] = status
        
        tasks = frappe.get_all(
            "Task",
            filters=filters,
            fields=["name", "title", "status", "priority", "deadline", "client_profile", "modified"],
            order_by="deadline asc, priority desc"
        )
        
        return {
            "success": True,
            "data": add_task_names(tasks),
            "count": len(tasks)
        }
    
    except Exception as e:
        raise_user_error(e, _("Could not load tasks. Please try again."), "Task API: Get by Assignee")


@frappe.whitelist()
def get_daily_briefing_tasks(client_profile=None, date=None):
    """
    Get tasks marked for daily briefing
    
    Args:
        client_profile: Optional client profile filter
        date: Optional date filter (default: today)
    
    Returns:
        dict: List of daily briefing tasks
    """
    try:
        from datetime import datetime
        
        filters = {"is_daily_briefing": 1}
        
        if client_profile:
            filters["client_profile"] = client_profile
        
        if date:
            date_obj = get_datetime(date).date()
        else:
            date_obj = nowdate()
        
        # Get tasks with deadline on or before the date, or no deadline
        tasks = frappe.get_all(
            "Task",
            filters=filters,
            fields=["name", "title", "status", "priority", "deadline", "assignee", "client_profile"],
            order_by="priority desc, deadline asc"
        )
        
        # Filter by date if deadline exists
        filtered_tasks = []
        for task in tasks:
            if not task.get("deadline") or get_datetime(task.deadline).date() <= date_obj:
                filtered_tasks.append(task)
        
        return {
            "success": True,
            "data": add_task_names(filtered_tasks),
            "date": str(date_obj),
            "count": len(filtered_tasks)
        }
    
    except Exception as e:
        raise_user_error(e, _("Could not load the daily briefing. Please try again."), "Task API: Daily Briefing")


@frappe.whitelist()
def get_task_statistics(client_profile=None, assignee=None):
    """
    Get task statistics (counts by status)
    
    Args:
        client_profile: Optional client profile filter
        assignee: Optional assignee filter
    
    Returns:
        dict: Task statistics
    """
    try:
        filters = {}
        if client_profile:
            filters["client_profile"] = client_profile
        if assignee:
            filters["assignee"] = assignee
        
        statuses = ["Requested", "Assigned", "In Progress", "Completed", "Cancelled"]
        stats = {}
        
        for status in statuses:
            status_filters = filters.copy()
            status_filters["status"] = status
            stats[status] = frappe.db.count("Task", filters=status_filters)
        
        total = sum(stats.values())
        stats["total"] = total
        
        return {
            "success": True,
            "data": stats
        }
    
    except Exception as e:
        raise_user_error(e, _("Could not load task statistics. Please try again."), "Task API: Statistics")


def _task_payload(task):
    """The task as a dict, with the client's and assignee's display names."""
    return add_task_names([task.as_dict()])[0]
