import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductionOrderDto {
  @IsUUID() bomId!: string;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  plannedQuantity!: number;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}
export class CompleteProductionOrderDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  producedQuantity!: number;
}
