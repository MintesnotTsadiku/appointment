/*
 * Ethiopian (Ge'ez) calendar conversion. Python twin:
 * appointment/growth/ethiopian_calendar.py; both are tested with
 * appointment/growth/vectors/ethiopian_calendar.json.
 *
 * 12 months of 30 days and Pagume (month 13) of 5 days, 6 when
 * year % 4 === 3. Both directions go through the Julian Day Number.
 * No DOM access here.
 */
(function (root) {
  "use strict";

  var EPOCH = 1723856;
  var MONTHS = [
    ["መስከረም", "Meskerem"], ["ጥቅምት", "Tikimt"], ["ኅዳር", "Hidar"], ["ታኅሣሥ", "Tahsas"],
    ["ጥር", "Tir"], ["የካቲት", "Yekatit"], ["መጋቢት", "Megabit"], ["ሚያዝያ", "Miyazya"],
    ["ግንቦት", "Ginbot"], ["ሰኔ", "Sene"], ["ሐምሌ", "Hamle"], ["ነሐሴ", "Nehase"], ["ጳጉሜ", "Pagume"],
  ];
  var GREGORIAN_MONTHS = [
    ["ጃንዩወሪ", "January"], ["ፌብሩወሪ", "February"], ["ማርች", "March"], ["ኤፕሪል", "April"],
    ["ሜይ", "May"], ["ጁን", "June"], ["ጁላይ", "July"], ["ኦገስት", "August"],
    ["ሴፕቴምበር", "September"], ["ኦክቶበር", "October"], ["ኖቬምበር", "November"], ["ዲሴምበር", "December"],
  ];
  /* Sunday first, like Date.getUTCDay(). */
  var WEEKDAYS = [
    ["እሑድ", "Sunday"], ["ሰኞ", "Monday"], ["ማክሰኞ", "Tuesday"], ["ረቡዕ", "Wednesday"],
    ["ሐሙስ", "Thursday"], ["ዓርብ", "Friday"], ["ቅዳሜ", "Saturday"],
  ];

  function floorDiv(a, b) {
    return Math.floor(a / b);
  }

  function isLeap(year) {
    return ((year % 4) + 4) % 4 === 3;
  }

  function daysInMonth(year, month) {
    if (month === 13) return isLeap(year) ? 6 : 5;
    return 30;
  }

  function isValid(year, month, day) {
    return Number.isInteger(year) && Number.isInteger(month) && Number.isInteger(day) &&
      year >= 1 && month >= 1 && month <= 13 && day >= 1 && day <= daysInMonth(year, month);
  }

  function toJdn(year, month, day) {
    return EPOCH + 365 + 365 * (year - 1) + floorDiv(year, 4) + 30 * month + day - 31;
  }

  function fromJdn(jdn) {
    var cycle = floorDiv(jdn - EPOCH, 1461);
    var rest = (jdn - EPOCH) - cycle * 1461;
    var year = 4 * cycle + floorDiv(rest, 365) - floorDiv(rest, 1460);
    var dayOfYear = (rest % 365) + 365 * floorDiv(rest, 1460);
    return { year: year, month: floorDiv(dayOfYear, 30) + 1, day: (dayOfYear % 30) + 1 };
  }

  function gregorianToJdn(year, month, day) {
    var a = floorDiv(14 - month, 12);
    var y = year + 4800 - a;
    var m = month + 12 * a - 3;
    return day + floorDiv(153 * m + 2, 5) + 365 * y + floorDiv(y, 4) - floorDiv(y, 100) + floorDiv(y, 400) - 32045;
  }

  function jdnToGregorian(jdn) {
    var a = jdn + 32044;
    var b = floorDiv(4 * a + 3, 146097);
    var c = a - floorDiv(146097 * b, 4);
    var d = floorDiv(4 * c + 3, 1461);
    var e = c - floorDiv(1461 * d, 4);
    var m = floorDiv(5 * e + 2, 153);
    return {
      year: 100 * b + d - 4800 + floorDiv(m, 10),
      month: m + 3 - 12 * floorDiv(m, 10),
      day: e - floorDiv(153 * m + 2, 5) + 1,
    };
  }

  function isValidGregorian(year, month, day) {
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12 || day < 1) return false;
    var back = jdnToGregorian(gregorianToJdn(year, month, day));
    return back.year === year && back.month === month && back.day === day;
  }

  /** Gregorian {year, month, day} to Ethiopian {year, month, day}. */
  function toEthiopian(year, month, day) {
    return fromJdn(gregorianToJdn(year, month, day));
  }

  /** Ethiopian date to Gregorian {year, month, day}; null when the Ethiopian date is invalid. */
  function toGregorian(year, month, day) {
    if (!isValid(year, month, day)) return null;
    return jdnToGregorian(toJdn(year, month, day));
  }

  /** 0 = Sunday, from the Julian Day Number. */
  function weekdayIndex(jdn) {
    return (jdn + 1) % 7;
  }

  function formatEthiopian(date, lang) {
    var month = MONTHS[date.month - 1];
    return lang === "am"
      ? month[0] + " " + date.day + " ቀን " + date.year + " ዓ.ም."
      : month[1] + " " + date.day + ", " + date.year;
  }

  function formatGregorian(date, lang) {
    var month = GREGORIAN_MONTHS[date.month - 1];
    return lang === "am"
      ? month[0] + " " + date.day + " ቀን " + date.year
      : month[1] + " " + date.day + ", " + date.year;
  }

  function weekdayName(jdn, lang) {
    return WEEKDAYS[weekdayIndex(jdn)][lang === "am" ? 0 : 1];
  }

  /** Today's Gregorian date in Addis Ababa (UTC+3, no daylight saving time). */
  function addisToday(now) {
    var shifted = new Date((now || new Date()).getTime() + 3 * 3600 * 1000);
    return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
  }

  var api = {
    MONTHS: MONTHS,
    GREGORIAN_MONTHS: GREGORIAN_MONTHS,
    WEEKDAYS: WEEKDAYS,
    isLeap: isLeap,
    daysInMonth: daysInMonth,
    isValid: isValid,
    isValidGregorian: isValidGregorian,
    toJdn: toJdn,
    fromJdn: fromJdn,
    gregorianToJdn: gregorianToJdn,
    jdnToGregorian: jdnToGregorian,
    toEthiopian: toEthiopian,
    toGregorian: toGregorian,
    weekdayName: weekdayName,
    formatEthiopian: formatEthiopian,
    formatGregorian: formatGregorian,
    addisToday: addisToday,
  };
  root.EthiopianCalendar = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
