
import frappe
from frappe_appointment.demo_data_assistants_tasks import (
    clear_tasks, clear_assignments, clear_va_profiles, clear_client_profiles,
    clear_task_projects, clear_task_templates, clear_task_categories, clear_assistant_skills,
    generate_assistant_skills, generate_task_categories, generate_task_templates,
    generate_va_profiles, generate_client_profiles, generate_assignments,
    generate_task_projects, generate_tasks
)

def reset_demo_data():
    print("Clearing existing data...")
    try:
        clear_tasks()
        print("- Tasks cleared")
        clear_assignments()
        print("- Assignments cleared")
        clear_va_profiles()
        print("- VA Profiles cleared")
        clear_client_profiles()
        print("- Client Profiles cleared")
        clear_task_projects()
        print("- Task Projects cleared")
        clear_task_templates()
        print("- Task Templates cleared")
        clear_task_categories()
        print("- Task Categories cleared")
        clear_assistant_skills()
        print("- Assistant Skills cleared")
    except Exception as e:
        print(f"Error clearing data: {e}")

    print("\nRegenerating data...")
    try:
        generate_assistant_skills(count=15)
        print("- Assistant Skills generated")
        generate_task_categories(count=7)
        print("- Task Categories generated")
        generate_task_templates(count=5)
        print("- Task Templates generated")
        generate_va_profiles(count=12)  # Generate 12 VAs to show grid well
        print("- VA Profiles generated")
        generate_client_profiles(count=15)
        print("- Client Profiles generated")
        generate_assignments(count=20)
        print("- Assignments generated")
        generate_task_projects(count=8)
        print("- Task Projects generated")
        generate_tasks(count=50)
        print("- Tasks generated")
        
        frappe.db.commit()
        print("\nSUCCESS: Demo data regenerated!")
    except Exception as e:
        frappe.db.rollback()
        print(f"\nERROR: Failed to regenerate data: {e}")

if __name__ == "__main__":
    reset_demo_data()
