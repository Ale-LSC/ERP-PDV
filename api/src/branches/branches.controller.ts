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
import { CompanyModuleGuard } from '../companies/company-module.guard';
import { RequireCompanyModule } from '../companies/require-company-module.decorator';
import { AssignBranchUserDto } from './dto/assign-branch-user.dto';
import { CreateBranchDto } from './dto/create-branch.dto';
import { BranchesService } from './branches.service';
@UseGuards(JwtAuthGuard, CompanyModuleGuard)
@Controller('companies/:companyId/branches')
export class BranchesController {
  constructor(private readonly service: BranchesService) {}
  @Post()
  @RequireCompanyModule('team')
  create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateBranchDto,
  ) {
    return this.service.create(companyId, req.user.sub, dto);
  }
  @Get() all(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.findAll(companyId, req.user.sub);
  }
  @Post(':branchId/users')
  @RequireCompanyModule('team')
  assign(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: AssignBranchUserDto,
  ) {
    return this.service.assignUser(
      companyId,
      branchId,
      req.user.sub,
      dto.userId,
    );
  }
}
