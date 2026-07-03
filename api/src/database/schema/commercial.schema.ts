import {
  boolean,
  check,
  date,
  index,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { branches } from './branches.schema';
import { companies } from './companies.schema';
import { products } from './products.schema';

export const promotions = pgTable(
  'promotions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 160 }).notNull(),
    promotionalPrice: numeric('promotional_price', {
      precision: 12,
      scale: 2,
    }).notNull(),
    startsAt: timestamp('starts_at').notNull(),
    endsAt: timestamp('ends_at').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('promotions_company_product_idx').on(
      table.companyId,
      table.productId,
    ),
    check('promotions_price_positive', sql`${table.promotionalPrice} >= 0`),
    check('promotions_period_valid', sql`${table.endsAt} > ${table.startsAt}`),
  ],
);

export const productLots = pgTable(
  'product_lots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 80 }).notNull(),
    expiresAt: date('expires_at').notNull(),
    quantity: numeric('quantity', { precision: 14, scale: 3 })
      .default('0')
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('product_lots_branch_product_code_unique').on(
      table.branchId,
      table.productId,
      table.code,
    ),
    index('product_lots_company_expiry_idx').on(
      table.companyId,
      table.expiresAt,
    ),
    check('product_lots_quantity_nonnegative', sql`${table.quantity} >= 0`),
  ],
);
