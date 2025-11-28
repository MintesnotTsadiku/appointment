# Copyright (c) 2025, minte and contributors
# For license information, please see license.txt

"""
Policy Manager API for Providers and Organizations
Allows users to create and manage policies through a user-friendly interface
"""

import frappe
from frappe import _
from frappe.utils import today, add_days
from frappe_appointment.scheduler.helpers.policy_templates import get_all_templates, get_policy_template, apply_template_to_policy
from frappe_appointment.helpers.overrides import add_response_code


@frappe.whitelist()
@add_response_code
def get_policy_templates():
    """
    Get all available policy templates.
    
    Returns:
        List of templates with their configurations
    """
    templates = get_all_templates()
    
    result = []
    for key, template in templates.items():
        result.append({
            "key": key,
            "name": template.get("name", ""),
            "description": template.get("description", ""),
            "deposit_percentage": template.get("deposit_percentage", 0),
            "deposit_amount": template.get("deposit_amount", 0),
            "cancellation_window_hours": template.get("cancellation_window_hours", 0),
            "reschedule_window_hours": template.get("reschedule_window_hours", 0),
            "late_cancellation_fee_percentage": template.get("late_cancellation_fee_percentage", 0),
            "late_cancellation_fee_amount": template.get("late_cancellation_fee_amount", 0),
            "no_show_fee_percentage": template.get("no_show_fee_percentage", 0),
            "refund_policy": template.get("refund_policy", "Full Refund")
        })
    
    return {"templates": result}, 200


@frappe.whitelist()
@add_response_code
def create_policy_from_template(
    template_key: str,
    applies_to: str,
    policy_name: str = None,
    description: str = None,
    service: str = None,
    location: str = None,
    provider: str = None,
    valid_from: str = None,
    valid_to: str = None,
    **kwargs
):
    """
    Create a policy from a template.
    
    Args:
        template_key: Template identifier (standard, premium, etc.)
        applies_to: Policy applicability (All Services, Specific Service, etc.)
        policy_name: Custom policy name (optional, uses template name if not provided)
        description: Custom description (optional)
        service: Service name (if applies_to = "Specific Service")
        location: Location name (if applies_to = "Specific Location")
        provider: Provider name (if applies_to = "Specific Provider")
        valid_from: Start date (defaults to today)
        valid_to: End date (optional)
        **kwargs: Additional overrides for template values
    
    Returns:
        Created policy document
    """
    # Validate template
    template = get_policy_template(template_key)
    if not template:
        return {"error": f"Template '{template_key}' not found"}, 404
    
    # Validate user permissions
    user = frappe.session.user
    # Use organization_id parameter if provided, otherwise try to infer from applies_to
    if not organization_id and applies_to in ["All Services", "Specific Service", "Specific Location"]:
        # Try to get organization from service or location if provided
        if service:
            organization_id = frappe.db.get_value("Service", service, "organization")
        elif location:
            organization_id = frappe.db.get_value("Location", location, "organization")
    
    validation_result = validate_policy_creation_permission(
        user, applies_to, 
        service=service, location=location, provider=provider,
        organization_id=organization_id
    )
    if not validation_result["allowed"]:
        return {"error": validation_result["message"]}, 403
    
    try:
        # Create policy document
        policy = frappe.new_doc("Policy")
        
        # Apply template
        apply_template_to_policy(template_key, policy)
        
        # Override with provided values
        if policy_name:
            policy.policy_name = policy_name
        if description:
            policy.description = description
        
        policy.applies_to = applies_to
        policy.is_active = 1
        
        # Set specific links based on applies_to
        if applies_to == "All Services":
            # Set organization for "All Services" policies
            # Priority: organization parameter > organization_id parameter > from service > from validation
            if organization:
                policy.organization = organization
            elif organization_id:
                policy.organization = organization_id
            elif service:
                # Get organization from service if provided
                policy.organization = frappe.db.get_value("Service", service, "organization")
            elif not policy.organization:
                # Fallback: use organization from validation result
                if validation_result.get("organization_name"):
                    policy.organization = validation_result["organization_name"]
        elif applies_to == "Specific Service" and service:
            policy.service = service
        elif applies_to == "Specific Location" and location:
            policy.location = location
        elif applies_to == "Specific Provider" and provider:
            policy.provider = provider
        
        # Set validity dates
        policy.valid_from = frappe.utils.getdate(valid_from) if valid_from else today()
        if valid_to:
            policy.valid_to = frappe.utils.getdate(valid_to)
        
        # Allow template value overrides via kwargs
        if kwargs.get("deposit_percentage") is not None:
            policy.deposit_percentage = float(kwargs.get("deposit_percentage", 0))
        if kwargs.get("deposit_amount") is not None:
            policy.deposit_amount = float(kwargs.get("deposit_amount", 0))
        if kwargs.get("cancellation_window_hours") is not None:
            policy.cancellation_window_hours = int(kwargs.get("cancellation_window_hours", 0))
        if kwargs.get("reschedule_window_hours") is not None:
            policy.reschedule_window_hours = int(kwargs.get("reschedule_window_hours", 0))
        if kwargs.get("late_cancellation_fee_percentage") is not None:
            policy.late_cancellation_fee_percentage = float(kwargs.get("late_cancellation_fee_percentage", 0))
        if kwargs.get("late_cancellation_fee_amount") is not None:
            policy.late_cancellation_fee_amount = float(kwargs.get("late_cancellation_fee_amount", 0))
        if kwargs.get("no_show_fee_percentage") is not None:
            policy.no_show_fee_percentage = float(kwargs.get("no_show_fee_percentage", 0))
        if kwargs.get("refund_policy"):
            policy.refund_policy = kwargs.get("refund_policy")
        
        # Set ownership tracking
        if validation_result.get("provider_name"):
            policy.created_by_provider = validation_result["provider_name"]
        if validation_result.get("organization_name"):
            # Use organization name (ID), not organization_name field
            # The validation_result returns organization_name which is the name field
            policy.created_by_organization = validation_result["organization_name"]
        
        policy.insert(ignore_permissions=True)
        frappe.db.commit()
        
        return {
            "success": True,
            "policy": policy.as_dict(),
            "message": f"Policy '{policy.policy_name}' created successfully"
        }, 200
    
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Policy Manager: Create Policy Error")
        return {"error": f"Failed to create policy: {str(e)}"}, 500


