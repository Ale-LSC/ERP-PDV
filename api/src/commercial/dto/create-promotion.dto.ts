import {
  IsDateString,
  IsNumber,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePromotionDto {
  @IsUUID() productId!: string;
  @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) promotionalPrice!: number;
  @IsDateString() startsAt!: string;
  @IsDateString() endsAt!: string;
}
