"""Tests for platform marketing-page settings containment."""

import json
from pathlib import Path

from frappe.tests import UnitTestCase

from appointment.scheduler.doctype.landing_page_settings.api import get_landing_page_settings


RETIRED_DESIGN_FIELDS = {
    "brand_tab",
    "brand_primary_color",
    "logo_light",
    "logo_dark",
    "favicon",
    "theme_tab",
    "dark_bg_primary",
    "accent_primary",
    "status_pending",
    "gradient_primary_from",
}


class UnitTestLandingPageSettings(UnitTestCase):
    def test_schema_has_no_brand_or_theme_authority(self):
        schema_path = Path(__file__).with_name("landing_page_settings.json")
        schema = json.loads(schema_path.read_text(encoding="utf-8"))
        field_names = set(schema["field_order"])

        self.assertFalse(RETIRED_DESIGN_FIELDS & field_names)


class UnitTestLandingPageSettingsApi(UnitTestCase):
    def test_platform_content_response_has_no_brand_payload(self):
        response = get_landing_page_settings()

        self.assertTrue(response["success"])
        self.assertIn("hero", response["data"])
        self.assertNotIn("brand", response["data"])
