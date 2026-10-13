import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Auth')
@UseGuards(JwtAuthGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── POST /api/auth/register ─────────────────────────────────────────────
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new account',
    description:
      'Creates a new user and sends a 6-digit OTP to the provided email for verification.',
  })
  @ApiResponse({ status: 201, description: 'Account created – OTP sent to email' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // ── POST /api/auth/verify-email ─────────────────────────────────────────
  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email with OTP',
    description: 'Submit the 6-digit code sent to the user\'s email after registration.',
  })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  @ApiResponse({ status: 404, description: 'Email not found' })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  // ── POST /api/auth/resend-email-otp ─────────────────────────────────────
  @Public()
  @Post('resend-email-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend email verification OTP',
    description: 'Sends a fresh 6-digit OTP to the email if the previous one expired.',
  })
  @ApiResponse({ status: 200, description: 'New OTP sent' })
  @ApiResponse({ status: 400, description: 'Email already verified' })
  @ApiResponse({ status: 404, description: 'Email not found' })
  resendEmailOtp(@Body() body: { email: string }) {
    return this.authService.resendEmailOtp(body.email);
  }

  // ── POST /api/auth/login ─────────────────────────────────────────────────
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login',
    description:
      'Authenticate with email, password, and selected role. Returns a JWT access token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful – returns accessToken + user object',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials or unverified email' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // ── POST /api/auth/forgot-password ──────────────────────────────────────
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Forgot password – send reset OTP',
    description: 'Sends a 6-digit password reset code to the email if an account exists.',
  })
  @ApiResponse({ status: 200, description: 'Reset code sent (if email exists)' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // ── POST /api/auth/verify-reset-code ─────────────────────────────────────
  @Public()
  @Post('verify-reset-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify password reset OTP',
    description: 'Validates the 6-digit code sent during forgot-password flow.',
  })
  @ApiResponse({ status: 200, description: 'Code verified – proceed to reset password' })
  @ApiResponse({ status: 400, description: 'Invalid or expired code' })
  @ApiResponse({ status: 404, description: 'Email not found' })
  verifyResetCode(@Body() dto: VerifyResetCodeDto) {
    return this.authService.verifyResetCode(dto);
  }

  // ── POST /api/auth/reset-password ────────────────────────────────────────
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password',
    description:
      'Set a new password using the verified OTP. Requires email + otp + newPassword.',
  })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // ── GET /api/auth/profile ─────────────────────────────────────────────────
  @Get('profile')
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Returns the authenticated user\'s profile. Requires Bearer token.',
  })
  @ApiResponse({ status: 200, description: 'User profile object' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@CurrentUser() user: { sub: string }) {
    return this.authService.getProfile(user.sub);
  }
}
