import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class AddProviderCategoryDto {
  @IsInt()
  categoryId: number;

  @IsOptional()
  @IsInt()
  subCategoryId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
