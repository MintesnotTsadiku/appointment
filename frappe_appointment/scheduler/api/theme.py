"""
Theme API - Provides endpoints for fetching theme colors from Landing Page Settings
"""

import frappe
from frappe import _


@frappe.whitelist(allow_guest=True)
def get_theme_colors():
    """
    Fetch all theme colors from Landing Page Settings.
    Returns a structured object with colors organized by category.
    
    Returns:
        dict: Theme colors organized by category (dark mode, light mode, accents, status, gradients)
    """
    try:
        settings = frappe.get_single("Landing Page Settings")
    except frappe.DoesNotExistError:
        # Return default colors if settings don't exist
        return get_default_theme_colors()
    
    return {
        "dark": {
            "background": {
                "primary": settings.dark_bg_primary or "#0a0a0f",
                "secondary": settings.dark_bg_secondary or "#0f0f17",
                "tertiary": settings.dark_bg_tertiary or "#12121a",
                "elevated": settings.dark_bg_elevated or "#1a1a24",
            },
            "text": {
                "primary": settings.dark_text_primary or "#ffffff",
                "secondary": settings.dark_text_secondary or "#d1d5db",
                "muted": settings.dark_text_muted or "#9ca3af",
                "subtle": settings.dark_text_subtle or "#6b7280",
            },
            "border": {
                "subtle": settings.dark_border_subtle or "rgba(255,255,255,0.05)",
                "default": settings.dark_border_default or "rgba(255,255,255,0.1)",
                "strong": settings.dark_border_strong or "rgba(255,255,255,0.2)",
            },
            "glow": {
                "primary": settings.dark_glow_primary or "rgba(139,92,246,0.2)",
                "secondary": settings.dark_glow_secondary or "rgba(59,130,246,0.2)",
                "success": settings.dark_glow_success or "rgba(16,185,129,0.1)",
            },
        },
        "light": {
            "background": {
                "primary": settings.light_bg_primary or "#ffffff",
                "secondary": settings.light_bg_secondary or "#f9fafb",
                "tertiary": settings.light_bg_tertiary or "#f3f4f6",
                "elevated": settings.light_bg_elevated or "#ffffff",
            },
            "text": {
                "primary": settings.light_text_primary or "#111827",
                "secondary": settings.light_text_secondary or "#374151",
                "muted": settings.light_text_muted or "#6b7280",
                "subtle": settings.light_text_subtle or "#9ca3af",
            },
            "border": {
                "subtle": settings.light_border_subtle or "#f3f4f6",
                "default": settings.light_border_default or "#e5e7eb",
                "strong": settings.light_border_strong or "#d1d5db",
            },
            "shadow": {
                "sm": settings.light_shadow_sm or "0 1px 2px rgba(0,0,0,0.05)",
                "md": settings.light_shadow_md or "0 4px 6px rgba(0,0,0,0.1)",
                "lg": settings.light_shadow_lg or "0 10px 15px rgba(0,0,0,0.1)",
            },
        },
        "accent": {
            "primary": {
                "default": settings.accent_primary or "#8b5cf6",
                "hover": settings.accent_primary_hover or "#7c3aed",
                "light": settings.accent_primary_light or "rgba(139,92,246,0.2)",
            },
            "secondary": {
                "default": settings.accent_secondary or "#f97316",
                "hover": settings.accent_secondary_hover or "#ea580c",
                "light": settings.accent_secondary_light or "rgba(249,115,22,0.2)",
            },
            "success": {
                "default": settings.accent_success or "#10b981",
                "hover": settings.accent_success_hover or "#059669",
                "light": settings.accent_success_light or "rgba(16,185,129,0.2)",
            },
            "warning": {
                "default": settings.accent_warning or "#f59e0b",
                "hover": settings.accent_warning_hover or "#d97706",
                "light": settings.accent_warning_light or "rgba(245,158,11,0.2)",
            },
        },
        "status": {
            "pending": {
                "color": settings.status_pending or "#3b82f6",
                "background": settings.status_pending_bg or "rgba(59,130,246,0.2)",
            },
            "confirmed": {
                "color": settings.status_confirmed or "#10b981",
                "background": settings.status_confirmed_bg or "rgba(16,185,129,0.2)",
            },
            "completed": {
                "color": settings.status_completed or "#6b7280",
                "background": settings.status_completed_bg or "rgba(107,114,128,0.2)",
            },
            "cancelled": {
                "color": settings.status_cancelled or "#ef4444",
                "background": settings.status_cancelled_bg or "rgba(239,68,68,0.2)",
            },
            "no_show": {
                "color": settings.status_no_show or "#f59e0b",
                "background": settings.status_no_show_bg or "rgba(245,158,11,0.2)",
            },
            "in_progress": {
                "color": settings.status_in_progress or "#8b5cf6",
                "background": settings.status_in_progress_bg or "rgba(139,92,246,0.2)",
            },
        },
        "gradient": {
            "primary": {
                "from": settings.gradient_primary_from or "#8b5cf6",
                "to": settings.gradient_primary_to or "#7c3aed",
            },
            "secondary": {
                "from": settings.gradient_secondary_from or "#f97316",
                "to": settings.gradient_secondary_to or "#f59e0b",
            },
            "success": {
                "from": settings.gradient_success_from or "#10b981",
                "to": settings.gradient_success_to or "#14b8a6",
            },
        },
        "brand": {
            "primary": settings.brand_primary_color or "#030303",
            "secondary": settings.brand_secondary_color or "#10B981",
            "gold": settings.brand_accent_gold or "#F59E0B",
            "teal": settings.brand_accent_teal or "#14B8A6",
        },
    }


