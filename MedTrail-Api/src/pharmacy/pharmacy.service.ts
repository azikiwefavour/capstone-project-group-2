import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prescription, PrescriptionStatus } from '../doctor/entities/prescription.entity';
import { Activity } from '../doctor/entities/activity.entity';
import { UsersService } from '../users/users.service';
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

    const prescriptions = await this.prescriptionRepo.find({
      where: { hospitalName },
      order: { createdAt: 'DESC' },
    });

    const pending = prescriptions.filter((p) => p.status === PrescriptionStatus.PENDING).length;
    const awaitingClarification = prescriptions.filter(
      (p) => p.status === PrescriptionStatus.AWAITING_CLARIFICATION,
    ).length;
    const dispensed = prescriptions.filter((p) => p.status === PrescriptionStatus.DISPENSED).length;

    const recent = prescriptions.slice(0, 10).map((rx) => ({
      ...rx,
      date: formatPrescriptionDate(rx.createdAt),
    }));

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
      },
      recentPrescriptions: recent,
    };
  }

  // ─── Get Prescriptions Queue ──────────────────────────────────────────────

  async getPrescriptions(pharmacistId: string, status?: string, search?: string) {
    const pharmacist = await this.usersService.findById(pharmacistId);
    if (!pharmacist) throw new NotFoundException('Pharmacist not found');

    const hospitalName = pharmacist.hospitalName || 'General Hospital';

    let prescriptions = await this.prescriptionRepo.find({
      where: { hospitalName },
      order: { createdAt: 'DESC' },
    });

    if (status && status.trim() !== '' && status.toLowerCase() !== 'all') {
      const s = status.trim().toLowerCase();
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

    return prescriptions.map((rx) => ({
      ...rx,
      date: formatPrescriptionDate(rx.createdAt),
    }));
  }

  // ─── Dispense Prescription ────────────────────────────────────────────────

  async dispensePrescription(pharmacistId: string, prescriptionId: string) {
    const pharmacist = await this.usersService.findById(pharmacistId);
    if (!pharmacist) throw new NotFoundException('Pharmacist not found');

    const rx = await this.prescriptionRepo.findOne({
      where: { id: prescriptionId },
    });
    if (!rx) throw new NotFoundException('Prescription not found');

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
        date: formatPrescriptionDate(saved.createdAt),
      },
    };
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

    const cleanPharmName = pharmacist.name.startsWith('Pharm.')
      ? pharmacist.name
      : `Pharm. ${pharmacist.name}`;

    rx.status = PrescriptionStatus.AWAITING_CLARIFICATION;
    rx.clarificationReason = dto.reason;
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

    this.logger.log(`Clarification raised for [${rx.id}] by ${cleanPharmName}: "${dto.reason}"`);

    return {
      message: 'Clarification query raised successfully and sent to doctor',
      prescription: {
        ...saved,
        date: formatPrescriptionDate(saved.createdAt),
      },
    };
  }
}
