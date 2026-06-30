import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { CompaniesService } from '../companies/companies.service';
import { db } from '../database/drizzle';
import { customers } from '../database/schema/customers.schema';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly companiesService: CompaniesService) {}

  async create(companyId: string, userId: string, dto: CreateCustomerDto) {
    await this.companiesService.assertRole(companyId, userId);
    try {
      const [customer] = await db
        .insert(customers)
        .values({
          companyId,
          ...this.normalize(dto),
          name: dto.name.trim(),
        })
        .returning();
      return customer;
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async findAll(companyId: string, userId: string) {
    await this.companiesService.assertRole(companyId, userId);
    return db
      .select()
      .from(customers)
      .where(
        and(eq(customers.companyId, companyId), eq(customers.isActive, true)),
      )
      .orderBy(asc(customers.name))
      .limit(500);
  }

  async update(
    companyId: string,
    customerId: string,
    userId: string,
    dto: UpdateCustomerDto,
  ) {
    await this.companiesService.assertRole(companyId, userId);
    try {
      const [customer] = await db
        .update(customers)
        .set({ ...this.normalize(dto), updatedAt: new Date() })
        .where(
          and(eq(customers.id, customerId), eq(customers.companyId, companyId)),
        )
        .returning();
      if (!customer) throw new NotFoundException('Cliente não encontrado');
      return customer;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.rethrowConflict(error);
    }
  }

  private normalize(dto: CreateCustomerDto | UpdateCustomerDto) {
    return {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.document !== undefined
        ? { document: dto.document.replace(/\D/g, '') || null }
        : {}),
      ...(dto.email !== undefined
        ? { email: dto.email.trim().toLowerCase() || null }
        : {}),
      ...(dto.phone !== undefined
        ? { phone: dto.phone.replace(/\D/g, '') || null }
        : {}),
      ...('isActive' in dto && dto.isActive !== undefined
        ? { isActive: dto.isActive }
        : {}),
    };
  }

  private rethrowConflict(error: unknown): never {
    if (
      typeof error === 'object' &&
      error &&
      'code' in error &&
      error.code === '23505'
    ) {
      throw new ConflictException('Já existe um cliente com este documento');
    }
    throw error;
  }
}
