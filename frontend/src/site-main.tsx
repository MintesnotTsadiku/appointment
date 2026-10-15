/**
 * Entry of a business website page (`site.html`, chosen by appointment/www/index.py). See site-app.tsx.
 */
// First: the English groups of website pages, before any module can translate.
import "./lib/i18n/english-site";
import "./fonts.css";
import "./global.css";
import "./public-experience/platform.css";
// First: the page starts its template, fonts and page code before the application code evaluates.
import "./public-experience/early";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import SiteApp from "./site-app";
// Static, so site.html preloads the shared website code (the `public-core` chunk) with the entry.
import "./pages/public-experience/site";
import { captureReferralSource } from "./lib/referral-source";

captureReferralSource();

const container = document.getElementById("root")!;
const root = createRoot(container);
const fullApp = () => import("./full-app");
let handedOver = false;

/** Another address (a scheduler, an account page): the full application takes over the page. */
function handOver() {
  if (handedOver) return;
  handedOver = true;
  void fullApp().then(({ mountFullApp }) => {
    root.unmount();
    mountFullApp(container);
  }, () => window.location.reload());
}

// A booking link opens the full application: load its code once the page is idle.
window.addEventListener("load", () => {
  const idle = window.requestIdleCallback || ((callback: () => void) => window.setTimeout(callback, 1500));
  window.setTimeout(() => idle(() => { void fullApp().catch(() => undefined); }), 2000);
}, { once: true });

root.render(
  <StrictMode>
    <SiteApp onHandOver={handOver} />
  </StrictMode>
);
