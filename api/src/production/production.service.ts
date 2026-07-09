import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { BranchesService } from '../branches/branches.service';
import { CompaniesService } from '../companies/companies.service';
import { db } from '../database/drizzle';
import { products } from '../database/schema/products.schema';
import {
  billOfMaterialItems,
  billsOfMaterials,
  productionOrders,
} from '../database/schema/production.schema';
import { branchStocks, stockMovements } from '../database/schema/stock.schema';
import { CreateBomDto } from './dto/create-bom.dto';
import {
  CompleteProductionOrderDto,
  CreateProductionOrderDto,
} from './dto/create-production-order.dto';
import { calculateMaterialRequirement } from './production-calculation';

@Injectable()
export class ProductionService {
  constructor(
    private readonly companies: CompaniesService,
    private readonly branches: BranchesService,
  ) {}

  async createBom(companyId: string, userId: string, dto: CreateBomDto) {
    await this.companies.assertRole(companyId, userId, [
      'owner',
      'admin',
      'stock',
    ]);
    const componentIds = dto.items.map((item) => item.productId);
    if (new Set(componentIds).size !== componentIds.length)
      throw new BadRequestException('Não repita componentes');
    if (componentIds.includes(dto.productId))
      throw new BadRequestException(
        'O produto final não pode ser componente de si mesmo',
      );
    const found = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.companyId, companyId),
          eq(products.isActive, true),
          inArray(products.id, [dto.productId, ...componentIds]),
        ),
      );
    if (found.length !== componentIds.length + 1)
      throw new NotFoundException('Produto ou componente não encontrado');
    try {
      return await db.transaction(async (tx) => {
        const [bom] = await tx
          .insert(billsOfMaterials)
          .values({
            companyId,
            productId: dto.productId,
            name: dto.name.trim(),
            yieldQuantity: dto.yieldQuantity.toFixed(3),
          })
          .returning();
        await tx.insert(billOfMaterialItems).values(
          dto.items.map((item) => ({
            bomId: bom.id,
            productId: item.productId,
            quantity: item.quantity.toFixed(3),
          })),
        );
        return bom;
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      )
        throw new ConflictException('Este produto já possui ficha técnica');
      throw error;
    }
  }

  async listBoms(companyId: string, userId: string) {
    await this.companies.assertRole(companyId, userId);
    const headers = await db
      .select({
        id: billsOfMaterials.id,
        name: billsOfMaterials.name,
        productId: billsOfMaterials.productId,
        productName: products.name,
        yieldQuantity: billsOfMaterials.yieldQuantity,
      })
      .from(billsOfMaterials)
      .innerJoin(products, eq(products.id, billsOfMaterials.productId))
      .where(eq(billsOfMaterials.companyId, companyId))
      .orderBy(asc(billsOfMaterials.name));
    if (!headers.length) return [];
    const componentProduct = products;
    const items = await db
      .select({
        bomId: billOfMaterialItems.bomId,
        productId: billOfMaterialItems.productId,
        productName: componentProduct.name,
        quantity: billOfMaterialItems.quantity,
      })
      .from(billOfMaterialItems)
      .innerJoin(
        componentProduct,
        eq(componentProduct.id, billOfMaterialItems.productId),
      )
      .where(
        inArray(
          billOfMaterialItems.bomId,
          headers.map((item) => item.id),
        ),
      );
    return headers.map((header) => ({
      ...header,
      items: items.filter((item) => item.bomId === header.id),
    }));
  }

  async createOrder(
    companyId: string,
    userId: string,
    dto: CreateProductionOrderDto,
    requestedBranchId?: string,
  ) {
    await this.companies.assertRole(companyId, userId, [
      'owner',
      'admin',
      'stock',
    ]);
    const branchId = await this.branches.resolve(
      companyId,
      userId,
      requestedBranchId,
    );
    const [bom] = await db
      .select({ id: billsOfMaterials.id })
      .from(billsOfMaterials)
      .where(
        and(
          eq(billsOfMaterials.id, dto.bomId),
          eq(billsOfMaterials.companyId, companyId),
        ),
      );
    if (!bom) throw new NotFoundException('Ficha técnica não encontrada');
    const [order] = await db
      .insert(productionOrders)
      .values({
        companyId,
        branchId,
        bomId: dto.bomId,
        plannedQuantity: dto.plannedQuantity.toFixed(3),
        notes: dto.notes?.trim() || null,
        createdBy: userId,
      })
      .returning();
    return order;
  }

  async listOrders(
    companyId: string,
    userId: string,
    requestedBranchId?: string,
  ) {
    await this.companies.assertRole(companyId, userId);
    const branchId = await this.branches.resolve(
      companyId,
      userId,
      requestedBranchId,
    );
    return db
      .select({
        id: productionOrders.id,
        bomId: productionOrders.bomId,
        bomName: billsOfMaterials.name,
        productName: products.name,
        plannedQuantity: productionOrders.plannedQuantity,
        producedQuantity: productionOrders.producedQuantity,
        status: productionOrders.status,
        notes: productionOrders.notes,
        createdAt: productionOrders.createdAt,
      })
      .from(productionOrders)
      .innerJoin(
        billsOfMaterials,
        eq(billsOfMaterials.id, productionOrders.bomId),
      )
      .innerJoin(products, eq(products.id, billsOfMaterials.productId))
      .where(
        and(
          eq(productionOrders.companyId, companyId),
          eq(productionOrders.branchId, branchId),
        ),
      )
      .orderBy(desc(productionOrders.createdAt));
  }

  async mrp(
    companyId: string,
    userId: string,
    bomId: string,
    quantity: number,
    requestedBranchId?: string,
  ) {
    await this.companies.assertRole(companyId, userId);
    if (!(quantity > 0)) throw new BadRequestException('Quantidade inválida');
    const branchId = await this.branches.resolve(
      companyId,
      userId,
      requestedBranchId,
    );
    const [bom] = await db
      .select()
      .from(billsOfMaterials)
      .where(
        and(
          eq(billsOfMaterials.id, bomId),
          eq(billsOfMaterials.companyId, companyId),
        ),
      );
    if (!bom) throw new NotFoundException('Ficha técnica não encontrada');
    const items = await db
      .select({
        productId: billOfMaterialItems.productId,
        productName: products.name,
        quantity: billOfMaterialItems.quantity,
        available: branchStocks.quantity,
      })
      .from(billOfMaterialItems)
      .innerJoin(products, eq(products.id, billOfMaterialItems.productId))
      .leftJoin(
        branchStocks,
        and(
          eq(branchStocks.productId, billOfMaterialItems.productId),
          eq(branchStocks.branchId, branchId),
        ),
      )
      .where(eq(billOfMaterialItems.bomId, bomId));
    return items.map((item) => {
      const available = Number(item.available ?? 0);
      const calculation = calculateMaterialRequirement(
        Number(item.quantity),
        Number(bom.yieldQuantity),
        quantity,
        available,
      );
      return {
        ...item,
        required: calculation.required.toFixed(3),
        available: available.toFixed(3),
        shortage: calculation.shortage.toFixed(3),
      };
    });
  }

  async complete(
    companyId: string,
    userId: string,
    orderId: string,
    dto: CompleteProductionOrderDto,
  ) {
    await this.companies.assertRole(companyId, userId, [
      'owner',
      'admin',
      'stock',
    ]);
    return db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(productionOrders)
        .where(
          and(
            eq(productionOrders.id, orderId),
            eq(productionOrders.companyId, companyId),
          ),
        )
        .for('update');
      if (!order) throw new NotFoundException('Ordem não encontrada');
      if (order.status === 'completed' || order.status === 'cancelled')
        throw new ConflictException('Ordem já encerrada');
      const [bom] = await tx
        .select()
        .from(billsOfMaterials)
        .where(eq(billsOfMaterials.id, order.bomId));
      const items = await tx
        .select()
        .from(billOfMaterialItems)
        .where(eq(billOfMaterialItems.bomId, order.bomId));
      if (!bom) throw new NotFoundException('Ficha técnica não encontrada');
      const productIds = [
        ...items.map((item) => item.productId),
        bom.productId,
      ];
      const stocks = await tx
        .select()
        .from(branchStocks)
        .where(
          and(
            eq(branchStocks.branchId, order.branchId),
            inArray(branchStocks.productId, productIds),
          ),
        )
        .for('update');
      const stockByProduct = new Map(
        stocks.map((stock) => [stock.productId, Number(stock.quantity)]),
      );
      const requirements = items.map((item) => ({
        productId: item.productId,
        quantity: calculateMaterialRequirement(
          Number(item.quantity),
          Number(bom.yieldQuantity),
          dto.producedQuantity,
          0,
        ).required,
      }));
      for (const requirement of requirements)
        if (
          (stockByProduct.get(requirement.productId) ?? 0) <
          requirement.quantity
        )
          throw new BadRequestException(
            'Estoque insuficiente para concluir a produção',
          );
      for (const requirement of requirements)
        await this.moveStock(
          tx,
          companyId,
          order.branchId,
          requirement.productId,
          -requirement.quantity,
          userId,
          `Consumo da ordem ${order.id}`,
        );
      await this.moveStock(
        tx,
        companyId,
        order.branchId,
        bom.productId,
        dto.producedQuantity,
        userId,
        `Produção da ordem ${order.id}`,
      );
      const [completed] = await tx
        .update(productionOrders)
        .set({
          status: 'completed',
          producedQuantity: dto.producedQuantity.toFixed(3),
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(productionOrders.id, order.id))
        .returning();
      return completed;
    });
  }

  private async moveStock(
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    companyId: string,
    branchId: string,
    productId: string,
    delta: number,
    userId: string,
    reason: string,
  ) {
    const [current] = await tx
      .select()
      .from(branchStocks)
      .where(
        and(
          eq(branchStocks.branchId, branchId),
          eq(branchStocks.productId, productId),
        ),
      )
      .for('update');
    const previous = Number(current?.quantity ?? 0);
    const resulting = previous + delta;
    await tx
      .insert(branchStocks)
      .values({ branchId, productId, quantity: resulting.toFixed(3) })
      .onConflictDoUpdate({
        target: [branchStocks.branchId, branchStocks.productId],
        set: { quantity: resulting.toFixed(3), updatedAt: new Date() },
      });
    await tx.insert(stockMovements).values({
      companyId,
      branchId,
      productId,
      type: delta >= 0 ? 'in' : 'out',
      quantity: Math.abs(delta).toFixed(3),
      previousQuantity: previous.toFixed(3),
      resultingQuantity: resulting.toFixed(3),
      reason,
      createdBy: userId,
    });
  }
}
