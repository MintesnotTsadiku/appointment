/**
 * One phone number rule for the whole app, in the browser.
 *
 * The server (`appointment/helpers/phone.py`) is the source of truth; this file
 * follows the same rules so people see a problem while they type. Both are
 * tested with `appointment/helpers/phone_vectors.json`.
 *
 * - Spaces, dashes, dots and parentheses are ignored. "00" at the start means "+".
 * - An Ethiopian mobile number (9 or 7, then 8 digits) is accepted with or without
 *   +251, 251 or 0 in front: 0911223344, 911223344, +251711223344.
 * - Other Ethiopian numbers (landlines) need 0 or 251 in front.
 * - A number with + (or without + and not Ethiopian) is read as an international
 *   number: a known country code and 8 to 15 digits in total. The server checks
 *   the number against the full phone metadata.
 *
 * Stored numbers use E.164 ("+251911223344"); `formatPhone` gives the display form.
 */

const SEPARATORS = /[\s\-().]/g;
const ETHIOPIAN_MOBILE = /^(?:251)?0?([79]\d{8})$/;
const ETHIOPIAN_NATIONAL = /^(?:251|0)((?:11|[2-58]\d)\d{7})$/;
// ITU calling codes with one or two digits. Every other code has three digits.
const SHORT_CODES = new Set(
  "1 7 20 27 30 31 32 33 34 36 39 40 41 43 44 45 46 47 48 49 51 52 53 54 55 56 57 58 60 61 62 63 64 65 66 81 82 84 86 90 91 92 93 94 95 98".split(" "),
);
// Three-digit codes that no country uses. The server has the full list; this one catches typing slips.
const UNASSIGNED = new Set(
  "210 214 215 217 219 259 280-289 292-296 384 422 424-429 671 693-699 801-807 809 830-839 851 854 857-859 871-877 879 884 885 887 889-899 969 978 990 997 999"
    .split(" ")
    .flatMap((item) => {
      const [from, to = from] = item.split("-").map(Number);
      return Array.from({ length: to - from + 1 }, (_, index) => String(from + index));
    }),
);

/** The country calling code at the start of E.164 digits, or "" when none fits. */
export function callingCode(digits: string): string {
  if (!digits || digits[0] === "0") return "";
  for (const size of [1, 2]) {
    const code = digits.slice(0, size);
    if (SHORT_CODES.has(code)) return code;
  }
  const code = digits.slice(0, 3);
  return code.length === 3 && !UNASSIGNED.has(code) ? code : "";
}

function internationalDigits(digits: string): boolean {
  const code = callingCode(digits);
  return Boolean(code) && digits.length >= 8 && digits.length <= 15 && digits.length - code.length >= 4;
}

/** The number in E.164 form, or "" when it is empty or not a usable phone number. */
export function normalizePhone(value: string | null | undefined): string {
  let raw = String(value ?? "").replace(SEPARATORS, "");
  if (raw.startsWith("00")) raw = "+" + raw.slice(2);
  const international = raw.startsWith("+");
  const digits = international ? raw.slice(1) : raw;
  if (!/^\d+$/.test(digits) || digits.length > 15) return "";
  const mobile = ETHIOPIAN_MOBILE.exec(digits);
  // With "+" only the 251 form is Ethiopian; "+9…" is another country.
  if (mobile && (!international || digits.startsWith("251"))) return "+251" + mobile[1];
  const national = ETHIOPIAN_NATIONAL.exec(digits);
  if (national && !international) return "+251" + national[1];
  if (digits.startsWith("251") && digits.length !== 12) return "";
  return internationalDigits(digits) ? "+" + digits : "";
}

export function isPhone(value: string | null | undefined): boolean {
  return Boolean(normalizePhone(value));
}

function groups(text: string, sizes: number[]): string {
  const parts: string[] = [];
  let at = 0;
  for (const size of sizes) {
    if (at >= text.length) break;
    parts.push(text.slice(at, at + size));
    at += size;
  }
  if (at < text.length) parts.push(text.slice(at));
  return parts.join(" ");
}

/** The display form: "+251 91 122 3344" for Ethiopia, "+44 791 112 3456" elsewhere. Unusable values come back as typed. */
export function formatPhone(value: string | null | undefined): string {
  const number = normalizePhone(value);
  if (!number) return String(value ?? "").trim();
  const digits = number.slice(1);
  if (digits.startsWith("251")) return "+251 " + groups(digits.slice(3), [2, 3, 4]);
  const code = callingCode(digits);
  const rest = digits.slice(code.length);
  return `+${code} ` + groups(rest, rest.length > 7 ? [3, 3] : [3]);
}

/** Pieces of text separated by commas, semicolons or new lines. */
export function splitPhones(value: string | null | undefined): string[] {
  return String(value ?? "")
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Stored phone list (one per line or comma separated) as E.164 numbers; unusable parts are dropped. */
export function phoneList(value: string | null | undefined): string[] {
  const seen = new Set<string>();
  for (const part of splitPhones(value)) {
    const number = normalizePhone(part);
    if (number) seen.add(number);
  }
  return [...seen];
}

/** A `tel:` link for a stored or typed number. */
export function phoneHref(value: string | null | undefined): string {
  const number = normalizePhone(value);
  return number ? `tel:${number}` : "";
}
