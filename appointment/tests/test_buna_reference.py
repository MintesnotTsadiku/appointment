"""Buna refresh keeps booking identities while replacing stale reference content."""
import copy
import unittest

from appointment.demo.new_template_showcases import SHOWCASES
from appointment.public_experience.recipes import _read
from appointment.public_experience.section_schemas import validate_typed_section


class TestBunaReference(unittest.TestCase):
    def test_refresh_keeps_booking_identity_and_staff_is_display_only(self):
        showcase = next(item for item in SHOWCASES if item.key == "buna")
        defaults = _read("public_experience/manifest/content/buna-experiences.v3.json")["sections"]
        stale = copy.deepcopy(defaults)
        stale["hero"]["title"] = {"en": "Old title", "am": "የቀድሞ ርዕስ"}
        services = {row.name: f"service-{i}" for i, row in enumerate(showcase.sessions)}
        content = showcase.sections(stale, "owned-lead", {"in_person": "owned-office", "online": "owned-video"}, services)
        self.assertEqual(content["hero"]["title"], defaults["hero"]["title"])
        self.assertEqual([item["id"] for item in content["services"]["items"]], list(services.values()))
        self.assertEqual(len(content["services"]["items"]), 4)
        self.assertEqual(content["providers"]["items"][0]["id"], "owned-lead")
        self.assertNotIn("id", content["providers"]["items"][1])
        self.assertNotIn("action", content["providers"]["items"][1])
        self.assertEqual(len(content["process"]["items"]), 4)
        self.assertEqual(content["locations"]["items"][0]["id"], "owned-office")
        self.assertEqual(stale["hero"]["title"]["en"], "Old title")
        for kind, value in content.items():
            with self.subTest(section=kind):
                self.assertEqual(validate_typed_section(kind, value).issues, ())
