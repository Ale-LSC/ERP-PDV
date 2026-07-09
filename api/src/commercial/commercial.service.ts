import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, gt, lt, sql } from 'drizzle-orm';
import { BranchesService } from '../branches/branches.service';
import { CompaniesService } from '../companies/companies.service';
import { db } from '../database/drizzle';
import { productLots, promotions } from '../database/schema/commercial.schema';
import { products } from '../database/schema/products.schema';
import { branchStocks } from '../database/schema/stock.schema';
import { CreateProductLotDto } from './dto/create-product-lot.dto';
import { CreatePromotionDto } from './dto/create-promotion.dto';

@Injectable()
export class CommercialService {
  constructor(
    private readonly companies: CompaniesService,
    private readonly branches: BranchesService,
  ) {}

  async createPromotion(
    companyId: string,
    userId: string,
    dto: CreatePromotionDto,
  ) {
    await this.companies.assertRole(companyId, userId, ['owner', 'admin']);
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (endsAt <= startsAt)
      throw new BadRequestException('O fim deve ser posterior ao início');
    await this.assertProduct(companyId, dto.productId);
    const [overlap] = await db
      .select({ id: promotions.id })
      .from(promotions)
      .where(
        and(
          eq(promotions.companyId, companyId),
          eq(promotions.productId, dto.productId),
          eq(promotions.isActive, true),
          lt(promotions.startsAt, endsAt),
          gt(promotions.endsAt, startsAt),
        ),
      );
    if (overlap)
      throw new ConflictException('Já existe uma promoção ativa neste período');
    const [promotion] = await db
      .insert(promotions)
      .values({
        companyId,
        productId: dto.productId,
        name: dto.name.trim(),
        promotionalPrice: dto.promotionalPrice.toFixed(2),
        startsAt,
        endsAt,
      })
      .returning();
    return promotion;
  }

  async listPromotions(companyId: string, userId: string) {
    await this.companies.assertRole(companyId, userId);
    return db
      .select({
        id: promotions.id,
        productId: promotions.productId,
        productName: products.name,
        name: promotions.name,
        promotionalPrice: promotions.promotionalPrice,
        startsAt: promotions.startsAt,
        endsAt: promotions.endsAt,
        isActive: promotions.isActive,
      })
      .from(promotions)
      .innerJoin(products, eq(products.id, promotions.productId))
      .where(eq(promotions.companyId, companyId))
      .orderBy(asc(promotions.startsAt));
  }

  async deactivatePromotion(
    companyId: string,
    userId: string,
    promotionId: string,
  ) {
    await this.companies.assertRole(companyId, userId, ['owner', 'admin']);
    const [promotion] = await db
      .update(promotions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(promotions.id, promotionId),
          eq(promotions.companyId, companyId),
        ),
      )
      .returning();
    if (!promotion) throw new NotFoundException('Promoção não encontrada');
    return promotion;
  }

  async createLot(
    companyId: string,
    userId: string,
    dto: CreateProductLotDto,
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
    await this.assertProduct(companyId, dto.productId);
    const [[stock], [allocation]] = await Promise.all([
      db
        .select({ quantity: branchStocks.quantity })
        .from(branchStocks)
        .where(
          and(
            eq(branchStocks.branchId, branchId),
            eq(branchStocks.productId, dto.productId),
          ),
        ),
      db
        .select({
          quantity: sql<string>`coalesce(sum(${productLots.quantity}), 0)`,
        })
        .from(productLots)
        .where(
          and(
            eq(productLots.branchId, branchId),
            eq(productLots.productId, dto.productId),
          ),
        ),
    ]);
    if (
      Number(allocation?.quantity ?? 0) + dto.quantity >
      Number(stock?.quantity ?? 0)
    ) {
      throw new BadRequestException(
        'A quantidade dos lotes não pode superar o saldo da filial',
      );
    }
    try {
      const [lot] = await db
        .insert(productLots)
        .values({
          companyId,
          branchId,
          productId: dto.productId,
          code: dto.code.trim(),
          expiresAt: dto.expiresAt,
          quantity: dto.quantity.toFixed(3),
        })
        .returning();
      return lot;
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw new ConflictException(
          'Lote já cadastrado para este produto e filial',
        );
      }
      throw error;
    }
  }

  async listLots(
    companyId: string,
    userId: string,
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
    return db
      .select({
        id: productLots.id,
        productId: productLots.productId,
        productName: products.name,
        code: productLots.code,
        expiresAt: productLots.expiresAt,
        quantity: productLots.quantity,
      })
      .from(productLots)
      .innerJoin(products, eq(products.id, productLots.productId))
      .where(
        and(
          eq(productLots.companyId, companyId),
          eq(productLots.branchId, branchId),
        ),
      )
      .orderBy(asc(productLots.expiresAt));
  }

  private async assertProduct(companyId: string, productId: string) {
    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.id, productId),
          eq(products.companyId, companyId),
          eq(products.isActive, true),
        ),
      );
    if (!product) throw new NotFoundException('Produto não encontrado');
  }
}
