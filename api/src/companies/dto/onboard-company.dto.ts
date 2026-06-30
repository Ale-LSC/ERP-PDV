import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  companySegments,
  companySizes,
  type CompanySegment,
  type CompanySize,
} from '../../database/schema/companies.schema';

export class OnboardCompanyDto {
  @IsString() @MinLength(2) @MaxLength(120) adminName: string;
  @IsEmail() adminEmail: string;
  @IsString() @MinLength(8) @MaxLength(72) password: string;
  @IsString() @MinLength(2) @MaxLength(160) companyName: string;
  @IsOptional() @IsString() @MaxLength(20) document?: string;
  @IsIn(companySegments) segment: CompanySegment;
  @IsIn(companySizes) size: CompanySize;
}
