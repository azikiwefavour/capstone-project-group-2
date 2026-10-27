import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * RedisService
 *
 * Provides a resilient connection to Redis for:
 * 1. Distributed caching across multiple auto-scaling servers
 * 2. Background queue processing (BullMQ / async email & logs)
 * 3. Real-time Pub/Sub between hospital instances
 *
 * Behavior:
 * - If REDIS_URL is provided in .env, connects and logs status.
 * - If REDIS_URL is NOT set, stays in graceful dormant mode so the app
 *   continues running locally without requiring a local Redis installation.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (!redisUrl || !redisUrl.trim()) {
      this.logger.log('No REDIS_URL configured — running in fast in-memory cache mode.');
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 5) {
            this.logger.warn('Redis reconnection limit reached; backing off.');
            return null;
          }
          return Math.min(times * 200, 2000);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log('🚀 Connected to Redis distributed cache.');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.error(`Redis connection error: ${err.message}`);
      });

      this.client.connect().catch((err) => {
        this.logger.warn(`Could not connect to Redis at startup: ${err.message}`);
      });
    } catch (err: any) {
      this.logger.error(`Failed to initialize Redis client: ${err?.message}`);
    }
  }

  get isReady(): boolean {
    return this.isConnected && Boolean(this.client);
  }

  getClient(): Redis | null {
    return this.client;
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.isReady || !this.client) return null;
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.isReady || !this.client) return;
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.set(key, serialized, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (err: any) {
      this.logger.warn(`Failed to set Redis key [${key}]: ${err.message}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isReady || !this.client) return;
    try {
      await this.client.del(key);
    } catch (err: any) {
      this.logger.warn(`Failed to delete Redis key [${key}]: ${err.message}`);
    }
  }

  async ping(): Promise<{ ok: boolean; latencyMs: number }> {
    if (!this.isReady || !this.client) {
      return { ok: false, latencyMs: 0 };
    }
    const start = Date.now();
    try {
      const pong = await this.client.ping();
      return {
        ok: pong === 'PONG',
        latencyMs: Date.now() - start,
      };
    } catch {
      return { ok: false, latencyMs: 0 };
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => {});
    }
  }
}
