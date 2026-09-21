"""
Phase 2 isolation probe (synthetic tenants, self-cleaning).

Creates two independent tenants (org A and org B) with their own owner/provider
users and one appointment + walk-in + private booking event each, then checks
whether a user of tenant A can see or modify tenant B records through the app's
own permission model and front-desk APIs.

No credentials are printed. API keys are generated, used only for in-process
HTTP calls, and removed with the synthetic users during cleanup.
"""

import json
import traceback

import frappe
import requests

SITE = "meet-beta-fix-appointment-beta-readiness-01dea7.localhost"
BASE_URL = "http://127.0.0.1:49511"
MARKER = "P2ISO"

results = []


def rec(check, value):
    results.append((check, value))
    print("RESULT | %-55s | %s" % (check, value))


def safe(check, fn):
    try:
        rec(check, fn())
    except Exception as e:
        rec(check, "EXC:%s:%s" % (type(e).__name__, e))


frappe.init(site=SITE)
frappe.connect()
frappe.flags.ignore_permissions = True

created = []


def mk(doctype, **values):
    doc = frappe.get_doc({"doctype": doctype, **values})
    doc.insert(ignore_permissions=True, ignore_if_duplicate=False)
    created.append((doctype, doc.name))
    return doc


def cleanup():
    frappe.set_user("Administrator")
    frappe.flags.ignore_permissions = True
    for doctype, name in reversed(created):
        try:
            if frappe.db.exists(doctype, name):
                frappe.delete_doc(doctype, name, force=True, ignore_permissions=True, delete_permanently=True)
        except Exception as e:
            print("CLEANUP-ERR", doctype, name, repr(e))
            frappe.db.rollback()
    frappe.db.commit()


