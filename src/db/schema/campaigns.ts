import { sql } from 'drizzle-orm';
import { pgTable, uuid, text, bigint, timestamp, jsonb, date, uniqueIndex, check, type AnyPgColumn } from 'drizzle-orm/pg-core';
import type { Localized } from '@/lib/i18n/localized';
import { campaignKindEnum, campaignStatusEnum } from './enums';
import { animals } from './animals';
import { vetQuotes } from './vets';

export const campaigns = pgTable('campaigns', {
  id: uuid().defaultRandom().primaryKey(),
  slug: text().notNull().unique(),
  kind: campaignKindEnum().notNull(),
  animalId: uuid().references(() => animals.id, { onDelete: 'set null' }),
  title: jsonb().$type<Localized>().notNull(),
  description: jsonb().$type<Localized>().notNull(),
  targetKurus: bigint({ mode: 'number' }),
  status: campaignStatusEnum().notNull().default('draft'),
  keywords: text().array().notNull().default(sql`'{}'::text[]`),
  acceptedQuoteId: uuid().references((): AnyPgColumn => vetQuotes.id, { onDelete: 'set null' }),
  closingNote: jsonb().$type<Localized>(),
  openedAt: timestamp({ withTimezone: true }),
  closedAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('campaigns_single_general').on(t.kind).where(sql`${t.kind} = 'general'`),
  check('campaigns_target_positive', sql`${t.targetKurus} IS NULL OR ${t.targetKurus} > 0`),
  check('campaigns_general_has_no_target', sql`${t.kind} <> 'general' OR ${t.targetKurus} IS NULL`),
]);

export const campaignPeriods = pgTable('campaign_periods', {
  id: uuid().defaultRandom().primaryKey(),
  campaignId: uuid().notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  periodStart: date().notNull(),
  periodEnd: date().notNull(),
  targetKurus: bigint({ mode: 'number' }).notNull(),
  closedAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('campaign_periods_unique_start').on(t.campaignId, t.periodStart),
  check('campaign_periods_target_positive', sql`${t.targetKurus} > 0`),
  check('campaign_periods_order', sql`${t.periodEnd} > ${t.periodStart}`),
]);
