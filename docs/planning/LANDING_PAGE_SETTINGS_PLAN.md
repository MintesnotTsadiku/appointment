# Landing Page Settings - Singleton Doctype Plan

**Doctype Name**: `Landing Page Settings`  
**Type**: Single  
**Module**: Scheduler  
**Purpose**: Centralized management of all landing page dynamic content with caching support

---

## 🎯 Objectives

1. **Dynamic Content Management**: Update landing page content without code changes
2. **Performance**: Cache content for fast loading
3. **Easy Management**: User-friendly interface in Frappe Desk
4. **Multilingual**: Support English and Amharic content
5. **Media Management**: Upload and manage images/logos
6. **A/B Testing Ready**: Enable/disable sections for testing

---

## 📊 Doctype Structure

### Section 1: Hero Section
**Fields:**
```
- hero_enabled (Check) - Default: 1
- hero_eyebrow_en (Small Text)
- hero_eyebrow_am (Small Text)
- hero_headline_1_en (Data)
- hero_headline_1_am (Data)
- hero_headline_2_en (Data)
- hero_headline_2_am (Data)
- hero_subheadline_en (Text Editor)
- hero_subheadline_am (Text Editor)
- hero_cta_primary_en (Data)
- hero_cta_primary_am (Data)
- hero_cta_secondary_en (Data)
- hero_cta_secondary_am (Data)
- hero_trust_count (Data) - e.g., "10,000+"
- hero_trust_label_en (Data)
- hero_trust_label_am (Data)
- hero_rating (Data) - e.g., "4.9/5"
- hero_reviews_count (Data) - e.g., "1,247"
- hero_carousel_images (Table) - Child table with image attachments
```

### Section 2: Logo Cloud / Partners
**Fields:**
```
- partners_enabled (Check) - Default: 1
- partners_title_en (Data)
- partners_title_am (Data)
- partners_subtitle_en (Small Text)
- partners_subtitle_am (Small Text)
- partners_list (Table) - Child table:
  - partner_name (Data)
  - partner_logo (Attach Image)
  - partner_website (Data)
- stat_active_users (Data) - e.g., "10,000+"
- stat_appointments (Data) - e.g., "500,000+"
- stat_uptime (Data) - e.g., "99.9%"
- stat_rating (Data) - e.g., "4.9/5"
```

### Section 3: Value Proposition
**Fields:**
```
- value_prop_enabled (Check) - Default: 1
- value_prop_title_en (Data)
- value_prop_title_am (Data)
- value_prop_subtitle_en (Small Text)
- value_prop_subtitle_am (Small Text)
- value_propositions (Table) - Child table (3 items):
  - title_en (Data)
  - title_am (Data)
  - description_en (Text)
  - description_am (Text)
  - metric_en (Data) - e.g., "Save 20 hrs/week"
  - metric_am (Data)
  - image (Attach Image)
  - icon (Select) - Clock, DollarSign, TrendingUp
  - color_scheme (Select) - blue, emerald, purple
```

### Section 4: Features
**Fields:**
```
- features_enabled (Check) - Default: 1
- features_title_en (Data)
- features_title_am (Data)
- features_subtitle_en (Small Text)
- features_subtitle_am (Small Text)
- features_list (Table) - Child table (6 items):
  - title_en (Data)
  - title_am (Data)
  - description_en (Text Editor)
  - description_am (Text Editor)
  - point_1_en (Data)
  - point_1_am (Data)
  - point_2_en (Data)
  - point_2_am (Data)
  - point_3_en (Data)
  - point_3_am (Data)
  - image (Attach Image)
  - icon (Select) - Calendar, CreditCard, Smartphone, Users, etc.
  - display_order (Int)
```

### Section 5: Use Cases
**Fields:**
```
- use_cases_enabled (Check) - Default: 1
- use_cases_title_en (Data)
- use_cases_title_am (Data)
- use_cases_subtitle_en (Small Text)
- use_cases_subtitle_am (Small Text)
- use_cases_list (Table) - Child table:
  - title_en (Data)
  - title_am (Data)
  - subtitle_en (Data)
  - subtitle_am (Data)
  - description_en (Text Editor)
  - description_am (Text Editor)
  - example_en (Small Text)
  - example_am (Small Text)
  - image (Attach Image)
  - icon (Select) - Stethoscope, Scissors, Briefcase, Video, etc.
  - color_scheme (Select)
```

