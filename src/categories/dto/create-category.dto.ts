import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, MaxLength, Min } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'name' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'slug' })
  @IsString()
  @MaxLength(100)
  slug: string;

  @ApiProperty({ example: 'description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'icon' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiProperty({ example: 'https://example.com/photo.jpg', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string;

  @ApiProperty({ example: 'https://example.com/video.mp4', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  videoUrl?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  displayOrder: number;
}
