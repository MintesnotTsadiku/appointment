# Copyright (c) 2025, minte and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class LandingPageSettings(Document):
    pass


# Color Preset Definitions
COLOR_PRESETS = {
    "violet_amber": {
        "name": "Violet & Amber (Current)",
        "description": "Premium violet primary with amber accents - current design",
        "colors": {
            # Dark Mode
            "dark_bg_primary": "#0a0a0f",
            "dark_bg_secondary": "#0f0f17",
            "dark_bg_tertiary": "#12121a",
            "dark_bg_elevated": "#1a1a24",
            "dark_text_primary": "#ffffff",
            "dark_text_secondary": "#d1d5db",
            "dark_text_muted": "#9ca3af",
            "dark_text_subtle": "#6b7280",
            "dark_border_subtle": "rgba(255,255,255,0.05)",
            "dark_border_default": "rgba(255,255,255,0.1)",
            "dark_border_strong": "rgba(255,255,255,0.2)",
            "dark_glow_primary": "rgba(139,92,246,0.2)",
            "dark_glow_secondary": "rgba(59,130,246,0.2)",
            "dark_glow_success": "rgba(16,185,129,0.1)",
            # Primary Accent (Violet)
            "accent_primary": "#8b5cf6",
            "accent_primary_hover": "#7c3aed",
            "accent_primary_light": "rgba(139,92,246,0.2)",
            # Secondary Accent (Orange/Amber)
            "accent_secondary": "#f97316",
            "accent_secondary_hover": "#ea580c",
            "accent_secondary_light": "rgba(249,115,22,0.2)",
            # Success (Emerald)
            "accent_success": "#10b981",
            "accent_success_hover": "#059669",
            "accent_success_light": "rgba(16,185,129,0.2)",
            # Warning (Amber)
            "accent_warning": "#f59e0b",
            "accent_warning_hover": "#d97706",
            "accent_warning_light": "rgba(245,158,11,0.2)",
            # Gradients
            "gradient_primary_from": "#8b5cf6",
            "gradient_primary_to": "#7c3aed",
            "gradient_secondary_from": "#f97316",
            "gradient_secondary_to": "#f59e0b",
            "gradient_success_from": "#10b981",
            "gradient_success_to": "#14b8a6",
        }
    },
    "indigo_emerald": {
        "name": "Indigo & Emerald",
        "description": "Professional indigo with emerald success colors",
        "colors": {
            "dark_bg_primary": "#0a0a12",
            "dark_bg_secondary": "#0f0f1a",
            "dark_bg_tertiary": "#14142b",
            "dark_bg_elevated": "#1a1a3a",
            "dark_text_primary": "#ffffff",
            "dark_text_secondary": "#c7d2fe",
            "dark_text_muted": "#a5b4fc",
            "dark_text_subtle": "#818cf8",
            "dark_border_subtle": "rgba(99,102,241,0.1)",
            "dark_border_default": "rgba(99,102,241,0.2)",
            "dark_border_strong": "rgba(99,102,241,0.3)",
            "dark_glow_primary": "rgba(99,102,241,0.2)",
            "dark_glow_secondary": "rgba(16,185,129,0.2)",
            "dark_glow_success": "rgba(16,185,129,0.15)",
            "accent_primary": "#6366f1",
            "accent_primary_hover": "#4f46e5",
            "accent_primary_light": "rgba(99,102,241,0.2)",
            "accent_secondary": "#10b981",
            "accent_secondary_hover": "#059669",
            "accent_secondary_light": "rgba(16,185,129,0.2)",
            "accent_success": "#10b981",
            "accent_success_hover": "#059669",
            "accent_success_light": "rgba(16,185,129,0.2)",
            "accent_warning": "#f59e0b",
            "accent_warning_hover": "#d97706",
            "accent_warning_light": "rgba(245,158,11,0.2)",
            "gradient_primary_from": "#6366f1",
            "gradient_primary_to": "#4f46e5",
            "gradient_secondary_from": "#10b981",
            "gradient_secondary_to": "#059669",
            "gradient_success_from": "#10b981",
            "gradient_success_to": "#14b8a6",
        }
    },
    "rose_cyan": {
        "name": "Rose & Cyan",
        "description": "Modern rose pink with cyan accents",
        "colors": {
            "dark_bg_primary": "#0f0a0a",
            "dark_bg_secondary": "#170f0f",
            "dark_bg_tertiary": "#1a1212",
            "dark_bg_elevated": "#241a1a",
            "dark_text_primary": "#ffffff",
            "dark_text_secondary": "#fecdd3",
            "dark_text_muted": "#fda4af",
            "dark_text_subtle": "#fb7185",
            "dark_border_subtle": "rgba(244,63,94,0.1)",
            "dark_border_default": "rgba(244,63,94,0.2)",
            "dark_border_strong": "rgba(244,63,94,0.3)",
            "dark_glow_primary": "rgba(244,63,94,0.2)",
            "dark_glow_secondary": "rgba(6,182,212,0.2)",
            "dark_glow_success": "rgba(16,185,129,0.15)",
            "accent_primary": "#f43f5e",
            "accent_primary_hover": "#e11d48",
            "accent_primary_light": "rgba(244,63,94,0.2)",
            "accent_secondary": "#06b6d4",
            "accent_secondary_hover": "#0891b2",
            "accent_secondary_light": "rgba(6,182,212,0.2)",
            "accent_success": "#10b981",
            "accent_success_hover": "#059669",
            "accent_success_light": "rgba(16,185,129,0.2)",
            "accent_warning": "#f59e0b",
            "accent_warning_hover": "#d97706",
            "accent_warning_light": "rgba(245,158,11,0.2)",
            "gradient_primary_from": "#f43f5e",
            "gradient_primary_to": "#e11d48",
            "gradient_secondary_from": "#06b6d4",
            "gradient_secondary_to": "#0891b2",
            "gradient_success_from": "#10b981",
            "gradient_success_to": "#14b8a6",
        }
    },
    "blue_orange": {
        "name": "Ocean Blue & Sunset",
        "description": "Deep ocean blue with warm sunset orange",
        "colors": {
            "dark_bg_primary": "#0a0c14",
            "dark_bg_secondary": "#0f121c",
            "dark_bg_tertiary": "#121624",
            "dark_bg_elevated": "#1a1e2e",
            "dark_text_primary": "#ffffff",
            "dark_text_secondary": "#bfdbfe",
            "dark_text_muted": "#93c5fd",
            "dark_text_subtle": "#60a5fa",
            "dark_border_subtle": "rgba(59,130,246,0.1)",
            "dark_border_default": "rgba(59,130,246,0.2)",
            "dark_border_strong": "rgba(59,130,246,0.3)",
            "dark_glow_primary": "rgba(59,130,246,0.2)",
            "dark_glow_secondary": "rgba(249,115,22,0.2)",
            "dark_glow_success": "rgba(16,185,129,0.15)",
            "accent_primary": "#3b82f6",
            "accent_primary_hover": "#2563eb",
            "accent_primary_light": "rgba(59,130,246,0.2)",
            "accent_secondary": "#f97316",
            "accent_secondary_hover": "#ea580c",
            "accent_secondary_light": "rgba(249,115,22,0.2)",
            "accent_success": "#10b981",
            "accent_success_hover": "#059669",
            "accent_success_light": "rgba(16,185,129,0.2)",
            "accent_warning": "#f59e0b",
            "accent_warning_hover": "#d97706",
            "accent_warning_light": "rgba(245,158,11,0.2)",
            "gradient_primary_from": "#3b82f6",
            "gradient_primary_to": "#2563eb",
            "gradient_secondary_from": "#f97316",
            "gradient_secondary_to": "#fb923c",
            "gradient_success_from": "#10b981",
            "gradient_success_to": "#14b8a6",
        }
    },
    "emerald_gold": {
        "name": "Emerald & Gold",
        "description": "Luxurious emerald green with gold accents",
        "colors": {
            "dark_bg_primary": "#0a0f0c",
            "dark_bg_secondary": "#0f1710",
            "dark_bg_tertiary": "#121a14",
            "dark_bg_elevated": "#1a241c",
            "dark_text_primary": "#ffffff",
            "dark_text_secondary": "#a7f3d0",
            "dark_text_muted": "#6ee7b7",
            "dark_text_subtle": "#34d399",
            "dark_border_subtle": "rgba(16,185,129,0.1)",
            "dark_border_default": "rgba(16,185,129,0.2)",
            "dark_border_strong": "rgba(16,185,129,0.3)",
            "dark_glow_primary": "rgba(16,185,129,0.2)",
            "dark_glow_secondary": "rgba(245,158,11,0.2)",
            "dark_glow_success": "rgba(16,185,129,0.15)",
            "accent_primary": "#10b981",
            "accent_primary_hover": "#059669",
            "accent_primary_light": "rgba(16,185,129,0.2)",
            "accent_secondary": "#f59e0b",
            "accent_secondary_hover": "#d97706",
            "accent_secondary_light": "rgba(245,158,11,0.2)",
            "accent_success": "#10b981",
            "accent_success_hover": "#059669",
            "accent_success_light": "rgba(16,185,129,0.2)",
            "accent_warning": "#f59e0b",
            "accent_warning_hover": "#d97706",
            "accent_warning_light": "rgba(245,158,11,0.2)",
            "gradient_primary_from": "#10b981",
            "gradient_primary_to": "#059669",
            "gradient_secondary_from": "#f59e0b",
            "gradient_secondary_to": "#fbbf24",
            "gradient_success_from": "#10b981",
            "gradient_success_to": "#14b8a6",
        }
    }
}


