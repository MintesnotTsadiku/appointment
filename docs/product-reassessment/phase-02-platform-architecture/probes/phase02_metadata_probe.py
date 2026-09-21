import frappe

SITE = "meet-beta-fix-appointment-beta-readiness-01dea7.localhost"
frappe.init(site=SITE)
frappe.connect()

def col_info(dt, field):
    cols = frappe.db.sql("show columns from `tab%s` like %%s" % dt, (field,), as_dict=True)
    return [c["Field"] for c in cols]

print("== Service duplicate metadata consequence ==")
meta = frappe.get_meta("Service")
bb = [f for f in meta.fields if f.fieldname == "buffer_before"]
print("meta buffer_before defs:", len(bb), "->", [(f.fieldname, f.fieldtype, f.label) for f in bb])
print("db column count buffer_before:", col_info("Service", "buffer_before"))

print("\n== Location duplicate metadata consequence ==")
meta = frappe.get_meta("Location")
for fld in ["address_line_1", "city", "timezone", "phone"]:
    defs = [f for f in meta.fields if f.fieldname == fld]
    print(fld, "meta defs:", len(defs), "db cols:", len(col_info("Location", fld)))

print("\n== audit / tracking metadata ==")
for dt in ["Appointment", "Booking Event", "Organization", "Service", "Location", "Walk In", "Provider"]:
    m = frappe.get_meta(dt)
    print("%-16s track_changes=%s allow_rename=%s is_child=%s" % (dt, m.track_changes, m.allow_rename, m.istable))

print("\n== user permission count ==")
print(frappe.db.count("User Permission"))

print("\n== role DocPerms that apply to Organization Manager on core records ==")
for dt in ["Appointment", "Walk In", "Booking Event", "Service", "Location", "Provider", "EventType", "Policy"]:
    roles = [p.role for p in frappe.get_all("DocPerm", filters={"parent": dt}, fields=["role"])]
    print("%-16s %s" % (dt, roles))

print("\n== Appointment fields (no organization) ==")
print([f.fieldname for f in frappe.get_meta("Appointment").fields])
print("== Booking Event fields (organization?) ==")
print([f for f in [f.fieldname for f in frappe.get_meta("Booking Event").fields] if "org" in f or "customer" in f or "client" in f])
print("== Walk In fields ==")
print([f.fieldname for f in frappe.get_meta("Walk In").fields])

frappe.destroy()
