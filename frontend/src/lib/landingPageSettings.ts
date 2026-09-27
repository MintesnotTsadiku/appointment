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

