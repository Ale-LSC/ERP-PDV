import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateServiceOrderDto {
  @IsUUID() customerId!: string;
  @IsString() @MinLength(2) @MaxLength(180) title!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;
  @IsOptional() @IsDateString() scheduledAt?: string;
}
export class CreateAppointmentDto {
  @IsOptional() @IsUUID() customerId?: string;
  @IsString() @MinLength(2) @MaxLength(180) title!: string;
  @IsDateString() startsAt!: string;
  @IsDateString() endsAt!: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
export class CreateContractDto {
  @IsUUID() customerId!: string;
  @IsString() @MinLength(2) @MaxLength(180) title!: string;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;
  @IsIn(['monthly', 'quarterly', 'annual']) billingCycle!:
    | 'monthly'
    | 'quarterly'
    | 'annual';
  @IsDateString() startsOn!: string;
  @IsOptional() @IsDateString() endsOn?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
export class UpdateServiceStatusDto {
  @IsString() status!: string;
}
