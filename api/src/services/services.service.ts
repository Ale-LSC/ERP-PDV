import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, gt, lt, ne } from 'drizzle-orm';
import { CompaniesService } from '../companies/companies.service';
import { db } from '../database/drizzle';
import { customers } from '../database/schema/customers.schema';
import { financialEntries } from '../database/schema/finance.schema';
import {
  appointments,
  serviceContracts,
  serviceOrders,
} from '../database/schema/services.schema';
import {
  CreateAppointmentDto,
  CreateContractDto,
  CreateServiceOrderDto,
} from './dto/create-service.dto';
import { validatePeriod } from './service-period';
import { nextBillingDate } from './contract-billing';

@Injectable()
export class ServicesService {
  constructor(private readonly companies: CompaniesService) {}

  async createOrder(
    companyId: string,
    userId: string,
    dto: CreateServiceOrderDto,
  ) {
    await this.companies.assertRole(companyId, userId);
    await this.assertCustomer(companyId, dto.customerId);
    const [order] = await db
      .insert(serviceOrders)
      .values({
        companyId,
        customerId: dto.customerId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        amount: dto.amount.toFixed(2),
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        createdBy: userId,
      })
      .returning();
    return order;
  }
  async listOrders(companyId: string, userId: string) {
    await this.companies.assertRole(companyId, userId);
    return db
      .select({
        id: serviceOrders.id,
        customerId: serviceOrders.customerId,
        customerName: customers.name,
        title: serviceOrders.title,
        description: serviceOrders.description,
        status: serviceOrders.status,
        amount: serviceOrders.amount,
        scheduledAt: serviceOrders.scheduledAt,
        createdAt: serviceOrders.createdAt,
      })
      .from(serviceOrders)
      .innerJoin(customers, eq(customers.id, serviceOrders.customerId))
      .where(eq(serviceOrders.companyId, companyId))
      .orderBy(desc(serviceOrders.createdAt));
  }
  async updateOrderStatus(
    companyId: string,
    userId: string,
    id: string,
    status: string,
  ) {
    await this.companies.assertRole(companyId, userId);
    if (!['open', 'in_progress', 'completed', 'cancelled'].includes(status))
      throw new BadRequestException('Status inválido');
    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(serviceOrders)
        .where(
          and(eq(serviceOrders.id, id), eq(serviceOrders.companyId, companyId)),
        )
        .for('update');
      if (!existing)
        throw new NotFoundException('Ordem de serviço não encontrada');
      if (existing.status === 'completed' || existing.status === 'cancelled')
        throw new ConflictException('Ordem já encerrada');
      const nextStatus = status as
        | 'open'
        | 'in_progress'
        | 'completed'
        | 'cancelled';
      const [order] = await tx
        .update(serviceOrders)
        .set({
          status: nextStatus,
          completedAt: nextStatus === 'completed' ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(serviceOrders.id, id))
        .returning();
      if (nextStatus === 'completed' && Number(existing.amount) > 0) {
        await tx.insert(financialEntries).values({
          companyId,
          type: 'receivable',
          description: `Ordem de serviço: ${existing.title}`,
          category: 'Serviços',
          amount: existing.amount,
          dueDate: new Date().toISOString().slice(0, 10),
          createdBy: userId,
        });
      }
      return order;
    });
  }

  async createAppointment(
    companyId: string,
    userId: string,
    dto: CreateAppointmentDto,
  ) {
    await this.companies.assertRole(companyId, userId);
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    try {
      validatePeriod(startsAt, endsAt);
    } catch {
      throw new BadRequestException('O término deve ser posterior ao início');
    }
    if (dto.customerId) await this.assertCustomer(companyId, dto.customerId);
    const [overlap] = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.companyId, companyId),
          ne(appointments.status, 'cancelled'),
          lt(appointments.startsAt, endsAt),
          gt(appointments.endsAt, startsAt),
        ),
      );
    if (overlap)
      throw new ConflictException('Já existe um agendamento neste horário');
    const [appointment] = await db
      .insert(appointments)
      .values({
        companyId,
        customerId: dto.customerId ?? null,
        title: dto.title.trim(),
        startsAt,
        endsAt,
        notes: dto.notes?.trim() || null,
        createdBy: userId,
      })
      .returning();
    return appointment;
  }
  async listAppointments(companyId: string, userId: string) {
    await this.companies.assertRole(companyId, userId);
    return db
      .select({
        id: appointments.id,
        customerName: customers.name,
        title: appointments.title,
        startsAt: appointments.startsAt,
        endsAt: appointments.endsAt,
        status: appointments.status,
        notes: appointments.notes,
      })
      .from(appointments)
      .leftJoin(customers, eq(customers.id, appointments.customerId))
      .where(eq(appointments.companyId, companyId))
      .orderBy(asc(appointments.startsAt));
  }
  async updateAppointmentStatus(
    companyId: string,
    userId: string,
    id: string,
    status: string,
  ) {
    await this.companies.assertRole(companyId, userId);
    if (!['scheduled', 'confirmed', 'completed', 'cancelled'].includes(status))
      throw new BadRequestException('Status inválido');
    const [item] = await db
      .update(appointments)
      .set({
        status: status as 'scheduled' | 'confirmed' | 'completed' | 'cancelled',
        updatedAt: new Date(),
      })
      .where(
        and(eq(appointments.id, id), eq(appointments.companyId, companyId)),
      )
      .returning();
    if (!item) throw new NotFoundException('Agendamento não encontrado');
    return item;
  }

  async createContract(
    companyId: string,
    userId: string,
    dto: CreateContractDto,
  ) {
    await this.companies.assertRole(companyId, userId, [
      'owner',
      'admin',
      'finance',
    ]);
    await this.assertCustomer(companyId, dto.customerId);
    if (dto.endsOn && dto.endsOn < dto.startsOn)
      throw new BadRequestException(
        'O fim do contrato deve ser posterior ao início',
      );
    const [contract] = await db
      .insert(serviceContracts)
      .values({
        companyId,
        customerId: dto.customerId,
        title: dto.title.trim(),
        amount: dto.amount.toFixed(2),
        billingCycle: dto.billingCycle,
        startsOn: dto.startsOn,
        nextBillingOn: dto.startsOn,
        endsOn: dto.endsOn ?? null,
        notes: dto.notes?.trim() || null,
        createdBy: userId,
      })
      .returning();
    return contract;
  }
  async listContracts(companyId: string, userId: string) {
    await this.companies.assertRole(companyId, userId);
    return db
      .select({
        id: serviceContracts.id,
        customerName: customers.name,
        title: serviceContracts.title,
        amount: serviceContracts.amount,
        billingCycle: serviceContracts.billingCycle,
        startsOn: serviceContracts.startsOn,
        nextBillingOn: serviceContracts.nextBillingOn,
        endsOn: serviceContracts.endsOn,
        status: serviceContracts.status,
      })
      .from(serviceContracts)
      .innerJoin(customers, eq(customers.id, serviceContracts.customerId))
      .where(eq(serviceContracts.companyId, companyId))
      .orderBy(desc(serviceContracts.createdAt));
  }
  async updateContractStatus(
    companyId: string,
    userId: string,
    id: string,
    status: string,
  ) {
    await this.companies.assertRole(companyId, userId, [
      'owner',
      'admin',
      'finance',
    ]);
    if (!['draft', 'active', 'suspended', 'ended'].includes(status))
      throw new BadRequestException('Status inválido');
    const [item] = await db
      .update(serviceContracts)
      .set({
        status: status as 'draft' | 'active' | 'suspended' | 'ended',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(serviceContracts.id, id),
          eq(serviceContracts.companyId, companyId),
        ),
      )
      .returning();
    if (!item) throw new NotFoundException('Contrato não encontrado');
    return item;
  }

  async generateContractBilling(
    companyId: string,
    userId: string,
    through: string,
  ) {
    await this.companies.assertRole(companyId, userId, [
      'owner',
      'admin',
      'finance',
    ]);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(through))
      throw new BadRequestException('Data de cobrança inválida');
    return db.transaction(async (tx) => {
      const contracts = await tx
        .select()
        .from(serviceContracts)
        .where(
          and(
            eq(serviceContracts.companyId, companyId),
            eq(serviceContracts.status, 'active'),
          ),
        )
        .for('update');
      let generated = 0;
      for (const contract of contracts) {
        let dueDate = contract.nextBillingOn;
        let contractEntries = 0;
        while (
          dueDate <= through &&
          (!contract.endsOn || dueDate <= contract.endsOn) &&
          contractEntries < 120
        ) {
          await tx.insert(financialEntries).values({
            companyId,
            type: 'receivable',
            description: `Contrato: ${contract.title}`,
            category: 'Contratos',
            amount: contract.amount,
            dueDate,
            createdBy: userId,
          });
          dueDate = nextBillingDate(dueDate, contract.billingCycle);
          generated += 1;
          contractEntries += 1;
        }
        if (dueDate !== contract.nextBillingOn) {
          await tx
            .update(serviceContracts)
            .set({ nextBillingOn: dueDate, updatedAt: new Date() })
            .where(eq(serviceContracts.id, contract.id));
        }
      }
      return { generated };
    });
  }
  private async assertCustomer(companyId: string, customerId: string) {
    const [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.companyId, companyId),
          eq(customers.isActive, true),
        ),
      );
    if (!customer) throw new NotFoundException('Cliente não encontrado');
  }
}
