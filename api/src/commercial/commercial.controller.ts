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
import { CommercialService } from './commercial.service';
import { CreateProductLotDto } from './dto/create-product-lot.dto';
import { CreatePromotionDto } from './dto/create-promotion.dto';

@UseGuards(JwtAuthGuard, CompanyModuleGuard)
@Controller('companies/:companyId')
export class CommercialController {
  constructor(private readonly service: CommercialService) {}

  @Post('promotions')
  @RequireCompanyModule('promotions')
  createPromotion(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreatePromotionDto,
  ) {
    return this.service.createPromotion(companyId, req.user.sub, dto);
  }
  @Get('promotions')
  @RequireCompanyModule('promotions')
  listPromotions(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.listPromotions(companyId, req.user.sub);
  }
  @Patch('promotions/:promotionId/deactivate')
  @RequireCompanyModule('promotions')
  deactivate(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('promotionId', ParseUUIDPipe) promotionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.deactivatePromotion(
      companyId,
      req.user.sub,
      promotionId,
    );
  }
  @Post('product-lots')
  @RequireCompanyModule('expiry_control')
  createLot(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateProductLotDto,
    @Headers('x-branch-id') branchId?: string,
  ) {
    return this.service.createLot(companyId, req.user.sub, dto, branchId);
  }
  @Get('product-lots')
  @RequireCompanyModule('expiry_control')
  listLots(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() req: AuthenticatedRequest,
    @Headers('x-branch-id') branchId?: string,
  ) {
    return this.service.listLots(companyId, req.user.sub, branchId);
  }
}
