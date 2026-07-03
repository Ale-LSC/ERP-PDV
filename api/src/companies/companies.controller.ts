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
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { AddCompanyMemberDto } from './dto/add-company-member.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UpdateCompanyModulesDto } from './dto/update-company-modules.dto';
import { CompanyModuleGuard } from './company-module.guard';
import { RequireCompanyModule } from './require-company-module.decorator';

@UseGuards(JwtAuthGuard, CompanyModuleGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateCompanyDto) {
    return this.companiesService.create(request.user.sub, dto);
  }

  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.companiesService.findAllForUser(request.user.sub);
  }

  @Get(':companyId/modules')
  getModules(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.companiesService.getModules(companyId, request.user.sub);
  }

  @Patch(':companyId/modules')
  updateModules(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateCompanyModulesDto,
  ) {
    return this.companiesService.updateModules(
      companyId,
      request.user.sub,
      dto.modules,
    );
  }

  @Post(':companyId/members')
  @RequireCompanyModule('team')
  addMember(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: AddCompanyMemberDto,
  ) {
    return this.companiesService.addMember(companyId, request.user.sub, dto);
  }

  @Get(':companyId/members')
  @RequireCompanyModule('team')
  findMembers(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.companiesService.findMembers(companyId, request.user.sub);
  }

  @Get(':companyId/employees')
  @RequireCompanyModule('team')
  findEmployees(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.companiesService.findEmployees(companyId, request.user.sub);
  }

  @Post(':companyId/employees')
  @RequireCompanyModule('team')
  createEmployee(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateEmployeeDto,
  ) {
    return this.companiesService.createEmployee(
      companyId,
      request.user.sub,
      dto,
    );
  }

  @Patch(':companyId/employees/:employeeId')
  @RequireCompanyModule('team')
  updateEmployee(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.companiesService.updateEmployee(
      companyId,
      employeeId,
      request.user.sub,
      dto,
    );
  }
}
