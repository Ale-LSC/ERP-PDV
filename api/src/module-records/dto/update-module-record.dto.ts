import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const statuses = ['pending', 'in_progress', 'completed', 'cancelled'] as const;

export class UpdateModuleRecordDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsIn(statuses)
  status?: (typeof statuses)[number];
}
