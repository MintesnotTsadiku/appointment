"""
Setup Theme Colors for Landing Page Settings

This module provides functions to populate default theme colors in the Landing Page Settings.
Run via bench console or bench execute:

    bench --site [sitename] execute frappe_appointment.scheduler.setup_theme_colors.setup_default_colors

Or from bench console:
    
    from frappe_appointment.scheduler.setup_theme_colors import setup_default_colors
    setup_default_colors()
"""

import frappe
from frappe import _


# Default theme colors for the Reception Console design
DEFAULT_THEME_COLORS = {
    # Dark Mode - Backgrounds
    "dark_bg_primary": "#0a0a0f",
    "dark_bg_secondary": "#0f0f17",
    "dark_bg_tertiary": "#12121a",
    "dark_bg_elevated": "#1a1a24",
    
    # Dark Mode - Text
    "dark_text_primary": "#ffffff",
    "dark_text_secondary": "#d1d5db",
    "dark_text_muted": "#9ca3af",
    "dark_text_subtle": "#6b7280",
    
    # Dark Mode - Borders
    "dark_border_subtle": "rgba(255,255,255,0.05)",
    "dark_border_default": "rgba(255,255,255,0.1)",
    "dark_border_strong": "rgba(255,255,255,0.2)",
    
    # Dark Mode - Glows
    "dark_glow_primary": "rgba(139,92,246,0.2)",
    "dark_glow_secondary": "rgba(59,130,246,0.2)",
    "dark_glow_success": "rgba(16,185,129,0.1)",
    
    # Light Mode - Backgrounds
    "light_bg_primary": "#ffffff",
    "light_bg_secondary": "#f9fafb",
    "light_bg_tertiary": "#f3f4f6",
    "light_bg_elevated": "#ffffff",
    
    # Light Mode - Text
    "light_text_primary": "#111827",
    "light_text_secondary": "#374151",
    "light_text_muted": "#6b7280",
    "light_text_subtle": "#9ca3af",
    
    # Light Mode - Borders
    "light_border_subtle": "#f3f4f6",
    "light_border_default": "#e5e7eb",
    "light_border_strong": "#d1d5db",
    
    # Light Mode - Shadows
    "light_shadow_sm": "0 1px 2px rgba(0,0,0,0.05)",
    "light_shadow_md": "0 4px 6px rgba(0,0,0,0.1)",
    "light_shadow_lg": "0 10px 15px rgba(0,0,0,0.1)",
    
    # Accent Colors - Primary (Violet/Purple)
    "accent_primary": "#8b5cf6",
    "accent_primary_hover": "#7c3aed",
    "accent_primary_light": "rgba(139,92,246,0.2)",
    
    # Accent Colors - Secondary (Orange/Amber for walk-ins)
    "accent_secondary": "#f97316",
    "accent_secondary_hover": "#ea580c",
    "accent_secondary_light": "rgba(249,115,22,0.2)",
    
    # Accent Colors - Success (Emerald/Teal)
    "accent_success": "#10b981",
    "accent_success_hover": "#059669",
    "accent_success_light": "rgba(16,185,129,0.2)",
    
    # Accent Colors - Warning (Amber)
    "accent_warning": "#f59e0b",
    "accent_warning_hover": "#d97706",
    "accent_warning_light": "rgba(245,158,11,0.2)",
    
    # Status Colors
    "status_pending": "#3b82f6",
    "status_pending_bg": "rgba(59,130,246,0.2)",
    "status_confirmed": "#10b981",
    "status_confirmed_bg": "rgba(16,185,129,0.2)",
    "status_completed": "#6b7280",
    "status_completed_bg": "rgba(107,114,128,0.2)",
    "status_cancelled": "#ef4444",
    "status_cancelled_bg": "rgba(239,68,68,0.2)",
    "status_no_show": "#f59e0b",
    "status_no_show_bg": "rgba(245,158,11,0.2)",
    "status_in_progress": "#8b5cf6",
    "status_in_progress_bg": "rgba(139,92,246,0.2)",
    
    # Gradient Colors
    "gradient_primary_from": "#8b5cf6",
    "gradient_primary_to": "#7c3aed",
    "gradient_secondary_from": "#f97316",
    "gradient_secondary_to": "#f59e0b",
    "gradient_success_from": "#10b981",
    "gradient_success_to": "#14b8a6",
    
    # Brand Colors (update existing)
    "brand_primary_color": "#030303",
    "brand_secondary_color": "#10B981",
    "brand_accent_gold": "#F59E0B",
    "brand_accent_teal": "#14B8A6",
}


