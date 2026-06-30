import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateFinancialEntryDto } from './dto/create-financial-entry.dto';
import { ListFinancialEntriesDto } from './dto/list-financial-entries.dto';
import { FinanceService } from './finance.service';

@UseGuards(JwtAuthGuard)
@Controller('companies/:companyId/finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post('entries')
  create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateFinancialEntryDto,
  ) {
    return this.financeService.create(companyId, request.user.sub, dto);
  }

  @Get('entries')
  findAll(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() request: AuthenticatedRequest,
    @Query() filters: ListFinancialEntriesDto,
  ) {
    return this.financeService.findAll(companyId, request.user.sub, filters);
  }

  @Patch('entries/:entryId/settle')
  settle(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.financeService.settle(companyId, entryId, request.user.sub);
  }

  @Get('summary')
  summary(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.financeService.summary(companyId, request.user.sub);
  }
}
