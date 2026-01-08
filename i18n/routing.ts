import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'fr', 'ja', 'es', 'it', 'de', 'nl', 'pt'],
  defaultLocale: 'en',
  localePrefix: 'never'
});

export const locales = routing.locales;
export const defaultLocale = routing.defaultLocale;
export type Locale = (typeof locales)[number];
