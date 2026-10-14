"""One phone number rule for the whole app.

Every phone number is stored in E.164 form (`+251911223344`) and shown in the
international form (`+251 91 122 3344`). The rules:

1. Spaces, dashes, dots and parentheses are ignored. `00` at the start means `+`.
2. An Ethiopian mobile number (9 or 7 then 8 digits) is accepted with or
   without `+251`, `251` or `0` in front: `0911223344`, `911223344`,
   `+251711223344` and `251711223344` all become `+2519…` or `+2517…`.
3. Other Ethiopian numbers (landlines) with `0` or `251` in front are accepted
   when the `phonenumbers` metadata says they are valid.
4. A number that starts with `+` is accepted when it is a valid international
   number.
5. Digits without `+` that are not Ethiopian are read as `+<digits>`, so an
   international number typed without `+` (`447911123456`) still works.

`frontend/src/lib/phone.ts` and `appointment/public/js/phone.js` follow the
same rules. `phone_vectors.json` next to this file is the shared test table.
"""

import re
from contextlib import contextmanager

import frappe
import phonenumbers
from frappe import _

SEPARATORS = re.compile(r"[\s\-().]")
ETHIOPIAN_MOBILE = re.compile(r"^(?:251)?0?([79]\d{8})$")
ETHIOPIAN_NATIONAL = re.compile(r"^(?:251|0)(\d{9})$")
# Phone fields that the generic `validate_phone_fields` hook normalizes, by DocType.
PHONE_FIELDS = {
    "Organization": ("phone",),
    "Provider": ("phone",),
    "Location": ("phone",),
    "Walk In": ("client_phone",),
    "Growth Partner": ("phone",),
    "Landing Page Settings": ("company_phone",),
    "Client Profile": ("phone",),
}
MAX_PARTICIPANTS = 10


def hint():
    """The one message that explains the accepted forms."""
    return _("Enter a phone number like 0911 22 33 44 or +251 91 122 3344. International numbers start with + and the country code.")


def _valid(digits):
    """True when `+<digits>` is a valid number for its country."""
    try:
        number = phonenumbers.parse("+" + digits, None)
    except phonenumbers.NumberParseException:
        return False
    return phonenumbers.is_valid_number(number)


def normalize_phone(value, default_region="ET"):
    """The number in E.164 form, or "" when it is empty or not a usable phone number.

    `default_region` names the country for numbers typed without a country
    code. Only Ethiopia ("ET") has national rules today.
    """
    raw = SEPARATORS.sub("", str(value or ""))
    if raw.startswith("00"):
        raw = "+" + raw[2:]
    international = raw.startswith("+")
    digits = raw[1:] if international else raw
    if not digits.isdigit() or len(digits) > 15:
        return ""
    if default_region == "ET":
        mobile = ETHIOPIAN_MOBILE.match(digits)
        # With "+" only the 251 form is Ethiopian; "+9…" is another country.
        if mobile and (not international or digits.startswith("251")):
            return "+251" + mobile.group(1)
        national = ETHIOPIAN_NATIONAL.match(digits)
        if national and not international and _valid("251" + national.group(1)):
            return "+251" + national.group(1)
    return "+" + digits if _valid(digits) else ""


def phone_problem(value):
    """None when the value is a usable phone number, else the message to show."""
    return None if normalize_phone(value) else hint()


def format_phone(value):
    """The international display form, such as "+251 91 122 3344". Unusable values come back as typed."""
    number = normalize_phone(value)
    if not number:
        return (value or "").strip()
    return phonenumbers.format_number(phonenumbers.parse(number, None), phonenumbers.PhoneNumberFormat.INTERNATIONAL)


def require_phone(value, label=None):
    """The E.164 number, or a validation error with the shared hint."""
    number = normalize_phone(value)
    if not number:
        message = hint()
        frappe.throw(f"{label}: {message}" if label else message, title=_("Phone number"))
    return number


def split_phones(value):
    """Numbers from a list or from text separated by commas, semicolons or new lines."""
    if isinstance(value, (list, tuple)):
        parts = value
    else:
        parts = re.split(r"[,;\n]+", str(value or ""))
    return [str(part).strip() for part in parts if str(part).strip()]


def normalize_phone_list(value, exclude=()):
    """Unique E.164 numbers from `split_phones(value)`. Raises with the hint on the first bad number."""
    seen, result = set(exclude), []
    for part in split_phones(value):
        number = normalize_phone(part)
        if not number:
            frappe.throw(_("{0} is not a phone number.").format(frappe.bold(part)) + " " + hint(), title=_("Phone number"))
        if number not in seen:
            seen.add(number)
            result.append(number)
    if len(result) > MAX_PARTICIPANTS:
        frappe.throw(_("Add at most {0} other people.").format(MAX_PARTICIPANTS))
    return result


@contextmanager
def placeholder_numbers():
    """Let the showcase seeders keep their deliberately non-dialable numbers ("000 000 0101").

    Showcase businesses are public, so they must not show a number that could
    belong to a real person. Everything else goes through the phone rule.
    """
    previous = frappe.flags.placeholder_phone_numbers
    frappe.flags.placeholder_phone_numbers = True
    try:
        yield
    finally:
        frappe.flags.placeholder_phone_numbers = previous


def validate_phone_fields(doc, method=None):
    """DocType hook: normalize each changed phone field and refuse numbers that are not usable.

    Unchanged legacy values stay as they are, so an old record with an odd
    number can still be saved for other edits.
    """
    if frappe.flags.placeholder_phone_numbers:
        return
    for field in PHONE_FIELDS.get(doc.doctype, ()):
        value = (doc.get(field) or "").strip()
        if not value:
            continue  # A required field reports its own missing value.
        if not doc.is_new() and not doc.has_value_changed(field):
            continue
        label = _(doc.meta.get_label(field))
        doc.set(field, require_phone(value, label))
