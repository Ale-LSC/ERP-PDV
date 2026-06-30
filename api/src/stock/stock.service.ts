import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { CompaniesService } from '../companies/companies.service';
import { db } from '../database/drizzle';
import { products } from '../database/schema/products.schema';
import { branchStocks, stockMovements } from '../database/schema/stock.schema';
import { BranchesService } from '../branches/branches.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { calculateStockQuantity } from './stock-calculation';
import { StockMovementType } from './stock.types';

@Injectable()
export class StockService {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly branchesService: BranchesService,
  ) {}

  async createMovement(
    companyId: string,
    userId: string,
    dto: CreateStockMovementDto,
    requestedBranchId?: string,
  ) {
    await this.companiesService.assertRole(companyId, userId, [
      'owner',
      'admin',
      'stock',
    ]);
    const branchId = await this.branchesService.resolve(
      companyId,
      userId,
      requestedBranchId,
    );

    if (dto.type !== StockMovementType.ADJUSTMENT && dto.quantity <= 0) {
      throw new BadRequestException(
        'A quantidade movimentada deve ser maior que zero',
      );
    }

    return db.transaction(async (tx) => {
      const [product] = await tx
        .select({
          id: products.id,
          stockQuantity: products.stockQuantity,
        })
        .from(products)
        .where(
          and(
            eq(products.id, dto.productId),
            eq(products.companyId, companyId),
            eq(products.isActive, true),
          ),
        )
        .for('update');

      if (!product) {
        throw new NotFoundException('Produto não encontrado');
      }
      const [branchStock] = await tx
        .select()
        .from(branchStocks)
        .where(
          and(
            eq(branchStocks.branchId, branchId),
            eq(branchStocks.productId, product.id),
          ),
        )
        .for('update');
      const previousQuantity = Number(branchStock?.quantity ?? 0);
      const resultingQuantity = calculateStockQuantity(
        previousQuantity,
        dto.type,
        dto.quantity,
      );

      if (resultingQuantity < 0) {
        throw new BadRequestException('Estoque insuficiente');
      }

      await tx
        .insert(branchStocks)
        .values({
          branchId,
          productId: product.id,
          quantity: resultingQuantity.toFixed(3),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [branchStocks.branchId, branchStocks.productId],
          set: {
            quantity: resultingQuantity.toFixed(3),
            updatedAt: new Date(),
          },
        });

      const [movement] = await tx
        .insert(stockMovements)
        .values({
          companyId,
          branchId,
          productId: product.id,
          type: dto.type,
          quantity: dto.quantity.toFixed(3),
          previousQuantity: previousQuantity.toFixed(3),
          resultingQuantity: resultingQuantity.toFixed(3),
          reason: dto.reason?.trim() || null,
          createdBy: userId,
        })
        .returning();

      return movement;
    });
  }

  async findAll(companyId: string, userId: string, requestedBranchId?: string) {
    await this.companiesService.assertRole(companyId, userId, [
      'owner',
      'admin',
      'stock',
    ]);

    const branchId = await this.branchesService.resolve(
      companyId,
      userId,
      requestedBranchId,
    );
    return db
      .select()
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.companyId, companyId),
          eq(stockMovements.branchId, branchId),
        ),
      )
      .orderBy(desc(stockMovements.createdAt))
      .limit(100);
  }
}
