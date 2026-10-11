import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type UserDocument = User & Document;

export enum UserRole {
  DOCTOR = 'doctor',
  PHARMACIST = 'pharmacist',
  PATIENT = 'patient',
  ADMIN = 'admin',
}

@Schema({ timestamps: true })
export class User {
  @ApiProperty({ example: 'John Doe' })
  @Prop({ required: true, trim: true })
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @ApiProperty({ example: '+2348123456789' })
  @Prop({ required: true })
  phone: string;

  @ApiProperty({ example: 'General Hospital Lagos' })
  @Prop({ required: true, trim: true })
  hospitalName: string;

  @Prop({ required: true, select: false })
  password: string;

  @ApiProperty({ enum: UserRole, example: UserRole.DOCTOR, required: false })
  @Prop({ type: String, enum: UserRole, default: null })
  role: UserRole | null;

  @ApiProperty({ example: false })
  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ type: String, select: false, default: null })
  emailOtp: string | null;

  @Prop({ type: Date, select: false, default: null })
  emailOtpExpiry: Date | null;

  @Prop({ type: String, select: false, default: null })
  resetPasswordOtp: string | null;

  @Prop({ type: Date, select: false, default: null })
  resetPasswordOtpExpiry: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
