import { ZodError } from 'zod';
// Straight from the module, not the barrel: `ActionForm` is a client component, so anything this
// file imports is pulled into the client graph.
import { LedgerError } from '@/lib/ledger/types';

export type ActionState = { error?: string; ok?: boolean };
export const INITIAL_ACTION_STATE: ActionState = {};

/** Postgres SQLSTATE of the failing statement; drizzle-orm 0.45 wraps driver errors, so it sits on `.cause`. */
const sqlState = (e: Error): string | undefined => (e.cause as { code?: string } | undefined)?.code;

/**
 * Turns a caught error into the state a form action returns to `ActionForm`.
 * Only messages we wrote ourselves reach the admin; anything else is logged and replaced.
 */
export function fail(e: unknown): ActionState {
  if (e instanceof ZodError) return { error: e.issues[0]?.message ?? 'Geçersiz veri.' };
  if (e instanceof LedgerError) return { error: e.message };
  if (e instanceof Error && sqlState(e) === '23505') return { error: 'Bu kayıt zaten var.' };
  console.error(e);
  return { error: 'İşlem başarısız oldu.' };
}
