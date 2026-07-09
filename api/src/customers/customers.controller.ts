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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@RequireCompanyModule('customers')
@UseGuards(JwtAuthGuard, CompanyModuleGuard)
@Controller('companies/:companyId/customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customersService.create(companyId, request.user.sub, dto);
  }

  @Get()
  findAll(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.customersService.findAll(companyId, request.user.sub);
  }

  @Patch(':customerId')
  update(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(
      companyId,
      customerId,
      request.user.sub,
      dto,
    );
  }
}
