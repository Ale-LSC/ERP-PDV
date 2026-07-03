import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { CompaniesService } from '../companies/companies.service';
import { db } from '../database/drizzle';
import { cashSessions } from '../database/schema/cash.schema';
import { products } from '../database/schema/products.schema';
import { customers } from '../database/schema/customers.schema';
import {
  saleItems,
  salePayments,
  sales,
} from '../database/schema/sales.schema';
import { branchStocks, stockMovements } from '../database/schema/stock.schema';
import { CreateSaleDto, PaymentMethod } from './dto/create-sale.dto';
import { BranchesService } from '../branches/branches.service';
import {
  calculateChangeCents,
  calculateSaleTotals,
  centsToDecimal,
  toCents,
} from './sale-calculation';

@Injectable()
export class SalesService {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly branchesService: BranchesService,
  ) {}

  async create(companyId: string, userId: string, dto: CreateSaleDto) {
    await this.companiesService.assertRole(companyId, userId, [
      'owner',
      'admin',
      'cashier',
    ]);
    const consolidatedItems = this.consolidateItems(dto.items);

    return db.transaction(async (tx) => {
      const [cashSession] = await tx
        .select({ id: cashSessions.id, branchId: cashSessions.branchId })
        .from(cashSessions)
        .where(
          and(
            eq(cashSessions.id, dto.cashSessionId),
            eq(cashSessions.companyId, companyId),
            eq(cashSessions.openedBy, userId),
            eq(cashSessions.status, 'open'),
          ),
        )
        .for('update');

      if (!cashSession) {
        throw new BadRequestException('Abra um caixa antes de vender');
      }

      if (dto.customerId) {
        const [customer] = await tx
          .select({ id: customers.id })
          .from(customers)
          .where(
            and(
              eq(customers.id, dto.customerId),
              eq(customers.companyId, companyId),
              eq(customers.isActive, true),
            ),
          );
        if (!customer) throw new NotFoundException('Cliente não encontrado');
      }

      const productIds = consolidatedItems.map((item) => item.productId).sort();
      const selectedProducts = await tx
        .select({
          id: products.id,
          name: products.name,
          sku: products.sku,
          salePrice: sql<string>`coalesce((
            select p.promotional_price from promotions p
            where p.company_id = ${companyId}
              and p.product_id = ${products.id}
              and p.is_active = true
              and p.starts_at <= now() and p.ends_at > now()
            limit 1
          ), ${products.salePrice})`,
          stockQuantity: branchStocks.quantity,
        })
        .from(products)
        .innerJoin(
          branchStocks,
          and(
            eq(branchStocks.productId, products.id),
            eq(branchStocks.branchId, cashSession.branchId),
          ),
        )
        .where(
          and(
            eq(products.companyId, companyId),
            eq(products.isActive, true),
            inArray(products.id, productIds),
          ),
        )
        .orderBy(products.id)
        .for('update');

      if (selectedProducts.length !== productIds.length) {
        throw new NotFoundException(
          'Um ou mais produtos não foram encontrados',
        );
      }

      const productById = new Map(
        selectedProducts.map((product) => [product.id, product]),
      );
      const calculatedItems = consolidatedItems.map((item) => {
        const product = productById.get(item.productId);
        if (!product) throw new NotFoundException('Produto não encontrado');
        if (Number(product.stockQuantity) < item.quantity) {
          throw new BadRequestException(
            `Estoque insuficiente: ${product.name}`,
          );
        }

        return { product, quantity: item.quantity };
      });
      const totals = calculateSaleTotals(
        calculatedItems.map(({ product, quantity }) => ({
          unitPrice: product.salePrice,
          quantity,
        })),
        dto.discount,
      );
      const paymentTotalCents = dto.payments.reduce(
        (total, payment) => total + toCents(payment.amount),
        0,
      );

      if (paymentTotalCents !== totals.totalCents) {
        throw new BadRequestException(
          'Os pagamentos devem ser iguais ao total',
        );
      }
      const calculatedPayments = dto.payments.map((payment) => {
        const amountCents = toCents(payment.amount);
        const receivedCents =
          payment.method === PaymentMethod.CASH
            ? toCents(payment.receivedAmount ?? payment.amount)
            : amountCents;

        let changeCents: number;
        try {
          changeCents = calculateChangeCents(
            amountCents / 100,
            receivedCents / 100,
          );
        } catch {
          throw new BadRequestException(
            'O valor recebido em dinheiro é menor que o pagamento',
          );
        }

        return {
          method: payment.method,
          amount: centsToDecimal(amountCents),
          receivedAmount:
            payment.method === PaymentMethod.CASH
              ? centsToDecimal(receivedCents)
              : null,
          changeAmount: centsToDecimal(changeCents),
        };
      });

      const [sale] = await tx
        .insert(sales)
        .values({
          companyId,
          branchId: cashSession.branchId,
          cashSessionId: cashSession.id,
          operatorId: userId,
          customerId: dto.customerId ?? null,
          subtotal: centsToDecimal(totals.subtotalCents),
          discount: centsToDecimal(totals.discountCents),
          total: centsToDecimal(totals.totalCents),
        })
        .returning();

      await tx.insert(saleItems).values(
        calculatedItems.map(({ product, quantity }, index) => ({
          saleId: sale.id,
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: quantity.toFixed(3),
          unitPrice: product.salePrice,
          total: centsToDecimal(totals.itemTotals[index]),
        })),
      );
      await tx.insert(salePayments).values(
        calculatedPayments.map((payment) => ({
          saleId: sale.id,
          ...payment,
        })),
      );

      for (const { product, quantity } of calculatedItems) {
        const previousQuantity = Number(product.stockQuantity);
        const resultingQuantity = previousQuantity - quantity;

        await tx
          .update(branchStocks)
          .set({
            quantity: resultingQuantity.toFixed(3),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(branchStocks.productId, product.id),
              eq(branchStocks.branchId, cashSession.branchId),
            ),
          );
        await tx.insert(stockMovements).values({
          companyId,
          branchId: cashSession.branchId,
          productId: product.id,
          type: 'out',
          quantity: quantity.toFixed(3),
          previousQuantity: previousQuantity.toFixed(3),
          resultingQuantity: resultingQuantity.toFixed(3),
          reason: `Venda ${sale.id}`,
          createdBy: userId,
        });
      }

      return {
        ...sale,
        change: centsToDecimal(
          calculatedPayments.reduce(
            (total, payment) => total + toCents(payment.changeAmount),
            0,
          ),
        ),
      };
    });
  }

  async cancel(
    companyId: string,
    saleId: string,
    userId: string,
    requestedBranchId?: string,
  ) {
    await this.companiesService.assertRole(companyId, userId, [
      'owner',
      'admin',
    ]);
    const branchId = await this.branchesService.resolve(
      companyId,
      userId,
      requestedBranchId,
    );

    return db.transaction(async (tx) => {
      const [sale] = await tx
        .select()
        .from(sales)
        .where(
          and(
            eq(sales.id, saleId),
            eq(sales.companyId, companyId),
            eq(sales.branchId, branchId),
          ),
        )
        .for('update');

      if (!sale) throw new NotFoundException('Venda não encontrada');
      if (sale.status !== 'completed') {
        throw new ConflictException('Esta venda já foi cancelada');
      }

      const items = await tx
        .select()
        .from(saleItems)
        .where(eq(saleItems.saleId, saleId));
      const productIds = items.map((item) => item.productId).sort();
      const selectedProducts = await tx
        .select({
          id: products.id,
          name: products.name,
          stockQuantity: branchStocks.quantity,
        })
        .from(products)
        .innerJoin(
          branchStocks,
          and(
            eq(branchStocks.productId, products.id),
            eq(branchStocks.branchId, sale.branchId),
          ),
        )
        .where(inArray(products.id, productIds))
        .orderBy(products.id)
        .for('update');
      const productById = new Map(
        selectedProducts.map((product) => [product.id, product]),
      );

      for (const item of items) {
        const product = productById.get(item.productId);
        if (!product) {
          throw new NotFoundException('Produto da venda não encontrado');
        }
        const previousQuantity = Number(product.stockQuantity);
        const quantity = Number(item.quantity);
        const resultingQuantity = previousQuantity + quantity;

        await tx
          .update(branchStocks)
          .set({
            quantity: resultingQuantity.toFixed(3),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(branchStocks.productId, product.id),
              eq(branchStocks.branchId, sale.branchId),
            ),
          );
        await tx.insert(stockMovements).values({
          companyId,
          branchId: sale.branchId,
          productId: product.id,
          type: 'in',
          quantity: quantity.toFixed(3),
          previousQuantity: previousQuantity.toFixed(3),
          resultingQuantity: resultingQuantity.toFixed(3),
          reason: `Cancelamento da venda ${sale.id}`,
          createdBy: userId,
        });
      }

      const [cancelledSale] = await tx
        .update(sales)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledBy: userId,
        })
        .where(eq(sales.id, sale.id))
        .returning();

      return cancelledSale;
    });
  }

  async findRecent(
    companyId: string,
    userId: string,
    requestedBranchId?: string,
  ) {
    await this.companiesService.assertRole(companyId, userId, [
      'owner',
      'admin',
      'cashier',
    ]);
    const branchId = await this.branchesService.resolve(
      companyId,
      userId,
      requestedBranchId,
    );

    return db
      .select()
      .from(sales)
      .where(and(eq(sales.companyId, companyId), eq(sales.branchId, branchId)))
      .orderBy(desc(sales.createdAt))
      .limit(50);
  }

  async findOne(
    companyId: string,
    saleId: string,
    userId: string,
    requestedBranchId?: string,
  ) {
    await this.companiesService.assertRole(companyId, userId, [
      'owner',
      'admin',
      'cashier',
    ]);
    const branchId = await this.branchesService.resolve(
      companyId,
      userId,
      requestedBranchId,
    );
    const [sale] = await db
      .select({
        id: sales.id,
        status: sales.status,
        subtotal: sales.subtotal,
        discount: sales.discount,
        total: sales.total,
        createdAt: sales.createdAt,
        customerName: customers.name,
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .where(
        and(
          eq(sales.id, saleId),
          eq(sales.companyId, companyId),
          eq(sales.branchId, branchId),
        ),
      );
    if (!sale) throw new NotFoundException('Venda não encontrada');
    const [items, payments] = await Promise.all([
      db.select().from(saleItems).where(eq(saleItems.saleId, saleId)),
      db.select().from(salePayments).where(eq(salePayments.saleId, saleId)),
    ]);
    return { ...sale, items, payments };
  }

  private consolidateItems(items: CreateSaleDto['items']) {
    const quantities = new Map<string, number>();
    for (const item of items) {
      quantities.set(
        item.productId,
        (quantities.get(item.productId) ?? 0) + item.quantity,
      );
    }

    return [...quantities].map(([productId, quantity]) => ({
      productId,
      quantity,
    }));
  }
}
