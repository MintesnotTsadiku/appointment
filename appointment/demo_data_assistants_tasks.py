"""
Demo Data Generation for Assistants & Tasks Modules
Generates realistic demo data for testing and development
"""

import frappe
from frappe import _
from datetime import datetime, timedelta
import random


# =====================================================
# DEMO DATA CONTEXT
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

ASSISTANT_SKILLS = [
    ("Email Management", "Administrative", "Manage inbox, filter, respond, schedule"),
    ("Calendar Management", "Administrative", "Schedule meetings, manage calendars"),
    ("Data Entry", "Administrative", "Accurate data entry and organization"),
    ("Customer Service", "Customer Service", "Handle customer inquiries and support"),
    ("Research", "Research", "Conduct research and compile reports"),
    ("Social Media Management", "Creative", "Manage social media accounts and content"),
    ("Content Writing", "Creative", "Write articles, blog posts, marketing copy"),
    ("Bookkeeping", "Financial", "Basic bookkeeping and financial records"),
    ("Translation", "Communication", "Translate between languages"),
    ("Project Coordination", "Administrative", "Coordinate projects and teams"),
    ("Technical Support", "Technical", "Provide technical assistance and troubleshooting"),
    ("Event Planning", "Administrative", "Plan and organize events")
]

TASK_CATEGORIES = [
    ("Administrative", "Routine administrative tasks"),
    ("Customer Service", "Client-facing support tasks"),
    ("Marketing", "Marketing and promotional activities"),
    ("Research", "Research and analysis tasks"),
    ("Creative", "Creative and design work"),
    ("Technical", "Technical support and development"),
    ("Financial", "Financial tasks and bookkeeping")
]

TASK_TEMPLATES = [
    ("Daily Email Review", "Review and respond to daily emails", ["Email Management", "Inbox Organization"]),
    ("Weekly Report", "Prepare weekly status report", ["Research", "Data Compilation"]),
    ("Social Media Posts", "Create and schedule social media content", ["Content Writing", "Social Media"]),
    ("Customer Follow-up", "Follow up with customers", ["Customer Service", "Communication"]),
    ("Data Cleanup", "Clean and organize data", ["Data Entry", "Administrative"])
]

COMPANIES = [
    "Addis Tech Solutions",
    "Bole Business Center",
    "Merkato Trading Company",
    "Ethio Consulting Group",
    "Selamta Services",
    "Bethel Enterprises",
    "Abyssinia Logistics",
    "Hawassa Commercial",
    "Gondar Trading",
    "Dessie Industries"
]


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
    suffix = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    return f"+251{prefix}{suffix}"

def generate_email(name):
    """Generate email from name"""
    parts = name.lower().split()
    return f"{parts[0]}.{parts[-1]}@example.com"

def generate_unique_email(name):
    """Generate a unique email by appending a numeric suffix if needed."""
    base_email = generate_email(name)
    if not frappe.db.exists("User", base_email):
        return base_email
    # Try suffixes until unique
    for suffix in range(1, 1000):
        email = base_email.replace("@", f"+{suffix}@")
        if not frappe.db.exists("User", email):
            return email
    # Fallback with random digits
    while True:
        rand_suffix = random.randint(1000, 9999)
        email = base_email.replace("@", f"+{rand_suffix}@")
        if not frappe.db.exists("User", email):
            return email

def generate_unique_username(base_username):
    """Generate a unique username by appending a numeric suffix if needed."""
    if not frappe.db.exists("User", {"username": base_username}):
        return base_username
    for suffix in range(1, 1000):
        username = f"{base_username}{suffix}"
        if not frappe.db.exists("User", {"username": username}):
            return username
    while True:
        rand_suffix = random.randint(1000, 9999)
        username = f"{base_username}{rand_suffix}"
        if not frappe.db.exists("User", {"username": username}):
            return username

def mark_as_demo(doc):
    """Mark document as demo data"""
    if hasattr(doc, 'is_demo_data'):
        doc.is_demo_data = 1


# =====================================================
# ASSISTANT SKILLS GENERATION
# =====================================================

