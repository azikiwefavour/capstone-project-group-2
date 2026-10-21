import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Prescription, PrescriptionStatus } from '../doctor/entities/prescription.entity';
import { Activity } from '../doctor/entities/activity.entity';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';
import { RaiseClarificationDto } from './dto/raise-clarification.dto';

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

function formatActivityDate(date: Date): string {
  if (!date) return '';
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${month}/${day}/${year}`;
}

@Injectable()
export class PharmacyService {
  private readonly logger = new Logger(PharmacyService.name);

  constructor(
    @InjectRepository(Prescription)
    private readonly prescriptionRepo: Repository<Prescription>,

    @InjectRepository(Activity)
    private readonly activityRepo: Repository<Activity>,

    private readonly usersService: UsersService,
  ) {}

  // ─── Pharmacy Dashboard ───────────────────────────────────────────────────

  async getDashboard(pharmacistId: string) {
    const pharmacist = await this.usersService.findById(pharmacistId);
    if (!pharmacist) throw new NotFoundException('Pharmacist not found');

    const hospitalName = pharmacist.hospitalName || 'General Hospital';

    await this.seedDemoDataIfEmpty(hospitalName, pharmacist);

    const prescriptions = await this.prescriptionRepo.find({
      where: { hospitalName: ILike(hospitalName.trim()) },
      order: { createdAt: 'DESC' },
    });

    const pending = prescriptions.filter((p) => p.status === PrescriptionStatus.PENDING).length;
    const awaitingClarification = prescriptions.filter(
      (p) => p.status === PrescriptionStatus.AWAITING_CLARIFICATION,
    ).length;
    const dispensed = prescriptions.filter((p) => p.status === PrescriptionStatus.DISPENSED).length;
    const verified = prescriptions.filter(
      (p) =>
        p.status === PrescriptionStatus.DISPENSED ||
        p.status === PrescriptionStatus.CLARIFIED ||
        p.status === PrescriptionStatus.ACTIVE,
    ).length;

    const activities = await this.activityRepo.find({
      where: { hospitalName: ILike(hospitalName.trim()) },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const recent = prescriptions.slice(0, 10).map((rx) => ({
      ...rx,
      patientId: rx.patientId || pharmacist.id,
      date: formatPrescriptionDate(rx.createdAt),
    }));

    // Build recent patients list
    const patientMap = new Map<string, { id: string; name: string; email: string }>();
    for (const rx of prescriptions) {
      if (rx.patientId && !patientMap.has(rx.patientId)) {
        patientMap.set(rx.patientId, {
          id: rx.patientId,
          name: rx.patientName,
          email: rx.patientEmail || '',
        });
      }
    }

    return {
      pharmacist: {
        id: pharmacist.id,
        name: pharmacist.name,
        email: pharmacist.email,
        hospitalName,
      },
      stats: {
        total: prescriptions.length,
        pending,
        awaitingClarification,
        dispensed,
        dispensedMedications: dispensed,
        verified,
        verifiedPrescriptions: verified,
      },
      recentPrescriptions: recent,
      recentPatients: Array.from(patientMap.values()).slice(0, 10),
      recentActivities: activities.map((a) => ({
        id: a.id,
        description: a.description,
        actorName: a.actorName,
        actorRole: a.actorRole,
        actionType: a.actionType,
        targetPatientName: a.targetPatientName,
        date: formatActivityDate(a.createdAt),
        createdAt: a.createdAt,
      })),
    };
  }

  // ─── Get Prescriptions Queue ──────────────────────────────────────────────

  async getPrescriptions(pharmacistId: string, status?: string, search?: string) {
    const pharmacist = await this.usersService.findById(pharmacistId);
    if (!pharmacist) throw new NotFoundException('Pharmacist not found');

    const hospitalName = pharmacist.hospitalName || 'General Hospital';

    await this.seedDemoDataIfEmpty(hospitalName, pharmacist);

    const s = (status || '').trim().toLowerCase();
    const orderDirection = s === 'pending' ? 'ASC' : 'DESC';

    let prescriptions = await this.prescriptionRepo.find({
      where: { hospitalName: ILike(hospitalName.trim()) },
      order: { createdAt: orderDirection },
    });

    if (s && s !== 'all') {
      prescriptions = prescriptions.filter((p) => p.status.toLowerCase() === s);
    }

    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      prescriptions = prescriptions.filter(
        (p) =>
          p.patientName.toLowerCase().includes(q) ||
          p.medicationName.toLowerCase().includes(q) ||
          (p.patientEmail && p.patientEmail.toLowerCase().includes(q)),
      );
    }

    return prescriptions.map((rx) => {
      const dose = rx.dosage || '';
      const freq = rx.frequency || '';
      const doseAndFreq = rx.doseAndFrequency || (freq && dose ? `${dose}, ${freq}` : dose || freq);

      return {
        ...rx,
        patientId: rx.patientId || pharmacist.id,
        doseAndFrequency: doseAndFreq,
        date: formatPrescriptionDate(rx.createdAt),
      };
    });
  }

  // ─── Get Single Prescription Details ───────────────────────────────────────

  async getPrescriptionDetails(pharmacistId: string, prescriptionId: string) {
    const pharmacist = await this.usersService.findById(pharmacistId);
    if (!pharmacist) throw new NotFoundException('Pharmacist not found');

    const rx = await this.prescriptionRepo.findOne({
      where: { id: prescriptionId },
    });
    if (!rx) throw new NotFoundException('Prescription not found');

    const hospitalName = pharmacist.hospitalName || 'General Hospital';
    if (
      pharmacist.hospitalName &&
      rx.hospitalName &&
      pharmacist.hospitalName.trim().toLowerCase() !== rx.hospitalName.trim().toLowerCase()
    ) {
      throw new NotFoundException('Prescription not found in your hospital');
    }

    const patient = rx.patientId ? await this.usersService.findById(rx.patientId) : null;

    // Fetch patient current active & pending medications in this hospital
    const patientMedications = rx.patientId
      ? await this.prescriptionRepo.find({
          where: {
            patientId: rx.patientId,
            hospitalName: ILike(hospitalName.trim()),
          },
          order: { createdAt: 'DESC' },
        })
      : [];

    const dose = rx.dosage || '';
    const freq = rx.frequency || '';
    const doseAndFreq = rx.doseAndFrequency || (freq && dose ? `${dose}, ${freq}` : dose || freq);

    return {
      prescription: {
        ...rx,
        doseAndFrequency: doseAndFreq,
        date: formatPrescriptionDate(rx.createdAt),
      },
      clarification:
        rx.status === PrescriptionStatus.AWAITING_CLARIFICATION ||
        rx.status === PrescriptionStatus.CLARIFIED ||
        rx.clarificationReason ||
        rx.clarificationResponse
          ? {
              concern: rx.concern || 'Other',
              notes: rx.clarificationReason || '',
              response: rx.clarificationResponse || '',
              status: rx.status.toLowerCase(),
            }
          : null,
      patient: {
        id: patient?.id || rx.patientId,
        name: patient?.name || rx.patientName,
        age: patient?.age ?? null,
        gender: patient?.gender || '',
        email: patient?.email || rx.patientEmail || '',
        phone: patient?.phone || '',
      },
      currentMedications: patientMedications.map((m) => ({
        ...m,
        date: formatPrescriptionDate(m.createdAt),
      })),
    };
  }

  // ─── Dispense Prescription ────────────────────────────────────────────────

  async dispensePrescription(pharmacistId: string, prescriptionId: string) {
    const pharmacist = await this.usersService.findById(pharmacistId);
    if (!pharmacist) throw new NotFoundException('Pharmacist not found');

    const rx = await this.prescriptionRepo.findOne({
      where: { id: prescriptionId },
    });
    if (!rx) throw new NotFoundException('Prescription not found');

    if (
      pharmacist.hospitalName &&
      rx.hospitalName &&
      pharmacist.hospitalName.trim().toLowerCase() !== rx.hospitalName.trim().toLowerCase()
    ) {
      throw new NotFoundException('Prescription not found in your hospital');
    }

    if (rx.status === PrescriptionStatus.DISPENSED) {
      throw new BadRequestException('Prescription is already dispensed');
    }

    const cleanPharmName = pharmacist.name.startsWith('Pharm.')
      ? pharmacist.name
      : `Pharm. ${pharmacist.name}`;

    rx.status = PrescriptionStatus.DISPENSED;
    rx.pharmacistId = pharmacist.id;
    rx.pharmacistName = cleanPharmName;

    const saved = await this.prescriptionRepo.save(rx);

    // Record activity
    const activity = this.activityRepo.create({
      hospitalName: rx.hospitalName,
      actorName: cleanPharmName,
      actorRole: 'pharmacist',
      description: `${cleanPharmName} dispensed medication to ${rx.patientName}`,
      actionType: 'dispensed',
      targetPatientName: rx.patientName,
    });
    await this.activityRepo.save(activity);

    this.logger.log(`Prescription [${rx.id}] dispensed by ${cleanPharmName} for ${rx.patientName}`);

    return {
      message: 'Prescription dispensed successfully',
      prescription: {
        ...saved,
        date: formatPrescriptionDate(saved.updatedAt || saved.createdAt),
      },
    };
  }

  // ─── Verify Prescription ──────────────────────────────────────────────────

  async verifyPrescription(pharmacistId: string, prescriptionId: string) {
    // Verifying and dispensing marks prescription as dispensed / verified
    return this.dispensePrescription(pharmacistId, prescriptionId);
  }

  // ─── Raise Clarification to Doctor ────────────────────────────────────────

  async raiseClarification(
    pharmacistId: string,
    prescriptionId: string,
    dto: RaiseClarificationDto,
  ) {
    const pharmacist = await this.usersService.findById(pharmacistId);
    if (!pharmacist) throw new NotFoundException('Pharmacist not found');

    const rx = await this.prescriptionRepo.findOne({
      where: { id: prescriptionId },
    });
    if (!rx) throw new NotFoundException('Prescription not found');

    if (
      pharmacist.hospitalName &&
      rx.hospitalName &&
      pharmacist.hospitalName.trim().toLowerCase() !== rx.hospitalName.trim().toLowerCase()
    ) {
      throw new NotFoundException('Prescription not found in your hospital');
    }

    const cleanPharmName = pharmacist.name.startsWith('Pharm.')
      ? pharmacist.name
      : `Pharm. ${pharmacist.name}`;

    const reason = dto.reason || dto.note || 'Clarification requested by pharmacy';
    const concern = dto.concern || 'Other';

    rx.status = PrescriptionStatus.AWAITING_CLARIFICATION;
    rx.concern = concern;
    rx.clarificationReason = reason;
    rx.clarificationResponse = null;
    rx.pharmacistId = pharmacist.id;
    rx.pharmacistName = cleanPharmName;

    const saved = await this.prescriptionRepo.save(rx);

    // Record activity
    const activity = this.activityRepo.create({
      hospitalName: rx.hospitalName,
      actorName: cleanPharmName,
      actorRole: 'pharmacist',
      description: `${cleanPharmName} raised clarification to ${rx.doctorName}`,
      actionType: 'clarification',
      targetPatientName: rx.patientName,
    });
    await this.activityRepo.save(activity);

    this.logger.log(`Clarification raised for [${rx.id}] by ${cleanPharmName}: "${reason}"`);

    return {
      message: 'Clarification query raised successfully and sent to doctor',
      prescription: {
        ...saved,
        date: formatPrescriptionDate(saved.updatedAt || saved.createdAt),
      },
    };
  }

  // ─── Helper: Seed Demo Patients, Prescriptions & Activities for Hospital ───

  private async seedDemoDataIfEmpty(hospitalName: string, pharmacist: any) {
    if (!hospitalName || hospitalName.trim().toLowerCase() !== 'general hospital') return;

    const existingRx = await this.prescriptionRepo.findOne({
      where: { hospitalName: ILike(hospitalName.trim()) },
    });
    if (existingRx) {
      return;
    }

    this.logger.log(`Seeding initial clinical data for hospital "${hospitalName}"...`);

    const hospitalDomain = hospitalName.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. Seed or find demo doctor
    let doctor = await this.usersService.findByEmail(`dr.adewale@${hospitalDomain}.com`);
    if (!doctor) {
      doctor = await this.usersService.create({
        name: 'Dr. Adewale',
        email: `dr.adewale@${hospitalDomain}.com`,
        phone: '08123456780',
        gender: 'Male',
        age: 44,
        hospitalName,
        role: UserRole.DOCTOR,
        isEmailVerified: true,
        invitationStatus: 'accepted',
      });
    }

    // 2. Seed patients matching Figma
    const demoPatientsData = [
      { name: 'Miss. Jennifer', email: `jennifer@${hospitalDomain}.com`, gender: 'Female', age: 34, phone: '08123456789' },
      { name: 'Mr. Alexander', email: `alexander@${hospitalDomain}.com`, gender: 'Male', age: 48, phone: '08123456788' },
      { name: 'Mrs. Josephine', email: `josephine@${hospitalDomain}.com`, gender: 'Female', age: 42, phone: '08123456786' },
      { name: 'Miss. Taylor', email: `taylor@${hospitalDomain}.com`, gender: 'Female', age: 28, phone: '08123456781' },
      { name: 'Mr. Richardson', email: `richardson@${hospitalDomain}.com`, gender: 'Male', age: 45, phone: '08123456782' },
      { name: 'Mr. Frank', email: `frank@${hospitalDomain}.com`, gender: 'Male', age: 52, phone: '08123456783' },
      { name: 'Mr. Solomon', email: `solomon@${hospitalDomain}.com`, gender: 'Male', age: 40, phone: '08123456784' },
    ];

    const createdPatients: any[] = [];
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
    const pJosephine = createdPatients[2];
    const pTaylor = createdPatients[3];
    const pFrank = createdPatients[5];
    const pSolomon = createdPatients[6];

    const pharmName = pharmacist?.name?.startsWith('Pharm.')
      ? pharmacist.name
      : `Pharm. ${pharmacist?.name || 'Melissa'}`;

    // 3. Seed Prescriptions (Matching Figma designs)
    const sampleRx = [
      // ── Verification Queue: Pending (Unverified) (Figma Image 1 & 2) ──────
      {
        hospitalName,
        patientId: pJennifer.id,
        patientName: pJennifer.name,
        patientEmail: pJennifer.email,
        doctorId: doctor.id,
        doctorName: 'Dr. Adewale',
        medicationName: 'Amoxicillin',
        dosage: '500mg',
        frequency: '3 times daily',
        doseAndFrequency: '500mg, 3 times daily',
        duration: '7 days',
        reason: 'Bacterial Infection',
        instructions: 'Take after meals',
        status: PrescriptionStatus.PENDING,
      },
      {
        hospitalName,
        patientId: pJennifer.id,
        patientName: pJennifer.name,
        patientEmail: pJennifer.email,
        doctorId: doctor.id,
        doctorName: 'Dr. Richardson',
        medicationName: 'Ciprofloxacin',
        dosage: '500mg',
        frequency: '2 times daily',
        doseAndFrequency: '500mg, 2 times daily',
        duration: '5 days',
        reason: 'Fungal infection',
        instructions: 'Drink with plenty of fluids',
        status: PrescriptionStatus.PENDING,
      },
      {
        hospitalName,
        patientId: pAlexander.id,
        patientName: pAlexander.name,
        patientEmail: pAlexander.email,
        doctorId: doctor.id,
        doctorName: 'Dr. Richardson',
        medicationName: 'Amoxicillin',
        dosage: '500mg',
        frequency: '3 times daily',
        doseAndFrequency: '500mg, 3 times daily',
        duration: '7 days',
        reason: 'Bacterial infection',
        instructions: 'Take every 8 hours',
        status: PrescriptionStatus.PENDING,
      },

      // ── Awaiting Clarification (Figma Image 5) ────────────────────────────
      {
        hospitalName,
        patientId: pJennifer.id,
        patientName: pJennifer.name,
        patientEmail: pJennifer.email,
        doctorId: doctor.id,
        doctorName: 'Dr. Adewale',
        medicationName: 'Amoxicillin',
        dosage: '500mg',
        frequency: '3 times daily',
        doseAndFrequency: '500mg, 3 times daily',
        duration: '7 days',
        reason: 'Bacterial Infection',
        concern: 'Other',
        status: PrescriptionStatus.AWAITING_CLARIFICATION,
        pharmacistId: pharmacist?.id || null,
        pharmacistName: pharmName,
        clarificationReason: 'Patient has a history of mild penicillin sensitivity. Waiting for Dr. Adewale to respond.',
      },
      {
        hospitalName,
        patientId: pAlexander.id,
        patientName: pAlexander.name,
        patientEmail: pAlexander.email,
        doctorId: doctor.id,
        doctorName: 'Dr. Adewale',
        medicationName: 'Lisinopril',
        dosage: '20mg',
        frequency: 'Once daily',
        doseAndFrequency: '20mg, Once daily',
        duration: '30 days',
        reason: 'Hypertension',
        concern: 'Dose',
        status: PrescriptionStatus.AWAITING_CLARIFICATION,
        pharmacistId: pharmacist?.id || null,
        pharmacistName: pharmName,
        clarificationReason: 'Starting dose appears high for patient kidney profile. Please confirm.',
      },

      // ── Clarified (Doctor has responded) ──────────────────────────────────
      {
        hospitalName,
        patientId: pTaylor.id,
        patientName: pTaylor.name,
        patientEmail: pTaylor.email,
        doctorId: doctor.id,
        doctorName: 'Dr. Adewale',
        medicationName: 'Metformin',
        dosage: '500mg',
        frequency: 'Once daily',
        doseAndFrequency: '500mg, Once daily',
        duration: '30 days',
        reason: 'Type 2 Diabetes',
        concern: 'Frequency',
        clarificationReason: 'Should this dose be taken with meals or before meals?',
        clarificationResponse: 'Confirmed: Patient tolerates well. Take with meals after food.',
        noteToPharmacist: 'Take with meals after food.',
        status: PrescriptionStatus.CLARIFIED,
        pharmacistId: pharmacist?.id || null,
        pharmacistName: pharmName,
      },

      // ── Dispensed Medications (Figma Image 1) ─────────────────────────────
      {
        hospitalName,
        patientId: pJosephine.id,
        patientName: pJosephine.name,
        patientEmail: pJosephine.email,
        doctorId: doctor.id,
        doctorName: 'Dr. Okafor',
        medicationName: 'Paracetamol',
        dosage: '500mg',
        frequency: '2 tablets',
        doseAndFrequency: '500mg, 2 tablets',
        duration: '3 days',
        reason: 'Headache',
        status: PrescriptionStatus.DISPENSED,
        pharmacistId: pharmacist?.id || null,
        pharmacistName: pharmName,
      },
      {
        hospitalName,
        patientId: pFrank.id,
        patientName: pFrank.name,
        patientEmail: pFrank.email,
        doctorId: doctor.id,
        doctorName: 'Dr. Richardson',
        medicationName: 'Omeprazole',
        dosage: '20mg',
        frequency: 'Once daily',
        doseAndFrequency: '20mg, Once daily',
        duration: '14 days',
        reason: 'Acid reflux',
        status: PrescriptionStatus.DISPENSED,
        pharmacistId: pharmacist?.id || null,
        pharmacistName: pharmName,
      },
      {
        hospitalName,
        patientId: pSolomon.id,
        patientName: pSolomon.name,
        patientEmail: pSolomon.email,
        doctorId: doctor.id,
        doctorName: 'Dr. Richardson',
        medicationName: 'Ibuprofen',
        dosage: '400mg',
        frequency: '3 times daily',
        doseAndFrequency: '400mg, 3 times daily',
        duration: '5 days',
        reason: 'Joint pain',
        status: PrescriptionStatus.DISPENSED,
        pharmacistId: pharmacist?.id || null,
        pharmacistName: pharmName,
      },

      // ── Active Medications (for patient Current Medications list) ─────────
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
        doctorName: 'Dr. Richardson',
        medicationName: 'Amoxicillin',
        dosage: '500mg',
        frequency: '3 times daily',
        doseAndFrequency: '500mg, 3 times daily',
        duration: '7 days',
        reason: 'Bacterial infection',
        status: PrescriptionStatus.ACTIVE,
        pharmacistName: 'Pharm. Okafor',
      },
    ];

    for (const rx of sampleRx) {
      await this.prescriptionRepo.save(this.prescriptionRepo.create(rx));
    }

    // 4. Seed Activities matching Figma Image 1 Left Frame
    const sampleActivities = [
      { actorName: 'Dr. Okafor', actorRole: 'pharmacist', description: 'Dr. Okafor dispensed medication to Mrs. Josephine', actionType: 'dispensed', targetPatientName: 'Mrs. Josephine' },
      { actorName: 'Dr. Adewale', actorRole: 'doctor', description: 'Dr. Adewale resolved dispute for Dr. Okafor', actionType: 'resolved', targetPatientName: 'Mrs. Josephine' },
      { actorName: 'Dr. Okafor', actorRole: 'pharmacist', description: 'Dr. Okafor raised clarification to Dr. Adewale', actionType: 'clarification', targetPatientName: 'Mr. Richardson' },
      { actorName: 'Dr. Adewale', actorRole: 'doctor', description: 'Dr. Adewale prescribed medication for Mrs. Josephine', actionType: 'prescribed', targetPatientName: 'Mrs. Josephine' },
      { actorName: 'Dr. Richardson', actorRole: 'doctor', description: 'Dr. Richardson prescribed medication for Mr. Frank', actionType: 'prescribed', targetPatientName: 'Mr. Frank' },
      { actorName: 'Dr. Richardson', actorRole: 'doctor', description: 'Dr. Richardson prescribed medication for Mr. Solomon', actionType: 'prescribed', targetPatientName: 'Mr. Solomon' },
    ];

    for (const act of sampleActivities) {
      await this.activityRepo.save(this.activityRepo.create({ ...act, hospitalName }));
    }

    this.logger.log(`Clinical data seeded successfully for hospital "${hospitalName}"`);
  }
}
