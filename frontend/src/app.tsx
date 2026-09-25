/**
 * External dependencies.
 */
import { Suspense } from "react";
import {
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
} from "react-router-dom";
import { FrappeProvider } from "frappe-react-sdk";
import { HelmetProvider } from "react-helmet-async";

/**
 * Internal dependencies.
 */
import Router from "./route";
import { BASE_ROUTE } from "./lib/constant";
import { getSiteName } from "./lib/utils";
import { TooltipProvider } from "@/components/tooltip";
import { AppProvider } from "./context/app";
import { TranslationProvider } from "./context/translation";
import { LandingPageSettingsProvider } from "./context/landingPageSettings";
import { RealtimeProvider } from "./components/realtime/RealtimeProvider";
import { SessionProvider } from "./context/session";
import { Toaster } from "./components/sonner";
import ModeToggle from "./components/theme-provider/components/modeToggle";
import { InstallPrompt } from "./components/pwa/InstallPrompt";
import { UpdateNotification } from "./components/pwa/UpdateNotification";
import { ConnectionStatus } from "./components/pwa/ConnectionStatus";
import { isPublicExperiencePath } from "./public-experience/routes";

const App = () => {
  const router = createBrowserRouter(createRoutesFromElements(Router()), {
    basename: BASE_ROUTE,
  });
  // Public sites render standalone: hide authenticated chrome (theme toggle,
  // PWA prompts) so a tenant website never shows management UI.
  const standalone =
    typeof window !== "undefined" && isPublicExperiencePath(window.location.pathname);
  return (
    <>
      <AppProvider>
        <TranslationProvider>
          <LandingPageSettingsProvider>
            <HelmetProvider>
              <FrappeProvider
                url={import.meta.env.VITE_BASE_URL ?? ""}
                socketPort={import.meta.env.VITE_SOCKET_PORT}
                // The SDK socket is created during render with no cleanup and
                // leaks under StrictMode. This app owns its socket in
                // RealtimeProvider instead; see that file for the upstream note.
                enableSocket={false}
                siteName={getSiteName()}
              >
                <RealtimeProvider>
                  <SessionProvider>
                    <TooltipProvider>
                      <Suspense fallback={<></>}>
                        <RouterProvider router={router} />
                        <Toaster />
                        {standalone ? null : <ModeToggle />}
                        {/* PWA Components */}
                        {standalone ? null : <InstallPrompt />}
                        <UpdateNotification />
                        {standalone ? null : <ConnectionStatus />}
                      </Suspense>
                    </TooltipProvider>
                  </SessionProvider>
                </RealtimeProvider>
              </FrappeProvider>
            </HelmetProvider>
          </LandingPageSettingsProvider>
        </TranslationProvider>
      </AppProvider>
    </>
  );
};

export default App;
