import {
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyModuleGuard } from '../companies/company-module.guard';
import { RequireCompanyModule } from '../companies/require-company-module.decorator';
import { ReportPeriodDto } from './dto/report-period.dto';
import { ReportsService } from './reports.service';

@RequireCompanyModule('reports')
@UseGuards(JwtAuthGuard, CompanyModuleGuard)
@Controller('companies/:companyId/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  overview(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() request: AuthenticatedRequest,
    @Query() period: ReportPeriodDto,
    @Headers('x-branch-id') branchId?: string,
  ) {
    return this.reportsService.overview(
      companyId,
      request.user.sub,
      period,
      branchId,
    );
  }
}
