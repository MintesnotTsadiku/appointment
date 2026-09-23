"""Analytics integration, export and role/tenant isolation checks."""

import frappe

from appointment.scheduler import analytics
from appointment.tests import rich_demo


def denied(call):
    try:
        call()
    except frappe.PermissionError:
        return
    raise AssertionError("Expected permission denial")


def verify():
    rich_demo.require_target()
    state = rich_demo.load_state()
    bloom = state["businesses"]["bloom"]["organization"]
    clinic = state["businesses"]["tena"]["organization"]
    result = {}
    try:
        for user in (
            "bloom.owner@example.test", "bloom.manager@example.test",
            "bloom.provider1@example.test", "bloom.reception@example.test",
            "multi.manager@example.test",
        ):
            frappe.set_user(user)
            report = analytics.overview(bloom, 30)
            assert report["current"]["total"] > 0
            assert len(report["current"]["trend"]) == 30
            assert analytics.overview(bloom, 7)["current"]["total"] > 0
            long_report = analytics.overview(bloom, 90)
            assert len(long_report["current"]["trend"]) == 90
            assert long_report["current"]["total"] > report["current"]["total"]
            assert report["current"]["repeat_customers"] > 0
            assert report["today_confirmed"] <= report["next_seven_days"]
            assert report["business_name"] == "Bole Bloom Hair Studio"
            assert report["current"]["no_show_rate"]["denominator"] == (
                report["current"]["completed"] + report["current"]["no_show"]
            )
            assert report["current"]["no_show_rate"]["available"]
            assert report["current"]["utilization"]["available"]
            assert report["current"]["utilization"]["capacity_minutes"] > 0
            assert report["current"]["utilization"]["booked_minutes"] > 0
            assert report["current"]["utilization"]["includes_buffers"]
            assert report["current"]["utilization"]["schedule_basis"] == "current"
            csv_rows = analytics._csv_rows(report)
            csv_text = "\n".join(",".join(map(str, row)) for row in csv_rows)
            assert "No-show definition" in csv_text and "Utilization definition" in csv_text
            assert "client_email" not in csv_text and "appointment_id" not in csv_text
            analytics.export_csv(bloom, 30)
            assert frappe.response["content_type"] == "text/csv; charset=utf-8"
            assert frappe.response["display_content_as"] == "attachment"
            assert frappe.response["filename"].endswith(".csv")
            assert frappe.response["filecontent"].startswith("\ufeffSection,Metric,Value\r\n")
            assert "client_email" not in frappe.response["filecontent"]
            result[user] = {
                "total": report["current"]["total"],
                "no_show": report["current"]["no_show_rate"]["rate"],
                "utilization": report["current"]["utilization"]["rate"],
            }
            if user in ("bloom.owner@example.test", "bloom.manager@example.test"):
                assert report["current"]["catalog_value"] > 0
                assert "recorded_payments" in report["current"]
                assert "Catalog value estimate (ETB)" in csv_text
            else:
                assert "catalog_value" not in report["current"]
                assert "recorded_payments" not in report["current"]
                assert "Catalog value estimate (ETB)" not in csv_text
            if user == "multi.manager@example.test":
                clinic_report = analytics.overview(clinic, 30)
                assert clinic_report["current"]["total"] > 0
                assert clinic_report["current"]["catalog_value"] > 0
            else:
                denied(lambda: analytics.overview(clinic, 30))
                denied(lambda: analytics.export_csv(clinic, 30))
        assert result["bloom.owner@example.test"]["total"] > result["bloom.provider1@example.test"]["total"] > 0
        assert result["bloom.owner@example.test"]["total"] > result["bloom.reception@example.test"]["total"] > 0
        assert result["bloom.owner@example.test"]["utilization"] != result["bloom.provider1@example.test"]["utilization"]
        assert result["bloom.owner@example.test"]["utilization"] != result["bloom.reception@example.test"]["utilization"]
        frappe.set_user("Guest")
        denied(lambda: analytics.overview(bloom, 30))
        denied(lambda: analytics.export_csv(bloom, 30))
        frappe.set_user("bloom.owner@example.test")
        try:
            analytics.overview(bloom, 365)
        except frappe.ValidationError:
            pass
        else:
            raise AssertionError("Invalid analytics period accepted")
    finally:
        frappe.set_user("Administrator")
    return {"passed": True, "scopes": result}
