import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../auth/auth.types';
import type { CompanyModule } from '../database/schema/companies.schema';
import { CompaniesService } from './companies.service';
import { COMPANY_MODULE_KEY } from './require-company-module.decorator';

@Injectable()
export class CompanyModuleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly companiesService: CompaniesService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const requiredModule = this.reflector.getAllAndOverride<CompanyModule>(
      COMPANY_MODULE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredModule) return true;

    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest & { params: { companyId?: string } }>();
    const companyId = request.params.companyId;
    if (!companyId || !request.user) return false;

    const enabled = await this.companiesService.hasEnabledModule(
      companyId,
      request.user.sub,
      requiredModule,
    );
    if (!enabled) {
      throw new ForbiddenException(
        `O módulo ${requiredModule} não está habilitado nesta empresa`,
      );
    }
    return true;
  }
}