def setup_default_colors(force_update=False):
    """
    Populate default theme colors in Landing Page Settings.
    
    Args:
        force_update: If True, will update all colors even if they already have values.
                     If False (default), only sets colors that are empty/None.
    
    Returns:
        dict: Summary of updated fields
    
    Usage:
        # From bench console:
        from frappe_appointment.scheduler.setup_theme_colors import setup_default_colors
        setup_default_colors()
        
        # Force update all colors:
        setup_default_colors(force_update=True)
    """
    try:
        settings = frappe.get_single("Landing Page Settings")
    except Exception:
        # Create new settings if doesn't exist
        settings = frappe.new_doc("Landing Page Settings")
    
    updated_fields = []
    skipped_fields = []
    
    for field_name, default_value in DEFAULT_THEME_COLORS.items():
        current_value = getattr(settings, field_name, None)
        
        if force_update or not current_value:
            setattr(settings, field_name, default_value)
            updated_fields.append(field_name)
        else:
            skipped_fields.append(field_name)
    
    settings.save(ignore_permissions=True)
    frappe.db.commit()
    
    print(f"✅ Theme colors setup complete!")
    print(f"   Updated: {len(updated_fields)} fields")
    print(f"   Skipped: {len(skipped_fields)} fields (already have values)")
    
    if updated_fields:
        print(f"\n📝 Updated fields:")
        for field in updated_fields[:10]:  # Show first 10
            print(f"   - {field}")
        if len(updated_fields) > 10:
            print(f"   ... and {len(updated_fields) - 10} more")
    
    return {
        "updated": updated_fields,
        "skipped": skipped_fields,
        "total_updated": len(updated_fields),
        "total_skipped": len(skipped_fields),
    }


def reset_to_default_colors():
    """
    Reset all theme colors to their default values.
    This will overwrite any customizations.
    
    Usage:
        bench --site [sitename] execute frappe_appointment.scheduler.setup_theme_colors.reset_to_default_colors
    """
    print("⚠️  Resetting all theme colors to defaults...")
    result = setup_default_colors(force_update=True)
    print("✅ All theme colors have been reset to defaults!")
    return result


def print_current_colors():
    """
    Print the current theme colors configured in Landing Page Settings.
    
    Usage:
        bench --site [sitename] execute frappe_appointment.scheduler.setup_theme_colors.print_current_colors
    """
    try:
        settings = frappe.get_single("Landing Page Settings")
    except Exception:
        print("❌ Landing Page Settings not found!")
        return
    
    print("\n🎨 Current Theme Colors:\n")
    print("=" * 60)
    
    sections = {
        "Dark Mode - Backgrounds": ["dark_bg_primary", "dark_bg_secondary", "dark_bg_tertiary", "dark_bg_elevated"],
        "Dark Mode - Text": ["dark_text_primary", "dark_text_secondary", "dark_text_muted", "dark_text_subtle"],
        "Dark Mode - Borders": ["dark_border_subtle", "dark_border_default", "dark_border_strong"],
        "Dark Mode - Glows": ["dark_glow_primary", "dark_glow_secondary", "dark_glow_success"],
        "Light Mode - Backgrounds": ["light_bg_primary", "light_bg_secondary", "light_bg_tertiary", "light_bg_elevated"],
        "Light Mode - Text": ["light_text_primary", "light_text_secondary", "light_text_muted", "light_text_subtle"],
        "Primary Accent": ["accent_primary", "accent_primary_hover", "accent_primary_light"],
        "Secondary Accent": ["accent_secondary", "accent_secondary_hover", "accent_secondary_light"],
        "Success Accent": ["accent_success", "accent_success_hover", "accent_success_light"],
        "Warning Accent": ["accent_warning", "accent_warning_hover", "accent_warning_light"],
        "Status - Pending": ["status_pending", "status_pending_bg"],
        "Status - Confirmed": ["status_confirmed", "status_confirmed_bg"],
        "Status - Cancelled": ["status_cancelled", "status_cancelled_bg"],
        "Status - No Show": ["status_no_show", "status_no_show_bg"],
        "Gradients": ["gradient_primary_from", "gradient_primary_to", "gradient_secondary_from", 
                      "gradient_secondary_to", "gradient_success_from", "gradient_success_to"],
        "Brand Colors": ["brand_primary_color", "brand_secondary_color", "brand_accent_gold", "brand_accent_teal"],
    }
    
    for section_name, fields in sections.items():
        print(f"\n{section_name}:")
        print("-" * 40)
        for field in fields:
            value = getattr(settings, field, "Not set")
            print(f"  {field}: {value}")
    
    print("\n" + "=" * 60)


# For quick CLI usage
if __name__ == "__main__":
    setup_default_colors()


