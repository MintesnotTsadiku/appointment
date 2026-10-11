/*
 * Ethiopian (Habesha) clock conversion for /tools/ethiopian-time-converter.
 *
 * The Habesha clock counts 12 hours from sunrise (06:00) and 12 hours from
 * sunset (18:00). Habesha hour = international hour - 6 on a 12-hour dial;
 * minutes never change. The pure functions are also loaded by
 * frontend/tests/habesha-time.test.mjs, so keep them free of DOM access.
 */
(function (root) {
  "use strict";

  var ZONE = "Africa/Addis_Ababa";
  var HALVES = {
    day: { am: "ቀን", en: "day" },
    night: { am: "ሌሊት", en: "night" },
  };
  var PERIODS = {
    night: { am: "ሌሊት", en: "night" },
    morning: { am: "ጠዋት", en: "morning" },
    afternoon: { am: "ከሰዓት", en: "afternoon" },
    evening: { am: "ማታ", en: "evening" },
  };

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  /** ጠዋት 06–11, ከሰዓት 12–17, ማታ 18–23, ሌሊት 00–05 (international hours). */
  function periodKey(hour24) {
    if (hour24 < 6) return "night";
    if (hour24 < 12) return "morning";
    if (hour24 < 18) return "afternoon";
    return "evening";
  }

  /** International 24-hour time to Habesha time. */
  function toHabesha(hour24, minute) {
    var hour = (((hour24 - 6) % 12) + 12) % 12 || 12;
    var half = hour24 >= 6 && hour24 < 18 ? "day" : "night";
    var period = periodKey(hour24);
    return {
      hour: hour,
      minute: minute,
      half: half,
      halfAm: HALVES[half].am,
      period: period,
      periodAm: PERIODS[period].am,
      periodEn: PERIODS[period].en,
      text: hour + ":" + pad(minute),
    };
  }

  /** Habesha hour (1–12) and half ("day" or "night") to international 24-hour time. */
  function fromHabesha(hour, minute, half) {
    var base = half === "night" ? 18 : 6;
    return { hour: (base + (hour % 12)) % 24, minute: minute };
  }

  function format24(hour24, minute) {
    return pad(hour24) + ":" + pad(minute);
  }

  function format12(hour24, minute) {
    return (hour24 % 12 || 12) + ":" + pad(minute) + " " + (hour24 < 12 ? "AM" : "PM");
  }

  /** Accept "13:30", "1:30 pm", "8 am", "0800". Return null when unreadable. */
  function parseInternational(text) {
    var match = /^\s*(\d{1,2})(?::?(\d{2}))?\s*([ap])?\.?\s*m?\.?\s*$/i.exec(String(text || ""));
    if (!match) return null;
    var hour = Number(match[1]);
    var minute = Number(match[2] || 0);
    var suffix = (match[3] || "").toLowerCase();
    if (minute > 59) return null;
    if (suffix) {
      if (hour < 1 || hour > 12) return null;
      hour = (hour % 12) + (suffix === "p" ? 12 : 0);
    } else if (hour > 23) {
      return null;
    }
    return { hour: hour, minute: minute };
  }

  /** Wall-clock hour and minute in Addis Ababa for an instant. */
  function addisParts(date) {
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: ZONE,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date || new Date());
    var get = function (type) {
      return Number(parts.find(function (part) { return part.type === type; }).value);
    };
    return { hour: get("hour") % 24, minute: get("minute") };
  }

  var api = {
    toHabesha: toHabesha,
    fromHabesha: fromHabesha,
    format12: format12,
    format24: format24,
    parseInternational: parseInternational,
    addisParts: addisParts,
    PERIODS: PERIODS,
    HALVES: HALVES,
  };
  root.HabeshaTime = api;
  if (typeof module === "object" && module.exports) module.exports = api;

  if (typeof document === "undefined") return;

  /* Page wiring ---------------------------------------------------------- */
  function describe(habesha) {
    if (habesha.period === "night") return habesha.periodAm + " (night)";
    return habesha.periodAm + " (" + habesha.periodEn + ") · " + habesha.halfAm + " (" + HALVES[habesha.half].en + ")";
  }

  function byQa(name) {
    return document.querySelector('[data-qa="' + name + '"]');
  }

  function renderInternational() {
    var parsed = parseInternational(byQa("intl-input").value);
    var out = byQa("habesha-result");
    var detail = byQa("habesha-result-detail");
    if (!parsed) {
      out.textContent = "—";
      detail.textContent = "Enter a time such as 14:30 or 2:30 PM.";
      return;
    }
    var habesha = toHabesha(parsed.hour, parsed.minute);
    out.textContent = habesha.text;
    detail.textContent = describe(habesha) + " — from " + format12(parsed.hour, parsed.minute) + " (" + format24(parsed.hour, parsed.minute) + ")";
  }

  function renderHabesha() {
    var hour = Number(byQa("habesha-hour").value);
    var minute = Number(byQa("habesha-minute").value);
    var checked = document.querySelector('input[name="habesha-half"]:checked');
    var half = checked ? checked.value : "day";
    var other = half === "day" ? "night" : "day";
    var main = fromHabesha(hour, minute, half);
    var alt = fromHabesha(hour, minute, other);
    var label = toHabesha(main.hour, main.minute);
    byQa("intl-result").textContent = format12(main.hour, main.minute);
    byQa("intl-result-detail").textContent =
      format24(main.hour, main.minute) + " · " + label.periodAm + " (" + label.periodEn + ")";
    byQa("intl-result-other").textContent =
      "In the " + HALVES[other].en + " (" + HALVES[other].am + "), Habesha " + hour + ":" + pad(minute) +
      " is " + format12(alt.hour, alt.minute) + ".";
  }

  function renderNow() {
    var now = addisParts(new Date());
    var habesha = toHabesha(now.hour, now.minute);
    byQa("now-intl").textContent = format12(now.hour, now.minute);
    byQa("now-habesha").textContent = habesha.text + " " + habesha.periodAm;
  }

  function start() {
    document.documentElement.classList.remove("no-js");
    var now = addisParts(new Date());
    byQa("intl-input").value = format24(now.hour, now.minute);
    byQa("intl-input").addEventListener("input", renderInternational);
    byQa("habesha-hour").addEventListener("change", renderHabesha);
    byQa("habesha-minute").addEventListener("change", renderHabesha);
    document.querySelectorAll('input[name="habesha-half"]').forEach(function (input) {
      input.addEventListener("change", renderHabesha);
    });
    document.querySelectorAll("[data-intl-preset]").forEach(function (button) {
      button.addEventListener("click", function () {
        byQa("intl-input").value = button.getAttribute("data-intl-preset");
        renderInternational();
      });
    });
    renderInternational();
    renderHabesha();
    renderNow();
    setInterval(renderNow, 15000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})(typeof globalThis !== "undefined" ? globalThis : this);
