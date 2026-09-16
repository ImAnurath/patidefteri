import { z } from 'zod';
import type { Locale } from './locale';

export const localizedSchema = z.object({ tr: z.string().min(1), en: z.string().optional() });
export type Localized = z.infer<typeof localizedSchema>;

export function pickLocalized(v: Localized | null | undefined, locale: Locale): string {
  if (!v) return '';
  if (locale === 'en' && v.en && v.en.trim() !== '') return v.en;
  return v.tr;
}