### Section 6: How It Works
**Fields:**
```
- how_it_works_enabled (Check) - Default: 1
- how_it_works_title_en (Data)
- how_it_works_title_am (Data)
- how_it_works_subtitle_en (Small Text)
- how_it_works_subtitle_am (Small Text)
- steps (Table) - Child table (4 items):
  - step_number (Int)
  - title_en (Data)
  - title_am (Data)
  - duration_en (Data) - e.g., "2 minutes"
  - duration_am (Data)
  - description_en (Text)
  - description_am (Text)
  - image (Attach Image)
  - icon (Select)
  - color_scheme (Select)
```

### Section 7: Pricing
**Fields:**
```
- pricing_enabled (Check) - Default: 1
- pricing_title_en (Data)
- pricing_title_am (Data)
- pricing_subtitle_en (Small Text)
- pricing_subtitle_am (Small Text)
- currency_symbol (Data) - Default: "ETB"
- pricing_tiers (Table) - Child table:
  - tier_name_en (Data)
  - tier_name_am (Data)
  - tier_description_en (Small Text)
  - tier_description_am (Small Text)
  - monthly_price (Currency)
  - yearly_price (Currency)
  - is_popular (Check)
  - cta_text_en (Data)
  - cta_text_am (Data)
  - features (Text) - JSON array of features
  - features_am (Text) - JSON array in Amharic
  - display_order (Int)
```

### Section 8: FAQ
**Fields:**
```
- faq_enabled (Check) - Default: 1
- faq_title_en (Data)
- faq_title_am (Data)
- faq_subtitle_en (Small Text)
- faq_subtitle_am (Small Text)
- faq_items (Table) - Child table:
  - question_en (Data)
  - question_am (Data)
  - answer_en (Text Editor)
  - answer_am (Text Editor)
  - display_order (Int)
```

### Section 9: Final CTA
**Fields:**
```
- final_cta_enabled (Check) - Default: 1
- final_cta_title_en (Data)
- final_cta_title_am (Data)
- final_cta_subtitle_en (Small Text)
- final_cta_subtitle_am (Small Text)
- final_cta_button_text_en (Data)
- final_cta_button_text_am (Data)
- trust_indicator_1_en (Data) - e.g., "No credit card required"
- trust_indicator_1_am (Data)
- trust_indicator_2_en (Data)
- trust_indicator_2_am (Data)
- trust_indicator_3_en (Data)
- trust_indicator_3_am (Data)
```

### Section 10: Footer
**Fields:**
```
- footer_enabled (Check) - Default: 1
- footer_tagline_en (Small Text)
- footer_tagline_am (Small Text)
- company_email (Data)
- company_phone (Data)
- company_location_en (Data)
- company_location_am (Data)
- support_hours_en (Data)
- support_hours_am (Data)
- social_links (Table) - Child table:
  - platform (Select) - Twitter, LinkedIn, Facebook, Instagram, YouTube
  - url (Data)
- footer_links (Table) - Child table:
  - section (Select) - Product, Resources, Company
  - link_text_en (Data)
  - link_text_am (Data)
  - url (Data)
  - display_order (Int)
```

### Section 11: Brand Settings
**Fields:**
```
- brand_primary_color (Color)
- brand_secondary_color (Color)
- brand_accent_gold (Color)
- brand_accent_teal (Color)
- logo_light (Attach Image)
- logo_dark (Attach Image)
- favicon (Attach Image)
```

### Section 12: SEO & Meta
**Fields:**
```
- meta_title_en (Data)
- meta_title_am (Data)
- meta_description_en (Text)
- meta_description_am (Text)
- og_image (Attach Image)
- keywords (Small Text) - Comma separated
```

### Section 13: Cache Settings
**Fields:**
```
- enable_caching (Check) - Default: 1
- cache_duration (Int) - Default: 3600 (1 hour)
- last_published (Datetime) - Read only
- published_by (Link - User) - Read only
```

---

## 🔧 Child Tables Structure

### Child Table: Hero Carousel Images
**Doctype Name**: `Landing Page Hero Image`
```python
{
    "name": "Landing Page Hero Image",
    "fields": [
        {"fieldname": "image", "fieldtype": "Attach Image", "label": "Image", "reqd": 1},
        {"fieldname": "alt_text_en", "fieldtype": "Data", "label": "Alt Text (EN)"},
        {"fieldname": "alt_text_am", "fieldtype": "Data", "label": "Alt Text (AM)"},
        {"fieldname": "caption_en", "fieldtype": "Data", "label": "Caption (EN)"},
        {"fieldname": "caption_am", "fieldtype": "Data", "label": "Caption (AM)"},
        {"fieldname": "display_order", "fieldtype": "Int", "label": "Display Order"}
    ]
}
```

