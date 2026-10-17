import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AdminModule } from './admin/admin.module';
import { MailModule } from './mail/mail.module';
import { DoctorModule } from './doctor/doctor.module';
import { PharmacyModule } from './pharmacy/pharmacy.module';
import { AppCacheModule } from './cache/cache.module';
import { LoggerModule } from './logger/logger.module';
import { User } from './users/entities/user.entity';
import { Prescription } from './doctor/entities/prescription.entity';
import { Activity } from './doctor/entities/activity.entity';

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
          entities: [User, Prescription, Activity],
          autoLoadEntities: true,
          synchronize: configService.get<string>('NODE_ENV') !== 'production',
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

    AuthModule,
    UsersModule,
    AdminModule,
    MailModule,
    DoctorModule,
    PharmacyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
