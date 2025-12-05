#!/usr/bin/env python3
"""
Script to clear all demo data from the Frappe Appointment system.
Run this via bench console for a non-interactive cleanup.

Usage:
    bench --site <site-name> console < scripts/clear_all_demo_data.py
    OR
    bench --site <site-name> console <<< "from frappe_appointment.demo_data import clear_all_demo_data; result = clear_all_demo_data(); print(result.get('message', 'Done'))"
"""

from frappe_appointment.demo_data import clear_all_demo_data

if __name__ == "__main__":
    result = clear_all_demo_data()
    print("\n" + "="*60)
    print("CLEANUP COMPLETE")
    print("="*60)
    print(result.get('message', 'Done'))
    print("="*60)
    if result.get('success'):
        print("\n✅ All demo data has been deleted successfully!")
        print("You can now start fresh with new demo data generation.")
    else:
        print("\n❌ Some errors occurred during cleanup.")
        print("Check the error logs for details.")







