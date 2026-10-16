import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * AppCacheModule — global cache layer for MedTrail API.
 *
 * - In development / when no REDIS_URL is set → uses in-memory store (no extra infra needed)
 * - In production with REDIS_URL set → swap to a Redis store by installing
 *   `cache-manager-ioredis-yet` and updating the store option below.
 *
 * TTL defaults:
 *   CACHE_TTL (env)  — default time-to-live in **seconds**  (default: 300 = 5 min)
 *   CACHE_MAX (env)  — max items held in memory            (default: 500)
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
})
export class AppCacheModule {}
