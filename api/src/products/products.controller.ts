import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductsService } from './products.service';
import { UpdateProductDto } from './dto/update-product.dto';

@UseGuards(JwtAuthGuard)
@Controller('companies/:companyId/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(companyId, request.user.sub, dto);
  }

  @Get()
  findAll(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.productsService.findAll(companyId, request.user.sub);
  }

  @Patch(':productId')
  update(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(
      companyId,
      productId,
      request.user.sub,
      dto,
    );
  }
}