@frappe.whitelist()
def generate_assistant_skills(count=10):
    """Generate demo assistant skills"""
    frappe.only_for("System Manager")
    count = int(count)
    
    created = []
    
    try:
        for i, (skill_name, category, description) in enumerate(ASSISTANT_SKILLS[:count]):
            # Check if already exists
            if frappe.db.exists("Assistant Skill", skill_name):
                continue
            
            skill = frappe.new_doc("Assistant Skill")
            skill.skill_name = skill_name
            skill.category = category
            skill.description = description
            skill.is_active = 1
            
            mark_as_demo(skill)
            skill.insert(ignore_permissions=True)
            created.append(skill.name)
        
        return {
            "success": True,
            "count": len(created),
            "skills": created
        }
    
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Demo Data: Generate Assistant Skills Error")
        frappe.throw(_(f"Error generating assistant skills: {str(e)}"))


# =====================================================
# TASK CATEGORIES GENERATION
# =====================================================

@frappe.whitelist()
def generate_task_categories(count=5):
    """Generate demo task categories"""
    frappe.only_for("System Manager")
    count = int(count)
    
    created = []
    colors = ["#FF5733", "#33FF57", "#3357FF", "#FF33F5", "#F5FF33", "#33FFF5", "#FF8C33"]
    
    try:
        for i, (cat_name, description) in enumerate(TASK_CATEGORIES[:count]):
            # Check if already exists
            if frappe.db.exists("Task Category", cat_name):
                continue
            
            category = frappe.new_doc("Task Category")
            category.category_name = cat_name
            category.description = description
            category.color = colors[i % len(colors)]
            category.is_active = 1
            
            mark_as_demo(category)
            category.insert(ignore_permissions=True)
            created.append(category.name)
        
        return {
            "success": True,
            "count": len(created),
            "categories": created
        }
    
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Demo Data: Generate Task Categories Error")
        frappe.throw(_(f"Error generating task categories: {str(e)}"))


# =====================================================
# TASK TEMPLATES GENERATION
# =====================================================

@frappe.whitelist()
def generate_task_templates(count=3):
    """Generate demo task templates"""
    frappe.only_for("System Manager")
    count = int(count)
    
    created = []
    
    try:
        # Get task categories
        categories = frappe.get_all("Task Category", fields=["name"])
        if not categories:
            frappe.throw("Please create Task Categories first")
        
        for i, (template_name, description, tags) in enumerate(TASK_TEMPLATES[:count]):
            # Check if already exists
            if frappe.db.exists("Task Template", template_name):
                continue
            
            template = frappe.new_doc("Task Template")
            template.template_name = template_name
            template.description = description
            template.category = random.choice(categories)["name"]
            template.default_title = template_name
            template.default_description = description
            template.default_tags = ", ".join(tags)
            template.priority = random.choice(["low", "medium", "high"])
            template.estimated_duration = random.choice([30, 60, 90, 120])
            template.is_active = 1
            
            mark_as_demo(template)
            template.insert(ignore_permissions=True)
            created.append(template.name)
        
        return {
            "success": True,
            "count": len(created),
            "templates": created
        }
    
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Demo Data: Generate Task Templates Error")
        frappe.throw(_(f"Error generating task templates: {str(e)}"))


# =====================================================
# VA PROFILES GENERATION
# =====================================================

