import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { IntegrationsHealthService } from './integrations-health.service';
import { PosthogService } from './posthog.service';
import { User } from '../users/entities/user.entity';
import { Prescription } from '../doctor/entities/prescription.entity';
import { Activity } from '../doctor/entities/activity.entity';
import { Facility } from './entities/facility.entity';
import { PlatformActivity } from './entities/platform-activity.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { MessageLog } from './entities/message-log.entity';
import { SystemIncident } from './entities/system-incident.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Prescription,
      Activity,
      Facility,
      PlatformActivity,
      PaymentTransaction,
      MessageLog,
      SystemIncident,
    ]),
  ],
  controllers: [SuperAdminController],
  providers: [SuperAdminService, IntegrationsHealthService, PosthogService],
  exports: [SuperAdminService, IntegrationsHealthService, PosthogService],
})
export class SuperAdminModule {}
