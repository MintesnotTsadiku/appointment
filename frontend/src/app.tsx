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
import { Toaster } from "./components/sonner";
import ModeToggle from "./components/theme-provider/components/modeToggle";
import { InstallPrompt } from "./components/pwa/InstallPrompt";
import { UpdateNotification } from "./components/pwa/UpdateNotification";
import { ConnectionStatus } from "./components/pwa/ConnectionStatus";

const App = () => {
  const router = createBrowserRouter(createRoutesFromElements(Router()), {
    basename: BASE_ROUTE,
  });
  return (
    <>
      <AppProvider>
        <TranslationProvider>
          <LandingPageSettingsProvider>
            <HelmetProvider>
              <FrappeProvider
                url={import.meta.env.VITE_BASE_URL ?? ""}
                socketPort={import.meta.env.VITE_SOCKET_PORT}
                enableSocket={
                  import.meta.env.VITE_ENABLE_SOCKET === "true" ? true : false
                }
                siteName={getSiteName()}
              >
                <TooltipProvider>
                  <Suspense fallback={<></>}>
                    <RouterProvider router={router} />
                    <Toaster />
                    <ModeToggle/>
                    {/* PWA Components */}
                    <InstallPrompt />
                    <UpdateNotification />
                    <ConnectionStatus />
                  </Suspense>
                </TooltipProvider>
              </FrappeProvider>
            </HelmetProvider>
          </LandingPageSettingsProvider>
        </TranslationProvider>
      </AppProvider>
    </>
  );
};

export default App;