@frappe.whitelist()
@add_response_code
def get_user_policies(user_type: str = None, entity_id: str = None):
    """
    Get policies for the current user (provider or organization).
    
    Args:
        user_type: "provider" or "organization" (auto-detected if not provided)
        entity_id: Provider or Organization name (auto-detected if not provided)
    
    Returns:
        List of policies
    """
    user = frappe.session.user
    
    # Auto-detect user type and entity
    if not user_type or not entity_id:
        # Check if user is a provider
        provider = frappe.db.get_value("Provider", {"user": user}, "name")
        if provider:
            user_type = "provider"
            entity_id = provider
        else:
            # Check if user owns/manages an organization
            org = frappe.db.get_value("Organization", {"owner_user": user}, "name")
            if org:
                user_type = "organization"
                entity_id = org
            else:
                # Check if user is a manager of an organization
                orgs = frappe.get_all(
                    "Organization Manager",
                    filters={"user": user, "status": "Active"},
                    fields=["parent"],
                    limit=1
                )
                if orgs:
                    user_type = "organization"
                    entity_id = orgs[0].parent
    
    if not user_type or not entity_id:
        return {"error": "User is not associated with a provider or organization"}, 404
    
    policies = []
    
    if user_type == "provider":
        # Get provider-specific policies
        provider_policies = frappe.get_all(
            "Policy",
            filters={
                "applies_to": "Specific Provider",
                "provider": entity_id
            },
            fields=["*"],
            order_by="creation desc"
        )
        policies = provider_policies
    
    elif user_type == "organization":
        # Get organization-wide policies (All Services)
        # Use organization field (explicit link) or fallback to created_by_organization
        org_wide_policies = frappe.get_all(
            "Policy",
            filters={
                "applies_to": "All Services",
                "organization": entity_id
            },
            fields=["*"],
            order_by="creation desc"
        )
        
        # Also get policies created by this org (for backward compatibility)
        if not org_wide_policies:
            org_wide_policies = frappe.get_all(
                "Policy",
                filters={
                    "applies_to": "All Services",
                    "created_by_organization": entity_id
                },
                fields=["*"],
                order_by="creation desc"
            )
        
        # Get service-specific policies for org's services
        org_services = frappe.get_all(
            "Service",
            filters={"organization": entity_id},
            pluck="name"
        )
        
        service_policies = []
        if org_services:
            service_policies = frappe.get_all(
                "Policy",
                filters={
                    "applies_to": "Specific Service",
                    "service": ["in", org_services],
                    "created_by_organization": entity_id
                },
                fields=["*"],
                order_by="creation desc"
            )
        
        policies = org_wide_policies + service_policies
    
    return {
        "policies": policies,
        "count": len(policies),
        "user_type": user_type,
        "entity_id": entity_id
    }, 200


