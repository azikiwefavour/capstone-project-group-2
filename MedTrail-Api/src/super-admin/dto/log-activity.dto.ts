import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ActivitySeverity } from '../entities/platform-activity.entity';

export class LogPlatformActivityDto {
  @ApiProperty({ example: 'Royal Bay Clinic' })
  @IsString()
  @IsNotEmpty()
  facilityName: string;

  @ApiProperty({ example: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6', required: false })
  @IsOptional()
  @IsString()
  facilityId?: string;

  @ApiProperty({ example: 'Femi Ogunleye' })
  @IsString()
  @IsNotEmpty()
  actorName: string;

  @ApiProperty({ example: 'Facility admin', description: 'Facility admin | Billing | Super admin | Doctor | Pharmacist' })
  @IsString()
  @IsNotEmpty()
  actorRole: string;

  @ApiProperty({ example: 'Facility application submitted' })
  @IsString()
  @IsNotEmpty()
  action: string;

  @ApiProperty({ enum: ActivitySeverity, example: ActivitySeverity.INFO, required: false })
  @IsOptional()
  @IsEnum(ActivitySeverity)
  status?: ActivitySeverity;

  @ApiProperty({ example: { gateway: 'Paystack', reason: 'Insufficient funds' }, required: false })
  @IsOptional()
  metadata?: Record<string, any>;
}
