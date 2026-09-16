import { describe, it, expect } from 'vitest';
import { normalizeText, tokenize, findMonthMention } from '@/lib/ledger/normalize';

describe('normalizeText', () => {
  it('folds Turkish letters and case', () => expect(normalizeText('KORİ Şubat ığüöç')).toBe('kori subat iguoc'));
  it('strips punctuation', () => expect(normalizeText("Kori'ye, bağış!!")).toBe('kori ye bagis'));
  it('handles dotless capital I', () => expect(normalizeText('ILIK')).toBe('ilik'));
});
describe('tokenize', () => {
  it('splits', () => expect(tokenize(' Kori  ve Mama ')).toEqual(['kori', 've', 'mama']));
  it('empty', () => expect(tokenize('')).toEqual([]));
});
describe('findMonthMention', () => {
  it('finds ekim', () => expect(findMonthMention(['mama', 'ekim'])).toBe(10));
  it('finds şubat folded', () => expect(findMonthMention(tokenize('Şubat maması'))).toBe(2));
  it('null when none', () => expect(findMonthMention(['kori'])).toBeNull());
});
