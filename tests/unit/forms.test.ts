import { describe, it, expect } from 'vitest';
import { formLocalized, formKurus, formKeywords, formOptional } from '@/lib/forms';
const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };
describe('forms', () => {
  it('localized drops empty en', () => expect(formLocalized(fd({ 'title.tr': 'A', 'title.en': '  ' }), 'title')).toEqual({ tr: 'A' }));
  it('localized keeps en', () => expect(formLocalized(fd({ 'title.tr': 'A', 'title.en': 'B' }), 'title')).toEqual({ tr: 'A', en: 'B' }));
  it('kurus parses TL', () => expect(formKurus(fd({ amount: '1.250,50' }), 'amount')).toBe(125050));
  it('keywords split and trim', () => expect(formKeywords(fd({ kw: ' kori, Kori , yemek' }), 'kw')).toEqual(['kori', 'yemek']));
  it('optional empty is null', () => expect(formOptional(fd({ x: '  ' }), 'x')).toBeNull());
});
