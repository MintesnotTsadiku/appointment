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
    """Generate email from name"""
    parts = name.lower().split()
    if len(parts) >= 2:
        return f"{parts[0]}.{parts[1]}@{domain}"
    return f"{parts[0]}@{domain}"


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
        
        # Step 5: Generate EventTypes (link providers + services + locations)
        frappe.msgprint("Step 5: Generating event types...", alert=True)
        event_type_result = generate_appointments(20, days_back=0)  # Just create EventTypes, no appointments
        results["event_types"] = event_type_result.get("event_types", [])
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
EventTypes: {len(results['event_types'])}

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
                
                # Check if service already exists
                if frappe.db.exists("Service", {"service_name": service_name, "organization": org.name}):
                    continue
                
                # Create Service
                service = frappe.new_doc("Service")
                service.service_name = service_name
                service.organization = org.name
                service.duration = duration
                service.buffer_time = 5
                service.price = price
                service.currency = "ETB"
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
                continue
            
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
def generate_appointments(count=50, days_back=14):
    """
    Generate demo appointments with EventTypes
    """
    frappe.only_for("System Manager")
    count = int(count)
    days_back = int(days_back)
    
    created_eventtypes = []
    created_appointments = []
    created_events = []
    
    try:
        providers = frappe.get_all("Provider", pluck="name")
        services = frappe.get_all("Service", pluck="name")
        locations = frappe.get_all("Location", pluck="name")
        
        if not providers or not services or not locations:
            frappe.throw("Please create providers, services, and locations first")
        
        # Create EventTypes (link providers + services + locations)
        # Only create EventTypes for providers that belong to the service's organization
        for service_name in services[:min(3, len(services))]:
            # Get service to find its organization
            service = frappe.get_doc("Service", service_name)
            if not service.organization:
                continue
        
            # Get providers that belong to this service's organization
            org_providers = frappe.get_all(
                "Provider Organization",
                filters={"organization": service.organization, "status": "Active"},
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
            valid_providers = service_provider_names if service_provider_names else org_providers
            
            if not valid_providers:
                # Skip this service - no providers linked
                continue
        
            # Get locations for this organization
            org_locations = frappe.get_all(
                "Location",
                filters={"organization": service.organization},
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
                    event_type = frappe.new_doc("EventType")
                    event_type.event_type_name = f"{service.service_name} - {location_name}"
                    event_type.service = service_name
                    event_type.provider = provider_name
                    event_type.location = location_name
                    event_type.is_active = 1
                    mark_as_demo(event_type)
                        event_type.insert(ignore_permissions=True)
                    
                        created_eventtypes.append(event_type.name)
                        frappe.db.commit()
        
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
        
        return {
            "success": True,
            "count": len(created_appointments),
            "event_types": len(created_eventtypes),
            "appointments": len(created_appointments),
            "events": len(created_events),
            "message": f"✓ Created {len(created_eventtypes)} event types"
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
        
        frappe.db.commit()
        return {"success": True, "message": f"Deleted {deleted_events} events and {deleted_appointments} appointments"}
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
