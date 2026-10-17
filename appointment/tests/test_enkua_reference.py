"""Enkua content refresh preserves booking identities and other showcases."""
import copy
import unittest

from appointment.demo.new_template_showcases import SHOWCASES
from appointment.public_experience.recipes import _read
from appointment.public_experience.section_schemas import validate_typed_section


class TestEnkuaReference(unittest.TestCase):
    def test_refresh_replaces_old_copy_without_changing_service_ids(self):
        showcase = next(item for item in SHOWCASES if item.key == "enkua")
        starter = _read("public_experience/manifest/content/enkua-photography.v3.json")["sections"]
        stale = copy.deepcopy(starter)
        stale["hero"]["title"] = {"en": "Old title", "am": "የቀድሞ ርዕስ"}
        stale["gallery"]["items"] = []
        services = {row.name: f"service-{index}" for index, row in enumerate(showcase.sessions)}
        content = showcase.sections(stale, "owned-provider", {"in_person": "owned-office", "online": "owned-video"}, services)
        self.assertEqual(content["hero"]["title"], starter["hero"]["title"])
        self.assertEqual(len(content["gallery"]["items"]), 5)
        self.assertEqual([row["id"] for row in content["services"]["items"]], list(services.values()))
        self.assertEqual(content["providers"]["items"][0]["id"], "owned-provider")
        self.assertEqual(content["providers"]["items"][0]["name"]["en"], "Dawit Girma")
        self.assertIn("founder-r2.webp", content["providers"]["items"][0]["image"])
        self.assertEqual(len(content["process"]["items"]), 4)
        self.assertEqual(stale["gallery"]["items"], [])
        for kind, value in content.items():
            with self.subTest(section=kind):
                self.assertEqual(validate_typed_section(kind, value).issues, ())

    def test_known_reference_revisions_leave_other_showcases_unchanged(self):
        for showcase in SHOWCASES:
            self.assertEqual(showcase.version, {"enkua": 7, "mizan": 9, "meseret": 7, "buna": 8, "hana": 9}.get(showcase.key, 6))