@frappe.whitelist()
def generate_va_profiles(count=5):
    """Generate demo VA profiles with users"""
    frappe.only_for("System Manager")
    count = int(count)
    
    created = []
    
    # Headlines for demo VAs
    headlines = [
        "Executive Assistant with 5+ years in Tech",
        "Bilingual Customer Service Specialist",
        "Detail-oriented Administrative Professional",
        "Creative Marketing & Social Media Expert",
        "Research & Data Analysis Specialist",
        "Project Coordination & Event Planning Pro",
        "Financial Operations & Bookkeeping Expert",
        "Technical Support & Documentation Specialist"
    ]
    
    # Tools for demo VAs
    demo_tools = [
        ("Notion", "advanced"),
        ("Slack", "expert"),
        ("Google Workspace", "expert"),
        ("Asana", "advanced"),
        ("Zoom", "advanced"),
        ("Trello", "intermediate"),
        ("Microsoft 365", "advanced"),
        ("ClickUp", "intermediate"),
        ("HubSpot", "intermediate"),
        ("Calendly", "advanced"),
        ("Canva", "intermediate"),
        ("Mailchimp", "intermediate")
    ]
    
    # Specializations
    demo_specializations = [
        "Technology",
        "Healthcare",
        "Finance",
        "E-commerce",
        "Real Estate",
        "Marketing",
        "Consulting",
        "Education"
    ]
    
    # Certifications
    demo_certifications = [
        ("Google Workspace Administrator", "Google", "2023-06-15"),
        ("HubSpot Inbound Marketing", "HubSpot Academy", "2023-03-20"),
        ("Project Management Professional", "PMI", "2022-11-10"),
        ("Microsoft Office Specialist", "Microsoft", "2022-08-01"),
        ("Certified Virtual Assistant", "International Virtual Assistant Association", "2023-01-15"),
        ("Bookkeeping Certification", "QuickBooks", "2022-05-20")
    ]
    
    try:
        # Get assistant skills
        skills = frappe.get_all("Assistant Skill", filters={"is_active": 1}, fields=["name"])
        
        for i in range(count):
            name = generate_ethiopian_name()
            email = generate_unique_email(name)
            username = email.split("@")[0]
            
            username = generate_unique_username(username)
            
            # Create user
            user = frappe.new_doc("User")
            user.email = email
            user.username = username
            user.first_name = name.split()[0]
            user.last_name = name.split()[-1] if len(name.split()) > 1 else ""
            user.enabled = 1
            user.user_type = "System User"
            
            # Add Virtual Assistant role
            user.append("roles", {
                "role": "Virtual Assistant"
            })
            
            user.insert(ignore_permissions=True)
            frappe.db.commit()
            
            # Create VA Profile
            va_profile = frappe.new_doc("VA Profile")
            va_profile.user = email
            va_profile.assistant_tier = random.choice(["junior", "standard", "senior"])
            
            # Set max_clients based on tier
            tier_max = {"junior": 1, "standard": 2, "senior": 3}
            va_profile.max_clients = tier_max.get(va_profile.assistant_tier, 1)
            
            # Professional Identity
            va_profile.headline = headlines[i % len(headlines)]
            va_profile.bio = f"Experienced virtual assistant specializing in administrative and customer service tasks. Passionate about helping businesses grow and streamline their operations."
            va_profile.education = random.choice([
                "Bachelor's degree in Business Administration",
                "Bachelor's degree in Computer Science",
                "Bachelor's degree in Marketing",
                "MBA in Management",
                "Bachelor's degree in Communications"
            ])
            va_profile.work_style = random.choice(["remote_only", "hybrid", "flexible"])
            va_profile.response_time = random.choice(["immediate", "within_1_hour", "within_4_hours", "within_24_hours"])
            
            # Ratings & Performance (tier-based)
            tier_rating_base = {"junior": 3.5, "standard": 4.2, "senior": 4.7}
            base_rating = tier_rating_base.get(va_profile.assistant_tier, 4.0)
            va_profile.rating = round(base_rating + random.uniform(-0.3, 0.3), 1)
            va_profile.total_reviews = random.randint(5, 150)
            va_profile.tasks_completed = random.randint(20, 500)
            va_profile.success_rate = random.randint(85, 100)
            va_profile.years_experience = {"junior": random.randint(1, 2), "standard": random.randint(2, 5), "senior": random.randint(5, 10)}.get(va_profile.assistant_tier, 3)
            
            # Availability
            va_profile.availability_status = random.choice(["available", "limited", "booked"])
            va_profile.available_hours_per_week = random.choice([20, 30, 40])
            va_profile.working_hours_start = random.choice(["08:00:00", "09:00:00", "10:00:00"])
            va_profile.working_hours_end = random.choice(["17:00:00", "18:00:00", "19:00:00"])
            
            # Pricing (tier-based)
            tier_rate = {"junior": random.randint(15, 25), "standard": random.randint(25, 40), "senior": random.randint(40, 75)}
            va_profile.hourly_rate = tier_rate.get(va_profile.assistant_tier, 30)
            
            # Location
            va_profile.timezone = "Africa/Addis_Ababa"
            
            # Badges (senior more likely to be featured/verified)
            if va_profile.assistant_tier == "senior":
                va_profile.featured = random.choice([True, True, False])
                va_profile.verified = True
            elif va_profile.assistant_tier == "standard":
                va_profile.featured = random.choice([True, False, False])
                va_profile.verified = random.choice([True, True, False])
            else:
                va_profile.featured = False
                va_profile.verified = random.choice([True, False])
            
            va_profile.is_active = 1
            
            # Add languages
            languages = random.sample(["English", "Amharic", "French"], k=random.randint(1, 3))
            for lang in languages:
                va_profile.append("languages", {
                    "language": lang,
                    "proficiency_level": random.choice(["intermediate", "advanced", "native"])
                })
            
            # Add skills
            if skills:
                selected_skills = random.sample(skills, k=min(4, len(skills)))
                for skill in selected_skills:
                    va_profile.append("skills", {
                        "skill": skill["name"],
                        "proficiency_level": random.choice(["intermediate", "advanced", "expert"])
                    })
            
            # Add tools (2-5 random tools)
            selected_tools = random.sample(demo_tools, k=random.randint(2, 5))
            for tool_name, proficiency in selected_tools:
                va_profile.append("tools", {
                    "tool_name": tool_name,
                    "proficiency_level": proficiency,
                    "years_using": random.randint(1, 5)
                })
            
            # Add specializations (1-3 random)
            selected_specs = random.sample(demo_specializations, k=random.randint(1, 3))
            for spec in selected_specs:
                va_profile.append("specializations", {
                    "specialization": spec,
                    "years_in_industry": random.randint(1, 6)
                })
            
            # Add certifications (1-3 random for senior, 0-2 for others)
            cert_count = {"junior": random.randint(0, 1), "standard": random.randint(1, 2), "senior": random.randint(2, 3)}.get(va_profile.assistant_tier, 1)
            if cert_count > 0:
                selected_certs = random.sample(demo_certifications, k=min(cert_count, len(demo_certifications)))
                for cert_name, org, date in selected_certs:
                    va_profile.append("certifications", {
                        "certification_name": cert_name,
                        "issuing_organization": org,
                        "date_obtained": date
                    })
            
            mark_as_demo(va_profile)
            va_profile.insert(ignore_permissions=True)
            created.append(va_profile.name)
            frappe.db.commit()
        
        return {
            "success": True,
            "count": len(created),
            "va_profiles": created
        }
    
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Demo Data: Generate VA Profiles Error")
        frappe.throw(_(f"Error generating VA profiles: {str(e)}"))


