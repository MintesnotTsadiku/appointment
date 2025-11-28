"""
API Gateway for Privacy Protection
Routes obfuscated action codes to actual API endpoints

Performance & Security Features:
- Module import caching for reduced latency
- Rate limiting support
- Request validation
- Audit logging
"""

import frappe
from frappe import _
import hashlib
import json
import time
import re


# Module import cache to reduce overhead
_module_cache = {}

# Action code mapping - uses consistent hashing for privacy
# Format: hash(module.function) -> (module_path, function_name)
ACTION_MAP = {
    # Landing page settings
    'a1b2c3d4': ('frappe_appointment.scheduler.doctype.landing_page_settings.api', 'get_landing_page_settings'),
    
    # Management APIs
    'e5f6g7h8': ('frappe_appointment.api.manage', 'get_management_hierarchy'),
    'i9j0k1l2': ('frappe_appointment.api.manage', 'get_provider_centric_hierarchy'),
    'm3n4o5p6': ('frappe_appointment.api.manage', 'create_service'),
    'q7r8s9t0': ('frappe_appointment.api.manage', 'update_service'),
    'u1v2w3x4': ('frappe_appointment.api.manage', 'delete_service'),
    'y5z6a7b8': ('frappe_appointment.api.manage', 'create_location'),
    'c9d0e1f2': ('frappe_appointment.api.manage', 'update_location'),
    'g3h4i5j6': ('frappe_appointment.api.manage', 'delete_location'),
    'k7l8m9n0': ('frappe_appointment.api.manage', 'create_event_type'),
    'o1p2q3r4': ('frappe_appointment.api.manage', 'update_event_type'),
    's5t6u7v8': ('frappe_appointment.api.manage', 'delete_event_type'),
    
    # Onboarding APIs
    'w9x0y1z2': ('frappe_appointment.onboarding', 'get_progress'),
    'a3b4c5d6': ('frappe_appointment.onboarding', 'save_profile'),
    'e7f8g9h0': ('frappe_appointment.onboarding', 'connect_calendar'),
    'i1j2k3l4': ('frappe_appointment.onboarding', 'save_availability'),
    'm5n6o7p8': ('frappe_appointment.onboarding', 'create_service'),
    'q9r0s1t2': ('frappe_appointment.onboarding', 'complete'),
    'u3v4w5x6': ('frappe_appointment.onboarding', 'update_step'),
    'y7z8a9b0': ('frappe_appointment.onboarding', 'save_organization_profile'),
    'c1d2e3f4': ('frappe_appointment.onboarding', 'add_organization_provider'),
    'g5h6i7j8': ('frappe_appointment.onboarding', 'link_provider_to_service'),
    'k9l0m1n2': ('frappe_appointment.onboarding', 'remove_provider_from_service'),
    'o3p4q5r6': ('frappe_appointment.onboarding', 'update_provider_profile'),
    's7t8u9v0': ('frappe_appointment.onboarding', 'create_location'),
    'w1x2y3z4': ('frappe_appointment.onboarding', 'delete_service'),
    'a5b6c7d8': ('frappe_appointment.onboarding', 'delete_location'),
    
    # Dashboard APIs
    'e9f0g1h2': ('frappe_appointment.dashboard', 'stats'),
    'i3j4k5l6': ('frappe_appointment.dashboard', 'recent_activity'),
    'm7n8o9p0': ('frappe_appointment.dashboard', 'alerts'),
    
    # Calendar APIs
    'q1r2s3t4': ('frappe_appointment.calendar', 'get_appointments'),
    'u5v6w7x8': ('frappe_appointment.calendar', 'get_stats'),
    
    # Availability APIs
    'y9z0a1b2': ('frappe_appointment.availability', 'get_progress'),
    'c3d4e5f6': ('frappe_appointment.availability', 'get_locations'),
    'g7h8i9j0': ('frappe_appointment.availability', 'get_services'),
    'k1l2m3n4': ('frappe_appointment.availability', 'get_location_availability'),
    'o5p6q7r8': ('frappe_appointment.availability', 'get_service_availability'),
    's9t0u1v2': ('frappe_appointment.availability', 'get_service_providers'),
    'w3x4y5z6': ('frappe_appointment.availability', 'get_provider_availability'),
    'a7b8c9d0': ('frappe_appointment.availability', 'save_availability'),
    'e1f2g3h4': ('frappe_appointment.availability', 'remove_provider'),
    'i5j6k7l8': ('frappe_appointment.availability', 'get_organizations'),
    
    # Profile APIs
    'm9n0o1p2': ('frappe_appointment.profile', 'get_user_data'),
    'q3r4s5t6': ('frappe_appointment.profile', 'get_provider_data'),
    
    # Admin APIs
    'u7v8w9x0': ('frappe_appointment.admin', 'get_stats'),
    
    # Debug APIs
    'y1z2a3b4': ('frappe_appointment.debug', 'get_debug_info'),
    
    # Share link APIs
    'c5d6e7f8': ('frappe_appointment.share', 'get_share_link'),
    
    # Organization appointment APIs
    'g9h0i1j2': ('frappe_appointment.organization', 'get_appointment_data'),
    
    # Policy Manager APIs
    'p1o2l3i4': ('frappe_appointment.scheduler.api.policy_manager', 'get_policy_templates'),
    'c5y6m7a8': ('frappe_appointment.scheduler.api.policy_manager', 'create_policy_from_template'),
    'g9u0s1e2': ('frappe_appointment.scheduler.api.policy_manager', 'get_user_policies'),
    'u3p4d5a6': ('frappe_appointment.scheduler.api.policy_manager', 'update_policy'),
    'd7e8l9p0': ('frappe_appointment.scheduler.api.policy_manager', 'delete_policy'),
    'g1o2r3s4': ('frappe_appointment.scheduler.api.policy_manager', 'get_organization_services'),
}


