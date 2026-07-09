import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';

import { db } from '../database/drizzle';
import { users } from '../database/schema/users.schema';
import {
  companies,
  companyEnabledModules,
  companyRoles,
  companyUsers,
  type CompanyModule,
  type CompanyRole,
} from '../database/schema/companies.schema';
import { branches, branchUsers } from '../database/schema/branches.schema';

import { CreateCompanyDto } from './dto/create-company.dto';
import { AddCompanyMemberDto } from './dto/add-company-member.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { OnboardCompanyDto } from './dto/onboard-company.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import {
  defaultModulesForSegment,
  missingModuleDependencies,
} from './company-modules';

@Injectable()
export class CompaniesService {
  async onboard(dto: OnboardCompanyDto) {
    const email = dto.adminEmail.trim().toLowerCase();

    try {
      return await db.transaction(async (tx) => {
        const [user] = await tx
          .insert(users)
          .values({
            name: dto.adminName.trim(),
            email,
            passwordHash: await bcrypt.hash(dto.password, 10),
          })
          .returning({
            id: users.id,
            name: users.name,
            email: users.email,
          });

        const [company] = await tx
          .insert(companies)
          .values({
            name: dto.companyName.trim(),
            document: dto.document?.replace(/\D/g, '') || null,
            segment: dto.segment,
            size: dto.size,
          })
          .returning();

        await tx.insert(companyUsers).values({
          companyId: company.id,
          userId: user.id,
          role: 'owner',
        });

        const modules = defaultModulesForSegment(company.segment);
        await tx.insert(companyEnabledModules).values(
          modules.map((module) => ({
            companyId: company.id,
            module,
          })),
        );

        const [headquarters] = await tx
          .insert(branches)
          .values({
            companyId: company.id,
            name: 'Matriz',
            code: 'MATRIZ',
            isHeadquarters: true,
          })
          .returning();

        await tx.insert(branchUsers).values({
          branchId: headquarters.id,
          userId: user.id,
        });

        return {
          user,
          company: { ...company, role: 'owner' as const, modules },
          branch: headquarters,
        };
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw new ConflictException('E-mail ou documento já cadastrado');
      }

      throw error;
    }
  }

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

      const modules = defaultModulesForSegment(company.segment);
      await tx.insert(companyEnabledModules).values(
        modules.map((module) => ({
          companyId: company.id,
          module,
        })),
      );

      const [headquarters] = await tx
        .insert(branches)
        .values({
          companyId: company.id,
          name: 'Matriz',
          code: 'MATRIZ',
          isHeadquarters: true,
        })
        .returning({ id: branches.id });

      await tx.insert(branchUsers).values({
        branchId: headquarters.id,
        userId,
      });

      return { ...company, role: 'owner' as const, modules };
    });
  }

  async findAllForUser(userId: string) {
    const rows = await db
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
      .where(
        and(eq(companyUsers.userId, userId), eq(companyUsers.isActive, true)),
      );

    const enabledModules = rows.length
      ? await db
          .select({
            companyId: companyEnabledModules.companyId,
            module: companyEnabledModules.module,
          })
          .from(companyEnabledModules)
          .where(
            and(
              inArray(
                companyEnabledModules.companyId,
                rows.map((row) => row.id),
              ),
              eq(companyEnabledModules.isEnabled, true),
            ),
          )
      : [];

    const modulesByCompany = new Map<string, CompanyModule[]>();
    for (const item of enabledModules) {
      const modules = modulesByCompany.get(item.companyId) ?? [];
      modules.push(item.module);
      modulesByCompany.set(item.companyId, modules);
    }

    return rows.map((row) => ({
      ...row,
      modules:
        modulesByCompany.get(row.id) ?? defaultModulesForSegment(row.segment),
    }));
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
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: companyUsers.role,
        isActive: companyUsers.isActive,
        branchId: branches.id,
        branchName: branches.name,
        createdAt: companyUsers.createdAt,
      })
      .from(companyUsers)
      .innerJoin(users, eq(companyUsers.userId, users.id))
      .leftJoin(branchUsers, eq(branchUsers.userId, users.id))
      .leftJoin(
        branches,
        and(
          eq(branchUsers.branchId, branches.id),
          eq(branches.companyId, companyId),
        ),
      )
      .where(eq(companyUsers.companyId, companyId));
    const grouped = new Map<
      string,
      Omit<(typeof rows)[number], 'branchId' | 'branchName'> & {
        branches: Array<{ id: string; name: string }>;
      }
    >();
    for (const row of rows) {
      const current = grouped.get(row.id) ?? {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        isActive: row.isActive,
        createdAt: row.createdAt,
        branches: [],
      };
      if (
        row.branchId &&
        row.branchName &&
        !current.branches.some((branch) => branch.id === row.branchId)
      )
        current.branches.push({ id: row.branchId, name: row.branchName });
      grouped.set(row.id, current);
    }
    return [...grouped.values()];
  }

  async findEmployees(companyId: string, userId: string) {
    return this.findMembers(companyId, userId);
  }

  async createEmployee(
    companyId: string,
    actingUserId: string,
    dto: CreateEmployeeDto,
  ) {
    const actingRole = await this.assertRole(companyId, actingUserId, [
      'owner',
      'admin',
    ]);

    if (dto.role === 'owner' && actingRole !== 'owner') {
      throw new ForbiddenException(
        'Somente o dono pode criar outro proprietário',
      );
    }

    const email = dto.email.trim().toLowerCase();

    return db.transaction(async (tx) => {
      let [user] = await tx
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.email, email));

      if (!user) {
        const [created] = await tx
          .insert(users)
          .values({
            name: dto.name.trim(),
            email,
            passwordHash: await bcrypt.hash(dto.password, 10),
          })
          .returning({
            id: users.id,
            name: users.name,
            email: users.email,
          });

        user = created;
      } else {
        const [membership] = await tx
          .select()
          .from(companyUsers)
          .where(
            and(
              eq(companyUsers.companyId, companyId),
              eq(companyUsers.userId, user.id),
            ),
          );

        if (membership) {
          throw new ConflictException('Este usuário já faz parte da empresa');
        }
      }

      await tx.insert(companyUsers).values({
        companyId,
        userId: user.id,
        role: dto.role,
      });

      const branchId =
        dto.branchId ??
        (
          await tx
            .select({ id: branches.id })
            .from(branches)
            .where(
              and(
                eq(branches.companyId, companyId),
                eq(branches.isHeadquarters, true),
              ),
            )
        )[0]?.id;

      if (branchId) {
        const [branch] = await tx
          .select({ id: branches.id })
          .from(branches)
          .where(
            and(eq(branches.id, branchId), eq(branches.companyId, companyId)),
          );

        if (!branch) {
          throw new NotFoundException('Filial não encontrada');
        }

        await tx
          .insert(branchUsers)
          .values({ branchId, userId: user.id })
          .onConflictDoNothing();
      }

      return { ...user, role: dto.role, branchId };
    });
  }

  async updateEmployee(
    companyId: string,
    employeeId: string,
    actingUserId: string,
    dto: UpdateEmployeeDto,
  ) {
    const actingRole = await this.assertRole(companyId, actingUserId, [
      'owner',
      'admin',
    ]);
    const [membership] = await db
      .select()
      .from(companyUsers)
      .where(
        and(
          eq(companyUsers.companyId, companyId),
          eq(companyUsers.userId, employeeId),
        ),
      );
    if (!membership) throw new NotFoundException('Funcionário não encontrado');
    if (membership.role === 'owner' && actingRole !== 'owner')
      throw new ForbiddenException(
        'Somente o dono pode alterar outro proprietário',
      );
    if (
      employeeId === actingUserId &&
      (dto.isActive === false || (dto.role && dto.role !== actingRole))
    )
      throw new ForbiddenException(
        'Você não pode remover ou alterar o próprio acesso',
      );
    if (dto.role === 'owner' && actingRole !== 'owner')
      throw new ForbiddenException('Somente o dono pode atribuir esse perfil');
    return db.transaction(async (tx) => {
      if (dto.name)
        await tx
          .update(users)
          .set({ name: dto.name.trim(), updatedAt: new Date() })
          .where(eq(users.id, employeeId));
      if (dto.role !== undefined || dto.isActive !== undefined)
        await tx
          .update(companyUsers)
          .set({
            ...(dto.role !== undefined ? { role: dto.role } : {}),
            ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          })
          .where(
            and(
              eq(companyUsers.companyId, companyId),
              eq(companyUsers.userId, employeeId),
            ),
          );
      if (dto.branchId) {
        const [branch] = await tx
          .select({ id: branches.id })
          .from(branches)
          .where(
            and(
              eq(branches.id, dto.branchId),
              eq(branches.companyId, companyId),
              eq(branches.isActive, true),
            ),
          );
        if (!branch) throw new NotFoundException('Filial não encontrada');
        const companyBranchIds = tx
          .select({ id: branches.id })
          .from(branches)
          .where(eq(branches.companyId, companyId));
        await tx
          .delete(branchUsers)
          .where(
            and(
              eq(branchUsers.userId, employeeId),
              inArray(branchUsers.branchId, companyBranchIds),
            ),
          );
        await tx
          .insert(branchUsers)
          .values({ branchId: branch.id, userId: employeeId });
      }
      return {
        id: employeeId,
        role: dto.role ?? membership.role,
        isActive: dto.isActive ?? membership.isActive,
        branchId: dto.branchId,
      };
    });
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
          eq(companyUsers.isActive, true),
        ),
      );

    if (!membership || !allowedRoles.includes(membership.role)) {
      throw new ForbiddenException('Permissão insuficiente nesta empresa');
    }

    return membership.role;
  }

  async hasEnabledModule(
    companyId: string,
    userId: string,
    module: CompanyModule,
  ) {
    await this.assertRole(companyId, userId);
    const [enabledModule] = await db
      .select({ module: companyEnabledModules.module })
      .from(companyEnabledModules)
      .where(
        and(
          eq(companyEnabledModules.companyId, companyId),
          eq(companyEnabledModules.module, module),
          eq(companyEnabledModules.isEnabled, true),
        ),
      );
    return Boolean(enabledModule);
  }

  async getModules(companyId: string, userId: string) {
    await this.assertRole(companyId, userId);
    return db
      .select({
        module: companyEnabledModules.module,
        isEnabled: companyEnabledModules.isEnabled,
        config: companyEnabledModules.config,
      })
      .from(companyEnabledModules)
      .where(eq(companyEnabledModules.companyId, companyId));
  }

  async updateModules(
    companyId: string,
    userId: string,
    modules: CompanyModule[],
  ) {
    await this.assertRole(companyId, userId, ['owner', 'admin']);
    const missingDependencies = missingModuleDependencies(modules);
    if (missingDependencies.length) {
      const missing = missingDependencies
        .map(({ module, dependency }) => `${module} requer ${dependency}`)
        .join(', ');
      throw new BadRequestException(
        `Dependências de módulos inválidas: ${missing}`,
      );
    }
    await db.transaction(async (tx) => {
      await tx
        .delete(companyEnabledModules)
        .where(eq(companyEnabledModules.companyId, companyId));
      if (modules.length) {
        await tx
          .insert(companyEnabledModules)
          .values(modules.map((module) => ({ companyId, module })));
      }
    });
    return this.getModules(companyId, userId);
  }
}
