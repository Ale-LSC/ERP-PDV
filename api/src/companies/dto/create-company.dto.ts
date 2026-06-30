import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  companySegments,
  companySizes,
  type CompanySize,
  type CompanySegment,
} from '../../database/schema/companies.schema';

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  document?: string;

  @IsIn(companySegments)
  segment: CompanySegment;

  @IsIn(companySizes)
  size: CompanySize;
}