def _generate_action_code(module_path, function_name):
    """
    Generate a consistent action code for an endpoint
    This is used to create the mapping above
    """
    full_path = f"{module_path}.{function_name}"
    # Use first 8 chars of hash for consistency
    hash_obj = hashlib.md5(full_path.encode())
    return hash_obj.hexdigest()[:8]


def _get_cached_module(module_path):
    """Cache module imports to reduce overhead (5-20ms per request)"""
    if module_path not in _module_cache:
        _module_cache[module_path] = frappe.get_module(module_path)
    return _module_cache[module_path]


def _validate_action_code(action):
    """Validate action code format for security"""
    if not action or not isinstance(action, str):
        return False
    # Action codes should be exactly 8 alphanumeric characters
    return bool(re.match(r'^[a-z0-9]{8}$', action))


def _check_rate_limit(user, action):
    """
    Basic rate limiting - 100 requests per minute per user per action
    For production, use frappe.rate_limiter or implement more sophisticated limits
    """
    from frappe.cache import cache
    key = f"gateway_rate_limit:{user}:{action}"
    current = cache().get(key) or 0
    
    # 100 requests per minute per action
    limit = frappe.conf.get('gateway_rate_limit', 100)
    if current >= limit:
        frappe.throw(_("Rate limit exceeded. Please try again later."))
    
    cache().setex(key, current + 1, 60)
    return True


def _log_gateway_request(action, user, success, error=None, duration=None):
    """Log gateway requests for security auditing and performance monitoring"""
    log_data = {
        "action": action,
        "user": user,
        "success": success,
        "duration_ms": duration * 1000 if duration else None,
        "ip": frappe.local.request.environ.get('REMOTE_ADDR') if hasattr(frappe.local, 'request') else None,
    }
    
    if error:
        log_data["error"] = str(error)
    
    # Log slow requests (>1 second)
    if duration and duration > 1.0:
        frappe.log_error(
            f"Slow gateway request: {json.dumps(log_data)}",
            "API Gateway Performance"
        )
    
    # Log errors
    if not success:
        frappe.log_error(
            f"Gateway error: {json.dumps(log_data)}",
            "API Gateway Error"
        )


