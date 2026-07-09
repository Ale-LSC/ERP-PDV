import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseFloatPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyModuleGuard } from '../companies/company-module.guard';
import { RequireCompanyModule } from '../companies/require-company-module.decorator';
import { CreateBomDto } from './dto/create-bom.dto';
import {
  CompleteProductionOrderDto,
  CreateProductionOrderDto,
} from './dto/create-production-order.dto';
import { ProductionService } from './production.service';

@UseGuards(JwtAuthGuard, CompanyModuleGuard)
@Controller('companies/:companyId')
export class ProductionController {
  constructor(private readonly service: ProductionService) {}
  @Post('boms')
  @RequireCompanyModule('bom')
  createBom(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateBomDto,
  ) {
    return this.service.createBom(companyId, req.user.sub, dto);
  }
  @Get('boms')
  @RequireCompanyModule('bom')
  listBoms(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.listBoms(companyId, req.user.sub);
  }
  @Post('production-orders')
  @RequireCompanyModule('production')
  createOrder(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateProductionOrderDto,
    @Headers('x-branch-id') branchId?: string,
  ) {
    return this.service.createOrder(companyId, req.user.sub, dto, branchId);
  }
  @Get('production-orders')
  @RequireCompanyModule('production')
  listOrders(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() req: AuthenticatedRequest,
    @Headers('x-branch-id') branchId?: string,
  ) {
    return this.service.listOrders(companyId, req.user.sub, branchId);
  }
  @Patch('production-orders/:orderId/complete')
  @RequireCompanyModule('production')
  complete(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CompleteProductionOrderDto,
  ) {
    return this.service.complete(companyId, req.user.sub, orderId, dto);
  }
  @Get('mrp/:bomId')
  @RequireCompanyModule('mrp')
  mrp(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('bomId', ParseUUIDPipe) bomId: string,
    @Query('quantity', ParseFloatPipe) quantity: number,
    @Req() req: AuthenticatedRequest,
    @Headers('x-branch-id') branchId?: string,
  ) {
    return this.service.mrp(companyId, req.user.sub, bomId, quantity, branchId);
  }
}
