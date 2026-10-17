import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ResolveClarificationDto {
  @ApiProperty({
    example: 'Confirmed 500mg dosage is appropriate given acute infection severity; patient tolerated previous course well.',
    description: 'Doctor clarification response to the pharmacist question',
  })
  @IsString()
  @IsNotEmpty()
  response: string;
}
