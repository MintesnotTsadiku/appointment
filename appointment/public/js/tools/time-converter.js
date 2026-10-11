/*
 * Page wiring of /tools/ethiopian-time-converter (and /am/tools/...).
 * The conversion rules live in ../habesha-time.js (HabeshaTime).
 */
(function () {
  "use strict";
  var H = window.HabeshaTime;
  var C = window.ToolsCommon;
  var data = C.data();
  var S = data.strings || {};
  var am = data.lang === "am";

  function describe(habesha) {
    var half = habesha.half === "day" ? S.dayWord : S.nightWord;
    if (am) return habesha.periodAm + " · " + half;
    if (habesha.period === "night") return habesha.periodAm + " (" + S.nightPeriod + ")";
    return habesha.periodAm + " (" + habesha.periodEn + ") · " + half;
  }

  function renderInternational() {
    var parsed = H.parseInternational(C.byQa("intl-input").value);
    var out = C.byQa("habesha-result");
    var detail = C.byQa("habesha-result-detail");
    if (!parsed) {
      out.textContent = "—";
      detail.textContent = S.enterTime;
      return;
    }
    var habesha = H.toHabesha(parsed.hour, parsed.minute);
    out.textContent = am ? habesha.periodAm + " " + habesha.text : habesha.text;
    detail.textContent = describe(habesha) + " — " +
      C.fmt(S.fromTime, H.format12(parsed.hour, parsed.minute) + " (" + H.format24(parsed.hour, parsed.minute) + ")");
  }

  function renderHabesha() {
    var hour = Number(C.byQa("habesha-hour").value);
    var minute = Number(C.byQa("habesha-minute").value);
    var half = C.radioValue("habesha-half") || "day";
    var other = half === "day" ? "night" : "day";
    var main = H.fromHabesha(hour, minute, half);
    var alt = H.fromHabesha(hour, minute, other);
    var label = H.toHabesha(main.hour, main.minute);
    C.byQa("intl-result").textContent = H.format12(main.hour, main.minute);
    C.byQa("intl-result-detail").textContent = H.format24(main.hour, main.minute) + " · " +
      (am ? label.periodAm : label.periodAm + " (" + label.periodEn + ")");
    C.byQa("intl-result-other").textContent = C.fmt(
      S.otherHalf, other === "day" ? S.dayWord : S.nightWord, hour + ":" + C.pad(minute), H.format12(alt.hour, alt.minute)
    );
  }

  function renderNow() {
    var now = H.addisParts(new Date());
    var habesha = H.toHabesha(now.hour, now.minute);
    C.byQa("now-intl").textContent = H.format12(now.hour, now.minute);
    C.byQa("now-habesha").textContent = habesha.periodAm + " " + habesha.text;
  }

  C.onReady(function () {
    var now = H.addisParts(new Date());
    var input = C.byQa("intl-input");
    input.value = H.format24(now.hour, now.minute);
    input.addEventListener("input", renderInternational);
    C.byQa("habesha-hour").addEventListener("change", renderHabesha);
    C.byQa("habesha-minute").addEventListener("change", renderHabesha);
    document.querySelectorAll('input[name="habesha-half"]').forEach(function (radio) {
      radio.addEventListener("change", renderHabesha);
    });
    document.querySelectorAll("[data-intl-preset]").forEach(function (button) {
      button.addEventListener("click", function () {
        input.value = button.getAttribute("data-intl-preset");
        renderInternational();
      });
    });
    renderInternational();
    renderHabesha();
    renderNow();
    setInterval(renderNow, 15000);
  });
})();
