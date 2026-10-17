import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RaiseClarificationDto {
  @ApiProperty({
    example: 'Patient has mild sensitivity in records. Please confirm alternative or verify safety.',
    description: 'Reason or query raised by pharmacy to doctor',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
