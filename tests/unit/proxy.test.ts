import { describe, it, expect } from 'vitest';
import { rewritePath } from '@/lib/i18n/rewrite';
describe('rewritePath', () => {
  it('prefixes Turkish routes', () => { expect(rewritePath('/')).toBe('/tr'); expect(rewritePath('/defter')).toBe('/tr/defter'); });
  it('leaves en alone', () => expect(rewritePath('/en/defter')).toBeNull());
  it('leaves admin, files, next and assets alone', () => {
    for (const p of ['/admin', '/admin/giris', '/dosya/abc', '/_next/static/x.js', '/favicon.ico', '/robots.txt']) expect(rewritePath(p)).toBeNull();
  });
  it('blocks direct /tr access from becoming double-prefixed', () => expect(rewritePath('/tr/defter')).toBeNull());
});
