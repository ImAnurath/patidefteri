const MAP: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', i̇: 'i', ö: 'o', ş: 's', ü: 'u', Ç: 'c', Ğ: 'g', İ: 'i', I: 'i', Ö: 'o', Ş: 's', Ü: 'u' };
export function slugify(input: string): string {
  return input
    .replace(/[çğıöşüÇĞİIÖŞÜ]/g, (c) => MAP[c] ?? c)
    .toLowerCase()
    .replace(/['’]/g, '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Deterministically picks a slug not present in `taken`, appending -2, -3, ... on collision. */
export function pickUniqueSlug(base: string, taken: Iterable<string>): string {
  const root = slugify(base) || 'kayit';
  const takenSet = new Set(taken);
  if (!takenSet.has(root)) return root;
  let i = 2;
  while (takenSet.has(`${root}-${i}`)) {
    i++;
  }
  return `${root}-${i}`;
}
