/*
 * One phone number rule for the server-rendered pages (partners, tools).
 *
 * The same rules as frontend/src/lib/phone.ts and the server's
 * appointment/helpers/phone.py, tested with appointment/helpers/phone_vectors.json.
 * The server stays the source of truth.
 *
 * window.AppointmentPhone.normalize("0911 22 33 44") -> "+251911223344" ("" when not usable)
 * window.AppointmentPhone.format("0911223344")       -> "+251 91 122 3344"
 */
(function (root) {
  "use strict";

  var SEPARATORS = /[\s\-().]/g;
  var ETHIOPIAN_MOBILE = /^(?:251)?0?([79]\d{8})$/;
  var ETHIOPIAN_NATIONAL = /^(?:251|0)((?:11|[2-58]\d)\d{7})$/;
  var SHORT_CODES = ("1 7 20 27 30 31 32 33 34 36 39 40 41 43 44 45 46 47 48 49 51 52 53 54 55 56 57 58 " +
    "60 61 62 63 64 65 66 81 82 84 86 90 91 92 93 94 95 98").split(" ");
  var UNASSIGNED = [];
  ("210 214 215 217 219 259 280-289 292-296 384 422 424-429 671 693-699 801-807 809 830-839 851 854 " +
    "857-859 871-877 879 884 885 887 889-899 969 978 990 997 999").split(" ").forEach(function (item) {
    var range = item.split("-").map(Number);
    for (var code = range[0]; code <= (range[1] || range[0]); code++) UNASSIGNED.push(String(code));
  });

  function callingCode(digits) {
    if (!digits || digits.charAt(0) === "0") return "";
    for (var size = 1; size <= 2; size++) {
      if (SHORT_CODES.indexOf(digits.slice(0, size)) !== -1) return digits.slice(0, size);
    }
    var code = digits.slice(0, 3);
    return code.length === 3 && UNASSIGNED.indexOf(code) === -1 ? code : "";
  }

  function normalize(value) {
    var raw = String(value == null ? "" : value).replace(SEPARATORS, "");
    if (raw.indexOf("00") === 0) raw = "+" + raw.slice(2);
    var international = raw.charAt(0) === "+";
    var digits = international ? raw.slice(1) : raw;
    if (!/^\d+$/.test(digits) || digits.length > 15) return "";
    var mobile = ETHIOPIAN_MOBILE.exec(digits);
    if (mobile && (!international || digits.indexOf("251") === 0)) return "+251" + mobile[1];
    var national = ETHIOPIAN_NATIONAL.exec(digits);
    if (national && !international) return "+251" + national[1];
    if (digits.indexOf("251") === 0 && digits.length !== 12) return "";
    var code = callingCode(digits);
    var ok = code && digits.length >= 8 && digits.length - code.length >= 4;
    return ok ? "+" + digits : "";
  }

  function groups(text, sizes) {
    var parts = [];
    var at = 0;
    sizes.forEach(function (size) {
      if (at < text.length) parts.push(text.slice(at, at + size));
      at += size;
    });
    if (at < text.length) parts.push(text.slice(at));
    return parts.join(" ");
  }

  function format(value) {
    var number = normalize(value);
    if (!number) return String(value == null ? "" : value).trim();
    var digits = number.slice(1);
    if (digits.indexOf("251") === 0) return "+251 " + groups(digits.slice(3), [2, 3, 4]);
    var code = callingCode(digits);
    var rest = digits.slice(code.length);
    return "+" + code + " " + groups(rest, rest.length > 7 ? [3, 3] : [3]);
  }

  var api = { normalize: normalize, format: format, callingCode: callingCode };
  root.AppointmentPhone = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : this);