# =====================================================
# CLIENT PROFILES GENERATION
# =====================================================

@frappe.whitelist()
def generate_client_profiles(count=10):
    """Generate demo client profiles with users"""
    frappe.only_for("System Manager")
    count = int(count)
    
    created = []
    
    try:
        for i in range(count):
            name = generate_ethiopian_name()
            email = generate_unique_email(name)
            company = random.choice(COMPANIES)
            
            username = generate_unique_username(email.split("@")[0])
            
            # Create user
            user = frappe.new_doc("User")
            user.email = email
            user.username = username
            user.first_name = name.split()[0]
            user.last_name = name.split()[-1] if len(name.split()) > 1 else ""
            user.enabled = 1
            user.user_type = "System User"
            
            # Add Client role (or System User if Client role doesn't exist)
            try:
                user.append("roles", {
                    "role": "Client"
                })
            except:
                user.append("roles", {
                    "role": "System User"
                })
            
            user.insert(ignore_permissions=True)
            frappe.db.commit()
            
            # Create Client Profile
            client = frappe.new_doc("Client Profile")
            client.user = email
            client.full_name = name
            client.company = company
            client.email = email
            client.phone = generate_ethiopian_phone()
            client.timezone = "Africa/Addis_Ababa"
            client.city = "Addis Ababa"
            client.country = "Ethiopia"
            client.preferred_language = random.choice(["en", "am"])
            client.is_active = 1
            
            mark_as_demo(client)
            client.insert(ignore_permissions=True)
            created.append(client.name)
            frappe.db.commit()
        
        return {
            "success": True,
            "count": len(created),
            "client_profiles": created
        }
    
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Demo Data: Generate Client Profiles Error")
        frappe.throw(_(f"Error generating client profiles: {str(e)}"))


# =====================================================
# ASSISTANT CLIENT ASSIGNMENTS GENERATION
# =====================================================

