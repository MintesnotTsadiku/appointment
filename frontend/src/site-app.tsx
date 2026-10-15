/**
 * The lean application of a business website: the landing page, `/book`, the journal and the gallery
 * (docs/operations/PUBLIC_PERFORMANCE.md). It carries no staff code: no Frappe SDK, realtime, session,
 * motion library, tooltips or staff theme. Any other address hands over, in place, to the full
 * application (full-app.tsx), so a booking link still opens without a page reload.
 */
import { Suspense, useEffect, useMemo } from "react";
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

import { BookingOfflineNotice } from "./components/booking-states";
import { TranslationProvider } from "./context/translation";
import { BASE_ROUTE } from "./lib/constant";
import { recordLocation } from "./lib/history-trail";
import { publicSiteRoutes } from "./public-site-routes";

function FullApplication({ onHandOver }: { onHandOver: () => void }) {
  useEffect(() => onHandOver(), [onHandOver]);
  return null;
}

export default function SiteApp({ onHandOver }: { onHandOver: () => void }) {
  const router = useMemo(() => createBrowserRouter(createRoutesFromElements(
    <>
      {publicSiteRoutes()}
      <Route path="*" element={<FullApplication onHandOver={onHandOver} />} />
    </>,
  ), { basename: BASE_ROUTE }), [onHandOver]);
  // The in-app trail of this tab's history (lib/history-trail.ts), so a scheduler's Back can return here.
  useEffect(() => {
    recordLocation(router.state.location, router.state.historyAction);
    return router.subscribe((state) => recordLocation(state.location, state.historyAction));
  }, [router]);
  return (
    <TranslationProvider>
      <HelmetProvider>
        <Suspense fallback={null}>
          <RouterProvider router={router} />
        </Suspense>
        <BookingOfflineNotice />
      </HelmetProvider>
    </TranslationProvider>
  );
}
