import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export enum FinancialEntryType {
  PAYABLE = 'payable',
  RECEIVABLE = 'receivable',
}

export class CreateFinancialEntryDto {
  @IsEnum(FinancialEntryType)
  type: FinancialEntryType;

  @IsString()
  @MinLength(2)
  @MaxLength(220)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsDateString({ strict: true })
  dueDate: string;
}