@frappe.whitelist()
def validate_policy_creation_permission(
    user: str,
    applies_to: str,
    service: str = None,
    location: str = None,
    provider: str = None,
    organization_id: str = None
) -> dict:
    """
    Validate if user has permission to create a policy with the given parameters.
    
    Args:
        user: User name
        applies_to: Policy applicability
        service: Service name (if applicable)
        location: Location name (if applicable)
        provider: Provider name (if applicable)
    
    Returns:
        {
            "allowed": bool,
            "message": str,
            "provider_name": str (if provider),
            "organization_name": str (if organization)
        }
    """
    # Check if user is a provider
    user_provider = frappe.db.get_value("Provider", {"user": user}, "name")
    
    # Check if user owns/manages an organization
    # If organization_id is provided, use it (for organization owners with multiple orgs)
    if organization_id:
        # Verify user has access to this organization
        org = frappe.db.get_value("Organization", organization_id, ["owner_user"], as_dict=True)
        if org and org.owner_user == user:
            user_org = organization_id
        else:
            # Check if user is a manager of this organization
            is_manager = frappe.db.exists(
                "Organization Manager",
                {"user": user, "parent": organization_id, "status": "Active"}
            )
            if is_manager:
                user_org = organization_id
            else:
                user_org = None
    else:
        # Auto-detect organization
        user_org = frappe.db.get_value("Organization", {"owner_user": user}, "name")
        if not user_org:
            # Check if user is a manager
            org_manager = frappe.get_all(
                "Organization Manager",
                filters={"user": user, "status": "Active"},
                fields=["parent"],
                limit=1
            )
            if org_manager:
                user_org = org_manager[0].parent
    
    # Validate based on applies_to
    if applies_to == "Specific Provider":
        # Only providers can create provider-specific policies
        if not user_provider:
            return {
                "allowed": False,
                "message": "Only providers can create provider-specific policies"
            }
        
        # Provider must match user's provider
        if provider and provider != user_provider:
            return {
                "allowed": False,
                "message": "You can only create policies for your own provider account"
            }
        
        return {
            "allowed": True,
            "message": "",
            "provider_name": user_provider
        }
    
    elif applies_to == "All Services":
        # Only organizations can create org-wide policies
        if not user_org:
            return {
                "allowed": False,
                "message": "Only organization owners/managers can create organization-wide policies"
            }
        
        return {
            "allowed": True,
            "message": "",
            "organization_name": user_org
        }
    
    elif applies_to == "Specific Service":
        # Organizations can create service-specific policies for their services
        if not user_org:
            return {
                "allowed": False,
                "message": "Only organization owners/managers can create service-specific policies"
            }
        
        if service:
            # Verify service belongs to organization
            service_org = frappe.db.get_value("Service", service, "organization")
            if service_org != user_org:
                return {
                    "allowed": False,
                    "message": "Service does not belong to your organization"
                }
        
        return {
            "allowed": True,
            "message": "",
            "organization_name": user_org
        }
    
    elif applies_to == "Specific Location":
        # Organizations can create location-specific policies for their locations
        if not user_org:
            return {
                "allowed": False,
                "message": "Only organization owners/managers can create location-specific policies"
            }
        
        if location:
            # Verify location belongs to organization
            location_org = frappe.db.get_value("Location", location, "organization")
            if location_org != user_org:
                return {
                    "allowed": False,
                    "message": "Location does not belong to your organization"
                }
        
        return {
            "allowed": True,
            "message": "",
            "organization_name": user_org
        }
    
    return {
        "allowed": False,
        "message": "Invalid applies_to value"
    }


