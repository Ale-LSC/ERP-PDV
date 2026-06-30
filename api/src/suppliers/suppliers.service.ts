import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { CompaniesService } from '../companies/companies.service';
import { db } from '../database/drizzle';
import { suppliers } from '../database/schema/suppliers.schema';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly companiesService: CompaniesService) {}
  async create(companyId: string, userId: string, dto: CreateSupplierDto) {
    await this.companiesService.assertRole(companyId, userId, [
      'owner',
      'admin',
      'stock',
    ]);
    try {
      const [result] = await db
        .insert(suppliers)
        .values({ companyId, name: dto.name.trim(), ...this.normalize(dto) })
        .returning();
      return result;
    } catch (error) {
      this.conflict(error);
    }
  }
  async findAll(companyId: string, userId: string) {
    await this.companiesService.assertRole(companyId, userId, [
      'owner',
      'admin',
      'stock',
    ]);
    return db
      .select()
      .from(suppliers)
      .where(
        and(eq(suppliers.companyId, companyId), eq(suppliers.isActive, true)),
      )
      .orderBy(asc(suppliers.name))
      .limit(500);
  }
  async update(
    companyId: string,
    supplierId: string,
    userId: string,
    dto: UpdateSupplierDto,
  ) {
    await this.companiesService.assertRole(companyId, userId, [
      'owner',
      'admin',
      'stock',
    ]);
    try {
      const [result] = await db
        .update(suppliers)
        .set({ ...this.normalize(dto), updatedAt: new Date() })
        .where(
          and(eq(suppliers.id, supplierId), eq(suppliers.companyId, companyId)),
        )
        .returning();
      if (!result) throw new NotFoundException('Fornecedor não encontrado');
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.conflict(error);
    }
  }
  private normalize(dto: CreateSupplierDto | UpdateSupplierDto) {
    return {
      ...(dto.document !== undefined
        ? { document: dto.document.replace(/\D/g, '') || null }
        : {}),
      ...(dto.email !== undefined
        ? { email: dto.email.trim().toLowerCase() || null }
        : {}),
      ...(dto.phone !== undefined
        ? { phone: dto.phone.replace(/\D/g, '') || null }
        : {}),
      ...('name' in dto && dto.name !== undefined
        ? { name: dto.name.trim() }
        : {}),
      ...('isActive' in dto && dto.isActive !== undefined
        ? { isActive: dto.isActive }
        : {}),
    };
  }
  private conflict(error: unknown): never {
    if (
      typeof error === 'object' &&
      error &&
      'code' in error &&
      error.code === '23505'
    )
      throw new ConflictException('Já existe um fornecedor com este documento');
    throw error;
  }
}
