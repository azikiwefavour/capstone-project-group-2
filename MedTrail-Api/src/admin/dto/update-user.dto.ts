import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Dr. Adewale', description: 'Full name of the user' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'adewale@medtrail.com', description: 'Email address of the user' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: '+2348000000000', description: 'Phone number of the user' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;
}

