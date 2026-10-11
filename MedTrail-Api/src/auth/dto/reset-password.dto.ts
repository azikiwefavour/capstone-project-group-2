import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '192837', description: 'The verified 6-digit OTP' })
  @IsString()
  @Length(6, 6)
  otp: string;

  @ApiProperty({ example: 'NewPassword@456' })
  @IsString()
  @MinLength(8)
  @Matches(/(?=.*[A-Z])/, { message: 'Must contain at least 1 uppercase letter' })
  @Matches(/(?=.*\d)/, { message: 'Must contain at least 1 number' })
  @Matches(/(?=.*[^A-Za-z0-9])/, { message: 'Must contain at least 1 special character' })
  newPassword: string;
}
