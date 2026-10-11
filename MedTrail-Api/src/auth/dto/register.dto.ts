import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'John Doe', description: 'Your full name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+2348123456789', description: 'Nigerian phone number' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'General Hospital Lagos' })
  @IsString()
  @IsNotEmpty()
  hospitalName: string;

  @ApiProperty({
    example: 'Password@123',
    description:
      'Min 8 chars, at least 1 uppercase, 1 number, 1 special character',
  })
  @IsString()
  @MinLength(8)
  @Matches(/(?=.*[A-Z])/, { message: 'Must contain at least 1 uppercase letter' })
  @Matches(/(?=.*\d)/, { message: 'Must contain at least 1 number' })
  @Matches(/(?=.*[^A-Za-z0-9])/, { message: 'Must contain at least 1 special character' })
  password: string;
}
