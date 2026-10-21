import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientController } from './patient.controller';
import { PatientService } from './patient.service';
import { Prescription } from '../doctor/entities/prescription.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Prescription]),
    UsersModule,
  ],
  controllers: [PatientController],
  exports: [PatientService],
  providers: [PatientService],
})
export class PatientModule {}
