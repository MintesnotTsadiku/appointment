/*
 * Shared helpers for the free tool pages (/tools/*, /am/tools/*).
 * Pure helpers are tested by frontend/tests/tools-pages.test.mjs; keep DOM access in functions.
 */
(function (root) {
  "use strict";

  /** "Hello {0}" with positional arguments. */
  function fmt(template) {
    var args = Array.prototype.slice.call(arguments, 1);
    return String(template || "").replace(/\{(\d+)\}/g, function (match, index) {
      return args[index] === undefined ? match : String(args[index]);
    });
  }

  /** Replace {name} placeholders from an object; unknown names stay as they are. */
  function fill(template, values) {
    return String(template || "").replace(/\{([a-z]+)\}/g, function (match, name) {
      return Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match;
    });
  }

  function telegramShareUrl(url, text) {
    return "https://t.me/share/url?url=" + encodeURIComponent(url) + "&text=" + encodeURIComponent(text);
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  var api = { fmt: fmt, fill: fill, telegramShareUrl: telegramShareUrl, pad: pad };
  root.ToolsCommon = api;
  if (typeof module === "object" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  /* DOM helpers ----------------------------------------------------------- */
  api.byQa = function (name, scope) {
    return (scope || document).querySelector('[data-qa="' + name + '"]');
  };

  api.data = function () {
    var node = document.getElementById("tool-data");
    try {
      return node ? JSON.parse(node.textContent) : {};
    } catch (error) {
      return {};
    }
  };

  api.radioValue = function (name) {
    var checked = document.querySelector('input[name="' + name + '"]:checked');
    return checked ? checked.value : "";
  };

  api.onReady = function (callback) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", callback);
    else callback();
  };

  function legacyCopy(text) {
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    var done = false;
    try {
      done = document.execCommand("copy");
    } catch (error) {
      done = false;
    }
    document.body.removeChild(area);
    return done;
  }

  /** Copy text and show the result on the button for two seconds. */
  api.copy = function (text, button, labels) {
    var label = button && button.querySelector("[data-label]");
    var original = label ? label.textContent : "";
    function show(ok) {
      if (!button) return;
      button.classList.toggle("is-done", ok);
      if (label) label.textContent = ok ? labels.copied : labels.copyFailed;
      clearTimeout(button._copyTimer);
      button._copyTimer = setTimeout(function () {
        button.classList.remove("is-done");
        if (label) label.textContent = original;
      }, 2000);
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { show(true); }, function () { show(legacyCopy(text)); });
    } else {
      show(legacyCopy(text));
    }
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
