/*
 * Partner program page: copy buttons for the Telegram kit, and the application form.
 * Without this script the form posts to the page and the server renders the result
 * (appointment/growth/partner_page.py). With it, the form validates inline and posts to the
 * guest API, then shows the same success state in place.
 */
(function () {
  "use strict";

  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function copyText(button) {
    var source = document.getElementById(button.getAttribute("data-copy"));
    if (!source) return;
    var label = button.querySelector("span");
    var original = label ? label.textContent : "";
    var done = function () {
      button.classList.add("is-done");
      if (label) label.textContent = button.getAttribute("data-copied") || original;
      window.setTimeout(function () {
        button.classList.remove("is-done");
        if (label) label.textContent = original;
      }, 2000);
    };
    var text = source.textContent || "";
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, function () { selectFallback(source, done); });
    } else {
      selectFallback(source, done);
    }
  }

  function selectFallback(source, done) {
    var range = document.createRange();
    range.selectNodeContents(source);
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    try {
      if (document.execCommand("copy")) done();
    } catch (error) {
      /* The text stays selected so the visitor can copy it by hand. */
    }
  }

  function setError(form, field, message) {
    var target = form.querySelector('[data-error-for="' + field + '"]');
    var input = form.elements[field];
    if (target) {
      target.textContent = message || "";
      target.hidden = !message;
    }
    if (input && input.setAttribute && input.type !== "radio") {
      if (message) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
    }
  }

  function validate(form) {
    var data = form.dataset;
    var name = form.elements.name.value.trim();
    var email = form.elements.email.value.trim();
    var kind = form.querySelector('input[name="kind"]:checked');
    var phone = form.elements.phone.value.trim();
    var errors = {
      name: !name ? data.msgName : name.length > 140 ? data.msgLong : "",
      email: !email || email.length > 140 || !EMAIL.test(email) ? data.msgEmail : "",
      phone: phone && !window.AppointmentPhone.normalize(phone) ? data.msgPhone : "",
      kind: kind ? "" : data.msgKind,
      organization: form.elements.organization.value.trim().length > 140 ? data.msgLong : "",
      message: form.elements.message.value.trim().length > 1000 ? data.msgLong : "",
    };
    var first = null;
    Object.keys(errors).forEach(function (field) {
      setError(form, field, errors[field]);
      if (errors[field] && !first) first = field;
    });
    return first;
  }

  function showFormError(form, message) {
    var box = form.querySelector('[data-qa="partners-form-error"]');
    box.textContent = message || "";
    box.hidden = !message;
    if (message) box.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  function serverMessage(body) {
    try {
      var messages = JSON.parse(body._server_messages || "[]");
      var last = messages.length ? JSON.parse(messages[messages.length - 1]) : null;
      var text = last && (last.message || last);
      if (typeof text === "string") {
        // DOMParser builds an inert document: markup in a message never loads or runs.
        return (new DOMParser().parseFromString(text, "text/html").body.textContent || "").trim();
      }
    } catch (error) {
      /* Fall back to the generic message. */
    }
    return "";
  }

  function submit(event) {
    var form = event.currentTarget;
    event.preventDefault();
    showFormError(form, "");
    var invalid = validate(form);
    if (invalid) {
      showFormError(form, form.dataset.msgFix);
      var input = form.elements[invalid];
      var focus = input && input.length && input[0] ? input[0] : input;
      if (focus && focus.focus) focus.focus();
      return;
    }
    var button = form.querySelector('[type="submit"]');
    var label = button.querySelector("span");
    var original = label.textContent;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    label.textContent = form.dataset.msgSending;

    var payload = new URLSearchParams();
    ["name", "organization", "email", "message"].forEach(function (field) {
      payload.append(field, form.elements[field].value.trim());
    });
    payload.append("phone", window.AppointmentPhone.normalize(form.elements.phone.value));
    payload.append("kind", form.querySelector('input[name="kind"]:checked').value);
    var headers = { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" };
    var token = form.elements.csrf_token;
    if (token && token.value) headers["X-Frappe-CSRF-Token"] = token.value;

    fetch("/api/method/" + form.dataset.method, { method: "POST", credentials: "same-origin", headers: headers, body: payload })
      .then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (body) {
          return { ok: response.ok, status: response.status, body: body };
        });
      })
      .then(function (result) {
        if (result.ok) {
          var success = document.querySelector('[data-qa="partners-success"]');
          var message = result.body.message && result.body.message.message;
          if (message) success.querySelector('[data-qa="partners-success-text"]').textContent = message;
          form.hidden = true;
          success.hidden = false;
          success.setAttribute("tabindex", "-1");
          success.focus();
          return;
        }
        var text = result.status === 429 ? form.dataset.msgRate : serverMessage(result.body) || form.dataset.msgFailed;
        showFormError(form, text);
      })
      .catch(function () {
        showFormError(form, form.dataset.msgFailed);
      })
      .then(function () {
        button.disabled = false;
        button.removeAttribute("aria-busy");
        label.textContent = original;
      });
  }

  function clearOnInput(event) {
    var field = event.target.name;
    if (field) setError(event.currentTarget, field, "");
  }

  document.querySelectorAll("[data-copy]").forEach(function (button) {
    button.addEventListener("click", function () { copyText(button); });
  });
  var form = document.querySelector('[data-qa="partners-form"]');
  if (form) {
    form.addEventListener("submit", submit);
    form.addEventListener("input", clearOnInput);
    form.addEventListener("change", clearOnInput);
  }
})();
