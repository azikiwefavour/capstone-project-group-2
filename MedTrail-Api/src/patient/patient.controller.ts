import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { PatientService } from './patient.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Patient')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PATIENT, UserRole.ADMIN)
@Controller('patient')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  // ── GET /api/patient/dashboard ───────────────────────────────────────────
  @Get('dashboard')
  @ApiOperation({ summary: 'Get patient dashboard (overview metrics, active prescriptions cards, diagnoses table)' })
  @ApiResponse({ status: 200, description: 'Patient dashboard data matching Figma Patient View' })
  getDashboard(@CurrentUser() user: { sub: string }) {
    return this.patientService.getDashboard(user.sub);
  }

  // ── GET /api/patient/prescriptions ───────────────────────────────────────
  @Get('prescriptions')
  @ApiOperation({ summary: 'List prescriptions for the logged-in patient' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status: active, pending, discontinued, all' })
  @ApiResponse({ status: 200, description: 'List of prescriptions' })
  getPrescriptions(
    @CurrentUser() user: { sub: string },
    @Query('status') status?: string,
  ) {
    return this.patientService.getPrescriptions(user.sub, status);
  }

  // ── GET /api/patient/prescriptions/:id ───────────────────────────────────
  @Get('prescriptions/:id')
  @ApiOperation({ summary: 'Get single prescription details for the patient' })
  @ApiResponse({ status: 200, description: 'Prescription details' })
  @ApiResponse({ status: 404, description: 'Prescription not found' })
  getPrescriptionDetails(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
  ) {
    return this.patientService.getPrescriptionDetails(user.sub, id);
  }

  // ── POST /api/patient/prescriptions/:id/complete ─────────────────────────
  @Post('prescriptions/:id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Patient marks medication treatment as completed / finished' })
  @ApiResponse({ status: 200, description: 'Prescription marked as completed' })
  @ApiResponse({ status: 404, description: 'Prescription not found' })
  completePrescription(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
  ) {
    return this.patientService.completePrescription(user.sub, id);
  }

  // ── GET /api/patient/diagnoses ───────────────────────────────────────────
  @Get('diagnoses')
  @ApiOperation({ summary: 'List patient diagnoses and treatments' })
  @ApiResponse({ status: 200, description: 'List of diagnoses' })
  getDiagnoses(@CurrentUser() user: { sub: string }) {
    return this.patientService.getDiagnoses(user.sub);
  }

  // ── GET /api/patient/profile ─────────────────────────────────────────────
  @Get('profile')
  @ApiOperation({ summary: 'Get patient personal profile' })
  @ApiResponse({ status: 200, description: 'Patient profile' })
  getProfile(@CurrentUser() user: { sub: string }) {
    return this.patientService.getProfile(user.sub);
  }
}