@frappe.whitelist()
def get_color_presets():
    """
    Get all available color presets for the theme selector.
    
    Returns:
        dict: Dictionary of preset_id -> preset details
    """
    presets = []
    for preset_id, preset_data in COLOR_PRESETS.items():
        presets.append({
            "id": preset_id,
            "name": preset_data["name"],
            "description": preset_data["description"],
            "preview_colors": {
                "primary": preset_data["colors"].get("accent_primary"),
                "secondary": preset_data["colors"].get("accent_secondary"),
                "background": preset_data["colors"].get("dark_bg_primary"),
            }
        })
    return presets


@frappe.whitelist()
def apply_color_preset(preset_id):
    """
    Apply a color preset to Landing Page Settings.
    
    Args:
        preset_id: The ID of the preset to apply (e.g., "violet_amber", "indigo_emerald")
    
    Returns:
        dict: Success message and updated fields
    """
    if preset_id not in COLOR_PRESETS:
        frappe.throw(f"Unknown color preset: {preset_id}")
    
    preset = COLOR_PRESETS[preset_id]
    settings = frappe.get_single("Landing Page Settings")
    
    updated_fields = []
    for field_name, value in preset["colors"].items():
        if hasattr(settings, field_name):
            setattr(settings, field_name, value)
            updated_fields.append(field_name)
    
    settings.save(ignore_permissions=True)
    frappe.db.commit()
    
    return {
        "success": True,
        "message": f"Applied color preset: {preset['name']}",
        "preset_name": preset["name"],
        "updated_fields": len(updated_fields)
    }


