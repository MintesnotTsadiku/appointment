import { ReactNode, useState, useEffect } from 'react';
import { TranslationContext, Language, getTranslation } from '@/lib/i18n';

interface TranslationProviderProps {
  children: ReactNode;
}

export const TranslationProvider = ({ children }: TranslationProviderProps) => {
  // Get language from localStorage or default to English
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem('app-language');
    return (stored === 'am' || stored === 'en') ? stored : 'en';
  });

  // Update localStorage when language changes
  useEffect(() => {
    localStorage.setItem('app-language', language);
    // Update document direction for RTL languages (future-proofing)
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return getTranslation(language, key);
  };

  return (
    <TranslationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  );
};

