import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { CompaniesService } from '../companies/companies.service';
import { db } from '../database/drizzle';
import { financialEntries } from '../database/schema/finance.schema';
import { CreateFinancialEntryDto } from './dto/create-financial-entry.dto';
import { ListFinancialEntriesDto } from './dto/list-financial-entries.dto';

@Injectable()
export class FinanceService {
  constructor(private readonly companiesService: CompaniesService) {}

  async create(
    companyId: string,
    userId: string,
    dto: CreateFinancialEntryDto,
  ) {
    await this.companiesService.assertRole(companyId, userId, [
      'owner',
      'admin',
    ]);
    const [entry] = await db
      .insert(financialEntries)
      .values({
        companyId,
        createdBy: userId,
        type: dto.type,
        description: dto.description.trim(),
        category: dto.category?.trim() || null,
        amount: dto.amount.toFixed(2),
        dueDate: dto.dueDate,
      })
      .returning();
    return entry;
  }

  async findAll(
    companyId: string,
    userId: string,
    filters: ListFinancialEntriesDto,
  ) {
    await this.companiesService.assertRole(companyId, userId, [
      'owner',
      'admin',
    ]);
    const conditions = [eq(financialEntries.companyId, companyId)];
    if (filters.type) conditions.push(eq(financialEntries.type, filters.type));
    if (filters.status)
      conditions.push(eq(financialEntries.status, filters.status));
    return db
      .select()
      .from(financialEntries)
      .where(and(...conditions))
      .orderBy(asc(financialEntries.dueDate));
  }

  async settle(companyId: string, entryId: string, userId: string) {
    await this.companiesService.assertRole(companyId, userId, [
      'owner',
      'admin',
    ]);
    return db.transaction(async (tx) => {
      const [entry] = await tx
        .select()
        .from(financialEntries)
        .where(
          and(
            eq(financialEntries.id, entryId),
            eq(financialEntries.companyId, companyId),
          ),
        )
        .for('update');
      if (!entry)
        throw new NotFoundException('Lançamento financeiro não encontrado');
      if (entry.status === 'paid')
        throw new ConflictException('Este lançamento já foi baixado');
      const [settled] = await tx
        .update(financialEntries)
        .set({
          status: 'paid',
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(financialEntries.id, entry.id))
        .returning();
      return settled;
    });
  }

  async summary(companyId: string, userId: string) {
    await this.companiesService.assertRole(companyId, userId, [
      'owner',
      'admin',
    ]);
    const rows = await db
      .select({
        type: financialEntries.type,
        status: financialEntries.status,
        total: sql<string>`coalesce(sum(${financialEntries.amount}), 0)`,
        count: sql<number>`count(*)::int`,
      })
      .from(financialEntries)
      .where(eq(financialEntries.companyId, companyId))
      .groupBy(financialEntries.type, financialEntries.status);
    const result = {
      payable: { pending: '0', paid: '0', count: 0 },
      receivable: { pending: '0', paid: '0', count: 0 },
    };
    for (const row of rows) {
      result[row.type][row.status] = row.total;
      result[row.type].count += row.count;
    }
    return result;
  }
}
