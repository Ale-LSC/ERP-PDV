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
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { StockService } from './stock.service';

@UseGuards(JwtAuthGuard)
@Controller('companies/:companyId/stock-movements')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post()
  create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateStockMovementDto,
    @Headers('x-branch-id') branchId?: string,
  ) {
    return this.stockService.createMovement(
      companyId,
      request.user.sub,
      dto,
      branchId,
    );
  }

  @Get()
  findAll(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() request: AuthenticatedRequest,
    @Headers('x-branch-id') branchId?: string,
  ) {
    return this.stockService.findAll(companyId, request.user.sub, branchId);
  }
}
