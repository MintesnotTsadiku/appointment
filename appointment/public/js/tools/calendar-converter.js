/*
 * Page wiring of /tools/ethiopian-calendar-converter (and /am/tools/...).
 * The algorithm lives in ethiopian-calendar.js (EthiopianCalendar).
 */
(function () {
  "use strict";
  var E = window.EthiopianCalendar;
  var C = window.ToolsCommon;
  var data = C.data();
  var S = data.strings || {};
  var lang = data.lang === "am" ? "am" : "en";
  var sep = lang === "am" ? "፣ " : ", ";

  function intValue(name) {
    return parseInt(C.byQa(name).value, 10);
  }

  function shareLine(from, to) {
    return C.fmt(S.shareText, from, to) + "\n" + data.linkBack;
  }

  function renderToEthiopian() {
    var year = intValue("g-year");
    var month = intValue("g-month");
    var day = intValue("g-day");
    var out = C.byQa("g-result");
    var detail = C.byQa("g-result-detail");
    if (!E.isValidGregorian(year, month, day)) {
      out.textContent = "—";
      detail.textContent = S.invalidDate;
      out.dataset.share = "";
      return;
    }
    var jdn = E.gregorianToJdn(year, month, day);
    var ethiopian = E.fromJdn(jdn);
    var weekday = E.weekdayName(jdn, lang);
    out.textContent = E.formatEthiopian(ethiopian, lang);
    detail.textContent = weekday + sep + E.formatGregorian({ year: year, month: month, day: day }, lang) +
      (lang === "en" ? " · " + E.formatEthiopian(ethiopian, "am") : "");
    out.dataset.share = shareLine(E.formatGregorian({ year: year, month: month, day: day }, lang), weekday + sep + E.formatEthiopian(ethiopian, lang));
  }

  function syncEthiopianDays() {
    var year = intValue("e-year");
    var month = intValue("e-month");
    var select = C.byQa("e-day");
    var max = month === 13 ? (E.isLeap(year) ? 6 : 5) : 30;
    var current = intValue("e-day");
    if (select.options.length !== max) {
      select.innerHTML = "";
      for (var d = 1; d <= max; d += 1) select.add(new Option(String(d), String(d)));
    }
    select.value = String(Math.min(current || 1, max));
  }

  function renderToGregorian() {
    syncEthiopianDays();
    var year = intValue("e-year");
    var month = intValue("e-month");
    var day = intValue("e-day");
    var out = C.byQa("e-result");
    var detail = C.byQa("e-result-detail");
    var leap = C.byQa("e-result-leap");
    var gregorian = E.toGregorian(year, month, day);
    if (!gregorian) {
      out.textContent = "—";
      detail.textContent = S.invalidDate;
      leap.textContent = "";
      out.dataset.share = "";
      return;
    }
    var jdn = E.toJdn(year, month, day);
    var weekday = E.weekdayName(jdn, lang);
    out.textContent = E.formatGregorian(gregorian, lang);
    detail.textContent = weekday + sep + E.formatEthiopian({ year: year, month: month, day: day }, lang);
    leap.textContent = C.fmt(E.isLeap(year) ? S.leapNote : S.commonNote, year);
    out.dataset.share = shareLine(E.formatEthiopian({ year: year, month: month, day: day }, lang), weekday + sep + E.formatGregorian(gregorian, lang));
  }

  function setGregorianToday() {
    var today = E.addisToday(new Date());
    C.byQa("g-year").value = today.year;
    C.byQa("g-month").value = String(today.month);
    C.byQa("g-day").value = String(today.day);
    renderToEthiopian();
  }

  function setEthiopianToday() {
    var today = E.addisToday(new Date());
    var ethiopian = E.toEthiopian(today.year, today.month, today.day);
    C.byQa("e-year").value = ethiopian.year;
    C.byQa("e-month").value = String(ethiopian.month);
    syncEthiopianDays();
    C.byQa("e-day").value = String(ethiopian.day);
    renderToGregorian();
  }

  function wireCopy(name, outputName) {
    C.byQa(name).addEventListener("click", function (event) {
      var text = C.byQa(outputName).dataset.share;
      if (text) C.copy(text, event.currentTarget, S);
    });
  }

  C.onReady(function () {
    ["g-day", "g-month"].forEach(function (name) { C.byQa(name).addEventListener("change", renderToEthiopian); });
    C.byQa("g-year").addEventListener("input", renderToEthiopian);
    ["e-day", "e-month"].forEach(function (name) { C.byQa(name).addEventListener("change", renderToGregorian); });
    C.byQa("e-year").addEventListener("input", renderToGregorian);
    C.byQa("g-today").addEventListener("click", setGregorianToday);
    C.byQa("e-today").addEventListener("click", setEthiopianToday);
    wireCopy("g-copy", "g-result");
    wireCopy("e-copy", "e-result");
    setGregorianToday();
    setEthiopianToday();
  });
})();
