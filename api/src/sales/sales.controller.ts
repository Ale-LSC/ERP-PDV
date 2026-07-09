import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyModuleGuard } from '../companies/company-module.guard';
import { RequireCompanyModule } from '../companies/require-company-module.decorator';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SalesService } from './sales.service';

@RequireCompanyModule('pdv')
@UseGuards(JwtAuthGuard, CompanyModuleGuard)
@Controller('companies/:companyId/sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateSaleDto,
  ) {
    return this.salesService.create(companyId, request.user.sub, dto);
  }

  @Get()
  findRecent(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() request: AuthenticatedRequest,
    @Headers('x-branch-id') branchId?: string,
  ) {
    return this.salesService.findRecent(companyId, request.user.sub, branchId);
  }

  @Get(':saleId')
  findOne(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('saleId', ParseUUIDPipe) saleId: string,
    @Req() request: AuthenticatedRequest,
    @Headers('x-branch-id') branchId?: string,
  ) {
    return this.salesService.findOne(
      companyId,
      saleId,
      request.user.sub,
      branchId,
    );
  }

  @Post(':saleId/cancel')
  cancel(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('saleId', ParseUUIDPipe) saleId: string,
    @Req() request: AuthenticatedRequest,
    @Headers('x-branch-id') branchId?: string,
  ) {
    return this.salesService.cancel(
      companyId,
      saleId,
      request.user.sub,
      branchId,
    );
  }
}
