import { pgTable, uuid, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import type { Localized } from '@/lib/i18n/localized';
import { speciesEnum, animalStatusEnum, adoptionStatusEnum, adoptionSourceEnum } from './enums';
import { attachments } from './attachments';

export const animals = pgTable('animals', {
  id: uuid().defaultRandom().primaryKey(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  species: speciesEnum().notNull(),
  sex: text(),
  approxBirthYear: integer(),
  status: animalStatusEnum().notNull().default('street'),
  bio: jsonb().$type<Localized>().notNull(),
  location: text(),
  coverAttachmentId: uuid().references(() => attachments.id, { onDelete: 'set null' }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const animalPhotos = pgTable('animal_photos', {
  id: uuid().defaultRandom().primaryKey(),
  animalId: uuid().notNull().references(() => animals.id, { onDelete: 'cascade' }),
  attachmentId: uuid().notNull().references(() => attachments.id, { onDelete: 'cascade' }),
  sortOrder: integer().notNull().default(0),
});

export const adoptionListings = pgTable('adoption_listings', {
  id: uuid().defaultRandom().primaryKey(),
  animalId: uuid().notNull().references(() => animals.id, { onDelete: 'cascade' }),
  status: adoptionStatusEnum().notNull().default('open'),
  contact: text().notNull(),
  source: adoptionSourceEnum().notNull().default('own'),
  externalRef: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
