import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prescription, PrescriptionStatus } from '../doctor/entities/prescription.entity';
import { UsersService } from '../users/users.service';

function formatOrdinalDate(date: Date): string {
  if (!date) return '';
  const d = new Date(date);
  const day = d.getDate();
  const j = day % 10, k = day % 100;
  let suffix = 'th';
  if (j === 1 && k !== 11) suffix = 'st';
  else if (j === 2 && k !== 12) suffix = 'nd';
  else if (j === 3 && k !== 13) suffix = 'rd';
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${day}${suffix} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTableDate(date: Date): string {
  if (!date) return '';
  const d = new Date(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${day} ${month}, ${year}, ${hours}:${minutes} ${ampm}`;
}

@Injectable()
export class PatientService {
  private readonly logger = new Logger(PatientService.name);

  constructor(
    @InjectRepository(Prescription)
    private readonly prescriptionRepo: Repository<Prescription>,

    private readonly usersService: UsersService,
  ) {}

  // ─── Patient Dashboard ───────────────────────────────────────────────────

  async getDashboard(patientId: string) {
    const patient = await this.usersService.findById(patientId);
    if (!patient) throw new NotFoundException('Patient not found');

    const prescriptions = await this.prescriptionRepo.find({
      where: { patientId },
      order: { createdAt: 'DESC' },
    });

    // Auto-complete any prescriptions whose duration has elapsed
    for (const rx of prescriptions) {
      if (
        (rx.status === PrescriptionStatus.ACTIVE || rx.status === PrescriptionStatus.DISPENSED) &&
        this.isPrescriptionDurationCompleted(rx)
      ) {
        rx.status = PrescriptionStatus.COMPLETED;
        await this.prescriptionRepo.save(rx);
      }
    }

    const pending = prescriptions.filter(
      (p) =>
        p.status === PrescriptionStatus.PENDING ||
        p.status === PrescriptionStatus.AWAITING_CLARIFICATION ||
        p.status === PrescriptionStatus.CLARIFIED,
    ).length;
    const active = prescriptions.filter(
      (p) =>
        p.status === PrescriptionStatus.ACTIVE ||
        p.status === PrescriptionStatus.DISPENSED,
    ).length;
    const discontinued = prescriptions.filter(
      (p) => p.status === PrescriptionStatus.DISCONTINUED,
    ).length;
    const completed = prescriptions.filter(
      (p) => p.status === PrescriptionStatus.COMPLETED,
    ).length;
    const total = prescriptions.length;

    // Active prescriptions cards (matching Figma design)
    const activeList = prescriptions
      .filter((p) => p.status === PrescriptionStatus.ACTIVE || p.status === PrescriptionStatus.DISPENSED)
      .map((p) => ({
        id: p.id,
        medicationTitle: p.dosage ? `${p.medicationName} ${p.dosage}` : p.medicationName,
        medicationName: p.medicationName,
        dosage: p.dosage,
        frequency: p.frequency,
        duration: p.duration,
        reason: p.reason,
        status: 'Active',
        doctorName: p.doctorName,
        date: formatOrdinalDate(p.createdAt),
        createdAt: p.createdAt ? (typeof p.createdAt === 'string' ? p.createdAt : p.createdAt.toISOString()) : null,
        instructions: p.instructions,
        doseAndFrequency: p.doseAndFrequency || (p.frequency && p.dosage ? `${p.dosage}, ${p.frequency}` : p.dosage || p.frequency),
      }));

    // Diagnoses list (matching Figma Diagnoses table)
    const diagnoses = prescriptions
      .filter((p) => Boolean(p.reason && p.reason.trim()))
      .map((p) => ({
        id: p.id,
        diagnosis: p.reason,
        firstRecorded: p.createdAt ? (typeof p.createdAt === 'string' ? p.createdAt : p.createdAt.toISOString()) : null,
        formattedFirstRecorded: formatTableDate(p.createdAt),
        treatedWith: p.medicationName,
        status:
          p.status === PrescriptionStatus.ACTIVE ||
          p.status === PrescriptionStatus.DISPENSED ||
          p.status === PrescriptionStatus.PENDING ||
          p.status === PrescriptionStatus.AWAITING_CLARIFICATION ||
          p.status === PrescriptionStatus.CLARIFIED
            ? 'active'
            : 'Past treatment',
        displayStatus:
          p.status === PrescriptionStatus.ACTIVE ||
          p.status === PrescriptionStatus.DISPENSED ||
          p.status === PrescriptionStatus.PENDING ||
          p.status === PrescriptionStatus.AWAITING_CLARIFICATION ||
          p.status === PrescriptionStatus.CLARIFIED
            ? 'Current treatment'
            : 'Past treatment',
        rawStatus: p.status,
        date: p.createdAt,
      }));

    // Normalized prescriptions list for counts & cards
    const normalizedPrescriptions = prescriptions.map((p) => ({
      id: p.id,
      medicationName: p.medicationName,
      dosage: p.dosage,
      frequency: p.frequency,
      duration: p.duration,
      reason: p.reason,
      doctorName: p.doctorName,
      status:
        p.status === PrescriptionStatus.ACTIVE || p.status === PrescriptionStatus.DISPENSED
          ? 'active'
          : p.status === PrescriptionStatus.DISCONTINUED
          ? 'discontinued'
          : p.status === PrescriptionStatus.COMPLETED
          ? 'completed'
          : 'pending',
      rawStatus: p.status,
      createdAt: p.createdAt ? (typeof p.createdAt === 'string' ? p.createdAt : p.createdAt.toISOString()) : null,
    }));

    return {
      patient: {
        id: patient.id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        gender: patient.gender,
        age: patient.age,
        hospitalName: patient.hospitalName,
      },
      stats: {
        pending,
        pendingPrescriptions: pending,
        active,
        activePrescriptions: active,
        all: total,
        allPrescriptions: total,
        total,
        discontinued,
        discontinuedPrescriptions: discontinued,
      },
      prescriptions: normalizedPrescriptions,
      activePrescriptions: activeList,
      diagnoses,
    };
  }

  // ─── Get Prescriptions ───────────────────────────────────────────────────

  async getPrescriptions(patientId: string, status?: string) {
    const patient = await this.usersService.findById(patientId);
    if (!patient) throw new NotFoundException('Patient not found');

    const s = (status || '').trim().toLowerCase();

    let prescriptions = await this.prescriptionRepo.find({
      where: { patientId },
      order: { createdAt: 'DESC' },
    });

    if (s && s !== 'all') {
      prescriptions = prescriptions.filter((p) => p.status.toLowerCase() === s);
    }

    return prescriptions.map((p) => ({
      id: p.id,
      medicationTitle: p.dosage ? `${p.medicationName} ${p.dosage}` : p.medicationName,
      medicationName: p.medicationName,
      dosage: p.dosage,
      frequency: p.frequency,
      duration: p.duration,
      reason: p.reason,
      status: p.status,
      doctorName: p.doctorName,
      pharmacistName: p.pharmacistName,
      instructions: p.instructions,
      doseAndFrequency: p.doseAndFrequency,
      date: formatOrdinalDate(p.createdAt),
      formattedDate: formatTableDate(p.createdAt),
      createdAt: p.createdAt,
    }));
  }

  // ─── Get Single Prescription Details ──────────────────────────────────────

  async getPrescriptionDetails(patientId: string, prescriptionId: string) {
    const rx = await this.prescriptionRepo.findOne({
      where: { id: prescriptionId, patientId },
    });
    if (!rx) throw new NotFoundException('Prescription not found');

    return {
      ...rx,
      medicationTitle: rx.dosage ? `${rx.medicationName} ${rx.dosage}` : rx.medicationName,
      date: formatOrdinalDate(rx.createdAt),
      formattedDate: formatTableDate(rx.createdAt),
    };
  }

  // ─── Get Diagnoses ───────────────────────────────────────────────────────

  async getDiagnoses(patientId: string) {
    const prescriptions = await this.prescriptionRepo.find({
      where: { patientId },
      order: { createdAt: 'DESC' },
    });

    return prescriptions
      .filter((p) => Boolean(p.reason && p.reason.trim()))
      .map((p) => ({
        id: p.id,
        diagnosis: p.reason,
        firstRecorded: formatTableDate(p.createdAt),
        treatedWith: p.medicationName,
        status:
          p.status === PrescriptionStatus.ACTIVE || p.status === PrescriptionStatus.PENDING
            ? 'Current treatment'
            : 'Past treatment',
        rawStatus: p.status,
        date: p.createdAt,
      }));
  }

  // ─── Get Patient Profile ──────────────────────────────────────────────────

  async getProfile(patientId: string) {
    const patient = await this.usersService.findById(patientId);
    if (!patient) throw new NotFoundException('Patient not found');

    return {
      id: patient.id,
      name: patient.name,
      email: patient.email,
      phone: patient.phone,
      gender: patient.gender,
      age: patient.age,
      hospitalName: patient.hospitalName,
      role: patient.role,
      isEmailVerified: patient.isEmailVerified,
      createdAt: patient.createdAt,
    };
  }

  // ─── Complete Prescription (Patient marks medicine finished) ─────────────

  async completePrescription(patientId: string, prescriptionId: string) {
    const rx = await this.prescriptionRepo.findOne({
      where: { id: prescriptionId, patientId },
    });
    if (!rx) throw new NotFoundException('Prescription not found');

    rx.status = PrescriptionStatus.COMPLETED;
    const saved = await this.prescriptionRepo.save(rx);

    this.logger.log(`Patient [${patientId}] finished medication [${rx.id}] (${rx.medicationName})`);

    return {
      message: 'Medication marked as completed and moved out of active medications',
      prescription: {
        ...saved,
        date: formatOrdinalDate(saved.updatedAt || saved.createdAt),
      },
    };
  }

  // ─── Helper: Check duration expiry ───────────────────────────────────────

  isPrescriptionDurationCompleted(rx: Prescription): boolean {
    if (
      rx.status !== PrescriptionStatus.ACTIVE &&
      rx.status !== PrescriptionStatus.DISPENSED
    ) {
      return false;
    }
    if (!rx.duration) return false;
    const dur = rx.duration.trim().toLowerCase();
    if (dur === 'ongoing' || dur === 'as directed') return false;

    let days = 0;
    const dayMatch = dur.match(/^(\d+)\s*day/i);
    if (dayMatch) {
      days = parseInt(dayMatch[1], 10);
    } else {
      const weekMatch = dur.match(/^(\d+)\s*week/i);
      if (weekMatch) {
        days = parseInt(weekMatch[1], 10) * 7;
      } else {
        const monthMatch = dur.match(/^(\d+)\s*month/i);
        if (monthMatch) {
          days = parseInt(monthMatch[1], 10) * 30;
        }
      }
    }

    if (days <= 0) return false;

    const start = rx.updatedAt || rx.createdAt;
    if (!start) return false;
    const startTime = new Date(start).getTime();
    const elapsed = Date.now() - startTime;
    return elapsed >= days * 24 * 60 * 60 * 1000;
  }
}
