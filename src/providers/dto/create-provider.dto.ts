import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsBoolean,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IdentityDocType } from '../../common/enums';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProviderDto {

  @ApiProperty({ example: 'Sidy' })
  @IsString()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Balde' })
  @IsString()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: 'Feeling Tech' })
  @IsString()
  @MaxLength(200)
  companyName: string;

  @ApiProperty({ example: 'Informatique' })
  @IsString()
  @MaxLength(200)
  activity: string;

  @ApiProperty({ example: 'Description courte du prestataire' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  shortDescription?: string;

  @ApiProperty({ example: 'Parcelles Assainies' })
  @IsString()
  @MaxLength(100)
  commune: string;

  @ApiProperty({ example: '+221770000000' })
  @IsString()
  @MaxLength(20)
  phone: string;

  @ApiProperty({ example: 's.balde@hgpd.fr' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiProperty({ example: '' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'PASSPORT' })
  @IsEnum(IdentityDocType)
  identityDocType: IdentityDocType;

  @ApiProperty({ example: 'AB1234567' })
  @IsString()
  @MaxLength(50)
  identityDocNumber: string;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  showPhoneNumber?: boolean;
}
