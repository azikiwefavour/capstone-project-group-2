import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CompleteRegistrationDto } from './dto/complete-registration.dto';
import { renderAcceptInviteHtml, renderInvalidInviteHtml } from './templates/accept-invite.template';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Auth')
@UseGuards(JwtAuthGuard)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

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

  // ── GET /api/auth/accept-invite ───────────────────────────────────────────
  @Public()
  @Get('accept-invite')
  @ApiOperation({
    summary: 'Validate an invitation token or render the invitation acceptance screen',
    description:
      'If accessed in a web browser (Accept: text/html), renders the interactive "Welcome Dr. [Name]" page where the user can enter and confirm their new password. ' +
      'If accessed by an API client (JSON), returns { valid, name, email, role } to be rendered by the frontend.',
  })
  @ApiQuery({
    name: 'token',
    required: true,
    description: 'The invitation token embedded in the email link',
  })
  @ApiResponse({
    status: 200,
    description: 'Token valid – returns HTML for browsers or JSON for API clients',
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired invitation token' })
  async acceptInvite(
    @Query('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const isHtml = req.headers.accept?.includes('text/html');
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';

    try {
      if (!token) {
        throw new BadRequestException('Invitation token is required.');
      }
      const data = await this.authService.validateInvitationToken(token);

      if (isHtml) {
        return res.redirect(`${frontendUrl}/accept-invite?token=${encodeURIComponent(token)}`);
      }

      return res.status(HttpStatus.OK).json(data);
    } catch (err: any) {
      if (isHtml) {
        return res.redirect(
          `${frontendUrl}/accept-invite?token=${encodeURIComponent(token || '')}&error=${encodeURIComponent(
            err?.message || 'Invalid or expired invitation link',
          )}`,
        );
      }
      return res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: err?.message || 'Invalid or expired invitation token',
        error: 'Bad Request',
      });
    }
  }

  // ── GET /api/auth/validate-invitation (JSON Alias) ─────────────────────────
  @Public()
  @Get('validate-invitation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate invitation token (returns JSON)',
  })
  validateInvitationToken(@Query('token') token: string) {
    return this.authService.validateInvitationToken(token);
  }

  // ── POST /api/auth/complete-registration ──────────────────────────────────
  @Public()
  @Post('complete-registration')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete registration for an invited user (set password)',
    description:
      'Invited doctors/pharmacists submit their new password here. ' +
      'Activates the account, marks email as verified, and returns a JWT for immediate access.',
  })
  @ApiResponse({
    status: 200,
    description: 'Registration complete – returns accessToken + user object',
    schema: {
      example: {
        message: 'Registration complete! Welcome to MedTrail.',
        accessToken: '<jwt>',
        user: {
          id: 'uuid',
          name: 'Dr. Adewale Okafor',
          email: 'adewale@hospital.com',
          role: 'doctor',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid/expired token or passwords do not match' })
  completeRegistration(@Body() dto: CompleteRegistrationDto) {
    return this.authService.completeRegistration(dto);
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

  // ── POST /api/auth/dev-admin-token ─────────────────────────────────────────
  @Public()
  @Post('dev-admin-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtain dev admin access token for local development' })
  devAdminToken() {
    return this.authService.getDevAdminToken();
  }
}
