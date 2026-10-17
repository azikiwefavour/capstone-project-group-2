import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ConfirmPrescriptionDto {
  @ApiProperty({
    example: 'Patient kidney profile confirmed stable, proceed with written dose.',
    description: 'Optional note to pharmacist confirming prescription stands as written',
    required: false,
  })
  @IsString()
  @IsOptional()
  noteToPharmacist?: string;

  @ApiProperty({
    example: 'Confirmed: prescription stands as written.',
    description: 'Alternative response string alias',
    required: false,
  })
  @IsString()
  @IsOptional()
  response?: string;
}
