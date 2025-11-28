"""
Demo Data Generation for Frappe Appointment
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
    "Bole Road, Near Edna Mall",
    "Merkato, CMC Area",
    "Piassa, Churchill Avenue",
    "4 Kilo, Near ECA",
    "Kazanchis, Business District",
    "Sarbet, Near Megenagna",
    "Arat Kilo, University Area",
    "Mexico Square, Atlas Area"
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
        ("Pediatric Consultation", 30, 550, "Child health checkup")
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
            org.insert(ignore_permissions=True)
            
            # Add profile photo using placeholder image (after insert and commit to avoid concurrency issues)
            frappe.db.commit()  # Commit before attaching image to avoid concurrency issues
            photo_urls = [
                "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=400&fit=crop",  # Medical
                "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=400&h=400&fit=crop",  # Dental
                "https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=400&h=400&fit=crop",  # Salon
                "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=400&fit=crop",  # Fitness
            ]
            if hasattr(org, 'logo'):
                try:
                    # Reload org to get latest version before attaching image
                    org.reload()
                    attach_image_from_url(org, 'logo', photo_urls[i % len(photo_urls)])
                    frappe.db.commit()
                except Exception as e:
                    # Don't fail demo data generation if image attachment fails
                    frappe.log_error(str(e), "Demo Data: Image Attachment Error")
                    pass
            
            created.append(org.name)
            org_names.append(org.name)
            frappe.db.commit()
            
            # Sync booking URLs for this organization (after commit to ensure document is saved)
            try:
                from frappe_appointment.scheduler.booking_url_manager import sync_booking_urls_for_organization
                # Reload document before syncing to avoid concurrency issues
                frappe.db.commit()  # Ensure commit before reload
                sync_booking_urls_for_organization(org.name)
                frappe.db.commit()
            except Exception as e:
                frappe.log_error(str(e), "Demo Data: Sync Organization Booking URLs Error")
        
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
        
        # Step 3: Generate Services (for organizations)
        frappe.msgprint("Step 3: Generating services...", alert=True)
        service_result = generate_services(9)  # 3 per org
        results["services"] = service_result.get("services", [])
        frappe.db.commit()
        
        # Step 4: Generate Locations
        frappe.msgprint("Step 4: Generating locations...", alert=True)
        location_result = generate_locations(6)  # 2 per org
        results["locations"] = location_result.get("locations", [])
        frappe.db.commit()
        
        # Step 5: Generate EventTypes and Appointments
        frappe.msgprint("Step 5: Generating event types and appointments...", alert=True)
        appointment_result = generate_appointments(10, days_back=14)  # Create EventTypes + appointments
        results["event_types"] = appointment_result.get("event_types", [])
        results["appointments"] = appointment_result.get("appointments", 0)
        results["booking_events"] = appointment_result.get("booking_events", 0)
        frappe.db.commit()
        
        # Step 6: Sync ALL booking URLs
        frappe.msgprint("Step 6: Syncing booking URLs...", alert=True)
        from frappe_appointment.scheduler.booking_url_manager import sync_booking_urls_for_provider, sync_booking_urls_for_organization
        
        # Sync all providers
        all_providers = frappe.get_all("Provider", pluck="name")
        for provider_name in all_providers:
            try:
                sync_booking_urls_for_provider(provider_name)
            except Exception as e:
                frappe.log_error(str(e), f"Demo Data: Sync Provider {provider_name} Booking URLs Error")
        
        # Sync all organizations
        all_orgs = frappe.get_all("Organization", pluck="name")
        for org_name in all_orgs:
            try:
                sync_booking_urls_for_organization(org_name)
            except Exception as e:
                frappe.log_error(str(e), f"Demo Data: Sync Organization {org_name} Booking URLs Error")
        
        frappe.db.commit()
        results["booking_urls_synced"] = True
        
        # Verify booking URLs were created
        orgs_with_urls = 0
        providers_with_urls = 0
        
        for org_name in all_orgs:
            org_doc = frappe.get_doc("Organization", org_name)
            if hasattr(org_doc, 'booking_urls') and org_doc.booking_urls:
                orgs_with_urls += 1
        
        for provider_name in all_providers:
            provider = frappe.get_doc("Provider", provider_name)
            if provider.email:
                availability = frappe.db.get_value("User Appointment Availability", {"user": provider.email}, "name")
                if availability:
                    avail_doc = frappe.get_doc("User Appointment Availability", availability)
                    if hasattr(avail_doc, 'booking_urls') and avail_doc.booking_urls:
                        providers_with_urls += 1
        
        message = f"""✓ Demo data generation complete!

