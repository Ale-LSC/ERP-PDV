import {
  boolean,
  check,
  index,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies } from './companies.schema';

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 180 }).notNull(),
    sku: varchar('sku', { length: 60 }).notNull(),
    barcode: varchar('barcode', { length: 32 }),
    salePrice: numeric('sale_price', { precision: 12, scale: 2 }).notNull(),
    costPrice: numeric('cost_price', { precision: 12, scale: 2 })
      .default('0')
      .notNull(),
    stockQuantity: numeric('stock_quantity', { precision: 14, scale: 3 })
      .default('0')
      .notNull(),
    minimumStock: numeric('minimum_stock', { precision: 14, scale: 3 })
      .default('0')
      .notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('products_company_sku_unique').on(table.companyId, table.sku),
    uniqueIndex('products_company_barcode_unique').on(
      table.companyId,
      table.barcode,
    ),
    index('products_company_name_index').on(table.companyId, table.name),
    check('products_sale_price_nonnegative', sql`${table.salePrice} >= 0`),
    check('products_cost_price_nonnegative', sql`${table.costPrice} >= 0`),
    check('products_stock_nonnegative', sql`${table.stockQuantity} >= 0`),
    check(
      'products_minimum_stock_nonnegative',
      sql`${table.minimumStock} >= 0`,
    ),
  ],
);
