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
import { financialEntries } from './finance.schema';
import { products } from './products.schema';
import { suppliers } from './suppliers.schema';
import { users } from './users.schema';

export const purchaseStatusEnum = pgEnum('purchase_status', [
  'completed',
  'cancelled',
]);
export const purchases = pgTable(
  'purchases',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    supplierId: uuid('supplier_id')
      .notNull()
      .references(() => suppliers.id, { onDelete: 'restrict' }),
    financialEntryId: uuid('financial_entry_id').references(
      () => financialEntries.id,
      { onDelete: 'set null' },
    ),
    status: purchaseStatusEnum('status').default('completed').notNull(),
    invoiceNumber: varchar('invoice_number', { length: 80 }),
    total: numeric('total', { precision: 12, scale: 2 }).notNull(),
    dueDate: date('due_date'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    cancelledAt: timestamp('cancelled_at'),
  },
  (table) => [
    index('purchases_company_created_index').on(
      table.companyId,
      table.createdAt,
    ),
    check('purchases_total_positive', sql`${table.total} > 0`),
  ],
);

export const purchaseItems = pgTable(
  'purchase_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    purchaseId: uuid('purchase_id')
      .notNull()
      .references(() => purchases.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    productName: varchar('product_name', { length: 180 }).notNull(),
    quantity: numeric('quantity', { precision: 14, scale: 3 }).notNull(),
    unitCost: numeric('unit_cost', { precision: 12, scale: 2 }).notNull(),
    total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  },
  (table) => [
    index('purchase_items_purchase_index').on(table.purchaseId),
    check('purchase_items_quantity_positive', sql`${table.quantity} > 0`),
  ],
);
