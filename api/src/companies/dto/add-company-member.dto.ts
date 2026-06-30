import { IsEmail, IsIn } from 'class-validator';
import {
  companyRoles,
  type CompanyRole,
} from '../../database/schema/companies.schema';

export class AddCompanyMemberDto {
  @IsEmail()
  email: string;

  @IsIn(companyRoles)
  role: CompanyRole;
}
