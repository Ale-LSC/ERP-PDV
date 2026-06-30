import { IsEnum, IsOptional } from 'class-validator';
import { FinancialEntryType } from './create-financial-entry.dto';

export enum FinancialEntryStatus {
  PENDING = 'pending',
  PAID = 'paid',
}

export class ListFinancialEntriesDto {
  @IsOptional()
  @IsEnum(FinancialEntryType)
  type?: FinancialEntryType;

  @IsOptional()
  @IsEnum(FinancialEntryStatus)
  status?: FinancialEntryStatus;
}
