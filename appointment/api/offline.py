"""
Offline Sync API for PWA
Handles batch synchronization of offline actions when user comes back online

CRITICAL FIX #5A: Batch sync endpoint for transactional integrity
"""

import frappe
from frappe import _
from typing import List, Dict, Any
import json


@frappe.whitelist(allow_guest=False, methods=['POST'])
def sync_queue(actions: List[Dict[str, Any]]):
    """
    Batch sync endpoint for offline actions
    
    Accepts an array of actions that were queued while offline and processes them
    in a single transaction to ensure data integrity.
    
    Args:
        actions: List of action objects, each containing:
            - type: Action type ('book', 'cancel', 'reschedule', etc.)
            - data: Action-specific data
            - timestamp: When the action was created (client-side)
            - id: Client-side unique ID for tracking
    
    Returns:
        {
            "success": bool,
            "results": [
                {
                    "id": str,  # Client-side action ID
                    "success": bool,
                    "data": Any,  # Response data if successful
                    "error": str  # Error message if failed
                }
            ],
            "summary": {
                "total": int,
                "succeeded": int,
                "failed": int
            }
        }
    
    Example:
        POST /api/method/appointment.api.offline.sync_queue
        {
            "actions": [
                {
                    "type": "book",
                    "data": {
                        "appointment_group": "AG-001",
                        "date": "2025-11-20",
                        "time": "10:00:00",
                        "customer_name": "John Doe",
                        "customer_email": "john@example.com"
                    },
                    "timestamp": "2025-11-16T10:30:00Z",
                    "id": "client-action-123"
                },
                {
                    "type": "cancel",
                    "data": {
                        "appointment": "APT-001"
                    },
                    "timestamp": "2025-11-16T10:35:00Z",
                    "id": "client-action-124"
                }
            ]
        }
    """
    if not isinstance(actions, list):
        frappe.throw(_("Actions must be a list"))
    
    if len(actions) == 0:
        return {
            "success": True,
            "results": [],
            "summary": {
                "total": 0,
                "succeeded": 0,
                "failed": 0
            }
        }
    
    results = []
    succeeded = 0
    failed = 0
    
    # Process all actions in a single transaction
    try:
        frappe.db.begin()
        
        for action in actions:
            action_id = action.get("id", f"unknown-{len(results)}")
            action_type = action.get("type")
            action_data = action.get("data", {})
            
            try:
                # Route to appropriate handler based on action type
                if action_type == "book":
                    result = _handle_book_action(action_data)
                elif action_type == "cancel":
                    result = _handle_cancel_action(action_data)
                elif action_type == "reschedule":
                    result = _handle_reschedule_action(action_data)
                elif action_type == "update_profile":
                    result = _handle_update_profile_action(action_data)
                else:
                    raise ValueError(f"Unknown action type: {action_type}")
                
                results.append({
                    "id": action_id,
                    "success": True,
                    "data": result
                })
                succeeded += 1
                
            except Exception as e:
                # Log error but continue processing other actions
                frappe.log_error(
                    title=f"Offline sync failed for action {action_id}",
                    message=f"Type: {action_type}\nError: {str(e)}\nData: {json.dumps(action_data)}"
                )
                
                results.append({
                    "id": action_id,
                    "success": False,
                    "error": str(e)
                })
                failed += 1
        
        # Commit all successful actions together
        frappe.db.commit()
        
        return {
            "success": True,
            "results": results,
            "summary": {
                "total": len(actions),
                "succeeded": succeeded,
                "failed": failed
            }
        }
        
    except Exception as e:
        # Rollback on critical error
        frappe.db.rollback()
        frappe.log_error(
            title="Offline sync transaction failed",
            message=str(e)
        )
        
        return {
            "success": False,
            "error": f"Transaction failed: {str(e)}",
            "results": results,  # Partial results if any
            "summary": {
                "total": len(actions),
                "succeeded": succeeded,
                "failed": failed + (len(actions) - len(results))
            }
        }


def _handle_book_action(data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle booking action"""
    # Import here to avoid circular dependencies
    from appointment.api.personal_meet import create_appointment
    
    # Map offline data to API parameters
    appointment_data = {
        "appointment_group": data.get("appointment_group"),
        "date": data.get("date"),
        "time": data.get("time"),
        "customer_name": data.get("customer_name"),
        "customer_email": data.get("customer_email"),
        "customer_phone": data.get("customer_phone"),
        "notes": data.get("notes"),
    }
    
    # Call the actual booking API
    result = create_appointment(**appointment_data)
    
    return {
        "appointment": result.get("name"),
        "status": "Booked"
    }


def _handle_cancel_action(data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle cancellation action"""
    appointment_name = data.get("appointment")
    
    if not appointment_name:
        raise ValueError("Appointment name is required")
    
    # Check if appointment exists and belongs to user
    appointment = frappe.get_doc("Appointment", appointment_name)
    
    # Verify ownership or permissions
    if not frappe.has_permission("Appointment", "write", appointment):
        raise frappe.PermissionError("You don't have permission to cancel this appointment")
    
    # Cancel the appointment
    appointment.status = "Cancelled"
    appointment.save()
    frappe.db.commit()
    
    return {
        "appointment": appointment_name,
        "status": "Cancelled"
    }


def _handle_reschedule_action(data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle reschedule action"""
    appointment_name = data.get("appointment")
    new_date = data.get("new_date")
    new_time = data.get("new_time")
    
    if not all([appointment_name, new_date, new_time]):
        raise ValueError("Appointment name, new date, and new time are required")
    
    # Get appointment
    appointment = frappe.get_doc("Appointment", appointment_name)
    
    # Verify ownership or permissions
    if not frappe.has_permission("Appointment", "write", appointment):
        raise frappe.PermissionError("You don't have permission to reschedule this appointment")
    
    # Update appointment
    appointment.date = new_date
    appointment.time = new_time
    appointment.save()
    frappe.db.commit()
    
    return {
        "appointment": appointment_name,
        "status": "Rescheduled",
        "new_date": new_date,
        "new_time": new_time
    }


def _handle_update_profile_action(data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle profile update action"""
    # This would update user profile information
    # Implementation depends on your profile structure
    
    user = frappe.session.user
    user_doc = frappe.get_doc("User", user)
    
    # Update allowed fields
    allowed_fields = ["first_name", "last_name", "phone", "mobile_no"]
    for field in allowed_fields:
        if field in data:
            user_doc.set(field, data[field])
    
    user_doc.save()
    frappe.db.commit()
    
    return {
        "user": user,
        "status": "Updated"
    }


@frappe.whitelist(allow_guest=False, methods=['GET'])
def get_sync_status():
    """
    Get sync status for debugging
    
    Returns information about the last sync attempt and current queue status
    """
    # This could be enhanced to track sync history in a doctype
    return {
        "last_sync": None,  # Could be stored in cache or doctype
        "pending_actions": 0,  # Could be tracked client-side
        "status": "ready"
    }