### Child Table: Partners
**Doctype Name**: `Landing Page Partner`
```python
{
    "name": "Landing Page Partner",
    "fields": [
        {"fieldname": "partner_name", "fieldtype": "Data", "label": "Partner Name", "reqd": 1},
        {"fieldname": "partner_logo", "fieldtype": "Attach Image", "label": "Logo"},
        {"fieldname": "partner_website", "fieldtype": "Data", "label": "Website"},
        {"fieldname": "display_order", "fieldtype": "Int", "label": "Display Order"}
    ]
}
```

### Child Table: Value Propositions
**Doctype Name**: `Landing Page Value Proposition`
```python
{
    "name": "Landing Page Value Proposition",
    "fields": [
        {"fieldname": "title_en", "fieldtype": "Data", "label": "Title (EN)", "reqd": 1},
        {"fieldname": "title_am", "fieldtype": "Data", "label": "Title (AM)"},
        {"fieldname": "description_en", "fieldtype": "Text", "label": "Description (EN)"},
        {"fieldname": "description_am", "fieldtype": "Text", "label": "Description (AM)"},
        {"fieldname": "metric_en", "fieldtype": "Data", "label": "Metric (EN)"},
        {"fieldname": "metric_am", "fieldtype": "Data", "label": "Metric (AM)"},
        {"fieldname": "image", "fieldtype": "Attach Image", "label": "Image"},
        {"fieldname": "icon", "fieldtype": "Select", "label": "Icon", "options": "Clock\nDollarSign\nTrendingUp"},
        {"fieldname": "color_scheme", "fieldtype": "Select", "label": "Color Scheme", "options": "blue\nemerald\npurple\namber"},
        {"fieldname": "display_order", "fieldtype": "Int", "label": "Display Order"}
    ]
}
```

### Similar structure for other child tables...

---

## 🚀 Implementation Plan

### Phase 1: Create Doctypes
1. Create main Single doctype: `Landing Page Settings`
2. Create all child table doctypes
3. Set up proper permissions
4. Add validation scripts

### Phase 2: Backend API
Create Python file: `/appointment/scheduler/api/landing_page.py`

```python
import frappe
from frappe import _
from frappe.utils import cint

@frappe.whitelist(allow_guest=True)
def get_landing_page_settings(language="en"):
    """
    Fetch landing page settings with caching
    
    Args:
        language: 'en' or 'am'
    
    Returns:
        dict: All landing page content
    """
    cache_key = f"landing_page_settings_{language}"
    
    # Check if caching is enabled
    settings = frappe.get_single("Landing Page Settings")
    
    if settings.enable_caching:
        # Try to get from cache
        cached_data = frappe.cache().get_value(cache_key)
        if cached_data:
            return cached_data
    
    # Build data structure
    data = {
        "hero": get_hero_section(settings, language),
        "partners": get_partners_section(settings, language),
        "value_propositions": get_value_props(settings, language),
        "features": get_features(settings, language),
        "use_cases": get_use_cases(settings, language),
        "how_it_works": get_how_it_works(settings, language),
        "pricing": get_pricing(settings, language),
        "faq": get_faq(settings, language),
        "final_cta": get_final_cta(settings, language),
        "footer": get_footer(settings, language),
        "brand": get_brand_settings(settings),
        "meta": get_meta_data(settings, language)
    }
    
    # Cache the data
    if settings.enable_caching:
        cache_duration = cint(settings.cache_duration) or 3600
        frappe.cache().set_value(cache_key, data, expires_in_sec=cache_duration)
    
    return data

def get_hero_section(settings, lang):
    """Get hero section data"""
    suffix = f"_{lang}"
    
    return {
        "enabled": settings.hero_enabled,
        "eyebrow": settings.get(f"hero_eyebrow{suffix}"),
        "headline1": settings.get(f"hero_headline_1{suffix}"),
        "headline2": settings.get(f"hero_headline_2{suffix}"),
        "subheadline": settings.get(f"hero_subheadline{suffix}"),
        "ctaPrimary": settings.get(f"hero_cta_primary{suffix}"),
        "ctaSecondary": settings.get(f"hero_cta_secondary{suffix}"),
        "trustCount": settings.hero_trust_count,
        "trustLabel": settings.get(f"hero_trust_label{suffix}"),
        "rating": settings.hero_rating,
        "reviewsCount": settings.hero_reviews_count,
        "carouselImages": [
            {
                "url": img.image,
                "alt": img.get(f"alt_text{suffix}"),
                "caption": img.get(f"caption{suffix}")
            }
            for img in settings.hero_carousel_images
        ]
    }

# Similar functions for other sections...

@frappe.whitelist()
def clear_cache():
    """Clear landing page cache"""
    frappe.cache().delete_value("landing_page_settings_en")
    frappe.cache().delete_value("landing_page_settings_am")
    return {"message": _("Cache cleared successfully")}
```

