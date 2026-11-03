import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorController } from './doctor.controller';
import { DoctorService } from './doctor.service';
import { Prescription } from './entities/prescription.entity';
import { Activity } from './entities/activity.entity';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Prescription, Activity]),
    UsersModule,
    MailModule,
    SmsModule,
  ],
  controllers: [DoctorController],
  providers: [DoctorService],
  exports: [DoctorService],
})
export class DoctorModule {}
