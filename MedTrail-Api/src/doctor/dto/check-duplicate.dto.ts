import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CheckDuplicateDto {
  @ApiProperty({ example: 'c1d2e3f4-a5b6-7890-1234-abcdef012345', description: 'Patient UUID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ example: 'Amoxicillin', description: 'Name of the medication' })
  @IsString()
  @IsNotEmpty()
  medicationName: string;

  @ApiProperty({ example: '500mg', description: 'Dosage', required: false })
  @IsString()
  @IsOptional()
  dosage?: string;

  @ApiProperty({ example: '500mg', description: 'Dose alias', required: false })
  @IsString()
  @IsOptional()
  dose?: string;

  @ApiProperty({ example: '3 times daily', description: 'Frequency', required: false })
  @IsString()
  @IsOptional()
  frequency?: string;

  @ApiProperty({ example: '7 days', description: 'Duration', required: false })
  @IsString()
  @IsOptional()
  duration?: string;

  @ApiProperty({ example: 'Bacterial infection', description: 'Clinical indication / reason', required: false })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiProperty({ required: false, description: 'Optional medications list' })
  @IsOptional()
  medications?: any;
}