@frappe.whitelist()
def populate_all_defaults():
    """
    Populate all Landing Page Settings fields with default values.
    This includes hero content, brand colors, theme colors, footer, etc.
    
    Returns:
        dict: Success message and count of updated fields
    """
    from frappe_appointment.scheduler.setup_theme_colors import setup_default_colors
    
    # First, setup theme colors
    theme_result = setup_default_colors(force_update=False)
    
    # Now set other defaults
    settings = frappe.get_single("Landing Page Settings")
    updated_count = theme_result.get("total_updated", 0)
    
    # Default hero content
    defaults = {
        # Hero Section
        "hero_eyebrow_en": "🚀 Trusted by 10,000+ businesses",
        "hero_eyebrow_am": "🚀 በ10,000+ ድርጅቶች የታመነ",
        "hero_headline_1_en": "Effortless",
        "hero_headline_1_am": "ቀላል",
        "hero_headline_2_en": "Appointment Scheduling",
        "hero_headline_2_am": "ቀጠሮ መያዝ",
        "hero_subheadline_en": "The modern scheduling platform that helps businesses grow. Book appointments, manage clients, and streamline your workflow.",
        "hero_subheadline_am": "ንግዶች እንዲያድጉ የሚረዳ ዘመናዊ የቀጠሮ መድረክ። ቀጠሮ ይያዙ፣ ደንበኞችን ያስተዳድሩ፣ የስራ ፍሰትዎን ያቀላጥፉ።",
        "hero_cta_primary_en": "Get Started Free",
        "hero_cta_primary_am": "በነፃ ይጀምሩ",
        "hero_cta_secondary_en": "Watch Demo",
        "hero_cta_secondary_am": "ማሳያ ይመልከቱ",
        "hero_trust_count": "10,000+",
        "hero_trust_label_en": "Happy Customers",
        "hero_trust_label_am": "ደስተኛ ደንበኞች",
        "hero_rating": "4.9/5",
        "hero_reviews_count": "1,247",
        
        # Partners Stats
        "stat_active_users": "10,000+",
        "stat_active_users_label_en": "Active Users",
        "stat_active_users_label_am": "ንቁ ተጠቃሚዎች",
        "stat_appointments": "500,000+",
        "stat_appointments_label_en": "Appointments Booked",
        "stat_appointments_label_am": "የተያዙ ቀጠሮዎች",
        "stat_uptime": "99.9%",
        "stat_uptime_label_en": "Uptime",
        "stat_uptime_label_am": "ስራ ላይ ያለበት ጊዜ",
        "stat_rating": "4.9/5",
        "stat_rating_label_en": "User Rating",
        "stat_rating_label_am": "የተጠቃሚ ደረጃ",
        
        # Value Proposition
        "value_prop_title_en": "Why Choose Us?",
        "value_prop_title_am": "ለምን እኛን ይመርጣሉ?",
        "value_prop_subtitle_en": "Everything you need to manage appointments efficiently",
        "value_prop_subtitle_am": "ቀጠሮዎችን በብቃት ለማስተዳደር የሚያስፈልጎት ሁሉ",
        
        # Features
        "features_title_en": "Powerful Features",
        "features_title_am": "ኃይለኛ ባህሪያት",
        "features_subtitle_en": "Built for modern businesses",
        "features_subtitle_am": "ለዘመናዊ ንግዶች የተገነባ",
        
        # How It Works
        "how_it_works_title_en": "How It Works",
        "how_it_works_title_am": "እንዴት ይሰራል",
        "how_it_works_subtitle_en": "Get started in minutes",
        "how_it_works_subtitle_am": "በደቂቃዎች ውስጥ ይጀምሩ",
        
        # Pricing
        "pricing_title_en": "Simple Pricing",
        "pricing_title_am": "ቀላል ዋጋ",
        "pricing_subtitle_en": "No hidden fees. Cancel anytime.",
        "pricing_subtitle_am": "የተደበቁ ክፍያዎች የሉም። በማንኛውም ጊዜ ይሰርዙ።",
        
        # FAQ
        "faq_title_en": "Frequently Asked Questions",
        "faq_title_am": "በተደጋጋሚ የሚጠየቁ ጥያቄዎች",
        "faq_subtitle_en": "Got questions? We've got answers.",
        "faq_subtitle_am": "ጥያቄዎች አሉዎት? መልሶች አሉን።",
        
        # Final CTA
        "final_cta_title_en": "Ready to Get Started?",
        "final_cta_title_am": "ለመጀመር ዝግጁ ነዎት?",
        "final_cta_subtitle_en": "Join thousands of businesses already using our platform.",
        "final_cta_subtitle_am": "መድረካችንን ቀድሞውኑ የሚጠቀሙ በሺዎች የሚቆጠሩ ንግዶችን ይቀላቀሉ።",
        "final_cta_button_text_en": "Start Free Trial",
        "final_cta_button_text_am": "ነፃ ሙከራ ይጀምሩ",
        "trust_indicator_1_en": "✓ No credit card required",
        "trust_indicator_1_am": "✓ ክሬዲት ካርድ አያስፈልግም",
        "trust_indicator_2_en": "✓ 14-day free trial",
        "trust_indicator_2_am": "✓ የ14 ቀን ነፃ ሙከራ",
        "trust_indicator_3_en": "✓ Cancel anytime",
        "trust_indicator_3_am": "✓ በማንኛውም ጊዜ ይሰርዙ",
        
        # Footer
        "footer_tagline_en": "Making appointment scheduling simple for everyone.",
        "footer_tagline_am": "ለሁሉም ቀጠሮ መያዝ ቀላል ማድረግ።",
        "company_email": "support@appointment.com",
        "company_phone": "+251 911 234 567",
        "company_location_en": "Addis Ababa, Ethiopia",
        "company_location_am": "አዲስ አበባ፣ ኢትዮጵያ",
        "support_hours_en": "Mon-Fri: 9AM-6PM EAT",
        "support_hours_am": "ሰኞ-ዓርብ: 9AM-6PM EAT",
        
        # SEO
        "meta_title_en": "Frappe Appointment - Modern Scheduling Platform",
        "meta_title_am": "Frappe Appointment - ዘመናዊ የቀጠሮ መድረክ",
        "meta_description_en": "The modern appointment scheduling platform for businesses. Book appointments, manage clients, and grow your business.",
        "meta_description_am": "ለንግዶች ዘመናዊ የቀጠሮ መያዣ መድረክ። ቀጠሮ ይያዙ፣ ደንበኞችን ያስተዳድሩ፣ ንግድዎን ያሳድጉ።",
        "keywords": "appointment, scheduling, booking, business, frappe, ethiopia, addis ababa",
    }
    
    for field_name, value in defaults.items():
        current_value = getattr(settings, field_name, None)
        if not current_value:
            setattr(settings, field_name, value)
            updated_count += 1
    
    settings.save(ignore_permissions=True)
    frappe.db.commit()
    
    return {
        "success": True,
        "message": "All default values have been populated",
        "updated_fields": updated_count
    }


@frappe.whitelist()
def preview_color_preset(preset_id):
    """
    Get preview data for a color preset without applying it.
    
    Args:
        preset_id: The ID of the preset to preview
    
    Returns:
        dict: Full preset colors data for preview
    """
    if preset_id not in COLOR_PRESETS:
        frappe.throw(f"Unknown color preset: {preset_id}")
    
    preset = COLOR_PRESETS[preset_id]
    return {
        "id": preset_id,
        "name": preset["name"],
        "description": preset["description"],
        "colors": preset["colors"]
    }
