import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

export type LanguageCode = 'en' | 'es' | 'cs';

interface LanguageContextValue {
  lang: LanguageCode;
  setLang: (l: LanguageCode) => void;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<LanguageCode>('en');
  const value = useMemo(() => ({ lang, setLang }), [lang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
