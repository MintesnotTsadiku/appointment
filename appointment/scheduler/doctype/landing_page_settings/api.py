"""
API endpoints for Landing Page Settings
"""
import frappe
from frappe import _


@frappe.whitelist(allow_guest=True)
def get_landing_page_settings():
    """
    Get landing page settings with all child tables
    Returns formatted data for the frontend
    """
    try:
        doc = frappe.get_doc("Landing Page Settings", "Landing Page Settings")
        
        # Build response data
        data = {
            # Hero Section
            "hero": {
                "enabled": doc.hero_enabled,
                "eyebrow": {
                    "en": doc.hero_eyebrow_en,
                    "am": doc.hero_eyebrow_am
                },
                "headline1": {
                    "en": doc.hero_headline_1_en,
                    "am": doc.hero_headline_1_am
                },
                "headline2": {
                    "en": doc.hero_headline_2_en,
                    "am": doc.hero_headline_2_am
                },
                "subheadline": {
                    "en": doc.hero_subheadline_en,
                    "am": doc.hero_subheadline_am
                },
                "ctaPrimary": {
                    "en": doc.hero_cta_primary_en,
                    "am": doc.hero_cta_primary_am
                },
                "ctaSecondary": {
                    "en": doc.hero_cta_secondary_en,
                    "am": doc.hero_cta_secondary_am
                },
                "trust": {
                    "count": doc.hero_trust_count,
                    "label": {
                        "en": doc.hero_trust_label_en,
                        "am": doc.hero_trust_label_am
                    },
                    "rating": doc.hero_rating,
                    "reviewsCount": doc.hero_reviews_count
                },
                "carouselImages": [
                    {
                        "url": img.image,
                        "altText": {"en": img.alt_text_en, "am": img.alt_text_am}
                    }
                    for img in doc.hero_carousel_images
                ]
            },
            
            # Logo Cloud / Partners
            "partners": {
                "enabled": doc.partners_enabled,
                "title": {
                    "en": doc.partners_title_en,
                    "am": doc.partners_title_am
                },
                "subtitle": {
                    "en": doc.partners_subtitle_en,
                    "am": doc.partners_subtitle_am
                },
                "list": [
                    {
                        "name": partner.partner_name,
                        "logo": partner.partner_logo
                    }
                    for partner in doc.partners_list
                ],
                "stats": {
                    "activeUsers": {
                        "value": doc.stat_active_users,
                        "label": {
                            "en": doc.stat_active_users_label_en,
                            "am": doc.stat_active_users_label_am
                        }
                    },
                    "appointments": {
                        "value": doc.stat_appointments,
                        "label": {
                            "en": doc.stat_appointments_label_en,
                            "am": doc.stat_appointments_label_am
                        }
                    },
                    "uptime": {
                        "value": doc.stat_uptime,
                        "label": {
                            "en": doc.stat_uptime_label_en,
                            "am": doc.stat_uptime_label_am
                        }
                    },
                    "rating": {
                        "value": doc.stat_rating,
                        "label": {
                            "en": doc.stat_rating_label_en,
                            "am": doc.stat_rating_label_am
                        }
                    }
                }
            },
            
            # Value Proposition
            "valueProposition": {
                "enabled": doc.value_prop_enabled,
                "title": {
                    "en": doc.value_prop_title_en,
                    "am": doc.value_prop_title_am
                },
                "subtitle": {
                    "en": doc.value_prop_subtitle_en,
                    "am": doc.value_prop_subtitle_am
                },
                "items": [
                    {
                        "title": {"en": vp.title_en, "am": vp.title_am},
                        "description": {"en": vp.description_en, "am": vp.description_am},
                        "metric": {"en": vp.metric_en, "am": vp.metric_am},
                        "image": vp.image_url
                    }
                    for vp in doc.value_propositions
                ]
            },
            
            # Features
            "features": {
                "enabled": doc.features_enabled,
                "title": {
                    "en": doc.features_title_en,
                    "am": doc.features_title_am
                },
                "subtitle": {
                    "en": doc.features_subtitle_en,
                    "am": doc.features_subtitle_am
                },
                "list": [
                    {
                        "title": {"en": feat.title_en, "am": feat.title_am},
                        "description": {"en": feat.description_en, "am": feat.description_am},
                        "image": feat.image_url
                    }
                    for feat in doc.features_list
                ]
            },
            
            # Use Cases
            "useCases": {
                "enabled": doc.use_cases_enabled,
                "title": {
                    "en": doc.use_cases_title_en,
                    "am": doc.use_cases_title_am
                },
                "subtitle": {
                    "en": doc.use_cases_subtitle_en,
                    "am": doc.use_cases_subtitle_am
                },
                "list": [
                    {
                        "title": {"en": uc.title_en, "am": uc.title_am},
                        "subtitle": {"en": uc.subtitle_en, "am": uc.subtitle_am},
                        "description": {"en": uc.description_en, "am": uc.description_am},
                        "image": uc.image_url
                    }
                    for uc in doc.use_cases_list
                ]
            },
            
            # How It Works
            "howItWorks": {
                "enabled": doc.how_it_works_enabled,
                "title": {
                    "en": doc.how_it_works_title_en,
                    "am": doc.how_it_works_title_am
                },
                "subtitle": {
                    "en": doc.how_it_works_subtitle_en,
                    "am": doc.how_it_works_subtitle_am
                },
                "steps": [
                    {
                        "number": step.step_number,
                        "title": {"en": step.title_en, "am": step.title_am},
                        "description": {"en": step.description_en, "am": step.description_am},
                        "image": step.image_url
                    }
                    for step in doc.steps
                ]
            },
            
            # Pricing
            "pricing": {
                "enabled": doc.pricing_enabled,
                "title": {
                    "en": doc.pricing_title_en,
                    "am": doc.pricing_title_am
                },
                "subtitle": {
                    "en": doc.pricing_subtitle_en,
                    "am": doc.pricing_subtitle_am
                },
                "currency": {
                    "symbol": doc.currency_symbol,
                    "code": doc.currency_code
                },
                "tiers": [
                    {
                        "name": {"en": tier.tier_name_en, "am": tier.tier_name_am},
                        "description": {"en": tier.description_en, "am": tier.description_am},
                        "monthlyPrice": tier.monthly_price,
                        "yearlyPrice": tier.yearly_price,
                        "isPopular": tier.is_popular
                    }
                    for tier in doc.pricing_tiers
                ]
            },
            
            # FAQ
            "faq": {
                "enabled": doc.faq_enabled,
                "title": {
                    "en": doc.faq_title_en,
                    "am": doc.faq_title_am
                },
                "subtitle": {
                    "en": doc.faq_subtitle_en,
                    "am": doc.faq_subtitle_am
                },
                "items": [
                    {
                        "question": {"en": item.question_en, "am": item.question_am},
                        "answer": {"en": item.answer_en, "am": item.answer_am}
                    }
                    for item in doc.faq_items
                ]
            },
            
            # Final CTA
            "finalCTA": {
                "enabled": doc.final_cta_enabled,
                "title": {
                    "en": doc.final_cta_title_en,
                    "am": doc.final_cta_title_am
                },
                "subtitle": {
                    "en": doc.final_cta_subtitle_en,
                    "am": doc.final_cta_subtitle_am
                },
                "buttonText": {
                    "en": doc.final_cta_button_text_en,
                    "am": doc.final_cta_button_text_am
                },
                "trustIndicators": [
                    {"en": doc.trust_indicator_1_en, "am": doc.trust_indicator_1_am},
                    {"en": doc.trust_indicator_2_en, "am": doc.trust_indicator_2_am},
                    {"en": doc.trust_indicator_3_en, "am": doc.trust_indicator_3_am}
                ]
            },
            
            # Footer
            "footer": {
                "enabled": doc.footer_enabled,
                "tagline": {
                    "en": doc.footer_tagline_en,
                    "am": doc.footer_tagline_am
                },
                "contact": {
                    "email": doc.company_email,
                    "phone": doc.company_phone,
                    "location": {
                        "en": doc.company_location_en,
                        "am": doc.company_location_am
                    },
                    "supportHours": {
                        "en": doc.support_hours_en,
                        "am": doc.support_hours_am
                    }
                },
                "socialLinks": [
                    {
                        "platform": link.platform,
                        "url": link.url
                    }
                    for link in doc.social_links
                ],
                "links": [
                    {
                        "section": link.section,
                        "text": {"en": link.link_text_en, "am": link.link_text_am},
                        "url": link.url
                    }
                    for link in doc.footer_links
                ]
            },
            
            # Brand
            "brand": {
                "colors": {
                    "primary": doc.brand_primary_color,
                    "secondary": doc.brand_secondary_color,
                    "accentGold": doc.brand_accent_gold,
                    "accentTeal": doc.brand_accent_teal
                },
                "logos": {
                    "light": doc.logo_light,
                    "dark": doc.logo_dark,
                    "favicon": doc.favicon
                }
            },
            
            # SEO
            "seo": {
                "title": {
                    "en": doc.meta_title_en,
                    "am": doc.meta_title_am
                },
                "description": {
                    "en": doc.meta_description_en,
                    "am": doc.meta_description_am
                },
                "ogImage": doc.og_image,
                "keywords": doc.keywords
            },
            
            # Cache info
            "cache": {
                "enabled": doc.enable_caching,
                "duration": doc.cache_duration,
                "lastPublished": doc.last_published
            }
        }
        
        return {"success": True, "data": data}
        
    except Exception as e:
        frappe.log_error(f"Error fetching landing page settings: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to fetch landing page settings"
        }




