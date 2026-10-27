import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PharmacyController } from './pharmacy.controller';
import { PharmacyService } from './pharmacy.service';
import { Prescription } from '../doctor/entities/prescription.entity';
import { Activity } from '../doctor/entities/activity.entity';
import { UsersModule } from '../users/users.module';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Prescription, Activity]),
    UsersModule,
    SmsModule,
  ],
  controllers: [PharmacyController],
  providers: [PharmacyService],
  exports: [PharmacyService],
})
export class PharmacyModule {}
