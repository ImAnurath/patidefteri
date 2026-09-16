'use server';
import { unstable_rethrow } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/guard';
import { fail, type ActionState } from '@/lib/action-state';
import { formKurus, formOptional, formString } from '@/lib/forms';
import { isUuid } from '@/lib/uuid';
import { recordTransfer, closePeriod } from '@/db/mutations/ledger';
import { makeTransfer } from '@/lib/ledger';

/** Select values come from the page, so reject junk here instead of letting Postgres raise 22P02. */
function formId(fd: FormData, name: string): string {
  const v = formString(fd, name);
  if (!isUuid(v)) throw new Error('Geçersiz kayıt');
  return v;
}
function formOptionalId(fd: FormData, name: string): string | null {
  const v = formOptional(fd, name);
  if (v !== null && !isUuid(v)) throw new Error('Geçersiz kayıt');
  return v;
}

export async function transferAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  try {
    const reason = z.enum(['top_up_from_general', 'surplus_to_general', 'correction']).parse(formString(fd, 'reason'));
    const lines = makeTransfer({
      fromCampaignId: formId(fd, 'fromCampaignId'), fromPeriodId: formOptionalId(fd, 'fromPeriodId'),
      toCampaignId: formId(fd, 'toCampaignId'), toPeriodId: formOptionalId(fd, 'toPeriodId'),
      amountKurus: formKurus(fd, 'amount'), reason,
    });
    await recordTransfer(lines, formOptional(fd, 'note'), user.id);
  } catch (e) { unstable_rethrow(e); return fail(e); }
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function closePeriodAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  try { await closePeriod(formId(fd, 'periodId'), user.id); } catch (e) { unstable_rethrow(e); return fail(e); }
  revalidatePath('/', 'layout');
  return { ok: true };
}
