/**
 * External dependencies.
 */
import { Suspense, useMemo, useEffect, useState } from "react";
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
import { ThemeProvider } from "./components/theme-provider";
import { SessionProvider } from "./context/session";
import { Toaster } from "./components/sonner";
import ModeToggle from "./components/theme-provider/components/modeToggle";
import { InstallPrompt } from "./components/pwa/InstallPrompt";
import { UpdateNotification } from "./components/pwa/UpdateNotification";
import { ConnectionStatus } from "./components/pwa/ConnectionStatus";
import { isPublicExperiencePath } from "./public-experience/routes";

const App = () => {
  const router = useMemo(() => createBrowserRouter(createRoutesFromElements(Router()), { basename: BASE_ROUTE }), []);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  useEffect(() => router.subscribe(state => setCurrentPath(state.location.pathname)), [router]);
  const pathname = typeof window === "undefined" ? "/" : window.location.pathname;
  const standalone = isPublicExperiencePath(pathname);
  const publicOnly = standalone || pathname.startsWith("/schedule/");
  const usesPlatformLandingSettings = pathname === "/";
  const runtime = (
    <HelmetProvider>
      <FrappeProvider
        url={import.meta.env.VITE_BASE_URL ?? ""}
        socketPort={import.meta.env.VITE_SOCKET_PORT}
        // The SDK socket is created during render with no cleanup and leaks under
        // StrictMode. RealtimeProvider owns the application socket instead.
        enableSocket={false}
        siteName={getSiteName()}
      >
        <RealtimeProvider enabled={!publicOnly}>
          <SessionProvider enabled={!publicOnly}>
            <ThemeProvider pathname={currentPath}>
            <TooltipProvider>
              <Suspense fallback={<></>}>
                <RouterProvider router={router} />
                <Toaster />
                {standalone ? null : <ModeToggle />}
                {standalone ? null : <InstallPrompt />}
                <UpdateNotification showNotifications={!publicOnly} />
                {standalone ? null : <ConnectionStatus />}
              </Suspense>
            </TooltipProvider>
            </ThemeProvider>
          </SessionProvider>
        </RealtimeProvider>
      </FrappeProvider>
    </HelmetProvider>
  );

  return (
    <AppProvider>
      <TranslationProvider>
        {usesPlatformLandingSettings ? (
          <LandingPageSettingsProvider>{runtime}</LandingPageSettingsProvider>
        ) : runtime}
      </TranslationProvider>
    </AppProvider>
  );
};

export default App;
