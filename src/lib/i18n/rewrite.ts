import { DEFAULT_LOCALE, LOCALES } from './locale';

const PASSTHROUGH = ['/admin', '/dosya', '/_next', '/api'];

/** Returns the internal path for a public URL without a locale prefix, or null when no rewrite is needed. */
export function rewritePath(pathname: string): string | null {
  if (PASSTHROUGH.some((p) => pathname === p || pathname.startsWith(p + '/'))) return null;
  if (/\.[a-z0-9]+$/i.test(pathname)) return null; // static files
  const first = pathname.split('/')[1] ?? '';
  if ((LOCALES as readonly string[]).includes(first)) return null;
  return pathname === '/' ? `/${DEFAULT_LOCALE}` : `/${DEFAULT_LOCALE}${pathname}`;
}