@frappe.whitelist()
def generate_assignments(count=8):
    """Generate demo assistant-client assignments"""
    frappe.only_for("System Manager")
    count = int(count)
    
    created = []
    
    try:
        # Get VA profiles and client profiles
        va_profiles = frappe.get_all("VA Profile", filters={"is_active": 1}, fields=["name", "max_clients"])
        client_profiles = frappe.get_all("Client Profile", filters={"is_active": 1}, fields=["name"])
        
        if not va_profiles:
            frappe.throw("Please create VA Profiles first")
        if not client_profiles:
            frappe.throw("Please create Client Profiles first")
        
        # Track assignments per VA - initialize with existing active assignments
        va_assignments = {}
        for va in va_profiles:
            existing_assignments = frappe.get_all(
                "Assistant Client Assignment",
                filters={
                    "assistant": va["name"],
                    "status": "active"
                },
                fields=["name", "client_profile"]
            )
            va_assignments[va["name"]] = [
                {"client_profile": a["client_profile"], "assignment": a["name"]}
                for a in existing_assignments
            ]
        
        for i in range(count):
            # Find a VA that can take more clients (checking both existing and new assignments)
            available_vas = [
                va for va in va_profiles
                if len(va_assignments[va["name"]]) < va["max_clients"]
            ]
            
            if not available_vas:
                # Log which VAs are at capacity
                at_capacity = [
                    va for va in va_profiles
                    if len(va_assignments[va["name"]]) >= va["max_clients"]
                ]
                if at_capacity:
                    for va in at_capacity:
                        va_email = frappe.db.get_value("VA Profile", va["name"], "user")
                        frappe.log_error(
                            f"Assistant {va_email} has reached maximum client capacity ({va['max_clients']}). "
                            f"Current active assignments: {len(va_assignments[va['name']])}",
                            "Demo Data: VA Capacity Reached"
                        )
                break
            
            va = random.choice(available_vas)
            
            # Find an unassigned client (checking both existing and new assignments)
            assigned_clients = [a["client_profile"] for a in va_assignments[va["name"]]]
            available_clients = [
                c for c in client_profiles
                if c["name"] not in assigned_clients
            ]
            
            if not available_clients:
                break
            
            client = random.choice(available_clients)
            
            # Check if assignment already exists (double-check)
            existing = frappe.db.exists(
                "Assistant Client Assignment",
                {
                    "assistant": va["name"],
                    "client_profile": client["name"],
                    "status": "active"
                }
            )
            
            if existing:
                continue
            
            # Determine assignment type based on VA's max_clients
            current_count = len(va_assignments[va["name"]])
            if va["max_clients"] == 1:
                assignment_type = "dedicated"
                priority = None
            elif va["max_clients"] == 2:
                assignment_type = "shared_2"
                priority = "primary" if current_count == 0 else "secondary"
            else:  # max_clients == 3
                assignment_type = "shared_3"
                priority = "primary" if current_count == 0 else "secondary"
            
            assignment = frappe.new_doc("Assistant Client Assignment")
            assignment.assistant = va["name"]
            assignment.client_profile = client["name"]
            assignment.assignment_type = assignment_type
            if priority:
                assignment.priority = priority
            assignment.status = "active"
            assignment.start_date = datetime.now().date() - timedelta(days=random.randint(0, 30))
            
            mark_as_demo(assignment)
            assignment.insert(ignore_permissions=True)
            created.append(assignment.name)
            
            va_assignments[va["name"]].append({
                "client_profile": client["name"],
                "assignment": assignment.name
            })
            
            frappe.db.commit()
        
        return {
            "success": True,
            "count": len(created),
            "assignments": created
        }
    
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Demo Data: Generate Assignments Error")
        frappe.throw(_(f"Error generating assignments: {str(e)}"))


# =====================================================
# TASK PROJECTS GENERATION
# =====================================================

