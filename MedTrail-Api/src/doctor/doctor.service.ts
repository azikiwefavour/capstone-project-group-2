import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prescription, PrescriptionStatus } from './entities/prescription.entity';
import { Activity } from './entities/activity.entity';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CheckDuplicateDto } from './dto/check-duplicate.dto';
import { ResolveClarificationDto } from './dto/resolve-clarification.dto';

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
    // E.g. "Jennifer" -> "MJ" if original was "Miss. Jennifer", or first 2 letters
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

    // Ensure initial demo data exists if hospital is fresh
    await this.seedDemoDataIfEmpty(hospitalName, doctor);

    // 1. Hospital patients
    const allUsers = await this.usersService.findAll();
    const hospitalPatients = allUsers.filter(
      (u) =>
        u.role === UserRole.PATIENT &&
        u.hospitalName?.toLowerCase() === hospitalName.toLowerCase(),
    );

    // 2. Hospital prescriptions
    const allPrescriptions = await this.prescriptionRepo.find({
      where: { hospitalName },
      order: { createdAt: 'DESC' },
    });

    const awaitingClarificationCount = allPrescriptions.filter(
      (p) => p.status === PrescriptionStatus.AWAITING_CLARIFICATION,
    ).length;

    // 3. Recent activities
    const recentActivities = await this.activityRepo.find({
      where: { hospitalName },
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

    // Seed demo patients if empty
    await this.seedDemoDataIfEmpty(hospitalName, doctor);

    const allUsers = await this.usersService.findAll();
    let patients = allUsers.filter(
      (u) =>
        u.role === UserRole.PATIENT &&
        u.hospitalName?.toLowerCase() === hospitalName.toLowerCase(),
    );

    // Get all prescriptions for this hospital
    const allHospitalPrescriptions = await this.prescriptionRepo.find({
      where: { hospitalName },
      order: { createdAt: 'DESC' },
    });

    // Map patients with current active/pending medications count
    let mapped = patients.map((p) => {
      const patientPrescriptions = allHospitalPrescriptions.filter(
        (rx) => rx.patientId === p.id,
      );

      // Active or pending approval count
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

    // 1. Search Query Filter (name, email, phone)
    if (query && query.trim() !== '') {
      const q = query.trim().toLowerCase();
      mapped = mapped.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          (p.phone && p.phone.toLowerCase().includes(q)),
      );
    }

    // 2. Category / Status Filter
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

    const prescriptions = await this.prescriptionRepo.find({
      where: { patientId },
      order: { createdAt: 'DESC' },
    });

    // Format prescription row helper
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
        date: formatPrescriptionDate(rx.createdAt),
        createdAt: rx.createdAt,
        updatedAt: rx.updatedAt,
      };
    };

    // Partition into Current medications vs Medication history
    // Current medications = active medications currently taken + pending prescriptions awaiting pharmacy approval
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

    const proposedMedName = dto.medicationName.trim().toLowerCase();
    const proposedDose = (dto.dosage || dto.dose || '').trim().toLowerCase();

    // Look for active or pending prescriptions for this patient
    const existingPrescriptions = await this.prescriptionRepo.find({
      where: { patientId: dto.patientId },
      order: { createdAt: 'DESC' },
    });

    const activeOrPending = existingPrescriptions.filter(
      (rx) =>
        rx.status === PrescriptionStatus.ACTIVE ||
        rx.status === PrescriptionStatus.PENDING,
    );

    // Exact duplicate match: same medication name (and matching dosage if supplied)
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
      status: PrescriptionStatus.PENDING, // Sent to pharmacy for review
    });

    const saved = await this.prescriptionRepo.save(prescription);

    // Record activity
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

  // ─── Get Prescriptions Awaiting Clarification ─────────────────────────────

  async getClarifications(doctorId: string) {
    const doctor = await this.usersService.findById(doctorId);
    if (!doctor) throw new NotFoundException('Doctor not found');

    const hospitalName = doctor.hospitalName || 'General Hospital';

    const items = await this.prescriptionRepo.find({
      where: {
        hospitalName,
        status: PrescriptionStatus.AWAITING_CLARIFICATION,
      },
      order: { updatedAt: 'DESC' },
    });

    return items.map((rx) => ({
      ...rx,
      date: formatPrescriptionDate(rx.createdAt),
    }));
  }

  // ─── Resolve Clarification ────────────────────────────────────────────────

  async resolveClarification(
    doctorId: string,
    prescriptionId: string,
    dto: ResolveClarificationDto,
  ) {
    const doctor = await this.usersService.findById(doctorId);
    if (!doctor) throw new NotFoundException('Doctor not found');

    const rx = await this.prescriptionRepo.findOne({
      where: { id: prescriptionId },
    });
    if (!rx) throw new NotFoundException('Prescription not found');

    if (rx.status !== PrescriptionStatus.AWAITING_CLARIFICATION) {
      throw new BadRequestException('This prescription is not currently awaiting clarification');
    }

    rx.status = PrescriptionStatus.CLARIFIED;
    rx.clarificationResponse = dto.response;
    const updated = await this.prescriptionRepo.save(rx);

    const cleanDoctorName = doctor.name.startsWith('Dr.')
      ? doctor.name
      : `Dr. ${doctor.name}`;

    // Record resolution activity
    const activity = this.activityRepo.create({
      hospitalName: rx.hospitalName,
      actorName: cleanDoctorName,
      actorRole: 'doctor',
      description: `${cleanDoctorName} resolved clarification for ${rx.pharmacistName || 'pharmacy'}`,
      actionType: 'resolved',
      targetPatientName: rx.patientName,
    });
    await this.activityRepo.save(activity);

    this.logger.log(`Clarification resolved: [${rx.id}] by ${cleanDoctorName}`);

    return {
      message: 'Clarification resolved and returned to pharmacy for dispensing',
      prescription: {
        ...updated,
        date: formatPrescriptionDate(updated.createdAt),
      },
    };
  }

  // ─── Helper: Seed Demo Patients Matching Figma ────────────────────────────

  private async seedDemoDataIfEmpty(hospitalName: string, doctor: any) {
    const jenniferEmail = `jennifer@${hospitalName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
    const existingJennifer = await this.usersService.findByEmail(jenniferEmail);

    if (!existingJennifer) {
      this.logger.log(`Seeding initial clinical data for hospital "${hospitalName}"...`);

      // Patients list from Figma Frame "PATIENTS"
      const demoPatientsData = [
        { name: 'Miss. Jennifer', email: `jennifer@${hospitalName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`, gender: 'Female', age: 34, phone: '08123456789' },
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

      const pJennifer = createdPatients[0]; // Miss. Jennifer
      const pTaylor = createdPatients[1];
      const pRichardson = createdPatients[2];

      const cleanDoctorName = doctor.name.startsWith('Dr.')
        ? doctor.name
        : `Dr. ${doctor.name}`;

      // Sample prescriptions matching Figma Frame "PATIENTS DATA" (Miss. Jennifer)
      const sampleRx = [
        // Miss. Jennifer's Active medications
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
        // Miss. Jennifer's Medication History (Discontinued / past)
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
          status: PrescriptionStatus.DISCONTINUED,
          pharmacistName: 'Pharm. Okafor',
        },
        // Other patients
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
        {
          hospitalName,
          patientId: pRichardson.id,
          patientName: pRichardson.name,
          patientEmail: pRichardson.email,
          doctorId: doctor.id,
          doctorName: cleanDoctorName,
          medicationName: 'Lisinopril',
          dosage: '10mg',
          frequency: 'Every morning',
          doseAndFrequency: '10mg, Every morning',
          duration: '30 days',
          reason: 'Hypertension',
          status: PrescriptionStatus.AWAITING_CLARIFICATION,
          clarificationReason: 'Pharmacy query: Patient blood pressure stabilized; verify if dosage reduction is appropriate.',
          pharmacistName: 'Pharm. Okafor',
        },
        {
          hospitalName,
          patientId: pRichardson.id,
          patientName: pRichardson.name,
          patientEmail: pRichardson.email,
          doctorId: doctor.id,
          doctorName: 'Dr. Richardson',
          medicationName: 'Atorvastatin',
          dosage: '20mg',
          frequency: 'Once at night',
          doseAndFrequency: '20mg, Once at night',
          duration: '30 days',
          reason: 'High cholesterol',
          status: PrescriptionStatus.ACTIVE,
          pharmacistName: 'Pharm. Okafor',
        },
      ];

      for (const rx of sampleRx) {
        await this.prescriptionRepo.save(this.prescriptionRepo.create(rx));
      }

      // Sample activities matching Figma layout
      const sampleActivities = [
        { actorName: 'Pharm. Okafor', actorRole: 'pharmacist', description: 'Pharm. Okafor dispensed medication to Miss. Jennifer', actionType: 'dispensed', targetPatientName: 'Miss. Jennifer' },
        { actorName: cleanDoctorName, actorRole: 'doctor', description: `${cleanDoctorName} resolved dispute for Pharm. Okafor`, actionType: 'resolved', targetPatientName: 'Miss. Jennifer' },
        { actorName: 'Pharm. Okafor', actorRole: 'pharmacist', description: `Pharm. Okafor raised clarification to ${cleanDoctorName}`, actionType: 'clarification', targetPatientName: 'Mr. Richardson' },
        { actorName: cleanDoctorName, actorRole: 'doctor', description: `${cleanDoctorName} prescribed medication for Miss. Jennifer`, actionType: 'prescribed', targetPatientName: 'Miss. Jennifer' },
        { actorName: 'Dr. Richardson', actorRole: 'doctor', description: 'Dr. Richardson prescribed medication for Miss. Jennifer', actionType: 'prescribed', targetPatientName: 'Miss. Jennifer' },
      ];

      for (const act of sampleActivities) {
        await this.activityRepo.save(this.activityRepo.create({ ...act, hospitalName }));
      }
    }
  }
}
