import type { TemplateProps } from "../types";
import { useNewsletterSignup } from "../../useNewsletterSignup";
import "./meron-newsletter.css";

export function MeronNewsletter({ snapshot, applicationName, locale, publicRoot }: Pick<TemplateProps, "snapshot" | "applicationName" | "locale" | "publicRoot">) {
  const signup = useNewsletterSignup(snapshot.siteSlug || decodeURIComponent(publicRoot.slice(1)), locale, !!snapshot.features?.includes("newsletter"));
  return <aside className="meron-newsletter" aria-labelledby="meron-newsletter-title" data-newsletter-template="meron">
    <div><p className="meron-newsletter-eyebrow">{applicationName} · Newsletter</p><h2 id="meron-newsletter-title">Notes from the atelier</h2><p>Thoughtful stories about craft, care, and what comes next.</p></div>
    {signup.loading ? <p role="status">Checking newsletter availability…</p> : signup.available ? <form onSubmit={(event) => void signup.submit(event)}>
      <label>Email address<input type="email" autoComplete="email" required maxLength={160} value={signup.email} onChange={(event) => signup.setEmail(event.target.value)} /></label>
      <label className="meron-newsletter-consent"><input type="checkbox" required checked={signup.consent} onChange={(event) => signup.setConsent(event.target.checked)} /><span>I agree to receive newsletters from {applicationName}. I can unsubscribe at any time.</span></label>
      <button type="submit" disabled={signup.busy || !signup.consent}>{signup.busy ? "Requesting…" : "Receive our notes"}</button>
      {signup.message && <p role="status">{signup.message}</p>}{signup.error && <p role="alert">{signup.error}</p>}
    </form> : <p>Newsletter signup is currently unavailable. Please check back later.</p>}
  </aside>;
}
