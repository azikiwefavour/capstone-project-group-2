import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { SubscriptionPlan } from '../entities/facility.entity';

export enum ReviewAction {
  APPROVE = 'approve',
  REJECT = 'reject',
}

export class ReviewFacilityDto {
  @ApiProperty({ enum: ReviewAction, example: ReviewAction.APPROVE })
  @IsEnum(ReviewAction)
  action: ReviewAction;

  @ApiProperty({ example: 'Verified with Lagos State MDCN. Approved for trial.', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: 14, default: 14, required: false, description: 'Number of trial days granted' })
  @IsOptional()
  @IsInt()
  @Min(1)
  trialDays?: number;

  @ApiProperty({ enum: SubscriptionPlan, example: SubscriptionPlan.GROWTH, required: false })
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  plan?: SubscriptionPlan;
}
