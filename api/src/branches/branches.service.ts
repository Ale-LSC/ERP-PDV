import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, or } from 'drizzle-orm';
import { CompaniesService } from '../companies/companies.service';
import { db } from '../database/drizzle';
import { branches, branchUsers } from '../database/schema/branches.schema';
import { companyUsers } from '../database/schema/companies.schema';
import { CreateBranchDto } from './dto/create-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly companiesService: CompaniesService) {}

  async create(companyId: string, userId: string, dto: CreateBranchDto) {
    await this.companiesService.assertRole(companyId, userId, [
      'owner',
      'admin',
    ]);
    try {
      const [branch] = await db
        .insert(branches)
        .values({
          companyId,
          name: dto.name.trim(),
          code: dto.code.trim().toUpperCase(),
          address: dto.address?.trim() || null,
        })
        .returning();
      return branch;
    } catch (error) {
      if (
        typeof error === 'object' &&
        error &&
        'code' in error &&
        error.code === '23505'
      )
        throw new ConflictException('Já existe uma filial com este código');
      throw error;
    }
  }

  async findAll(companyId: string, userId: string) {
    const role = await this.companiesService.assertRole(companyId, userId);
    return db
      .select({
        id: branches.id,
        name: branches.name,
        code: branches.code,
        address: branches.address,
        isHeadquarters: branches.isHeadquarters,
      })
      .from(branches)
      .leftJoin(
        branchUsers,
        and(
          eq(branchUsers.branchId, branches.id),
          eq(branchUsers.userId, userId),
        ),
      )
      .where(
        and(
          eq(branches.companyId, companyId),
          eq(branches.isActive, true),
          role === 'owner' || role === 'admin'
            ? undefined
            : or(
                eq(branchUsers.userId, userId),
                eq(branches.isHeadquarters, true),
              ),
        ),
      )
      .orderBy(asc(branches.name));
  }

  async assignUser(
    companyId: string,
    branchId: string,
    actingUserId: string,
    targetUserId: string,
  ) {
    await this.companiesService.assertRole(companyId, actingUserId, [
      'owner',
      'admin',
    ]);
    const [[branch], [membership]] = await Promise.all([
      db
        .select({ id: branches.id })
        .from(branches)
        .where(
          and(eq(branches.id, branchId), eq(branches.companyId, companyId)),
        ),
      db
        .select({ userId: companyUsers.userId })
        .from(companyUsers)
        .where(
          and(
            eq(companyUsers.companyId, companyId),
            eq(companyUsers.userId, targetUserId),
          ),
        ),
    ]);
    if (!branch) throw new NotFoundException('Filial não encontrada');
    if (!membership)
      throw new ForbiddenException('Usuário não pertence à empresa');
    await db
      .insert(branchUsers)
      .values({ branchId, userId: targetUserId })
      .onConflictDoNothing();
    return { branchId, userId: targetUserId };
  }

  async resolve(companyId: string, userId: string, requestedId?: string) {
    const role = await this.companiesService.assertRole(companyId, userId);
    const conditions = [
      eq(branches.companyId, companyId),
      eq(branches.isActive, true),
    ];
    if (requestedId) conditions.push(eq(branches.id, requestedId));
    const query = db
      .select({ id: branches.id })
      .from(branches)
      .leftJoin(
        branchUsers,
        and(
          eq(branchUsers.branchId, branches.id),
          eq(branchUsers.userId, userId),
        ),
      )
      .where(
        and(
          ...conditions,
          role === 'owner' || role === 'admin'
            ? undefined
            : or(
                eq(branchUsers.userId, userId),
                eq(branches.isHeadquarters, true),
              ),
        ),
      )
      .orderBy(desc(branches.isHeadquarters))
      .limit(1);
    const [branch] = await query;
    if (!branch)
      throw new ForbiddenException('Filial não disponível para este usuário');
    return branch.id;
  }
}
