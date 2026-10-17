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
import { ResolveClarificationDto } from './dto/resolve-clarification.dto';

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

    // 1. Count hospital patients (users with role 'patient' in this hospital)
    const allUsers = await this.usersService.findAll();
    const hospitalPatients = allUsers.filter(
      (u) =>
        u.role === UserRole.PATIENT &&
        u.hospitalName?.toLowerCase() === hospitalName.toLowerCase(),
    );

    // 2. Count prescriptions in this hospital
    const allPrescriptions = await this.prescriptionRepo.find({
      where: { hospitalName },
      order: { createdAt: 'DESC' },
    });

    const awaitingClarificationCount = allPrescriptions.filter(
      (p) => p.status === PrescriptionStatus.AWAITING_CLARIFICATION,
    ).length;

    // 3. Get recent activities
    const recentActivities = await this.activityRepo.find({
      where: { hospitalName },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    // 4. Recent patients (patients with their latest prescription info if available)
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
        lastPrescription: lastPrescription
          ? {
              medicationName: lastPrescription.medicationName,
              date: lastPrescription.createdAt,
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

  // ─── Get Hospital Patients ────────────────────────────────────────────────

  async getPatients(doctorId: string, query?: string) {
    const doctor = await this.usersService.findById(doctorId);
    if (!doctor) throw new NotFoundException('Doctor not found');

    const hospitalName = doctor.hospitalName || 'General Hospital';
    const allUsers = await this.usersService.findAll();

    let patients = allUsers.filter(
      (u) =>
        u.role === UserRole.PATIENT &&
        u.hospitalName?.toLowerCase() === hospitalName.toLowerCase(),
    );

    if (query && query.trim() !== '') {
      const q = query.trim().toLowerCase();
      patients = patients.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          (p.phone && p.phone.toLowerCase().includes(q)),
      );
    }

    return patients.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      gender: p.gender,
      age: p.age,
      hospitalName: p.hospitalName,
      createdAt: p.createdAt,
    }));
  }

  // ─── Get Patient Details & Medication History ─────────────────────────────

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

    return {
      patient: {
        id: patient.id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        gender: patient.gender,
        age: patient.age,
        hospitalName: patient.hospitalName,
        createdAt: patient.createdAt,
      },
      prescriptions,
      totalPrescriptions: prescriptions.length,
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

    const prescription = this.prescriptionRepo.create({
      hospitalName,
      patientId: patient.id,
      patientName: patient.name,
      patientEmail: patient.email,
      doctorId: doctor.id,
      doctorName: cleanDoctorName,
      medicationName: dto.medicationName,
      dosage: dto.dosage,
      duration: dto.duration ?? null,
      instructions: dto.instructions ?? null,
      status: PrescriptionStatus.PENDING,
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
      prescription: saved,
    };
  }

  // ─── Get Prescriptions Awaiting Clarification ─────────────────────────────

  async getClarifications(doctorId: string) {
    const doctor = await this.usersService.findById(doctorId);
    if (!doctor) throw new NotFoundException('Doctor not found');

    const hospitalName = doctor.hospitalName || 'General Hospital';

    return this.prescriptionRepo.find({
      where: {
        hospitalName,
        status: PrescriptionStatus.AWAITING_CLARIFICATION,
      },
      order: { updatedAt: 'DESC' },
    });
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
      prescription: updated,
    };
  }

  // ─── Helper: Seed Demo Patients & Activities if Hospital is Fresh ─────────

  private async seedDemoDataIfEmpty(hospitalName: string, doctor: any) {
    const rxCount = await this.prescriptionRepo.count({
      where: { hospitalName },
    });

    if (rxCount === 0) {
      this.logger.log(`Seeding initial clinical data for hospital "${hospitalName}"...`);

      // 1. Find or create demo patients for this hospital
      const demoPatientsData = [
        { name: 'Mrs. Josephine', email: `josephine@${hospitalName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`, gender: 'Female', age: 42, phone: '+2348011223344' },
        { name: 'Mr. Frank', email: `frank@${hospitalName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`, gender: 'Male', age: 53, phone: '+2348022334455' },
        { name: 'Mr. Solomon', email: `solomon@${hospitalName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`, gender: 'Male', age: 36, phone: '+2348033445566' },
        { name: 'Grace Adebayo', email: `grace@${hospitalName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`, gender: 'Female', age: 29, phone: '+2348044556677' },
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

      const p1 = createdPatients[0];
      const p2 = createdPatients[1];
      const p3 = createdPatients[2];

      const cleanDoctorName = doctor.name.startsWith('Dr.')
        ? doctor.name
        : `Dr. ${doctor.name}`;

      // 2. Create sample prescriptions matching Figma numbers & statuses
      const sampleRx = [
        {
          hospitalName,
          patientId: p1.id,
          patientName: p1.name,
          patientEmail: p1.email,
          doctorId: doctor.id,
          doctorName: cleanDoctorName,
          medicationName: 'Amoxicillin 500mg',
          dosage: '1 capsule 3x daily',
          duration: '7 days',
          status: PrescriptionStatus.AWAITING_CLARIFICATION,
          clarificationReason: 'Pharmacy question: Patient noted penicillin mild sensitivity in records. Please confirm alternative or verify safety.',
          pharmacistName: 'Pharm. Okafor',
        },
        {
          hospitalName,
          patientId: p1.id,
          patientName: p1.name,
          patientEmail: p1.email,
          doctorId: doctor.id,
          doctorName: cleanDoctorName,
          medicationName: 'Ibuprofen 400mg',
          dosage: '1 tablet twice daily after meals',
          duration: '5 days',
          status: PrescriptionStatus.AWAITING_CLARIFICATION,
          clarificationReason: 'Pharmacy query: Patient has mild gastric discomfort history; consider omeprazole co-prescription.',
          pharmacistName: 'Pharm. Okafor',
        },
        {
          hospitalName,
          patientId: p2.id,
          patientName: p2.name,
          patientEmail: p2.email,
          doctorId: doctor.id,
          doctorName: cleanDoctorName,
          medicationName: 'Metformin 500mg',
          dosage: '1 tablet daily with dinner',
          duration: '30 days',
          status: PrescriptionStatus.DISPENSED,
          pharmacistName: 'Pharm. Okafor',
        },
        {
          hospitalName,
          patientId: p3.id,
          patientName: p3.name,
          patientEmail: p3.email,
          doctorId: doctor.id,
          doctorName: cleanDoctorName,
          medicationName: 'Lisinopril 10mg',
          dosage: '1 tablet every morning',
          duration: '30 days',
          status: PrescriptionStatus.PENDING,
        },
      ];

      for (const rx of sampleRx) {
        await this.prescriptionRepo.save(this.prescriptionRepo.create(rx));
      }

      // 3. Create sample activities matching Figma layout
      const sampleActivities = [
        { actorName: 'Pharm. Okafor', actorRole: 'pharmacist', description: 'Pharm. Okafor dispensed medication to Mrs. Josephine', actionType: 'dispensed', targetPatientName: 'Mrs. Josephine' },
        { actorName: cleanDoctorName, actorRole: 'doctor', description: `${cleanDoctorName} resolved dispute for Pharm. Okafor`, actionType: 'resolved', targetPatientName: 'Mrs. Josephine' },
        { actorName: 'Pharm. Okafor', actorRole: 'pharmacist', description: `Pharm. Okafor raised clarification to ${cleanDoctorName}`, actionType: 'clarification', targetPatientName: 'Mrs. Josephine' },
        { actorName: cleanDoctorName, actorRole: 'doctor', description: `${cleanDoctorName} prescribed medication for Mrs. Josephine`, actionType: 'prescribed', targetPatientName: 'Mrs. Josephine' },
        { actorName: 'Dr. Richardson', actorRole: 'doctor', description: 'Dr. Richardson prescribed medication for Mr. Frank', actionType: 'prescribed', targetPatientName: 'Mr. Frank' },
        { actorName: 'Dr. Richardson', actorRole: 'doctor', description: 'Dr. Richardson prescribed medication for Mr. Solomon', actionType: 'prescribed', targetPatientName: 'Mr. Solomon' },
      ];

      for (const act of sampleActivities) {
        await this.activityRepo.save(this.activityRepo.create({ ...act, hospitalName }));
      }
    }
  }
}
