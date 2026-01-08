"use client";

import { useEffect, useState } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { useLocaleStore } from '@/stores/locale-store';
import enMessages from '@/locales/en/common.json';
import frMessages from '@/locales/fr/common.json';

// Pre-loaded translations (loaded at build time, not runtime)
const ALL_MESSAGES = {
  en: enMessages,
  fr: frMessages,
};

interface IntlProviderProps {
  locale: string;
  messages: any;
  children: React.ReactNode;
}

export function IntlProvider({ locale: initialLocale, children }: IntlProviderProps) {
  const currentLocale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);
  const [activeLocale, setActiveLocale] = useState(currentLocale || initialLocale);

  // Sync initial locale with store on first mount only
  useEffect(() => {
    if (!currentLocale) {
      setLocale(initialLocale);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch locale immediately when store changes
  useEffect(() => {
    if (currentLocale) {
      setActiveLocale(currentLocale);
    }
  }, [currentLocale]);

  return (
    <NextIntlClientProvider
      locale={activeLocale}
      messages={ALL_MESSAGES[activeLocale as keyof typeof ALL_MESSAGES]}
    >
      {children}
    </NextIntlClientProvider>
  );
}
