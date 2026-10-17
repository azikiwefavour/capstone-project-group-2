import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePrescriptionDto {
  @ApiProperty({ example: 'c1d2e3f4-a5b6-7890-1234-abcdef012345', description: 'Patient UUID' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ example: 'Amoxicillin 500mg', description: 'Name of the prescribed drug' })
  @IsString()
  @IsNotEmpty()
  medicationName: string;

  @ApiProperty({ example: '1 tablet 3 times daily', description: 'Prescribed dosage' })
  @IsString()
  @IsNotEmpty()
  dosage: string;

  @ApiProperty({ example: '7 days', description: 'Duration of course', required: false })
  @IsString()
  @IsOptional()
  duration?: string;

  @ApiProperty({ example: 'Take after meals with plenty of water', description: 'Special instructions', required: false })
  @IsString()
  @IsOptional()
  instructions?: string;
}
