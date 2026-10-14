"""The website section editor: list items, session formats, image slots, uploads and translations.

Pure contract tests run anywhere. The owner tests create two independent practitioners inside a savepoint,
patch `frappe.db.commit`, delete the image files they upload by exact name and roll everything back.
"""

import base64
import copy
import unittest
from pathlib import Path
from unittest.mock import patch

import frappe

from appointment.public_experience.content_merge import merge_content
from appointment.public_experience.section_editor import EDITOR_SCHEMA
from appointment.public_experience.section_schemas import validate_typed_section


def t(en, am=None):
    return {"en": en, **({"am": am} if am else {})}


def _sample_value(field):
    kind = field["kind"]
    if kind in {"text", "long"}:
        return t("Plain words", "ቀላል ቃላት")
    if kind == "plain":
        return {"email": "hello@example.test", "dial": "991"}[field["pattern"]]
    if kind == "phone":
        return "+251911223344"
    if kind == "format":
        return field["options"][-1]
    if kind == "consent":
        return True
    if kind == "strings":
        return [t("One line", "አንድ መስመር")]
    raise AssertionError(kind)


def _sample_section(kind):
    """Content with every editable field filled, built only from the editor description."""
    schema = EDITOR_SCHEMA[kind]
    content = {field["key"]: _sample_value(field) for field in schema["fields"]}
    if schema.get("image"):
        content.update({"image": "/assets/appointment/brand-experience/support/ergata/room.webp",
                        "imageAlt": t("A quiet room", "ጸጥ ያለ ክፍል"), "imageFocus": {"x": 40, "y": 60}})
    listing = schema.get("list")
    if listing:
        item = {field["key"]: _sample_value(field) for field in listing["fields"]}
        item.update(listing.get("defaults") or {})
        item.update({"consent": True} if kind == "testimonials" else {})
        if listing.get("numbered"):
            item[listing["numbered"]] = 1
        if kind in {"services", "providers", "locations"}:
            item["id"] = "record-1"
        if kind == "services":
            item.update({"durationMinutes": 50, "price": 1200, "currency": "ETB"})
        if listing.get("image"):
            item.update({"image": "/files/section-abc123.webp", "imageAlt": t("A door")})
        content["items"] = [item]
    if kind == "booking_cta":
        content["action"] = {"intent": "booking_start", "label": t("Book"), "placement": "primary"}
    return content


class EditorSchemaContractTests(unittest.TestCase):
    def test_every_editor_field_is_accepted_by_its_section_schema(self):
        for kind in EDITOR_SCHEMA:
            with self.subTest(kind=kind):
                report = validate_typed_section(kind, _sample_section(kind))
                self.assertTrue(report.ok, [issue.field + ": " + issue.rule for issue in report.issues])

    def test_list_limits_match_the_validators(self):
        for kind, schema in EDITOR_SCHEMA.items():
            listing = schema.get("list")
            if not listing:
                continue
            with self.subTest(kind=kind):
                content = _sample_section(kind)
                content["items"] = [copy.deepcopy(content["items"][0]) for _ in range(listing["maxItems"] + 1)]
                self.assertIn("max_items", {issue.rule for issue in validate_typed_section(kind, content).issues})

    def test_list_items_need_their_required_fields(self):
        content = _sample_section("faq")
        content["items"].append({"question": t("Is it private?")})
        fields = {issue.field for issue in validate_typed_section("faq", content).issues}
        self.assertIn("items[1].answer", fields)

    def test_session_and_place_formats_are_closed(self):
        services = _sample_section("services")
        services["items"][0]["format"] = "carrier_pigeon"
        self.assertEqual([issue.rule for issue in validate_typed_section("services", services).issues], ["enum"])
        places = _sample_section("locations")
        places["items"][0]["format"] = "phone"
        self.assertEqual([issue.rule for issue in validate_typed_section("locations", places).issues], ["enum"])

    def test_image_slots_take_packaged_assets_or_flat_owner_files_only(self):
        for image in ("https://example.test/a.webp", "/files/../private/files/a.webp", "/private/files/a.webp",
                      "/files/sub/dir.webp", "javascript:alert(1)"):
            with self.subTest(image=image):
                content = _sample_section("faq")
                content["image"] = image
                self.assertIn("local_asset", {issue.rule for issue in validate_typed_section("faq", content).issues})
        content = _sample_section("faq")
        content["image"] = "/files/section-0f3a9c.webp"
        self.assertTrue(validate_typed_section("faq", content).ok)

    def test_an_owner_photo_needs_english_alt_text_and_a_valid_focus(self):
        content = _sample_section("notice")
        content.update({"image": "/files/section-0f3a9c.webp", "imageAlt": t("", "ፎቶ")})
        rules = {issue.rule for issue in validate_typed_section("notice", content).issues}
        self.assertIn("alt_required", rules)
        content.update({"imageAlt": t("Two cups of tea"), "imageFocus": {"x": 120, "y": 5}})
        self.assertEqual([issue.rule for issue in validate_typed_section("notice", content).issues], ["focus"])


