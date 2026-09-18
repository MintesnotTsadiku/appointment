/**
 * Landing Page Settings API Hook
 * Fetches CMS-managed content from the backend
 */

import { useState, useEffect } from 'react';
import { useTranslation } from './i18n';

export interface LandingPageSettings {
  hero: {
    enabled: boolean;
    eyebrow: { en: string; am: string };
    headline1: { en: string; am: string };
    headline2: { en: string; am: string };
    subheadline: { en: string; am: string };
    ctaPrimary: { en: string; am: string };
    ctaSecondary: { en: string; am: string };
    trust: {
      count: string;
      label: { en: string; am: string };
      rating: string;
      reviewsCount: string;
    };
    carouselImages: Array<{
      url: string;
      altText: { en: string; am: string };
    }>;
  };
  partners: {
    enabled: boolean;
    title: { en: string; am: string };
    subtitle: { en: string; am: string };
    list: Array<{
      name: string;
      logo: string;
    }>;
    stats: {
      activeUsers: { value: string; label: { en: string; am: string } };
      appointments: { value: string; label: { en: string; am: string } };
      uptime: { value: string; label: { en: string; am: string } };
      rating: { value: string; label: { en: string; am: string } };
    };
  };
  valueProposition: {
    enabled: boolean;
    title: { en: string; am: string };
    subtitle: { en: string; am: string };
    items: Array<{
      title: { en: string; am: string };
      description: { en: string; am: string };
      metric: { en: string; am: string };
      image: string;
    }>;
  };
  features: {
    enabled: boolean;
    title: { en: string; am: string };
    subtitle: { en: string; am: string };
    list: Array<{
      title: { en: string; am: string };
      description: { en: string; am: string };
      image: string;
    }>;
  };
  useCases: {
    enabled: boolean;
    title: { en: string; am: string };
    subtitle: { en: string; am: string };
    list: Array<{
      title: { en: string; am: string };
      subtitle: { en: string; am: string };
      description: { en: string; am: string };
      image: string;
    }>;
  };
  howItWorks: {
    enabled: boolean;
    title: { en: string; am: string };
    subtitle: { en: string; am: string };
    steps: Array<{
      number: number;
      title: { en: string; am: string };
      description: { en: string; am: string };
      image: string;
    }>;
  };
  pricing: {
    enabled: boolean;
    title: { en: string; am: string };
    subtitle: { en: string; am: string };
    currency: {
      symbol: string;
      code: string;
    };
    tiers: Array<{
      name: { en: string; am: string };
      description: { en: string; am: string };
      monthlyPrice: number;
      yearlyPrice: number;
      isPopular: boolean;
    }>;
  };
  faq: {
    enabled: boolean;
    title: { en: string; am: string };
    subtitle: { en: string; am: string };
    items: Array<{
      question: { en: string; am: string };
      answer: { en: string; am: string };
    }>;
  };
  finalCTA: {
    enabled: boolean;
    title: { en: string; am: string };
    subtitle: { en: string; am: string };
    buttonText: { en: string; am: string };
    trustIndicators: Array<{ en: string; am: string }>;
  };
  footer: {
    enabled: boolean;
    tagline: { en: string; am: string };
    contact: {
      email: string;
      phone: string;
      location: { en: string; am: string };
      supportHours: { en: string; am: string };
    };
    socialLinks: Array<{
      platform: string;
      url: string;
    }>;
    links: Array<{
      section: string;
      text: { en: string; am: string };
      url: string;
    }>;
  };
  brand: {
    colors: {
      primary: string;
      secondary: string;
      accentGold: string;
      accentTeal: string;
    };
    logos: {
      light: string;
      dark: string;
      favicon: string;
    };
  };
  seo: {
    title: { en: string; am: string };
    description: { en: string; am: string };
    ogImage: string;
    keywords: string;
  };
}

interface UseLandingPageSettingsReturn {
  settings: LandingPageSettings | null;
  loading: boolean;
  error: string | null;
  getText: (obj: { en: string; am: string } | undefined) => string;
}

/**
 * Hook to fetch and use landing page settings from the backend
 * Falls back to translation files if API fails
 */
