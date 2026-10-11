/*
 * Ethiopian (Habesha) clock conversion shared by the free tool pages
 * (/tools/*). Python twin: appointment/growth/habesha.py; both are tested
 * with appointment/growth/vectors/habesha.json.
 *
 * The Habesha clock counts 12 hours from sunrise (06:00) and 12 hours from
 * sunset (18:00). Habesha hour = international hour - 6 on a 12-hour dial;
 * minutes never change. Period words match the staff formatter
 * (frontend/src/lib/time.ts). This file has no DOM access; page wiring lives
 * in js/tools/*.js.
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
    evening: { am: "ምሽት", en: "evening" },
  };

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  /** ጠዋት 06–11, ከሰዓት 12–17, ምሽት 18–23, ሌሊት 00–05 (international hours). */
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

  /** Habesha hour (1–12) and half ("day"/"night") or period key to international 24-hour time. */
  function fromHabesha(hour, minute, half) {
    var base = half === "night" || half === "evening" ? 18 : 6;
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

  /** "ጠዋት 2:30" for an international time. */
  function formatHabesha(hour24, minute, withPeriod) {
    var habesha = toHabesha(hour24, minute);
    return withPeriod === false ? habesha.text : habesha.periodAm + " " + habesha.text;
  }

  /** "HH:MM" to {hour, minute}; null when malformed. */
  function parseWall(value) {
    var match = /^(\d{1,2}):(\d{2})$/.exec(String(value || "").trim());
    if (!match) return null;
    var hour = Number(match[1]);
    var minute = Number(match[2]);
    return hour > 23 || minute > 59 ? null : { hour: hour, minute: minute };
  }

  /** Opening hours in international ("en") or Habesha ("am") time; the period repeats only when it changes. */
  function formatHoursRange(start, end, lang) {
    var a = parseWall(start);
    var b = parseWall(end);
    if (!a || !b) return "";
    if (lang !== "am") return format12(a.hour, a.minute) + " – " + format12(b.hour, b.minute);
    var same = periodKey(a.hour) === periodKey(b.hour);
    return formatHabesha(a.hour, a.minute) + " – " + formatHabesha(b.hour, b.minute, !same);
  }

  var api = {
    periodKey: periodKey,
    formatHabesha: formatHabesha,
    formatHoursRange: formatHoursRange,
    parseWall: parseWall,
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
})(typeof globalThis !== "undefined" ? globalThis : this);