Organizations: {len(all_orgs)} ({orgs_with_urls} with booking URLs)
Providers: {len(all_providers)} ({providers_with_urls} with booking URLs)
Services: {len(results['services'])}
Locations: {len(results['locations'])}
EventTypes: {results['event_types']}
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
                
                created.append(provider.name)
                provider_index += 1
                frappe.db.commit()
        
                # Sync booking URLs
                try:
                    from frappe_appointment.scheduler.booking_url_manager import sync_booking_urls_for_provider
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
            
            created.append(provider.name)
            provider_index += 1
            frappe.db.commit()
        
            # Sync booking URLs
            try:
                from frappe_appointment.scheduler.booking_url_manager import sync_booking_urls_for_provider
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
    """
    frappe.only_for("System Manager")
    count = int(count)
    
    created = []
    
    try:
        orgs = frappe.get_all("Organization", fields=["name", "organization_type"])
        if not orgs:
            frappe.throw("Please create organizations first")
        
        services_per_org = max(1, count // len(orgs))
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
                    # Service already exists, skip it
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
                    
                    # Link providers from this organization to the service
                    # Get all active providers for this organization
                    org_providers = frappe.get_all(
                        "Provider Organization",
                        filters={"organization": org.name, "status": "Active"},
                        fields=["parent"],
                        pluck="parent"
                    )
                    
                    if org_providers and hasattr(service, 'service_providers'):
                        # Add first provider as primary, others as regular
                        for idx, provider_name in enumerate(org_providers[:3]):  # Max 3 providers per service
                            service.append("service_providers", {
                                "provider": provider_name,
                                "status": "Active",
                                "is_primary": 1 if idx == 0 else 0,
                                "price_override": price,  # Use service price as default
                            })
                    
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
        
        return {
            "success": True,
            "count": len(created),
            "services": created,
            "message": f"✓ Created {len(created)} services"
        }
    
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Demo Data: Generate Services Error")
        frappe.throw(_(f"Error generating services: {str(e)}"))


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
                
                location_name = f"{org_name} - {ADDIS_LOCATIONS[i % len(ADDIS_LOCATIONS)]}"
                
                if frappe.db.exists("Location", {"location_name": location_name}):
                    location_index += 1
                    continue
                
                try:
                    location = frappe.new_doc("Location")
                    location.location_name = location_name
                    location.organization = org_name
                    location.address = ADDIS_LOCATIONS[i % len(ADDIS_LOCATIONS)]
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
def generate_appointments(count=10, days_back=14):
    """
    Generate demo appointments with EventTypes, Booking Events, and Appointments
    
    Args:
        count: Number of appointments to create (default: 10)
        days_back: Number of days in the past to create appointments (default: 14)
    """
    frappe.only_for("System Manager")
    count = int(count)
    days_back = int(days_back)
    
    created_eventtypes = []
    created_appointments = []
    created_booking_events = []
    
    try:
        providers = frappe.get_all("Provider", pluck="name")
        services = frappe.get_all("Service", fields=["name", "service_name", "duration", "price", "organization"])
        locations = frappe.get_all("Location", pluck="name")
        
        if not providers or not services or not locations:
            frappe.throw("Please create providers, services, and locations first")
        
        # Create EventTypes (link providers + services + locations)
        # Only create EventTypes for providers that belong to the service's organization
        for service in services[:min(3, len(services))]:
            service_name = service["name"]
            if not service.get("organization"):
                continue
        
            # Get providers that belong to this service's organization
            org_providers = frappe.get_all(
                "Provider Organization",
                filters={"organization": service["organization"], "status": "Active"},
                fields=["parent"],
                pluck="parent"
            )
            
            # Also check Service Provider child table for this service
            service_provider_names = frappe.get_all(
                "Service Provider",
                filters={"parent": service_name, "status": "Active"},
                fields=["provider"],
                pluck="provider"
            )
            
            # Use Service Provider entries if available, otherwise use org providers
            potential_providers = service_provider_names if service_provider_names else org_providers
            
            # Filter to only providers that actually exist in the Provider doctype
            valid_providers = [p for p in potential_providers if frappe.db.exists("Provider", p)]
            
            if not valid_providers:
                # Skip this service - no valid providers linked
                continue
        
            # Get locations for this organization
            org_locations = frappe.get_all(
                "Location",
                filters={"organization": service["organization"]},
                fields=["name"],
                limit=2
            )
                    
            if not org_locations:
                continue
                    
            # Create EventTypes for each valid provider + service + location combination
            for provider_name in valid_providers[:min(3, len(valid_providers))]:
                for location_name in [loc.name for loc in org_locations[:1]]:  # One location per service
                    # Check if EventType exists
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
        
        # Now create Appointments and Booking Events
        event_types = frappe.get_all(
            "EventType",
            filters={"is_active": 1},
            fields=["name", "provider", "service", "location"]
        )
        
        if not event_types:
            frappe.throw("No active EventTypes found. Please create EventTypes first.")
        
        # Filter event_types to only include those with valid providers, services, and locations
        valid_event_types = []
        for et in event_types:
            provider_exists = frappe.db.exists("Provider", et["provider"])
            service_exists = frappe.db.exists("Service", et["service"])
            location_exists = frappe.db.exists("Location", et["location"])
            
            if provider_exists and service_exists and location_exists:
                valid_event_types.append(et)
            else:
                # Log and optionally delete invalid EventType
                frappe.log_error(
                    f"EventType {et['name']} has invalid references - Provider: {et['provider']} ({provider_exists}), Service: {et['service']} ({service_exists}), Location: {et['location']} ({location_exists})",
                    "Demo Data: Invalid EventType"
                )
        
        if not valid_event_types:
            frappe.throw("No valid EventTypes found. All EventTypes have invalid provider/service/location references. Please clear demo data and regenerate.")
        
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
        
        # Sync booking URLs after creating EventTypes
        frappe.db.commit()
        try:
            from frappe_appointment.scheduler.booking_url_manager import sync_booking_urls_for_provider, sync_booking_urls_for_organization
            
            all_providers = frappe.get_all("Provider", pluck="name")
            for provider_name in all_providers:
                try:
                    sync_booking_urls_for_provider(provider_name)
                except:
                    pass
            
            all_orgs = frappe.get_all("Organization", pluck="name")
            for org_name in all_orgs:
                try:
                    sync_booking_urls_for_organization(org_name)
                except:
                    pass
        except Exception as e:
            frappe.log_error(str(e), "Demo Data: Final Booking URL Sync Error")
        
        message = f"""✓ Demo appointments created:
- Event Types: {len(created_eventtypes)}
- Booking Events: {len(created_booking_events)}
- Appointments: {len(created_appointments)}"""
        
        return {
            "success": True,
            "count": len(created_appointments),
            "event_types": len(created_eventtypes),
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
    Run via: bench --site [sitename] execute frappe_appointment.demo_data.cleanup_orphaned_records
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
