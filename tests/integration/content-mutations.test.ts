import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/client';
import { adoptionListings, posts } from '@/db/schema';
import { upsertAnimal, upsertPost, upsertVet, setAdoptionListing } from '@/db/mutations/content';
import { resetDb, seedAdmin } from './helpers';

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
});
