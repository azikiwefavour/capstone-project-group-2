import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateIf, ValidateNested } from 'class-validator';

export class PrescriptionItemDto {
  @ApiProperty({ example: 'Amoxicillin', description: 'Name of the prescribed drug' })
  @IsString()
  @IsNotEmpty()
  medicationName: string;

  @ApiProperty({ example: '500mg', description: 'Prescribed dosage / dose', required: false })
  @IsString()
  @IsOptional()
  dosage?: string;

  @ApiProperty({ example: '500mg', description: 'Alternative alias for dosage', required: false })
  @IsString()
  @IsOptional()
  dose?: string;

  @ApiProperty({ example: '3 times daily', description: 'Frequency of intake', required: false })
  @IsString()
  @IsOptional()
  frequency?: string;

  @ApiProperty({ example: '7 days', description: 'Duration of course', required: false })
  @IsString()
  @IsOptional()
  duration?: string;

  @ApiProperty({ example: 'Bacterial infection', description: 'Clinical reason or condition for prescription', required: false })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiProperty({ example: 'Take after meals with plenty of water', description: 'Special instructions', required: false })
  @IsString()
  @IsOptional()
  instructions?: string;
}

export class CreatePrescriptionDto {
  @ApiProperty({ example: 'c1d2e3f4-a5b6-7890-1234-abcdef012345', description: 'Patient UUID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ example: 'Amoxicillin', description: 'Name of the prescribed drug', required: false })
  @ValidateIf((o) => !o.medications || !Array.isArray(o.medications) || o.medications.length === 0)
  @IsString()
  @IsNotEmpty()
  medicationName?: string;

  @ApiProperty({ example: '500mg', description: 'Prescribed dosage / dose', required: false })
  @IsString()
  @IsOptional()
  dosage?: string;

  @ApiProperty({ example: '500mg', description: 'Alternative alias for dosage', required: false })
  @IsString()
  @IsOptional()
  dose?: string;

  @ApiProperty({ example: '3 times daily', description: 'Frequency of intake', required: false })
  @IsString()
  @IsOptional()
  frequency?: string;

  @ApiProperty({ example: '7 days', description: 'Duration of course', required: false })
  @IsString()
  @IsOptional()
  duration?: string;

  @ApiProperty({ example: 'Bacterial infection', description: 'Clinical reason or condition for prescription', required: false })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiProperty({ example: 'Take after meals with plenty of water', description: 'Special instructions', required: false })
  @IsString()
  @IsOptional()
  instructions?: string;

  @ApiProperty({ example: false, description: 'Bypass duplicate check if doctor confirms submission', required: false })
  @IsBoolean()
  @IsOptional()
  allowDuplicate?: boolean;

  @ApiProperty({ type: [PrescriptionItemDto], required: false, description: 'List of medications to prescribe' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemDto)
  @IsOptional()
  medications?: PrescriptionItemDto[];
}
