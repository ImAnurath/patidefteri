import { parseTlToKurus } from './money';
import { normalizeText } from './ledger/normalize';
import type { Localized } from './i18n/localized';

export function formString(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === 'string' ? v.trim() : '';
}
export function formOptional(fd: FormData, name: string): string | null {
  const s = formString(fd, name);
  return s === '' ? null : s;
}
export function formLocalized(fd: FormData, prefix: string): Localized {
  const tr = formString(fd, `${prefix}.tr`);
  const en = formOptional(fd, `${prefix}.en`);
  return en ? { tr, en } : { tr };
}
export function formKurus(fd: FormData, name: string): number {
  return parseTlToKurus(formString(fd, name));
}
export function formKeywords(fd: FormData, name: string): string[] {
  const seen = new Set<string>();
  for (const raw of formString(fd, name).split(',')) {
    const k = normalizeText(raw);
    if (k) seen.add(k);
  }
  return [...seen];
}
export function formDate(fd: FormData, name: string): string {
  const s = formString(fd, name);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error('Geçersiz tarih');
  return s;
}
export function formFile(fd: FormData, name: string): File | null {
  const v = fd.get(name);
  return v instanceof File && v.size > 0 ? v : null;
}
