import { Injectable } from '@nestjs/common';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { CompaniesService } from '../companies/companies.service';
import { db } from '../database/drizzle';
import { customers } from '../database/schema/customers.schema';
import { products } from '../database/schema/products.schema';
import {
  saleItems,
  salePayments,
  sales,
} from '../database/schema/sales.schema';
import { ReportPeriodDto } from './dto/report-period.dto';
import { resolveReportPeriod } from './report-period';

@Injectable()
export class ReportsService {
  constructor(private readonly companiesService: CompaniesService) {}

  async overview(companyId: string, userId: string, period: ReportPeriodDto) {
    await this.companiesService.assertRole(companyId, userId, [
      'owner',
      'admin',
      'finance',
    ]);
    const { start, end } = resolveReportPeriod(period.from, period.to);
    const completedSales = and(
      eq(sales.companyId, companyId),
      eq(sales.status, 'completed'),
      gte(sales.createdAt, start),
      lte(sales.createdAt, end),
    );

    const [saleSummary, payments, topProducts, inventory, customerSummary] =
      await Promise.all([
        db
          .select({
            count: sql<number>`count(*)::int`,
            revenue: sql<string>`coalesce(sum(${sales.total}), 0)`,
            averageTicket: sql<string>`coalesce(avg(${sales.total}), 0)`,
            discounts: sql<string>`coalesce(sum(${sales.discount}), 0)`,
          })
          .from(sales)
          .where(completedSales),
        db
          .select({
            method: salePayments.method,
            total: sql<string>`coalesce(sum(${salePayments.amount}), 0)`,
          })
          .from(salePayments)
          .innerJoin(sales, eq(salePayments.saleId, sales.id))
          .where(completedSales)
          .groupBy(salePayments.method),
        db
          .select({
            productId: saleItems.productId,
            name: saleItems.productName,
            quantity: sql<string>`sum(${saleItems.quantity})`,
            revenue: sql<string>`sum(${saleItems.total})`,
          })
          .from(saleItems)
          .innerJoin(sales, eq(saleItems.saleId, sales.id))
          .where(completedSales)
          .groupBy(saleItems.productId, saleItems.productName)
          .orderBy(sql`sum(${saleItems.total}) desc`)
          .limit(5),
        db
          .select({
            productsCount: sql<number>`count(*)::int`,
            lowStockCount: sql<number>`count(*) filter (where ${products.stockQuantity} <= ${products.minimumStock})::int`,
            stockCost: sql<string>`coalesce(sum(${products.stockQuantity} * ${products.costPrice}), 0)`,
            stockRetail: sql<string>`coalesce(sum(${products.stockQuantity} * ${products.salePrice}), 0)`,
          })
          .from(products)
          .where(
            and(eq(products.companyId, companyId), eq(products.isActive, true)),
          ),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(customers)
          .where(
            and(
              eq(customers.companyId, companyId),
              eq(customers.isActive, true),
            ),
          ),
      ]);

    const paymentTotals = {
      cash: '0',
      pix: '0',
      debit_card: '0',
      credit_card: '0',
    };
    for (const payment of payments)
      paymentTotals[payment.method] = payment.total;

    return {
      period: { from: start.toISOString(), to: end.toISOString() },
      sales: saleSummary[0],
      payments: paymentTotals,
      topProducts,
      inventory: inventory[0],
      customersCount: customerSummary[0]?.count ?? 0,
    };
  }
}
