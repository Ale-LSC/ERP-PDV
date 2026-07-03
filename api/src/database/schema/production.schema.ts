import {
  check,
  index,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { branches } from './branches.schema';
import { companies } from './companies.schema';
import { products } from './products.schema';
import { users } from './users.schema';

export const billsOfMaterials = pgTable(
  'bills_of_materials',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 160 }).notNull(),
    yieldQuantity: numeric('yield_quantity', {
      precision: 14,
      scale: 3,
    }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('bom_company_product_unique').on(
      table.companyId,
      table.productId,
    ),
    check('bom_yield_positive', sql`${table.yieldQuantity} > 0`),
  ],
);

export const billOfMaterialItems = pgTable(
  'bill_of_material_items',
  {
    bomId: uuid('bom_id')
      .notNull()
      .references(() => billsOfMaterials.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    quantity: numeric('quantity', { precision: 14, scale: 3 }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.bomId, table.productId] }),
    check('bom_item_quantity_positive', sql`${table.quantity} > 0`),
  ],
);

export const productionOrderStatusEnum = pgEnum('production_order_status', [
  'planned',
  'in_progress',
  'completed',
  'cancelled',
]);
export const productionOrders = pgTable(
  'production_orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'restrict' }),
    bomId: uuid('bom_id')
      .notNull()
      .references(() => billsOfMaterials.id, { onDelete: 'restrict' }),
    plannedQuantity: numeric('planned_quantity', {
      precision: 14,
      scale: 3,
    }).notNull(),
    producedQuantity: numeric('produced_quantity', { precision: 14, scale: 3 }),
    status: productionOrderStatusEnum('status').default('planned').notNull(),
    notes: text('notes'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('production_orders_company_status_idx').on(
      table.companyId,
      table.status,
    ),
    check('production_planned_positive', sql`${table.plannedQuantity} > 0`),
  ],
);
