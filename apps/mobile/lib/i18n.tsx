import React, { createContext, useContext, useState } from 'react';
import en from '../assets/translations/en.json';
import ar from '../assets/translations/ar.json';

export type Locale = 'en' | 'ar';

const translations: Record<Locale, Record<string, string>> = { en, ar };

interface I18nContextValue {
  locale: Locale;
  t: (key: string) => string;
  setLocale: (l: Locale) => void;
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  t: (k) => k,
  setLocale: () => {},
  isRTL: false
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');

  const t = (key: string) => translations[locale][key] ?? key;

  return (
    <I18nContext.Provider value={{ locale, t, setLocale, isRTL: locale === 'ar' }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
