import { Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { CompaniesService } from '../companies/companies.service';
import { db } from '../database/drizzle';
import { products } from '../database/schema/products.schema';
import { replenishmentRequests } from '../database/schema/replenishment.schema';
import { users } from '../database/schema/users.schema';
import { CreateReplenishmentDto } from './dto/create-replenishment.dto';
import { BranchesService } from '../branches/branches.service';
@Injectable()
export class ReplenishmentService {
  constructor(
    private readonly companies: CompaniesService,
    private readonly branches: BranchesService,
  ) {}
  async create(
    companyId: string,
    userId: string,
    dto: CreateReplenishmentDto,
    requestedBranchId?: string,
  ) {
    await this.companies.assertRole(companyId, userId, [
      'owner',
      'admin',
      'cashier',
    ]);
    const branchId = await this.branches.resolve(
      companyId,
      userId,
      requestedBranchId,
    );
    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.id, dto.productId),
          eq(products.companyId, companyId),
          eq(products.isActive, true),
        ),
      );
    if (!product) throw new NotFoundException('Produto não encontrado');
    const [request] = await db
      .insert(replenishmentRequests)
      .values({
        companyId,
        branchId,
        productId: product.id,
        requestedBy: userId,
        quantity: dto.quantity.toFixed(3),
        note: dto.note?.trim() || null,
      })
      .returning();
    return request;
  }
  async findAll(companyId: string, userId: string, requestedBranchId?: string) {
    await this.companies.assertRole(companyId, userId, [
      'owner',
      'admin',
      'stock',
      'cashier',
    ]);
    const branchId = await this.branches.resolve(
      companyId,
      userId,
      requestedBranchId,
    );
    return db
      .select({
        id: replenishmentRequests.id,
        productId: replenishmentRequests.productId,
        productName: products.name,
        quantity: replenishmentRequests.quantity,
        note: replenishmentRequests.note,
        status: replenishmentRequests.status,
        requestedByName: users.name,
        createdAt: replenishmentRequests.createdAt,
      })
      .from(replenishmentRequests)
      .innerJoin(products, eq(replenishmentRequests.productId, products.id))
      .innerJoin(users, eq(replenishmentRequests.requestedBy, users.id))
      .where(
        and(
          eq(replenishmentRequests.companyId, companyId),
          eq(replenishmentRequests.branchId, branchId),
        ),
      )
      .orderBy(desc(replenishmentRequests.createdAt))
      .limit(100);
  }
  async fulfill(
    companyId: string,
    id: string,
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
    const [result] = await db
      .update(replenishmentRequests)
      .set({ status: 'fulfilled', resolvedBy: userId, resolvedAt: new Date() })
      .where(
        and(
          eq(replenishmentRequests.id, id),
          eq(replenishmentRequests.companyId, companyId),
          eq(replenishmentRequests.branchId, branchId),
          eq(replenishmentRequests.status, 'pending'),
        ),
      )
      .returning();
    if (!result)
      throw new NotFoundException('Solicitação pendente não encontrada');
    return result;
  }
}
