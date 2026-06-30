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
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { generateProductSku } from './product-sku';

@Injectable()
export class ProductsService {
  constructor(private readonly companiesService: CompaniesService) {}

  async create(companyId: string, userId: string, dto: CreateProductDto) {
    await this.companiesService.assertRole(companyId, userId, [
      'owner',
      'admin',
      'stock',
    ]);
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
          await tx.insert(stockMovements).values({
            companyId,
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

  async findAll(companyId: string, userId: string) {
    await this.companiesService.assertRole(companyId, userId);

    return db
      .select()
      .from(products)
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
  ) {
    await this.companiesService.assertRole(companyId, userId, [
      'owner',
      'admin',
      'stock',
    ]);

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
        if (dto.stockQuantity !== undefined) {
          changes.stockQuantity = dto.stockQuantity.toFixed(3);
        }
        if (dto.isActive !== undefined) changes.isActive = dto.isActive;

        const [product] = await tx
          .update(products)
          .set(changes)
          .where(eq(products.id, productId))
          .returning();

        const previousStock = Number(existingProduct.stockQuantity);
        if (
          dto.stockQuantity !== undefined &&
          dto.stockQuantity !== previousStock
        ) {
          await tx.insert(stockMovements).values({
            companyId,
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
