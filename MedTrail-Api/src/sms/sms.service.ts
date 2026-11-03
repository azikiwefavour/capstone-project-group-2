import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { Facility } from '../super-admin/entities/facility.entity';
import { MessageLog, MessageChannel, MessageStatus, MessageType } from '../super-admin/entities/message-log.entity';

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  mocked?: boolean;
  error?: string;
}

export interface SendSmsContext {
  hospitalName?: string;
  messageType?: string;
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

  constructor(
    private readonly configService: ConfigService,
    @Optional() @InjectDataSource() private readonly dataSource?: DataSource,
  ) {}

  /**
   * Normalizes a phone number to standard international format without '+' for Termii.
   * Examples:
   *   '08031234567'   -> '2348031234567'
   *   '+2348031234567'-> '2348031234567'
   *   '2348031234567' -> '2348031234567'
   */
  normalizePhoneNumber(rawPhone: string): string {
    if (!rawPhone) return '';
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
   * Helper to mask phone numbers for Super Admin message audit logs.
   * e.g. "2348031234567" -> "+23480****567"
   */
  maskRecipient(phone: string): string {
    const clean = this.normalizePhoneNumber(phone);
    if (clean.length < 9) return clean;
    // Format: +234802****447 (matches /^\+234\d{3}\*{4}\d{3}$/)
    return `+${clean.slice(0, 6)}****${clean.slice(-3)}`;
  }

  /**
   * Sends an SMS via Termii API, enforces monthly hospital quota limits,
   * increments hospital messagesCount, and records real audit logs.
   */
  async sendSms(
    to: string,
    message: string,
    context?: SendSmsContext,
  ): Promise<SendSmsResult> {
    const normalizedTo = this.normalizePhoneNumber(to);
    if (!normalizedTo) {
      this.logger.warn(`Cannot send SMS: invalid phone number "${to}"`);
      return { success: false, error: 'Invalid phone number' };
    }

    const bulkSmsToken = this.configService.get<string>('BULKSMS_NIGERIA_API_TOKEN');
    const hospitalName = context?.hospitalName?.trim();
    let facility: Facility | null = null;

    // 1. Enforce Hospital Message Limit (500 for Starter, 1000 for Growth)
    if (hospitalName && this.dataSource) {
      try {
        const facRepo = this.dataSource.getRepository(Facility);
        facility = await facRepo
          .createQueryBuilder('f')
          .where('LOWER(f.name) = LOWER(:name)', { name: hospitalName })
          .getOne();

        if (facility) {
          const plan = (facility.plan || '').toLowerCase();
          const quota = plan.includes('growth') ? 1000 : 500;
          const currentCount = Number(facility.messagesCount) || 0;

          if (currentCount >= quota) {
            const errorMsg = `Monthly message quota exceeded for ${hospitalName} (${currentCount}/${quota} used)`;
            this.logger.warn(`[SMS QUOTA BLOCKED] ${errorMsg}`);

            // Record failed attempt in message_logs
            try {
              const logRepo = this.dataSource.getRepository(MessageLog);
              const failedLog = logRepo.create({
                facilityName: hospitalName,
                facilityId: facility.id,
                recipient: normalizedTo,
                recipientMasked: this.maskRecipient(normalizedTo),
                messageType: context?.messageType || MessageType.GENERAL_NOTIFICATION,
                content: message,
                channel: MessageChannel.SMS,
                status: MessageStatus.FAILED,
                provider: bulkSmsToken ? 'BulkSMSNigeria' : 'Termii',
                failureReason: errorMsg,
              });
              await logRepo.save(failedLog);
            } catch {}

            return { success: false, error: errorMsg };
          }
        }
      } catch (err: any) {
        this.logger.warn(`Facility quota verification skipped: ${err?.message}`);
      }
    }

    const apiKey = this.configService.get<string>('TERMII_API_KEY');
    const senderId = this.configService.get<string>('TERMII_SENDER_ID') || 'MedTrail';
    const channel = this.configService.get<string>('TERMII_CHANNEL') || 'generic';
    const baseUrl = (this.configService.get<string>('TERMII_BASE_URL') || 'https://api.ng.termii.com').replace(/\/+$/, '');

    let result: SendSmsResult;

    // 2. Dispatch via BulkSMS Nigeria (if configured) or Termii / Simulation
    if (bulkSmsToken && bulkSmsToken.trim() !== '' && bulkSmsToken !== 'YOUR_BULKSMS_TOKEN') {
      try {
        const response = await fetch('https://www.bulksmsnigeria.com/api/v1/sms/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            api_token: bulkSmsToken.trim(),
            from: senderId,
            to: normalizedTo,
            body: message,
            gateway: 'corporate',
          }),
          signal: AbortSignal.timeout(8000),
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok && data?.status === 'success') {
          this.logger.log(`BulkSMS Nigeria SMS dispatched to ${normalizedTo} (ID: ${data.data?.message_id || 'sent'})`);
          result = {
            success: true,
            messageId: data.data?.message_id,
          };
        } else if (data?.code === 'BSNG-2012') {
          // Duplicate message safeguard: same message to same recipient within 60s
          this.logger.log(`BulkSMS Nigeria duplicate protection triggered for ${normalizedTo}; treated as sent.`);
          result = {
            success: true,
            messageId: `dup-${Date.now()}`,
          };
        } else {
          const errorMsg = data?.error?.message || data?.message || `HTTP ${response.status} ${response.statusText}`;
          this.logger.error(`BulkSMS Nigeria SMS failed for ${normalizedTo}: ${errorMsg}`);
          result = { success: false, error: errorMsg };
        }
      } catch (err: any) {
        this.logger.error(`BulkSMS Nigeria SMS exception for ${normalizedTo}: ${err.message}`);
        result = { success: false, error: err.message };
      }
    } else if (!apiKey || apiKey.trim() === '' || apiKey === 'YOUR_TERMII_API_KEY') {
      this.logger.log(
        `\n╔════════════════════════════════════════════════════════════════╗\n` +
        `║ 📱 [MOCK TERMII SMS SENT]                                     ║\n` +
        `║ To: ${normalizedTo.padEnd(58)}║\n` +
        `║ Facility: ${(hospitalName || 'MedTrail').padEnd(52)}║\n` +
        `║ From: ${senderId.padEnd(56)}║\n` +
        `║ Message:                                                      ║\n` +
        `║ ${message.replace(/\n/g, ' ').slice(0, 60).padEnd(62)}║\n` +
        `╚════════════════════════════════════════════════════════════════╝`
      );
      result = {
        success: true,
        mocked: true,
        messageId: `mock-${Date.now()}`,
      };
    } else {
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
          signal: AbortSignal.timeout(5000),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || (data && data.code && data.code !== 'ok' && !data.message_id)) {
          const errorMsg = data?.message || `HTTP ${response.status} ${response.statusText}`;
          this.logger.error(`Termii SMS failed for ${normalizedTo}: ${errorMsg}`);
                    if (errorMsg.includes('SENDER_ID_NOT_APPROVED') || errorMsg.includes('Country Inactive')) {
            this.logger.warn(
              `\n╔════════════════════════════════════════════════════════════════╗\n` +
              `║ ⚠️  [TERMII SENDER ID PENDING / SIMULATED DISPATCH]            ║\n` +
              `║ Sender ID "${senderId}" is awaiting carrier approval.          ║\n` +
              `║ [SIMULATED SMS to ${normalizedTo.padEnd(41)}]║\n` +
              `║ ${message.replace(/\n/g, ' ').slice(0, 60).padEnd(62)}║\n` +
              `╚════════════════════════════════════════════════════════════════╝\n`
            );
            result = {
              success: true,
              mocked: true,
              messageId: `pending-carrier-${Date.now()}`,
            };
          } else {
            result = { success: false, error: errorMsg };
          }
        } else {
          this.logger.log(`Termii SMS dispatched to ${normalizedTo} (ID: ${data.message_id || 'sent'})`);
          result = {
            success: true,
            messageId: data.message_id,
          };
        }
      } catch (err: any) {
        this.logger.error(`Termii SMS exception for ${normalizedTo}: ${err.message}`);
        result = { success: false, error: err.message };
      }
    }

    // 3. Track count on Facility & persist log in message_logs table
    if (this.dataSource) {
      try {
        if (result.success && facility) {
          facility.messagesCount = (Number(facility.messagesCount) || 0) + 1;
          await this.dataSource.getRepository(Facility).save(facility);
        }

        const logRepo = this.dataSource.getRepository(MessageLog);
        const item = logRepo.create({
          facilityName: hospitalName || facility?.name || 'General Hospital',
          facilityId: facility?.id,
          recipient: normalizedTo,
          recipientMasked: this.maskRecipient(normalizedTo),
          messageType: context?.messageType || MessageType.GENERAL_NOTIFICATION,
          content: message,
          channel: MessageChannel.SMS,
          status: result.success ? MessageStatus.DELIVERED : MessageStatus.FAILED,
          provider: bulkSmsToken ? 'BulkSMSNigeria' : 'Termii',
          providerMessageId: result.messageId,
          failureReason: result.error,
        });
        await logRepo.save(item);
      } catch (err: any) {
        this.logger.warn(`Could not save message audit log: ${err?.message}`);
      }
    }

    return result;
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
    await this.sendSms(phone, patientMessage, {
      hospitalName,
      messageType: MessageType.GENERAL_NOTIFICATION,
    });

    // 2. If caregiver phone is provided, send notification to caregiver
    if (caregiverPhone && caregiverPhone.trim().length > 0) {
      const caregiverSalutation = caregiverName ? ` ${caregiverName}` : '';
      const caregiverMessage =
        `MedTrail Alert: Hello${caregiverSalutation}, you are registered as caregiver for ${name} ` +
        `at ${hospitalName}.${codeText} You will receive SMS copies of their medication schedules.`;

      await this.sendSms(caregiverPhone, caregiverMessage, {
        hospitalName,
        messageType: MessageType.GENERAL_NOTIFICATION,
      });
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
    await this.sendSms(phone, text, {
      hospitalName,
      messageType: MessageType.PRESCRIPTION_DETAILS,
    });

    // Also send to caregiver if registered
    if (caregiverPhone && caregiverPhone.trim().length > 0) {
      const caregiverNotice = `[MedTrail Caregiver Copy]\n${text}`;
      await this.sendSms(caregiverPhone, caregiverNotice, {
        hospitalName,
        messageType: MessageType.PRESCRIPTION_DETAILS,
      });
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

    await this.sendSms(phone, text, {
      hospitalName,
      messageType: MessageType.PRESCRIPTION_DETAILS,
    });

    if (caregiverPhone && caregiverPhone.trim().length > 0) {
      const caregiverNotice = `[MedTrail Caregiver Notice]\n${text}`;
      await this.sendSms(caregiverPhone, caregiverNotice, {
        hospitalName,
        messageType: MessageType.PRESCRIPTION_DETAILS,
      });
    }
  }
}