def get_default_theme_colors():
    """
    Returns default theme colors when Landing Page Settings doesn't exist.
    """
    return {
        "dark": {
            "background": {
                "primary": "#0a0a0f",
                "secondary": "#0f0f17",
                "tertiary": "#12121a",
                "elevated": "#1a1a24",
            },
            "text": {
                "primary": "#ffffff",
                "secondary": "#d1d5db",
                "muted": "#9ca3af",
                "subtle": "#6b7280",
            },
            "border": {
                "subtle": "rgba(255,255,255,0.05)",
                "default": "rgba(255,255,255,0.1)",
                "strong": "rgba(255,255,255,0.2)",
            },
            "glow": {
                "primary": "rgba(139,92,246,0.2)",
                "secondary": "rgba(59,130,246,0.2)",
                "success": "rgba(16,185,129,0.1)",
            },
        },
        "light": {
            "background": {
                "primary": "#ffffff",
                "secondary": "#f9fafb",
                "tertiary": "#f3f4f6",
                "elevated": "#ffffff",
            },
            "text": {
                "primary": "#111827",
                "secondary": "#374151",
                "muted": "#6b7280",
                "subtle": "#9ca3af",
            },
            "border": {
                "subtle": "#f3f4f6",
                "default": "#e5e7eb",
                "strong": "#d1d5db",
            },
            "shadow": {
                "sm": "0 1px 2px rgba(0,0,0,0.05)",
                "md": "0 4px 6px rgba(0,0,0,0.1)",
                "lg": "0 10px 15px rgba(0,0,0,0.1)",
            },
        },
        "accent": {
            "primary": {
                "default": "#8b5cf6",
                "hover": "#7c3aed",
                "light": "rgba(139,92,246,0.2)",
            },
            "secondary": {
                "default": "#f97316",
                "hover": "#ea580c",
                "light": "rgba(249,115,22,0.2)",
            },
            "success": {
                "default": "#10b981",
                "hover": "#059669",
                "light": "rgba(16,185,129,0.2)",
            },
            "warning": {
                "default": "#f59e0b",
                "hover": "#d97706",
                "light": "rgba(245,158,11,0.2)",
            },
        },
        "status": {
            "pending": {
                "color": "#3b82f6",
                "background": "rgba(59,130,246,0.2)",
            },
            "confirmed": {
                "color": "#10b981",
                "background": "rgba(16,185,129,0.2)",
            },
            "completed": {
                "color": "#6b7280",
                "background": "rgba(107,114,128,0.2)",
            },
            "cancelled": {
                "color": "#ef4444",
                "background": "rgba(239,68,68,0.2)",
            },
            "no_show": {
                "color": "#f59e0b",
                "background": "rgba(245,158,11,0.2)",
            },
            "in_progress": {
                "color": "#8b5cf6",
                "background": "rgba(139,92,246,0.2)",
            },
        },
        "gradient": {
            "primary": {
                "from": "#8b5cf6",
                "to": "#7c3aed",
            },
            "secondary": {
                "from": "#f97316",
                "to": "#f59e0b",
            },
            "success": {
                "from": "#10b981",
                "to": "#14b8a6",
            },
        },
        "brand": {
            "primary": "#030303",
            "secondary": "#10B981",
            "gold": "#F59E0B",
            "teal": "#14B8A6",
        },
    }


