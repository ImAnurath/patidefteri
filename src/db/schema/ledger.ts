import { sql } from 'drizzle-orm';
import { pgTable, uuid, text, bigint, boolean, timestamp, date, check, index } from 'drizzle-orm/pg-core';
import { txDirectionEnum, txSourceEnum, allocationReasonEnum } from './enums';
import { attachments } from './attachments';
import { adminUsers } from './admin';
import { campaigns, campaignPeriods } from './campaigns';

export const transactions = pgTable('transactions', {
  id: uuid().defaultRandom().primaryKey(),
  direction: txDirectionEnum().notNull(),
  amountKurus: bigint({ mode: 'number' }).notNull(),
  currency: text().notNull().default('TRY'),
  occurredAt: date().notNull(),
  rawNote: text(),
  displayName: text(),
  source: txSourceEnum().notNull().default('manual'),
  receiptAttachmentId: uuid().references(() => attachments.id, { onDelete: 'set null' }),
  redactionConfirmed: boolean().notNull().default(false),
  published: boolean().notNull().default(false),
  enteredBy: uuid().references(() => adminUsers.id, { onDelete: 'set null' }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('transactions_amount_positive', sql`${t.amountKurus} > 0`),
  check('transactions_publish_requires_redacted_receipt',
    sql`${t.published} = false OR (${t.receiptAttachmentId} IS NOT NULL AND ${t.redactionConfirmed} = true)`),
  index('transactions_occurred_at_idx').on(t.occurredAt),
]);

export const allocations = pgTable('allocations', {
  id: uuid().defaultRandom().primaryKey(),
  campaignId: uuid().notNull().references(() => campaigns.id, { onDelete: 'restrict' }),
  periodId: uuid().references(() => campaignPeriods.id, { onDelete: 'restrict' }),
  amountKurus: bigint({ mode: 'number' }).notNull(),
  reason: allocationReasonEnum().notNull(),
  transactionId: uuid().references(() => transactions.id, { onDelete: 'cascade' }),
  transferGroupId: uuid(),
  note: text(),
  createdBy: uuid().references(() => adminUsers.id, { onDelete: 'set null' }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('allocations_nonzero', sql`${t.amountKurus} <> 0`),
  check('allocations_source_xor', sql`(${t.transactionId} IS NULL) <> (${t.transferGroupId} IS NULL)`),
  index('allocations_campaign_idx').on(t.campaignId),
  index('allocations_period_idx').on(t.periodId),
  index('allocations_transaction_idx').on(t.transactionId),
  index('allocations_transfer_group_idx').on(t.transferGroupId),
]);
