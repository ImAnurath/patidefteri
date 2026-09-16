import { headers } from 'next/headers';
import { LOCALE_HEADER } from '@/lib/i18n/rewrite';
import './globals.css';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Set by the proxy for every request; /admin and /dosya fall back to the default locale.
  const locale = (await headers()).get(LOCALE_HEADER);
  return <html lang={locale === 'en' ? 'en' : 'tr'}><body className="font-sans text-gray-900">{children}</body></html>;
}
