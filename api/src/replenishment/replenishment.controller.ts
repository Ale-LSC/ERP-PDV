import {
  Body,
  Controller,
  Get,
  Headers,
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
import { CreateReplenishmentDto } from './dto/create-replenishment.dto';
import { ReplenishmentService } from './replenishment.service';
@RequireCompanyModule('inventory')
@UseGuards(JwtAuthGuard, CompanyModuleGuard)
@Controller('companies/:companyId/replenishment-requests')
export class ReplenishmentController {
  constructor(private readonly service: ReplenishmentService) {}
  @Post() create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateReplenishmentDto,
    @Headers('x-branch-id') branchId?: string,
  ) {
    return this.service.create(companyId, req.user.sub, dto, branchId);
  }
  @Get() all(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() req: AuthenticatedRequest,
    @Headers('x-branch-id') branchId?: string,
  ) {
    return this.service.findAll(companyId, req.user.sub, branchId);
  }
  @Patch(':id/fulfill') fulfill(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
    @Headers('x-branch-id') branchId?: string,
  ) {
    return this.service.fulfill(companyId, id, req.user.sub, branchId);
  }
}
