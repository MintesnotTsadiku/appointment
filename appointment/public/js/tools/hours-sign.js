/*
 * Bilingual business-hours sign maker (/tools/business-hours-sign).
 * Pure helpers (inkFor, encodeState, decodeState, dayHtml) are exported for
 * frontend/tests/tools-pages.test.mjs; page wiring runs only with a DOM.
 * The sign state lives in the URL hash (#s=...), so a sign can be reopened,
 * shared, and opened in the print preview (?view=print) unchanged.
 */
(function (root) {
  "use strict";

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function relativeLuminance(hex) {
    var match = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""));
    if (!match) return 0;
    var channels = [0, 2, 4].map(function (i) {
      var c = parseInt(match[1].slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }

  /** Black or white text, whichever reads better on the colour. */
  function inkFor(hex) {
    var lum = relativeLuminance(hex);
    var onWhite = 1.05 / (lum + 0.05);
    var onBlack = (lum + 0.05) / 0.05;
    return onWhite >= onBlack ? "#ffffff" : "#111111";
  }

  function toBase64Url(text) {
    var bytes = new TextEncoder().encode(text);
    var binary = "";
    bytes.forEach(function (b) { binary += String.fromCharCode(b); });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function fromBase64Url(text) {
    var binary = atob(String(text).replace(/-/g, "+").replace(/_/g, "/"));
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  var TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

  function encodeState(state) {
    return toBase64Url(JSON.stringify(state));
  }

  /** Parse a state from the URL; returns null for anything malformed. */
  function decodeState(text) {
    try {
      var state = JSON.parse(fromBase64Url(text));
      if (!state || !Array.isArray(state.week) || state.week.length !== 7) return null;
      var okWeek = state.week.every(function (day) {
        return Array.isArray(day) && day.length <= 2 && day.every(function (range) {
          return Array.isArray(range) && TIME.test(range[0]) && TIME.test(range[1]);
        });
      });
      if (!okWeek) return null;
      return {
        name: String(state.name || "").slice(0, 60),
        phone: String(state.phone || "").slice(0, 30),
        link: String(state.link || "").slice(0, 80),
        theme: ["light", "dark", "brand"].indexOf(state.theme) >= 0 ? state.theme : "light",
        color: /^#[0-9a-f]{6}$/i.test(state.color) ? state.color : null,
        paper: state.paper === "A5" ? "A5" : "A4",
        week: state.week,
      };
    } catch (error) {
      return null;
    }
  }

  /** The <td> content of one day on the sign. */
  function dayHtml(H, ranges, closed) {
    if (!ranges.length) {
      return '<td class="closed"><span lang="am">' + escapeHtml(closed.am) + "</span> · " + escapeHtml(closed.en) + "</td>";
    }
    return "<td>" + ranges.map(function (range) {
      return '<span class="intl">' + escapeHtml(H.formatHoursRange(range[0], range[1], "en")) +
        '</span><span class="habesha" lang="am">' + escapeHtml(H.formatHoursRange(range[0], range[1], "am")) + "</span>";
    }).join("") + "</td>";
  }

  var api = { escapeHtml: escapeHtml, inkFor: inkFor, encodeState: encodeState, decodeState: decodeState, dayHtml: dayHtml };
  root.HoursSign = api;
  if (typeof module === "object" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  /* Page wiring ---------------------------------------------------------- */
  var C = root.ToolsCommon;
  var H = root.HabeshaTime;
  var data = C.data();
  var S = data.strings || {};
  var lang = data.lang === "am" ? "am" : "en";
  var state;

  function timeLabel(value) {
    var parts = H.parseWall(value);
    return lang === "am" ? H.formatHabesha(parts.hour, parts.minute) : H.format12(parts.hour, parts.minute);
  }

  var TIMES = [];
  for (var m = 0; m < 24 * 60; m += 30) TIMES.push(C.pad(Math.floor(m / 60)) + ":" + C.pad(m % 60));

  function timeSelect(value, label, qa) {
    var select = document.createElement("select");
    select.className = "select";
    select.setAttribute("aria-label", label);
    select.setAttribute("data-qa", qa);
    TIMES.forEach(function (time) { select.add(new Option(timeLabel(time), time)); });
    if (TIMES.indexOf(value) < 0) select.add(new Option(timeLabel(value), value));
    select.value = value;
    return select;
  }

  function iconButton(svgName, label, qa) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-ghost btn-sm";
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
    button.setAttribute("data-qa", qa);
    button.innerHTML = svgName === "x"
      ? '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>'
      : '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5v14"/></svg><span></span>';
    return button;
  }

  function renderEditor() {
    var list = C.byQa("s-days");
    list.innerHTML = "";
    state.week.forEach(function (ranges, index) {
      var names = data.weekdays[index];
      var item = document.createElement("li");
      item.className = "day" + (ranges.length ? "" : " is-closed");
      item.setAttribute("data-qa", "s-day-" + index);
      item.innerHTML = '<span class="day-name"><span lang="am">' + names[0] + "</span><small>" + names[1] + "</small></span>";
      var toggle = document.createElement("label");
      toggle.className = "switch";
      toggle.innerHTML = '<input type="checkbox" data-qa="s-open-' + index + '"' + (ranges.length ? " checked" : "") +
        '><span class="track"></span><span>' + C.fmt(S.open) + "</span>";
      toggle.querySelector("input").addEventListener("change", function (event) {
        state.week[index] = event.target.checked ? [["08:30", "17:30"]] : [];
        renderEditor();
        renderSign();
      });
      item.appendChild(toggle);
      var box = document.createElement("div");
      box.className = "day-ranges";
      ranges.forEach(function (range, rangeIndex) {
        var row = document.createElement("div");
        row.className = "range";
        var from = timeSelect(range[0], names[1] + " " + (rangeIndex + 1), "s-from-" + index + "-" + rangeIndex);
        var to = timeSelect(range[1], names[1] + " " + (rangeIndex + 1), "s-to-" + index + "-" + rangeIndex);
        from.addEventListener("change", function () { range[0] = from.value; renderSign(); });
        to.addEventListener("change", function () { range[1] = to.value; renderSign(); });
        var dash = document.createElement("span");
        dash.className = "to";
        dash.textContent = "–";
        row.appendChild(from);
        row.appendChild(dash);
        row.appendChild(to);
        if (rangeIndex === 0 && ranges.length === 1) {
          var add = iconButton("plus", S.addBreak, "s-add-break-" + index);
          add.addEventListener("click", function () {
            var end = range[1];
            state.week[index] = [[range[0], "12:30"], ["13:30", end > "13:30" ? end : "17:30"]];
            renderEditor();
            renderSign();
          });
          row.appendChild(add);
        } else if (rangeIndex === 1) {
          var remove = iconButton("x", S.removeBreak, "s-remove-break-" + index);
          remove.addEventListener("click", function () {
            state.week[index] = [[ranges[0][0], ranges[1][1]]];
            renderEditor();
            renderSign();
          });
          row.appendChild(remove);
        } else {
          row.appendChild(document.createElement("span"));
        }
        box.appendChild(row);
      });
      item.appendChild(box);
      list.appendChild(item);
    });
  }

  function linkHref(value) {
    var text = value.trim();
    if (!text) return "";
    return /^https?:\/\//i.test(text) ? text : "https://" + text;
  }

  function renderSign() {
    var sign = C.byQa("sign");
    sign.setAttribute("data-theme", state.theme);
    var color = state.color || C.byQa("s-color").value;
    sign.style.setProperty("--sign-brand", color);
    sign.style.setProperty("--sign-brand-ink", inkFor(color));
    var name = C.byQa("sign-name");
    name.textContent = state.name || "…";
    name.classList.toggle("is-ethiopic", /[ሀ-᎟]/.test(state.name));
    var rows = C.byQa("sign-hours").querySelectorAll("tr");
    state.week.forEach(function (ranges, index) {
      var td = rows[index].querySelector("td");
      td.outerHTML = dayHtml(H, ranges, S.closed);
    });
    var contact = "";
    if (state.phone) {
      contact += '<div><strong><span lang="am">' + escapeHtml(S.phone.am) + "</span> · " + escapeHtml(S.phone.en) + "</strong> " + escapeHtml(state.phone) + "</div>";
    }
    if (state.link) {
      contact += '<a class="sign-book" href="' + escapeHtml(linkHref(state.link)) + '" data-qa="sign-book"><span lang="am">' +
        escapeHtml(S.bookOnline.am) + "</span> · " + escapeHtml(S.bookOnline.en) + ": " + escapeHtml(state.link) + "</a>";
    }
    C.byQa("sign-contact").innerHTML = contact;
    var pageStyle = document.getElementById("sign-page-size");
    if (!pageStyle) {
      pageStyle = document.createElement("style");
      pageStyle.id = "sign-page-size";
      document.head.appendChild(pageStyle);
    }
    pageStyle.textContent = "@page { size: " + state.paper + " portrait; margin: 0; }";
    var hash = "#s=" + encodeState(state);
    if (history.replaceState) history.replaceState(null, "", location.pathname + location.search + hash);
    C.byQa("s-print-preview").href = location.pathname + "?view=print" + hash;
  }

  function readForm() {
    state.name = C.byQa("s-business").value.trim();
    state.phone = C.byQa("s-phone").value.trim();
    state.link = C.byQa("s-link").value.trim();
    state.theme = C.radioValue("s-theme") || "light";
    state.paper = C.radioValue("s-paper") || "A4";
    state.color = C.byQa("s-color").value;
    C.byQa("s-color-field").hidden = state.theme !== "brand";
  }

  function writeForm() {
    C.byQa("s-business").value = state.name;
    C.byQa("s-phone").value = state.phone;
    C.byQa("s-link").value = state.link;
    if (state.color) C.byQa("s-color").value = state.color;
    document.querySelector('input[name="s-theme"][value="' + state.theme + '"]').checked = true;
    document.querySelector('input[name="s-paper"][value="' + state.paper + '"]').checked = true;
    C.byQa("s-color-field").hidden = state.theme !== "brand";
  }

  C.onReady(function () {
    var fromHash = /#s=([A-Za-z0-9_-]+)/.exec(location.hash);
    state = (fromHash && decodeState(fromHash[1])) || {
      name: C.byQa("s-business").value.trim(), phone: "", link: "", theme: "light", color: null, paper: "A4",
      week: JSON.parse(JSON.stringify(data.week)),
    };
    writeForm();
    if (/[?&]view=print\b/.test(location.search)) document.documentElement.classList.add("print-preview");
    ["s-business", "s-phone", "s-link", "s-color"].forEach(function (name) {
      C.byQa(name).addEventListener("input", function () { readForm(); renderSign(); });
    });
    document.querySelectorAll('input[name="s-theme"], input[name="s-paper"]').forEach(function (input) {
      input.addEventListener("change", function () { readForm(); renderSign(); });
    });
    C.byQa("s-copy-weekdays").addEventListener("click", function () {
      for (var day = 1; day <= 4; day += 1) state.week[day] = JSON.parse(JSON.stringify(state.week[0]));
      renderEditor();
      renderSign();
    });
    C.byQa("s-print").addEventListener("click", function () { window.print(); });
    renderEditor();
    readForm();
    renderSign();
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
