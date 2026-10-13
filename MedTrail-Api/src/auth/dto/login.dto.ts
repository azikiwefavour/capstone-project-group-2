import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { UserRole } from '../../users/entities/user.entity';

export class LoginDto {
  @ApiProperty({ example: 'john@example.com' })
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
  })
  @IsEnum(UserRole)
  role: UserRole;
}
