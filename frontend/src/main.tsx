import { StrictMode } from "react";
import { MotionConfig } from "framer-motion";
import { createRoot } from "react-dom/client";
import "./global.css";
import App from "./app.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user"><App /></MotionConfig>
  </StrictMode>
);
