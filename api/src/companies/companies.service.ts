import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { db } from '../database/drizzle';
import {
  companies,
  companyUsers,
  companyRoles,
  type CompanyRole,
} from '../database/schema/companies.schema';
import { CreateCompanyDto } from './dto/create-company.dto';
import { users } from '../database/schema/users.schema';
import { AddCompanyMemberDto } from './dto/add-company-member.dto';
import { branches, branchUsers } from '../database/schema/branches.schema';

@Injectable()
export class CompaniesService {
  async create(userId: string, dto: CreateCompanyDto) {
    return db.transaction(async (tx) => {
      const [company] = await tx
        .insert(companies)
        .values({
          name: dto.name.trim(),
          document: dto.document?.replace(/\D/g, '') || null,
          segment: dto.segment,
          size: dto.size,
        })
        .returning();

      await tx.insert(companyUsers).values({
        companyId: company.id,
        userId,
        role: 'owner',
      });

      const [headquarters] = await tx
        .insert(branches)
        .values({
          companyId: company.id,
          name: 'Matriz',
          code: 'MATRIZ',
          isHeadquarters: true,
        })
        .returning({ id: branches.id });
      await tx
        .insert(branchUsers)
        .values({ branchId: headquarters.id, userId });

      return { ...company, role: 'owner' as const };
    });
  }

  findAllForUser(userId: string) {
    return db
      .select({
        id: companies.id,
        name: companies.name,
        document: companies.document,
        segment: companies.segment,
        size: companies.size,
        role: companyUsers.role,
        createdAt: companies.createdAt,
        updatedAt: companies.updatedAt,
      })
      .from(companyUsers)
      .innerJoin(companies, eq(companyUsers.companyId, companies.id))
      .where(eq(companyUsers.userId, userId));
  }

  async addMember(
    companyId: string,
    actingUserId: string,
    dto: AddCompanyMemberDto,
  ) {
    const actingRole = await this.assertRole(companyId, actingUserId, [
      'owner',
      'admin',
    ]);

    if (dto.role === 'owner' && actingRole !== 'owner') {
      throw new ForbiddenException(
        'Somente um proprietário pode adicionar outro proprietário',
      );
    }

    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.email, dto.email.trim().toLowerCase()));

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const [existingMembership] = await db
      .select({ role: companyUsers.role })
      .from(companyUsers)
      .where(
        and(
          eq(companyUsers.companyId, companyId),
          eq(companyUsers.userId, user.id),
        ),
      );

    if (existingMembership?.role === 'owner' && dto.role !== 'owner') {
      throw new ForbiddenException(
        'O papel de um proprietário não pode ser rebaixado',
      );
    }

    if (user.id === actingUserId && dto.role !== actingRole) {
      throw new ForbiddenException('Você não pode alterar o próprio papel');
    }

    const [membership] = await db
      .insert(companyUsers)
      .values({ companyId, userId: user.id, role: dto.role })
      .onConflictDoUpdate({
        target: [companyUsers.companyId, companyUsers.userId],
        set: { role: dto.role },
      })
      .returning({ role: companyUsers.role });

    return { ...user, role: membership.role };
  }

  async findMembers(companyId: string, userId: string) {
    await this.assertRole(companyId, userId, ['owner', 'admin']);

    return db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: companyUsers.role,
        createdAt: companyUsers.createdAt,
      })
      .from(companyUsers)
      .innerJoin(users, eq(companyUsers.userId, users.id))
      .where(eq(companyUsers.companyId, companyId));
  }

  async assertRole(
    companyId: string,
    userId: string,
    allowedRoles: readonly CompanyRole[] = companyRoles,
  ): Promise<CompanyRole> {
    const [membership] = await db
      .select({ role: companyUsers.role })
      .from(companyUsers)
      .where(
        and(
          eq(companyUsers.companyId, companyId),
          eq(companyUsers.userId, userId),
        ),
      );

    if (!membership || !allowedRoles.includes(membership.role)) {
      throw new ForbiddenException('Permissão insuficiente nesta empresa');
    }

    return membership.role;
  }
}
