import { describe, it, expect } from 'vitest';
import { formatKurus, parseTlToKurus } from '@/lib/money';

describe('formatKurus', () => {
  it('formats Turkish style', () => expect(formatKurus(125050, 'tr')).toBe('1.250,50 ₺'));
  it('formats English style', () => expect(formatKurus(125050, 'en')).toBe('₺1,250.50'));
  it('formats zero', () => expect(formatKurus(0, 'tr')).toBe('0,00 ₺'));
  it('formats negatives', () => expect(formatKurus(-500, 'tr')).toBe('-5,00 ₺'));
});

describe('parseTlToKurus', () => {
  it.each([
    ['1.250,50', 125050], ['1250,50', 125050], ['1250.50', 125050], ['1250', 125000], ['0,5', 50], [' 12 ', 1200],
  ])('parses %s', (input, expected) => expect(parseTlToKurus(input)).toBe(expected));
  it('rejects negatives and junk', () => {
    expect(() => parseTlToKurus('-5')).toThrow(RangeError);
    expect(() => parseTlToKurus('abc')).toThrow(RangeError);
    expect(() => parseTlToKurus('1,234.567')).toThrow(RangeError);
  });
});
