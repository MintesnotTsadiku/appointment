# Website section editor

The website section editor is the "Content" step of website setup (`/settings/website`). An owner of an organization or an independent provider uses it to change the text, lists, session formats and photos of each section of the public website. It works for every template, because the server describes each section's editable fields.

## What the owner can do

- Choose a section from the row of section buttons. A red dot marks a section with a problem.
- Edit each text field in English and Amharic. The two boxes are side by side.
- Edit list items: needs, ways of working, steps, sessions, people, credentials, quotes, FAQ, phone lines, place cards and footer links. The owner can add an item, edit it, move it up or down, and remove it. A remove needs a confirmation.
- Edit short line lists inside an item: place notes, the online card's "how it works" steps, highlights, specialties and short credentials.
- Set the format of each session: "Auto", "In person", "Online video" or "Phone". "Auto" shows the format of the session's location and its source ("From its location" or "From its name").
- Set the type of each place card: "Auto", "In person" (office card) or "Online video" (online card).
- Add a photo to each image slot, by upload or from the website's media library. The owner sets the focal point, writes the photo description in English and Amharic, and can go back to the template's own photo.
- See the page change in the preview while typing. The preview scrolls to the section that the owner edits. "Show in Amharic" shows the Amharic page.

Sessions, people and footer links come from business settings. The owner cannot add these items in the editor. The owner can change their website text, their order, and remove them from the page. The editor shows the length and fee of a session as facts from business settings.

Edits change the draft. Visitors see the edits after "Publish" in the "Readiness" step, as before.

## Photo slots and the gallery (template v3)

- The process, testimonials and contact sections have a photo slot. Each process step also has one.
- A recipe that supports the `gallery` section gets an empty gallery in a new draft. The owner adds up to 12 photos, each with a description and an optional caption. A gallery item without a photo cannot be saved ("Add a photo, or remove this item."). The list has `imageRequired` in `EDITOR_SCHEMA`.
- An empty gallery and an empty slot show the template's own photos. See `docs/design/TEMPLATE_V3_KIT.md`.

## How the editor knows the fields

`appointment/public_experience/section_editor.py` has `EDITOR_SCHEMA`. For each section type it lists:

- `fields`: each field's key, kind (`text`, `long`, `plain`, `phone`, `format`, `consent`, `strings`), whether English is required, and the maximum length. `phone` is a number under the app's phone rule (place phones and the contact phone). `plain` is an email (`pattern: email`) or a notice line as people dial it (`pattern: dial`, for example 991).
- `image`: the section has an image slot (`image`, `imageAlt`, `imageFocus`).
- `list`: the item fields, the maximum number of items, whether the owner can add items, the item's image slot, and the keys that a new item gets (`numbered`, `inherit`, `defaults`, `generatedId`).

`setup.state()` sends `editorSchema`, `derivedFormats` and `mediaLimits` to the page. The forms in `frontend/src/pages/settings/website-editor/` read only this description. To make a new section editable, add its entry to `EDITOR_SCHEMA` and its rule to `section_schemas.py`. The test `test_every_editor_field_is_accepted_by_its_section_schema` builds content from each entry and validates it, so the two files cannot drift apart.

## Validation

The editor checks each section before it saves, with the same rules as the server: required English text, maximum lengths, maximum items, phone numbers (the shared phone rule, `controls.phone.hint`), notice line and email shape, photo description and quote consent. The messages are in English and Amharic (`staff.website.editor.issue.*`). The editor does not save while a changed section has a problem. It opens the section with the problem instead.

`setup.save()` stores each changed phone in E.164 form and refuses a changed phone that is not usable (`section_editor.normalize_phones`). A phone that the stored section already has is not checked again, in the editor or on the server, so the showcases' placeholder numbers do not block other edits. See `docs/growth/PHONE_FIRST.md`.

`setup.save()` validates each changed section again with `validate_typed_section`. It refuses the save and names the field when a section is not valid. Sections that did not change are not validated again, so an older draft can still move between steps.

## How Amharic is kept

Before this change, an English edit replaced a field with `{"en": ...}` and dropped its Amharic. Now two parts keep it:

