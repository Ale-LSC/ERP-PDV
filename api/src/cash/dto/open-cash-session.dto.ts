import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class OpenCashSessionDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  openingAmount: number;
}
