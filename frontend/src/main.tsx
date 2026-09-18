import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./global.css";
import App from "./app.tsx";

/**
 * The isolated worktree QA runtime disables StrictMode because its double-mount
 * in development creates a second `frappe-react-sdk` socket that is never
 * disconnected, producing engine.io polling 400s. Normal development and
 * production keep StrictMode.
 */
const app = import.meta.env.VITE_DISABLE_STRICT_MODE === "true" ? (
  <App />
) : (
  <StrictMode>
    <App />
  </StrictMode>
);

createRoot(document.getElementById("root")!).render(app);