@frappe.whitelist()
def generate_task_projects(count=5):
    """Generate demo task projects"""
    frappe.only_for("System Manager")
    count = int(count)
    
    created = []
    
    try:
        # Get client profiles
        client_profiles = frappe.get_all("Client Profile", filters={"is_active": 1}, fields=["name"])
        if not client_profiles:
            frappe.throw("Please create Client Profiles first")
        
        # Get categories
        categories = frappe.get_all("Task Category", filters={"is_active": 1}, fields=["name"])
        
        project_names = [
            "Website Redesign",
            "Marketing Campaign",
            "Customer Onboarding",
            "Data Migration",
            "Product Launch"
        ]
        
        for i in range(min(count, len(project_names))):
            project_name = project_names[i]
            
            # Check if already exists
            if frappe.db.exists("Task Project", project_name):
                continue
            
            project = frappe.new_doc("Task Project")
            project.project_name = project_name
            project.client_profile = random.choice(client_profiles)["name"]
            if categories:
                project.category = random.choice(categories)["name"]
            project.description = f"Project: {project_name}"
            project.status = random.choice(["Planning", "In Progress", "On Hold"])
            project.start_date = datetime.now().date() - timedelta(days=random.randint(0, 60))
            if project.status == "Completed":
                project.end_date = datetime.now().date()
            project.is_active = 1
            
            mark_as_demo(project)
            project.insert(ignore_permissions=True)
            created.append(project.name)
            frappe.db.commit()
        
        return {
            "success": True,
            "count": len(created),
            "projects": created
        }
    
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Demo Data: Generate Task Projects Error")
        frappe.throw(_(f"Error generating task projects: {str(e)}"))


# =====================================================
# TASKS GENERATION
# =====================================================

@frappe.whitelist()
def generate_tasks(count=20):
    """Generate demo tasks"""
    frappe.only_for("System Manager")
    count = int(count)
    
    created = []
    
    try:
        # Get required data
        client_profiles = frappe.get_all("Client Profile", filters={"is_active": 1}, fields=["name"])
        if not client_profiles:
            frappe.throw("Please create Client Profiles first")
        
        va_profiles = frappe.get_all("VA Profile", filters={"is_active": 1}, fields=["name"])
        categories = frappe.get_all("Task Category", filters={"is_active": 1}, fields=["name"])
        projects = frappe.get_all("Task Project", filters={"is_active": 1}, fields=["name"])
        
        task_titles = [
            "Review daily emails",
            "Schedule client meetings",
            "Update customer database",
            "Prepare weekly report",
            "Follow up on pending requests",
            "Organize documents",
            "Respond to customer inquiries",
            "Create social media content",
            "Research market trends",
            "Update website content",
            "Process invoices",
            "Coordinate with team",
            "Prepare presentation",
            "Handle customer complaints",
            "Update project status"
        ]
        
        for i in range(count):
            title = random.choice(task_titles) + f" ({i+1})"
            
            client = random.choice(client_profiles)
            
            task = frappe.new_doc("Task")
            task.title = title
            task.client_profile = client["name"]
            task.description = f"Task: {title}"
            task.priority = random.choice(["Low", "Medium", "High", "Urgent"])
            
            # Date distribution: past week, today, next week, two weeks out
            bucket = random.random()
            if bucket < 0.35:
                days_offset = random.randint(-7, -1)  # past week
            elif bucket < 0.50:
                days_offset = 0  # today
            elif bucket < 0.80:
                days_offset = random.randint(1, 7)  # next week
            else:
                days_offset = random.randint(8, 14)  # two weeks ahead
            
            # Set a working-hours time to avoid all-day placement (9am-5pm)
            hour = random.randint(9, 17)
            minute = random.choice([0, 15, 30, 45])
            deadline_dt = datetime.now().replace(hour=hour, minute=minute, second=0, microsecond=0) + timedelta(days=days_offset)
            task.deadline = deadline_dt
            
            # Status aligned with time bucket
            if days_offset < 0:
                task.status = random.choice(["Completed", "In Progress", "Assigned"])
            elif days_offset == 0:
                task.status = random.choice(["In Progress", "Assigned", "Requested"])
            else:
                task.status = random.choice(["Requested", "Assigned", "In Progress"])
            
            # Assign to VA if available and status is not "Requested"
            if va_profiles and task.status != "Requested":
                assignment = frappe.db.get_value(
                    "Assistant Client Assignment",
                    {"client_profile": client["name"], "status": "active"},
                    "assistant"
                )
                if assignment:
                    task.assignee = assignment
            
            if categories:
                task.category = random.choice(categories)["name"]
            
            if projects and random.choice([True, False]):
                task.project = random.choice(projects)["name"]
            
            # Daily briefing flag for near-term items
            if 0 <= days_offset <= 3:
                task.is_daily_briefing = 1
            
            task.estimated_duration = random.choice([30, 60, 90, 120, 180])
            
            if random.choice([True, False]):
                task.tags = random.choice(["urgent", "follow-up", "review", "research"])
            
            mark_as_demo(task)
            task.insert(ignore_permissions=True)
            created.append(task.name)
            
            if (i + 1) % 5 == 0:
                frappe.db.commit()
        
        frappe.db.commit()
        
        return {
            "success": True,
            "count": len(created),
            "tasks": created
        }
    
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Demo Data: Generate Tasks Error")
        frappe.throw(_(f"Error generating tasks: {str(e)}"))


