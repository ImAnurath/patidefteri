import type { Locale } from '@/lib/i18n/locale';

export function formatKurus(kurus: number, locale: Locale): string {
  const sign = kurus < 0 ? '-' : '';
  const abs = Math.abs(kurus);
  const tl = Math.floor(abs / 100);
  const kr = String(abs % 100).padStart(2, '0');
  if (locale === 'tr') {
    const grouped = tl.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${sign}${grouped},${kr} ₺`;
  }
  const grouped = tl.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}₺${grouped}.${kr}`;
}

/** Accepts "1.250,50", "1250,50", "1250.50", "1250". Throws RangeError on invalid or negative. */
export function parseTlToKurus(input: string): number {
  const s = input.trim();
  if (!/^\d[\d.,]*$/.test(s)) throw new RangeError(`Invalid amount: ${input}`);
  let intPart: string;
  let fracPart = '';
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  const sepIndex = Math.max(lastComma, lastDot);
  if (sepIndex === -1) {
    intPart = s;
  } else {
    const sep = s.charAt(sepIndex);
    const before = s.slice(0, sepIndex);
    const after = s.slice(sepIndex + 1);
    const otherSep = sep === ',' ? '.' : ',';
    // decimal separator if 1-2 digits follow it, otherwise it is a thousands separator
    if (after.length <= 2 && !after.includes(otherSep) && !after.includes(sep)) {
      if (before.includes(sep)) throw new RangeError(`Invalid amount: ${input}`);
      intPart = before.split(otherSep).join('');
      fracPart = after;
    } else if (after.length === 3 && !after.includes('.') && !after.includes(',')) {
      intPart = s.split(sep).join('');
      if (intPart.includes(otherSep)) throw new RangeError(`Invalid amount: ${input}`);
    } else {
      throw new RangeError(`Invalid amount: ${input}`);
    }
  }
  if (!/^\d+$/.test(intPart) || !/^\d{0,2}$/.test(fracPart)) throw new RangeError(`Invalid amount: ${input}`);
  return Number(intPart) * 100 + Number(fracPart.padEnd(2, '0') || '0');
}
