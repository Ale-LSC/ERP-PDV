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
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersService } from './suppliers.service';
@RequireCompanyModule('purchases')
@UseGuards(JwtAuthGuard, CompanyModuleGuard)
@Controller('companies/:companyId/suppliers')
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}
  @Post() create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateSupplierDto,
  ) {
    return this.service.create(companyId, req.user.sub, dto);
  }
  @Get() findAll(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.findAll(companyId, req.user.sub);
  }
  @Patch(':supplierId') update(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('supplierId', ParseUUIDPipe) supplierId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.service.update(companyId, supplierId, req.user.sub, dto);
  }
}
