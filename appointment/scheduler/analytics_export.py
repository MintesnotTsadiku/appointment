"""CSV rendering keeps the same report authority, filters and coverage contracts."""
import csv
import io
import frappe
from appointment.scheduler import membership


def _csv_safe(value):
    text = "" if value is None else str(value)
    return "'" + text if text.lstrip().startswith(("=", "+", "-", "@")) else text



def _csv_rows(report):
    current = report["current"]
    no_show, utilization = current["no_show_rate"], current["utilization"]
    rows = [["Section", "Metric", "Value"]]
    rows += [["Scope", key, value] for key, value in (
        ("Business", report["business_name"]), ("Role scope", report["role"]),
        ("Period", f'{report["start"]} to {report["end"]}'), ("Timezone", report["timezone"]),
        ("No-show definition", report["definitions"]["no_show"]),
        ("Utilization definition", report["definitions"]["utilization"]),
        ("Known limit", report["definitions"]["schedule_limit"]),
    )]
    metrics = [
        ("All bookings", current["total"]), ("Completed", current["completed"]), ("Cancelled", current["cancelled"]),
        ("No Show", current["no_show"]), ("No-show numerator", no_show["numerator"]),
        ("No-show denominator", no_show["denominator"]), ("No-show rate (%)", no_show["rate"] if no_show["available"] else "Unavailable"),
        ("Booked capacity hours", utilization["booked_hours"]), ("Available capacity hours", utilization["available_hours"]),
        ("Utilization (%)", report["metrics"]["utilization"]["value"] if report["metrics"]["utilization"]["value"] is not None else "Unavailable"),
    ]
    if report["role"] in (membership.ROLE_OWNER, membership.ROLE_MANAGER):
        metrics += [("Catalog value estimate (ETB)", current.get("catalog_value", 0)), ("Recorded payments (ETB)", report["metrics"]["recorded_payments"]["value"] if report["metrics"]["recorded_payments"]["coverage"] != "unavailable" else "Unavailable")]
    rows += [["Summary", key, value] for key, value in metrics]
    rows += [["Trend", item["date"], f'bookings={item["bookings"]}; completed={item["completed"]}; cancelled={item["cancelled"]}; no_show={item["no_show"]}'] for item in current["trend"]]
    for key, title in (("services", "Service"), ("providers", "Provider"), ("locations", "Location")):
        rows += [[title, item["name"], item["count"]] for item in current[key]]
    rows += [["Scope", "Filters", str(report.get("filters", {}))], ["Scope", "Time basis", report.get("time_basis", "appointment")]]
    for key, metric in report.get("metrics", {}).items():
        rows.append(["Metric", key, str(metric)])
    return [[_csv_safe(cell) for cell in row] for row in rows]



def export_report(organization: str, period: int = 30, filters: str = "{}"):
    from appointment.scheduler.analytics import _report
    report = _report(organization, period, filters)
    stream = io.StringIO(newline="")
    csv.writer(stream, lineterminator="\r\n").writerows(_csv_rows(report))
    frappe.response["type"] = "download"
    frappe.response["filename"] = f'appointment-insights-{report["start"]}-{report["end"]}.csv'
    frappe.response["filecontent"] = "\ufeff" + stream.getvalue()
    frappe.response["display_content_as"] = "attachment"
    frappe.response["content_type"] = "text/csv; charset=utf-8"

