import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RaiseClarificationDto {
  @ApiProperty({
    example: 'Dose',
    description: 'Concern category e.g. Dose, Allergy, Other',
    required: false,
  })
  @IsString()
  @IsOptional()
  concern?: string;

  @ApiProperty({
    example: 'Patient has mild sensitivity in records. Please confirm alternative or verify safety.',
    description: 'Detailed reason or note raised by pharmacy to doctor',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({
    example: 'The patient...',
    description: 'Alternative note alias',
    required: false,
  })
  @IsString()
  @IsOptional()
  note?: string;
}
