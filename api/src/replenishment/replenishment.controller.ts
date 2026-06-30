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
import { CreateReplenishmentDto } from './dto/create-replenishment.dto';
import { ReplenishmentService } from './replenishment.service';
@UseGuards(JwtAuthGuard)
@Controller('companies/:companyId/replenishment-requests')
export class ReplenishmentController {
  constructor(private readonly service: ReplenishmentService) {}
  @Post() create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateReplenishmentDto,
  ) {
    return this.service.create(companyId, req.user.sub, dto);
  }
  @Get() all(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.findAll(companyId, req.user.sub);
  }
  @Patch(':id/fulfill') fulfill(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.fulfill(companyId, id, req.user.sub);
  }
}
