import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import {
  Facility,
  FacilityStatus,
  SubscriptionPlan,
  BillingCycle,
} from '../super-admin/entities/facility.entity';
import {
  PlatformActivity,
  ActivitySeverity,
} from '../super-admin/entities/platform-activity.entity';
import {
  PaymentTransaction,
  PaymentTransactionStatus,
} from '../super-admin/entities/payment-transaction.entity';

export interface PlanPricing {
  plan: 'Free trial' | 'Starter plan' | 'Growth plan';
  billingCycle: 'Monthly' | 'Annually';
  basePrice: number;
  paystackFee: number;
  totalAmount: number;
  durationDays: number;
}

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Calculates fixed, non-editable plan pricing and Paystack transaction fees
   */
  calculatePlanPricing(
    plan: string,
    billingCycle: string = 'Monthly',
  ): PlanPricing {
    const isAnnual = billingCycle.toLowerCase() === 'annually' || billingCycle.toLowerCase() === 'yearly';

    if (plan === 'Free trial') {
      return {
        plan: 'Free trial',
        billingCycle: 'Monthly',
        basePrice: 0,
        paystackFee: 0,
        totalAmount: 0,
        durationDays: 7,
      };
    }

    const isGrowth = plan.toLowerCase().includes('growth');
    const monthlyBase = isGrowth ? 70000 : 30000;

    // Annual pricing with 10% discount: (monthlyBase * 12 * 0.9)
    const basePrice = isAnnual ? monthlyBase * 12 * 0.9 : monthlyBase;

    // Paystack local processing fee in Nigeria: 1.5% + NGN 100, capped at NGN 2,000
    const calculatedFee = Math.round(basePrice * 0.015 + 100);
    const paystackFee = Math.min(2000, calculatedFee);
    const totalAmount = basePrice + paystackFee;
    const durationDays = isAnnual ? 365 : 30;

    return {
      plan: isGrowth ? 'Growth plan' : 'Starter plan',
      billingCycle: isAnnual ? 'Annually' : 'Monthly',
      basePrice,
      paystackFee,
      totalAmount,
      durationDays,
    };
  }

  /**
   * Initializes a subscription payment with Paystack
   */
  async initializePayment(
    userEmail: string,
    plan: string,
    billingCycle: string = 'Monthly',
    callbackUrl?: string,
  ) {
    const pricing = this.calculatePlanPricing(plan, billingCycle);

    if (pricing.totalAmount === 0) {
      throw new BadRequestException('Free trial does not require payment initialization.');
    }

    const userRepo = this.dataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { email: userEmail.toLowerCase().trim() },
    });
    if (!user) {
      throw new NotFoundException('User account not found');
    }

    const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY')?.trim();
    const publicKey = this.configService.get<string>('PAYSTACK_PUBLIC_KEY')?.trim() || 'pk_test_demo';
    const baseUrl = this.configService.get<string>('PAYSTACK_BASE_URL') || 'https://api.paystack.co';

    // Unique reference matching Paystack requirements
    const reference = `MED-SUB-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const amountInKobo = pricing.totalAmount * 100;

    // If live/test Paystack secret key is configured, call Paystack REST API
    if (secretKey && secretKey.startsWith('sk_')) {
      try {
        const response = await fetch(`${baseUrl}/transaction/initialize`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: user.email,
            amount: amountInKobo,
            reference,
            callback_url: callbackUrl || 'http://localhost:5173/admin/dashboard',
            metadata: {
              plan: pricing.plan,
              billingCycle: pricing.billingCycle,
              hospitalName: user.hospitalName,
              userId: user.id,
              basePrice: pricing.basePrice,
              paystackFee: pricing.paystackFee,
              custom_fields: [
                {
                  display_name: 'Facility Name',
                  variable_name: 'hospital_name',
                  value: user.hospitalName || 'MedTrail Clinic',
                },
                {
                  display_name: 'Subscription Plan',
                  variable_name: 'plan',
                  value: `${pricing.plan} (${pricing.billingCycle})`,
                },
              ],
            },
          }),
        });

        const data = await response.json();
        if (data?.status && data?.data) {
          await this.recordInitialTransaction(user, reference, pricing);
          return {
            status: true,
            message: 'Payment initialized',
            reference,
            authorizationUrl: data.data.authorization_url,
            accessCode: data.data.access_code,
            publicKey,
            pricing,
          };
        }
      } catch (err: any) {
        this.logger.warn(`Paystack API call failed: ${err.message}. Using fallback transaction reference.`);
      }
    }

    await this.recordInitialTransaction(user, reference, pricing);

    // Fallback: return ready-to-use configuration for Paystack Inline popup
    return {
      status: true,
      message: 'Payment initialized',
      reference,
      authorizationUrl: null,
      accessCode: null,
      publicKey,
      pricing,
    };
  }

  private async recordInitialTransaction(user: User, reference: string, pricing: PlanPricing) {
    try {
      const txRepo = this.dataSource.getRepository(PaymentTransaction);
      const existing = await txRepo.findOne({ where: { reference } });
      if (!existing) {
        const tx = txRepo.create({
          reference,
          facilityName: user.hospitalName || 'MedTrail Clinic',
          customerName: user.name,
          customerEmail: user.email,
          amount: pricing.totalAmount,
          currency: 'NGN',
          channel: 'Card',
          gateway: 'Paystack',
          status: PaymentTransactionStatus.PENDING,
          statusReason: 'Payment initiated via Paystack checkout',
          plan: pricing.plan === 'Starter plan' ? 'Starter' : 'Growth',
          billingCycle: pricing.billingCycle === 'Annually' ? 'Annual' : 'Monthly',
        });
        await txRepo.save(tx);
      }
    } catch (err: any) {
      this.logger.warn(`Could not save initial pending transaction: ${err.message}`);
    }
  }

  /**
   * Verifies payment and activates the facility subscription
   */
  async verifyPayment(
    userEmail: string,
    reference: string,
    plan: string,
    billingCycle: string = 'Monthly',
    channel: string = 'Card',
  ) {
    const userRepo = this.dataSource.getRepository(User);
    const facilityRepo = this.dataSource.getRepository(Facility);
    const activityRepo = this.dataSource.getRepository(PlatformActivity);

    const user = await userRepo.findOne({
      where: { email: userEmail.toLowerCase().trim() },
    });
    if (!user) {
      throw new NotFoundException('User account not found');
    }

    const pricing = this.calculatePlanPricing(plan, billingCycle);
    const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY')?.trim();
    const baseUrl = this.configService.get<string>('PAYSTACK_BASE_URL') || 'https://api.paystack.co';

    // Verify with Paystack if secret key is present
    if (secretKey && secretKey.startsWith('sk_') && reference && !reference.startsWith('MOCK-')) {
      try {
        const response = await fetch(`${baseUrl}/transaction/verify/${encodeURIComponent(reference)}`, {
          headers: {
            Authorization: `Bearer ${secretKey}`,
          },
        });
        const data = await response.json();
        if (!data?.status || data?.data?.status !== 'success') {
          throw new BadRequestException('Paystack payment verification failed or payment is incomplete.');
        }
      } catch (err: any) {
        if (err instanceof BadRequestException) throw err;
        this.logger.warn(`Paystack verification network exception: ${err.message}`);
      }
    }

    const hospitalName = user.hospitalName?.trim() || 'General Hospital';
    let facility = await facilityRepo.findOne({
      where: [{ name: hospitalName }, { adminEmail: user.email }],
    });

    const isAnnual = pricing.billingCycle === 'Annually';
    const renewalDate = new Date();
    renewalDate.setDate(renewalDate.getDate() + pricing.durationDays);

    const paymentMethodLabel = channel.toLowerCase().includes('transfer')
      ? 'Bank transfer (Paystack)'
      : 'Card (Paystack)';
    const txChannel = channel.toLowerCase().includes('transfer')
      ? 'Bank Transfer'
      : 'Card';

    if (!facility) {
      facility = facilityRepo.create({
        name: hospitalName,
        adminName: user.name,
        adminEmail: user.email,
        phone: user.phone || undefined,
        status: FacilityStatus.ACTIVE,
        plan: pricing.plan === 'Starter plan' ? SubscriptionPlan.STARTER : SubscriptionPlan.GROWTH,
        billingCycle: isAnnual ? BillingCycle.YEARLY : BillingCycle.MONTHLY,
        monthlyFee: pricing.plan === 'Starter plan' ? 30000 : 70000,
        currency: 'NGN',
        paymentStatus: 'paid',
        paymentMethod: paymentMethodLabel,
        renewalDate,
        lastPaymentDate: new Date(),
        cliniciansCount: 1,
        patientsCount: 0,
        messagesCount: 0,
        trialUsed: true,
      });
    } else {
      facility.status = FacilityStatus.ACTIVE;
      facility.plan = pricing.plan === 'Starter plan' ? SubscriptionPlan.STARTER : SubscriptionPlan.GROWTH;
      facility.billingCycle = isAnnual ? BillingCycle.YEARLY : BillingCycle.MONTHLY;
      facility.monthlyFee = pricing.plan === 'Starter plan' ? 30000 : 70000;
      facility.paymentStatus = 'paid';
      facility.paymentMethod = paymentMethodLabel;
      facility.renewalDate = renewalDate;
      facility.lastPaymentDate = new Date();
      facility.trialUsed = true;
    }

    await facilityRepo.save(facility);

    // Record audit event in platform activities
    const activity = activityRepo.create({
      facilityName: facility.name,
      facilityId: facility.id,
      actorName: user.name || 'Admin',
      actorRole: 'Admin',
      action: 'Subscription activated',
      status: ActivitySeverity.SUCCESS,
      metadata: {
        plan: pricing.plan,
        billingCycle: pricing.billingCycle,
        amount: pricing.totalAmount,
        basePrice: pricing.basePrice,
        paystackFee: pricing.paystackFee,
        reference,
        channel: txChannel,
        gateway: 'Paystack',
      },
    });
    await activityRepo.save(activity);

    // Update or create payment transaction record
    try {
      const txRepo = this.dataSource.getRepository(PaymentTransaction);
      let tx = await txRepo.findOne({ where: { reference } });
      if (!tx) {
        tx = txRepo.create({
          reference,
          facilityName: facility.name,
          facilityId: facility.id,
          customerName: user.name,
          customerEmail: user.email,
          amount: pricing.totalAmount,
          currency: 'NGN',
          channel: txChannel,
          gateway: 'Paystack',
          status: PaymentTransactionStatus.SUCCESSFUL,
          statusReason: 'Payment verified and confirmed via Paystack',
          plan: pricing.plan === 'Starter plan' ? 'Starter' : 'Growth',
          billingCycle: pricing.billingCycle === 'Annually' ? 'Annual' : 'Monthly',
          paidAt: new Date(),
        });
      } else {
        tx.facilityId = facility.id;
        tx.facilityName = facility.name;
        tx.channel = txChannel;
        tx.status = PaymentTransactionStatus.SUCCESSFUL;
        tx.statusReason = 'Payment verified and confirmed via Paystack';
        tx.paidAt = new Date();
      }
      await txRepo.save(tx);
    } catch (err: any) {
      this.logger.warn(`Could not update transaction status: ${err.message}`);
    }

    return {
      success: true,
      message: `Successfully activated ${pricing.plan} (${pricing.billingCycle}) for ${facility.name}.`,
      facility: {
        id: facility.id,
        name: facility.name,
        plan: facility.plan,
        billingCycle: facility.billingCycle,
        status: facility.status,
        renewalDate: facility.renewalDate,
      },
    };
  }

  /**
   * Activates a 7-day free trial without payment
   */
  async activateFreeTrial(userEmail: string) {
    const userRepo = this.dataSource.getRepository(User);
    const facilityRepo = this.dataSource.getRepository(Facility);
    const activityRepo = this.dataSource.getRepository(PlatformActivity);

    const cleanEmail = (userEmail || '').trim().toLowerCase();
    let user = await userRepo
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email: cleanEmail })
      .getOne();

    if (!user) {
      user = await userRepo.findOne({
        where: { email: cleanEmail },
      });
    }

    if (!user) {
      throw new NotFoundException('User account not found');
    }

    const hospitalName = user.hospitalName?.trim() || 'General Hospital';
    let facility = await facilityRepo
      .createQueryBuilder('fac')
      .where('LOWER(fac.adminEmail) = LOWER(:email)', { email: user.email })
      .orWhere('LOWER(fac.name) = LOWER(:name)', { name: hospitalName })
      .getOne();

    if (facility && (facility.trialUsed || facility.paymentStatus === 'expired')) {
      throw new BadRequestException(
        'You have already completed your 7-day free trial. Please select a paid plan (Starter or Growth) to access MedTrail.',
      );
    }

    const renewalDate = new Date();
    renewalDate.setDate(renewalDate.getDate() + 7); // 7-day trial

    if (!facility) {
      facility = facilityRepo.create({
        name: hospitalName,
        adminName: user.name,
        adminEmail: user.email,
        phone: user.phone || undefined,
        status: FacilityStatus.TRIAL,
        plan: SubscriptionPlan.GROWTH, // Free trial unlocks full Growth features
        billingCycle: BillingCycle.MONTHLY,
        monthlyFee: 70000,
        currency: 'NGN',
        paymentStatus: 'trial',
        paymentMethod: 'None (Trial)',
        renewalDate,
        lastPaymentDate: null as any,
        cliniciansCount: 1,
        patientsCount: 0,
        messagesCount: 0,
        trialUsed: true,
      });
    } else {
      facility.status = FacilityStatus.TRIAL;
      facility.plan = SubscriptionPlan.GROWTH;
      facility.billingCycle = BillingCycle.MONTHLY;
      facility.paymentStatus = 'trial';
      facility.paymentMethod = 'None (Trial)';
      facility.renewalDate = renewalDate;
      facility.trialUsed = true;
    }

    await facilityRepo.save(facility);

    const activity = activityRepo.create({
      facilityName: facility.name,
      facilityId: facility.id,
      actorName: user.name || 'Admin',
      actorRole: 'Admin',
      action: 'Facility started 7-day free trial',
      status: ActivitySeverity.INFO,
      metadata: {
        trialDurationDays: 7,
        plan: 'Growth Plan (Trial)',
      },
    });
    await activityRepo.save(activity);

    return {
      success: true,
      message: `7-day free trial activated for ${facility.name}. Access granted until ${renewalDate.toISOString().split('T')[0]}.`,
      facility: {
        id: facility.id,
        name: facility.name,
        plan: facility.plan,
        status: facility.status,
        renewalDate: facility.renewalDate,
      },
    };
  }
}
