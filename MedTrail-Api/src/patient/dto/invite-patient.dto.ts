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

  @ApiProperty({ example: 'jennifer@example.com', description: 'Email address of the patient' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Valid email is required' })
  email: string;

  @ApiProperty({ example: '08123456789', description: 'Phone number', required: false })
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
}
