import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum UserRole {
  DOCTOR = 'doctor',
  PHARMACIST = 'pharmacist',
  PATIENT = 'patient',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-1234-56789abcdef0' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'John Doe' })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @ApiProperty({ example: '+2348123456789' })
  @Column({ type: 'varchar', length: 50, nullable: true, default: null })
  phone: string | null;

  @ApiProperty({ example: 'General Hospital Lagos' })
  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  hospitalName: string | null;

  @ApiProperty({ example: 'Female', nullable: true, required: false })
  @Column({ type: 'varchar', length: 20, nullable: true, default: null })
  gender: string | null;

  @ApiProperty({ example: 34, nullable: true, required: false })
  @Column({ type: 'int', nullable: true, default: null })
  age: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true, select: false, default: null })
  password: string | null;

  @ApiProperty({ enum: UserRole, example: UserRole.DOCTOR, required: false, nullable: true })
  @Column({
    type: 'enum',
    enum: UserRole,
    nullable: true,
    default: null,
  })
  role: UserRole | null;

  @ApiProperty({ example: false })
  @Column({ type: 'boolean', default: false })
  isEmailVerified: boolean;

  @Column({ type: 'varchar', length: 10, nullable: true, select: false, default: null })
  emailOtp: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true, select: false, default: null })
  emailOtpExpiry: Date | null;

  @Column({ type: 'varchar', length: 10, nullable: true, select: false, default: null })
  resetPasswordOtp: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true, select: false, default: null })
  resetPasswordOtpExpiry: Date | null;

  // ─── Admin Invitation Fields ──────────────────────────────────────────────

  @ApiProperty({ example: false, description: 'True when this account was created via admin invitation' })
  @Column({ type: 'boolean', default: false })
  isInvited: boolean;

  @ApiProperty({ example: 'pending', enum: ['pending', 'accepted'], nullable: true })
  @Column({ type: 'varchar', length: 20, nullable: true, default: null })
  invitationStatus: 'pending' | 'accepted' | null;

  /** Secure random UUID token embedded in the invitation link – excluded from SELECT by default */
  @Column({ type: 'varchar', length: 512, nullable: true, select: false, default: null })
  invitationToken: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true, select: false, default: null })
  invitationTokenExpiry: Date | null;

  @ApiProperty({ example: 'doctor', nullable: true, description: 'Role the admin assigned during invitation' })
  @Column({
    type: 'enum',
    enum: UserRole,
    nullable: true,
    default: null,
    name: 'invited_role',
  })
  invitedRole: UserRole | null;

  @ApiProperty({ example: 'admin-uuid-here', nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  invitedBy: string | null;

  // ─── Timestamps ───────────────────────────────────────────────────────────

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
