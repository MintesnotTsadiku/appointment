/**
 * Landing Page Settings Context Provider
 * Makes CMS-managed content available throughout the landing page
 */

import React, { createContext, useContext, ReactNode } from 'react';
import {
  useLandingPageSettings,
  useApplyBrandColors,
  LandingPageSettings,
} from '@/lib/landingPageSettings';

interface LandingPageSettingsContextValue {
  settings: LandingPageSettings | null;
  loading: boolean;
  error: string | null;
  getText: (obj: { en: string; am: string } | undefined) => string;
}

const LandingPageSettingsContext = createContext<LandingPageSettingsContextValue | undefined>(
  undefined
);

export function LandingPageSettingsProvider({ children }: { children: ReactNode }) {
  const { settings, loading, error, getText } = useLandingPageSettings();

  // Apply brand colors to CSS variables when settings load
  useApplyBrandColors(settings);

  return (
    <LandingPageSettingsContext.Provider value={{ settings, loading, error, getText }}>
      {children}
    </LandingPageSettingsContext.Provider>
  );
}

export function useLandingPageSettingsContext() {
  const context = useContext(LandingPageSettingsContext);
  if (context === undefined) {
    throw new Error(
      'useLandingPageSettingsContext must be used within a LandingPageSettingsProvider'
    );
  }
  return context;
}




