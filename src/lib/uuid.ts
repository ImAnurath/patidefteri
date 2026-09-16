const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for canonical UUID text, so route params can 404 instead of reaching Postgres as invalid uuid input. */
export function isUuid(s: string): boolean {
  return UUID_RE.test(s);
}
