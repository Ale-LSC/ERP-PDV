import {
  check,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies } from './companies.schema';
import { products } from './products.schema';
import { users } from './users.schema';
import { branches } from './branches.schema';
import { primaryKey } from 'drizzle-orm/pg-core';

export const branchStocks = pgTable(
  'branch_stocks',
  {
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    quantity: numeric('quantity', { precision: 14, scale: 3 })
      .default('0')
      .notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.branchId, table.productId] })],
);

export const stockMovementTypeEnum = pgEnum('stock_movement_type', [
  'in',
  'out',
  'adjustment',
]);

export const stockMovements = pgTable(
  'stock_movements',
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
    type: stockMovementTypeEnum('type').notNull(),
    quantity: numeric('quantity', { precision: 14, scale: 3 }).notNull(),
    previousQuantity: numeric('previous_quantity', {
      precision: 14,
      scale: 3,
    }).notNull(),
    resultingQuantity: numeric('resulting_quantity', {
      precision: 14,
      scale: 3,
    }).notNull(),
    reason: text('reason'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('stock_movements_company_created_index').on(
      table.companyId,
      table.createdAt,
    ),
    index('stock_movements_product_created_index').on(
      table.productId,
      table.createdAt,
    ),
    check('stock_movements_quantity_nonnegative', sql`${table.quantity} >= 0`),
    check(
      'stock_movements_previous_nonnegative',
      sql`${table.previousQuantity} >= 0`,
    ),
    check(
      'stock_movements_resulting_nonnegative',
      sql`${table.resultingQuantity} >= 0`,
    ),
  ],
);
