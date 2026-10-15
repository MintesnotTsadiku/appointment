/**
 * Imported first by the full application's entry (main.tsx), so it runs before the application code
 * evaluates: a public page starts its own requests at once (docs/operations/PUBLIC_PERFORMANCE.md).
 */
import { prefetchScheduler } from "./lib/scheduler-prefetch";
import { prefetchPublicPage } from "./public-experience/prefetch";

prefetchPublicPage();
prefetchScheduler();
