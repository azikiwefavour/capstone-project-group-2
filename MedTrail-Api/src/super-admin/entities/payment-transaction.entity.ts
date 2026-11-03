import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum PaymentTransactionStatus {
  SUCCESSFUL = 'successful',
  PENDING = 'pending',
  FAILED = 'failed',
}

export enum PaymentChannel {
  CARD = 'Card',
  BANK_TRANSFER = 'Bank Transfer',
  USSD = 'USSD',
}

@Entity('payment_transactions')
export class PaymentTransaction {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-1234-abcdef012345' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'PSK_8F2K19QX' })
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 128, unique: true })
  reference: string;

  @ApiProperty({ example: 'Absolute Health Hospital' })
  @Index()
  @Column({ type: 'varchar', length: 255 })
  facilityName: string;

  @ApiProperty({ example: 'fac-uuid-here', nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  facilityId?: string;

  @ApiProperty({ example: 'admin@absolutehealth.ng', nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  customerEmail?: string;

  @ApiProperty({ example: 'Dr. Michael Adeyemi', nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  customerName?: string;

  @ApiProperty({ example: 70000, description: 'Amount in Naira' })
  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  amount: number;

  @ApiProperty({ example: 'NGN', default: 'NGN' })
  @Column({ type: 'varchar', length: 10, default: 'NGN' })
  currency: string;

  @ApiProperty({ example: PaymentChannel.CARD, enum: PaymentChannel })
  @Column({ type: 'varchar', length: 50, default: PaymentChannel.CARD })
  channel: string;

  @ApiProperty({ example: 'Paystack', default: 'Paystack' })
  @Column({ type: 'varchar', length: 50, default: 'Paystack' })
  gateway: string;

  @ApiProperty({
    example: PaymentTransactionStatus.SUCCESSFUL,
    enum: PaymentTransactionStatus,
  })
  @Index()
  @Column({
    type: 'varchar',
    length: 30,
    default: PaymentTransactionStatus.SUCCESSFUL,
  })
  status: PaymentTransactionStatus;

  @ApiProperty({
    example: 'Transaction approved by bank',
    description: 'Detailed reason e.g. bank issue, timeout, or pending transfer',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  statusReason?: string;

  @ApiProperty({ example: 'Growth', nullable: true })
  @Column({ type: 'varchar', length: 50, nullable: true })
  plan?: string;

  @ApiProperty({ example: 'Monthly', nullable: true })
  @Column({ type: 'varchar', length: 50, nullable: true })
  billingCycle?: string;

  @ApiProperty({ example: 0, description: 'Number of automatic retries attempted' })
  @Column({ type: 'int', default: 0 })
  retriesCount: number;

  @ApiProperty({ example: '2026-11-04T00:00:00.000Z', nullable: true })
  @Column({ type: 'timestamp with time zone', nullable: true })
  nextRetryDate?: Date;

  @ApiProperty({ example: '2026-11-02T10:00:00.000Z', nullable: true })
  @Column({ type: 'timestamp with time zone', nullable: true })
  paidAt?: Date;

  @ApiProperty({ example: { ip: '102.89.44.12', channel: 'card' }, nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ApiProperty({ example: '2026-11-02T09:30:00.000Z' })
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @ApiProperty({ example: '2026-11-02T09:30:00.000Z' })
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
