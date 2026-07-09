import {
  IsDateString,
  IsNumber,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProductLotDto {
  @IsUUID() productId!: string;
  @IsString() @MinLength(1) @MaxLength(80) code!: string;
  @IsDateString() expiresAt!: string;
  @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) quantity!: number;
}
