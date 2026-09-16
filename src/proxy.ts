import { NextResponse, type NextRequest } from 'next/server';
import { LOCALE_HEADER, localeForPath, rewritePath } from '@/lib/i18n/rewrite';

export function proxy(request: NextRequest) {
  // The root layout sits above the [locale] segment and so cannot read the locale from params;
  // this header is how it learns which language to declare on <html lang>.
  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, localeForPath(request.nextUrl.pathname));
  const target = rewritePath(request.nextUrl.pathname);
  if (!target) return NextResponse.next({ request: { headers } });
  const url = request.nextUrl.clone();
  url.pathname = target;
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = { matcher: ['/((?!_next/static|_next/image).*)'] };
