import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum IncidentStatus {
  INVESTIGATING = 'investigating',
  IDENTIFIED = 'identified',
  MONITORING = 'monitoring',
  RESOLVED = 'resolved',
}

export enum IncidentSeverity {
  MINOR = 'minor',
  MAJOR = 'major',
  CRITICAL = 'critical',
}

@Entity('system_incidents')
export class SystemIncident {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-1234-abcdef012345' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'SMS Delays to MTN numbers' })
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiProperty({ example: 'Termii SMS' })
  @Index()
  @Column({ type: 'varchar', length: 100 })
  serviceName: string;

  @ApiProperty({
    example: IncidentStatus.INVESTIGATING,
    enum: IncidentStatus,
    default: IncidentStatus.INVESTIGATING,
  })
  @Index()
  @Column({
    type: 'varchar',
    length: 50,
    default: IncidentStatus.INVESTIGATING,
  })
  status: IncidentStatus;

  @ApiProperty({
    example: IncidentSeverity.MINOR,
    enum: IncidentSeverity,
    default: IncidentSeverity.MINOR,
  })
  @Column({
    type: 'varchar',
    length: 50,
    default: IncidentSeverity.MINOR,
  })
  severity: IncidentSeverity;

  @ApiProperty({
    example: 'Facilities and Patients may experience delays',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  impact?: string;

  @ApiProperty({
    example: 'Carrier network congestion observed on MTN Nigeria gateway.',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ example: '2026-10-27T13:40:00.000Z', nullable: true })
  @Column({ type: 'timestamp with time zone', nullable: true })
  resolvedAt?: Date;

  @ApiProperty({ example: '2026-10-27T13:40:00.000Z' })
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @ApiProperty({ example: '2026-10-27T13:40:00.000Z' })
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
