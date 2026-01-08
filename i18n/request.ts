import { getRequestConfig } from 'next-intl/server';
import { routing, type Locale } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as Locale)) {
    locale = routing.defaultLocale;
  }

  // Use static imports for better compatibility
  const messages =
    locale === 'fr' ? (await import('../locales/fr/common.json')).default
    : locale === 'ja' ? (await import('../locales/ja/common.json')).default
    : locale === 'es' ? (await import('../locales/es/common.json')).default
    : locale === 'it' ? (await import('../locales/it/common.json')).default
    : locale === 'de' ? (await import('../locales/de/common.json')).default
    : locale === 'nl' ? (await import('../locales/nl/common.json')).default
    : locale === 'pt' ? (await import('../locales/pt/common.json')).default
    : (await import('../locales/en/common.json')).default;

  return {
    locale,
    messages,
    timeZone: 'Europe/Paris',
    now: new Date()
  };
});