class PhoneFieldTests(unittest.TestCase):
    def test_place_and_contact_phones_use_the_phone_rule_and_notice_lines_take_short_codes(self):
        self.assertEqual(next(field for field in EDITOR_SCHEMA["contact"]["fields"] if field["key"] == "phone")["kind"], "phone")
        self.assertEqual(next(field for field in EDITOR_SCHEMA["locations"]["list"]["fields"] if field["key"] == "phone")["kind"], "phone")
        notice = next(field for field in EDITOR_SCHEMA["notice"]["list"]["fields"] if field["key"] == "phone")
        self.assertEqual((notice["kind"], notice["pattern"]), ("plain", "dial"))

    def test_a_changed_phone_is_stored_in_e164_form(self):
        from appointment.public_experience.section_editor import normalize_phones

        stored = {"phone": "+251911223344", "items": [{"id": "p1", "phone": "+251111234567"}]}
        contact = normalize_phones("contact", {"phone": "0711 22 33 44"}, stored)
        self.assertEqual(contact["phone"], "+251711223344")
        places = normalize_phones("locations", {"items": [{"id": "p1", "phone": "011 123 4567"}, {"id": "p2", "phone": "+44 20 7946 0958"}]}, stored)
        self.assertEqual([item["phone"] for item in places["items"]], ["+251111234567", "+442079460958"])

    def test_a_changed_phone_that_is_not_usable_is_refused_with_the_hint(self):
        from appointment.helpers.phone import hint
        from appointment.public_experience.section_editor import normalize_phones

        with self.assertRaises(frappe.ValidationError) as raised:
            normalize_phones("locations", {"items": [{"id": "p1", "phone": "0911 22 33"}]}, {"items": []})
        self.assertIn("items[0].phone", str(raised.exception))
        self.assertIn(hint(), str(raised.exception))

    def test_a_stored_placeholder_number_does_not_block_other_edits(self):
        from appointment.public_experience.section_editor import normalize_phones

        stored = {"phone": "000 000 0101", "items": [{"id": "p1", "phone": "000 000 0102"}, {"id": "p2", "phone": "000 000 0103"}]}
        edited = {"title": t("Visit us"), "phone": "000 000 0101",
                  "items": [{"id": "p2", "phone": "000 000 0103"}, {"id": "p1", "phone": "000 000 0102"}]}
        self.assertEqual(normalize_phones("contact", copy.deepcopy(edited), stored)["phone"], "000 000 0101")
        self.assertEqual(normalize_phones("locations", copy.deepcopy(edited), stored)["items"], edited["items"])

    def test_the_showcase_seeders_keep_their_placeholder_numbers(self):
        from appointment.helpers.phone import placeholder_numbers
        from appointment.public_experience.section_editor import normalize_phones

        with placeholder_numbers():
            self.assertEqual(normalize_phones("contact", {"phone": "000 000 0109"}, {})["phone"], "000 000 0109")


