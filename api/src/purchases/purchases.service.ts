import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { CompaniesService } from '../companies/companies.service';
import { db } from '../database/drizzle';
import { financialEntries } from '../database/schema/finance.schema';
import { products } from '../database/schema/products.schema';
import { purchaseItems, purchases } from '../database/schema/purchases.schema';
import { stockMovements } from '../database/schema/stock.schema';
import { suppliers } from '../database/schema/suppliers.schema';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { calculatePurchaseTotal } from './purchase-calculation';

@Injectable()
export class PurchasesService {
  constructor(private readonly companiesService: CompaniesService) {}
  async create(companyId: string, userId: string, dto: CreatePurchaseDto) {
    await this.companiesService.assertRole(companyId, userId, [
      'owner',
      'admin',
      'stock',
    ]);
    return db.transaction(async (tx) => {
      const [supplier] = await tx
        .select()
        .from(suppliers)
        .where(
          and(
            eq(suppliers.id, dto.supplierId),
            eq(suppliers.companyId, companyId),
            eq(suppliers.isActive, true),
          ),
        );
      if (!supplier) throw new NotFoundException('Fornecedor não encontrado');
      const consolidated = new Map<
        string,
        { quantity: number; unitCost: number }
      >();
      for (const item of dto.items) {
        if (consolidated.has(item.productId))
          throw new BadRequestException('Não repita o mesmo produto na compra');
        consolidated.set(item.productId, {
          quantity: item.quantity,
          unitCost: item.unitCost,
        });
      }
      const ids = [...consolidated.keys()].sort();
      const selected = await tx
        .select()
        .from(products)
        .where(
          and(eq(products.companyId, companyId), inArray(products.id, ids)),
        )
        .orderBy(products.id)
        .for('update');
      if (selected.length !== ids.length)
        throw new NotFoundException(
          'Um ou mais produtos não foram encontrados',
        );
      const totalCents = calculatePurchaseTotal(
        selected.map((product) => consolidated.get(product.id)!),
      );
      let financialEntryId: string | null = null;
      if (dto.dueDate) {
        const [entry] = await tx
          .insert(financialEntries)
          .values({
            companyId,
            createdBy: userId,
            type: 'payable',
            description: `Compra de ${supplier.name}${dto.invoiceNumber ? ` - NF ${dto.invoiceNumber}` : ''}`,
            category: 'Fornecedores',
            amount: (totalCents / 100).toFixed(2),
            dueDate: dto.dueDate,
          })
          .returning({ id: financialEntries.id });
        financialEntryId = entry.id;
      }
      const [purchase] = await tx
        .insert(purchases)
        .values({
          companyId,
          supplierId: supplier.id,
          financialEntryId,
          invoiceNumber: dto.invoiceNumber?.trim() || null,
          dueDate: dto.dueDate ?? null,
          total: (totalCents / 100).toFixed(2),
          createdBy: userId,
        })
        .returning();
      for (const product of selected) {
        const item = consolidated.get(product.id)!;
        const previous = Number(product.stockQuantity);
        const resulting = previous + item.quantity;
        await tx.insert(purchaseItems).values({
          purchaseId: purchase.id,
          productId: product.id,
          productName: product.name,
          quantity: item.quantity.toFixed(3),
          unitCost: item.unitCost.toFixed(2),
          total: (
            Math.round(item.quantity * item.unitCost * 100) / 100
          ).toFixed(2),
        });
        await tx
          .update(products)
          .set({
            stockQuantity: resulting.toFixed(3),
            costPrice: item.unitCost.toFixed(2),
            updatedAt: new Date(),
          })
          .where(eq(products.id, product.id));
        await tx.insert(stockMovements).values({
          companyId,
          productId: product.id,
          type: 'in',
          quantity: item.quantity.toFixed(3),
          previousQuantity: previous.toFixed(3),
          resultingQuantity: resulting.toFixed(3),
          reason: `Compra ${purchase.id}`,
          createdBy: userId,
        });
      }
      return purchase;
    });
  }
  async findAll(companyId: string, userId: string) {
    await this.companiesService.assertRole(companyId, userId, [
      'owner',
      'admin',
      'stock',
    ]);
    return db
      .select({
        id: purchases.id,
        supplierId: purchases.supplierId,
        supplierName: suppliers.name,
        status: purchases.status,
        invoiceNumber: purchases.invoiceNumber,
        total: purchases.total,
        dueDate: purchases.dueDate,
        createdAt: purchases.createdAt,
      })
      .from(purchases)
      .innerJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .where(eq(purchases.companyId, companyId))
      .orderBy(desc(purchases.createdAt))
      .limit(100);
  }
  async cancel(companyId: string, purchaseId: string, userId: string) {
    await this.companiesService.assertRole(companyId, userId, [
      'owner',
      'admin',
      'stock',
    ]);
    return db.transaction(async (tx) => {
      const [purchase] = await tx
        .select()
        .from(purchases)
        .where(
          and(eq(purchases.id, purchaseId), eq(purchases.companyId, companyId)),
        )
        .for('update');
      if (!purchase) throw new NotFoundException('Compra não encontrada');
      if (purchase.status === 'cancelled')
        throw new ConflictException('Compra já cancelada');
      const items = await tx
        .select()
        .from(purchaseItems)
        .where(eq(purchaseItems.purchaseId, purchase.id));
      const selected = await tx
        .select()
        .from(products)
        .where(inArray(products.id, items.map((item) => item.productId).sort()))
        .orderBy(products.id)
        .for('update');
      const byId = new Map(selected.map((product) => [product.id, product]));
      for (const item of items) {
        const product = byId.get(item.productId);
        if (!product)
          throw new NotFoundException('Produto da compra não encontrado');
        const previous = Number(product.stockQuantity);
        const quantity = Number(item.quantity);
        if (previous < quantity)
          throw new BadRequestException(
            `Não é possível cancelar: estoque de ${product.name} já foi consumido`,
          );
        const resulting = previous - quantity;
        await tx
          .update(products)
          .set({ stockQuantity: resulting.toFixed(3), updatedAt: new Date() })
          .where(eq(products.id, product.id));
        await tx.insert(stockMovements).values({
          companyId,
          productId: product.id,
          type: 'out',
          quantity: quantity.toFixed(3),
          previousQuantity: previous.toFixed(3),
          resultingQuantity: resulting.toFixed(3),
          reason: `Cancelamento da compra ${purchase.id}`,
          createdBy: userId,
        });
      }
      if (purchase.financialEntryId)
        await tx
          .delete(financialEntries)
          .where(
            and(
              eq(financialEntries.id, purchase.financialEntryId),
              eq(financialEntries.status, 'pending'),
            ),
          );
      const [cancelled] = await tx
        .update(purchases)
        .set({ status: 'cancelled', cancelledAt: new Date() })
        .where(eq(purchases.id, purchase.id))
        .returning();
      return cancelled;
    });
  }
}
