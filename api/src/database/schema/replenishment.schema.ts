import {
  index,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { companies } from './companies.schema';
import { products } from './products.schema';
import { users } from './users.schema';
import { branches } from './branches.schema';
export const replenishmentStatusEnum = pgEnum('replenishment_status', [
  'pending',
  'fulfilled',
  'cancelled',
]);
export const replenishmentRequests = pgTable(
  'replenishment_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'restrict' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    requestedBy: uuid('requested_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    quantity: numeric('quantity', { precision: 14, scale: 3 }).notNull(),
    note: varchar('note', { length: 240 }),
    status: replenishmentStatusEnum('status').default('pending').notNull(),
    resolvedBy: uuid('resolved_by').references(() => users.id, {
      onDelete: 'restrict',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    resolvedAt: timestamp('resolved_at'),
  },
  (table) => [
    index('replenishment_company_status_index').on(
      table.companyId,
      table.status,
    ),
  ],
);