# =====================================================
# CLEAR FUNCTIONS
# =====================================================

@frappe.whitelist()
def clear_tasks():
    """Clear demo tasks"""
    frappe.only_for("System Manager")
    
    # Some deployments might not have the is_demo_data field on Task
    try:
        has_flag = "is_demo_data" in frappe.get_meta("Task").get("fields", [])
    except Exception:
        has_flag = False

    if has_flag:
        tasks = frappe.get_all("Task", filters={"is_demo_data": 1}, fields=["name"])
    else:
        # Fallback: remove tasks created by the demo generator (heuristic: our titles end with "(n)")
        tasks = frappe.get_all("Task", filters={"title": ["like", "%(%)"]}, fields=["name"])

    count = len(tasks)

    for task in tasks:
        frappe.delete_doc("Task", task.name, force=1, ignore_permissions=True)

    frappe.db.commit()
    return {"count": count}

@frappe.whitelist()
def clear_task_projects():
    """Clear demo task projects"""
    frappe.only_for("System Manager")
    
    try:
        has_flag = "is_demo_data" in frappe.get_meta("Task Project").get("fields", [])
    except Exception:
        has_flag = False

    if has_flag:
        projects = frappe.get_all("Task Project", filters={"is_demo_data": 1}, fields=["name"])
    else:
        projects = frappe.get_all("Task Project", fields=["name"])

    count = len(projects)

    for project in projects:
        frappe.delete_doc("Task Project", project.name, force=1, ignore_permissions=True)

    frappe.db.commit()
    return {"count": count}

@frappe.whitelist()
def clear_assignments():
    """Clear demo assignments"""
    frappe.only_for("System Manager")
    
    # Check if is_demo_data field exists
    try:
        meta = frappe.get_meta("Assistant Client Assignment")
        has_flag = "is_demo_data" in [f.get("fieldname") for f in meta.get("fields", [])]
    except Exception:
        has_flag = False
    
    if has_flag:
        assignments = frappe.get_all("Assistant Client Assignment", filters={"is_demo_data": 1}, fields=["name"])
    else:
        # Fallback: delete assignments where either VA Profile or Client Profile is demo data
        # Get demo VA Profiles and Client Profiles
        demo_va_profiles = []
        demo_client_profiles = []
        
        try:
            va_meta = frappe.get_meta("VA Profile")
            if "is_demo_data" in [f.get("fieldname") for f in va_meta.get("fields", [])]:
                demo_va_profiles = frappe.get_all("VA Profile", filters={"is_demo_data": 1}, pluck="name")
        except:
            pass
        
        try:
            client_meta = frappe.get_meta("Client Profile")
            if "is_demo_data" in [f.get("fieldname") for f in client_meta.get("fields", [])]:
                demo_client_profiles = frappe.get_all("Client Profile", filters={"is_demo_data": 1}, pluck="name")
        except:
            pass
        
        # Get assignments linked to demo profiles
        assignments = []
        if demo_va_profiles:
            assignments_va = frappe.get_all(
                "Assistant Client Assignment",
                filters={"assistant": ["in", demo_va_profiles]},
                fields=["name"]
            )
            assignments.extend(assignments_va)
        
        if demo_client_profiles:
            assignments_client = frappe.get_all(
                "Assistant Client Assignment",
                filters={"client_profile": ["in", demo_client_profiles]},
                fields=["name"]
            )
            # Merge and deduplicate
            existing_names = {a["name"] for a in assignments}
            for a in assignments_client:
                if a["name"] not in existing_names:
                    assignments.append(a)
    
    count = len(assignments)
    
    for assignment in assignments:
        frappe.delete_doc("Assistant Client Assignment", assignment.name, force=1, ignore_permissions=True)
    
    frappe.db.commit()
    return {"count": count}

