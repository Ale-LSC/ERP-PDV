import { sql } from 'drizzle-orm';
import {
  check,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { companies } from './companies.schema';
import { users } from './users.schema';

export const cashSessionStatusEnum = pgEnum('cash_session_status', [
  'open',
  'closed',
]);

export const cashSessions = pgTable(
  'cash_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    openedBy: uuid('opened_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    status: cashSessionStatusEnum('status').default('open').notNull(),
    openingAmount: numeric('opening_amount', {
      precision: 12,
      scale: 2,
    }).notNull(),
    closingAmount: numeric('closing_amount', { precision: 12, scale: 2 }),
    openedAt: timestamp('opened_at').defaultNow().notNull(),
    closedAt: timestamp('closed_at'),
  },
  (table) => [
    uniqueIndex('cash_sessions_operator_open_unique')
      .on(table.companyId, table.openedBy)
      .where(sql`${table.status} = 'open'`),
    check(
      'cash_sessions_opening_nonnegative',
      sql`${table.openingAmount} >= 0`,
    ),
    check(
      'cash_sessions_closing_nonnegative',
      sql`${table.closingAmount} is null or ${table.closingAmount} >= 0`,
    ),
  ],
);
