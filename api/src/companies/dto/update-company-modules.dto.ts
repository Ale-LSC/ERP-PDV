import { ArrayUnique, IsArray, IsIn } from 'class-validator';
import {
  companyModules,
  type CompanyModule,
} from '../../database/schema/companies.schema';

export class UpdateCompanyModulesDto {
  @IsArray()
  @ArrayUnique()
  @IsIn(companyModules, { each: true })
  modules!: CompanyModule[];
}
