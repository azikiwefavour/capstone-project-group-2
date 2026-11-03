import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class VerifyResetCodeDto {
  @ApiProperty({ example: 'john@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email: string;

  @ApiProperty({ example: '192837', description: '6-digit password reset OTP' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  otp: string;
}

