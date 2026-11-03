import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  mocked?: boolean;
  error?: string;
}

export interface WelcomePatientSmsParams {
  name: string;
  phone: string;
  hospitalName: string;
  patientCode?: string;
  caregiverPhone?: string;
  caregiverName?: string;
}

export interface PrescriptionSmsParams {
  patientName: string;
  phone: string;
  medicationName: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  prescriberName: string;
  hospitalName: string;
  caregiverPhone?: string;
}

export interface DispensedSmsParams {
  patientName: string;
  phone: string;
  medicationName: string;
  dosage?: string;
  instructions?: string;
  pharmacistName: string;
  hospitalName: string;
  caregiverPhone?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Normalizes a phone number to standard international format without '+' for Termii.
   * Examples:
   *   '08031234567'   -> '2348031234567'
   *   '+2348031234567'-> '2348031234567'
   *   '2348031234567' -> '2348031234567'
   */
  normalizePhoneNumber(rawPhone: string): string {
    if (!rawPhone) return '';
    // Strip non-digit characters
    const digitsOnly = rawPhone.replace(/\D/g, '');

    // Nigerian numbers starting with 0 (e.g. 080...)
    if (digitsOnly.startsWith('0') && digitsOnly.length === 11) {
      return `234${digitsOnly.slice(1)}`;
    }

    // Already has 234 prefix
    if (digitsOnly.startsWith('234')) {
      return digitsOnly;
    }

    return digitsOnly;
  }

  /**
   * Sends an SMS via Termii API or logs a simulated message if API key is absent.
   */
  async sendSms(to: string, message: string): Promise<SendSmsResult> {
    const normalizedTo = this.normalizePhoneNumber(to);
    if (!normalizedTo) {
      this.logger.warn(`Cannot send SMS: invalid phone number "${to}"`);
      return { success: false, error: 'Invalid phone number' };
    }

    const apiKey = this.configService.get<string>('TERMII_API_KEY');
    const senderId = this.configService.get<string>('TERMII_SENDER_ID') || 'MedTrail';
    const channel = this.configService.get<string>('TERMII_CHANNEL') || 'generic';
    const baseUrl = (this.configService.get<string>('TERMII_BASE_URL') || 'https://api.ng.termii.com').replace(/\/+$/, '');

    // If no API key configured, simulate sending (useful for local dev and testing)
    if (!apiKey || apiKey.trim() === '' || apiKey === 'YOUR_TERMII_API_KEY') {
      this.logger.log(
        `\n╔════════════════════════════════════════════════════════════════╗\n` +
        `║ 📱 [MOCK TERMII SMS SENT]                                     ║\n` +
        `║ To: ${normalizedTo.padEnd(58)}║\n` +
        `║ From: ${senderId.padEnd(56)}║\n` +
        `║ Message:                                                      ║\n` +
        `║ ${message.replace(/\n/g, ' ').slice(0, 60).padEnd(62)}║\n` +
        `╚════════════════════════════════════════════════════════════════╝`
      );
      return {
        success: true,
        mocked: true,
        messageId: `mock-${Date.now()}`,
      };
    }

    try {
      const endpoint = `${baseUrl}/api/sms/send`;
      const payload = {
        to: normalizedTo,
        from: senderId,
        sms: message,
        type: 'plain',
        channel: channel,
        api_key: apiKey,
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || (data && data.code && data.code !== 'ok' && !data.message_id)) {
        const errorMsg = data?.message || `HTTP ${response.status} ${response.statusText}`;
        this.logger.error(`Termii SMS failed for ${normalizedTo}: ${errorMsg}`);
        return { success: false, error: errorMsg };
      }

      this.logger.log(`Termii SMS dispatched to ${normalizedTo} (ID: ${data.message_id || 'sent'})`);
      return {
        success: true,
        messageId: data.message_id,
      };
    } catch (err: any) {
      this.logger.error(`Termii SMS exception for ${normalizedTo}: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Welcome SMS sent when an offline / elderly patient is registered by hospital or pharmacy.
   */
  async sendWelcomePatientSms(params: WelcomePatientSmsParams): Promise<void> {
    const { name, phone, hospitalName, patientCode, caregiverPhone, caregiverName } = params;

    const codeText = patientCode ? ` Your MedTrail ID is: ${patientCode}.` : '';
    const patientMessage =
      `Welcome to MedTrail, ${name}! You have been registered at ${hospitalName}.${codeText} ` +
      `Your medication instructions will be sent directly to this phone via SMS.`;

    // 1. Send to patient
    await this.sendSms(phone, patientMessage);

    // 2. If caregiver phone is provided, send notification to caregiver
    if (caregiverPhone && caregiverPhone.trim().length > 0) {
      const caregiverSalutation = caregiverName ? ` ${caregiverName}` : '';
      const caregiverMessage =
        `MedTrail Alert: Hello${caregiverSalutation}, you are registered as caregiver for ${name} ` +
        `at ${hospitalName}.${codeText} You will receive SMS copies of their medication schedules.`;

      await this.sendSms(caregiverPhone, caregiverMessage);
    }
  }

  /**
   * Prescription instructions SMS sent when a doctor prescribes a medication.
   */
  async sendPrescriptionSms(params: PrescriptionSmsParams): Promise<void> {
    const {
      patientName,
      phone,
      medicationName,
      dosage,
      frequency,
      duration,
      instructions,
      prescriberName,
      hospitalName,
      caregiverPhone,
    } = params;

    let text = `MedTrail Rx (${hospitalName})\nPatient: ${patientName}\nDrug: ${medicationName}`;
    if (dosage) text += ` (${dosage})`;
    if (frequency) text += `\nTiming: ${frequency}`;
    if (duration) text += `\nDuration: ${duration}`;
    if (instructions) text += `\nHow to use: ${instructions}`;
    text += `\nPrescribed by: ${prescriberName}.`;

    // Send to patient
    await this.sendSms(phone, text);

    // Also send to caregiver if registered
    if (caregiverPhone && caregiverPhone.trim().length > 0) {
      const caregiverNotice = `[MedTrail Caregiver Copy]\n${text}`;
      await this.sendSms(caregiverPhone, caregiverNotice);
    }
  }

  /**
   * Dispensed SMS sent when a pharmacy dispenses medication to the patient.
   */
  async sendDispensedSms(params: DispensedSmsParams): Promise<void> {
    const {
      patientName,
      phone,
      medicationName,
      dosage,
      instructions,
      pharmacistName,
      hospitalName,
      caregiverPhone,
    } = params;

    let text = `MedTrail Dispensed (${hospitalName})\nHello ${patientName}, your medication is ready:\n${medicationName}`;
    if (dosage) text += ` (${dosage})`;
    if (instructions) text += `\nDirections: ${instructions}`;
    text += `\nDispensed by ${pharmacistName}. Please take as prescribed.`;

    await this.sendSms(phone, text);

    if (caregiverPhone && caregiverPhone.trim().length > 0) {
      const caregiverNotice = `[MedTrail Caregiver Notice]\n${text}`;
      await this.sendSms(caregiverPhone, caregiverNotice);
    }
  }
}