@frappe.whitelist()
def clear_client_profiles():
    """Clear demo client profiles and users"""
    frappe.only_for("System Manager")
    
    # Check if is_demo_data field exists
    try:
        meta = frappe.get_meta("Client Profile")
        has_flag = "is_demo_data" in [f.get("fieldname") for f in meta.get("fields", [])]
    except Exception:
        has_flag = False
    
    if has_flag:
        clients = frappe.get_all("Client Profile", filters={"is_demo_data": 1}, fields=["name", "user"])
    else:
        # Fallback: get all client profiles (safer than deleting nothing)
        clients = frappe.get_all("Client Profile", fields=["name", "user"])
    
    count = len(clients)
    
    for client in clients:
        frappe.delete_doc("Client Profile", client.name, force=1, ignore_permissions=True)
        # Delete user if exists
        if client.user and frappe.db.exists("User", client.user):
            try:
                frappe.delete_doc("User", client.user, force=1, ignore_permissions=True)
            except:
                pass
    
    frappe.db.commit()
    return {"count": count}

@frappe.whitelist()
def clear_va_profiles():
    """Clear demo VA profiles and users"""
    frappe.only_for("System Manager")
    
    # Check if is_demo_data field exists
    try:
        meta = frappe.get_meta("VA Profile")
        has_flag = "is_demo_data" in [f.get("fieldname") for f in meta.get("fields", [])]
    except Exception:
        has_flag = False
    
    if has_flag:
        va_profiles = frappe.get_all("VA Profile", filters={"is_demo_data": 1}, fields=["name", "user"])
    else:
        # Fallback: get all VA profiles (safer than deleting nothing)
        va_profiles = frappe.get_all("VA Profile", fields=["name", "user"])
    
    count = len(va_profiles)
    
    for va in va_profiles:
        frappe.delete_doc("VA Profile", va.name, force=1, ignore_permissions=True)
        # Delete user if exists
        if va.user and frappe.db.exists("User", va.user):
            try:
                frappe.delete_doc("User", va.user, force=1, ignore_permissions=True)
            except:
                pass
    
    frappe.db.commit()
    return {"count": count}

@frappe.whitelist()
def clear_task_templates():
    """Clear demo task templates"""
    frappe.only_for("System Manager")
    
    # Check if is_demo_data field exists
    try:
        meta = frappe.get_meta("Task Template")
        has_flag = "is_demo_data" in [f.get("fieldname") for f in meta.get("fields", [])]
    except Exception:
        has_flag = False
    
    if has_flag:
        templates = frappe.get_all("Task Template", filters={"is_demo_data": 1}, fields=["name"])
    else:
        # Fallback: get all templates (safer than deleting nothing)
        templates = frappe.get_all("Task Template", fields=["name"])
    
    count = len(templates)
    
    for template in templates:
        frappe.delete_doc("Task Template", template.name, force=1, ignore_permissions=True)
    
    frappe.db.commit()
    return {"count": count}

@frappe.whitelist()
def clear_task_categories():
    """Clear demo task categories"""
    frappe.only_for("System Manager")
    
    # Check if is_demo_data field exists
    try:
        meta = frappe.get_meta("Task Category")
        has_flag = "is_demo_data" in [f.get("fieldname") for f in meta.get("fields", [])]
    except Exception:
        has_flag = False
    
    if has_flag:
        categories = frappe.get_all("Task Category", filters={"is_demo_data": 1}, fields=["name"])
    else:
        # Fallback: get all categories (safer than deleting nothing)
        categories = frappe.get_all("Task Category", fields=["name"])
    
    count = len(categories)
    
    for category in categories:
        frappe.delete_doc("Task Category", category.name, force=1, ignore_permissions=True)
    
    frappe.db.commit()
    return {"count": count}

@frappe.whitelist()
def clear_assistant_skills():
    """Clear demo assistant skills"""
    frappe.only_for("System Manager")
    
    # Check if is_demo_data field exists
    try:
        meta = frappe.get_meta("Assistant Skill")
        has_flag = "is_demo_data" in [f.get("fieldname") for f in meta.get("fields", [])]
    except Exception:
        has_flag = False
    
    if has_flag:
        skills = frappe.get_all("Assistant Skill", filters={"is_demo_data": 1}, fields=["name"])
    else:
        # Fallback: get all skills (safer than deleting nothing)
        skills = frappe.get_all("Assistant Skill", fields=["name"])
    
    count = len(skills)
    
    for skill in skills:
        frappe.delete_doc("Assistant Skill", skill.name, force=1, ignore_permissions=True)
    
    frappe.db.commit()
    return {"count": count}

