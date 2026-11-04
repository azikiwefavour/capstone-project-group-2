import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ModifyPrescriptionDto {
  @ApiProperty({ example: 'Amoxicillin', description: 'Updated medication name', required: false })
  @IsString()
  @IsOptional()
  medicationName?: string;

  @ApiProperty({ example: '500mg', description: 'Updated dosage / dose', required: false })
  @IsString()
  @IsOptional()
  dosage?: string;

  @ApiProperty({ example: '500mg', description: 'Dose alias', required: false })
  @IsString()
  @IsOptional()
  dose?: string;

  @ApiProperty({ example: '3 times daily', description: 'Updated frequency', required: false })
  @IsString()
  @IsOptional()
  frequency?: string;

  @ApiProperty({ example: '7 days', description: 'Updated duration', required: false })
  @IsString()
  @IsOptional()
  duration?: string;

  @ApiProperty({ example: 'Bacterial infection', description: 'Updated clinical reason', required: false })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiProperty({ example: 'Take after meals', description: 'Updated instructions', required: false })
  @IsString()
  @IsOptional()
  instructions?: string;

  @ApiProperty({ example: 'Adjusted dosage following pharmacy note', description: 'Doctor note or response to pharmacist', required: false })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiProperty({ example: 'Patient has been evaluated and confirmed tolerating dosage', description: 'Note to pharmacist', required: false })
  @IsString()
  @IsOptional()
  noteToPharmacist?: string;

  @ApiProperty({ example: 'Bacterial infection', description: 'Updated diagnosis or illness (encrypted doctor-only)', required: false })
  @IsString()
  @IsOptional()
  illness?: string;

  @ApiProperty({ example: 'Vomiting, dizziness', description: 'Updated patient symptoms (encrypted doctor-only)', required: false })
  @IsString()
  @IsOptional()
  symptoms?: string;

  @ApiProperty({ required: false, description: 'Optional medications list' })
  @IsOptional()
  medications?: any;
}
