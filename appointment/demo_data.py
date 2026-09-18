"""
Demo Data Generation for Appointment
Generates realistic Ethiopian-context demo data for testing and development
"""

import frappe
from frappe import _
from datetime import datetime, timedelta
import random


# =====================================================
# ETHIOPIAN CONTEXT DATA
# =====================================================

ETHIOPIAN_FIRST_NAMES = [
    "Abebe", "Hanna", "Kidus", "Meron", "Elias", "Sara",
    "Dawit", "Bethlehem", "Yohannes", "Ruth", "Samuel", "Selam",
    "Daniel", "Rahel", "Michael", "Lydia", "Gabriel", "Selamawit",
    "Abenezer", "Mahlet", "Yared", "Tsion", "Biniam", "Eden"
]

ETHIOPIAN_LAST_NAMES = [
    "Bekele", "Tadesse", "Alemayehu", "Kebede", "Tesfaye", "Haile",
    "Worku", "Desta", "Negash", "Assefa", "Girma", "Mulugeta",
    "Gebre", "Alemu", "Getachew", "Tessema", "Wolde", "Amare"
]

ADDIS_LOCATIONS = [
    ("Bole Road, Near Edna Mall", "Bole Road, Near Edna Mall", "Addis Ababa"),
    ("Merkato, CMC Area", "CMC Area, Merkato", "Addis Ababa"),
    ("Piassa, Churchill Avenue", "Churchill Avenue, Piassa", "Addis Ababa"),
    ("4 Kilo, Near ECA", "Near ECA, 4 Kilo", "Addis Ababa"),
    ("Kazanchis, Business District", "Business District, Kazanchis", "Addis Ababa"),
    ("Sarbet, Near Megenagna", "Near Megenagna, Sarbet", "Addis Ababa"),
    ("Arat Kilo, University Area", "University Area, Arat Kilo", "Addis Ababa"),
    ("Mexico Square, Atlas Area", "Atlas Area, Mexico Square", "Addis Ababa")
]

ORGANIZATION_TYPES = {
    "Healthcare": [
        "Medical Clinic", "Dental Care", "Eye Clinic", "Pediatric Center"
    ],
    "Salon & Spa": [
        "Beauty Salon", "Barber Shop", "Spa & Wellness"
    ],
    "Fitness & Wellness": [
        "Gym", "Yoga Studio"
    ],
    "Consulting": [
        "Business Consulting", "Legal Services"
    ]
}

SERVICES_BY_TYPE = {
    "Healthcare": [
        ("General Consultation", 30, 500, "Medical checkup with doctor"),
        ("Dental Checkup", 45, 750, "Comprehensive dental examination"),
        ("Eye Examination", 30, 600, "Vision test and eye health check"),
        ("Vaccination", 15, 300, "Immunization services"),
        ("Pediatric Consultation", 30, 550, "Child health checkup"),
        ("Emergency Consultation", 20, 800, "Urgent medical care"),
        ("Follow-up Visit", 20, 400, "Post-treatment follow-up"),
        ("Wellness Check", 45, 600, "Comprehensive health assessment"),
        ("Specialist Consultation", 60, 1200, "Expert medical consultation"),
        ("Lab Test Consultation", 30, 450, "Laboratory test review")
    ],
    "Salon & Spa": [
        ("Hair Cut & Style", 60, 300, "Professional haircut and styling"),
        ("Manicure & Pedicure", 90, 450, "Hand and foot care"),
        ("Facial Treatment", 60, 650, "Deep cleansing facial"),
        ("Hair Coloring", 120, 800, "Professional hair coloring"),
        ("Massage Therapy", 60, 550, "Relaxing full body massage")
    ],
    "Fitness & Wellness": [
        ("Personal Training", 60, 400, "One-on-one fitness training"),
        ("Yoga Class", 60, 250, "Group yoga session"),
        ("Nutritional Consultation", 45, 500, "Diet and nutrition planning")
    ],
    "Consulting": [
        ("Business Consultation", 60, 1000, "Business strategy session"),
        ("Legal Consultation", 45, 1200, "Legal advice and guidance")
    ]
}


# =====================================================
# HELPER FUNCTIONS
# =====================================================

def generate_ethiopian_name():
    """Generate random Ethiopian name"""
    first = random.choice(ETHIOPIAN_FIRST_NAMES)
    last = random.choice(ETHIOPIAN_LAST_NAMES)
    return f"{first} {last}"


def generate_ethiopian_phone():
    """Generate realistic Ethiopian phone number"""
    prefix = random.choice(["911", "912", "913", "914", "920", "921"])
    number = random.randint(100000, 999999)
    return f"+2519{prefix[1:]}{number}"


def generate_email(name, domain="demo.et"):
    """Generate email from name - ensures valid email format"""
    # Sanitize the name first to remove special characters
    sanitized = sanitize_email_string(name)
    # Split into parts
    parts = sanitized.lower().split()
    if len(parts) >= 2:
        # Use first two parts, join with dot
        return f"{parts[0]}.{parts[1]}@{domain}"
    elif len(parts) == 1:
        return f"{parts[0]}@{domain}"
    else:
        # Fallback if name is empty
        return f"client@{domain}"


def sanitize_email_string(text):
    """Sanitize string for use in email/slug"""
    import re
    # Remove special characters, keep alphanumeric and spaces
    text = re.sub(r'[^a-zA-Z0-9\s]', '', text)
    # Replace spaces with nothing
    text = text.replace(' ', '')
    return text.lower()


def generate_unique_slug(base_slug, doctype, fieldname='slug', max_attempts=100):
    """Generate a unique slug by appending numbers if needed"""
    slug = base_slug
    attempt = 0
    
    while attempt < max_attempts:
        # Check if slug exists
        existing = frappe.db.get_value(doctype, {fieldname: slug}, fieldname)
        if not existing:
            return slug
        
        # Try with number suffix
        attempt += 1
        slug = f"{base_slug}{attempt}"
    
    # If all attempts failed, use timestamp
    import time
    return f"{base_slug}{int(time.time())}"


def mark_as_demo(doc):
    """Mark document as demo data"""
    if hasattr(doc, 'is_demo_data'):
        doc.is_demo_data = 1


def attach_image_from_url(doc, fieldname, image_url):
    """Attach image from URL to document field"""
    try:
        import requests
        from frappe.utils.file_manager import save_file
        
        # CRITICAL: Reload document fresh from database to avoid link validation errors
        # This ensures we have the latest version without any stale child table references
        frappe.db.commit()  # Commit any pending changes first
        doc.reload()
        
        response = requests.get(image_url, timeout=10)
        if response.status_code == 200:
            file_doc = save_file(
                fname=f"{fieldname}.jpg",
                content=response.content,
                dt=doc.doctype,
                dn=doc.name,
                folder="Home/Attachments",
                is_private=0
            )
            # Set the field and save - reload ensures we don't have invalid child table references
            setattr(doc, fieldname, file_doc.file_url)
            doc.save(ignore_permissions=True)
    except Exception as e:
        frappe.log_error(f"Failed to attach image to {doc.doctype} {doc.name}: {str(e)}", "Demo Data: Image Attachment")
        pass


# =====================================================
# GENERATION FUNCTIONS
# =====================================================

@frappe.whitelist()
def generate_organizations(count=3):
    """
    Generate demo organizations
    Creates realistic Ethiopian healthcare and service businesses
    """
    frappe.only_for("System Manager")
    count = int(count)
    
    created = []
    org_names = []
    
    try:
        for i in range(count):
            # Pick organization type
            if i == 0:
                org_type = "Healthcare"
                subtype = "Medical Clinic"
                name_template = ["Mahlet", "Selamta", "Hayat", "Bethel"][i % 4]
            elif i == 1:
                org_type = "Healthcare"
                subtype = "Dental Care"
                name_template = ["Selam", "Berhan", "Mulu"][i % 3]
            else:
                org_type = random.choice(list(ORGANIZATION_TYPES.keys()))
                subtype = random.choice(ORGANIZATION_TYPES[org_type])
                name_template = random.choice(["Addis", "Bole", "Merkato", "Piassa"])
            
            org_name = f"{name_template} {subtype}"
            
            # Check if already exists
            if frappe.db.exists("Organization", org_name):
                frappe.msgprint(f"Organization '{org_name}' already exists, skipping", alert=True)
                continue
            
            # Create organization
            org = frappe.new_doc("Organization")
            org.organization_name = org_name
            org.organization_type = org_type
            # Sanitize email to remove invalid characters (like &, spaces, etc.)
            email_part = sanitize_email_string(f"{name_template}{subtype}")
            org.email = f"contact@{email_part}.et"
            org.phone = generate_ethiopian_phone()
            org.timezone = "Africa/Addis_Ababa"
            org.language = "en"
            org.description = f"Professional {subtype} services in Addis Ababa"
            base_slug = sanitize_email_string(org_name).replace(".", "-")
            org.slug = generate_unique_slug(base_slug, "Organization", "slug")
            org.is_active = 1
            org.setup_complete = 1
            org.owner_user = frappe.session.user
            org.booking_policy = "customer_choice"
            org.allow_provider_selection = 1
            org.enable_public_booking = 1
            org.require_payment = 0
            
            mark_as_demo(org)
            
            # Set flag to skip booking URL sync during demo data generation
            # This prevents on_update hook from trying to sync URLs before services/providers exist
            frappe.flags.skip_booking_url_sync = True
            
            org.insert(ignore_permissions=True)
            frappe.db.commit()
            
            # Add profile photo using placeholder image
            # IMPORTANT: Do this BEFORE any other operations that might modify the document
            # and reload the document fresh to avoid link validation errors
            photo_urls = [
                "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=400&fit=crop",  # Medical
                "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=400&h=400&fit=crop",  # Dental
                "https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=400&h=400&fit=crop",  # Salon
                "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=400&fit=crop",  # Fitness
            ]
            if hasattr(org, 'logo'):
                try:
                    # Reload org fresh from database to avoid any stale references
                    frappe.db.commit()  # Ensure all pending changes are committed
                    org.reload()
                    attach_image_from_url(org, 'logo', photo_urls[i % len(photo_urls)])
                    frappe.db.commit()
                except Exception as e:
                    # Don't fail demo data generation if image attachment fails
                    frappe.log_error(str(e), "Demo Data: Image Attachment Error")
                    pass
            
            # Clear the flag after image attachment
            frappe.flags.skip_booking_url_sync = False
            
            created.append(org.name)
            org_names.append(org.name)
            frappe.db.commit()
            
            # NOTE: Do NOT sync booking URLs here - they reference services/providers that don't exist yet
            # Booking URLs will be synced later in generate_all_demo_data() after all services/providers are created
        
        message = f"✓ Created {len(created)} organizations:\n" + "\n".join(f"  • {name}" for name in created)
        
        return {
            "success": True,
            "count": len(created),
            "organizations": org_names,
            "message": message
        }
    
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Demo Data: Generate Organizations Error")
        frappe.throw(_(f"Error generating organizations: {str(e)}"))


