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
  @Column({ type: 'varchar', length: 50 })
  phone: string;

  @ApiProperty({ example: 'General Hospital Lagos' })
  @Column({ type: 'varchar', length: 255 })
  hospitalName: string;

  @Column({ type: 'varchar', length: 255, select: false })
  password: string;

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

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
