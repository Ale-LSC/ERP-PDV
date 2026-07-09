import { SetMetadata } from '@nestjs/common';
import type { CompanyModule } from '../database/schema/companies.schema';

export const COMPANY_MODULE_KEY = 'companyModule';

export const RequireCompanyModule = (module: CompanyModule) =>
  SetMetadata(COMPANY_MODULE_KEY, module);
