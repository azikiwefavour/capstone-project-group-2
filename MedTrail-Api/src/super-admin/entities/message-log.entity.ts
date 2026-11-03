import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum MessageChannel {
  EMAIL = 'Email',
  SMS = 'SMS',
  WHATSAPP = 'WhatsApp',
}

export enum MessageStatus {
  DELIVERED = 'delivered',
  FAILED = 'failed',
  QUEUED = 'queued',
  SENT = 'sent',
}

export enum MessageType {
  STAFF_INVITE = 'Staff invite',
  VERIFICATION_CODE = 'Verification code',
  PRESCRIPTION_DETAILS = 'Prescription details',
  GENERAL_NOTIFICATION = 'General notification',
}

@Entity('message_logs')
export class MessageLog {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-1234-abcdef012345' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Absolute Health Hospital' })
  @Index()
  @Column({ type: 'varchar', length: 255 })
  facilityName: string;

  @ApiProperty({ example: 'fac-uuid-here', nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  facilityId?: string;

  @ApiProperty({ example: 'john.doe@gmail.com' })
  @Column({ type: 'varchar', length: 255 })
  recipient: string;

  @ApiProperty({ example: 'jo****9@gmail.com' })
  @Column({ type: 'varchar', length: 255 })
  recipientMasked: string;

  @ApiProperty({ example: MessageType.STAFF_INVITE, enum: MessageType })
  @Index()
  @Column({ type: 'varchar', length: 100, default: MessageType.STAFF_INVITE })
  messageType: string;

  @ApiProperty({ example: 'Your doctor has prescribed Amoxicillin 500mg' })
  @Column({ type: 'text', nullable: true })
  content?: string;

  @ApiProperty({ example: MessageChannel.EMAIL, enum: MessageChannel })
  @Index()
  @Column({ type: 'varchar', length: 50, default: MessageChannel.EMAIL })
  channel: string;

  @ApiProperty({ example: MessageStatus.DELIVERED, enum: MessageStatus })
  @Index()
  @Column({ type: 'varchar', length: 50, default: MessageStatus.DELIVERED })
  status: MessageStatus;

  @ApiProperty({ example: 'Termii', default: 'Termii' })
  @Column({ type: 'varchar', length: 50, default: 'Termii' })
  provider: string;

  @ApiProperty({ example: 'msg-id-12345', nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  providerMessageId?: string;

  @ApiProperty({
    example: 'DND registered number',
    description: 'Reason if delivery failed or queued',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  failureReason?: string;

  @ApiProperty({ example: 4.0, description: 'SMS / message cost in Naira' })
  @Column({ type: 'numeric', precision: 8, scale: 2, default: 0 })
  cost: number;

  @ApiProperty({ example: { source: 'auth-otp', attempts: 1 }, nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ApiProperty({ example: '2026-10-27T00:06:00.000Z' })
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @ApiProperty({ example: '2026-10-27T00:06:00.000Z' })
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
