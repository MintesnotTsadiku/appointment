import type { TemplateProps } from "../types";
import { useNewsletterSignup } from "../../useNewsletterSignup";
import "./ergata-newsletter.css";

/** Newsletter signup in Ergata's voice. Shown only when the site turns the newsletter on. */
export function ErgataNewsletter({ snapshot, applicationName, locale, publicRoot }: Pick<TemplateProps, "snapshot" | "applicationName" | "locale" | "publicRoot">) {
  const enabled = !!snapshot.features?.includes("newsletter");
  const signup = useNewsletterSignup(snapshot.siteSlug || decodeURIComponent(publicRoot.slice(1)), locale, enabled);
  if (!enabled) return null;
  return <aside className="eg-newsletter" aria-labelledby="eg-newsletter-title" data-newsletter-template="ergata">
    <div><p className="eg-newsletter-eyebrow">{applicationName}</p><h2 id="eg-newsletter-title">Quiet notes, now and then</h2><p>Short reflections and practice news. No more than once a month.</p></div>
    {signup.loading ? <p role="status">Checking newsletter availability…</p> : signup.available ? <form onSubmit={(event) => void signup.submit(event)}>
      <label>Email address<input type="email" autoComplete="email" required maxLength={160} value={signup.email} onChange={(event) => signup.setEmail(event.target.value)} /></label>
      <label className="eg-newsletter-consent"><input type="checkbox" required checked={signup.consent} onChange={(event) => signup.setConsent(event.target.checked)} /><span>I agree to receive newsletters from {applicationName}. I can unsubscribe at any time.</span></label>
      <button type="submit" disabled={signup.busy || !signup.consent}>{signup.busy ? "Requesting…" : "Receive the notes"}</button>
      {signup.message && <p role="status">{signup.message}</p>}{signup.error && <p role="alert">{signup.error}</p>}
    </form> : <p>Newsletter signup is currently unavailable. Please check back later.</p>}
  </aside>;
}
