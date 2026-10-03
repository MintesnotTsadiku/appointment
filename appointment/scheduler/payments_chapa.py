"""Chapa hosted checkout for booking payments (https://developer.chapa.co).

Flow: `start` creates a Chapa transaction for the booking's open payment and
returns Chapa's checkout URL. Chapa sends the customer back to the manage page,
which calls `confirm_return`; Chapa also calls `callback` and the signed
`webhook`. Every path confirms the payment only after `GET /transaction/verify`
reports success for the expected amount and currency. Keys belong to whoever
collects: the business (Business Payment Settings) or the platform (Payment Settings).
"""

import hashlib
import hmac
import json

import frappe
import requests
from frappe import _
from frappe.rate_limiter import rate_limit
from frappe.utils import flt, get_url

from appointment.scheduler import payments

API = "https://api.chapa.co/v1"
TIMEOUT_SECONDS = 20


def _key(payment, field="chapa_secret_key"):
    key = payments.chapa_key(payment.organization, payment.collector, field)
    if not key and field == "chapa_secret_key":
        frappe.throw(_("Online payment is not set up for this business."))
    return key


def _headers(key):
    return {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=10, seconds=60, methods=["POST"])
def start(token, slug=None):
    """Create the Chapa transaction for this booking and return the checkout URL."""
    from appointment.scheduler.self_service import _require, manage_url

    doc = _require(token, slug)
    payment = payments.open_payment(doc.name)
    if not payment or payment.method != payments.CHAPA or payment.status != "Awaiting payment":
        frappe.throw(_("There is no online payment waiting on this booking."))
    tx_ref = f"bk-{payment.name}-{frappe.generate_hash(length=6)}"
    names = (doc.client_name or "").split()
    body = {
        "amount": f"{flt(payment.amount):.2f}",
        "currency": payment.currency or "ETB",
        "tx_ref": tx_ref,
        "first_name": (names[0] if names else "Customer")[:35],
        "last_name": (" ".join(names[1:]) or "-")[:35],
        "callback_url": get_url("/api/method/appointment.scheduler.payments_chapa.callback"),
        "return_url": manage_url(doc) + "?payment=chapa",
        "customization": {"title": "Booking", "description": f"Booking {doc.appointment_id or doc.name}"[:50]},
        "meta": {"hide_receipt": "false"},
    }
    if doc.client_email and len(doc.client_email) <= 50:
        body["email"] = doc.client_email
    response = requests.post(f"{API}/transaction/initialize", headers=_headers(_key(payment)), json=body, timeout=TIMEOUT_SECONDS)
    data = _json(response)
    checkout_url = (data.get("data") or {}).get("checkout_url")
    if data.get("status") != "success" or not checkout_url:
        frappe.log_error(title="Chapa initialize failed", message=json.dumps(data)[:2000])
        frappe.throw(_("Online payment could not start. Try again or choose bank transfer."))
    payment.db_set({"tx_ref": tx_ref, "checkout_url": checkout_url})
    return {"checkout_url": checkout_url}


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=20, seconds=60, methods=["POST"])
def confirm_return(token, slug=None):
    """Called by the manage page after Chapa sends the customer back."""
    from appointment.scheduler.self_service import _require

    doc = _require(token, slug)
    payment = payments.latest_payment(doc.name)
    if payment and payment.method == payments.CHAPA and payment.tx_ref and payment.status == "Awaiting payment":
        settle(payment)
    return payments.public_view(payments.latest_payment(doc.name))


@frappe.whitelist(allow_guest=True)
@rate_limit(limit=60, seconds=60)
def callback(trx_ref=None, tx_ref=None, **_kwargs):
    """Chapa's unsigned callback; it only triggers a verify."""
    payment = _by_tx_ref(trx_ref or tx_ref)
    if payment and payment.status == "Awaiting payment":
        settle(payment)
    return {"ok": True}


@frappe.whitelist(allow_guest=True, methods=["POST"])
def webhook():
    """Signed Chapa webhook. Chapa retries until it gets a 200, so this tolerates repeats."""
    raw = frappe.request.get_data() or b""
    try:
        body = json.loads(raw or b"{}")
    except ValueError:
        frappe.throw(_("Invalid payload."), frappe.ValidationError)
    payment = _by_tx_ref(body.get("tx_ref") or body.get("trx_ref"))
    if not payment:
        return {"ok": True}
    secret = _key(payment, "chapa_webhook_secret")
    signature = frappe.request.headers.get("x-chapa-signature") or ""
    expected = hmac.new((secret or "").encode(), raw, hashlib.sha256).hexdigest()
    if not secret or not hmac.compare_digest(signature, expected):
        frappe.throw(_("Invalid signature."), frappe.PermissionError)
    if payment.status == "Awaiting payment" and (body.get("event") or "").startswith("charge.success"):
        settle(payment)
    return {"ok": True}


def settle(payment):
    """Mark the payment paid when Chapa's verify API confirms the full amount."""
    result = verify(payment)
    data = result.get("data") or {}
    if data.get("status") == "success" and flt(data.get("amount")) >= flt(payment.amount) and (data.get("currency") or "ETB") == (payment.currency or "ETB"):
        payments.mark_paid(payment, provider_reference=data.get("reference"))
        return True
    return False


def cancel(payment):
    """Expire Chapa's checkout link for an unpaid hold (best effort)."""
    if payment.tx_ref:
        requests.put(f"{API}/transaction/cancel/{payment.tx_ref}", headers=_headers(_key(payment)), timeout=TIMEOUT_SECONDS)


def verify(payment):
    response = requests.get(f"{API}/transaction/verify/{payment.tx_ref}", headers=_headers(_key(payment)), timeout=TIMEOUT_SECONDS)
    if response.status_code == 404:
        return {}
    return _json(response)


def _by_tx_ref(tx_ref):
    if not tx_ref:
        return None
    name = frappe.db.get_value("Booking Payment", {"tx_ref": tx_ref}, "name")
    return frappe.get_doc("Booking Payment", name) if name else None


def _json(response):
    try:
        return response.json()
    except ValueError:
        return {"status": "failed", "message": response.text[:500]}
