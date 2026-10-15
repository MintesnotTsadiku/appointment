// The whole English catalog (a website page registered only its own groups before the hand-over).
import "./lib/i18n/english";
import { StrictMode } from "react";
import { MotionConfig } from "framer-motion";
import { createRoot } from "react-dom/client";
import "./components/workspace/workspace-controls.css";
import App from "./app.tsx";

/** The full application: staff pages, schedulers, accounts and every other route. */
export function mountFullApp(container: HTMLElement): void {
  createRoot(container).render(
    <StrictMode>
      <MotionConfig reducedMotion="user"><App /></MotionConfig>
    </StrictMode>
  );
}
