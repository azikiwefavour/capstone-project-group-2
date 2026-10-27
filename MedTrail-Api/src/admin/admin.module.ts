import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { SubscriptionService } from './subscription.service';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { Activity } from '../doctor/entities/activity.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Activity]),
    UsersModule,
    AuthModule,
    MailModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, SubscriptionService],
  exports: [AdminService, SubscriptionService],
})
export class AdminModule {}
