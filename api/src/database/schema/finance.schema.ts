import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { companies } from './companies.schema';
import { users } from './users.schema';

export const financialEntryTypeEnum = pgEnum('financial_entry_type', [
  'payable',
  'receivable',
]);
export const financialEntryStatusEnum = pgEnum('financial_entry_status', [
  'pending',
  'paid',
]);

export const financialEntries = pgTable(
  'financial_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    type: financialEntryTypeEnum('type').notNull(),
    description: varchar('description', { length: 220 }).notNull(),
    category: varchar('category', { length: 100 }),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    dueDate: date('due_date').notNull(),
    status: financialEntryStatusEnum('status').default('pending').notNull(),
    paidAt: timestamp('paid_at'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('financial_entries_company_due_index').on(
      table.companyId,
      table.dueDate,
    ),
    index('financial_entries_company_status_index').on(
      table.companyId,
      table.status,
    ),
    check('financial_entries_amount_positive', sql`${table.amount} > 0`),
  ],
);
