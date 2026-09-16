import { describe, it, expect } from 'vitest';
import { slugify, pickUniqueSlug } from '@/lib/slug';

describe('slugify', () => {
  it('handles Turkish letters', () => expect(slugify('Kori’nin Ameliyatı — Şubat')).toBe('korinin-ameliyati-subat'));
  it('collapses separators', () => expect(slugify('  Mama   Maması!! ')).toBe('mama-mamasi'));
});

describe('pickUniqueSlug', () => {
  it('returns the root when untaken', () => expect(pickUniqueSlug('Mama', [])).toBe('mama'));
  it('appends -2 when root is taken', () => expect(pickUniqueSlug('Mama', ['mama'])).toBe('mama-2'));
  it('appends -3 when root and root-2 are taken', () => expect(pickUniqueSlug('Mama', ['mama', 'mama-2'])).toBe('mama-3'));
  it('falls back to kayit for an empty or all-symbol base', () => {
    expect(pickUniqueSlug('', [])).toBe('kayit');
    expect(pickUniqueSlug('!!!', [])).toBe('kayit');
  });
});
