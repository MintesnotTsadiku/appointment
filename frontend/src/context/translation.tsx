import { ReactNode, useCallback, useEffect, useState } from 'react';
import { TranslationContext, Language, getTranslation } from '@/lib/i18n';

const DEFAULT_LANGUAGES: Language[] = ['en', 'am'];

const csrfToken = () => (window as unknown as { frappe?: { csrf_token?: string } }).frappe?.csrf_token || '';

/**
 * Loads translations from the Frappe `Translation` DocType for the active
 * language. Switching language updates the user preference on the server so the
 * same choice applies to Desk, email templates and other Frappe surfaces.
 */
export const TranslationProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem('app-language');
    return stored || 'en';
  });
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [languages, setLanguages] = useState<Language[]>(DEFAULT_LANGUAGES);

  useEffect(() => {
    let cancelled = false;
    fetch(
      `/api/method/appointment.scheduler.translation.messages?language=${encodeURIComponent(language)}`,
      { credentials: 'include' }
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data?.message?.messages) setMessages(data.message.messages);
      })
      .catch(() => {
        /* Fall back to the bundled English catalog. */
      });
    localStorage.setItem('app-language', language);
    document.documentElement.setAttribute('lang', language);
    return () => {
      cancelled = true;
    };
  }, [language]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/method/appointment.scheduler.translation.languages', { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const list = data?.message?.languages;
        if (!cancelled && Array.isArray(list) && list.length) setLanguages(list);
      })
      .catch(() => {
        /* Keep the default language list. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    fetch(`/api/method/appointment.scheduler.translation.set_language?language=${encodeURIComponent(next)}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-Frappe-CSRF-Token': csrfToken() },
    }).catch(() => {
      /* Guest sessions cannot persist a server preference. */
    });
  }, []);

  const t = useCallback((key: string) => getTranslation(language, key, messages), [language, messages]);

  return (
    <TranslationContext.Provider value={{ language, setLanguage, t, messages, languages }}>
      {children}
    </TranslationContext.Provider>
  );
};
