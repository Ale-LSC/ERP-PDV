import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { CompaniesService } from '../companies/companies.service';
import { db } from '../database/drizzle';
import { cashSessions } from '../database/schema/cash.schema';
import { salePayments, sales } from '../database/schema/sales.schema';

@Injectable()
export class CashService {
  constructor(private readonly companiesService: CompaniesService) {}

  async open(companyId: string, userId: string, openingAmount: number) {
    await this.companiesService.assertRole(companyId, userId);

    try {
      const [session] = await db
        .insert(cashSessions)
        .values({
          companyId,
          openedBy: userId,
          openingAmount: openingAmount.toFixed(2),
        })
        .returning();

      return session;
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw new ConflictException('Você já possui um caixa aberto');
      }

      throw error;
    }
  }

  async findCurrent(companyId: string, userId: string) {
    await this.companiesService.assertRole(companyId, userId);

    const [session] = await db
      .select()
      .from(cashSessions)
      .where(
        and(
          eq(cashSessions.companyId, companyId),
          eq(cashSessions.openedBy, userId),
          eq(cashSessions.status, 'open'),
        ),
      );

    return session ?? null;
  }

  async close(
    companyId: string,
    sessionId: string,
    userId: string,
    closingAmount: number,
  ) {
    await this.companiesService.assertRole(companyId, userId);

    const [session] = await db
      .update(cashSessions)
      .set({
        status: 'closed',
        closingAmount: closingAmount.toFixed(2),
        closedAt: new Date(),
      })
      .where(
        and(
          eq(cashSessions.id, sessionId),
          eq(cashSessions.companyId, companyId),
          eq(cashSessions.openedBy, userId),
          eq(cashSessions.status, 'open'),
        ),
      )
      .returning();

    if (!session) {
      throw new NotFoundException('Caixa aberto não encontrado');
    }

    const summary = await this.getSummary(companyId, sessionId, userId);

    return {
      session,
      summary,
      difference: (closingAmount - Number(summary.expectedCashAmount)).toFixed(
        2,
      ),
    };
  }

  async getSummary(companyId: string, sessionId: string, userId: string) {
    const role = await this.companiesService.assertRole(companyId, userId);
    const [session] = await db
      .select()
      .from(cashSessions)
      .where(
        and(
          eq(cashSessions.id, sessionId),
          eq(cashSessions.companyId, companyId),
        ),
      );

    if (!session) throw new NotFoundException('Caixa não encontrado');
    if (role === 'cashier' && session.openedBy !== userId) {
      throw new ForbiddenException(
        'Você não pode consultar o caixa de outro operador',
      );
    }

    const paymentRows = await db
      .select({
        method: salePayments.method,
        total: sql<string>`coalesce(sum(${salePayments.amount}), 0)`,
      })
      .from(salePayments)
      .innerJoin(sales, eq(salePayments.saleId, sales.id))
      .where(
        and(eq(sales.cashSessionId, sessionId), eq(sales.status, 'completed')),
      )
      .groupBy(salePayments.method);
    const [saleSummary] = await db
      .select({
        count: sql<number>`count(*)::int`,
        total: sql<string>`coalesce(sum(${sales.total}), 0)`,
      })
      .from(sales)
      .where(
        and(eq(sales.cashSessionId, sessionId), eq(sales.status, 'completed')),
      );
    const payments = {
      cash: '0.00',
      pix: '0.00',
      debit_card: '0.00',
      credit_card: '0.00',
    };
    for (const row of paymentRows) payments[row.method] = row.total;

    return {
      sessionId: session.id,
      status: session.status,
      openingAmount: session.openingAmount,
      closingAmount: session.closingAmount,
      salesCount: saleSummary?.count ?? 0,
      salesTotal: saleSummary?.total ?? '0.00',
      payments,
      expectedCashAmount: (
        Number(session.openingAmount) + Number(payments.cash)
      ).toFixed(2),
    };
  }
}