@frappe.whitelist()
@add_response_code
def update_policy(policy_name: str, **kwargs):
    """
    Update an existing policy.
    
    Args:
        policy_name: Policy name to update
        **kwargs: Fields to update
    
    Returns:
        Updated policy
    """
    try:
        policy = frappe.get_doc("Policy", policy_name)
        
        # Check permissions
        user = frappe.session.user
        user_provider = frappe.db.get_value("Provider", {"user": user}, "name")
        user_org = frappe.db.get_value("Organization", {"owner_user": user}, "name")
        
        # Verify ownership
        if policy.created_by_provider and policy.created_by_provider != user_provider:
            return {"error": "You don't have permission to edit this policy"}, 403
        
        if policy.created_by_organization and policy.created_by_organization != user_org:
            # Check if user is a manager
            is_manager = frappe.db.exists(
                "Organization Manager",
                {"user": user, "parent": policy.created_by_organization, "status": "Active"}
            )
            if not is_manager:
                return {"error": "You don't have permission to edit this policy"}, 403
        
        # Update fields
        for key, value in kwargs.items():
            if hasattr(policy, key):
                setattr(policy, key, value)
        
        policy.save(ignore_permissions=True)
        frappe.db.commit()
        
        return {
            "success": True,
            "policy": policy.as_dict(),
            "message": "Policy updated successfully"
        }, 200
    
    except frappe.DoesNotExistError:
        return {"error": "Policy not found"}, 404
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Policy Manager: Update Policy Error")
        return {"error": f"Failed to update policy: {str(e)}"}, 500


@frappe.whitelist()
@add_response_code
def delete_policy(policy_name: str):
    """
    Delete a policy.
    
    Args:
        policy_name: Policy name to delete
    
    Returns:
        Success message
    """
    try:
        policy = frappe.get_doc("Policy", policy_name)
        
        # Check permissions
        user = frappe.session.user
        user_provider = frappe.db.get_value("Provider", {"user": user}, "name")
        user_org = frappe.db.get_value("Organization", {"owner_user": user}, "name")
        
        # Verify ownership
        if policy.created_by_provider and policy.created_by_provider != user_provider:
            return {"error": "You don't have permission to delete this policy"}, 403
        
        if policy.created_by_organization and policy.created_by_organization != user_org:
            # Check if user is a manager
            is_manager = frappe.db.exists(
                "Organization Manager",
                {"user": user, "parent": policy.created_by_organization, "status": "Active"}
            )
            if not is_manager:
                return {"error": "You don't have permission to delete this policy"}, 403
        
        policy.delete(ignore_permissions=True)
        frappe.db.commit()
        
        return {
            "success": True,
            "message": "Policy deleted successfully"
        }, 200
    
    except frappe.DoesNotExistError:
        return {"error": "Policy not found"}, 404
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Policy Manager: Delete Policy Error")
        return {"error": f"Failed to delete policy: {str(e)}"}, 500


@frappe.whitelist()
@add_response_code
def get_organization_services(organization_id: str = None):
    """
    Get services for an organization (for policy creation).
    
    Args:
        organization_id: Organization name (auto-detected if not provided)
    
    Returns:
        List of services
    """
    user = frappe.session.user
    
    # Auto-detect organization
    if not organization_id:
        organization_id = frappe.db.get_value("Organization", {"owner_user": user}, "name")
        if not organization_id:
            org_manager = frappe.get_all(
                "Organization Manager",
                filters={"user": user, "status": "Active"},
                fields=["parent"],
                limit=1
            )
            if org_manager:
                organization_id = org_manager[0].parent
    
    if not organization_id:
        return {"error": "Organization not found"}, 404
    
    services = frappe.get_all(
        "Service",
        filters={"organization": organization_id, "is_active": 1},
        fields=["name", "service_name", "duration", "price", "creation"],
        order_by="service_name, creation desc"
    )
    
    return {"services": services}, 200

