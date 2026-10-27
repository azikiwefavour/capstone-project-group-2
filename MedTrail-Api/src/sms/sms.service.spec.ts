import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { SmsService } from './sms.service';

describe('SmsService', () => {
  let service: SmsService;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'TERMII_API_KEY') return '';
        if (key === 'TERMII_SENDER_ID') return 'MedTrail';
        if (key === 'TERMII_CHANNEL') return 'generic';
        if (key === 'TERMII_BASE_URL') return 'https://api.ng.termii.com';
        return undefined;
      }),
    };

    service = new SmsService(mockConfigService as ConfigService);
  });

  describe('normalizePhoneNumber', () => {
    it('should convert standard 11-digit Nigerian 080... format to 23480...', () => {
      expect(service.normalizePhoneNumber('08031234567')).toBe('2348031234567');
      expect(service.normalizePhoneNumber('07012345678')).toBe('2347012345678');
      expect(service.normalizePhoneNumber('09098765432')).toBe('2349098765432');
    });

    it('should strip plus sign and spaces from +234 format', () => {
      expect(service.normalizePhoneNumber('+234 803 123 4567')).toBe('2348031234567');
      expect(service.normalizePhoneNumber('+2348123456789')).toBe('2348123456789');
    });

    it('should handle already normalized 234 numbers', () => {
      expect(service.normalizePhoneNumber('2348031234567')).toBe('2348031234567');
    });

    it('should return empty string for empty inputs', () => {
      expect(service.normalizePhoneNumber('')).toBe('');
    });
  });

  describe('sendSms in simulated/mock mode', () => {
    it('should return success and mocked flag when no API key is provided', async () => {
      const res = await service.sendSms('08031234567', 'Test message');
      expect(res.success).toBe(true);
      expect(res.mocked).toBe(true);
      expect(res.messageId).toContain('mock-');
    });

    it('should fail gracefully on invalid phone number', async () => {
      const res = await service.sendSms('', 'Test message');
      expect(res.success).toBe(false);
      expect(res.error).toBe('Invalid phone number');
    });
  });

  describe('sendWelcomePatientSms', () => {
    it('should send welcome SMS to patient and caregiver', async () => {
      const spy = vi.spyOn(service, 'sendSms');

      await service.sendWelcomePatientSms({
        name: 'Mama Grace',
        phone: '08031234567',
        hospitalName: 'Lagos Island Hospital',
        patientCode: 'MT-4021',
        caregiverPhone: '08099998888',
        caregiverName: 'Emeka',
      });

      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenNthCalledWith(
        1,
        '08031234567',
        expect.stringContaining('Mama Grace'),
      );
      expect(spy).toHaveBeenNthCalledWith(
        2,
        '08099998888',
        expect.stringContaining('Emeka'),
      );
    });
  });

  describe('sendPrescriptionSms', () => {
    it('should format prescription instructions correctly', async () => {
      const spy = vi.spyOn(service, 'sendSms');

      await service.sendPrescriptionSms({
        patientName: 'Pa Adekunle',
        phone: '08031234567',
        medicationName: 'Amlodipine',
        dosage: '5mg',
        frequency: 'Once daily morning',
        duration: '30 days',
        instructions: 'Take with glass of water after breakfast',
        prescriberName: 'Dr. Babatunde',
        hospitalName: 'General Hospital',
        caregiverPhone: '08099998888',
      });

      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenNthCalledWith(
        1,
        '08031234567',
        expect.stringContaining('Amlodipine'),
      );
      expect(spy).toHaveBeenNthCalledWith(
        1,
        '08031234567',
        expect.stringContaining('Take with glass of water after breakfast'),
      );
    });
  });

  describe('sendDispensedSms', () => {
    it('should send dispensed message with pharmacy and medication details', async () => {
      const spy = vi.spyOn(service, 'sendSms');

      await service.sendDispensedSms({
        patientName: 'Pa Adekunle',
        phone: '08031234567',
        medicationName: 'Amlodipine',
        dosage: '5mg',
        instructions: 'Take 1 tablet every morning',
        pharmacistName: 'Pharm. Okafor',
        hospitalName: 'General Hospital',
      });

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(
        '08031234567',
        expect.stringContaining('Pharm. Okafor'),
      );
    });
  });
});
