# Copyright (c) 2025, minte and contributors
# For license information, please see license.txt

"""
Policy Templates for easy policy creation.
Provides pre-configured templates that users can select to quickly create policies.
"""

POLICY_TEMPLATES = {
    "standard": {
        "name": "Standard Deposit Policy",
        "description": "Standard 50% deposit policy with 24-hour cancellation window",
        "deposit_percentage": 50,
        "deposit_amount": 0,
        "cancellation_window_hours": 24,
        "reschedule_window_hours": 24,
        "late_cancellation_fee_percentage": 20,
        "late_cancellation_fee_amount": 0,
        "no_show_fee_percentage": 100,
        "refund_policy": "Full Refund"
    },
    "premium": {
        "name": "Premium Policy",
        "description": "Premium policy with higher deposit (75%) and longer cancellation window (48 hours)",
        "deposit_percentage": 75,
        "deposit_amount": 0,
        "cancellation_window_hours": 48,
        "reschedule_window_hours": 48,
        "late_cancellation_fee_percentage": 30,
        "late_cancellation_fee_amount": 0,
        "no_show_fee_percentage": 100,
        "refund_policy": "Partial Refund"
    },
    "no_deposit": {
        "name": "No Deposit Policy",
        "description": "No deposit required, but strict cancellation rules (2-hour window)",
        "deposit_percentage": 0,
        "deposit_amount": 0,
        "cancellation_window_hours": 2,
        "reschedule_window_hours": 2,
        "late_cancellation_fee_percentage": 50,
        "late_cancellation_fee_amount": 0,
        "no_show_fee_percentage": 100,
        "refund_policy": "No Refund"
    },
    "flexible": {
        "name": "Flexible Policy",
        "description": "Flexible policy with lower deposit (30%) and shorter cancellation window (6 hours)",
        "deposit_percentage": 30,
        "deposit_amount": 0,
        "cancellation_window_hours": 6,
        "reschedule_window_hours": 6,
        "late_cancellation_fee_percentage": 10,
        "late_cancellation_fee_amount": 0,
        "no_show_fee_percentage": 75,
        "refund_policy": "Full Refund"
    },
    "location_based": {
        "name": "Location-Based Policy",
        "description": "Fixed deposit amount policy (500 ETB) with 12-hour cancellation window",
        "deposit_percentage": 0,
        "deposit_amount": 500,
        "cancellation_window_hours": 12,
        "reschedule_window_hours": 12,
        "late_cancellation_fee_percentage": 0,
        "late_cancellation_fee_amount": 200,
        "no_show_fee_percentage": 50,
        "refund_policy": "Full Refund"
    }
}


def get_policy_template(template_key: str) -> dict:
    """
    Get a policy template by key.
    
    Args:
        template_key: Template identifier (standard, premium, no_deposit, flexible, location_based)
    
    Returns:
        Template configuration dict
    """
    return POLICY_TEMPLATES.get(template_key, {})


def get_all_templates() -> dict:
    """
    Get all available policy templates.
    
    Returns:
        Dict of all templates with their keys
    """
    return POLICY_TEMPLATES


def apply_template_to_policy(template_key: str, policy_doc) -> None:
    """
    Apply template values to a policy document.
    
    Args:
        template_key: Template identifier
        policy_doc: Policy document to populate
    """
    template = get_policy_template(template_key)
    if not template:
        return
    
    # Apply template values
    if template.get("name"):
        if not policy_doc.policy_name:
            policy_doc.policy_name = template["name"]
        if not policy_doc.description:
            policy_doc.description = template.get("description", "")
    
    policy_doc.deposit_percentage = template.get("deposit_percentage", 0)
    policy_doc.deposit_amount = template.get("deposit_amount", 0)
    policy_doc.cancellation_window_hours = template.get("cancellation_window_hours", 0)
    policy_doc.reschedule_window_hours = template.get("reschedule_window_hours", 0)
    policy_doc.late_cancellation_fee_percentage = template.get("late_cancellation_fee_percentage", 0)
    policy_doc.late_cancellation_fee_amount = template.get("late_cancellation_fee_amount", 0)
    policy_doc.no_show_fee_percentage = template.get("no_show_fee_percentage", 0)
    policy_doc.refund_policy = template.get("refund_policy", "Full Refund")
    
    # Mark as template-based
    if hasattr(policy_doc, 'is_template_based'):
        policy_doc.is_template_based = 1
    if hasattr(policy_doc, 'template_used'):
        policy_doc.template_used = template_key