class BilingualMergeTests(unittest.TestCase):
    def test_an_english_edit_keeps_the_stored_amharic(self):
        stored = {"title": t("Questions", "ጥያቄዎች"), "items": [{"question": t("Q", "ጥ"), "answer": t("A", "መ")}]}
        edited = {"title": {"en": "Common questions"}, "items": stored["items"]}
        self.assertEqual(merge_content(stored, edited)["title"], t("Common questions", "ጥያቄዎች"))

    def test_an_empty_locale_clears_it_and_an_empty_value_is_removed(self):
        stored = {"title": t("Hello", "ሰላም"), "eyebrow": t("Calm", "እርጋታ")}
        merged = merge_content(stored, {"title": {"en": "Hello", "am": ""}, "eyebrow": {"en": " ", "am": ""}})
        self.assertEqual(merged, {"title": {"en": "Hello"}})

    def test_left_out_keys_follow_the_edit_so_an_image_can_be_reset(self):
        stored = {"title": t("Hi"), "image": "/files/section-a.webp", "imageAlt": t("A", "ሀ")}
        self.assertEqual(merge_content(stored, {"title": {"en": "Hi"}}), {"title": t("Hi")})

    def test_records_with_an_id_keep_their_amharic_after_a_reorder(self):
        stored = {"items": [{"id": "a", "name": t("Office", "ቢሮ")}, {"id": "b", "name": t("Online", "ኦንላይን")}]}
        edited = {"items": [{"id": "b", "name": {"en": "Video"}}, {"id": "a", "name": {"en": "Office"}}]}
        self.assertEqual(merge_content(stored, edited)["items"],
                         [{"id": "b", "name": t("Video", "ኦንላይን")}, {"id": "a", "name": t("Office", "ቢሮ")}])

    def test_records_without_an_id_are_taken_as_sent(self):
        stored = {"items": [{"question": t("One", "አንድ")}, {"question": t("Two", "ሁለት")}]}
        edited = {"items": [{"question": t("Two", "ሁለት")}]}
        self.assertEqual(merge_content(stored, edited)["items"], [{"question": t("Two", "ሁለት")}])


