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
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { AddCompanyMemberDto } from './dto/add-company-member.dto';

@UseGuards(JwtAuthGuard)
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

  @Post(':companyId/members')
  addMember(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: AddCompanyMemberDto,
  ) {
    return this.companiesService.addMember(companyId, request.user.sub, dto);
  }

  @Get(':companyId/members')
  findMembers(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.companiesService.findMembers(companyId, request.user.sub);
  }
}