try:
    frappe.set_user("Administrator")

    def make_user(email, roles, password=None):
        u = mk(
            "User",
            email=email,
            first_name=email.split("@")[0],
            send_welcome_email=0,
            enabled=1,
            roles=[{"role": r} for r in roles],
        )
        u.api_key = frappe.generate_hash(length=15)
        u.api_secret = frappe.generate_hash(length=15)
        if password:
            u.new_password = password
        u.save(ignore_permissions=True)
        return u

    ua = make_user(f"{MARKER.lower()}-a-owner@example.invalid", ["Provider"])
    ub = make_user(f"{MARKER.lower()}-b-owner@example.invalid", ["Provider"])
    ur = make_user(f"{MARKER.lower()}-reception@example.invalid", ["Front-Desk"])
    uc_password = frappe.generate_hash(length=20)
    uc = make_user(f"{MARKER.lower()}-customer@example.invalid", [], password=uc_password)
    um = make_user(f"{MARKER.lower()}-manager@example.invalid", ["Organization Manager"])

    org_a = mk("Organization", organization_name=f"{MARKER} Org A", organization_type="Other",
               slug=f"{MARKER.lower()}-org-a", owner_user=ua.name, is_active=1, enable_public_booking=1,
               managers=[{"user": ua.name, "full_name": "A Owner", "can_manage_services": 1, "can_manage_providers": 1}])
    org_b = mk("Organization", organization_name=f"{MARKER} Org B", organization_type="Other",
               slug=f"{MARKER.lower()}-org-b", owner_user=ub.name, is_active=1, enable_public_booking=1,
               managers=[{"user": ub.name, "full_name": "B Owner", "can_manage_services": 1, "can_manage_providers": 1}])

    prov_a = mk("Provider", provider_name=f"{MARKER} Provider A", full_name="Provider A", user=ua.name,
                is_active=1, organization=org_a.name, organization_status="Active")
    prov_b = mk("Provider", provider_name=f"{MARKER} Provider B", full_name="Provider B", user=ub.name,
                is_active=1, organization=org_b.name, organization_status="Active")

    loc_a = mk("Location", location_name=f"{MARKER} Location A", organization=org_a.name, is_active=1)
    loc_b = mk("Location", location_name=f"{MARKER} Location B", organization=org_b.name, is_active=1)

    svc_a = mk("Service", service_name=f"{MARKER} Service A", duration=30, price=100, organization=org_a.name, is_active=1)
    svc_b = mk("Service", service_name=f"{MARKER} Service B", duration=30, price=100, organization=org_b.name, is_active=1)

    et_a = mk("EventType", naming_series="EVT-.YYYY.-.######", event_type_name=f"{MARKER} ET A",
              service=svc_a.name, provider=prov_a.name, location=loc_a.name, is_active=1)
    et_b = mk("EventType", naming_series="EVT-.YYYY.-.######", event_type_name=f"{MARKER} ET B",
              service=svc_b.name, provider=prov_b.name, location=loc_b.name, is_active=1)

    # Appointments owned by each tenant's owner
    frappe.set_user(ua.name)
    apt_a = mk("Appointment", appointment_id=f"APT-{MARKER}-A", event_type=et_a.name, provider=prov_a.name,
               location=loc_a.name, service=svc_a.name, client_name="Alice TenantA",
               client_email="alice.a@example.invalid", client_phone="+251900000011",
               appointment_date=frappe.utils.nowdate(), start_time="09:00:00", end_time="09:30:00", status="Confirmed")
    frappe.set_user(ub.name)
    apt_b = mk("Appointment", appointment_id=f"APT-{MARKER}-B", event_type=et_b.name, provider=prov_b.name,
               location=loc_b.name, service=svc_b.name, client_name="Bob TenantB",
               client_email="bob.b@example.invalid", client_phone="+251900000022",
               appointment_date=frappe.utils.nowdate(), start_time="10:00:00", end_time="10:30:00", status="Confirmed")

    # Walk-ins (created as each owner)
    frappe.set_user(ua.name)
    wi_a = mk("Walk In", client_name="Walkin A", client_phone="+251900000033", location=loc_a.name, status="waiting")
    frappe.set_user(ub.name)
    wi_b = mk("Walk In", client_name="Walkin B", client_phone="+251900000044", location=loc_b.name, status="waiting")

    # Private booking events owned by each tenant
    frappe.set_user(ua.name)
    ev_a = mk("Booking Event", subject=f"{MARKER} Private A", starts_on=f"{frappe.utils.nowdate()} 09:00:00",
              ends_on=f"{frappe.utils.nowdate()} 09:30:00", event_type="Private", status="Open")
    frappe.set_user(ub.name)
    ev_b = mk("Booking Event", subject=f"{MARKER} Private B", starts_on=f"{frappe.utils.nowdate()} 10:00:00",
              ends_on=f"{frappe.utils.nowdate()} 10:30:00", event_type="Private", status="Open")
    frappe.db.commit()

    today = frappe.utils.nowdate()

    # ---------------------------------------------------------------
    # A. Tenant A owner (Provider role) cross-tenant access
    # ---------------------------------------------------------------
    frappe.set_user(ua.name)

    safe("A.roles", lambda: frappe.get_roles(ua.name))
    safe("A.get_list(Appointment).count", lambda: len(frappe.get_list("Appointment", fields=["name", "client_name", "client_email"])))
    safe("A.get_list(Appointment).names", lambda: sorted(r.name for r in frappe.get_list("Appointment", fields=["name"])))
    safe("A.get_list(Appointment).B_visible", lambda: apt_b.name in [r.name for r in frappe.get_list("Appointment", fields=["name"])])
    safe("A.get_list(Walk In).B_visible", lambda: wi_b.name in [r.name for r in frappe.get_list("Walk In", fields=["name"])])
    safe("A.get_list(Service).B_visible", lambda: svc_b.name in [r.name for r in frappe.get_list("Service", fields=["name"])])
    safe("A.get_list(Provider).B_visible", lambda: prov_b.name in [r.name for r in frappe.get_list("Provider", fields=["name"])])
    safe("A.get_list(Location).B_visible", lambda: loc_b.name in [r.name for r in frappe.get_list("Location", fields=["name"])])
    safe("A.get_list(BookingEvent).B_visible", lambda: ev_b.name in [r.name for r in frappe.get_list("Booking Event", fields=["name"])])
    safe("A.get_list(Organization).B_visible", lambda: org_b.name in [r.name for r in frappe.get_list("Organization", fields=["name"])])
    safe("A.has_perm(Appointment,B,write)", lambda: frappe.has_permission("Appointment", "write", doc=frappe.get_doc("Appointment", apt_b.name)))
    safe("A.has_perm(BookingEvent,A,read)", lambda: frappe.has_permission("Booking Event", "read", doc=frappe.get_doc("Booking Event", ev_a.name)))

    from appointment.scheduler.api import desk

    def desk_read_b():
        res = desk.get_desk_appointments(date=today)
        payload = res[0] if isinstance(res, tuple) else res
        names = [a["name"] for a in payload.get("appointments_today", [])] if isinstance(payload, dict) else []
        if not names and isinstance(payload, dict):
            names = [a["name"] for a in payload.get("appointments", [])]
        return payload if len(json.dumps(payload, default=str)) < 400 else {"keys": list(payload.keys()) if isinstance(payload, dict) else "n/a", "B_visible": apt_b.name in names}

    safe("A.desk.get_desk_appointments.B_visible", lambda: desk_read_b())
    safe("A.desk.get_providers_list.count", lambda: len(desk.get_providers_list()["providers"]))
    safe("A.desk.get_services_list.count", lambda: len(desk.get_services_list()["services"]))
    safe("A.desk.get_locations_list.count", lambda: len(desk.get_locations_list()["locations"]))
    safe("A.desk.get_walk_ins.B_visible", lambda: wi_b.name in [w["name"] for w in desk.get_walk_ins()["walk_ins"]])

    def cross_update():
        res = desk.update_appointment(apt_b.name, status="Cancelled")
        payload = res[0] if isinstance(res, tuple) else res
        return {"success": bool(isinstance(payload, dict) and payload.get("success")),
                "modified_by": frappe.db.get_value("Appointment", apt_b.name, "modified_by"),
                "status": frappe.db.get_value("Appointment", apt_b.name, "status")}

    safe("A.desk.update_appointment(B,status=Cancelled)", cross_update)
    safe("A.status_after_update(B)", lambda: frappe.db.get_value("Appointment", apt_b.name, "status"))

    # ---------------------------------------------------------------
    # B. Reception (Front-Desk role) cross-tenant create
    # ---------------------------------------------------------------
    frappe.set_user(ur.name)
    safe("R.roles", lambda: frappe.get_roles(ur.name))
    safe("R.get_list(Appointment).B_visible", lambda: apt_b.name in [r.name for r in frappe.get_list("Appointment", fields=["name"])])
    def reception_cross_create():
        res = desk.create_desk_appointment(client_name="Reception Cross", client_phone="+251900000055",
                                           client_email="cross@example.invalid", service_name=svc_b.name,
                                           provider_name=prov_b.name, location_name=loc_b.name,
                                           start_time="14:00:00", appointment_date=today)
        payload = res[0] if isinstance(res, tuple) else res
        if isinstance(payload, dict) and payload.get("appointment"):
            created.append(("Appointment", payload["appointment"]["name"]))
        return {"success": isinstance(payload, dict) and payload.get("success"), "created": payload.get("appointment", {}).get("name") if isinstance(payload, dict) else None}

    safe("R.desk.create_cross_tenant(B service/provider/location)", reception_cross_create)

    def reception_rogue_service():
        import appointment.api.manage as manage
        res = manage.create_service(service_name=f"{MARKER} Rogue Service", duration=15)
        if isinstance(res, dict) and res.get("service_id"):
            created.append(("Service", res["service_id"]))
        return res

    safe("R.create_service_no_org", reception_rogue_service)

    # ---------------------------------------------------------------
    # C. Customer (no staff role) - Python-level and HTTP-level
    # ---------------------------------------------------------------
    frappe.set_user(uc.name)
    safe("C.roles", lambda: frappe.get_roles(uc.name))
    safe("C.get_list(Appointment).count", lambda: len(frappe.get_list("Appointment", fields=["name"])))
    safe("C.has_perm(Appointment,read)", lambda: frappe.has_permission("Appointment", "read"))
    safe("C.desk.get_desk_appointments.B_visible", lambda: desk_read_b())

    def http(method, path, **params):
        headers = {"Authorization": "token %s:%s" % (uc.api_key, uc.api_secret)}
        r = requests.get(BASE_URL + path, headers=headers, params=params, timeout=30)
        ct = r.headers.get("content-type", "")
        body = r.json() if "application/json" in ct else r.text[:200]
        return r.status_code, body

    def http_get_desk():
        code, body = http("GET", "/api/method/appointment.scheduler.api.desk.get_desk_appointments", date=today)
        text = json.dumps(body, default=str)
        return {"status": code, "B_visible": apt_b.name in text, "len": len(text)}

    def http_get_list_res():
        code, body = http("GET", "/api/method/frappe.client.get_list", doctype="Appointment", fields='["name"]')
        return {"status": code, "body": body if code != 200 else "ok"}

    safe("C.HTTP(apikey).desk.get_desk_appointments", http_get_desk)
    safe("C.HTTP(apikey).frappe.client.get_list(Appointment)", http_get_list_res)

    def http_session():
        s = requests.Session()
        r = s.post(BASE_URL + "/api/method/login", data={"usr": uc.name, "pwd": uc_password}, timeout=30)
        out = {"login_status": r.status_code}
        r2 = s.get(BASE_URL + "/api/method/appointment.scheduler.api.desk.get_desk_appointments",
                   params={"date": today}, timeout=30)
        text = r2.text
        out["desk_status"] = r2.status_code
        out["desk_B_visible"] = apt_b.name in text
        r3 = s.get(BASE_URL + "/api/method/appointment.scheduler.api.desk.get_walk_ins", timeout=30)
        out["walkins_status"] = r3.status_code
        out["walkins_B_visible"] = wi_b.name in r3.text
        r4 = s.get(BASE_URL + "/api/method/frappe.client.get_list",
                   params={"doctype": "Appointment", "fields": '["name"]'}, timeout=30)
        out["get_list_status"] = r4.status_code
        return out

    safe("C.HTTP(session).login+desk+walkins+get_list", http_session)

    # ---------------------------------------------------------------
    # D. Organization Manager role is global (no org scoping)
    # ---------------------------------------------------------------
    frappe.set_user(um.name)
    safe("M.roles", lambda: frappe.get_roles(um.name))
    safe("M.get_list(Organization).count", lambda: len(frappe.get_list("Organization", fields=["name"])))
    safe("M.get_list(Organization).B_visible", lambda: org_b.name in [r.name for r in frappe.get_list("Organization", fields=["name"])])
    safe("M.has_perm(Organization,B,write)", lambda: frappe.has_permission("Organization", "write", doc=frappe.get_doc("Organization", org_b.name)))
    safe("M.has_perm(Organization,B,export)", lambda: frappe.has_permission("Organization", "export"))

finally:
    cleanup()

print("\n== SUMMARY ==")
print("created_records:", len(created))
frappe.destroy()
