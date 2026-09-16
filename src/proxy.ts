import { NextResponse, type NextRequest } from 'next/server';
import { rewritePath } from '@/lib/i18n/rewrite';

export function proxy(request: NextRequest) {
  const target = rewritePath(request.nextUrl.pathname);
  if (!target) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = target;
  return NextResponse.rewrite(url);
}

export const config = { matcher: ['/((?!_next/static|_next/image).*)'] };
