import { createContext, useContext } from 'react';
import enTranslations from './translations/en.json';

/**
 * Localisation is backed by the Frappe `Translation` DocType.
 *
 * English source strings are the message ids (resolved from the bundled English
 * catalog so the app works offline). Any translation an administrator adds to
 * the `Translation` DocType for the active language overrides the English text.
 */
export type Language = string;

export interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  messages: Record<string, string>;
  languages: Language[];
}

export const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within TranslationProvider');
  }
  return context;
};

/** Resolve a dotted translation key to its English source string. */
export const englishSource = (key: string): string => {
  const keys = key.split('.');
  let value: unknown = enTranslations;
  for (const part of keys) {
    if (value && typeof value === 'object' && part in (value as Record<string, unknown>)) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  return typeof value === 'string' ? value : key;
};

export const getTranslation = (
  language: Language,
  key: string,
  messages: Record<string, string> = {}
): string => {
  const source = englishSource(key);
  if (language === 'en') return source;
  return messages[source] ?? source;
};
