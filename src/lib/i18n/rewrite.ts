import { DEFAULT_LOCALE, isLocale, LOCALES, type Locale } from './locale';

const PASSTHROUGH = ['/admin', '/dosya', '/_next', '/api'];

/** Request header the proxy uses to tell the root layout which language to declare. */
export const LOCALE_HEADER = 'x-locale';

/** The locale a URL is served in. Anything without a locale prefix — including /admin and /dosya — is the default. */
export function localeForPath(pathname: string): Locale {
  const first = pathname.split('/')[1] ?? '';
  return isLocale(first) ? first : DEFAULT_LOCALE;
}

/** Returns the internal path for a public URL without a locale prefix, or null when no rewrite is needed. */
export function rewritePath(pathname: string): string | null {
  if (PASSTHROUGH.some((p) => pathname === p || pathname.startsWith(p + '/'))) return null;
  if (/\.[a-z0-9]+$/i.test(pathname)) return null; // static files
  const first = pathname.split('/')[1] ?? '';
  if ((LOCALES as readonly string[]).includes(first)) return null;
  return pathname === '/' ? `/${DEFAULT_LOCALE}` : `/${DEFAULT_LOCALE}${pathname}`;
}
