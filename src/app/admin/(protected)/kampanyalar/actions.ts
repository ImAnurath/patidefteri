'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db/client';
import { vetQuotes } from '@/db/schema';
import { CAMPAIGN_KINDS, CAMPAIGN_STATUSES } from '@/db/schema/enums';
import { requireAdmin } from '@/lib/auth/guard';
import { fail, type ActionState } from '@/lib/action-state';
import { formKeywords, formLocalized, formOptional, formString } from '@/lib/forms';
import { localizedSchema } from '@/lib/i18n/localized';
import { parseTlToKurus } from '@/lib/money';
import { isUuid } from '@/lib/uuid';
import { acceptQuote, addPeriod, createCampaign, setCampaignStatus, updateCampaign } from '@/db/mutations/campaigns';
import { monthPeriodFor } from '@/lib/ledger/periods';
import { writeAudit } from '@/lib/audit';

/** Ids come from hidden form fields, so reject junk here instead of letting Postgres raise 22P02. */
const idSchema = z.string().refine(isUuid, 'Geçersiz kayıt');
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Geçersiz tarih');
const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, 'Geçersiz ay');
/** Turkish TL text ("1.250,50") to a positive integer amount in kuruş. */
const kurusSchema = z.string()
  .transform((s, ctx) => {
    try {
      return parseTlToKurus(s);
    } catch {
      ctx.addIssue({ code: 'custom', message: 'Geçersiz tutar' });
      return z.NEVER;
    }
  })
  .pipe(z.number().int().positive('Geçersiz tutar'));

function formId(fd: FormData, name: string): string {
  return idSchema.parse(formString(fd, name));
}

const campaignSchema = z.object({
  kind: z.enum(CAMPAIGN_KINDS), title: localizedSchema, description: localizedSchema,
  keywords: z.array(z.string()), targetKurus: kurusSchema.nullable(), animalId: idSchema.nullable(),
});

const quoteSchema = z.object({
  campaignId: idSchema, vetId: idSchema, service: localizedSchema,
  amountKurus: kurusSchema, quotedAt: isoDateSchema, validUntil: isoDateSchema.nullable(),
});

function parseCampaign(fd: FormData) {
  return campaignSchema.parse({
    kind: formString(fd, 'kind'), title: formLocalized(fd, 'title'), description: formLocalized(fd, 'description'),
    keywords: formKeywords(fd, 'keywords'), targetKurus: formOptional(fd, 'target'), animalId: formOptional(fd, 'animalId'),
  });
}

export async function createCampaignAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  let id: string;
  try { id = (await createCampaign(parseCampaign(fd), user.id)).id; } catch (e) { return fail(e); }
  redirect(`/admin/kampanyalar/${id}`);
}

export async function updateCampaignAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  try {
    const id = formId(fd, 'id');
    const { kind: _k, ...rest } = parseCampaign(fd);
    await updateCampaign(id, rest, user.id);
  } catch (e) { return fail(e); }
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function setCampaignStatusAction(fd: FormData): Promise<void> {
  const user = await requireAdmin();
  const status = z.enum(CAMPAIGN_STATUSES).parse(formString(fd, 'status'));
  await setCampaignStatus(formId(fd, 'id'), status, user.id);
  revalidatePath('/', 'layout');
}

export async function addPeriodAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  try {
    const monthRaw = monthSchema.parse(formString(fd, 'monthRaw'));
    const { periodStart, periodEnd } = monthPeriodFor(`${monthRaw}-01`);
    await addPeriod(formId(fd, 'campaignId'), periodStart, periodEnd, kurusSchema.parse(formString(fd, 'target')), user.id);
  } catch (e) { return fail(e); }
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function addQuoteAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  try {
    const input = quoteSchema.parse({
      campaignId: formString(fd, 'campaignId'), vetId: formString(fd, 'vetId'), service: formLocalized(fd, 'service'),
      amountKurus: formString(fd, 'amount'), quotedAt: formString(fd, 'quotedAt'), validUntil: formOptional(fd, 'validUntil'),
    });
    await db.transaction(async (tx) => {
      const [q] = await tx.insert(vetQuotes).values(input).returning();
      await writeAudit(tx, { actorId: user.id, action: 'quote.create', entity: 'vet_quotes', entityId: q!.id, diff: { after: q } });
    });
  } catch (e) { return fail(e); }
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function acceptQuoteAction(fd: FormData): Promise<void> {
  const user = await requireAdmin();
  await acceptQuote(formId(fd, 'quoteId'), user.id);
  revalidatePath('/', 'layout');
}