export function useLandingPageSettings(): UseLandingPageSettingsReturn {
  const [settings, setSettings] = useState<LandingPageSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { language } = useTranslation();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        '/api/method/appointment.scheduler.doctype.landing_page_settings.api.get_landing_page_settings',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.message && data.message.success) {
        setSettings(data.message.data);
        setError(null);
      } else {
        throw new Error(data.message?.error || 'Failed to fetch settings');
      }
    } catch (err) {
      console.error('Error fetching landing page settings:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Don't set settings to null on error - let components fall back to translations
    } finally {
      setLoading(false);
    }
  };

  /**
   * Helper function to get text in current language
   */
  const getText = (obj: { en: string; am: string } | undefined): string => {
    if (!obj) return '';
    return language === 'am' ? obj.am || obj.en : obj.en || obj.am;
  };

  return { settings, loading, error, getText };
}

/**
 * Helper function to get color from brand settings or use default
 */
export function useBrandColors(settings: LandingPageSettings | null) {
  const defaultColors = {
    primary: '#6366F1',
    secondary: '#10B981',
    accentGold: '#F59E0B',
    accentTeal: '#14B8A6',
  };

  return settings?.brand?.colors || defaultColors;
}

/**
 * Helper function to lighten a hex color
 */
function lightenColor(hex: string, percent: number): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Lighten
  const newR = Math.min(255, Math.floor(r + (255 - r) * percent));
  const newG = Math.min(255, Math.floor(g + (255 - g) * percent));
  const newB = Math.min(255, Math.floor(b + (255 - b) * percent));
  
  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Helper function to darken a hex color
 */
function darkenColor(hex: string, percent: number): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Darken
  const newR = Math.max(0, Math.floor(r * (1 - percent)));
  const newG = Math.max(0, Math.floor(g * (1 - percent)));
  const newB = Math.max(0, Math.floor(b * (1 - percent)));
  
  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Hook to apply brand colors to CSS variables
 */
export function useApplyBrandColors(settings: LandingPageSettings | null) {
  useEffect(() => {
    if (settings?.brand?.colors) {
      const root = document.documentElement;
      const colors = settings.brand.colors;

      console.log('🎨 Applying brand colors from CMS:', colors);

      // Apply brand colors to CSS variables with intelligent variants
      if (colors.primary) {
        root.style.setProperty('--brand-primary', colors.primary);
        
        // Generate darker variant (for hover states)
        const primaryDark = darkenColor(colors.primary, 0.15);
        root.style.setProperty('--brand-primary-dark', primaryDark);
        
        // Generate lighter variant (for backgrounds, borders)
        const primaryLight = lightenColor(colors.primary, 0.20);
        root.style.setProperty('--brand-primary-light', primaryLight);
        
        // Update gradient colors with subtle variation
        const gradientEnd = lightenColor(colors.primary, 0.10);
        root.style.setProperty('--gradient-hero-start', colors.primary);
        root.style.setProperty('--gradient-hero-end', gradientEnd);
        root.style.setProperty('--gradient-feature-start', colors.primary);
        root.style.setProperty('--gradient-feature-mid', gradientEnd);
        root.style.setProperty('--gradient-feature-end', lightenColor(colors.primary, 0.15));
        
        console.log('  Primary:', colors.primary);
        console.log('  Primary Dark:', primaryDark);
        console.log('  Primary Light:', primaryLight);
      }
      
      if (colors.secondary) {
        root.style.setProperty('--brand-secondary', colors.secondary);
        const secondaryDark = darkenColor(colors.secondary, 0.15);
        root.style.setProperty('--brand-secondary-dark', secondaryDark);
        console.log('  Secondary:', colors.secondary);
        console.log('  Secondary Dark:', secondaryDark);
      }
      
      if (colors.accentGold) {
        root.style.setProperty('--brand-accent-gold', colors.accentGold);
      }
      
      if (colors.accentTeal) {
        root.style.setProperty('--brand-accent-teal', colors.accentTeal);
      }

      console.log('✅ Brand colors applied successfully with variants');
    }
  }, [settings]);
}

