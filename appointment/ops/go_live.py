"""Go-live readiness report. Reads only, and never prints a secret.

Run with: bench --site <site> execute appointment.ops.go_live.report
It is not whitelisted: only a shell user on the server can run it.
"""

import frappe

from appointment.ops import readiness_config, readiness_services
from appointment.ops.checks import FAIL, PASS, WARN

AREAS = (
    readiness_config.SiteConfig,
    readiness_config.Email,
    readiness_services.Sms,
    readiness_services.Payments,
    readiness_services.Scheduler,
    readiness_services.Translations,
    readiness_config.Build,
    readiness_services.Data,
)


def report():
    """Return every check with a pass, warn or fail status and a short fix."""
    checks = [row for area in AREAS for row in area().run()]
    summary = {status: sum(row["status"] == status for row in checks) for status in (PASS, WARN, FAIL)}
    return {"site": frappe.local.site, "summary": summary, "checks": checks}
