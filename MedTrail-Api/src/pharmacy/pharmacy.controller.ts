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
import { PharmacyService } from './pharmacy.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RaiseClarificationDto } from './dto/raise-clarification.dto';
import { InvitePatientDto } from '../patient/dto/invite-patient.dto';

@ApiTags('Pharmacy')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PHARMACIST, UserRole.ADMIN)
@Controller('pharmacy')
export class PharmacyController {
  constructor(private readonly pharmacyService: PharmacyService) {}

  // ── GET /api/pharmacy/dashboard ──────────────────────────────────────────
  @Get('dashboard')
  @ApiOperation({ summary: 'Get pharmacy dashboard metrics' })
  @ApiResponse({ status: 200, description: 'Pharmacy dashboard summary and counts' })
  getDashboard(@CurrentUser() user: { sub: string }) {
    return this.pharmacyService.getDashboard(user.sub);
  }

  // ── GET /api/pharmacy/prescriptions ──────────────────────────────────────
  @Get('prescriptions')
  @ApiOperation({
    summary: 'Get hospital prescriptions queue (includes pending prescriptions from doctors)',
    description: 'Allows pharmacists to see prescriptions prescribed by doctors in their hospital, filterable by status or patient search.',
  })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status: pending, awaiting_clarification, clarified, dispensed, all' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by patient name or medication name' })
  @ApiResponse({ status: 200, description: 'Array of hospital prescriptions' })
  getPrescriptions(
    @CurrentUser() user: { sub: string },
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.pharmacyService.getPrescriptions(user.sub, status, search);
  }

  // ── POST /api/pharmacy/prescriptions/:id/dispense ────────────────────────
  @Post('prescriptions/:id/dispense')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pharmacist dispenses medication for an approved prescription' })
  @ApiResponse({ status: 200, description: 'Prescription marked as dispensed' })
  @ApiResponse({ status: 400, description: 'Already dispensed' })
  @ApiResponse({ status: 404, description: 'Prescription not found' })
  dispensePrescription(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
  ) {
    return this.pharmacyService.dispensePrescription(user.sub, id);
  }

  // ── POST /api/pharmacy/prescriptions/:id/clarify ─────────────────────────
  @Post('prescriptions/:id/clarify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pharmacist raises clarification/question back to doctor' })
  @ApiResponse({ status: 200, description: 'Clarification query submitted to doctor' })
  @ApiResponse({ status: 404, description: 'Prescription not found' })
  raiseClarification(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: RaiseClarificationDto,
  ) {
    return this.pharmacyService.raiseClarification(user.sub, id, dto);
  }

  // ── GET /api/pharmacy/prescriptions/:id ──────────────────────────────────
  @Get('prescriptions/:id')
  @ApiOperation({ summary: 'Get single prescription details, patient profile, and current medications' })
  @ApiResponse({ status: 200, description: 'Prescription details, patient profile, and current medications' })
  @ApiResponse({ status: 404, description: 'Prescription not found' })
  getPrescriptionDetails(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
  ) {
    return this.pharmacyService.getPrescriptionDetails(user.sub, id);
  }

  // ── POST /api/pharmacy/prescriptions/:id/verify ──────────────────────────
  @Post('prescriptions/:id/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify and dispense prescription' })
  @ApiResponse({ status: 200, description: 'Prescription verified and dispensed' })
  @ApiResponse({ status: 404, description: 'Prescription not found' })
  verifyPrescription(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
  ) {
    return this.pharmacyService.verifyPrescription(user.sub, id);
  }

  // ── POST /api/pharmacy/patients ──────────────────────────────────────────
  @Post('patients')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Pharmacist registers a walk-in patient (supports offline/phone-only patients)' })
  @ApiResponse({ status: 201, description: 'Patient registered successfully and welcome SMS sent' })
  @ApiResponse({ status: 400, description: 'Either phone or email required' })
  @ApiResponse({ status: 409, description: 'Patient already exists' })
  addPatient(
    @CurrentUser() user: { sub: string },
    @Body() dto: InvitePatientDto,
  ) {
    return this.pharmacyService.addPatient(user.sub, dto);
  }
}
