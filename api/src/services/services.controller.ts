import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyModuleGuard } from '../companies/company-module.guard';
import { RequireCompanyModule } from '../companies/require-company-module.decorator';
import {
  CreateAppointmentDto,
  CreateContractDto,
  CreateServiceOrderDto,
  UpdateServiceStatusDto,
} from './dto/create-service.dto';
import { ServicesService } from './services.service';

@UseGuards(JwtAuthGuard, CompanyModuleGuard)
@Controller('companies/:companyId')
export class ServicesController {
  constructor(private readonly service: ServicesService) {}
  @Post('service-orders') @RequireCompanyModule('service_orders') createOrder(
    @Param('companyId', ParseUUIDPipe) c: string,
    @Req() r: AuthenticatedRequest,
    @Body() d: CreateServiceOrderDto,
  ) {
    return this.service.createOrder(c, r.user.sub, d);
  }
  @Get('service-orders') @RequireCompanyModule('service_orders') listOrders(
    @Param('companyId', ParseUUIDPipe) c: string,
    @Req() r: AuthenticatedRequest,
  ) {
    return this.service.listOrders(c, r.user.sub);
  }
  @Patch('service-orders/:id/status')
  @RequireCompanyModule('service_orders')
  orderStatus(
    @Param('companyId', ParseUUIDPipe) c: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() r: AuthenticatedRequest,
    @Body() d: UpdateServiceStatusDto,
  ) {
    return this.service.updateOrderStatus(c, r.user.sub, id, d.status);
  }
  @Post('appointments') @RequireCompanyModule('appointments') createAppointment(
    @Param('companyId', ParseUUIDPipe) c: string,
    @Req() r: AuthenticatedRequest,
    @Body() d: CreateAppointmentDto,
  ) {
    return this.service.createAppointment(c, r.user.sub, d);
  }
  @Get('appointments') @RequireCompanyModule('appointments') listAppointments(
    @Param('companyId', ParseUUIDPipe) c: string,
    @Req() r: AuthenticatedRequest,
  ) {
    return this.service.listAppointments(c, r.user.sub);
  }
  @Patch('appointments/:id/status')
  @RequireCompanyModule('appointments')
  appointmentStatus(
    @Param('companyId', ParseUUIDPipe) c: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() r: AuthenticatedRequest,
    @Body() d: UpdateServiceStatusDto,
  ) {
    return this.service.updateAppointmentStatus(c, r.user.sub, id, d.status);
  }
  @Post('service-contracts') @RequireCompanyModule('contracts') createContract(
    @Param('companyId', ParseUUIDPipe) c: string,
    @Req() r: AuthenticatedRequest,
    @Body() d: CreateContractDto,
  ) {
    return this.service.createContract(c, r.user.sub, d);
  }
  @Get('service-contracts') @RequireCompanyModule('contracts') listContracts(
    @Param('companyId', ParseUUIDPipe) c: string,
    @Req() r: AuthenticatedRequest,
  ) {
    return this.service.listContracts(c, r.user.sub);
  }
  @Patch('service-contracts/:id/status')
  @RequireCompanyModule('contracts')
  contractStatus(
    @Param('companyId', ParseUUIDPipe) c: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() r: AuthenticatedRequest,
    @Body() d: UpdateServiceStatusDto,
  ) {
    return this.service.updateContractStatus(c, r.user.sub, id, d.status);
  }
}
