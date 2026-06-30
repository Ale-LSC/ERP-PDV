import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
export class CreateReplenishmentDto {
  @IsUUID() productId: string;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity: number;
  @IsOptional() @IsString() @MaxLength(240) note?: string;
}
