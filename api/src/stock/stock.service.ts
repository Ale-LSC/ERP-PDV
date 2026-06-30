import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { CompaniesService } from '../companies/companies.service';
import { db } from '../database/drizzle';
import { products } from '../database/schema/products.schema';
import { stockMovements } from '../database/schema/stock.schema';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { calculateStockQuantity } from './stock-calculation';
import { StockMovementType } from './stock.types';

@Injectable()
export class StockService {
  constructor(private readonly companiesService: CompaniesService) {}

  async createMovement(
    companyId: string,
    userId: string,
    dto: CreateStockMovementDto,
  ) {
    await this.companiesService.assertRole(companyId, userId, [
      'owner',
      'admin',
      'stock',
    ]);

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

      const previousQuantity = Number(product.stockQuantity);
      const resultingQuantity = calculateStockQuantity(
        previousQuantity,
        dto.type,
        dto.quantity,
      );

      if (resultingQuantity < 0) {
        throw new BadRequestException('Estoque insuficiente');
      }

      await tx
        .update(products)
        .set({
          stockQuantity: resultingQuantity.toFixed(3),
          updatedAt: new Date(),
        })
        .where(eq(products.id, product.id));

      const [movement] = await tx
        .insert(stockMovements)
        .values({
          companyId,
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

  async findAll(companyId: string, userId: string) {
    await this.companiesService.assertRole(companyId, userId, [
      'owner',
      'admin',
      'stock',
    ]);

    return db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.companyId, companyId))
      .orderBy(desc(stockMovements.createdAt))
      .limit(100);
  }
}
