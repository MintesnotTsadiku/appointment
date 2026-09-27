import type { TemplateProps } from "../types";
import { useNewsletterSignup } from "../../useNewsletterSignup";
import "./abugida-newsletter.css";

export function AbugidaNewsletter({ snapshot, applicationName, locale, publicRoot }: Pick<TemplateProps, "snapshot" | "applicationName" | "locale" | "publicRoot">) {
  const signup = useNewsletterSignup(snapshot.siteSlug || decodeURIComponent(publicRoot.slice(1)), locale, !!snapshot.features?.includes("newsletter"));
  return <aside className="abugida-newsletter" aria-labelledby="abugida-newsletter-title" data-newsletter-template="abugida">
    <div><p className="abugida-newsletter-eyebrow">{applicationName} · Newsletter</p><h2 id="abugida-newsletter-title">Keep your practice growing</h2><p>Learning ideas and news from our language community.</p></div>
    {signup.loading ? <p role="status">Checking newsletter availability…</p> : signup.available ? <form onSubmit={(event) => void signup.submit(event)}>
      <label>Email address<input type="email" autoComplete="email" required maxLength={160} value={signup.email} onChange={(event) => signup.setEmail(event.target.value)} /></label>
      <label className="abugida-newsletter-consent"><input type="checkbox" required checked={signup.consent} onChange={(event) => signup.setConsent(event.target.checked)} /><span>I agree to receive newsletters from {applicationName}. I can unsubscribe at any time.</span></label>
      <button type="submit" disabled={signup.busy || !signup.consent}>{signup.busy ? "Requesting…" : "Join our learning letters"}</button>
      {signup.message && <p role="status">{signup.message}</p>}{signup.error && <p role="alert">{signup.error}</p>}
    </form> : <p>Newsletter signup is currently unavailable. Please check back later.</p>}
  </aside>;
}
