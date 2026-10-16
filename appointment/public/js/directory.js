/*
 * Public business directory (appointment/www/directory.html): progressive enhancement only.
 * Without this script the page is complete: the search is a GET form that the server redirects,
 * and the cards show everything except live times.
 *
 * - Search: counts per area for the chosen service, a button that says how many businesses match,
 *   and a direct move to the clean address (no redirect hop).
 * - Live times: for businesses whose owner shows live availability, the next free time from the
 *   guest endpoint `get_next_availability` (counts and start times only), asked when a card comes
 *   near the screen. Nothing is shown when the owner has it off or the request fails.
 * - The Addis Ababa clock in the top bar.
 */
(function () {
  "use strict";

  var node = document.getElementById("dx-data");
  if (!node) return;
  var data;
  try {
    data = JSON.parse(node.textContent || "{}");
  } catch (error) {
    return;
  }
  var lang = data.lang === "am" ? "am" : "en";
  var zone = data.zone || "Africa/Addis_Ababa";
  var labels = data.labels || {};
  var live = data.live || {};
  var ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?Z$/;

  function fill(text, values) {
    return String(text || "").replace(/\{(\w+)\}/g, function (match, key) {
      return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match;
    });
  }

  // Clock ---------------------------------------------------------------------
  var clockFormat = new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  function tick() {
    var text = clockFormat.format(new Date());
    document.querySelectorAll("[data-clock]").forEach(function (element) {
      element.textContent = text;
    });
  }
  tick();
  window.setInterval(tick, 30000);

  // Search --------------------------------------------------------------------
  var form = document.querySelector('[data-qa="directory-search"]');
  if (form) {
    var service = form.querySelector('select[name="service"]');
    var area = form.querySelector('select[name="where"]');
    var button = form.querySelector('[data-qa="directory-search-go"]');
    var label = form.querySelector("[data-search-label]");
    var pairs = data.pairs || {};

    var count = function (category, place) {
      if (!category && !place) return data.total || 0;
      var total = 0;
      Object.keys(pairs).forEach(function (key) {
        var parts = key.split("/");
        if ((!category || parts[0] === category) && (!place || parts[1] === place)) total += pairs[key];
      });
      return total;
    };
    var businesses = function (total) {
      return total === 1 ? labels.one : fill(labels.many, { 0: total });
    };
    var update = function () {
      Array.prototype.forEach.call(area.options, function (option) {
        if (!option.value) return;
        var total = count(service.value, option.value);
        option.textContent = (option.getAttribute("data-label") || option.value) + " (" + total + ")";
        option.disabled = total === 0 && !option.selected;
      });
      var total = count(service.value, area.value);
      label.textContent = total === 0 ? labels.none : fill(service.value || area.value ? labels.some : labels.any, { 0: businesses(total) });
      button.setAttribute("aria-disabled", total === 0 ? "true" : "false");
    };
    service.addEventListener("change", update);
    area.addEventListener("change", update);
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (count(service.value, area.value) === 0) return;
      var base = data.base || "/directory";
      var path = base;
      if (service.value) path += "/" + encodeURIComponent(service.value);
      else if (area.value) path += "/" + encodeURIComponent(data.place || "in");
      if (area.value) path += "/" + encodeURIComponent(area.value);
      window.location.assign(path);
    });
    update();
  }

  // Live next free times ---------------------------------------------------------
  if (!live.endpoint || !window.fetch) return;
  var dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" });
  var weekday = new Intl.DateTimeFormat(lang === "am" ? "am-ET" : "en", { timeZone: zone, weekday: "long" });
  var asked = {};

  function habesha(time) {
    var parts = time.split(":");
    var hour24 = Number(parts[0]);
    var minute = Number(parts[1]);
    var hour = hour24 - 6;
    if (hour < 0) hour += 12;
    if (hour === 0) hour = 12;
    else if (hour > 12) hour -= 12;
    var prefix = hour24 < 6 ? "ከሌሊቱ" : hour24 < 12 ? "ከጠዋቱ" : hour24 < 18 ? "ከቀኑ" : "ከምሽቱ";
    return prefix + " " + (minute ? hour + ":" + parts[1] : String(hour)) + " ሰዓት";
  }

  function describe(iso) {
    var start = new Date(iso);
    var now = new Date();
    var key = dayKey.format(start);
    var when = key === dayKey.format(now) ? live.today
      : key === dayKey.format(new Date(now.getTime() + 864e5)) ? live.tomorrow : weekday.format(start);
    var time = clockFormat.format(start);
    return { when: when, time: time, long: fill(live.next, { when: when, time: lang === "am" ? time + " (" + habesha(time) + ")" : time }) };
  }

  function ask(path) {
    if (!asked[path]) {
      var query = new URLSearchParams({ public_path: path });
      asked[path] = fetch(live.endpoint + "?" + query, { credentials: "same-origin", headers: { Accept: "application/json" } })
        .then(function (response) { return response.ok ? response.json() : null; })
        .then(function (body) {
          var answer = body && body.message;
          var next = answer && answer.enabled === true && answer.next;
          return next && typeof next.start === "string" && ISO.test(next.start) ? describe(next.start) : null;
        })
        .catch(function () { return null; });
    }
    return asked[path];
  }

  function show(path) {
    ask(path).then(function (slot) {
      if (!slot) return;
      document.querySelectorAll("[data-live-path]").forEach(function (holder) {
        if (holder.getAttribute("data-live-path") !== path) return;
        var long = holder.querySelector("[data-live-long]");
        if (long) {
          long.textContent = slot.long;
          long.hidden = false;
        }
        var short = holder.querySelector("[data-live-short]");
        if (short) {
          var time = document.createElement("b");
          time.textContent = slot.time;
          short.textContent = "";
          short.appendChild(time);
          short.appendChild(document.createTextNode(slot.when));
          short.setAttribute("data-ready", "");
        }
      });
    });
  }

  function start() {
    var holders = Array.prototype.slice.call(document.querySelectorAll("[data-live-path]"));
    if (!("IntersectionObserver" in window)) {
      holders.forEach(function (holder) { show(holder.getAttribute("data-live-path")); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        show(entry.target.getAttribute("data-live-path"));
      });
    }, { rootMargin: "300px 0px" });
    holders.forEach(function (holder) { observer.observe(holder); });
  }

  // After the page has painted: live times never compete with the first view.
  var later = function () {
    if ("requestIdleCallback" in window) window.requestIdleCallback(start, { timeout: 2500 });
    else window.setTimeout(start, 800);
  };
  if (document.readyState === "complete") later();
  else window.addEventListener("load", later, { once: true });
})();
