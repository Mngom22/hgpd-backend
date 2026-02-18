import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsInt,
  MaxLength,
  Min,
  IsArray,
  IsUUID,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CategoryBudgetDto {
  @ApiProperty({ example: 1, description: 'ID de la catégorie' })
  @IsInt()
  @IsNotEmpty()
  categoryId: number;

  @ApiProperty({
    example: 50000,
    description: 'Budget minimum pour cette catégorie',
  })
  @IsNumber()
  @Min(0)
  minAmount: number;

  @ApiProperty({
    example: 100000,
    description: 'Budget maximum pour cette catégorie',
  })
  @IsNumber()
  @Min(0)
  maxAmount: number;
}

export class ProviderBudgetDto {
  @ApiProperty({ example: 'uuid-provider-1' })
  @IsString()
  @IsNotEmpty()
  providerId: string;

  @ApiProperty({ example: 50000, description: 'Budget estimé pour ce prestataire' })
  @IsNumber()
  @Min(0)
  budget: number;

  @ApiProperty({ example: 5250, description: 'Prix du lead basé sur le budget' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  leadPrice?: number;
}

export class CreateDemandDto {
  @ApiProperty({ example: 'organizerId' })
  @IsString()
  organizerId: string;

  @ApiProperty({ example: 'Mouhamed Ngom' })
  @IsString()
  @MaxLength(200)
  contactName: string;

  @ApiProperty({ example: 'Marriage' })
  @IsString()
  @MaxLength(200)
  eventNature: string;

  @ApiProperty({ example: '2026-12-31T18:30:00Z' })
  @IsDateString()
  eventDate: string;

  @ApiProperty({ example: 150 })
  @IsOptional()
  @IsInt()
  @Min(1)
  approximateGuests?: number;

  @ApiProperty({ example: 'Tivaoune Peuhl' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiProperty({ example: 'Downtown area' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  geographicZone?: string;

  @ApiProperty({ example: 500000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @ApiProperty({ example: "Information supplémentaire sur l'événement" })
  @IsOptional()
  @IsString()
  additionalInfo?: string;

  @ApiProperty({
    example: [
      { categoryId: 1, amount: 100000 },
      { categoryId: 2, amount: 200000 },
    ],
    description: 'Budgets par catégorie',
    type: [CategoryBudgetDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryBudgetDto)
  @ArrayMinSize(1)
  categoryBudgets: CategoryBudgetDto[];

  @ApiProperty({
    example: [
      { providerId: 'uuid-provider-1', budget: 50000 },
    ],
    description: 'Budgets par prestataire',
    type: [ProviderBudgetDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProviderBudgetDto)
  providerBudgets?: ProviderBudgetDto[];

  @ApiProperty({
    example: ['uuid-provider-1', 'uuid-provider-2'],
    description: 'Liste des IDs des prestataires à notifier (max 5)',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5, {
    message: 'Vous ne pouvez pas sélectionner plus de 5 prestataires',
  })
  providerIds?: string[];
}
