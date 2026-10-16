"""Mizan refresh keeps booking identities while replacing stale reference content."""
import copy
import unittest

from appointment.demo.new_template_showcases import SHOWCASES
from appointment.public_experience.recipes import _read
from appointment.public_experience.section_schemas import validate_typed_section


class TestMizanReference(unittest.TestCase):
    def test_refresh_keeps_booking_identity_and_staff_is_display_only(self):
        showcase = next(item for item in SHOWCASES if item.key == "mizan")
        defaults = _read("public_experience/manifest/content/mizan-inspection.v3.json")["sections"]
        stale = copy.deepcopy(defaults)
        stale["hero"]["title"] = {"en": "Old title", "am": "የቀድሞ ርዕስ"}
        services = {row.name: f"service-{i}" for i, row in enumerate(showcase.sessions)}
        content = showcase.sections(stale, "owned-lead", {"in_person": "owned-office", "online": "owned-video"}, services)
        self.assertEqual(content["hero"]["title"], defaults["hero"]["title"])
        self.assertEqual([item["id"] for item in content["services"]["items"]], list(services.values()))
        self.assertEqual(content["providers"]["items"][0]["id"], "owned-lead")
        self.assertNotIn("id", content["providers"]["items"][1])
        self.assertNotIn("action", content["providers"]["items"][1])
        self.assertEqual(len(content["process"]["items"]), 6)
        self.assertEqual(content["locations"]["items"][0]["id"], "owned-office")
        self.assertEqual(stale["hero"]["title"]["en"], "Old title")
        for kind, value in content.items():
            with self.subTest(section=kind):
                self.assertEqual(validate_typed_section(kind, value).issues, ())

    def test_scoped_refresh_never_visits_other_showcases(self):
        from contextlib import nullcontext
        from unittest.mock import patch
        from appointment.demo import showcase_refinement as target
        import frappe

        state = {"independents": {"mizan": {"version": 6}, "enkua": {"version": 7}}, "created": []}
        original_other = copy.deepcopy(state["independents"]["enkua"])
        with patch.object(target.showcase, "locked", return_value=nullcontext()), \
             patch.object(target.showcase, "load_state", return_value=state), \
             patch.object(target, "_validate_ownership"), \
             patch.object(target.independent_showcase, "refresh") as update, \
             patch.object(target.showcase, "write_state") as write, \
             patch.object(frappe.db, "commit") as commit:
            result = target.refresh("mizan")
            self.assertTrue(result["changed"])
            update.assert_called_once()
            self.assertEqual(update.call_args.args[0].key, "mizan")
            self.assertIs(update.call_args.args[1], state["independents"]["mizan"])
            self.assertEqual(state["independents"]["enkua"], original_other)
            self.assertFalse(target.refresh("mizan")["changed"])
            update.assert_called_once()
            write.assert_called_once()
            commit.assert_called_once()
        frappe.db.rollback()
