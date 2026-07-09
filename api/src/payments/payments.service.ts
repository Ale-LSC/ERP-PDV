import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { CompaniesService } from '../companies/companies.service';
import { db } from '../database/drizzle';
import { paymentTransactions } from '../database/schema/payments.schema';
import { salePayments, sales } from '../database/schema/sales.schema';
import { UpdatePaymentTransactionDto } from './dto/update-payment-transaction.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly companiesService: CompaniesService) {}

  async findAll(companyId: string, userId: string) {
    await this.companiesService.assertRole(companyId, userId, [
      'owner',
      'admin',
      'finance',
    ]);

    return db
      .select({
        id: paymentTransactions.id,
        saleId: paymentTransactions.saleId,
        salePaymentId: paymentTransactions.salePaymentId,
        provider: paymentTransactions.provider,
        status: paymentTransactions.status,
        amount: paymentTransactions.amount,
        externalId: paymentTransactions.externalId,
        authorizationCode: paymentTransactions.authorizationCode,
        nsu: paymentTransactions.nsu,
        errorMessage: paymentTransactions.errorMessage,
        requestedAt: paymentTransactions.requestedAt,
        authorizedAt: paymentTransactions.authorizedAt,
        capturedAt: paymentTransactions.capturedAt,
        cancelledAt: paymentTransactions.cancelledAt,
        createdAt: paymentTransactions.createdAt,
        updatedAt: paymentTransactions.updatedAt,
      })
      .from(paymentTransactions)
      .where(eq(paymentTransactions.companyId, companyId))
      .orderBy(desc(paymentTransactions.createdAt))
      .limit(200);
  }

  async findBySale(companyId: string, saleId: string, userId: string) {
    await this.companiesService.assertRole(companyId, userId, [
      'owner',
      'admin',
      'finance',
      'cashier',
    ]);
    await this.assertSale(companyId, saleId);

    return db
      .select()
      .from(paymentTransactions)
      .where(
        and(
          eq(paymentTransactions.companyId, companyId),
          eq(paymentTransactions.saleId, saleId),
        ),
      )
      .orderBy(desc(paymentTransactions.createdAt));
  }

  async updateProviderResult(
    companyId: string,
    transactionId: string,
    userId: string,
    dto: UpdatePaymentTransactionDto,
  ) {
    await this.companiesService.assertRole(companyId, userId, [
      'owner',
      'admin',
      'finance',
    ]);

    const now = new Date();
    const [transaction] = await db
      .update(paymentTransactions)
      .set({
        status: dto.status,
        externalId: dto.externalId,
        authorizationCode: dto.authorizationCode,
        nsu: dto.nsu,
        errorMessage: dto.errorMessage,
        providerPayload: dto.providerPayload,
        authorizedAt:
          dto.status === 'authorized' || dto.status === 'captured'
            ? now
            : undefined,
        capturedAt: dto.status === 'captured' ? now : undefined,
        cancelledAt: dto.status === 'cancelled' ? now : undefined,
        updatedAt: now,
      })
      .where(
        and(
          eq(paymentTransactions.id, transactionId),
          eq(paymentTransactions.companyId, companyId),
        ),
      )
      .returning();

    if (!transaction) {
      throw new NotFoundException('Transação de pagamento não encontrada');
    }

    return transaction;
  }

  async assertSalePaymentBelongsToCompany(
    companyId: string,
    salePaymentId: string,
  ) {
    const [payment] = await db
      .select({ id: salePayments.id })
      .from(salePayments)
      .innerJoin(sales, eq(salePayments.saleId, sales.id))
      .where(
        and(eq(salePayments.id, salePaymentId), eq(sales.companyId, companyId)),
      );
    if (!payment) {
      throw new ForbiddenException('Pagamento não pertence à empresa');
    }
  }

  private async assertSale(companyId: string, saleId: string) {
    const [sale] = await db
      .select({ id: sales.id })
      .from(sales)
      .where(and(eq(sales.id, saleId), eq(sales.companyId, companyId)));
    if (!sale) throw new NotFoundException('Venda não encontrada');
  }
}
