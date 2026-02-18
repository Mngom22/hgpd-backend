import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsBoolean,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IdentityDocType } from '../../common/enums';

export class ProviderRegisterDto {
  @ApiProperty({ example: 'Sidy', description: 'Prenom du prestataire' })
  @IsString()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Balde', description: 'Nom du prestataire' })
  @IsString()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: 'Feeling Tech', description: 'Nom de la societe' })
  @IsString()
  @MaxLength(200)
  companyName: string;

  @ApiProperty({ example: 'DJ', description: 'Activite principale' })
  @IsString()
  @MaxLength(200)
  activity: string;

  @ApiPropertyOptional({ example: 'Dakar', description: 'Departement (optionnel)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiProperty({ example: 'Parcelles Assainies', description: 'Commune' })
  @IsString()
  @MaxLength(100)
  commune: string;

  @ApiProperty({ example: '+221770000000', description: 'Numero de telephone' })
  @IsString()
  @Matches(/^\+?[0-9]{9,15}$/, { message: 'Numero de telephone invalide' })
  phone: string;

  @ApiPropertyOptional({
    example: 's.balde@hgpd.fr',
    description: 'Adresse email',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Adresse email invalide' })
  @MaxLength(255)
  email?: string;

  @ApiProperty({
    example: 'MotDePasse123!',
    description:
      'Mot de passe (min 8 caracteres, 1 majuscule, 1 minuscule, 1 chiffre)',
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message:
      'Le mot de passe doit contenir au moins 8 caracteres, une majuscule, une minuscule et un chiffre',
  })
  password: string;

  @ApiProperty({
    enum: IdentityDocType,
    example: IdentityDocType.PASSPORT,
    description: 'Type de document identite',
  })
  @IsEnum(IdentityDocType)
  identityDocType: IdentityDocType;

  @ApiProperty({
    example: 'AB1234567',
    description: 'Numero du document identite',
  })
  @IsString()
  @MaxLength(50)
  identityDocNumber: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Afficher le numero de telephone',
  })
  @IsOptional()
  @IsBoolean()
  showPhoneNumber?: boolean;
}