class OwnerEditorTests(unittest.TestCase):
    """Two independent practitioners, each with an Ergata website draft."""

    def setUp(self):
        frappe.set_user("Administrator")
        self.commit = patch.object(frappe.db, "commit")
        self.commit.start()
        frappe.db.savepoint("website_editor_test")
        self.uploads = []
        suffix = frappe.generate_hash(length=8)
        self.owner_a, self.site_a = self._practice(f"selam.editor.{suffix}@example.test", "Selam", f"Selam Counselling {suffix}")
        self.owner_b, self.site_b = self._practice(f"dawit.editor.{suffix}@example.test", "Dawit", f"Dawit Therapy {suffix}")
        frappe.set_user(self.owner_a)

    def tearDown(self):
        frappe.set_user("Administrator")
        for name in self.uploads:
            if name and frappe.db.exists("File", name):
                frappe.delete_doc("File", name, force=True, ignore_permissions=True)
        frappe.db.rollback(save_point="website_editor_test")
        self.commit.stop()

    def _practice(self, email, first, business):
        from appointment.public_experience import setup, solo_setup

        frappe.get_doc(dict(doctype="User", email=email, first_name=first, last_name="Tesfaye", send_welcome_email=0,
                            enabled=1, user_type="System User", roles=[{"role": "Provider"}])).insert(ignore_permissions=True)
        frappe.set_user(email)
        provider = solo_setup.create(business)["provider"]
        slug = "editor-" + frappe.generate_hash(length=10)
        site = setup.start("Provider", provider, business, slug, "ergata-therapy", {"industry": "therapy"})["site"]
        frappe.set_user("Administrator")
        return email, site

    def _image(self):
        path = Path(frappe.get_app_path("appointment")) / "public/brand-experience/support/ergata/faq-tea-m.webp"
        return base64.b64encode(path.read_bytes()).decode()

    def _upload(self, site):
        from appointment.public_experience import section_media

        result = section_media.upload(site, self._image(), 1)
        self.uploads.append(result["name"])
        return result

    def _state(self, site):
        from appointment.public_experience import setup

        return setup.state(setup.require_site(site))

    def _save(self, state, sections):
        from appointment.public_experience import setup

        return setup.save(state["site"], state["draftVersion"], "content", sections=sections)

    def test_owner_uploads_a_sanitised_photo_into_their_own_library(self):
        from appointment.public_experience import section_media

        result = self._upload(self.site_a)
        self.assertTrue(result["url"].startswith("/files/section-"))
        self.assertTrue(result["url"].endswith(".webp"))
        stored = frappe.db.get_value("File", result["name"], ["attached_to_doctype", "attached_to_name", "is_private"], as_dict=True)
        self.assertEqual((stored.attached_to_doctype, stored.attached_to_name, stored.is_private), ("Public Site", self.site_a, 0))
        self.assertIn(result["url"], [row["url"] for row in section_media.library(self.site_a)["items"]])

    def test_another_business_cannot_upload_to_or_list_this_library(self):
        from appointment.public_experience import section_media

        frappe.set_user(self.owner_b)
        before = frappe.db.count("File", {"attached_to_name": self.site_a})
        with self.assertRaises(frappe.PermissionError):
            section_media.upload(self.site_a, self._image(), 1)
        with self.assertRaises(frappe.PermissionError):
            section_media.library(self.site_a)
        self.assertEqual(frappe.db.count("File", {"attached_to_name": self.site_a}), before)

    def test_upload_refuses_missing_consent_and_files_that_are_not_images(self):
        from appointment.public_experience import section_media

        with self.assertRaises(frappe.ValidationError):
            section_media.upload(self.site_a, self._image(), 0)
        with self.assertRaises(frappe.ValidationError):
            section_media.upload(self.site_a, base64.b64encode(b"<svg onload=alert(1)></svg>").decode(), 1)

    def test_a_section_cannot_show_a_photo_from_another_website(self):
        frappe.set_user(self.owner_b)
        foreign = self._upload(self.site_b)
        frappe.set_user(self.owner_a)
        state = self._state(self.site_a)
        sections = copy.deepcopy(state["sections"])
        faq = next(row for row in sections if row["type"] == "faq")["content"]
        faq.update({"image": foreign["url"], "imageAlt": t("Tea by a window")})
        with self.assertRaises(frappe.PermissionError):
            self._save(state, sections)

    def test_faq_photo_reorder_remove_and_format_override_are_saved_and_previewed(self):
        from appointment.public_experience import setup

        frappe.set_user(self.owner_a)
        own = self._upload(self.site_a)
        state = self._state(self.site_a)
        sections = copy.deepcopy(state["sections"])
        faq = next(row for row in sections if row["type"] == "faq")["content"]
        first, second, *rest = faq["items"]
        faq["items"] = [second, first, *rest[:-1]]
        faq.update({"image": own["url"], "imageAlt": t("Tea by a window", "በመስኮት አጠገብ ሻይ"), "imageFocus": {"x": 30, "y": 70}})
        saved = self._save(state, sections)
        stored = next(row for row in saved["sections"] if row["type"] == "faq")["content"]
        self.assertEqual(stored["items"][0], second)
        self.assertEqual(len(stored["items"]), len(rest) + 1)
        self.assertEqual(stored["image"], own["url"])
        preview = setup.preview(saved["site"], saved["draftVersion"])
        projected = next(row for row in preview["sections"] if row["type"] == "faq")["content"]
        self.assertEqual(projected["imageFocus"], {"x": 30, "y": 70})

    def test_an_english_only_edit_keeps_every_amharic_value(self):
        state = self._state(self.site_a)
        frappe.set_user(self.owner_a)
        sections = copy.deepcopy(state["sections"])
        hero = next(row for row in sections if row["type"] == "hero")["content"]
        am_before = hero["title"].get("am")
        self.assertTrue(am_before, "Ergata starter copy has Amharic")
        hero["title"] = {"en": "A calm place to talk"}
        saved = self._save(state, sections)
        title = next(row for row in saved["sections"] if row["type"] == "hero")["content"]["title"]
        self.assertEqual(title, {"en": "A calm place to talk", "am": am_before})

    def test_an_invalid_list_item_is_refused_with_its_field(self):
        state = self._state(self.site_a)
        frappe.set_user(self.owner_a)
        sections = copy.deepcopy(state["sections"])
        faq = next(row for row in sections if row["type"] == "faq")["content"]
        faq["items"].append({"question": {"en": "Where do we meet?"}})
        with self.assertRaises(frappe.ValidationError) as raised:
            self._save(state, sections)
        self.assertIn("items[", str(raised.exception))

    def test_a_contact_phone_edit_is_stored_in_e164_form_and_keeps_the_amharic(self):
        state = self._state(self.site_a)
        frappe.set_user(self.owner_a)
        sections = copy.deepcopy(state["sections"])
        contact = next(row for row in sections if row["type"] == "contact")["content"]
        title_before = contact.get("title")
        contact.update({"phone": "0911 22 33 44", "title": {"en": "Talk to us"}})
        saved = self._save(state, sections)
        stored = next(row for row in saved["sections"] if row["type"] == "contact")["content"]
        self.assertEqual(stored["phone"], "+251911223344")
        if isinstance(title_before, dict) and title_before.get("am"):
            self.assertEqual(stored["title"], {"en": "Talk to us", "am": title_before["am"]})
        contact.update({"phone": "12345"})
        with self.assertRaises(frappe.ValidationError):
            self._save(saved, [row if row["type"] != "contact" else {"type": "contact", "content": contact} for row in saved["sections"]])

    def test_state_describes_the_editor_for_every_section_of_the_recipe(self):
        state = self._state(self.site_a)
        self.assertTrue({row["type"] for row in state["sections"]} <= set(state["editorSchema"]))
        self.assertEqual(set(state["derivedFormats"]), {"services", "places"})
        self.assertEqual(state["mediaLimits"]["maxBytes"], 5 * 1024 * 1024)

    def test_auto_format_follows_the_location_of_each_session(self):
        from appointment.public_experience import session_formats

        frappe.set_user("Administrator")
        provider = frappe.db.get_value("Public Site", self.site_a, "provider")
        rooms = {}
        for name, kind, platform in (("Phone line", "Online", "Phone call"), ("Video room", "Online", "Google Meet"), ("Kazanchis office", "In person", "")):
            rooms[name] = frappe.get_doc({"doctype": "Location", "location_name": name, "independent_provider": provider,
                                          "timezone": "Africa/Addis_Ababa", "is_active": 1, "location_type": kind,
                                          "video_platform": platform, **({"meeting_link_mode": "Per booking"} if kind == "Online" else {})}).insert(ignore_permissions=True).name
        sessions = {}
        for name, room in (("Phone check-in", "Phone line"), ("Video session", "Video room"), ("Office session", "Kazanchis office")):
            service = frappe.get_doc({"doctype": "Service", "service_name": name, "independent_provider": provider, "duration": 50,
                                      "price": 1000, "use_default_hours": 1, "is_active": 1}).insert(ignore_permissions=True)
            frappe.get_doc({"doctype": "EventType", "event_type_name": name, "service": service.name, "location": rooms[room],
                            "provider": provider, "is_active": 1}).insert(ignore_permissions=True)
            sessions[name] = service.name
        derived = session_formats.for_site(frappe.get_doc("Public Site", self.site_a)).as_dict()
        self.assertEqual(derived["services"][sessions["Phone check-in"]], "phone")
        self.assertEqual(derived["services"][sessions["Video session"]], "online")
        self.assertEqual(derived["services"][sessions["Office session"]], "in_person")
        self.assertEqual(derived["places"][rooms["Video room"][:64]], "online")
