import {
  Controller,
  Get,
  Post,
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
import { ResolveClarificationDto } from './dto/resolve-clarification.dto';

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
  @ApiOperation({ summary: 'List all patients in the doctor hospital' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by patient name, email, or phone' })
  @ApiResponse({ status: 200, description: 'Array of hospital patients' })
  getPatients(
    @CurrentUser() user: { sub: string },
    @Query('search') search?: string,
  ) {
    return this.doctorService.getPatients(user.sub, search);
  }

  // ── GET /api/doctor/patients/:id ─────────────────────────────────────────
  @Get('patients/:id')
  @ApiOperation({ summary: 'Get patient profile and full medication/prescription history' })
  @ApiResponse({ status: 200, description: 'Patient details and past prescriptions' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  getPatientDetails(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
  ) {
    return this.doctorService.getPatientDetails(user.sub, id);
  }

  // ── POST /api/doctor/prescriptions ───────────────────────────────────────
  @Post('prescriptions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Prescribe medication to a patient (sent to pharmacy for review)' })
  @ApiResponse({ status: 201, description: 'Prescription created and queued for pharmacy' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  createPrescription(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreatePrescriptionDto,
  ) {
    return this.doctorService.createPrescription(user.sub, dto);
  }

  // ── GET /api/doctor/clarifications ───────────────────────────────────────
  @Get('clarifications')
  @ApiOperation({ summary: 'List prescriptions flagged by pharmacy awaiting doctor clarification' })
  @ApiResponse({ status: 200, description: 'List of prescriptions awaiting clarification' })
  getClarifications(@CurrentUser() user: { sub: string }) {
    return this.doctorService.getClarifications(user.sub);
  }

  // ── POST /api/doctor/clarifications/:id/resolve ──────────────────────────
  @Post('clarifications/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Doctor resolves a pharmacy clarification query' })
  @ApiResponse({ status: 200, description: 'Clarification resolved and returned to pharmacy' })
  @ApiResponse({ status: 400, description: 'Invalid state or missing response' })
  @ApiResponse({ status: 404, description: 'Prescription not found' })
  resolveClarification(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: ResolveClarificationDto,
  ) {
    return this.doctorService.resolveClarification(user.sub, id, dto);
  }
}
