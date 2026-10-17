import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum PrescriptionStatus {
  PENDING = 'pending',
  AWAITING_CLARIFICATION = 'awaiting_clarification',
  CLARIFIED = 'clarified',
  DISPENSED = 'dispensed',
  CANCELLED = 'cancelled',
}

@Entity('prescriptions')
export class Prescription {
  @ApiProperty({ example: 'b1c2d3e4-f5a6-7890-1234-abcdef012345' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'General Hospital Lagos' })
  @Column({ type: 'varchar', length: 255 })
  hospitalName: string;

  @ApiProperty({ example: 'c1d2e3f4-a5b6-7890-1234-abcdef012345' })
  @Column({ type: 'uuid' })
  patientId: string;

  @ApiProperty({ example: 'Mrs. Josephine' })
  @Column({ type: 'varchar', length: 255 })
  patientName: string;

  @ApiProperty({ example: 'josephine@email.com', nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  patientEmail: string | null;

  @ApiProperty({ example: 'd1e2f3a4-b5c6-7890-1234-abcdef012345' })
  @Column({ type: 'uuid' })
  doctorId: string;

  @ApiProperty({ example: 'Dr. Adewale' })
  @Column({ type: 'varchar', length: 255 })
  doctorName: string;

  @ApiProperty({ example: 'Amoxicillin 500mg' })
  @Column({ type: 'varchar', length: 255 })
  medicationName: string;

  @ApiProperty({ example: '1 tablet three times daily' })
  @Column({ type: 'varchar', length: 255 })
  dosage: string;

  @ApiProperty({ example: '7 days', nullable: true })
  @Column({ type: 'varchar', length: 100, nullable: true })
  duration: string | null;

  @ApiProperty({ example: 'Take after meals', nullable: true })
  @Column({ type: 'text', nullable: true })
  instructions: string | null;

  @ApiProperty({ enum: PrescriptionStatus, example: PrescriptionStatus.PENDING })
  @Column({
    type: 'enum',
    enum: PrescriptionStatus,
    default: PrescriptionStatus.PENDING,
  })
  status: PrescriptionStatus;

  @ApiProperty({ example: 'Dosage needs confirmation for patient age', nullable: true })
  @Column({ type: 'text', nullable: true })
  clarificationReason: string | null;

  @ApiProperty({ example: 'Confirmed 500mg due to acute bacterial infection', nullable: true })
  @Column({ type: 'text', nullable: true })
  clarificationResponse: string | null;

  @ApiProperty({ example: 'e1f2a3b4-c5d6-7890-1234-abcdef012345', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  pharmacistId: string | null;

  @ApiProperty({ example: 'Pharm. Okafor', nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  pharmacistName: string | null;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
