import { useEffect, useState, type FormEvent } from "react";
import { callGet, callMethod } from "./api";

const api = "appointment.content.newsletter.public_api.";

/** Behavior only. Each certified template owns its form and visual treatment. */
export function useNewsletterSignup(site: string, locale: string, enabled: boolean) {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(enabled);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setAvailable(false);
    setLoading(enabled && !!site);
    if (enabled && site) callGet<{ available: boolean }>(api + "signup_status", { site })
      .then((result) => { if (active) setAvailable(result.available); }).catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [site, enabled]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !consent || !available) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await callMethod<{ message: string }>(api + "subscribe", { site, email, consent: 1, locale });
      setMessage(result.message);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Signup is unavailable. Please try again later."); }
    finally { setBusy(false); }
  }
  return { available, loading, email, setEmail, consent, setConsent, busy, message, error, submit };
}
