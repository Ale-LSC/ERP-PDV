import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
export class CreateBranchDto {
  @IsString() @MinLength(2) @MaxLength(160) name: string;
  @IsString() @MinLength(1) @MaxLength(30) code: string;
  @IsOptional() @IsString() @MaxLength(240) address?: string;
}
