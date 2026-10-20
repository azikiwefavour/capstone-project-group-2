import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Prescription, PrescriptionStatus } from './entities/prescription.entity';
import { Activity } from './entities/activity.entity';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CheckDuplicateDto } from './dto/check-duplicate.dto';
import { ResolveClarificationDto } from './dto/resolve-clarification.dto';
import { ModifyPrescriptionDto } from './dto/modify-prescription.dto';
import { DiscontinuePrescriptionDto } from './dto/discontinue-prescription.dto';
import { ConfirmPrescriptionDto } from './dto/confirm-prescription.dto';

function formatPrescriptionDate(date: Date): string {
  if (!date) return '';
  const d = new Date(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = String(d.getFullYear()).slice(-2);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  return `${day} ${month}, ${year}, ${hours}:${minutes}${ampm}`;
}

function getInitials(name: string): string {
  const clean = name.replace(/^(Mr\.|Mrs\.|Miss\.|Ms\.|Dr\.)\s*/i, '').trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  if (clean.length > 0) {
    const origParts = name.trim().split(/\s+/);
    if (origParts.length >= 2) {
      return `${origParts[0][0]}${origParts[1][0]}`.toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  }
  return 'PT';
}

@Injectable()
export class DoctorService {
  private readonly logger = new Logger(DoctorService.name);

  constructor(
    @InjectRepository(Prescription)
    private readonly prescriptionRepo: Repository<Prescription>,

    @InjectRepository(Activity)
    private readonly activityRepo: Repository<Activity>,

    private readonly usersService: UsersService,
  ) {}

  // ─── Doctor Dashboard ─────────────────────────────────────────────────────

  async getDashboard(doctorId: string) {
    const doctor = await this.usersService.findById(doctorId);
    if (!doctor) throw new NotFoundException('Doctor not found');

    const hospitalName = doctor.hospitalName || 'General Hospital';

    await this.seedDemoDataIfEmpty(hospitalName, doctor);

    const hospitalLower = hospitalName.trim().toLowerCase();

    // 1. Hospital patients
    const allUsers = await this.usersService.findAll();
    const hospitalPatients = allUsers.filter(
      (u) =>
        u.role === UserRole.PATIENT &&
        u.hospitalName?.trim().toLowerCase() === hospitalLower,
    );

    // 2. Hospital prescriptions
    const allPrescriptions = await this.prescriptionRepo.find({
      where: { hospitalName: ILike(hospitalName.trim()) },
      order: { createdAt: 'DESC' },
    });

    const awaitingClarificationCount = allPrescriptions.filter(
      (p) => p.status === PrescriptionStatus.AWAITING_CLARIFICATION,
    ).length;

    // 3. Recent activities
    const recentActivities = await this.activityRepo.find({
      where: { hospitalName: ILike(hospitalName.trim()) },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    // 4. Recent patients
    const recentPatients = hospitalPatients.slice(0, 8).map((p) => {
      const lastPrescription = allPrescriptions.find(
        (rx) => rx.patientId === p.id,
      );
      return {
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        gender: p.gender,
        age: p.age,
        initials: getInitials(p.name),
        lastPrescription: lastPrescription
          ? {
              medicationName: lastPrescription.medicationName,
              date: lastPrescription.createdAt,
              formattedDate: formatPrescriptionDate(lastPrescription.createdAt),
              status: lastPrescription.status,
            }
          : null,
      };
    });

    return {
      doctor: {
        id: doctor.id,
        name: doctor.name,
        email: doctor.email,
        role: doctor.role,
        hospitalName,
      },
      stats: {
        patients: hospitalPatients.length,
        awaitingClarification: awaitingClarificationCount,
        prescriptions: allPrescriptions.length,
      },
      recentPatients,
      recentActivities: recentActivities.map((a) => ({
        id: a.id,
        description: a.description,
        actorName: a.actorName,
        actorRole: a.actorRole,
        actionType: a.actionType,
        targetPatientName: a.targetPatientName,
        createdAt: a.createdAt,
      })),
    };
  }

  // ─── Get Hospital Patients (Search & Filter) ──────────────────────────────

  async getPatients(doctorId: string, query?: string, filter?: string) {
    const doctor = await this.usersService.findById(doctorId);
    if (!doctor) throw new NotFoundException('Doctor not found');

    const hospitalName = doctor.hospitalName || 'General Hospital';

    await this.seedDemoDataIfEmpty(hospitalName, doctor);

    const hospitalLower = hospitalName.trim().toLowerCase();

    const allUsers = await this.usersService.findAll();
    let patients = allUsers.filter(
      (u) =>
        u.role === UserRole.PATIENT &&
        u.hospitalName?.trim().toLowerCase() === hospitalLower,
    );

    const allHospitalPrescriptions = await this.prescriptionRepo.find({
      where: { hospitalName: ILike(hospitalName.trim()) },
      order: { createdAt: 'DESC' },
    });

    let mapped = patients.map((p) => {
      const patientPrescriptions = allHospitalPrescriptions.filter(
        (rx) => rx.patientId === p.id,
      );

      const activeOrPending = patientPrescriptions.filter(
        (rx) =>
          rx.status === PrescriptionStatus.ACTIVE ||
          rx.status === PrescriptionStatus.PENDING,
      );

      const lastPrescription = patientPrescriptions[0] ?? null;

      return {
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        gender: p.gender,
        age: p.age,
        initials: getInitials(p.name),
        hospitalName: p.hospitalName,
        currentMedications: activeOrPending.length,
        currentMedicationsCount: activeOrPending.length,
        totalPrescriptions: patientPrescriptions.length,
        lastPrescription: lastPrescription
          ? {
              medicationName: lastPrescription.medicationName,
              status: lastPrescription.status,
              date: formatPrescriptionDate(lastPrescription.createdAt),
              createdAt: lastPrescription.createdAt,
            }
          : null,
        createdAt: p.createdAt,
      };
    });

    if (query && query.trim() !== '') {
      const q = query.trim().toLowerCase();
      mapped = mapped.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          (p.phone && p.phone.toLowerCase().includes(q)),
      );
    }

    if (filter && filter.trim() !== '' && filter.toLowerCase() !== 'all') {
      const f = filter.trim().toLowerCase();
      if (f === 'active' || f === 'has_active') {
        mapped = mapped.filter((p) => p.currentMedicationsCount > 0);
      } else if (f === 'female') {
        mapped = mapped.filter((p) => p.gender?.toLowerCase() === 'female');
      } else if (f === 'male') {
        mapped = mapped.filter((p) => p.gender?.toLowerCase() === 'male');
      }
    }

    return mapped;
  }

  // ─── Get Patient Details & Medication Tabs ────────────────────────────────

  async getPatientDetails(doctorId: string, patientId: string) {
    const doctor = await this.usersService.findById(doctorId);
    if (!doctor) throw new NotFoundException('Doctor not found');

    const patient = await this.usersService.findById(patientId);
    if (!patient || patient.role !== UserRole.PATIENT) {
      throw new NotFoundException('Patient not found');
    }

    if (
      doctor.hospitalName &&
      patient.hospitalName &&
      doctor.hospitalName.trim().toLowerCase() !== patient.hospitalName.trim().toLowerCase()
    ) {
      throw new NotFoundException('Patient not found in your hospital');
    }

    const prescriptions = await this.prescriptionRepo.find({
      where: { patientId },
      order: { createdAt: 'DESC' },
    });

    const formatRx = (rx: Prescription) => {
      const dose = rx.dosage || '';
      const freq = rx.frequency || '';
      const doseAndFreq = rx.doseAndFrequency || (freq ? `${dose}, ${freq}` : dose);

      return {
        id: rx.id,
        medicationName: rx.medicationName,
        dosage: rx.dosage,
        frequency: rx.frequency,
        doseAndFrequency: doseAndFreq,
        duration: rx.duration,
        reason: rx.reason,
        instructions: rx.instructions,
        status: rx.status,
        prescribedBy: rx.doctorName,
        doctorName: rx.doctorName,
        pharmacistName: rx.pharmacistName,
        clarificationReason: rx.clarificationReason,
        clarificationResponse: rx.clarificationResponse,
        concern: rx.concern,
        discontinueReason: rx.discontinueReason,
        noteToPharmacist: rx.noteToPharmacist,
        date: formatPrescriptionDate(rx.updatedAt || rx.createdAt),
        createdAt: rx.createdAt,
        updatedAt: rx.updatedAt,
      };
    };

    // Current medications = active medications + pending prescriptions awaiting pharmacy approval
    const currentMedications = prescriptions
      .filter(
        (rx) =>
          rx.status === PrescriptionStatus.ACTIVE ||
          rx.status === PrescriptionStatus.PENDING,
      )
      .map(formatRx);

    // Medication history = discontinued, completed, dispensed, awaiting_clarification, clarified, cancelled
    const medicationHistory = prescriptions
      .filter(
        (rx) =>
          rx.status !== PrescriptionStatus.ACTIVE &&
          rx.status !== PrescriptionStatus.PENDING,
      )
      .map(formatRx);

    const formattedAll = prescriptions.map(formatRx);

    return {
      patient: {
        id: patient.id,
        name: patient.name,
        initials: getInitials(patient.name),
        email: patient.email,
        phone: patient.phone,
        gender: patient.gender,
        age: patient.age,
        subtitle: `${patient.age ? patient.age + ' years old • ' : ''}${patient.gender || 'Patient'}`,
        hospitalName: patient.hospitalName,
        createdAt: patient.createdAt,
      },
      currentMedications,
      medicationHistory,
      allPrescriptions: formattedAll,
      currentMedicationsCount: currentMedications.length,
      medicationHistoryCount: medicationHistory.length,
      totalPrescriptions: prescriptions.length,
    };
  }

  // ─── Duplicate Check (MedTrailNG Exact Duplicate Detection) ───────────────

  async checkDuplicate(doctorId: string, dto: CheckDuplicateDto) {
    const doctor = await this.usersService.findById(doctorId);
    if (!doctor) throw new NotFoundException('Doctor not found');

    const patient = await this.usersService.findById(dto.patientId);
    if (!patient || patient.role !== UserRole.PATIENT) {
      throw new NotFoundException('Selected patient does not exist');
    }

    if (
      doctor.hospitalName &&
      patient.hospitalName &&
      doctor.hospitalName.trim().toLowerCase() !== patient.hospitalName.trim().toLowerCase()
    ) {
      throw new NotFoundException('Selected patient does not exist in your hospital');
    }

    const proposedMedName = dto.medicationName.trim().toLowerCase();
    const proposedDose = (dto.dosage || dto.dose || '').trim().toLowerCase();

    const existingPrescriptions = await this.prescriptionRepo.find({
      where: { patientId: dto.patientId },
      order: { createdAt: 'DESC' },
    });

    const activeOrPending = existingPrescriptions.filter(
      (rx) =>
        rx.status === PrescriptionStatus.ACTIVE ||
        rx.status === PrescriptionStatus.PENDING,
    );

    const duplicate = activeOrPending.find((rx) => {
      const rxMedName = rx.medicationName.trim().toLowerCase();
      if (rxMedName === proposedMedName) {
        if (!proposedDose || !rx.dosage) return true;
        return rx.dosage.trim().toLowerCase() === proposedDose;
      }
      return false;
    });

    const inReview = {
      medicationName: dto.medicationName,
      dosage: dto.dosage || dto.dose || '',
      frequency: dto.frequency || '',
      duration: dto.duration || '',
      reason: dto.reason || '',
    };

    if (duplicate) {
      return {
        isDuplicate: true,
        message: 'Duplicate found',
        warningText: 'MedTrailNG checks for exact duplicates only. It supports your decision and does not replace it.',
        inReview,
        existing: {
          id: duplicate.id,
          medicationName: duplicate.medicationName,
          dosage: duplicate.dosage,
          frequency: duplicate.frequency || '',
          duration: duplicate.duration || '',
          reason: duplicate.reason || '',
          status: duplicate.status,
          prescribedBy: duplicate.doctorName,
          date: formatPrescriptionDate(duplicate.createdAt),
          createdAt: duplicate.createdAt,
        },
      };
    }

    return {
      isDuplicate: false,
      message: 'No exact duplicate found',
      warningText: 'MedTrailNG checks for exact duplicates only. It supports your decision and does not replace it.',
      inReview,
      existing: null,
    };
  }

  // ─── Create Prescription ──────────────────────────────────────────────────

  async createPrescription(doctorId: string, dto: CreatePrescriptionDto) {
    const doctor = await this.usersService.findById(doctorId);
    if (!doctor) throw new NotFoundException('Doctor not found');

    const patient = await this.usersService.findById(dto.patientId);
    if (!patient || patient.role !== UserRole.PATIENT) {
      throw new NotFoundException('Selected patient does not exist');
    }

    if (
      doctor.hospitalName &&
      patient.hospitalName &&
      doctor.hospitalName.trim().toLowerCase() !== patient.hospitalName.trim().toLowerCase()
    ) {
      throw new NotFoundException('Selected patient does not exist in your hospital');
    }

    const hospitalName = doctor.hospitalName || patient.hospitalName || 'General Hospital';

    const cleanDoctorName = doctor.name.startsWith('Dr.')
      ? doctor.name
      : `Dr. ${doctor.name}`;

    const dosage = dto.dosage || dto.dose || '';
    const frequency = dto.frequency || null;
    const doseAndFrequency = frequency && dosage ? `${dosage}, ${frequency}` : dosage || frequency || null;

    const prescription = this.prescriptionRepo.create({
      hospitalName,
      patientId: patient.id,
      patientName: patient.name,
      patientEmail: patient.email,
      doctorId: doctor.id,
      doctorName: cleanDoctorName,
      medicationName: dto.medicationName,
      dosage,
      frequency,
      doseAndFrequency,
      duration: dto.duration ?? null,
      reason: dto.reason ?? null,
      instructions: dto.instructions ?? null,
      status: PrescriptionStatus.PENDING,
    });

    const saved = await this.prescriptionRepo.save(prescription);

    const activity = this.activityRepo.create({
      hospitalName,
      actorName: cleanDoctorName,
      actorRole: 'doctor',
      description: `${cleanDoctorName} prescribed medication for ${patient.name}`,
      actionType: 'prescribed',
      targetPatientName: patient.name,
    });
    await this.activityRepo.save(activity);

    this.logger.log(`Prescription created: [${saved.id}] by ${cleanDoctorName} for ${patient.name}`);

    return {
      message: 'Prescription created successfully and sent to pharmacy for review',
      prescription: {
        ...saved,
        date: formatPrescriptionDate(saved.createdAt),
      },
    };
  }

  // ─── Modify Prescription (Image 1 Middle Frame & Image 3/4 Right Frame) ───

  async modifyPrescription(
    doctorId: string,
    prescriptionId: string,
    dto: ModifyPrescriptionDto,
  ) {
    const doctor = await this.usersService.findById(doctorId);
    if (!doctor) throw new NotFoundException('Doctor not found');

    const rx = await this.prescriptionRepo.findOne({
      where: { id: prescriptionId },
    });
    if (!rx) throw new NotFoundException('Prescription not found');

    if (
      doctor.hospitalName &&
      rx.hospitalName &&
      doctor.hospitalName.trim().toLowerCase() !== rx.hospitalName.trim().toLowerCase()
    ) {
      throw new NotFoundException('Prescription not found in your hospital');
    }

    const cleanDoctorName = doctor.name.startsWith('Dr.')
      ? doctor.name
      : `Dr. ${doctor.name}`;

    if (dto.medicationName) rx.medicationName = dto.medicationName;
    if (dto.dosage || dto.dose) rx.dosage = dto.dosage || dto.dose || rx.dosage;
    if (dto.frequency) rx.frequency = dto.frequency;
    if (dto.duration) rx.duration = dto.duration;
    if (dto.reason) rx.reason = dto.reason;
    if (dto.instructions) rx.instructions = dto.instructions;
    if (dto.noteToPharmacist) rx.noteToPharmacist = dto.noteToPharmacist;

    const dose = rx.dosage || '';
    const freq = rx.frequency || '';
    rx.doseAndFrequency = freq && dose ? `${dose}, ${freq}` : dose || freq;

    // If modified while awaiting clarification, resolve the clarification
    if (rx.status === PrescriptionStatus.AWAITING_CLARIFICATION) {
      rx.status = PrescriptionStatus.CLARIFIED;
      rx.clarificationResponse =
        dto.note ||
        dto.noteToPharmacist ||
        `Modified by ${cleanDoctorName}: ${rx.medicationName} (${rx.doseAndFrequency})`;
    }

    const saved = await this.prescriptionRepo.save(rx);

    const activity = this.activityRepo.create({
      hospitalName: rx.hospitalName,
      actorName: cleanDoctorName,
      actorRole: 'doctor',
      description: `${cleanDoctorName} modified prescription for ${rx.patientName}`,
      actionType: 'modified',
      targetPatientName: rx.patientName,
    });
    await this.activityRepo.save(activity);

    this.logger.log(`Prescription [${rx.id}] modified by ${cleanDoctorName}`);

    return {
      message: 'Prescription modified successfully',
      prescription: {
        ...saved,
        date: formatPrescriptionDate(saved.updatedAt || saved.createdAt),
      },
    };
  }

  // ─── Discontinue Prescription (Image 1 Right Frame) ───────────────────────

  async discontinuePrescription(
    doctorId: string,
    prescriptionId: string,
    dto: DiscontinuePrescriptionDto,
  ) {
    const doctor = await this.usersService.findById(doctorId);
    if (!doctor) throw new NotFoundException('Doctor not found');

    const rx = await this.prescriptionRepo.findOne({
      where: { id: prescriptionId },
    });
    if (!rx) throw new NotFoundException('Prescription not found');

    if (
      doctor.hospitalName &&
      rx.hospitalName &&
      doctor.hospitalName.trim().toLowerCase() !== rx.hospitalName.trim().toLowerCase()
    ) {
      throw new NotFoundException('Prescription not found in your hospital');
    }

    const cleanDoctorName = doctor.name.startsWith('Dr.')
      ? doctor.name
      : `Dr. ${doctor.name}`;

    rx.status = PrescriptionStatus.DISCONTINUED;
    rx.discontinueReason = dto.reason;

    const saved = await this.prescriptionRepo.save(rx);

    const activity = this.activityRepo.create({
      hospitalName: rx.hospitalName,
      actorName: cleanDoctorName,
      actorRole: 'doctor',
      description: `${cleanDoctorName} discontinued prescription for ${rx.patientName}`,
      actionType: 'discontinued',
      targetPatientName: rx.patientName,
    });
    await this.activityRepo.save(activity);

    this.logger.log(`Prescription [${rx.id}] discontinued by ${cleanDoctorName}: "${dto.reason}"`);

    return {
      message: 'Prescription discontinued successfully and moved to history',
      prescription: {
        ...saved,
        date: formatPrescriptionDate(saved.updatedAt || saved.createdAt),
      },
    };
  }

  // ─── Get Clarifications List (Image 2 Left Frame) ─────────────────────────

  async getClarifications(doctorId: string) {
    const doctor = await this.usersService.findById(doctorId);
    if (!doctor) throw new NotFoundException('Doctor not found');

    const hospitalName = doctor.hospitalName || 'General Hospital';

    await this.seedDemoDataIfEmpty(hospitalName, doctor);

    const items = await this.prescriptionRepo.find({
      where: {
        hospitalName: ILike(hospitalName.trim()),
        status: PrescriptionStatus.AWAITING_CLARIFICATION,
      },
      order: { updatedAt: 'DESC' },
    });

    return items.map((rx) => ({
      id: rx.id,
      patient: rx.patientName,
      patientName: rx.patientName,
      patientId: rx.patientId,
      initials: getInitials(rx.patientName),
      concern: rx.concern || 'Other',
      sentBy: rx.pharmacistName || 'Pharm. Melissa',
      pharmacistName: rx.pharmacistName || 'Pharm. Melissa',
      status: 'Pending',
      rawStatus: rx.status,
      date: formatPrescriptionDate(rx.updatedAt || rx.createdAt),
      note: rx.clarificationReason,
      medicationName: rx.medicationName,
      dosage: rx.dosage,
      frequency: rx.frequency,
      duration: rx.duration,
      reason: rx.reason,
    }));
  }

  // ─── Get Clarification Details (Image 2 Right Frame) ──────────────────────

  async getClarificationDetails(doctorId: string, prescriptionId: string) {
    const doctor = await this.usersService.findById(doctorId);
    if (!doctor) throw new NotFoundException('Doctor not found');

    const rx = await this.prescriptionRepo.findOne({
      where: { id: prescriptionId },
    });
    if (!rx) throw new NotFoundException('Clarification not found');

    if (
      doctor.hospitalName &&
      rx.hospitalName &&
      doctor.hospitalName.trim().toLowerCase() !== rx.hospitalName.trim().toLowerCase()
    ) {
      throw new NotFoundException('Clarification request not found in your hospital');
    }

    const patient = await this.usersService.findById(rx.patientId);

    const dose = rx.dosage || '';
    const freq = rx.frequency || '';
    const doseAndFreq = rx.doseAndFrequency || (freq && dose ? `${dose}, ${freq}` : dose || freq);

    return {
      patient: patient
        ? {
            id: patient.id,
            name: patient.name,
            initials: getInitials(patient.name),
            subtitle: `${patient.age ? patient.age + ' years old • ' : ''}${patient.gender || 'Patient'}`,
            age: patient.age,
            gender: patient.gender,
            email: patient.email,
            phone: patient.phone,
          }
        : {
            id: rx.patientId,
            name: rx.patientName,
            initials: getInitials(rx.patientName),
            subtitle: 'Patient',
            email: rx.patientEmail,
          },
      clarification: {
        id: rx.id,
        requestedBy: rx.pharmacistName || 'Pharm. Melissa',
        sentBy: rx.pharmacistName || 'Pharm. Melissa',
        concern: rx.concern || 'Other',
        note: rx.clarificationReason || 'The patient...',
        submittedOn: formatPrescriptionDate(rx.updatedAt || rx.createdAt),
        status: 'Pending',
      },
      prescription: {
        id: rx.id,
        medication: rx.medicationName,
        medicationName: rx.medicationName,
        dose: rx.dosage,
        dosage: rx.dosage,
        frequency: rx.frequency,
        doseAndFrequency: doseAndFreq,
        duration: rx.duration,
        reason: rx.reason,
        status: rx.status,
        noteToPharmacist: rx.noteToPharmacist,
        date: formatPrescriptionDate(rx.createdAt),
      },
    };
  }

  // ─── Confirm Prescription (Image 3 Left Frame & Frame 238) ────────────────

  async confirmPrescription(
    doctorId: string,
    prescriptionId: string,
    dto: ConfirmPrescriptionDto,
  ) {
    const doctor = await this.usersService.findById(doctorId);
    if (!doctor) throw new NotFoundException('Doctor not found');

    const rx = await this.prescriptionRepo.findOne({
      where: { id: prescriptionId },
    });
    if (!rx) throw new NotFoundException('Prescription not found');

    if (
      doctor.hospitalName &&
      rx.hospitalName &&
      doctor.hospitalName.trim().toLowerCase() !== rx.hospitalName.trim().toLowerCase()
    ) {
      throw new NotFoundException('Prescription not found in your hospital');
    }

    const cleanDoctorName = doctor.name.startsWith('Dr.')
      ? doctor.name
      : `Dr. ${doctor.name}`;

    rx.status = PrescriptionStatus.CLARIFIED;
    rx.noteToPharmacist = dto.noteToPharmacist || null;
    rx.clarificationResponse =
      dto.noteToPharmacist ||
      dto.response ||
      'Confirmed: prescription stands as written.';

    const saved = await this.prescriptionRepo.save(rx);

    const activity = this.activityRepo.create({
      hospitalName: rx.hospitalName,
      actorName: cleanDoctorName,
      actorRole: 'doctor',
      description: `${cleanDoctorName} confirmed prescription for ${rx.patientName}`,
      actionType: 'confirmed',
      targetPatientName: rx.patientName,
    });
    await this.activityRepo.save(activity);

    this.logger.log(`Prescription [${rx.id}] confirmed by ${cleanDoctorName}`);

    return {
      message: 'Prescription confirmed and sent to pharmacy',
      prescription: {
        ...saved,
        date: formatPrescriptionDate(saved.updatedAt || saved.createdAt),
      },
    };
  }

  // ─── Legacy Resolve Clarification ─────────────────────────────────────────

  async resolveClarification(
    doctorId: string,
    prescriptionId: string,
    dto: ResolveClarificationDto,
  ) {
    return this.confirmPrescription(doctorId, prescriptionId, {
      response: dto.response,
      noteToPharmacist: dto.response,
    });
  }

  // ─── Helper: Seed Demo Patients & Clarifications Matching Figma ───────────

  private async seedDemoDataIfEmpty(hospitalName: string, doctor: any) {
    // Only seed mock data if the hospital is specifically 'General Hospital' or explicitly demo.
    // Real registered hospitals created from scratch should NEVER have mock demo patients auto-seeded!
    if (!hospitalName || hospitalName.trim().toLowerCase() !== 'general hospital') {
      return;
    }

    const jenniferEmail = `jennifer@${hospitalName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
    const existingJennifer = await this.usersService.findByEmail(jenniferEmail);
    if (existingJennifer) {
      return;
    }

    this.logger.log(`Seeding initial clinical data for hospital "${hospitalName}"...`);

      const demoPatientsData = [
        { name: 'Miss. Jennifer', email: `jennifer@${hospitalName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`, gender: 'Female', age: 34, phone: '08123456789' },
        { name: 'Mr. Alexander', email: `alexander@${hospitalName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`, gender: 'Male', age: 48, phone: '08123456788' },
        { name: 'Miss. Taylor', email: `taylor@${hospitalName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`, gender: 'Female', age: 28, phone: '08123456780' },
        { name: 'Mr. Richardson', email: `richardson@${hospitalName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`, gender: 'Male', age: 45, phone: '08123456781' },
        { name: 'Mr. Collins', email: `collins@${hospitalName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`, gender: 'Male', age: 39, phone: '08123456782' },
        { name: 'Mrs. Elizabeth', email: `elizabeth@${hospitalName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`, gender: 'Female', age: 50, phone: '08123456783' },
        { name: 'Mr. David', email: `david@${hospitalName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`, gender: 'Male', age: 32, phone: '08123456784' },
        { name: 'Miss. Amaka', email: `amaka@${hospitalName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`, gender: 'Female', age: 26, phone: '08123456785' },
        { name: 'Mrs. Josephine', email: `josephine@${hospitalName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`, gender: 'Female', age: 42, phone: '08123456786' },
      ];

      const createdPatients = [];
      for (const p of demoPatientsData) {
        let existing = await this.usersService.findByEmail(p.email);
        if (!existing) {
          existing = await this.usersService.create({
            name: p.name,
            email: p.email,
            phone: p.phone,
            gender: p.gender,
            age: p.age,
            hospitalName,
            role: UserRole.PATIENT,
            isEmailVerified: true,
            invitationStatus: 'accepted',
          });
        }
        createdPatients.push(existing);
      }

      const pJennifer = createdPatients[0];
      const pAlexander = createdPatients[1];
      const pTaylor = createdPatients[2];

      const cleanDoctorName = doctor.name.startsWith('Dr.')
        ? doctor.name
        : `Dr. ${doctor.name}`;

      const sampleRx = [
        // Miss. Jennifer: Active medications
        {
          hospitalName,
          patientId: pJennifer.id,
          patientName: pJennifer.name,
          patientEmail: pJennifer.email,
          doctorId: doctor.id,
          doctorName: 'Dr. Richardson',
          medicationName: 'Pipracillin',
          dosage: '500mg',
          frequency: '3 times daily',
          doseAndFrequency: '500mg, 3 times daily',
          duration: '7 days',
          reason: 'Allergic to penicillin',
          status: PrescriptionStatus.ACTIVE,
          pharmacistName: 'Pharm. Okafor',
        },
        {
          hospitalName,
          patientId: pJennifer.id,
          patientName: pJennifer.name,
          patientEmail: pJennifer.email,
          doctorId: doctor.id,
          doctorName: cleanDoctorName,
          medicationName: 'Amoxicillin',
          dosage: '500mg',
          frequency: '3 times daily',
          doseAndFrequency: '500mg, 3 times daily',
          duration: '7 days',
          reason: 'Bacterial infection',
          status: PrescriptionStatus.ACTIVE,
          pharmacistName: 'Pharm. Okafor',
        },
        // Miss. Jennifer: Clarification (Image 2 Clarifications table row 1)
        {
          hospitalName,
          patientId: pJennifer.id,
          patientName: pJennifer.name,
          patientEmail: pJennifer.email,
          doctorId: doctor.id,
          doctorName: cleanDoctorName,
          medicationName: 'Amoxicillin',
          dosage: '500mg',
          frequency: '3 times daily',
          doseAndFrequency: '500mg, 3 times daily',
          duration: '7 days',
          reason: 'Bacterial infection',
          concern: 'Other',
          status: PrescriptionStatus.AWAITING_CLARIFICATION,
          pharmacistName: 'Pharm. Melissa',
          clarificationReason: 'The patient noted mild penicillin sensitivity in records. Please verify safety or confirm.',
        },
        // Mr. Alexander: Clarification (Image 2 Clarifications table row 2)
        {
          hospitalName,
          patientId: pAlexander.id,
          patientName: pAlexander.name,
          patientEmail: pAlexander.email,
          doctorId: doctor.id,
          doctorName: cleanDoctorName,
          medicationName: 'Lisinopril',
          dosage: '20mg',
          frequency: 'Once daily',
          doseAndFrequency: '20mg, Once daily',
          duration: '30 days',
          reason: 'Hypertension',
          concern: 'Dose',
          status: PrescriptionStatus.AWAITING_CLARIFICATION,
          pharmacistName: 'Pharm. Felix',
          clarificationReason: 'Dose appears high for patient kidney profile. Please confirm.',
        },
        // Miss. Jennifer: Discontinued
        {
          hospitalName,
          patientId: pJennifer.id,
          patientName: pJennifer.name,
          patientEmail: pJennifer.email,
          doctorId: doctor.id,
          doctorName: 'Dr. Richardson',
          medicationName: 'Paracetamol',
          dosage: '500mg',
          frequency: '1 tablet',
          doseAndFrequency: '500mg, 1 tablet',
          duration: '3 days',
          reason: 'Headache',
          discontinueReason: 'Course completed / symptoms resolved',
          status: PrescriptionStatus.DISCONTINUED,
          pharmacistName: 'Pharm. Okafor',
        },
        // Miss. Taylor: Active
        {
          hospitalName,
          patientId: pTaylor.id,
          patientName: pTaylor.name,
          patientEmail: pTaylor.email,
          doctorId: doctor.id,
          doctorName: cleanDoctorName,
          medicationName: 'Metformin',
          dosage: '500mg',
          frequency: 'Once daily',
          doseAndFrequency: '500mg, Once daily',
          duration: '30 days',
          reason: 'Type 2 Diabetes',
          status: PrescriptionStatus.ACTIVE,
          pharmacistName: 'Pharm. Okafor',
        },
      ];

      for (const rx of sampleRx) {
        await this.prescriptionRepo.save(this.prescriptionRepo.create(rx));
      }

      const sampleActivities = [
        { actorName: 'Pharm. Melissa', actorRole: 'pharmacist', description: 'Pharm. Melissa raised clarification to Dr. Adewale', actionType: 'clarification', targetPatientName: 'Miss. Jennifer' },
        { actorName: 'Pharm. Felix', actorRole: 'pharmacist', description: 'Pharm. Felix raised clarification to Dr. Adewale', actionType: 'clarification', targetPatientName: 'Mr. Alexander' },
        { actorName: cleanDoctorName, actorRole: 'doctor', description: `${cleanDoctorName} prescribed medication for Miss. Jennifer`, actionType: 'prescribed', targetPatientName: 'Miss. Jennifer' },
        { actorName: 'Dr. Richardson', actorRole: 'doctor', description: 'Dr. Richardson prescribed medication for Miss. Jennifer', actionType: 'prescribed', targetPatientName: 'Miss. Jennifer' },
      ];

      for (const act of sampleActivities) {
        await this.activityRepo.save(this.activityRepo.create({ ...act, hospitalName }));
      }
  }
}
