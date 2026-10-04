import { useState } from "react";
import { useParams } from "react-router-dom";
import { callMethod } from "@/public-experience/api";

export default function NewsletterAction() {
  const { action, token } = useParams();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const method = action === "sender" ? "verify_sender" : action === "confirm" ? "confirm" : action === "unsubscribe" ? "unsubscribe" : null;
  const title = action === "sender" ? "Verify newsletter sender" : action === "confirm" ? "Confirm newsletter subscription" : "Unsubscribe from newsletter";
  async function apply() {
    if (!method || busy) return;
    setBusy(true); setError("");
    try {
      const result = await callMethod<{ message: string }>("appointment.content.newsletter.public_api." + method, { token });
      setMessage(result.message);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "This link is unavailable."); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-xl space-y-5 p-8" data-page="newsletter-action">
    <h1 className="text-3xl font-semibold">{title}</h1>
    <p>{action === "sender" ? "This verifies the local email sink only. External email delivery is disabled." : "Choose below to apply this newsletter preference."}</p>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {!message && <button className="rounded-lg border px-5 py-3 disabled:opacity-50" disabled={busy || !method} onClick={() => void apply()}>{busy ? "Applying…" : title}</button>}
  </main>;
}
