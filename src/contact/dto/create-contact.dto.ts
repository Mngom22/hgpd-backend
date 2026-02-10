import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiProperty({ example: 'Jean Dupont', description: 'Nom complet' })
  @IsNotEmpty({ message: 'Le nom est requis' })
  @IsString()
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ example: 'jean@example.com', description: 'Adresse email' })
  @IsNotEmpty({ message: "L'email est requis" })
  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @ApiProperty({ example: 'Demande de renseignement', description: 'Objet du message' })
  @IsNotEmpty({ message: "L'objet est requis" })
  @IsString()
  @MaxLength(200)
  subject: string;

  @ApiProperty({ example: 'Bonjour, je souhaite...', description: 'Contenu du message' })
  @IsNotEmpty({ message: 'Le message est requis' })
  @IsString()
  @MinLength(10, { message: 'Le message doit contenir au moins 10 caractères' })
  @MaxLength(5000)
  message: string;
}
