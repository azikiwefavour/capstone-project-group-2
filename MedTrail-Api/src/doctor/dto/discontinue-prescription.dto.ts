import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DiscontinuePrescriptionDto {
  @ApiProperty({
    example: 'Patient experienced mild allergic reaction. Discontinuing course.',
    description: 'Clinical reason or note explaining why the prescription is being discontinued',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