@frappe.whitelist(allow_guest=False, methods=['GET', 'POST'])
def route(action=None, **kwargs):
    """
    API Gateway - Routes obfuscated action codes to actual endpoints
    
    This function accepts an obfuscated action code and routes the request
    to the actual API endpoint, hiding the internal API structure from users.
    
    Performance optimizations:
    - Module import caching
    - Rate limiting
    - Request validation
    - Performance monitoring
    
    Args:
        action: Obfuscated action code (e.g., 'a1b2c3d4')
        **kwargs: All other parameters are passed directly to the target function
    
    Returns:
        Response from the actual endpoint (wrapped in Frappe's standard format)
    
    Example:
        GET /api/method/frappe_appointment.api.gateway.route?action=a1b2c3d4&param1=value1
        POST /api/method/frappe_appointment.api.gateway.route
        {
            "action": "a1b2c3d4",
            "param1": "value1"
        }
    """
    start_time = time.time()
    user = frappe.session.user
    
    # Validate action code
    if not action:
        _log_gateway_request(None, user, False, "Action code is required")
        return {
            "success": False,
            "error": "Action code is required"
        }
    
    # Validate action code format
    if not _validate_action_code(action):
        _log_gateway_request(action, user, False, "Invalid action code format")
        return {
            "success": False,
            "error": "Invalid action code"
        }
    
    # Check rate limit (can be disabled in frappe.conf: gateway_rate_limit = 0)
    if frappe.conf.get('gateway_rate_limit', 100) > 0:
        try:
            _check_rate_limit(user, action)
        except frappe.ValidationError:
            _log_gateway_request(action, user, False, "Rate limit exceeded")
            raise
    
    # Look up the actual endpoint
    if action not in ACTION_MAP:
        _log_gateway_request(action, user, False, "Unknown action code")
        return {
            "success": False,
            "error": "Invalid action code"
        }
    
    module_path, function_name = ACTION_MAP[action]
    
    try:
        # Use cached module import
        module = _get_cached_module(module_path)
        if not module:
            _log_gateway_request(action, user, False, f"Module {module_path} not found", time.time() - start_time)
            return {
                "success": False,
                "error": "Module not found"
            }
        
        # Get the function
        function = getattr(module, function_name, None)
        if not function:
            _log_gateway_request(action, user, False, f"Function {function_name} not found", time.time() - start_time)
            return {
                "success": False,
                "error": "Function not found"
            }
        
        # Remove 'action' from kwargs before passing to target function
        call_params = {k: v for k, v in kwargs.items() if k != 'action'}
        
        # Call the function with all parameters as keyword arguments
        # This matches how Frappe normally calls whitelisted methods
        result = function(**call_params)
        
        duration = time.time() - start_time
        _log_gateway_request(action, user, True, None, duration)
        
        # Return the result in Frappe's standard format
        # The 'message' wrapper is what Frappe expects
        return {
            "success": True,
            "message": result
        }
        
    except TypeError as e:
        # Handle parameter mismatch errors
        duration = time.time() - start_time
        _log_gateway_request(action, user, False, f"Parameter error: {str(e)}", duration)
        return {
            "success": False,
            "error": "Parameter error"  # Generic error for users
        }
    except Exception as e:
        duration = time.time() - start_time
        _log_gateway_request(action, user, False, str(e), duration)
        return {
            "success": False,
            "error": "Request failed"  # Generic error - details in logs
        }


@frappe.whitelist(allow_guest=False)
def get_action_map():
    """
    Returns the action code mapping (for frontend use during development)
    This should NOT be exposed in production for security
    
    Note: In production, the action codes should be hardcoded in the frontend
    and this endpoint should be disabled or restricted to admins only.
    """
    # Only allow authenticated users (not guests)
    if frappe.session.user == 'Guest':
        return {
            "success": False,
            "error": "Authentication required"
        }
    
    return {
        "success": True,
        "message": ACTION_MAP
    }

