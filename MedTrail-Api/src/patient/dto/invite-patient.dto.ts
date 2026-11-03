import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class InvitePatientDto {
  @ApiProperty({ example: 'Miss. Jennifer', description: 'Full name of the patient' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Patient name is required' })
  name: string;

  @ApiProperty({
    example: 'jennifer@example.com',
    description: 'Email address of the patient (optional for offline/elderly patients)',
    required: false,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Valid email is required if provided' })
  @IsOptional()
  email?: string;

  @ApiProperty({ example: '08123456789', description: 'Phone number (required if no email is provided)', required: false })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'Female', description: 'Gender', required: false })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiProperty({ example: 34, description: 'Age', required: false })
  @IsNumber()
  @IsOptional()
  age?: number;

  @ApiProperty({ example: 'MT-4921', description: 'Custom patient card or hospital ID', required: false })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsOptional()
  patientCode?: string;

  @ApiProperty({ example: '08098765432', description: 'Caregiver or Next-of-Kin phone number for elderly patient SMS', required: false })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsOptional()
  caregiverPhone?: string;

  @ApiProperty({ example: 'Emeka (Son)', description: 'Caregiver or Next-of-Kin name', required: false })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsOptional()
  caregiverName?: string;
}
