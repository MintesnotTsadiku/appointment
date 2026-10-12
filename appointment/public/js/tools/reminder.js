/*
 * Amharic appointment reminder generator (/tools/amharic-appointment-reminder).
 * Pure helpers (smsInfo, timeTexts, dateTexts, buildMessage) are exported for
 * frontend/tests/tools-pages.test.mjs; page wiring runs only with a DOM.
 */
(function (root) {
  "use strict";

  var GSM_BASIC = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
  var GSM_EXTENDED = "^{}\\[~]|€\f";

  /**
   * SMS length. GSM-7 text: 160 characters in one SMS, 153 per part when split
   * (extended characters count twice). Anything else (Ethiopic, emoji) is UCS-2:
   * 70 UTF-16 units in one SMS, 67 per part.
   */
  function smsInfo(text) {
    var value = String(text || "");
    var gsm = true;
    var gsmUnits = 0;
    for (var i = 0; i < value.length; i += 1) {
      var ch = value.charAt(i);
      if (GSM_BASIC.indexOf(ch) >= 0) gsmUnits += 1;
      else if (GSM_EXTENDED.indexOf(ch) >= 0) gsmUnits += 2;
      else { gsm = false; break; }
    }
    var units = gsm ? gsmUnits : value.length;
    var single = gsm ? 160 : 70;
    var part = gsm ? 153 : 67;
    var segments = units === 0 ? 0 : units <= single ? 1 : Math.ceil(units / part);
    return { encoding: gsm ? "gsm" : "unicode", units: units, characters: Array.from(value).length, segments: segments, perSegment: segments > 1 ? part : single };
  }

  /** The time in both languages: {am, en}. `clock` is "habesha" or "international". */
  function timeTexts(H, hour24, minute, clock, ethiopianSuffix) {
    var habesha = H.toHabesha(hour24, minute);
    var habeshaAm = habesha.periodAm + " " + habesha.text + " ሰዓት";
    var intl = H.format12(hour24, minute);
    if (clock === "habesha") {
      return { am: habeshaAm, en: intl + " (" + habesha.text + " " + ethiopianSuffix.en + ")" };
    }
    return { am: intl + " (" + habeshaAm + ")", en: intl };
  }

  /** The date in both languages: {am, en}. `calendar` is "ethiopian" or "gregorian". */
  function dateTexts(E, calendar, year, month, day) {
    var jdn;
    var ethiopian;
    var gregorian;
    if (calendar === "ethiopian") {
      if (!E.isValid(year, month, day)) return null;
      jdn = E.toJdn(year, month, day);
      ethiopian = { year: year, month: month, day: day };
      gregorian = E.jdnToGregorian(jdn);
      return {
        am: E.weekdayName(jdn, "am") + "፣ " + E.formatEthiopian(ethiopian, "am"),
        en: E.weekdayName(jdn, "en") + ", " + E.formatEthiopian(ethiopian, "en") + " E.C. (" + E.formatGregorian(gregorian, "en") + ")",
      };
    }
    if (!E.isValidGregorian(year, month, day)) return null;
    jdn = E.gregorianToJdn(year, month, day);
    gregorian = { year: year, month: month, day: day };
    return {
      am: E.weekdayName(jdn, "am") + "፣ " + E.formatGregorian(gregorian, "am"),
      en: E.weekdayName(jdn, "en") + ", " + E.formatGregorian(gregorian, "en"),
    };
  }

  /**
   * One message. `values` holds business, customer, service, location, date, time
   * (already in `lang`); `templates` maps keys to {en, am}.
   */
  function buildMessage(templates, lang, values, tone, channel) {
    var fill = root.ToolsCommon.fill;
    function tpl(key) {
      return fill(templates[key][lang], values);
    }
    var friendly = tone === "friendly";
    var greeting = values.customer
      ? tpl(friendly ? "greetFriendlyName" : "greetFormalName")
      : tpl(friendly ? "greetFriendly" : "greetFormal");
    var closing = tpl(friendly ? "closeFriendly" : "closeFormal");
    if (channel === "sms") {
      var parts = [greeting, tpl(friendly ? "smsFriendly" : "smsFormal")];
      if (values.location) parts.push(tpl("smsLocation"));
      parts.push(closing);
      return parts.join(" ");
    }
    var lines = [greeting, tpl(friendly ? "chatIntroFriendly" : "chatIntroFormal"), ""];
    lines.push("🏠 " + values.business);
    lines.push("📋 " + values.service);
    lines.push("📅 " + values.date);
    lines.push("🕒 " + values.time);
    if (values.location) lines.push("📍 " + values.location);
    lines.push("", closing);
    return lines.join("\n");
  }

  var api = { smsInfo: smsInfo, timeTexts: timeTexts, dateTexts: dateTexts, buildMessage: buildMessage };
  root.ReminderTool = api;
  if (typeof module === "object" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  /* Page wiring ---------------------------------------------------------- */
  var C = root.ToolsCommon;
  var H = root.HabeshaTime;
  var E = root.EthiopianCalendar;
  var data = C.data();
  var S = data.strings || {};
  var messages = { am: "", en: "" };

  function val(name) {
    return C.byQa(name).value.trim();
  }

  function int(name) {
    return parseInt(C.byQa(name).value, 10);
  }

  function hour24() {
    var hour = int("r-hour");
    var minute = int("r-minute");
    if (C.radioValue("r-clock") === "habesha") return H.fromHabesha(hour, minute, C.radioValue("r-period")).hour;
    return (hour % 12) + (C.radioValue("r-ampm") === "pm" ? 12 : 0);
  }

  function syncEthiopianDays() {
    var select = C.byQa("r-e-day");
    var month = int("r-e-month");
    var max = month === 13 ? (E.isLeap(int("r-e-year")) ? 6 : 5) : 30;
    var current = int("r-e-day");
    if (select.options.length !== max) {
      select.innerHTML = "";
      for (var d = 1; d <= max; d += 1) select.add(new Option(String(d), String(d)));
    }
    select.value = String(Math.min(current || 1, max));
  }

  function toggleGroups() {
    var calendar = C.radioValue("r-calendar");
    var clock = C.radioValue("r-clock");
    document.querySelectorAll("[data-calendar]").forEach(function (node) { node.hidden = node.getAttribute("data-calendar") !== calendar; });
    document.querySelectorAll("[data-clock]").forEach(function (node) { node.hidden = node.getAttribute("data-clock") !== clock; });
  }

  /** Keep the same moment when the user switches the clock or calendar. */
  function convertInputs(event) {
    var name = event.target.name;
    if (name === "r-clock") {
      var minute = int("r-minute");
      var hour = previousHour24;
      if (event.target.value === "habesha") {
        var habesha = H.toHabesha(hour, minute);
        C.byQa("r-hour").value = String(habesha.hour);
        document.querySelector('input[name="r-period"][value="' + habesha.period + '"]').checked = true;
      } else {
        C.byQa("r-hour").value = String(hour % 12 || 12);
        document.querySelector('input[name="r-ampm"][value="' + (hour < 12 ? "am" : "pm") + '"]').checked = true;
      }
    }
    if (name === "r-calendar") {
      if (event.target.value === "gregorian") {
        var g = E.toGregorian(int("r-e-year"), int("r-e-month"), int("r-e-day"));
        if (g) setGregorian(g);
      } else {
        var e = E.toEthiopian(int("r-g-year"), int("r-g-month"), int("r-g-day"));
        setEthiopian(e);
      }
    }
  }

  function ensureOption(select, value) {
    if (!Array.prototype.some.call(select.options, function (o) { return o.value === String(value); })) {
      select.add(new Option(String(value), String(value)));
    }
    select.value = String(value);
  }

  function setGregorian(date) {
    ensureOption(C.byQa("r-g-year"), date.year);
    C.byQa("r-g-month").value = String(date.month);
    C.byQa("r-g-day").value = String(date.day);
  }

  function setEthiopian(date) {
    ensureOption(C.byQa("r-e-year"), date.year);
    C.byQa("r-e-month").value = String(date.month);
    syncEthiopianDays();
    C.byQa("r-e-day").value = String(date.day);
  }

  var previousHour24 = 9;

  function render() {
    syncEthiopianDays();
    toggleGroups();
    var calendar = C.radioValue("r-calendar");
    var date = calendar === "ethiopian"
      ? dateTexts(E, "ethiopian", int("r-e-year"), int("r-e-month"), int("r-e-day"))
      : dateTexts(E, "gregorian", int("r-g-year"), int("r-g-month"), int("r-g-day"));
    var hour = hour24();
    previousHour24 = hour;
    var time = timeTexts(H, hour, int("r-minute"), C.radioValue("r-clock"), S.ethiopianTimeSuffix);
    var channel = C.radioValue("r-channel");
    var tone = C.radioValue("r-tone");
    ["am", "en"].forEach(function (lang) {
      var values = {
        business: val("r-business") || "…",
        customer: val("r-customer"),
        service: val("r-service") || "…",
        location: val("r-location"),
        date: date ? date[lang] : "…",
        time: time[lang],
      };
      var text = buildMessage(data.templates, lang, values, tone, channel);
      messages[lang] = text;
      C.byQa("r-message-" + lang).textContent = text;
      var info = smsInfo(text);
      var counter = C.fmt(S.characters, "<strong>" + info.characters + "</strong>");
      if (channel === "sms") counter += " · " + C.fmt(S.segments, "<strong>" + info.segments + "</strong>");
      C.byQa("r-counter-" + lang).innerHTML = counter;
      var pill = C.byQa("r-encoding-" + lang);
      pill.textContent = info.encoding === "unicode" ? S.encodingUnicode : S.encodingGsm;
      pill.hidden = channel !== "sms";
      C.byQa("r-share-" + lang).href = C.telegramShareUrl(data.linkBack, text);
    });
    C.byQa("r-unicode-note").hidden = channel !== "sms";
  }

  C.onReady(function () {
    var tool = C.byQa("reminder-tool");
    function switchesSystem(event) {
      return event.target.name === "r-clock" || event.target.name === "r-calendar";
    }
    // A radio fires "input" before "change". Convert on "change" first, so the
    // previous moment is not lost to a render with the new system's stale fields.
    tool.addEventListener("input", function (event) {
      if (!switchesSystem(event)) render();
    });
    tool.addEventListener("change", function (event) {
      if (switchesSystem(event)) convertInputs(event);
      render();
    });
    document.querySelectorAll("[data-copy]").forEach(function (button) {
      button.addEventListener("click", function () {
        C.copy(messages[button.getAttribute("data-copy")], button, S);
      });
    });
    render();
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
