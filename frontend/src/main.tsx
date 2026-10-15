// First: the English catalog, before any module can translate.
import "./lib/i18n/english";
import "./fonts.css";
import "./global.css";
// Template font faces (and their preloads, shell_boot.py) must be known before the first render.
import "./public-experience/platform.css";
// First: a public page starts its requests before the application code below evaluates.
import "./early-requests";
import { mountFullApp } from "./full-app";
import { captureReferralSource } from "./lib/referral-source";

captureReferralSource();
mountFullApp(document.getElementById("root")!);