### Phase 3: Frontend Integration
Update `/frontend/src/lib/api/landing-page.ts`

```typescript
import frappe from '@/lib/frappe';

export interface LandingPageSettings {
  hero: HeroSection;
  partners: PartnersSection;
  valuePropositions: ValueProposition[];
  features: Feature[];
  useCases: UseCase[];
  howItWorks: HowItWorksStep[];
  pricing: PricingTier[];
  faq: FAQItem[];
  finalCta: FinalCTA;
  footer: FooterData;
  brand: BrandSettings;
  meta: MetaData;
}

export async function getLandingPageSettings(language: string = 'en'): Promise<LandingPageSettings> {
  const response = await frappe.call({
    method: 'appointment.scheduler.api.landing_page.get_landing_page_settings',
    args: { language }
  });
  
  return response.message;
}

export async function clearLandingPageCache(): Promise<void> {
  await frappe.call({
    method: 'appointment.scheduler.api.landing_page.clear_cache'
  });
}
```

### Phase 4: Update Landing Page Components
Modify landing page to fetch data from API instead of translation files.

Example for Hero component:
```typescript
import { useEffect, useState } from 'react';
import { getLandingPageSettings } from '@/lib/api/landing-page';

const Hero = () => {
  const [heroData, setHeroData] = useState(null);
  const [language] = useLanguage();
  
  useEffect(() => {
    getLandingPageSettings(language).then(data => {
      setHeroData(data.hero);
    });
  }, [language]);
  
  if (!heroData) return <LoadingSpinner />;
  
  return (
    <section>
      <h1>{heroData.headline1} {heroData.headline2}</h1>
      {/* Rest of component using heroData */}
    </section>
  );
};
```

### Phase 5: Cache Management
Add hooks in `/appointment/hooks.py`:

```python
doc_events = {
    "Landing Page Settings": {
        "on_update": "appointment.scheduler.api.landing_page.clear_cache",
        "after_insert": "appointment.scheduler.api.landing_page.clear_cache"
    }
}
```

---

## 📊 Benefits

### 1. **Easy Content Management**
- Non-technical users can update content
- No code deployment required
- Changes reflect immediately (after cache clear)

### 2. **Performance**
- Cached responses (default 1 hour)
- Single API call loads all data
- Reduced database queries

### 3. **Multilingual**
- Separate fields for EN and AM
- Language switching without new API calls

### 4. **A/B Testing**
- Enable/disable sections easily
- Test different copy
- Track what works

### 5. **Brand Management**
- Update colors centrally
- Upload logos/images
- Consistent branding

### 6. **SEO Control**
- Manage meta tags
- Update keywords
- Control OG images

---

## 🎨 UI Enhancements

### Custom Form Script
Add to doctype: `landing_page_settings.js`

```javascript
frappe.ui.form.on('Landing Page Settings', {
    refresh: function(frm) {
        // Add custom buttons
        frm.add_custom_button(__('Preview Landing Page'), function() {
            window.open('/landing-preview', '_blank');
        }, __('Actions'));
        
        frm.add_custom_button(__('Clear Cache'), function() {
            frappe.call({
                method: 'appointment.scheduler.api.landing_page.clear_cache',
                callback: function(r) {
                    frappe.show_alert({
                        message: __('Cache Cleared Successfully'),
                        indicator: 'green'
                    });
                }
            });
        }, __('Actions'));
        
        frm.add_custom_button(__('Publish Changes'), function() {
            frm.save();
            frappe.show_alert({
                message: __('Changes Published'),
                indicator: 'green'
            });
        }, __('Actions')).addClass('btn-primary');
    }
});
```

---

## 🔒 Permissions

```python
# Only System Managers and Website Managers can edit
{
    "role": "System Manager",
    "read": 1,
    "write": 1,
    "create": 1
},
{
    "role": "Website Manager",
    "read": 1,
    "write": 1,
    "create": 1
}
```

---

## 📝 Next Steps

1. **You create the doctype** in Frappe Desk
2. **I will update the JSON file** with proper field structure
3. **I will create** the Python API methods
4. **I will integrate** frontend to fetch from API
5. **We test** the caching and updates

---

## 🎯 Success Criteria

- ✅ All landing page content manageable from desk
- ✅ Changes reflect immediately (after cache clear)
- ✅ Fast loading with caching (<100ms)
- ✅ Bilingual support working
- ✅ Images uploadable and served correctly
- ✅ Non-technical users can manage content

---

This approach gives you complete control over landing page content without touching code!




