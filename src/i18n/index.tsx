import { createContext, useContext, useState, type PropsWithChildren } from 'react';

import { en, type TranslationKey } from './en';
import { ro } from './ro';

export type Language = 'en' | 'ro';

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguage] = useState<Language>('ro');
  const dictionary = language === 'ro' ? ro : en;

  // Romanian decimal comma for rates like "25.7" or 6.25 (1-2 decimals, so "1.050" thousands groups are left alone).
  const value = (v: string | number) => (language === 'ro' ? String(v).replace(/^(\d+)\.(\d{1,2})$/, '$1,$2') : String(v));
  const t: LanguageContextValue['t'] = (key, values) =>
    (dictionary[key] ?? String(key)).replace(/\{(\w+)\}/g, (token, name: string) => (values?.[name] === undefined ? token : value(values[name])));

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage requires a LanguageProvider');
  return context;
}
