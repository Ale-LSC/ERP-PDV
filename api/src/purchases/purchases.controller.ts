import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { PurchasesService } from './purchases.service';
@UseGuards(JwtAuthGuard)
@Controller('companies/:companyId/purchases')
export class PurchasesController {
  constructor(private readonly service: PurchasesService) {}
  @Post() create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreatePurchaseDto,
  ) {
    return this.service.create(companyId, req.user.sub, dto);
  }
  @Get() findAll(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.findAll(companyId, req.user.sub);
  }
  @Post(':purchaseId/cancel') cancel(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('purchaseId', ParseUUIDPipe) purchaseId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.cancel(companyId, purchaseId, req.user.sub);
  }
}
