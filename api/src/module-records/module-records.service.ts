import { Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { CompaniesService } from '../companies/companies.service';
import { db } from '../database/drizzle';
import {
  companyModules,
  type CompanyModule,
} from '../database/schema/companies.schema';
import { moduleRecords } from '../database/schema/module-records.schema';
import { CreateModuleRecordDto } from './dto/create-module-record.dto';
import { UpdateModuleRecordDto } from './dto/update-module-record.dto';

@Injectable()
export class ModuleRecordsService {
  constructor(private readonly companies: CompaniesService) {}

  parseModule(value: string): CompanyModule {
    if (!companyModules.includes(value as CompanyModule)) {
      throw new NotFoundException('Módulo não encontrado');
    }
    return value as CompanyModule;
  }

  async findAll(companyId: string, userId: string, value: string) {
    const module = this.parseModule(value);
    await this.assertEnabled(companyId, userId, module);
    return db
      .select()
      .from(moduleRecords)
      .where(
        and(
          eq(moduleRecords.companyId, companyId),
          eq(moduleRecords.module, module),
        ),
      )
      .orderBy(desc(moduleRecords.createdAt));
  }

  async create(
    companyId: string,
    userId: string,
    value: string,
    dto: CreateModuleRecordDto,
  ) {
    const module = this.parseModule(value);
    await this.assertEnabled(companyId, userId, module);
    const [record] = await db
      .insert(moduleRecords)
      .values({
        companyId,
        module,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        data: dto.data ?? {},
        createdBy: userId,
      })
      .returning();
    return record;
  }

  async update(
    companyId: string,
    userId: string,
    value: string,
    recordId: string,
    dto: UpdateModuleRecordDto,
  ) {
    const module = this.parseModule(value);
    await this.assertEnabled(companyId, userId, module);
    const [record] = await db
      .update(moduleRecords)
      .set({
        ...(dto.title ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() || null }
          : {}),
        ...(dto.status ? { status: dto.status } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(moduleRecords.id, recordId),
          eq(moduleRecords.companyId, companyId),
          eq(moduleRecords.module, module),
        ),
      )
      .returning();
    if (!record) throw new NotFoundException('Registro não encontrado');
    return record;
  }

  private async assertEnabled(
    companyId: string,
    userId: string,
    module: CompanyModule,
  ) {
    const enabled = await this.companies.hasEnabledModule(
      companyId,
      userId,
      module,
    );
    if (!enabled) throw new NotFoundException('Módulo não encontrado');
  }
}
