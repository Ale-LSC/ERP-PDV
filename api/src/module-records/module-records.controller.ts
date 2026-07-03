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
import { CreateModuleRecordDto } from './dto/create-module-record.dto';
import { UpdateModuleRecordDto } from './dto/update-module-record.dto';
import { ModuleRecordsService } from './module-records.service';

@UseGuards(JwtAuthGuard)
@Controller('companies/:companyId/modules/:module/records')
export class ModuleRecordsController {
  constructor(private readonly service: ModuleRecordsService) {}

  @Get()
  findAll(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('module') module: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.findAll(companyId, req.user.sub, module);
  }

  @Post()
  create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('module') module: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateModuleRecordDto,
  ) {
    return this.service.create(companyId, req.user.sub, module, dto);
  }

  @Patch(':recordId')
  update(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('module') module: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateModuleRecordDto,
  ) {
    return this.service.update(companyId, req.user.sub, module, recordId, dto);
  }
}
