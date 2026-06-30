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
import { CashService } from './cash.service';
import { CloseCashSessionDto } from './dto/close-cash-session.dto';
import { OpenCashSessionDto } from './dto/open-cash-session.dto';

@UseGuards(JwtAuthGuard)
@Controller('companies/:companyId/cash-sessions')
export class CashController {
  constructor(private readonly cashService: CashService) {}

  @Post('open')
  open(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: OpenCashSessionDto,
    @Headers('x-branch-id') branchId?: string,
  ) {
    return this.cashService.open(
      companyId,
      request.user.sub,
      dto.openingAmount,
      branchId,
    );
  }

  @Get('current')
  findCurrent(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() request: AuthenticatedRequest,
    @Headers('x-branch-id') branchId?: string,
  ) {
    return this.cashService.findCurrent(companyId, request.user.sub, branchId);
  }

  @Get(':sessionId/summary')
  getSummary(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.cashService.getSummary(companyId, sessionId, request.user.sub);
  }

  @Post(':sessionId/close')
  close(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CloseCashSessionDto,
  ) {
    return this.cashService.close(
      companyId,
      sessionId,
      request.user.sub,
      dto.closingAmount,
    );
  }
}
