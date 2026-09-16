export type ActionState = { error?: string; ok?: boolean };
export const INITIAL_ACTION_STATE: ActionState = {};

/** Turns a caught error into the state a form action returns to `ActionForm`. */
export const fail = (e: unknown): ActionState => ({ error: e instanceof Error ? e.message : 'Beklenmeyen hata' });
