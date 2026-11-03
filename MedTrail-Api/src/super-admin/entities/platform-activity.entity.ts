import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum ActivitySeverity {
  INFO = 'info',
  WARNING = 'warning',
  DANGER = 'danger',
  SUCCESS = 'success',
}

@Entity('platform_activities')
export class PlatformActivity {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-1234-abcdef012345' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Royal Bay Clinic' })
  @Column({ type: 'varchar', length: 255 })
  facilityName: string;

  @ApiProperty({ example: 'fac-uuid-here', nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  facilityId: string;

  @ApiProperty({ example: 'Femi Ogunleye' })
  @Column({ type: 'varchar', length: 255 })
  actorName: string;

  @ApiProperty({ example: 'Facility admin', description: 'Facility admin | Billing | Super admin | Doctor | Pharmacist' })
  @Column({ type: 'varchar', length: 100 })
  actorRole: string;

  @ApiProperty({ example: 'Facility application submitted' })
  @Column({ type: 'text' })
  action: string;

  @ApiProperty({ enum: ActivitySeverity, example: ActivitySeverity.INFO })
  @Column({
    type: 'varchar',
    length: 50,
    default: ActivitySeverity.INFO,
  })
  status: ActivitySeverity;

  @ApiProperty({ example: { reason: 'Insufficient funds', gateway: 'Paystack' }, required: false })
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @ApiProperty({ example: '2026-10-01T10:12:00.000Z' })
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
