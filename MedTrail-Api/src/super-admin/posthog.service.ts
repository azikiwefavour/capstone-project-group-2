import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * PosthogService
 *
 * Provides product analytics, feature flags, and event tracking for MedTrail.
 *
 * How PostHog works:
 * 1. Capture Events: Track critical hospital actions (e.g., 'prescription_created', 'server_load_warning')
 * 2. Feature Flags: Turn on/off features (e.g. AI diagnostics, new hospital UI) without redeploying
 * 3. Privacy-Safe: In healthcare systems, NEVER send raw medical notes or patient names to PostHog.
 *    Only track anonymous IDs, role names, and event types (e.g., { role: 'doctor', hospitalId: 'xyz' }).
 */
@Injectable()
export class PosthogService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PosthogService.name);
  private client: any = null;
  private isEnabled = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const apiKey = this.configService.get<string>('POSTHOG_API_KEY');
    const host = this.configService.get<string>('POSTHOG_HOST') || 'https://us.i.posthog.com';

    if (!apiKey) {
      this.logger.debug(
        'PostHog is not enabled. (To enable, add POSTHOG_API_KEY to your .env file)',
      );
      return;
    }

    try {
      // Dynamic import to avoid crash if posthog-node is not installed yet
      // Run: npm install posthog-node
      const { PostHog } = await import('posthog-node' as any);
      this.client = new PostHog(apiKey, { host });
      this.isEnabled = true;
      this.logger.log(`PostHog analytics initialized (Host: ${host})`);
    } catch {
      this.logger.warn(
        'PostHog API key found, but "posthog-node" is not yet installed. Run "npm install posthog-node" to activate cloud tracking.',
      );
    }
  }

  /**
   * Capture an event with privacy-safe metadata
   */
  captureEvent(distinctId: string, eventName: string, properties: Record<string, any> = {}) {
    if (!this.isEnabled || !this.client) {
      // Safe no-op in dev/offline mode
      this.logger.debug(`[PostHog Mock] ${eventName} for ${distinctId}: ${JSON.stringify(properties)}`);
      return;
    }

    try {
      this.client.capture({
        distinctId,
        event: eventName,
        properties: {
          ...properties,
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development',
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to capture PostHog event: ${err?.message}`);
    }
  }

  /**
   * Check if a Feature Flag is active for a hospital or user
   */
  async isFeatureEnabled(flagKey: string, distinctId: string): Promise<boolean> {
    if (!this.isEnabled || !this.client) {
      return false;
    }
    try {
      return Boolean(await this.client.isFeatureEnabled(flagKey, distinctId));
    } catch {
      return false;
    }
  }

  async onModuleDestroy() {
    if (this.client && typeof this.client.shutdown === 'function') {
      await this.client.shutdown();
    }
  }
}