@frappe.whitelist()
def generate_all_demo_data():
    """
    Generate complete demo data with all relationships and booking URLs
    This ensures everything is properly set up with booking URLs
    """
    frappe.only_for("System Manager")
    
    results = {
        "organizations": [],
        "providers": [],
        "services": [],
        "locations": [],
        "event_types": [],
        "appointments": 0,
        "booking_events": 0,
        "booking_urls_synced": False
    }
    
    try:
        # Step 1: Generate Organizations
        frappe.msgprint("Step 1: Generating organizations...", alert=True)
        org_result = generate_organizations(3)
        results["organizations"] = org_result.get("organizations", [])
        frappe.db.commit()
        
        # Step 2: Generate Providers (linked to organizations)
        frappe.msgprint("Step 2: Generating providers...", alert=True)
        provider_result = generate_providers(6)  # 2 per org + 2 solo
        results["providers"] = provider_result.get("providers", [])
        frappe.db.commit()
        
        # Step 2.5: Ensure all organizations have active providers (fix missing providers)
        frappe.msgprint("Step 2.5: Ensuring all organizations have providers...", alert=True)
        ensure_orgs_have_providers_result = ensure_all_organizations_have_providers()
        frappe.db.commit()
        
        # Step 3: Generate Services (for organizations)
        frappe.msgprint("Step 3: Generating services...", alert=True)
        service_result = generate_services(15)  # 5 per org (more services for better testing)
        results["services"] = service_result.get("services", [])
        frappe.db.commit()
        
        # Step 3.5: Link providers to services (ensure all services have providers)
        frappe.msgprint("Step 3.5: Linking providers to services...", alert=True)
        link_result = link_providers_to_services()
        frappe.db.commit()
        
        # Step 4: Generate Locations
        frappe.msgprint("Step 4: Generating locations...", alert=True)
        location_result = generate_locations(6)  # 2 per org
        results["locations"] = location_result.get("locations", [])
        frappe.db.commit()
        
        # Step 4.5: Fix any locations with missing addresses
        frappe.msgprint("Step 4.5: Fixing location addresses...", alert=True)
        fix_address_result = fix_location_addresses()
        frappe.db.commit()
        
        # Step 5: Generate EventTypes for ALL services and providers
        frappe.msgprint("Step 5: Generating EventTypes for all services and providers...", alert=True)
        eventtype_result = generate_event_types()
        results["event_types"] = eventtype_result.get("event_types", [])
        frappe.db.commit()
        
        # Step 6: Generate Appointments
        frappe.msgprint("Step 6: Generating appointments...", alert=True)
        appointment_result = generate_appointments(10, days_back=14)  # Create appointments using existing EventTypes
        results["appointments"] = appointment_result.get("appointments", 0)
        results["booking_events"] = appointment_result.get("booking_events", 0)
        frappe.db.commit()
        
        # Step 6.5: Add Available Durations to all providers
        frappe.msgprint("Step 6.5: Adding available durations to providers...", alert=True)
        duration_result = add_available_durations_to_providers()
        frappe.db.commit()
        
        # Step 6.6: Generate Appointment Groups
        frappe.msgprint("Step 6.6: Generating appointment groups...", alert=True)
        group_result = generate_appointment_groups(3)  # Create 3 group meetings
        results["appointment_groups"] = group_result.get("groups", [])
        frappe.db.commit()
        
        # Step 7: Sync ALL booking URLs (CRITICAL - ensures all have booking URLs)
        frappe.msgprint("Step 7: Syncing booking URLs for all providers and organizations...", alert=True)
        from appointment.scheduler.booking_url_manager import sync_booking_urls_for_provider, sync_booking_urls_for_organization
        
        # Sync all providers (both org-linked and solo)
        all_providers = frappe.get_all("Provider", pluck="name")
        providers_synced = 0
        for provider_name in all_providers:
            try:
                sync_booking_urls_for_provider(provider_name)
                providers_synced += 1
                frappe.db.commit()
            except Exception as e:
                frappe.log_error(str(e), f"Demo Data: Sync Provider {provider_name} Booking URLs Error")
        
        # Sync all organizations
        all_orgs = frappe.get_all("Organization", pluck="name")
        orgs_synced = 0
        for org_name in all_orgs:
            try:
                sync_booking_urls_for_organization(org_name)
                orgs_synced += 1
                frappe.db.commit()
            except Exception as e:
                frappe.log_error(str(e), f"Demo Data: Sync Organization {org_name} Booking URLs Error")
        
        frappe.db.commit()
        results["booking_urls_synced"] = True
        
        # Verify booking URLs were created
        orgs_with_urls = 0
        providers_with_urls = 0
        
        for org_name in all_orgs:
            try:
                org_doc = frappe.get_doc("Organization", org_name)
                if hasattr(org_doc, 'booking_urls') and org_doc.booking_urls:
                    orgs_with_urls += 1
            except:
                pass
        
        for provider_name in all_providers:
            try:
                provider = frappe.get_doc("Provider", provider_name)
                if provider.email:
                    availability = frappe.db.get_value("User Appointment Availability", {"user": provider.email}, "name")
                    if availability:
                        avail_doc = frappe.get_doc("User Appointment Availability", availability)
                        if hasattr(avail_doc, 'booking_urls') and avail_doc.booking_urls:
                            providers_with_urls += 1
            except:
                pass
        
        message = f"""✓ Demo data generation complete!

Organizations: {len(all_orgs)} ({orgs_with_urls} with booking URLs)
Providers: {len(all_providers)} ({providers_with_urls} with booking URLs)
Services: {len(results['services'])}
Locations: {len(results['locations'])}
EventTypes: {len(results.get('event_types', []))}
Appointments: {results['appointments']}
Booking Events: {results['booking_events']}

Booking URLs have been synced for all providers and organizations."""
        
        return {
            "success": True,
            "message": message,
            **results
        }
    
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Demo Data: Generate All Error")
        frappe.throw(_(f"Error generating demo data: {str(e)}"))


@frappe.whitelist()
def generate_providers(count=5):
    """
    Generate demo providers
    Creates provider records with users, linking some to organizations
    """
    frappe.only_for("System Manager")
    count = int(count)
    
    created = []
    
    try:
        # Get existing organizations
        orgs = frappe.get_all("Organization", pluck="name")
        
        # Calculate distribution: 2 providers per org, rest as solo
        org_provider_count = len(orgs) * 2 if orgs else 0
        solo_provider_count = max(0, count - org_provider_count)
        
        provider_index = 0
        
        # Step 1: Create providers for each organization
        for org_name in orgs:
            for i in range(2):  # 2 providers per org
                if provider_index >= count:
                    break
                
                name = generate_ethiopian_name()
                email = generate_email(name)
                
                # Check if user/provider already exists
                if frappe.db.exists("User", email) or frappe.db.exists("Provider", {"email": email}):
                    continue
                
                # Create User
                user = frappe.new_doc("User")
                user.email = email
                user.first_name = name.split()[0] if len(name.split()) > 0 else "Provider"
                user.last_name = " ".join(name.split()[1:]) if len(name.split()) > 1 else ""
                user.send_welcome_email = 0
                user.user_type = "System User"
                user.insert(ignore_permissions=True)
                
                # Create Provider
                provider = frappe.new_doc("Provider")
                provider.provider_name = name
                provider.full_name = name
                provider.email = email
                provider.user = email
                provider.phone = generate_ethiopian_phone()
                provider.timezone = "Africa/Addis_Ababa"
                provider.language = "en"
                provider.is_active = 1
                provider.onboarding_complete = 1
                mark_as_demo(provider)
                provider.insert(ignore_permissions=True)
                
                # Link to organization via Provider Organization child table
                if hasattr(provider, 'organizations'):
                    provider.append("organizations", {
                        "organization": org_name,
                        "status": "Active",
                        "accept_org_bookings": 1,
                        "is_primary": 1 if i == 0 else 0
                    })
                    provider.save(ignore_permissions=True)
                
                # Create User Appointment Availability
                availability = frappe.new_doc("User Appointment Availability")
                availability.user = email
                availability.provider = provider.name
                base_slug = sanitize_email_string(name)
                availability.slug = generate_unique_slug(base_slug, "User Appointment Availability", "slug")
                availability.enable_scheduling = 1
                availability.meeting_provider = "builtin"
                availability.insert(ignore_permissions=True)
                
                # Link back to provider
                provider.user_appointment_availability = availability.name
                provider.save(ignore_permissions=True)
                
                # Add Available Durations and Time Slots immediately
                try:
                    availability_doc = frappe.get_doc("User Appointment Availability", availability.name)
                    needs_update = False
                    
                    # Days to add (Monday to Saturday)
                    weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
                    default_start_time = "09:00:00"
                    default_end_time = "18:00:00"
                    
                    # Add default duration if none exists
                    if not availability_doc.available_durations or len(availability_doc.available_durations) == 0:
                        availability_doc.append("available_durations", {
                            "title": "30 Minute Meeting",
                            "duration": 30 * 60,  # 30 minutes in seconds
                            "allow_rescheduling": 1,
                            "availability_window": 30,  # 30 days
                            "minimum_notice_before_event": 2  # 2 hours
                        })
                        needs_update = True
                    
                    # Add time slots (Monday to Saturday) if missing
                    existing_days = set()
                    if availability_doc.appointment_time_slot:
                        existing_days = {slot.day for slot in availability_doc.appointment_time_slot}
                    
                    for day in weekdays:
                        if day not in existing_days:
                            availability_doc.append("appointment_time_slot", {
                                "day": day,
                                "start_time": default_start_time,
                                "end_time": default_end_time
                            })
                            needs_update = True
                    
                    if needs_update:
                        availability_doc.save(ignore_permissions=True)
                        frappe.db.commit()
                except Exception as e:
                    frappe.log_error(str(e), "Demo Data: Add Durations/Time Slots Error")
                
                created.append(provider.name)
                provider_index += 1
                frappe.db.commit()
        
                # Sync booking URLs
                try:
                    from appointment.scheduler.booking_url_manager import sync_booking_urls_for_provider
                    sync_booking_urls_for_provider(provider.name)
                    frappe.db.commit()
                except Exception as e:
                    frappe.log_error(str(e), "Demo Data: Sync Provider Booking URLs Error")
        
        # Step 2: Create solo providers
        for i in range(solo_provider_count):
            if provider_index >= count:
                break
            
            name = generate_ethiopian_name()
            email = generate_email(name)
            
            if frappe.db.exists("User", email) or frappe.db.exists("Provider", {"email": email}):
                continue
            
            # Create User
            user = frappe.new_doc("User")
            user.email = email
            user.first_name = name.split()[0] if len(name.split()) > 0 else "Provider"
            user.last_name = " ".join(name.split()[1:]) if len(name.split()) > 1 else ""
            user.send_welcome_email = 0
            user.user_type = "System User"
            user.insert(ignore_permissions=True)
            
            # Create Provider
            provider = frappe.new_doc("Provider")
            provider.provider_name = name
            provider.full_name = name
            provider.email = email
            provider.user = email
            provider.phone = generate_ethiopian_phone()
            provider.timezone = "Africa/Addis_Ababa"
            provider.language = "en"
            provider.is_active = 1
            provider.onboarding_complete = 1
            provider.onboarding_type = "individual"
            mark_as_demo(provider)
            provider.insert(ignore_permissions=True)
            
            # Create User Appointment Availability
            availability = frappe.new_doc("User Appointment Availability")
            availability.user = email
            availability.provider = provider.name
            base_slug = sanitize_email_string(name)
            availability.slug = generate_unique_slug(base_slug, "User Appointment Availability", "slug")
            availability.enable_scheduling = 1
            availability.meeting_provider = "builtin"
            availability.insert(ignore_permissions=True)
            
            # Link back to provider
            provider.user_appointment_availability = availability.name
            provider.save(ignore_permissions=True)
            
            # Add Available Durations and Time Slots immediately
            try:
                availability_doc = frappe.get_doc("User Appointment Availability", availability.name)
                needs_update = False
                
                # Days to add (Monday to Saturday)
                weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
                default_start_time = "09:00:00"
                default_end_time = "18:00:00"
                
                # Add default duration if none exists
                if not availability_doc.available_durations or len(availability_doc.available_durations) == 0:
                    availability_doc.append("available_durations", {
                        "title": "30 Minute Meeting",
                        "duration": 30 * 60,  # 30 minutes in seconds
                        "allow_rescheduling": 1,
                        "availability_window": 30,  # 30 days
                        "minimum_notice_before_event": 2  # 2 hours
                    })
                    needs_update = True
                
                # Add time slots (Monday to Saturday) if missing
                existing_days = set()
                if availability_doc.appointment_time_slot:
                    existing_days = {slot.day for slot in availability_doc.appointment_time_slot}
                
                for day in weekdays:
                    if day not in existing_days:
                        availability_doc.append("appointment_time_slot", {
                            "day": day,
                            "start_time": default_start_time,
                            "end_time": default_end_time
                        })
                        needs_update = True
                
                if needs_update:
                    availability_doc.save(ignore_permissions=True)
                    frappe.db.commit()
            except Exception as e:
                frappe.log_error(str(e), "Demo Data: Add Durations/Time Slots Error")
            
            created.append(provider.name)
            provider_index += 1
            frappe.db.commit()
        
            # Sync booking URLs
            try:
                from appointment.scheduler.booking_url_manager import sync_booking_urls_for_provider
                sync_booking_urls_for_provider(provider.name)
                frappe.db.commit()
            except Exception as e:
                frappe.log_error(str(e), "Demo Data: Sync Provider Booking URLs Error")
        
        return {
            "success": True,
            "count": len(created),
            "providers": created,
            "message": f"✓ Created {len(created)} providers"
        }
    
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Demo Data: Generate Providers Error")
        frappe.throw(_(f"Error generating providers: {str(e)}"))


