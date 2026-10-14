"""Independent-provider showcases: complete definitions, shared by the seeder and the QA fixture."""

import unittest

from appointment.demo import ergata_showcase, independent_showcase, independent_world
from appointment.public_experience.recipes import get_recipe
from appointment.public_experience.section_schemas import validate_typed_section
from appointment.public_experience.showcase_catalog import validate_showcase_catalog
from appointment.tests import template_ergata_qa_fixtures as fixture


def _starter_draft(recipe):
    """A guided-setup draft of the recipe with business facts, as `setup.start` makes it."""
    from appointment.public_experience.setup import _apply_starter, starter_content

    text = lambda value: {"en": value}  # noqa: E731
    content = {kind: {"title": text(kind), "items": []} for kind in recipe.required_sections}
    content["hero"] = {"title": text("Practice"), "primaryAction": {"intent": "booking_start", "label": text("Book"), "placement": "primary"}}
    content["about"] = {"title": text("About"), "body": text("A practice.")}
    content["contact"] = {"title": text("Contact")}
    content["booking_cta"] = {"title": text("Book"), "action": {"intent": "booking_start", "label": text("Book"), "placement": "primary"}}
    content["footer"] = {"body": text("Practice"), "items": []}
    _apply_starter(content, starter_content(recipe), team=False, contact_first=False, intro_call=True)
    return content


class TestIndependentShowcases(unittest.TestCase):
    def test_every_definition_is_complete_and_in_the_catalog(self):
        catalog = validate_showcase_catalog()["sites"]
        self.assertIn("ergata", independent_world.SHOWCASES)
        for key, showcase in independent_world.SHOWCASES.items():
            self.assertEqual(independent_showcase.problems(showcase), [], key)
            self.assertEqual((catalog[key]["slug"], catalog[key]["recipe"]), (showcase.slug, showcase.recipe))
            self.assertIn(showcase.portrait, {row["asset"] for row in catalog[key]["providerAssets"]})
            self.assertEqual((showcase.logo, showcase.favicon), (catalog[key]["logoAsset"], catalog[key]["faviconAsset"]))

    def test_ergata_content_is_bilingual_and_valid_for_the_recipe(self):
        showcase = ergata_showcase.SHOWCASE
        recipe = get_recipe(showcase.recipe)
        services = {row.name: f"SRV-{index}" for index, row in enumerate(showcase.sessions)}
        content = showcase.sections(_starter_draft(recipe), "Yared Tesfaye Counselling",
                                    {"in_person": showcase.office.name, "online": showcase.online.name}, services)
        self.assertEqual(set(content), set(recipe.required_sections))
        for kind in recipe.required_sections:
            report = validate_typed_section(kind, content[kind], allowed_intents=recipe.action_intents)
            self.assertTrue(report.ok, (kind, report.issues))
        self.assertEqual([row["id"] for row in content["services"]["items"]], list(services.values()))
        self.assertTrue(all(row["name"]["am"] and row["summary"]["am"] for row in content["services"]["items"]))
        self.assertEqual([row["id"] for row in content["locations"]["items"]], [showcase.office.name, showcase.online.name])
        self.assertTrue(content["about"]["body"]["am"] and content["hero"]["eyebrow"]["am"])

    def test_the_qa_fixture_uses_the_shared_definition(self):
        showcase = ergata_showcase.SHOWCASE
        self.assertIs(fixture.SHOWCASE, showcase)
        self.assertIs(fixture.SESSIONS, showcase.sessions)
        self.assertEqual((fixture.SOLO, fixture.SLUG, fixture.BUSINESS), (showcase.owner_email, showcase.slug, showcase.business))
        self.assertEqual((fixture.OFFICE, fixture.ONLINE, fixture.PHONE), (showcase.office.name, showcase.online.name, showcase.phone))
        self.assertFalse(hasattr(fixture, "_showcase_sections"), "the fixture keeps no copy of the showcase content")
        self.assertEqual(showcase.qa_fixture, fixture.__name__)

    def test_problems_names_what_is_missing(self):
        from dataclasses import replace

        showcase = ergata_showcase.SHOWCASE
        online_only = replace(showcase, sessions=tuple(row for row in showcase.sessions if row.meet == "online"))
        self.assertIn("sessions in the office and online", independent_showcase.problems(online_only))
        no_link = replace(showcase, online=replace(showcase.online, meeting_link="http://meet.example"))
        self.assertTrue(any("meeting link" in issue for issue in independent_showcase.problems(no_link)))
        self.assertTrue(any("Amharic" in issue for issue in independent_showcase.problems(replace(showcase, bio_am=""))))


if __name__ == "__main__":
    unittest.main()
