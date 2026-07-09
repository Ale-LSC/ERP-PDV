import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdatePaymentTransactionDto } from './dto/update-payment-transaction.dto';
import { PaymentsService } from './payments.service';

@UseGuards(JwtAuthGuard)
@Controller('companies/:companyId')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('payments/transactions')
  findAll(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.paymentsService.findAll(companyId, request.user.sub);
  }

  @Get('sales/:saleId/payments/transactions')
  findBySale(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('saleId', ParseUUIDPipe) saleId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.paymentsService.findBySale(companyId, saleId, request.user.sub);
  }

  @Patch('payments/transactions/:transactionId/provider-result')
  updateProviderResult(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdatePaymentTransactionDto,
  ) {
    return this.paymentsService.updateProviderResult(
      companyId,
      transactionId,
      request.user.sub,
      dto,
    );
  }
}
