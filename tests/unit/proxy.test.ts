import { describe, it, expect } from 'vitest';
import { localeForPath, rewritePath } from '@/lib/i18n/rewrite';
describe('rewritePath', () => {
  it('prefixes Turkish routes', () => { expect(rewritePath('/')).toBe('/tr'); expect(rewritePath('/defter')).toBe('/tr/defter'); });
  it('leaves en alone', () => expect(rewritePath('/en/defter')).toBeNull());
  it('leaves admin, files, next and assets alone', () => {
    for (const p of ['/admin', '/admin/giris', '/dosya/abc', '/_next/static/x.js', '/favicon.ico', '/robots.txt']) expect(rewritePath(p)).toBeNull();
  });
  it('blocks direct /tr access from becoming double-prefixed', () => expect(rewritePath('/tr/defter')).toBeNull());
});

describe('localeForPath', () => {
  it('reads the locale prefix', () => { expect(localeForPath('/en')).toBe('en'); expect(localeForPath('/en/defter')).toBe('en'); expect(localeForPath('/tr/defter')).toBe('tr'); });
  it('falls back to the default locale', () => {
    for (const p of ['/', '/defter', '/admin/giris', '/dosya/abc', '/de/defter']) expect(localeForPath(p)).toBe('tr');
  });
});
