import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AdminModule } from './admin/admin.module';
import { MailModule } from './mail/mail.module';
import { DoctorModule } from './doctor/doctor.module';
import { PharmacyModule } from './pharmacy/pharmacy.module';
import { PatientModule } from './patient/patient.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { SmsModule } from './sms/sms.module';
import { AppCacheModule } from './cache/cache.module';
import { LoggerModule } from './logger/logger.module';
import { User } from './users/entities/user.entity';
import { Prescription } from './doctor/entities/prescription.entity';
import { Activity } from './doctor/entities/activity.entity';
import { Facility } from './super-admin/entities/facility.entity';
import { PlatformActivity } from './super-admin/entities/platform-activity.entity';
import { PaymentTransaction } from './super-admin/entities/payment-transaction.entity';
import { MessageLog } from './super-admin/entities/message-log.entity';
import { SystemIncident } from './super-admin/entities/system-incident.entity';

@Module({
  imports: [
    // Load .env globally
    ConfigModule.forRoot({ isGlobal: true }),

    // Global in-memory cache (swap store for Redis in production)
    AppCacheModule,

    // Global structured logger (interceptor + exception filter)
    LoggerModule,

    // Neon PostgreSQL connection with TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbUrl = configService.get<string>('DATABASE_URL');
        const isNeonOrSsl =
          dbUrl?.includes('neon.tech') ||
          configService.get<string>('DB_SSL') === 'true';

        return {
          type: 'postgres',
          url: dbUrl,
          entities: [
            User,
            Prescription,
            Activity,
            Facility,
            PlatformActivity,
            PaymentTransaction,
            MessageLog,
            SystemIncident,
          ],
          synchronize:
            configService.get<string>('DB_SYNCHRONIZE') === 'true' ||
            configService.get<string>('NODE_ENV') !== 'production',
          ssl: isNeonOrSsl ? { rejectUnauthorized: false } : false,
        };
      },
      inject: [ConfigService],
    }),

    // Global JWT
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'medtrail_secret',
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRES_IN') || '7d') as any,
        },
      }),
      inject: [ConfigService],
    }),

    // Global Rate Limiting (Protection against DDoS, bots, brute-force attacks)
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          name: 'short',
          ttl: 1000, // 1 second
          limit: config.get<number>('THROTTLE_SHORT_LIMIT') ?? 15, // max 15 req/sec
        },
        {
          name: 'medium',
          ttl: 10000, // 10 seconds
          limit: config.get<number>('THROTTLE_MEDIUM_LIMIT') ?? 50, // max 50 req/10s
        },
        {
          name: 'long',
          ttl: 60000, // 1 minute
          limit: config.get<number>('THROTTLE_LONG_LIMIT') ?? 120, // max 120 req/min
        },
      ],
    }),

    AuthModule,
    UsersModule,
    AdminModule,
    MailModule,
    DoctorModule,
    PharmacyModule,
    PatientModule,
    SuperAdminModule,
    SmsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
