import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '../../users/entities/user.entity';

export class LoginDto {
  @ApiProperty({ example: 'john@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password@123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.DOCTOR,
    description: 'Role selected on the role selection screen',
    required: false,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}

