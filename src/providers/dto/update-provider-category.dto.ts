import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProviderCategoryDto {
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    description?: string;
}