1. The page changes only the edited language (`setLocale` in `core.ts`). A cleared box is sent as `""`.
2. `setup.save()` merges each edited section into the stored one (`content_merge.merge_content`):
   - A language that the edit leaves out keeps its stored text.
   - A language sent as `""` is cleared. A field with no text left is removed.
   - Other keys follow the edit. A key that the edit leaves out is removed, for example a photo reset.
   - List items with an `id` (sessions, people, places) are matched by `id`, so a reorder keeps their Amharic.
   - List items without an `id` (FAQ, steps, notes) are taken as sent, because a reorder changes their positions. The editor always sends both languages for them.

These rules apply to every field and every client, not only the editor.

## Session formats

A session's format on the website comes from, in this order:

1. The owner's choice in the editor (`format` in the section content).
2. The format of the session's location. `session_formats.py` reads `Location.location_type` (In person or Online). An online location whose platform contains "phone" or "ስልክ" meets by phone. A session with offerings in two formats has no single format.
3. The template's own reading of the session name ("online", "video", "phone" and their Amharic words).

"Auto" removes `format` from the content. Public pages get the location facts live from `get_public_experience_snapshot` (`sessionFormats`, `placeFormats`). The publisher does not write derived formats into a release.

## Photos and upload safety

- Uploads use `upload_website_section_image`. Only a person who manages the business can upload (`setup.require_site`). The owner must confirm permission to show the photo.
- The server decodes the file with Pillow and accepts JPEG, PNG and WebP only. It refuses SVG and other files. It re-encodes the image, which removes metadata such as the location. The limits are the same as for logos and gallery images: 5 MB, 6000 pixels on a side, 200 files and 50 MB for each website library.
- The photo is a public File attached to the owner's Public Site, with a generated flat name (`/files/section-<hash>.webp`).
- `website_media_library` lists the public images of the website, except logos. It shows the gallery's alt text when one is known.
- A section may show only a packaged template asset or a flat `/files/` name. `setup.save()` and the publisher refuse a photo that is not attached to the same site. A photo from another business fails with a permission error.
- An owner photo needs an English description. The editor suggests the section title as a start.
- `imageFocus` (`x` and `y` from 0 to 100) moves the crop. Ergata uses it for every photo. Other templates show the photo with their own crop.
- A photo that a published release uses cannot be deleted (`media_access.on_trash`).

## Tests

- `appointment.tests.test_website_editor`: schema contract for every editor field, list limits, required item fields, closed formats, image paths, alt text and focus, the bilingual merge, uploads (owner, other business, consent, non-images), a photo from another site, reorder and remove with a photo, an English-only edit that keeps Amharic, an invalid item, and derived formats from locations. The owner tests use a savepoint, patch `frappe.db.commit`, delete their uploaded files by exact name and roll back.
- `frontend/tests/website-editor.test.mjs`: list moves, new items, bilingual edits, cleaning, validation, the format order, the live preview overlay and the media helpers.

## Browser QA

The fixture `appointment.tests.website_editor_qa_fixtures` uses the Ergata showcase (Yared Tesfaye Counselling). `browser_values()` keeps a copy of the showcase content. `restore()` writes the copy back and publishes it. Run `restore()` after each manifest run.

- `qa/manifests/growth/website-editor.yaml`: English, desktop, light.
- `qa/manifests/growth/website-editor-am-dark.yaml`: Amharic, phone, dark.

The photos that a run uploads stay in the showcase media library, because a published release uses them.

The two manifests also type a place phone that does not fit (the hint shows, in English and Amharic), put the stored placeholder back, and (English run) type the contact phone `0911 22 33 44`. The public page then shows `+251 91 122 3344` with a `tel:+251911223344` link. `restore()` puts the placeholder back.

After the photo slots and the gallery (2026-10-15): BQA-2026-00273 (`website-editor.yaml`) and BQA-2026-00274 (`website-editor-am-dark.yaml`) passed with 0 network errors.

Runs of 2026-10-15: BQA-2026-00232 (`website-editor.yaml`) and BQA-2026-00231 (`website-editor-am-dark.yaml`) passed with 0 network errors and the known console notices.

Runs of 2026-10-14:

| Run | Manifest | Result |
|---|---|---|
| BQA-2026-00045 | `website-editor.yaml` | Passed. 0 network errors. Console: the known sandboxed preview iframe notice and the reduced-motion notice. |
| BQA-2026-00047 | `website-editor-am-dark.yaml` | Passed. 0 network errors. Console: the same two known notices. |

After the runs, `restore()` put the showcase content back and published it.
