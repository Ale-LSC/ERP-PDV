import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  companyRoles,
  type CompanyRole,
} from '../../database/schema/companies.schema';

export class CreateEmployeeDto {
  @IsString() @MinLength(2) @MaxLength(120) name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) @MaxLength(72) password: string;
  @IsIn(companyRoles) role: CompanyRole;
  @IsOptional() @IsUUID() branchId?: string;
}
