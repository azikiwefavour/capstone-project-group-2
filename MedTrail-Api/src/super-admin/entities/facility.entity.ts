import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum FacilityStatus {
  PENDING_REVIEW = 'pending_review',
  ACTIVE = 'active',
  TRIAL = 'trial',
  OVERDUE = 'overdue',
  SUSPENDED = 'suspended',
  REJECTED = 'rejected',
}

export enum SubscriptionPlan {
  STARTER = 'Starter Plan',
  GROWTH = 'Growth Plan',
}

export enum BillingCycle {
  MONTHLY = 'Monthly',
  YEARLY = 'Yearly',
}

@Entity('facilities')
export class Facility {
  @ApiProperty({ example: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Royal Bay Clinic' })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ example: 'royal-bay-clinic' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  slug: string;

  @ApiProperty({ example: 'FAC-ROY-001' })
  @Column({ type: 'varchar', length: 50, unique: true, nullable: true })
  code: string;

  @ApiProperty({ example: 'Lagos' })
  @Column({ type: 'varchar', length: 100, default: 'Lagos' })
  state: string;

  @ApiProperty({ example: '12 Admiralty Way, Lekki Phase 1' })
  @Column({ type: 'text', nullable: true })
  address: string;

  @ApiProperty({ example: 'contact@royalbayclinic.ng' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @ApiProperty({ example: '+2348012345678' })
  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string;

  @ApiProperty({ example: 'Dr. Femi Ogunleye' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  adminName: string;

  @ApiProperty({ example: 'femi@royalbayclinic.ng' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  adminEmail: string;

  @ApiProperty({ enum: FacilityStatus, example: FacilityStatus.ACTIVE })
  @Column({
    type: 'varchar',
    length: 50,
    default: FacilityStatus.PENDING_REVIEW,
  })
  status: FacilityStatus;

  @ApiProperty({ enum: SubscriptionPlan, example: SubscriptionPlan.GROWTH })
  @Column({
    type: 'varchar',
    length: 50,
    default: SubscriptionPlan.GROWTH,
  })
  plan: SubscriptionPlan;

  @ApiProperty({ enum: BillingCycle, example: BillingCycle.MONTHLY })
  @Column({
    type: 'varchar',
    length: 50,
    default: BillingCycle.MONTHLY,
  })
  billingCycle: BillingCycle;

  @ApiProperty({ example: 70000, description: 'Starter = 30000, Growth = 70000' })
  @Column({ type: 'numeric', precision: 12, scale: 2, default: 70000 })
  monthlyFee: number;

  @ApiProperty({ example: 'NGN' })
  @Column({ type: 'varchar', length: 10, default: 'NGN' })
  currency: string;

  @ApiProperty({ example: '2026-11-02' })
  @Column({ type: 'date', nullable: true })
  renewalDate: Date;

  @ApiProperty({ example: '2026-10-02' })
  @Column({ type: 'date', nullable: true })
  lastPaymentDate: Date;

  @ApiProperty({ example: 'paid', enum: ['paid', 'pending', 'failed', 'trial'] })
  @Column({ type: 'varchar', length: 50, default: 'trial' })
  paymentStatus: string;

  @ApiProperty({ example: 'Bank transfer', enum: ['Bank transfer', 'Card', 'Direct debit'] })
  @Column({ type: 'varchar', length: 100, default: 'Bank transfer', nullable: true })
  paymentMethod: string;

  @ApiProperty({ example: 8, description: 'Clinicians count (doctors + pharmacists)' })
  @Column({ type: 'int', default: 0, nullable: true })
  cliniciansCount: number;

  @ApiProperty({ example: 248, description: 'Patients count' })
  @Column({ type: 'int', default: 0, nullable: true })
  patientsCount: number;

  @ApiProperty({ example: 640, description: 'SMS messages count' })
  @Column({ type: 'int', default: 0, nullable: true })
  messagesCount: number;

  @ApiProperty({ example: false, description: 'True if 7-day free trial has been activated' })
  @Column({ type: 'boolean', default: false })
  trialUsed: boolean;

  // ── Facility Qualification & Verification Documents ──
  @ApiProperty({ example: 'RC-1294819' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  cacNumber: string;

  @ApiProperty({ example: 'MDCN-HOSP-2024-9182' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  licenseNumber: string;

  @ApiProperty({ example: 'https://medtrail-docs.s3.amazonaws.com/certificates/royal-bay-clinic-license.pdf' })
  @Column({ type: 'text', nullable: true })
  certificateUrl: string;

  @ApiProperty({ example: 'All documents verified with MDCN Lagos Registry' })
  @Column({ type: 'text', nullable: true })
  reviewNotes: string;

  @ApiProperty({ example: 'Adekemi (Super Admin)' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  reviewedBy: string;

  @ApiProperty({ example: '2026-10-01T11:12:00Z' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  reviewedAt: Date;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
