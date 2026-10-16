import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';

export class CompleteRegistrationDto {
  @ApiProperty({
    example: 'abc123-token-here',
    description: 'The invitation token received via email link',
  })
  @IsString()
  @IsNotEmpty({ message: 'Invitation token is required' })
  token: string;

  @ApiProperty({
    example: 'Password@123',
    description: 'Min 8 chars, at least 1 uppercase, 1 number, 1 special character',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/(?=.*[A-Z])/, { message: 'Password must contain at least 1 uppercase letter' })
  @Matches(/(?=.*\d)/, { message: 'Password must contain at least 1 number' })
  @Matches(/(?=.*[^A-Za-z0-9])/, { message: 'Password must contain at least 1 special character' })
  password: string;

  @ApiProperty({
    example: 'Password@123',
    description: 'Must match the password field',
  })
  @IsString()
  @IsNotEmpty({ message: 'Confirm password is required' })
  confirmPassword: string;
}
