import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Param,
  Body,
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
import { DoctorService } from './doctor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CheckDuplicateDto } from './dto/check-duplicate.dto';
import { ModifyPrescriptionDto } from './dto/modify-prescription.dto';
import { DiscontinuePrescriptionDto } from './dto/discontinue-prescription.dto';
import { ConfirmPrescriptionDto } from './dto/confirm-prescription.dto';
import { ResolveClarificationDto } from './dto/resolve-clarification.dto';
import { InvitePatientDto } from '../patient/dto/invite-patient.dto';

@ApiTags('Doctor')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DOCTOR)
@Controller('doctor')
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  // ── GET /api/doctor/dashboard ────────────────────────────────────────────
  @Get('dashboard')
  @ApiOperation({
    summary: 'Get doctor dashboard metrics (doctor only)',
    description:
      'Returns stats for the doctor hospital (patients count, prescriptions awaiting clarification, total prescriptions), along with recent patients and recent activities.',
  })
  @ApiResponse({ status: 200, description: 'Doctor dashboard data' })
  @ApiResponse({ status: 403, description: 'Forbidden – doctor only' })
  getDashboard(@CurrentUser() user: { sub: string }) {
    return this.doctorService.getDashboard(user.sub);
  }

  // ── GET /api/doctor/patients ─────────────────────────────────────────────
  @Get('patients')
  @ApiOperation({ summary: 'List all patients in the doctor hospital with search and filter' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by patient name, email, or phone' })
  @ApiQuery({ name: 'filter', required: false, description: 'Filter by active status (e.g. "active", "all", "female", "male")' })
  @ApiResponse({ status: 200, description: 'Array of hospital patients with current medication counts' })
  getPatients(
    @CurrentUser() user: { sub: string },
    @Query('search') search?: string,
    @Query('filter') filter?: string,
  ) {
    return this.doctorService.getPatients(user.sub, search, filter);
  }

  // ── GET /api/doctor/patients/:id ─────────────────────────────────────────
  @Get('patients/:id')
  @ApiOperation({ summary: 'Get patient profile, current medications (active + pending), and medication history' })
  @ApiResponse({ status: 200, description: 'Patient details and categorized medications' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  getPatientDetails(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
  ) {
    return this.doctorService.getPatientDetails(user.sub, id);
  }

  // ── POST /api/doctor/patients ────────────────────────────────────────────
  @Post('patients')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Doctor adds / invites a patient to their hospital' })
  @ApiResponse({ status: 201, description: 'Patient invited successfully' })
  @ApiResponse({ status: 409, description: 'Patient already exists' })
  invitePatient(
    @CurrentUser() user: { sub: string },
    @Body() dto: InvitePatientDto,
  ) {
    return this.doctorService.invitePatient(user.sub, dto);
  }

  // ── POST /api/doctor/prescriptions/check-duplicate ───────────────────────
  @Post('prescriptions/check-duplicate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check if proposed prescription is an exact duplicate of an existing active/pending medication (Frame 38/39)',
    description: 'Checks patient existing active and pending prescriptions. If duplicate found, returns comparison cards ("in review" vs "existing") for review.',
  })
  @ApiResponse({ status: 200, description: 'Duplicate check result' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  checkDuplicate(
    @CurrentUser() user: { sub: string },
    @Body() dto: CheckDuplicateDto,
  ) {
    return this.doctorService.checkDuplicate(user.sub, dto);
  }

  // ── POST /api/doctor/prescriptions ───────────────────────────────────────
  @Post('prescriptions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Prescribe medication to a patient (queued as pending for pharmacy review)' })
  @ApiResponse({ status: 201, description: 'Prescription created and queued for pharmacy' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  createPrescription(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreatePrescriptionDto,
  ) {
    return this.doctorService.createPrescription(user.sub, dto);
  }

  // ── PATCH /api/doctor/prescriptions/:id ──────────────────────────────────
  @Patch('prescriptions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Modify an existing prescription (Figma Frame: Modify Prescription)' })
  @ApiResponse({ status: 200, description: 'Prescription modified successfully' })
  @ApiResponse({ status: 404, description: 'Prescription not found' })
  modifyPrescription(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: ModifyPrescriptionDto,
  ) {
    return this.doctorService.modifyPrescription(user.sub, id, dto);
  }

  // ── PUT /api/doctor/prescriptions/:id (Alias) ────────────────────────────
  @Put('prescriptions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Modify an existing prescription (Alias for PATCH)' })
  modifyPrescriptionPut(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: ModifyPrescriptionDto,
  ) {
    return this.doctorService.modifyPrescription(user.sub, id, dto);
  }

  // ── POST /api/doctor/prescriptions/:id/discontinue ───────────────────────
  @Post('prescriptions/:id/discontinue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Discontinue a medication with reason/note (Figma Frame: Discontinue prescription)' })
  @ApiResponse({ status: 200, description: 'Prescription discontinued and moved to medication history' })
  @ApiResponse({ status: 404, description: 'Prescription not found' })
  discontinuePrescription(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: DiscontinuePrescriptionDto,
  ) {
    return this.doctorService.discontinuePrescription(user.sub, id, dto);
  }

  // ── GET /api/doctor/clarifications ───────────────────────────────────────
  @Get('clarifications')
  @ApiOperation({ summary: 'List prescriptions flagged by pharmacy awaiting doctor clarification (Figma: Clarifications table)' })
  @ApiResponse({ status: 200, description: 'List of prescriptions awaiting clarification' })
  getClarifications(@CurrentUser() user: { sub: string }) {
    return this.doctorService.getClarifications(user.sub);
  }

  // ── GET /api/doctor/clarifications/:id ───────────────────────────────────
  @Get('clarifications/:id')
  @ApiOperation({ summary: 'Get details for a single clarification (Figma: Clarifications > Patient Detail View)' })
  @ApiResponse({ status: 200, description: 'Clarification details, patient header, and prescription info' })
  @ApiResponse({ status: 404, description: 'Clarification not found' })
  getClarificationDetails(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
  ) {
    return this.doctorService.getClarificationDetails(user.sub, id);
  }

  // ── POST /api/doctor/clarifications/:id/confirm ──────────────────────────
  @Post('clarifications/:id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Doctor confirms prescription stands as written (Figma Frame 238: Confirm prescription)' })
  @ApiResponse({ status: 200, description: 'Prescription confirmed and sent to pharmacy' })
  @ApiResponse({ status: 404, description: 'Prescription not found' })
  confirmPrescription(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: ConfirmPrescriptionDto,
  ) {
    return this.doctorService.confirmPrescription(user.sub, id, dto);
  }

  // ── PATCH /api/doctor/clarifications/:id/modify ──────────────────────────
  @Patch('clarifications/:id/modify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Doctor modifies prescription in response to pharmacy clarification (Figma: Modify prescription)' })
  @ApiResponse({ status: 200, description: 'Prescription modified and returned to pharmacy' })
  @ApiResponse({ status: 404, description: 'Prescription not found' })
  modifyClarification(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: ModifyPrescriptionDto,
  ) {
    return this.doctorService.modifyPrescription(user.sub, id, dto);
  }

  // ── POST /api/doctor/clarifications/:id/resolve ──────────────────────────
  @Post('clarifications/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Legacy resolve clarification endpoint' })
  resolveClarification(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: ResolveClarificationDto,
  ) {
    return this.doctorService.resolveClarification(user.sub, id, dto);
  }
}