@frappe.whitelist(allow_guest=True)
def get_css_variables():
    """
    Returns theme colors as CSS custom properties string.
    Useful for injecting directly into a style tag.
    
    Returns:
        dict: CSS variables for both light and dark modes
    """
    colors = get_theme_colors()
    
    # Generate CSS variables for dark mode
    dark_css = f"""
    --bg-primary: {colors['dark']['background']['primary']};
    --bg-secondary: {colors['dark']['background']['secondary']};
    --bg-tertiary: {colors['dark']['background']['tertiary']};
    --bg-elevated: {colors['dark']['background']['elevated']};
    
    --text-primary: {colors['dark']['text']['primary']};
    --text-secondary: {colors['dark']['text']['secondary']};
    --text-muted: {colors['dark']['text']['muted']};
    --text-subtle: {colors['dark']['text']['subtle']};
    
    --border-subtle: {colors['dark']['border']['subtle']};
    --border-default: {colors['dark']['border']['default']};
    --border-strong: {colors['dark']['border']['strong']};
    
    --glow-primary: {colors['dark']['glow']['primary']};
    --glow-secondary: {colors['dark']['glow']['secondary']};
    --glow-success: {colors['dark']['glow']['success']};
    
    --accent-primary: {colors['accent']['primary']['default']};
    --accent-primary-hover: {colors['accent']['primary']['hover']};
    --accent-primary-light: {colors['accent']['primary']['light']};
    
    --accent-secondary: {colors['accent']['secondary']['default']};
    --accent-secondary-hover: {colors['accent']['secondary']['hover']};
    --accent-secondary-light: {colors['accent']['secondary']['light']};
    
    --accent-success: {colors['accent']['success']['default']};
    --accent-success-hover: {colors['accent']['success']['hover']};
    --accent-success-light: {colors['accent']['success']['light']};
    
    --accent-warning: {colors['accent']['warning']['default']};
    --accent-warning-hover: {colors['accent']['warning']['hover']};
    --accent-warning-light: {colors['accent']['warning']['light']};
    
    --status-pending: {colors['status']['pending']['color']};
    --status-pending-bg: {colors['status']['pending']['background']};
    --status-confirmed: {colors['status']['confirmed']['color']};
    --status-confirmed-bg: {colors['status']['confirmed']['background']};
    --status-completed: {colors['status']['completed']['color']};
    --status-completed-bg: {colors['status']['completed']['background']};
    --status-cancelled: {colors['status']['cancelled']['color']};
    --status-cancelled-bg: {colors['status']['cancelled']['background']};
    --status-no-show: {colors['status']['no_show']['color']};
    --status-no-show-bg: {colors['status']['no_show']['background']};
    --status-in-progress: {colors['status']['in_progress']['color']};
    --status-in-progress-bg: {colors['status']['in_progress']['background']};
    
    --gradient-primary-from: {colors['gradient']['primary']['from']};
    --gradient-primary-to: {colors['gradient']['primary']['to']};
    --gradient-secondary-from: {colors['gradient']['secondary']['from']};
    --gradient-secondary-to: {colors['gradient']['secondary']['to']};
    --gradient-success-from: {colors['gradient']['success']['from']};
    --gradient-success-to: {colors['gradient']['success']['to']};
    
    --brand-primary: {colors['brand']['primary']};
    --brand-secondary: {colors['brand']['secondary']};
    --brand-gold: {colors['brand']['gold']};
    --brand-teal: {colors['brand']['teal']};
    """
    
    # Generate CSS variables for light mode
    light_css = f"""
    --bg-primary: {colors['light']['background']['primary']};
    --bg-secondary: {colors['light']['background']['secondary']};
    --bg-tertiary: {colors['light']['background']['tertiary']};
    --bg-elevated: {colors['light']['background']['elevated']};
    
    --text-primary: {colors['light']['text']['primary']};
    --text-secondary: {colors['light']['text']['secondary']};
    --text-muted: {colors['light']['text']['muted']};
    --text-subtle: {colors['light']['text']['subtle']};
    
    --border-subtle: {colors['light']['border']['subtle']};
    --border-default: {colors['light']['border']['default']};
    --border-strong: {colors['light']['border']['strong']};
    
    --shadow-sm: {colors['light']['shadow']['sm']};
    --shadow-md: {colors['light']['shadow']['md']};
    --shadow-lg: {colors['light']['shadow']['lg']};
    
    --accent-primary: {colors['accent']['primary']['default']};
    --accent-primary-hover: {colors['accent']['primary']['hover']};
    --accent-primary-light: {colors['accent']['primary']['light']};
    
    --accent-secondary: {colors['accent']['secondary']['default']};
    --accent-secondary-hover: {colors['accent']['secondary']['hover']};
    --accent-secondary-light: {colors['accent']['secondary']['light']};
    
    --accent-success: {colors['accent']['success']['default']};
    --accent-success-hover: {colors['accent']['success']['hover']};
    --accent-success-light: {colors['accent']['success']['light']};
    
    --accent-warning: {colors['accent']['warning']['default']};
    --accent-warning-hover: {colors['accent']['warning']['hover']};
    --accent-warning-light: {colors['accent']['warning']['light']};
    
    --status-pending: {colors['status']['pending']['color']};
    --status-pending-bg: {colors['status']['pending']['background']};
    --status-confirmed: {colors['status']['confirmed']['color']};
    --status-confirmed-bg: {colors['status']['confirmed']['background']};
    --status-completed: {colors['status']['completed']['color']};
    --status-completed-bg: {colors['status']['completed']['background']};
    --status-cancelled: {colors['status']['cancelled']['color']};
    --status-cancelled-bg: {colors['status']['cancelled']['background']};
    --status-no-show: {colors['status']['no_show']['color']};
    --status-no-show-bg: {colors['status']['no_show']['background']};
    --status-in-progress: {colors['status']['in_progress']['color']};
    --status-in-progress-bg: {colors['status']['in_progress']['background']};
    
    --gradient-primary-from: {colors['gradient']['primary']['from']};
    --gradient-primary-to: {colors['gradient']['primary']['to']};
    --gradient-secondary-from: {colors['gradient']['secondary']['from']};
    --gradient-secondary-to: {colors['gradient']['secondary']['to']};
    --gradient-success-from: {colors['gradient']['success']['from']};
    --gradient-success-to: {colors['gradient']['success']['to']};
    
    --brand-primary: {colors['brand']['primary']};
    --brand-secondary: {colors['brand']['secondary']};
    --brand-gold: {colors['brand']['gold']};
    --brand-teal: {colors['brand']['teal']};
    """
    
    return {
        "dark": dark_css.strip(),
        "light": light_css.strip(),
        "colors": colors,
    }



