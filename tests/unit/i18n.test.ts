import { describe, it, expect } from 'vitest';
import { isLocale, localePath } from '@/lib/i18n/locale';
import { pickLocalized, localizedSchema } from '@/lib/i18n/localized';
import { t } from '@/lib/i18n/messages';

describe('locale', () => {
  it('recognises locales', () => { expect(isLocale('tr')).toBe(true); expect(isLocale('de')).toBe(false); });
  it('builds paths', () => { expect(localePath('tr', '/defter')).toBe('/defter'); expect(localePath('en', '/defter')).toBe('/en/defter'); expect(localePath('en', '/')).toBe('/en'); });
});
describe('localized', () => {
  it('falls back to tr', () => expect(pickLocalized({ tr: 'Merhaba' }, 'en')).toBe('Merhaba'));
  it('uses en when present', () => expect(pickLocalized({ tr: 'Merhaba', en: 'Hello' }, 'en')).toBe('Hello'));
  it('handles null', () => expect(pickLocalized(null, 'tr')).toBe(''));
  it('schema requires tr', () => { expect(localizedSchema.safeParse({ en: 'x' }).success).toBe(false); expect(localizedSchema.safeParse({ tr: 'x', en: '' }).success).toBe(true); });
});
describe('messages', () => {
  it('returns tr and en', () => { expect(t('tr', 'nav.ledger')).toBe('Defter'); expect(t('en', 'nav.ledger')).toBe('Ledger'); });
});
