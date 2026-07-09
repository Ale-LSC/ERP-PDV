import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { CompaniesService } from '../companies/companies.service';
import { db } from '../database/drizzle';
import { products } from '../database/schema/products.schema';
import { stockMovements } from '../database/schema/stock.schema';
import { branchStocks } from '../database/schema/stock.schema';
import { BranchesService } from '../branches/branches.service';
import { sql } from 'drizzle-orm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { generateProductSku } from './product-sku';

@Injectable()
export class ProductsService {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly branchesService: BranchesService,
  ) {}

  async create(
    companyId: string,
    userId: string,
    dto: CreateProductDto,
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
    const sku = await this.generateUniqueSku(companyId, dto.name);

    try {
      return db.transaction(async (tx) => {
        const [product] = await tx
          .insert(products)
          .values({
            companyId,
            name: dto.name.trim(),
            sku,
            barcode: dto.barcode?.trim() || null,
            salePrice: dto.salePrice.toFixed(2),
            costPrice: dto.costPrice.toFixed(2),
            minimumStock: dto.minimumStock.toFixed(3),
            stockQuantity: dto.stockQuantity.toFixed(3),
          })
          .returning();

        if (dto.stockQuantity > 0) {
          await tx.insert(branchStocks).values({
            branchId,
            productId: product.id,
            quantity: dto.stockQuantity.toFixed(3),
          });
          await tx.insert(stockMovements).values({
            companyId,
            branchId,
            productId: product.id,
            type: 'adjustment',
            quantity: dto.stockQuantity.toFixed(3),
            previousQuantity: '0.000',
            resultingQuantity: dto.stockQuantity.toFixed(3),
            reason: 'Estoque inicial do produto',
            createdBy: userId,
          });
        }

        return product;
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw new ConflictException('SKU ou código de barras já cadastrado');
      }

      throw error;
    }
  }

  async findAll(companyId: string, userId: string, requestedBranchId?: string) {
    await this.companiesService.assertRole(companyId, userId);

    const branchId = await this.branchesService.resolve(
      companyId,
      userId,
      requestedBranchId,
    );
    return db
      .select({
        id: products.id,
        companyId: products.companyId,
        name: products.name,
        sku: products.sku,
        barcode: products.barcode,
        salePrice: products.salePrice,
        effectivePrice: sql<string>`coalesce((
          select p.promotional_price from promotions p
          where p.company_id = ${companyId}
            and p.product_id = ${products.id}
            and p.is_active = true
            and p.starts_at <= now() and p.ends_at > now()
          limit 1
        ), ${products.salePrice})`,
        costPrice: products.costPrice,
        stockQuantity: sql<string>`coalesce(${branchStocks.quantity}, 0)`,
        minimumStock: products.minimumStock,
        isActive: products.isActive,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .leftJoin(
        branchStocks,
        and(
          eq(branchStocks.productId, products.id),
          eq(branchStocks.branchId, branchId),
        ),
      )
      .where(
        and(eq(products.companyId, companyId), eq(products.isActive, true)),
      )
      .orderBy(asc(products.name))
      .limit(500);
  }

  async update(
    companyId: string,
    productId: string,
    userId: string,
    dto: UpdateProductDto,
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

    try {
      return db.transaction(async (tx) => {
        const [existingProduct] = await tx
          .select()
          .from(products)
          .where(
            and(eq(products.id, productId), eq(products.companyId, companyId)),
          )
          .for('update');

        if (!existingProduct) {
          throw new NotFoundException('Produto não encontrado');
        }

        const changes: Partial<typeof products.$inferInsert> = {
          updatedAt: new Date(),
        };

        if (dto.name !== undefined) changes.name = dto.name.trim();
        if (dto.barcode !== undefined) {
          changes.barcode = dto.barcode.trim() || null;
        }
        if (dto.salePrice !== undefined) {
          changes.salePrice = dto.salePrice.toFixed(2);
        }
        if (dto.costPrice !== undefined) {
          changes.costPrice = dto.costPrice.toFixed(2);
        }
        if (dto.minimumStock !== undefined) {
          changes.minimumStock = dto.minimumStock.toFixed(3);
        }
        if (dto.isActive !== undefined) changes.isActive = dto.isActive;

        const [product] = await tx
          .update(products)
          .set(changes)
          .where(eq(products.id, productId))
          .returning();

        const [branchStock] = await tx
          .select()
          .from(branchStocks)
          .where(
            and(
              eq(branchStocks.branchId, branchId),
              eq(branchStocks.productId, productId),
            ),
          )
          .for('update');
        const previousStock = Number(branchStock?.quantity ?? 0);
        if (
          dto.stockQuantity !== undefined &&
          dto.stockQuantity !== previousStock
        ) {
          await tx
            .insert(branchStocks)
            .values({
              branchId,
              productId,
              quantity: dto.stockQuantity.toFixed(3),
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [branchStocks.branchId, branchStocks.productId],
              set: {
                quantity: dto.stockQuantity.toFixed(3),
                updatedAt: new Date(),
              },
            });
          await tx.insert(stockMovements).values({
            companyId,
            branchId,
            productId,
            type: 'adjustment',
            quantity: dto.stockQuantity.toFixed(3),
            previousQuantity: previousStock.toFixed(3),
            resultingQuantity: dto.stockQuantity.toFixed(3),
            reason: 'Ajuste realizado na edição do produto',
            createdBy: userId,
          });
        }

        return product;
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw new ConflictException('Código de barras já cadastrado');
      }

      throw error;
    }
  }

  private async generateUniqueSku(
    companyId: string,
    productName: string,
  ): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const sku = generateProductSku(productName);
      const [existingProduct] = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.companyId, companyId), eq(products.sku, sku)));

      if (!existingProduct) return sku;
    }

    throw new ConflictException('Não foi possível gerar um SKU único');
  }
}
