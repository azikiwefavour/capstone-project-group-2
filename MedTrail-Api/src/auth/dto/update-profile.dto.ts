import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Dr. John Doe', description: 'Updated full name of the user' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: '+2348012345678', description: 'Updated phone number' })
  @IsOptional()
  @IsString()
  phone?: string;
}