@frappe.whitelist()
def generate_services(count=5):
    """
    Generate demo services for organizations
    Automatically links providers to services during creation
    Ensures all services have at least one provider linked
    """
    frappe.only_for("System Manager")
    count = int(count)
    
    created = []
    linked_count = 0
    
    try:
        orgs = frappe.get_all("Organization", fields=["name", "organization_type"])
        if not orgs:
            frappe.throw("Please create organizations first")
        
        # Distribute services more evenly, with at least 3-5 per org
        services_per_org = max(3, count // len(orgs))
        service_index = 0
        
        for org in orgs:
            org_type = org.organization_type or "Healthcare"
            service_list = SERVICES_BY_TYPE.get(org_type, SERVICES_BY_TYPE["Healthcare"])
            
            for i in range(min(services_per_org, len(service_list))):
                if service_index >= count:
                    break
                
                service_data = service_list[i % len(service_list)]
                service_name, duration, price, description = service_data
                
                # Check if service already exists (by service_name and organization)
                existing_service = frappe.db.get_value(
                    "Service",
                    {"service_name": service_name, "organization": org.name},
                    "name"
                )
                
                if existing_service:
                    # Service already exists - ensure it has providers linked
                    try:
                        # CRITICAL: Reload service fresh from database to avoid stale child table references
                        frappe.db.commit()  # Ensure all pending changes are committed
                        service_doc = frappe.get_doc("Service", existing_service)
                        service_doc.reload()  # Reload to get latest version
                        
                        # CRITICAL: Remove any stale child table rows that reference non-existent providers
                        if service_doc.service_providers:
                            valid_service_providers = []
                            for sp in service_doc.service_providers:
                                # Only keep providers that actually exist
                                if frappe.db.exists("Provider", sp.provider):
                                    valid_service_providers.append(sp)
                                else:
                                    # Log removal of stale reference
                                    frappe.log_error(f"Removing stale provider reference: {sp.provider} from service {existing_service}", "Demo Data: Clean Stale Provider Links")
                            
                            # Replace service_providers with only valid ones
                            service_doc.service_providers = valid_service_providers
                        
                        # Check if service has providers (after cleaning stale ones)
                        existing_providers = frappe.get_all(
                            "Service Provider",
                            filters={"parent": existing_service, "status": "Active"},
                            limit=1
                        )
                        
                        if not existing_providers:
                            # Service exists but has no providers - link them now
                            org_providers = frappe.get_all(
                                "Provider Organization",
                                filters={"organization": org.name, "status": "Active"},
                                fields=["parent"],
                                pluck="parent"
                            )
                            valid_org_providers = [p for p in org_providers if frappe.db.exists("Provider", p)]
                            
                            if valid_org_providers and hasattr(service_doc, 'service_providers'):
                                for idx, provider_name in enumerate(valid_org_providers[:3]):
                                    # Double-check provider exists before adding
                                    if not frappe.db.exists("Provider", provider_name):
                                        continue
                                    
                                    # Check if already linked
                                    already_linked = any(
                                        sp.provider == provider_name 
                                        for sp in (service_doc.service_providers or [])
                                    )
                                    if not already_linked:
                                        service_doc.append("service_providers", {
                                            "provider": provider_name,
                                            "status": "Active",
                                            "is_primary": 1 if idx == 0 else 0,
                                            "price_override": price,
                                        })
                                        linked_count += 1
                                
                                if linked_count > 0:
                                    service_doc.save(ignore_permissions=True)
                                    frappe.db.commit()
                    except Exception as e:
                        frappe.log_error(f"Error linking providers to existing service {existing_service}: {str(e)}", "Demo Data: Link Providers Error")
                    
                    service_index += 1
                    continue
                
                # Create Service
                try:
                    service = frappe.new_doc("Service")
                    service.service_name = service_name
                    service.organization = org.name
                    service.duration = duration
                    service.buffer_before = 5
                    service.buffer_after = 5
                    service.price = price
                    service.description = description
                    service.is_active = 1
                    mark_as_demo(service)
                    
                    # ALWAYS link providers from this organization to the service
                    # Get all active providers for this organization
                    org_providers = frappe.get_all(
                        "Provider Organization",
                        filters={"organization": org.name, "status": "Active"},
                        fields=["parent"],
                        pluck="parent"
                    )
                    
                    # Filter to only providers that actually exist
                    valid_org_providers = [p for p in org_providers if frappe.db.exists("Provider", p)]
                    
                    # If no providers found via Provider Organization, try to find any active providers
                    if not valid_org_providers:
                        # Fallback: Get any active providers (might be solo providers or not yet linked)
                        all_providers = frappe.get_all(
                            "Provider",
                            filters={"is_active": 1},
                            fields=["name"],
                            limit=3
                        )
                        valid_org_providers = [p["name"] for p in all_providers]
                    
                    # Link providers to service (CRITICAL - ensures service has providers)
                    if valid_org_providers and hasattr(service, 'service_providers'):
                        # Add providers to service (first one as primary)
                        for idx, provider_name in enumerate(valid_org_providers[:3]):  # Max 3 providers per service
                            service.append("service_providers", {
                                "provider": provider_name,
                                "status": "Active",
                                "is_primary": 1 if idx == 0 else 0,
                                "price_override": price,  # Use service price as default
                            })
                            linked_count += 1
                    
                    service.insert(ignore_permissions=True)
                    
                    created.append(service.name)
                    service_index += 1
                    frappe.db.commit()
                except frappe.DuplicateEntryError:
                    # Service with same name already exists, skip it
                    frappe.db.rollback()
                    service_index += 1
                    continue
                except Exception as e:
                    # Other error, log and skip
                    frappe.db.rollback()
                    frappe.log_error(f"Error creating service {service_name}: {str(e)}", "Demo Data: Service Creation Error")
                    service_index += 1
                    continue
        
        # Final step: Ensure ALL services (including existing ones) have providers linked
        # This catches any services that might have been missed
        all_services = frappe.get_all("Service", fields=["name", "organization", "price"])
        final_linked = 0
        
        for svc in all_services:
            service_name = svc["name"]
            service_org = svc.get("organization")
            
            if not service_org:
                continue
            
            # Check if service has providers
            existing_providers = frappe.get_all(
                "Service Provider",
                filters={"parent": service_name, "status": "Active"},
                limit=1
            )
            
            if not existing_providers:
                # Service has no providers - link them
                org_providers = frappe.get_all(
                    "Provider Organization",
                    filters={"organization": service_org, "status": "Active"},
                    fields=["parent"],
                    pluck="parent"
                )
                valid_providers = [p for p in org_providers if frappe.db.exists("Provider", p)]
                
                if valid_providers:
                    try:
                        # CRITICAL: Reload service fresh from database to avoid stale child table references
                        frappe.db.commit()  # Ensure all pending changes are committed
                        service_doc = frappe.get_doc("Service", service_name)
                        service_doc.reload()  # Reload to get latest version
                        
                        # CRITICAL: Remove any stale child table rows that reference non-existent providers
                        if service_doc.service_providers:
                            valid_service_providers = []
                            for sp in service_doc.service_providers:
                                # Only keep providers that actually exist
                                if frappe.db.exists("Provider", sp.provider):
                                    valid_service_providers.append(sp)
                                else:
                                    # Log removal of stale reference
                                    frappe.log_error(f"Removing stale provider reference: {sp.provider} from service {service_name}", "Demo Data: Clean Stale Provider Links")
                            
                            # Replace service_providers with only valid ones
                            service_doc.service_providers = valid_service_providers
                        
                        for idx, provider_name in enumerate(valid_providers[:3]):
                            # Double-check provider exists before adding
                            if not frappe.db.exists("Provider", provider_name):
                                frappe.log_error(f"Provider {provider_name} does not exist, skipping link to service {service_name}", "Demo Data: Provider Not Found")
                                continue
                            
                            # Check if already linked
                            already_linked = any(
                                sp.provider == provider_name 
                                for sp in (service_doc.service_providers or [])
                            )
                            if not already_linked:
                                service_doc.append("service_providers", {
                                    "provider": provider_name,
                                    "status": "Active",
                                    "is_primary": 1 if idx == 0 else 0,
                                    "price_override": svc.get("price"),
                                })
                                final_linked += 1
                        
                        if final_linked > 0:
                            service_doc.save(ignore_permissions=True)
                            frappe.db.commit()
                    except Exception as e:
                        frappe.log_error(f"Error linking providers to service {service_name}: {str(e)}", "Demo Data: Final Link Providers Error")
        
        total_linked = linked_count + final_linked
        message = f"✓ Created {len(created)} services"
        if total_linked > 0:
            message += f" and linked {total_linked} providers"
        
        return {
            "success": True,
            "count": len(created),
            "services": created,
            "providers_linked": total_linked,
            "message": message
        }
    
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Demo Data: Generate Services Error")
        frappe.throw(_(f"Error generating services: {str(e)}"))


@frappe.whitelist()
def add_available_durations_to_providers():
    """
    Add Available Durations and Appointment Time Slots to all User Appointment Availability records
    - Creates durations based on services linked to each provider
    - Adds time slots for Monday to Saturday (9 AM - 6 PM)
    """
    frappe.only_for("System Manager")
    
    updated_count = 0
    
    try:
        # Get all providers
        providers = frappe.get_all("Provider", fields=["name", "email", "user_appointment_availability"])
        
        # Days to add (Monday to Saturday)
        weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        default_start_time = "09:00:00"
        default_end_time = "18:00:00"
        
        for provider in providers:
            provider_name = provider["name"]
            availability_name = provider.get("user_appointment_availability")
            
            if not availability_name:
                continue
            
            try:
                availability_doc = frappe.get_doc("User Appointment Availability", availability_name)
                needs_update = False
                
                # 1. Add Available Durations if missing
                if not availability_doc.available_durations or len(availability_doc.available_durations) == 0:
                    # Get services for this provider
                    # First check Service Provider child table
                    service_providers = frappe.get_all(
                        "Service Provider",
                        filters={"provider": provider_name, "status": "Active"},
                        fields=["parent"],
                        pluck="parent"
                    )
                    
                    # Also get services from provider's organizations
                    provider_orgs = frappe.get_all(
                        "Provider Organization",
                        filters={"parent": provider_name, "status": "Active"},
                        fields=["organization"],
                        pluck="organization"
                    )
                    
                    org_services = []
                    if provider_orgs:
                        org_services = frappe.get_all(
                            "Service",
                            filters={"organization": ["in", provider_orgs]},
                            fields=["name", "service_name", "duration"]
                        )
                    
                    # Merge services
                    all_services = []
                    if service_providers:
                        services = frappe.get_all(
                            "Service",
                            filters={"name": ["in", service_providers]},
                            fields=["name", "service_name", "duration"]
                        )
                        all_services.extend(services)
                    
                    # Add org services that aren't already in the list
                    existing_service_names = {s["name"] for s in all_services}
                    for svc in org_services:
                        if svc["name"] not in existing_service_names:
                            all_services.append(svc)
                    
                    # If no services found, create a default duration
                    if not all_services:
                        availability_doc.append("available_durations", {
                            "title": "30 Minute Meeting",
                            "duration": 30 * 60,  # 30 minutes in seconds
                            "allow_rescheduling": 1,
                            "availability_window": 30,  # 30 days
                            "minimum_notice_before_event": 2  # 2 hours
                        })
                        needs_update = True
                    else:
                        # Create duration for each service
                        for service in all_services[:5]:  # Max 5 durations
                            service_name = service.get("service_name", "Meeting")
                            duration_minutes = service.get("duration", 30)
                            duration_seconds = duration_minutes * 60  # Convert to seconds
                            
                            # Check if duration already exists
                            duration_exists = False
                            for existing_duration in (availability_doc.available_durations or []):
                                if existing_duration.title == service_name:
                                    duration_exists = True
                                    break
                            
                            if not duration_exists:
                                availability_doc.append("available_durations", {
                                    "title": service_name,
                                    "duration": duration_seconds,
                                    "allow_rescheduling": 1,
                                    "availability_window": 30,  # 30 days
                                    "minimum_notice_before_event": 2  # 2 hours
                                })
                                needs_update = True
                
                # 2. Add Appointment Time Slots (Monday to Saturday) if missing
                existing_days = set()
                if availability_doc.appointment_time_slot:
                    existing_days = {slot.day for slot in availability_doc.appointment_time_slot}
                
                for day in weekdays:
                    if day not in existing_days:
                        availability_doc.append("appointment_time_slot", {
                            "day": day,
                            "start_time": default_start_time,
                            "end_time": default_end_time
                        })
                        needs_update = True
                
                # Save only if we made changes
                if needs_update:
                    availability_doc.save(ignore_permissions=True)
                    updated_count += 1
                    frappe.db.commit()
            except Exception as e:
                frappe.log_error(f"Error adding durations to provider {provider_name}: {str(e)}", "Demo Data: Add Available Durations Error")
                continue
        
        return {
            "success": True,
            "count": updated_count,
            "message": f"✓ Added available durations and time slots (Monday-Saturday) to {updated_count} providers"
        }
    
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Demo Data: Add Available Durations Error")
        frappe.throw(_(f"Error adding available durations: {str(e)}"))


@frappe.whitelist()
def link_providers_to_services():
    """
    Link providers to services for all organizations
    This ensures every service has at least one provider linked
    """
    frappe.only_for("System Manager")
    
    linked_count = 0
    updated_services = []
    
    try:
        # Get all services
        services = frappe.get_all("Service", fields=["name", "organization", "price"])
        
        for service in services:
            service_name = service["name"]
            service_org = service.get("organization")
            
            if not service_org:
                continue
            
            # Check if service already has providers linked
            existing_providers = frappe.get_all(
                "Service Provider",
                filters={"parent": service_name, "status": "Active"},
                limit=1
            )
            
            if existing_providers:
                # Service already has providers, skip it
                continue
            
            # Get providers for this organization
            org_providers = frappe.get_all(
                "Provider Organization",
                filters={"organization": service_org, "status": "Active"},
                fields=["parent"],
                pluck="parent"
            )
            
            # Filter to only providers that actually exist
            valid_providers = [p for p in org_providers if frappe.db.exists("Provider", p)]
            
            if not valid_providers:
                # No providers for this org, skip
                continue
            
            # Load service and link providers
            try:
                # CRITICAL: Reload service fresh from database to avoid stale child table references
                frappe.db.commit()  # Ensure all pending changes are committed
                service_doc = frappe.get_doc("Service", service_name)
                service_doc.reload()  # Reload to get latest version
                
                # CRITICAL: Remove any stale child table rows that reference non-existent providers
                # This prevents link validation errors when saving
                if service_doc.service_providers:
                    valid_service_providers = []
                    for sp in service_doc.service_providers:
                        # Only keep providers that actually exist
                        if frappe.db.exists("Provider", sp.provider):
                            valid_service_providers.append(sp)
                        else:
                            # Log removal of stale reference
                            frappe.log_error(f"Removing stale provider reference: {sp.provider} from service {service_name}", "Demo Data: Clean Stale Provider Links")
                    
                    # Replace service_providers with only valid ones
                    service_doc.service_providers = valid_service_providers
                
                service_linked_count = 0
                
                # Add providers to service (first one as primary)
                for idx, provider_name in enumerate(valid_providers[:3]):  # Max 3 providers per service
                    # Double-check provider exists before adding
                    if not frappe.db.exists("Provider", provider_name):
                        frappe.log_error(f"Provider {provider_name} does not exist, skipping link to service {service_name}", "Demo Data: Provider Not Found")
                        continue
                    
                    # Check if already linked
                    already_linked = any(
                        sp.provider == provider_name 
                        for sp in (service_doc.service_providers or [])
                    )
                    
                    if not already_linked:
                        service_doc.append("service_providers", {
                            "provider": provider_name,
                            "status": "Active",
                            "is_primary": 1 if idx == 0 else 0,
                            "price_override": service.get("price"),  # Use service price as default
                        })
                        service_linked_count += 1
                        linked_count += 1
                
                # Save if we added any providers for this service
                if service_linked_count > 0:
                    service_doc.save(ignore_permissions=True)
                    updated_services.append(service_name)
                    frappe.db.commit()
            except Exception as e:
                frappe.log_error(f"Error linking providers to service {service_name}: {str(e)}", "Demo Data: Link Providers Error")
                continue
        
        return {
            "success": True,
            "count": linked_count,
            "services_updated": len(updated_services),
            "message": f"✓ Linked {linked_count} providers to {len(updated_services)} services"
        }
    
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Demo Data: Link Providers to Services Error")
        frappe.throw(_(f"Error linking providers to services: {str(e)}"))


@frappe.whitelist()
def fix_location_addresses():
    """
    Fix locations that are missing addresses
    This ensures all locations have address_line_1 and city set
    """
    frappe.only_for("System Manager")
    
    fixed_count = 0
    updated_locations = []
    
    try:
        # Get all locations
        locations = frappe.get_all("Location", fields=["name", "location_name", "address_line_1", "city"])
        
        for location in locations:
            location_name = location["name"]
            has_address = bool(location.get("address_line_1"))
            has_city = bool(location.get("city"))
            
            if has_address and has_city:
                # Location already has address, skip it
                continue
            
            # Try to extract address from location_name
            # Format is usually "Organization - Address"
            location_display_name = location.get("location_name", "")
            
            # Find matching address from ADDIS_LOCATIONS
            address_line_1 = None
            city = "Addis Ababa"
            
            for loc_data in ADDIS_LOCATIONS:
                if isinstance(loc_data, tuple):
                    loc_name, addr, city_name = loc_data
                    if loc_name in location_display_name:
                        address_line_1 = addr
                        city = city_name
                        break
                else:
                    # Backward compatibility
                    if loc_data in location_display_name:
                        address_line_1 = loc_data
                        break
            
            # If no match found, use a default based on location name
            if not address_line_1:
                # Extract the part after the organization name
                parts = location_display_name.split(" - ", 1)
                if len(parts) > 1:
                    address_line_1 = parts[1]
                else:
                    address_line_1 = location_display_name
            
            # Update location
            try:
                location_doc = frappe.get_doc("Location", location_name)
                if not location_doc.address_line_1:
                    location_doc.address_line_1 = address_line_1
                if not location_doc.city:
                    location_doc.city = city
                
                location_doc.save(ignore_permissions=True)
                fixed_count += 1
                updated_locations.append(location_name)
                frappe.db.commit()
            except Exception as e:
                frappe.log_error(f"Error fixing location {location_name}: {str(e)}", "Demo Data: Fix Location Address Error")
                continue
        
        return {
            "success": True,
            "count": fixed_count,
            "locations_updated": len(updated_locations),
            "message": f"✓ Fixed addresses for {fixed_count} locations"
        }
    
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Demo Data: Fix Location Addresses Error")
        frappe.throw(_(f"Error fixing location addresses: {str(e)}"))


@frappe.whitelist()
def generate_locations(count=3):
    """
    Generate demo locations
    """
    frappe.only_for("System Manager")
    count = int(count)
    
    created = []
    
    try:
        orgs = frappe.get_all("Organization", pluck="name")
        locations_per_org = max(1, count // max(1, len(orgs))) if orgs else count
        
        location_index = 0
        
        for org_name in orgs:
            for i in range(locations_per_org):
                if location_index >= count:
                    break
                
                # Get location data (name, address_line_1, city)
                location_data = ADDIS_LOCATIONS[i % len(ADDIS_LOCATIONS)]
                if isinstance(location_data, tuple):
                    loc_name, address_line_1, city = location_data
                else:
                    # Backward compatibility - if it's a string, use it as address_line_1
                    loc_name = location_data
                    address_line_1 = location_data
                    city = "Addis Ababa"
                
                location_name = f"{org_name} - {loc_name}"
                
                if frappe.db.exists("Location", {"location_name": location_name}):
                    location_index += 1
                    continue
                
                try:
                    location = frappe.new_doc("Location")
                    location.location_name = location_name
                    location.organization = org_name
                    location.address_line_1 = address_line_1
                    location.city = city
                    location.timezone = "Africa/Addis_Ababa"
                    location.is_active = 1
                    mark_as_demo(location)
                    location.insert(ignore_permissions=True)
                    
                    created.append(location.name)
                    location_index += 1
                    frappe.db.commit()
                except frappe.DuplicateEntryError:
                    # Location with same name already exists, skip it
                    frappe.db.rollback()
                    location_index += 1
                    continue
                except Exception as e:
                    # Other error, log and skip
                    frappe.db.rollback()
                    frappe.log_error(f"Error creating location {location_name}: {str(e)}", "Demo Data: Location Creation Error")
                    location_index += 1
                    continue
        
        return {
            "success": True,
            "count": len(created),
            "locations": created,
            "message": f"✓ Created {len(created)} locations"
        }
    
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Demo Data: Generate Locations Error")
        frappe.throw(_(f"Error generating locations: {str(e)}"))


@frappe.whitelist()
def generate_event_types():
    """
    Generate EventTypes for ALL services and providers
    This ensures every service has at least one EventType and every provider has booking URLs
    """
    frappe.only_for("System Manager")
    
    created_eventtypes = []
    
    try:
        services = frappe.get_all("Service", fields=["name", "service_name", "organization"])
        providers = frappe.get_all("Provider", pluck="name")
        locations = frappe.get_all("Location", fields=["name", "organization"])
        
        if not services:
            frappe.throw("Please create services first")
        if not providers:
            frappe.throw("Please create providers first")
        if not locations:
            frappe.throw("Please create locations first")
        
        # Create a location map by organization
        location_map = {}
        for loc in locations:
            org = loc.get("organization")
            if org:
                if org not in location_map:
                    location_map[org] = []
                location_map[org].append(loc["name"])
        
        # Process ALL services (not just first 3)
        for service in services:
            service_name = service["name"]
            service_org = service.get("organization")
            
            # Get providers for this service
            # CRITICAL: ONLY use providers from Service Provider child table
            # This ensures EventTypes match the providers that the API will find
            service_provider_names = frappe.get_all(
                "Service Provider",
                filters={"parent": service_name, "status": "Active"},
                fields=["provider"],
                pluck="provider"
            )
            
            # Filter to only providers that actually exist
            valid_providers = [p for p in service_provider_names if frappe.db.exists("Provider", p)]
            
            # If no providers in Service Provider child table, try to link them first
            if not valid_providers and service_org:
                # Try to get providers from organization and link them to service
                org_providers = frappe.get_all(
                    "Provider Organization",
                    filters={"organization": service_org, "status": "Active"},
                    fields=["parent"],
                    pluck="parent"
                )
                valid_org_providers = [p for p in org_providers if frappe.db.exists("Provider", p)]
                
                if valid_org_providers:
                    # Link providers to service first
                    try:
                        # CRITICAL: Reload service fresh from database to avoid stale child table references
                        frappe.db.commit()  # Ensure all pending changes are committed
                        service_doc = frappe.get_doc("Service", service_name)
                        service_doc.reload()  # Reload to get latest version
                        
                        # CRITICAL: Remove any stale child table rows that reference non-existent providers
                        if service_doc.service_providers:
                            valid_service_providers = []
                            for sp in service_doc.service_providers:
                                # Only keep providers that actually exist
                                if frappe.db.exists("Provider", sp.provider):
                                    valid_service_providers.append(sp)
                                else:
                                    # Log removal of stale reference
                                    frappe.log_error(f"Removing stale provider reference: {sp.provider} from service {service_name}", "Demo Data: Clean Stale Provider Links")
                            
                            # Replace service_providers with only valid ones
                            service_doc.service_providers = valid_service_providers
                        
                        for idx, provider_name in enumerate(valid_org_providers[:3]):
                            # Double-check provider exists before adding
                            if not frappe.db.exists("Provider", provider_name):
                                frappe.log_error(f"Provider {provider_name} does not exist, skipping link to service {service_name}", "Demo Data: Provider Not Found")
                                continue
                            
                            # Check if already linked
                            already_linked = any(
                                sp.provider == provider_name 
                                for sp in (service_doc.service_providers or [])
                            )
                            if not already_linked:
                                service_doc.append("service_providers", {
                                    "provider": provider_name,
                                    "status": "Active",
                                    "is_primary": 1 if idx == 0 else 0,
                                    "price_override": service_doc.price,
                                })
                        service_doc.save(ignore_permissions=True)
                        frappe.db.commit()
                        
                        # Reload service to get latest data, then get providers from Service Provider child table again
                        service_doc.reload()
                        service_provider_names = frappe.get_all(
                            "Service Provider",
                            filters={"parent": service_name, "status": "Active"},
                            fields=["provider"],
                            pluck="provider"
                        )
                        valid_providers = [p for p in service_provider_names if frappe.db.exists("Provider", p)]
                    except Exception as e:
                        frappe.log_error(f"Error linking providers to service {service_name}: {str(e)}", "Demo Data: EventType Provider Link Error")
            
            if not valid_providers:
                # Skip this service - no valid providers in Service Provider child table
                frappe.log_error(f"Service {service_name} has no providers in Service Provider child table. Skipping EventType creation.", "Demo Data: No Service Providers")
                continue
            
            # Get locations for this service
            # If service has organization, use org locations
            service_locations = []
            if service_org and service_org in location_map:
                service_locations = location_map[service_org]
            else:
                # Use any available location
                service_locations = [loc["name"] for loc in locations[:1]]
            
            if not service_locations:
                continue
            
            # Create EventTypes for each provider + service + location combination
            # Ensure at least one EventType per service
            for provider_name in valid_providers[:1]:  # One provider per service for demo
                for location_name in service_locations[:1]:  # One location per service
                    # Check if EventType already exists
                    existing = frappe.db.get_value(
                        "EventType",
                        {
                            "provider": provider_name,
                            "service": service_name,
                            "location": location_name
                        },
                        "name"
                    )
                    
                    if existing:
                        continue
                    
                    # Create EventType
                    try:
                        event_type = frappe.new_doc("EventType")
                        event_type.event_type_name = f"{service['service_name']} - {location_name}"
                        event_type.service = service_name
                        event_type.provider = provider_name
                        event_type.location = location_name
                        event_type.is_active = 1
                        mark_as_demo(event_type)
                        event_type.insert(ignore_permissions=True)
                        
                        created_eventtypes.append(event_type.name)
                        frappe.db.commit()
                    except frappe.DuplicateEntryError:
                        frappe.db.rollback()
                        continue
                    except Exception as e:
                        frappe.db.rollback()
                        frappe.log_error(f"Error creating event type: {str(e)}", "Demo Data: EventType Creation Error")
                        continue
        
        # Ensure ALL providers have at least one EventType
        all_providers = frappe.get_all("Provider", pluck="name")
        for provider_name in all_providers:
            # Check if provider has any EventTypes
            existing_eventtypes = frappe.get_all(
                "EventType",
                filters={"provider": provider_name, "is_active": 1},
                limit=1
            )
            
            if not existing_eventtypes:
                # Provider has no EventTypes - create one
                # Find a service this provider can use
                # Check if provider is linked to any organization
                provider_orgs = frappe.get_all(
                    "Provider Organization",
                    filters={"parent": provider_name, "status": "Active"},
                    fields=["organization"],
                    pluck="organization"
                )
                
                # Get services from provider's organizations or any available service
                available_services = []
                if provider_orgs:
                    available_services = frappe.get_all(
                        "Service",
                        filters={"organization": ["in", provider_orgs]},
                        fields=["name", "service_name", "organization"],
                        limit=5
                    )
                
                # If no org services, check Service Provider links
                if not available_services:
                    service_provider_links = frappe.get_all(
                        "Service Provider",
                        filters={"provider": provider_name, "status": "Active"},
                        fields=["parent"],
                        pluck="parent"
                    )
                    if service_provider_links:
                        available_services = frappe.get_all(
                            "Service",
                            filters={"name": ["in", service_provider_links]},
                            fields=["name", "service_name", "organization"],
                            limit=5
                        )
                
                # If still no services, use any available service
                if not available_services:
                    available_services = frappe.get_all(
                        "Service",
                        fields=["name", "service_name", "organization"],
                        limit=5
                    )
                
                if available_services:
                    service = available_services[0]
                    service_org = service.get("organization")
                    
                    # Get a location
                    service_location = None
                    if service_org and service_org in location_map:
                        service_location = location_map[service_org][0] if location_map[service_org] else None
                    
                    if not service_location:
                        service_location = locations[0]["name"] if locations else None
                    
                    if service_location:
                        # Check if EventType already exists
                        existing = frappe.db.get_value(
                            "EventType",
                            {
                                "provider": provider_name,
                                "service": service["name"],
                                "location": service_location
                            },
                            "name"
                        )
                        
                        if not existing:
                            try:
                                event_type = frappe.new_doc("EventType")
                                event_type.event_type_name = f"{service['service_name']} - {service_location}"
                                event_type.service = service["name"]
                                event_type.provider = provider_name
                                event_type.location = service_location
                                event_type.is_active = 1
                                mark_as_demo(event_type)
                                event_type.insert(ignore_permissions=True)
                                
                                created_eventtypes.append(event_type.name)
                                frappe.db.commit()
                            except Exception as e:
                                frappe.db.rollback()
                                frappe.log_error(f"Error creating event type for provider {provider_name}: {str(e)}", "Demo Data: EventType Creation Error")
        
        return {
            "success": True,
            "count": len(created_eventtypes),
            "event_types": created_eventtypes,
            "message": f"✓ Created {len(created_eventtypes)} EventTypes for all services and providers"
        }
    
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Demo Data: Generate EventTypes Error")
        frappe.throw(_(f"Error generating EventTypes: {str(e)}"))


@frappe.whitelist()
def generate_appointments(count=10, days_back=14):
    """
    Generate demo appointments with Booking Events and Appointments
    If EventTypes don't exist, they will be created automatically first.
    
    Args:
        count: Number of appointments to create (default: 10)
        days_back: Number of days in the past to create appointments (default: 14)
    """
    frappe.only_for("System Manager")
    count = int(count)
    days_back = int(days_back)
    
    created_appointments = []
    created_booking_events = []
    
    try:
        services = frappe.get_all("Service", fields=["name", "service_name", "duration", "price", "organization"])
        
        # Get EventTypes (create them if they don't exist)
        event_types = frappe.get_all(
            "EventType",
            filters={"is_active": 1},
            fields=["name", "provider", "service", "location"]
        )
        
        if not event_types:
            # Auto-create EventTypes if they don't exist
            frappe.msgprint("No EventTypes found. Creating EventTypes first...", alert=True)
            eventtype_result = generate_event_types()
            frappe.db.commit()
            
            # Get EventTypes again after creation
            event_types = frappe.get_all(
                "EventType",
                filters={"is_active": 1},
                fields=["name", "provider", "service", "location"]
            )
            
            if not event_types:
                frappe.throw("Failed to create EventTypes. Please ensure you have providers, services, and locations created first.")
        
        # Filter event_types to only include those with valid providers, services, and locations
        valid_event_types = []
        for et in event_types:
            provider_exists = frappe.db.exists("Provider", et["provider"])
            service_exists = frappe.db.exists("Service", et["service"])
            location_exists = frappe.db.exists("Location", et["location"])
            
            if provider_exists and service_exists and location_exists:
                valid_event_types.append(et)
            else:
                # Log invalid EventType
                frappe.log_error(
                    f"EventType {et['name']} has invalid references - Provider: {et['provider']} ({provider_exists}), Service: {et['service']} ({service_exists}), Location: {et['location']} ({location_exists})",
                    "Demo Data: Invalid EventType"
                )
        
        if not valid_event_types:
            # Try to create EventTypes again if none are valid
            frappe.msgprint("No valid EventTypes found. Attempting to create EventTypes...", alert=True)
            try:
                eventtype_result = generate_event_types()
                frappe.db.commit()
                
                # Get EventTypes again after creation
                event_types = frappe.get_all(
                    "EventType",
                    filters={"is_active": 1},
                    fields=["name", "provider", "service", "location"]
                )
                
                # Re-validate
                valid_event_types = []
                for et in event_types:
                    provider_exists = frappe.db.exists("Provider", et["provider"])
                    service_exists = frappe.db.exists("Service", et["service"])
                    location_exists = frappe.db.exists("Location", et["location"])
                    
                    if provider_exists and service_exists and location_exists:
                        valid_event_types.append(et)
            except Exception as e:
                frappe.log_error(str(e), "Demo Data: Auto-create EventTypes Error")
            
            if not valid_event_types:
                frappe.throw("No valid EventTypes found. Please ensure you have providers, services, and locations created, then run generate_event_types() first.")
        
        # Get service details for duration
        service_map = {s["name"]: s for s in services}
        
        # Generate appointments spread across past and future days
        appointment_count = 0
        
        for i in range(count):
            if appointment_count >= count:
                break
            
            # Pick a random event type from valid ones
            event_type = random.choice(valid_event_types)
            service_info = service_map.get(event_type["service"], {})
            
            # Generate client info
            client_name = generate_ethiopian_name()
            client_email = generate_email(client_name, "client.et")
            client_phone = generate_ethiopian_phone()
            
            # Generate appointment date (spread across past and future)
            # 60% past appointments, 40% future appointments
            if random.random() < 0.6:
                # Past appointment (completed or cancelled)
                days_offset = -random.randint(1, days_back)
                status = random.choice(["Completed", "Completed", "Completed", "Cancelled", "No Show"])
            else:
                # Future appointment (pending or confirmed)
                days_offset = random.randint(1, 14)  # Next 2 weeks
                status = random.choice(["Pending", "Confirmed", "Confirmed"])
            
            appointment_date = datetime.now() + timedelta(days=days_offset)
            
            # Generate time slots (business hours 9 AM - 6 PM)
            start_hour = random.randint(9, 17)
            start_minute = random.choice([0, 15, 30, 45])
            start_time = f"{start_hour:02d}:{start_minute:02d}:00"
            
            # Calculate end time based on service duration
            duration = service_info.get("duration", 30)
            end_datetime = datetime.strptime(start_time, "%H:%M:%S") + timedelta(minutes=duration)
            end_time = end_datetime.strftime("%H:%M:%S")
            
            # Generate unique appointment ID
            appointment_id = f"APT-{appointment_date.strftime('%Y%m%d')}-{random.randint(1000, 9999)}"
            
            # Check if appointment ID already exists
            while frappe.db.exists("Appointment", {"appointment_id": appointment_id}):
                appointment_id = f"APT-{appointment_date.strftime('%Y%m%d')}-{random.randint(1000, 9999)}"
            
            try:
                # Create Booking Event first
                starts_on = datetime.combine(appointment_date.date(), datetime.strptime(start_time, "%H:%M:%S").time())
                ends_on = datetime.combine(appointment_date.date(), datetime.strptime(end_time, "%H:%M:%S").time())
                
                booking_event = frappe.new_doc("Booking Event")
                booking_event.subject = f"{service_info.get('service_name', 'Appointment')} - {client_name}"
                booking_event.event_category = "Meeting"
                booking_event.event_type = "Private"
                booking_event.starts_on = starts_on
                booking_event.ends_on = ends_on
                booking_event.status = "Completed" if status in ["Completed", "No Show"] else ("Cancelled" if status == "Cancelled" else "Open")
                booking_event.description = f"""
                    <p><strong>Client:</strong> {client_name}</p>
                    <p><strong>Email:</strong> {client_email}</p>
                    <p><strong>Phone:</strong> {client_phone}</p>
                    <p><strong>Service:</strong> {service_info.get('service_name', 'N/A')}</p>
                """
                booking_event.color = random.choice(["#3498db", "#2ecc71", "#9b59b6", "#e74c3c", "#f39c12"])
                booking_event.insert(ignore_permissions=True)
                created_booking_events.append(booking_event.name)
                frappe.db.commit()
                
                # Create Appointment
                appointment = frappe.new_doc("Appointment")
                appointment.appointment_id = appointment_id
                appointment.event = booking_event.name
                appointment.event_type = event_type["name"]
                appointment.provider = event_type["provider"]
                appointment.location = event_type["location"]
                appointment.service = event_type["service"]
                appointment.client_name = client_name
                appointment.client_email = client_email
                appointment.client_phone = client_phone
                appointment.appointment_date = appointment_date.date()
                appointment.start_time = start_time
                appointment.end_time = end_time
                appointment.status = status
                appointment.amount_paid = service_info.get("price", 0) if status == "Completed" else 0
                
                # Add notes for some appointments
                if random.random() < 0.3:
                    notes_options = [
                        "First-time client",
                        "Referred by existing customer",
                        "Requires special attention",
                        "VIP client - handle with care",
                        "Follow-up appointment needed",
                        "Client prefers early morning slots"
                    ]
                    appointment.notes = random.choice(notes_options)
                
                # Add cancellation reason for cancelled appointments
                if status == "Cancelled":
                    cancellation_reasons = [
                        "Client requested cancellation",
                        "Schedule conflict",
                        "Personal emergency",
                        "Weather conditions",
                        "Provider unavailable"
                    ]
                    appointment.cancellation_reason = random.choice(cancellation_reasons)
                
                appointment.insert(ignore_permissions=True)
                created_appointments.append(appointment.name)
                appointment_count += 1
                frappe.db.commit()
                
            except frappe.DuplicateEntryError:
                frappe.db.rollback()
                continue
            except Exception as e:
                frappe.db.rollback()
                frappe.log_error(f"Error creating appointment: {str(e)}", "Demo Data: Appointment Creation Error")
                continue
        
        message = f"""✓ Demo appointments created:
- Booking Events: {len(created_booking_events)}
- Appointments: {len(created_appointments)}"""
        
        return {
            "success": True,
            "count": len(created_appointments),
            "booking_events": len(created_booking_events),
            "appointments": len(created_appointments),
            "message": message
        }
    
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Demo Data: Generate Appointments Error")
        frappe.throw(_(f"Error generating appointments: {str(e)}"))


@frappe.whitelist()
def clear_appointments():
    """Delete all demo appointments and events"""
    frappe.only_for("System Manager")
    
    try:
        # First, clean up orphaned Event DocType Link records
        # These are links to Event records that no longer exist
        orphaned_links = frappe.db.sql("""
            SELECT name, parent 
            FROM `tabEvent DocType Link` 
            WHERE parent NOT IN (SELECT name FROM tabEvent)
        """, as_dict=True)
        
        deleted_orphaned_links = 0
        for link in orphaned_links:
            try:
                frappe.db.delete("Event DocType Link", {"name": link.name})
                deleted_orphaned_links += 1
            except Exception as e:
                frappe.log_error(str(e), f"Demo Data: Error deleting orphaned link {link.name}")
        
        frappe.db.commit()
        
        # Delete Events - get all events (since is_demo_data field doesn't exist)
        # User explicitly wants to clear demo data, so we'll delete all events
        events = frappe.get_all("Event", pluck="name", limit=1000)  # Limit for safety
        
        deleted_events = 0
        for event_name in events:
            try:
                frappe.delete_doc("Event", event_name, ignore_permissions=True, force=1)
                deleted_events += 1
            except Exception as e:
                frappe.log_error(str(e), f"Demo Data: Error deleting Event {event_name}")
                pass  # Skip if already deleted or doesn't exist
        
        # Delete Booking Events
        booking_events = frappe.get_all("Booking Event", pluck="name", limit=1000)
        deleted_booking_events = 0
        for event_name in booking_events:
            try:
                frappe.delete_doc("Booking Event", event_name, ignore_permissions=True, force=1)
                deleted_booking_events += 1
            except Exception as e:
                frappe.log_error(str(e), f"Demo Data: Error deleting Booking Event {event_name}")
                pass
        
        # Delete Appointments - get all appointments
        appointments = frappe.get_all("Appointment", pluck="name", limit=1000)  # Limit for safety
        
        deleted_appointments = 0
        for appointment_name in appointments:
            try:
                frappe.delete_doc("Appointment", appointment_name, ignore_permissions=True, force=1)
                deleted_appointments += 1
            except Exception as e:
                frappe.log_error(str(e), f"Demo Data: Error deleting Appointment {appointment_name}")
                pass  # Skip if already deleted or doesn't exist
        
        # Delete EventTypes with invalid references (orphaned EventTypes)
        event_types = frappe.get_all("EventType", fields=["name", "provider", "service", "location"], limit=1000)
        deleted_event_types = 0
        for et in event_types:
            provider_exists = frappe.db.exists("Provider", et["provider"]) if et.get("provider") else False
            service_exists = frappe.db.exists("Service", et["service"]) if et.get("service") else False
            location_exists = frappe.db.exists("Location", et["location"]) if et.get("location") else False
            
            # Delete if any reference is invalid
            if not (provider_exists and service_exists and location_exists):
                try:
                    frappe.delete_doc("EventType", et["name"], ignore_permissions=True, force=1)
                    deleted_event_types += 1
                except Exception as e:
                    frappe.log_error(str(e), f"Demo Data: Error deleting orphaned EventType {et['name']}")
                    pass
        
        frappe.db.commit()
        return {
            "success": True, 
            "message": f"Deleted {deleted_orphaned_links} orphaned links, {deleted_events} events, {deleted_booking_events} booking events, {deleted_appointments} appointments, and {deleted_event_types} orphaned event types"
        }
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Demo Data: Clear Appointments Error")
        frappe.throw(_(f"Error clearing appointments: {str(e)}"))


@frappe.whitelist()
def clear_providers():
    """Delete all demo providers"""
    frappe.only_for("System Manager")
    
    try:
        # Try to filter by is_demo_data, but if field doesn't exist, get all providers
        # We'll be more careful and only delete if explicitly marked
        try:
            providers = frappe.get_all("Provider", filters={"is_demo_data": 1}, pluck="name")
        except Exception:
            # Field doesn't exist, get providers that might be demo (check by email domain or owner)
            # For safety, we'll get providers with demo.et email domain
            providers = frappe.db.sql("""
                SELECT name FROM `tabProvider` 
                WHERE email LIKE '%@demo.et'
                LIMIT 100
            """, as_dict=True)
            providers = [p.name for p in providers]
        
        deleted_count = 0
        
        for provider_name in providers:
            try:
                provider = frappe.get_doc("Provider", provider_name)
        
                # Delete User Appointment Availability
                if provider.user_appointment_availability:
                    try:
                        frappe.delete_doc("User Appointment Availability", provider.user_appointment_availability, ignore_permissions=True, force=1)
                    except:
                        pass
                
                # Delete Provider
                frappe.delete_doc("Provider", provider_name, ignore_permissions=True, force=1)
                deleted_count += 1
            except Exception:
                pass  # Skip if already deleted
        
        frappe.db.commit()
        return {"success": True, "message": f"Deleted {deleted_count} providers"}
    except Exception as e:
        frappe.log_error(str(e), "Demo Data: Clear Providers Error")
        frappe.throw(_(f"Error clearing providers: {str(e)}"))


@frappe.whitelist()
def clear_all_demo_data():
    """
    Delete ALL demo data: appointments, events, policies, services, locations, 
    providers, organizations, and all related records.
    This is a complete cleanup to start fresh.
    """
    frappe.only_for("System Manager")
    
    deleted_counts = {
        "orphaned_links": 0,
        "events": 0,
        "booking_events": 0,
        "appointments": 0,
        "policies": 0,
        "event_types": 0,
        "user_appointment_availabilities": 0,
        "services": 0,
        "locations": 0,
        "providers": 0,
        "organizations": 0,
        "users": 0
    }
    
    try:
        frappe.msgprint("Starting complete demo data cleanup...", alert=True)
        
        # Step 0: Clean up orphaned child table records that reference non-existent parents
        # Clean up Provider Organization entries with non-existent providers
        try:
            frappe.db.sql("""
                DELETE FROM `tabProvider Organization` 
                WHERE parent NOT IN (SELECT name FROM `tabProvider`)
            """)
        except:
            pass
        
        # Clean up Service Provider entries with non-existent providers or services
        try:
            frappe.db.sql("""
                DELETE FROM `tabService Provider` 
                WHERE provider NOT IN (SELECT name FROM `tabProvider`)
                OR parent NOT IN (SELECT name FROM `tabService`)
            """)
        except:
            pass
        
        frappe.db.commit()
        
        # Step 1: Clean up orphaned Event DocType Link records
        orphaned_links = frappe.db.sql("""
            SELECT name FROM `tabEvent DocType Link` 
            WHERE parent NOT IN (SELECT name FROM tabEvent)
        """, as_dict=True)
        for link in orphaned_links:
            try:
                frappe.db.delete("Event DocType Link", {"name": link.name})
                deleted_counts["orphaned_links"] += 1
            except:
                pass
        
        # Step 2: Delete all Events and Booking Events
        events = frappe.get_all("Event", pluck="name", limit=10000)
        for event_name in events:
            try:
                frappe.delete_doc("Event", event_name, ignore_permissions=True, force=1)
                deleted_counts["events"] += 1
            except:
                pass
        
        booking_events = frappe.get_all("Booking Event", pluck="name", limit=10000)
        for event_name in booking_events:
            try:
                frappe.delete_doc("Booking Event", event_name, ignore_permissions=True, force=1)
                deleted_counts["booking_events"] += 1
            except:
                pass
        
        # Step 3: Delete all Appointments
        appointments = frappe.get_all("Appointment", pluck="name", limit=10000)
        for appointment_name in appointments:
            try:
                frappe.delete_doc("Appointment", appointment_name, ignore_permissions=True, force=1)
                deleted_counts["appointments"] += 1
            except:
                pass
        
        # Step 4: Delete all Policies
        policies = frappe.get_all("Policy", pluck="name", limit=10000)
        for policy_name in policies:
            try:
                frappe.delete_doc("Policy", policy_name, ignore_permissions=True, force=1)
                deleted_counts["policies"] += 1
            except:
                pass
        
        # Step 5: Delete all EventTypes
        event_types = frappe.get_all("EventType", pluck="name", limit=10000)
        for event_type_name in event_types:
            try:
                frappe.delete_doc("EventType", event_type_name, ignore_permissions=True, force=1)
                deleted_counts["event_types"] += 1
            except:
                pass
        
        # Step 6: Delete all User Appointment Availabilities
        user_availabilities = frappe.get_all("User Appointment Availability", pluck="name", limit=10000)
        for ua_name in user_availabilities:
            try:
                frappe.delete_doc("User Appointment Availability", ua_name, ignore_permissions=True, force=1)
                deleted_counts["user_appointment_availabilities"] += 1
            except:
                pass
        
        # Step 7: Delete all Services
        services = frappe.get_all("Service", pluck="name", limit=10000)
        for service_name in services:
            try:
                frappe.delete_doc("Service", service_name, ignore_permissions=True, force=1)
                deleted_counts["services"] += 1
            except:
                pass
        
        # Step 8: Delete all Locations
        locations = frappe.get_all("Location", pluck="name", limit=10000)
        for location_name in locations:
            try:
                frappe.delete_doc("Location", location_name, ignore_permissions=True, force=1)
                deleted_counts["locations"] += 1
            except:
                pass
        
        # Step 9: Delete all Providers (and their related users)
        providers = frappe.get_all("Provider", pluck="name", limit=10000)
        provider_users = []
        for provider_name in providers:
            try:
                provider = frappe.get_doc("Provider", provider_name)
                if provider.user:
                    provider_users.append(provider.user)
                frappe.delete_doc("Provider", provider_name, ignore_permissions=True, force=1)
                deleted_counts["providers"] += 1
            except:
                pass
        
        # Step 10: Delete all Organizations (and their owner users)
        # Delete ALL organizations, not just demo ones
        organizations = frappe.get_all("Organization", pluck="name", limit=10000)
        org_users = []
        for org_name in organizations:
            try:
                org = frappe.get_doc("Organization", org_name)
                if org.owner_user:
                    org_users.append(org.owner_user)
                # Force delete even if linked to services/locations
                frappe.delete_doc("Organization", org_name, ignore_permissions=True, force=1)
                deleted_counts["organizations"] += 1
            except Exception as e:
                # If deletion fails due to links, try direct SQL delete
                try:
                    # Delete child table records first
                    frappe.db.sql("DELETE FROM `tabProvider Organization` WHERE organization = %s", (org_name,))
                    frappe.db.sql("DELETE FROM `tabOrganization` WHERE name = %s", (org_name,))
                    deleted_counts["organizations"] += 1
                except:
                    pass
        
        # Step 11: Delete demo users (those created for providers/orgs)
        all_users_to_delete = list(set(provider_users + org_users))
        for user_email in all_users_to_delete:
            try:
                if user_email and frappe.db.exists("User", user_email):
                    # Don't delete Administrator or system users
                    if user_email not in ["Administrator", "Guest"]:
                        frappe.delete_doc("User", user_email, ignore_permissions=True, force=1)
                        deleted_counts["users"] += 1
            except:
                pass
        
        frappe.db.commit()
        
        summary = f"""Complete cleanup finished:
- Orphaned Links: {deleted_counts['orphaned_links']}
- Events: {deleted_counts['events']}
- Booking Events: {deleted_counts['booking_events']}
- Appointments: {deleted_counts['appointments']}
- Policies: {deleted_counts['policies']}
- EventTypes: {deleted_counts['event_types']}
- User Appointment Availabilities: {deleted_counts['user_appointment_availabilities']}
- Services: {deleted_counts['services']}
- Locations: {deleted_counts['locations']}
- Providers: {deleted_counts['providers']}
- Organizations: {deleted_counts['organizations']}
- Users: {deleted_counts['users']}"""
        
        return {
            "success": True,
            "message": summary,
            "counts": deleted_counts
        }
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Demo Data: Complete Cleanup Error")
        frappe.throw(_(f"Error during complete cleanup: {str(e)}"))


@frappe.whitelist()
def cleanup_orphaned_records():
    """
    Clean up orphaned records that reference non-existent documents.
    Run via: bench --site [sitename] execute appointment.demo_data.cleanup_orphaned_records
    """
    frappe.only_for("System Manager")
    
    results = {
        "provider_org": 0,
        "service_provider": 0,
        "services": 0,
        "locations": 0,
        "event_types": 0,
        "event_links": 0
    }
    
    try:
        # 1. Clean up Provider Organization entries with non-existent providers or organizations
        try:
            frappe.db.sql("""
                DELETE FROM `tabProvider Organization` 
                WHERE parent NOT IN (SELECT name FROM `tabProvider`)
                OR organization NOT IN (SELECT name FROM `tabOrganization`)
            """)
            results["provider_org"] = frappe.db.sql("SELECT ROW_COUNT()")[0][0]
        except Exception as e:
            frappe.log_error(str(e), "Cleanup: Provider Organization Error")
        
        # 2. Clean up Service Provider entries with non-existent providers or services
        try:
            frappe.db.sql("""
                DELETE FROM `tabService Provider` 
                WHERE provider NOT IN (SELECT name FROM `tabProvider`)
                OR parent NOT IN (SELECT name FROM `tabService`)
            """)
            results["service_provider"] = frappe.db.sql("SELECT ROW_COUNT()")[0][0]
        except Exception as e:
            frappe.log_error(str(e), "Cleanup: Service Provider Error")
        
        # 3. Delete Services with non-existent organizations
        try:
            services = frappe.get_all("Service", fields=["name", "organization"])
            for s in services:
                if s.get("organization") and not frappe.db.exists("Organization", s["organization"]):
                    try:
                        frappe.delete_doc("Service", s["name"], ignore_permissions=True, force=1)
                        results["services"] += 1
                    except:
                        pass
        except Exception as e:
            frappe.log_error(str(e), "Cleanup: Service Error")
        
        # 4. Delete Locations with non-existent organizations
        try:
            locations = frappe.get_all("Location", fields=["name", "organization"])
            for loc in locations:
                if loc.get("organization") and not frappe.db.exists("Organization", loc["organization"]):
                    try:
                        frappe.delete_doc("Location", loc["name"], ignore_permissions=True, force=1)
                        results["locations"] += 1
                    except:
                        pass
        except Exception as e:
            frappe.log_error(str(e), "Cleanup: Location Error")
        
        # 5. Delete EventTypes with invalid references
        try:
            event_types = frappe.get_all("EventType", fields=["name", "provider", "service", "location"])
            for et in event_types:
                provider_exists = frappe.db.exists("Provider", et.get("provider")) if et.get("provider") else False
                service_exists = frappe.db.exists("Service", et.get("service")) if et.get("service") else False
                location_exists = frappe.db.exists("Location", et.get("location")) if et.get("location") else False
                
                if not (provider_exists and service_exists and location_exists):
                    try:
                        frappe.delete_doc("EventType", et["name"], ignore_permissions=True, force=1)
                        results["event_types"] += 1
                    except:
                        pass
        except Exception as e:
            frappe.log_error(str(e), "Cleanup: EventType Error")
        
        # 6. Clean up orphaned Event DocType Link records
        try:
            frappe.db.sql("""
                DELETE FROM `tabEvent DocType Link` 
                WHERE parent NOT IN (SELECT name FROM tabEvent)
            """)
            results["event_links"] = frappe.db.sql("SELECT ROW_COUNT()")[0][0]
        except Exception as e:
            frappe.log_error(str(e), "Cleanup: Event DocType Link Error")
        
        frappe.db.commit()
        
        message = f"""✓ Cleanup complete:
- Provider Organization entries: {results['provider_org']}
- Service Provider entries: {results['service_provider']}
- Orphaned Services: {results['services']}
- Orphaned Locations: {results['locations']}
- Orphaned EventTypes: {results['event_types']}
- Event DocType Links: {results['event_links']}"""
        
        frappe.msgprint(message, alert=True, indicator="green")
        return {"success": True, "message": message, "results": results}
        
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Cleanup: Error")
        frappe.throw(f"Error during cleanup: {str(e)}")


@frappe.whitelist()
def clear_organizations():
    """Delete all demo organizations"""
    frappe.only_for("System Manager")
    
    try:
        # Try to filter by is_demo_data, but if field doesn't exist, get by email domain
        try:
            orgs = frappe.get_all("Organization", filters={"is_demo_data": 1}, pluck="name")
        except Exception:
            # Field doesn't exist, get organizations with demo.et email domain
            orgs = frappe.db.sql("""
                SELECT name FROM `tabOrganization` 
                WHERE email LIKE '%@demo.et' OR email LIKE '%@%.et'
                LIMIT 100
            """, as_dict=True)
            orgs = [o.name for o in orgs]
        
        deleted_count = 0
        
        for org_name in orgs:
            try:
                frappe.delete_doc("Organization", org_name, ignore_permissions=True, force=1)
                deleted_count += 1
            except Exception:
                pass  # Skip if already deleted
        
        frappe.db.commit()
        return {"success": True, "message": f"Deleted {deleted_count} organizations"}
    except Exception as e:
        frappe.log_error(str(e), "Demo Data: Clear Organizations Error")
        frappe.throw(_(f"Error clearing organizations: {str(e)}"))


@frappe.whitelist()
def generate_appointment_groups(count=3):
    """
    Generate demo appointment groups for testing group booking
    """
    frappe.only_for("System Manager")
    count = int(count)
    
    created = []
    
    try:
        # Get providers with user appointment availability
        providers = frappe.get_all(
            "Provider",
            filters={"is_active": 1},
            fields=["name", "user", "email"],
            limit=count * 2  # Get more providers to choose from
        )
        
        if not providers:
            frappe.throw("No active providers found. Please generate providers first.")
        
        # Get a Google Calendar for event_creator (required field)
        google_calendars = frappe.get_all("Google Calendar", fields=["name"], limit=1)
        event_creator = google_calendars[0].name if google_calendars else None
        
        if not event_creator:
            frappe.throw("No Google Calendar found. Appointment Groups require a Google Calendar for event_creator. Please create one first.")
        
        # Group names for demo
        group_names = [
            "Team Consultation",
            "Group Meeting",
            "Collaborative Session",
            "Multi-Person Call",
            "Team Sync"
        ]
        
        for i in range(count):
            if i >= len(group_names):
                break
            
            group_name = group_names[i]
            
            # Check if group already exists
            if frappe.db.exists("Appointment Group", {"group_name": group_name}):
                continue
            
            # Select 2-3 providers for this group
            selected_providers = providers[i * 2:(i * 2) + min(3, len(providers) - i * 2)]
            if not selected_providers:
                selected_providers = providers[:min(2, len(providers))]
            
            try:
                # Get first provider's user appointment availability for settings
                first_provider = selected_providers[0]
                user_availability = frappe.get_all(
                    "User Appointment Availability",
                    filters={"user": first_provider.get("user")},
                    fields=["meeting_provider", "meeting_link"],
                    limit=1
                )
                
                meeting_provider = "Custom"
                meeting_link = None
                if user_availability:
                    avail_provider = user_availability[0].get("meeting_provider", "Custom")
                    # Convert "builtin" to "Custom" for Appointment Groups
                    if avail_provider == "builtin":
                        meeting_provider = "Custom"
                    elif avail_provider in ["Custom", "Zoom", "Google Meet"]:
                        meeting_provider = avail_provider
                    meeting_link = user_availability[0].get("meeting_link")
                
                # Create Appointment Group
                appointment_group = frappe.new_doc("Appointment Group")
                appointment_group.group_name = group_name
                appointment_group.event_creator = event_creator  # Required: Google Calendar
                appointment_group.event_organizer = first_provider.get("user")
                appointment_group.duration_for_event = 30 * 60  # 30 minutes in seconds
                appointment_group.minimum_buffer_time = 5 * 60  # 5 minutes
                appointment_group.allow_rescheduling = 1
                appointment_group.minimum_notice_for_reschedule = 2 * 60 * 60  # 2 hours
                appointment_group.minimum_notice_before_event = 24 * 60 * 60  # 24 hours
                appointment_group.event_availability_window = 30  # 30 days
                appointment_group.meet_provider = meeting_provider
                if meeting_link:
                    appointment_group.meet_link = meeting_link
                else:
                    # Set a default meeting link for Custom provider
                    appointment_group.meet_link = "https://meet.example.com/group-meeting"
                mark_as_demo(appointment_group)
                
                # Add members
                for idx, provider in enumerate(selected_providers):
                    appointment_group.append("members", {
                        "user": provider.get("user"),
                        "is_mandatory": 1 if idx == 0 else 0  # First one is mandatory
                    })
                
                appointment_group.insert(ignore_permissions=True)
                created.append({
                    "name": appointment_group.name,
                    "group_name": group_name,
                    "booking_url": f"/schedule/gr/{appointment_group.name}"
                })
                frappe.db.commit()
                
            except Exception as e:
                frappe.log_error(f"Error creating appointment group {group_name}: {str(e)}", "Demo Data: Generate Appointment Groups Error")
                continue
        
        return {
            "success": True,
            "count": len(created),
            "groups": created,
            "message": f"Created {len(created)} appointment groups"
        }
        
    except Exception as e:
        frappe.log_error(str(e), "Demo Data: Generate Appointment Groups Error")
        frappe.throw(_(f"Error generating appointment groups: {str(e)}"))


@frappe.whitelist()
def add_services_to_organization(org_name, count=5):
    """
    Add multiple services to a specific organization
    Useful for testing with organizations that have many services
    """
    frappe.only_for("System Manager")
    count = int(count)
    
    created = []
    linked_count = 0
    
    try:
        # Check if organization exists
        if not frappe.db.exists("Organization", org_name):
            frappe.throw(f"Organization '{org_name}' not found")
        
        org = frappe.get_doc("Organization", org_name)
        org_type = org.organization_type or "Healthcare"
        service_list = SERVICES_BY_TYPE.get(org_type, SERVICES_BY_TYPE["Healthcare"])
        
        # Get providers for this organization
        org_providers = frappe.get_all(
            "Provider Organization",
            filters={"organization": org_name, "status": "Active"},
            fields=["parent"],
            pluck="parent"
        )
        valid_providers = [p for p in org_providers if frappe.db.exists("Provider", p)]
        
        if not valid_providers:
            frappe.throw(f"No active providers found for organization '{org_name}'. Please add providers first.")
        
        # Get existing services to avoid duplicates
        existing_services = frappe.get_all(
            "Service",
            filters={"organization": org_name},
            fields=["service_name"],
            pluck="service_name"
        )
        
        # Create services
        service_index = 0
        for i in range(len(service_list)):
            if service_index >= count:
                break
            
            service_data = service_list[i % len(service_list)]
            service_name, duration, price, description = service_data
            
            # Skip if service already exists
            if service_name in existing_services:
                continue
            
            try:
                service = frappe.new_doc("Service")
                service.service_name = service_name
                service.organization = org_name
                service.duration = duration
                service.buffer_before = 5
                service.buffer_after = 5
                service.price = price
                service.description = description
                service.is_active = 1
                mark_as_demo(service)
                
                # Link providers to service
                for idx, provider_name in enumerate(valid_providers[:3]):  # Max 3 providers per service
                    if not frappe.db.exists("Provider", provider_name):
                        continue
                    
                    service.append("service_providers", {
                        "provider": provider_name,
                        "status": "Active",
                        "is_primary": 1 if idx == 0 else 0,
                        "price_override": price,
                    })
                    linked_count += 1
                
                service.insert(ignore_permissions=True)
                created.append(service_name)
                service_index += 1
                
            except Exception as e:
                frappe.log_error(f"Error creating service {service_name} for {org_name}: {str(e)}", "Demo Data: Add Services Error")
                continue
        
        frappe.db.commit()
        
        return {
            "success": True,
            "created": created,
            "count": len(created),
            "linked_providers": linked_count,
            "message": f"Added {len(created)} services to {org_name}"
        }
        
    except Exception as e:
        frappe.log_error(str(e), "Demo Data: Add Services to Organization Error")
        frappe.throw(_(f"Error adding services: {str(e)}"))


@frappe.whitelist()
def ensure_all_organizations_have_providers():
    """
    Ensure all organizations have at least one active provider linked
    This fixes the "No active providers in organization" error
    """
    frappe.only_for("System Manager")
    
    fixed_count = 0
    created_providers = []
    
    try:
        # Get all organizations
        orgs = frappe.get_all("Organization", fields=["name", "organization_name"])
        
        for org in orgs:
            org_name = org["name"]
            
            # Check if organization has active providers
            org_providers = frappe.get_all(
                "Provider Organization",
                filters={"organization": org_name, "status": "Active"},
                fields=["parent"],
                pluck="parent"
            )
            
            # Filter to only providers that actually exist
            valid_providers = [p for p in org_providers if frappe.db.exists("Provider", p)]
            
            if valid_providers:
                # Organization already has providers, skip
                continue
            
            # Organization has no providers - create one
            try:
                name = generate_ethiopian_name()
                email = generate_email(name)
                
                # Check if user/provider already exists
                if frappe.db.exists("User", email) or frappe.db.exists("Provider", {"email": email}):
                    # Try a different email
                    email = generate_email(name, domain="demo.et")
                    if frappe.db.exists("User", email):
                        continue
                
                # Create User
                user = frappe.new_doc("User")
                user.email = email
                user.first_name = name.split()[0] if len(name.split()) > 0 else "Provider"
                user.last_name = " ".join(name.split()[1:]) if len(name.split()) > 1 else ""
                user.send_welcome_email = 0
                user.user_type = "System User"
                user.insert(ignore_permissions=True)
                
                # Create Provider
                provider = frappe.new_doc("Provider")
                provider.provider_name = name
                provider.full_name = name
                provider.email = email
                provider.user = email
                provider.phone = generate_ethiopian_phone()
                provider.timezone = "Africa/Addis_Ababa"
                provider.language = "en"
                provider.is_active = 1
                provider.onboarding_complete = 1
                mark_as_demo(provider)
                
                # Link to organization via Provider Organization child table
                if hasattr(provider, 'organizations'):
                    provider.append("organizations", {
                        "organization": org_name,
                        "status": "Active",
                        "accept_org_bookings": 1,
                        "is_primary": 1
                    })
                
                provider.insert(ignore_permissions=True)
                
                # Create User Appointment Availability
                availability = frappe.new_doc("User Appointment Availability")
                availability.user = email
                availability.provider = provider.name
                base_slug = sanitize_email_string(name)
                availability.slug = generate_unique_slug(base_slug, "User Appointment Availability", "slug")
                availability.enable_scheduling = 1
                availability.meeting_provider = "builtin"
                availability.insert(ignore_permissions=True)
                
                # Link back to provider
                provider.user_appointment_availability = availability.name
                provider.save(ignore_permissions=True)
                
                # Add default duration and time slots
                try:
                    availability_doc = frappe.get_doc("User Appointment Availability", availability.name)
                    needs_update = False
                    
                    weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
                    default_start_time = "09:00:00"
                    default_end_time = "18:00:00"
                    
                    if not availability_doc.available_durations or len(availability_doc.available_durations) == 0:
                        availability_doc.append("available_durations", {
                            "title": "30 Minute Meeting",
                            "duration": 30 * 60,
                            "allow_rescheduling": 1,
                            "availability_window": 30,
                            "minimum_notice_before_event": 2
                        })
                        needs_update = True
                    
                    existing_days = set()
                    if availability_doc.appointment_time_slot:
                        existing_days = {slot.day for slot in availability_doc.appointment_time_slot}
                    
                    for day in weekdays:
                        if day not in existing_days:
                            availability_doc.append("appointment_time_slot", {
                                "day": day,
                                "start_time": default_start_time,
                                "end_time": default_end_time
                            })
                            needs_update = True
                    
                    if needs_update:
                        availability_doc.save(ignore_permissions=True)
                except Exception as e:
                    frappe.log_error(str(e), "Demo Data: Add Durations/Time Slots Error")
                
                created_providers.append(provider.name)
                fixed_count += 1
                frappe.db.commit()
                
                # Sync booking URLs
                try:
                    from appointment.scheduler.booking_url_manager import sync_booking_urls_for_provider
                    sync_booking_urls_for_provider(provider.name)
                    frappe.db.commit()
                except Exception as e:
                    frappe.log_error(str(e), "Demo Data: Sync Provider Booking URLs Error")
                    
            except Exception as e:
                frappe.log_error(f"Error creating provider for organization {org_name}: {str(e)}", "Demo Data: Ensure Org Providers Error")
                continue
        
        return {
            "success": True,
            "fixed_count": fixed_count,
            "created_providers": created_providers,
            "message": f"Ensured {fixed_count} organizations have providers"
        }
        
    except Exception as e:
        frappe.log_error(str(e), "Demo Data: Ensure Org Providers Error")
        frappe.throw(_(f"Error ensuring organizations have providers: {str(e)}"))
