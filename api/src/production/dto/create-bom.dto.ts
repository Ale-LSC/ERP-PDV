import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

class BomItemDto {
  @IsUUID() productId!: string;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity!: number;
}
export class CreateBomDto {
  @IsUUID() productId!: string;
  @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  yieldQuantity!: number;
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BomItemDto)
  items!: BomItemDto[];
}
