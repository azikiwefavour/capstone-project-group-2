import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '../../users/entities/user.entity';

export class InviteUserDto {
  @ApiProperty({ example: 'Dr. Adewale Okafor', description: 'Full name of the invited user' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @ApiProperty({ example: 'adewale@hospital.com', description: 'Email address of the invited user' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    enum: [UserRole.DOCTOR, UserRole.PHARMACIST],
    example: UserRole.DOCTOR,
    description: 'Role to assign – only doctor or pharmacist can be invited by admin',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEnum([UserRole.DOCTOR, UserRole.PHARMACIST], {
    message: 'Role must be either "doctor" or "pharmacist"',
  })
  role: UserRole.DOCTOR | UserRole.PHARMACIST;

  @ApiProperty({ example: 'Lagos General Hospital', description: 'Hospital or pharmacy name', required: false })
  @IsString()
  @IsOptional()
  hospitalName?: string;

  @ApiProperty({ example: '+2348123456789', description: 'Phone number', required: false })
  @IsString()
  @IsOptional()
  @Matches(/^\+?[0-9\s\-()]{7,20}$/, { message: 'Please provide a valid phone number' })
  phone?: string;
}
