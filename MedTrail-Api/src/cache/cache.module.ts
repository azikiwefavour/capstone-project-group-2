import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { RedisService } from './redis.service';

/**
 * AppCacheModule — global cache layer for MedTrail API.
 *
 * Supports dual caching:
 * 1. Global in-memory cache via @nestjs/cache-manager (default, zero setup)
 * 2. Distributed Redis cache via RedisService (when REDIS_URL is provided in .env)
 */
@Module({
  imports: [
    NestCacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        ttl: config.get<number>('CACHE_TTL') ?? 300,   // seconds
        max: config.get<number>('CACHE_MAX') ?? 500,   // max items (in-memory only)
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [RedisService],
  exports: [RedisService],
})
export class AppCacheModule {}
