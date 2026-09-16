import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { adoptionListings, attachments, auditLog, posts } from '@/db/schema';
import { addAnimalPhoto, upsertAnimal, upsertPost, upsertVet, setAdoptionListing, setPostCover } from '@/db/mutations/content';
import { resetDb, seedAdmin } from './helpers';

/** Smallest valid 1x1 PNG, so uploads exercise the real object store. */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==', 'base64');

describe('content mutations', () => {
  beforeEach(resetDb);
  it('creates and updates an animal keeping its slug', async () => {
    const admin = await seedAdmin();
    const a = await upsertAnimal({ name: 'Kori', species: 'dog', sex: null, approxBirthYear: null, status: 'street', bio: { tr: 'x' }, location: null }, null, admin.id);
    expect(a.slug).toBe('kori');
    const b = await upsertAnimal({ name: 'Kori Bey', species: 'dog', sex: null, approxBirthYear: 2022, status: 'in_treatment', bio: { tr: 'y' }, location: null }, a.id, admin.id);
    expect(b.slug).toBe('kori'); expect(b.status).toBe('in_treatment');
  });
  it('adoption listing follows animal status', async () => {
    const admin = await seedAdmin();
    const a = await upsertAnimal({ name: 'Boncuk', species: 'cat', sex: null, approxBirthYear: null, status: 'adoptable', bio: { tr: 'x' }, location: null }, null, admin.id);
    await setAdoptionListing(a.id, { status: 'open', contact: '+90 555' }, admin.id);
    expect(await db.select().from(adoptionListings)).toHaveLength(1);
    await setAdoptionListing(a.id, null, admin.id);
    expect(await db.select().from(adoptionListings)).toHaveLength(0);
  });
  it('vet and post', async () => {
    const admin = await seedAdmin();
    const v = await upsertVet({ name: 'N', clinicName: 'C', phone: 'p', address: 'a', website: null, description: null, referralConsent: true, active: true }, null, admin.id);
    expect(v.clinicName).toBe('C');
    const p = await upsertPost({ title: { tr: 'Merhaba' }, body: { tr: 'içerik' }, animalId: null, campaignId: null, publish: true }, null, admin.id);
    expect(p.slug).toBe('merhaba'); expect(p.publishedAt).not.toBeNull();
    const rows = await db.select().from(posts); expect(rows).toHaveLength(1);
  });
  it('audits a post cover change', async () => {
    const admin = await seedAdmin();
    const p = await upsertPost({ title: { tr: 'Kapak' }, body: { tr: 'x' }, animalId: null, campaignId: null, publish: false }, null, admin.id);
    await setPostCover(p.id, new File([PNG], 'kapak.png', { type: 'image/png' }), admin.id);
    const [after] = await db.select().from(posts).where(eq(posts.id, p.id));
    expect(after!.coverAttachmentId).not.toBeNull();
    const audits = await db.select().from(auditLog).where(eq(auditLog.action, 'post.cover'));
    expect(audits).toHaveLength(1);
    expect(audits[0]!.entityId).toBe(p.id);
    expect(audits[0]!.diff).toEqual({ attachmentId: after!.coverAttachmentId });
  });
  it('refuses a photo for an unknown animal before storing anything', async () => {
    const admin = await seedAdmin();
    await expect(addAnimalPhoto(crypto.randomUUID(), new File([PNG], 'px.png', { type: 'image/png' }), admin.id, false))
      .rejects.toThrow('Hayvan bulunamadı');
    expect(await db.select().from(attachments)).toHaveLength(0);
  });
});
