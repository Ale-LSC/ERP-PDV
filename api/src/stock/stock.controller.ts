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
  ) {
    return this.stockService.createMovement(companyId, request.user.sub, dto);
  }

  @Get()
  findAll(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.stockService.findAll(companyId, request.user.sub);
  }
}
