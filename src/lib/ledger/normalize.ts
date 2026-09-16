const TR_MAP: Record<string, string> = {
  'İ': 'i', 'I': 'i', 'ı': 'i', 'Ş': 's', 'ş': 's', 'Ğ': 'g', 'ğ': 'g',
  'Ü': 'u', 'ü': 'u', 'Ö': 'o', 'ö': 'o', 'Ç': 'c', 'ç': 'c',
};

/** Lowercase, Turkish letters folded to ASCII, punctuation removed, single spaces. */
export function normalizeText(s: string): string {
  return s
    .replace(/[İIıŞşĞğÜüÖöÇç]/g, (c) => TR_MAP[c] ?? c)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function tokenize(s: string): string[] {
  const n = normalizeText(s);
  return n === '' ? [] : n.split(' ');
}

export const TURKISH_MONTHS = ['ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran', 'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik'] as const;

/** Returns 1-12 if a Turkish month name appears among the tokens, else null. */
export function findMonthMention(tokens: string[]): number | null {
  for (const tok of tokens) {
    const i = (TURKISH_MONTHS as readonly string[]).indexOf(tok);
    if (i !== -1) return i + 1;
  }
  return null;
}
