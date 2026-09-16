import { createHash } from 'node:crypto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/client';
import { eq } from 'drizzle-orm';
import { allocations, attachments, transactions } from '@/db/schema';
import { canServeAttachment } from '@/lib/storage/access';
import { openObject, storeUpload } from '@/lib/storage/upload';
import { resetDb, seedAdmin, seedAttachment, seedGeneral } from './helpers';

describe('canServeAttachment', () => {
  beforeEach(resetDb);
  it('serves photos and documents freely', async () => {
    expect(await canServeAttachment(await seedAttachment('photo'))).toBe(true);
    expect(await canServeAttachment(await seedAttachment('document'))).toBe(true);
  });
  it('hides a receipt not attached to any transaction', async () => {
    expect(await canServeAttachment(await seedAttachment('receipt'))).toBe(false);
  });
  it('hides a receipt on an unpublished transaction, shows it once published', async () => {
    const admin = await seedAdmin();
    const receipt = await seedAttachment('receipt');
    const [t] = await db.insert(transactions).values({ direction: 'in', amountKurus: 100, occurredAt: '2026-09-01', enteredBy: admin.id, receiptAttachmentId: receipt.id, redactionConfirmed: true }).returning();
    expect(await canServeAttachment(receipt)).toBe(false);
    const g = await seedGeneral(); // publishing requires at least one allocation line
    await db.transaction(async (tx) => {
      await tx.insert(allocations).values({ campaignId: g.id, amountKurus: 100, reason: 'manual', transactionId: t!.id });
      await tx.update(transactions).set({ published: true }).where(eq(transactions.id, t!.id));
    });
    expect(await canServeAttachment(receipt)).toBe(true);
  });
});

describe('storeUpload', () => {
  beforeEach(resetDb);
  it('stores the bytes under a kind-scoped key and records their hash', async () => {
    const bytes = Buffer.from('%PDF-1.4 pati defteri');
    const att = await storeUpload(new File([bytes], 'makbuz.pdf', { type: 'application/pdf' }), 'receipt', null);
    expect(att.storageKey).toMatch(/^receipt\/\d{4}\/[0-9a-f-]{36}\.pdf$/);
    expect(att.sha256).toBe(createHash('sha256').update(bytes).digest('hex'));
    expect(att.sizeBytes).toBe(bytes.length);
    expect(att.originalName).toBe('makbuz.pdf');
    const obj = await openObject(att.storageKey);
    expect(obj.contentType).toBe('application/pdf');
    expect(Buffer.from(await new Response(obj.body).arrayBuffer())).toEqual(bytes);
  });
  it('refuses bytes whose signature contradicts the declared type', async () => {
    const disguised = new File([Buffer.from('%PDF-1.4 gizli fatura')], 'kedi.png', { type: 'image/png' });
    await expect(storeUpload(disguised, 'photo', null)).rejects.toThrow('kabul edilmiyor');
    expect(await db.select().from(attachments)).toHaveLength(0);
  });
  it('records the sniffed mime rather than the declared one', async () => {
    const att = await storeUpload(new File([Buffer.from('%PDF-1.4 makbuz')], 'makbuz.pdf', { type: 'application/pdf' }), 'receipt', null);
    expect(att.mime).toBe('application/pdf');
  });
  it('refuses a disallowed mime before writing anything', async () => {
    await expect(storeUpload(new File(['<b>x</b>'], 'x.html', { type: 'text/html' }), 'document', null)).rejects.toThrow('kabul edilmiyor');
  });
});
