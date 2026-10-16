import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { join } from 'path';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { LoggingInterceptor } from './logging.interceptor';
import { HttpExceptionFilter } from './http-exception.filter';

/**
 * LoggerModule — global logging layer for MedTrail API.
 *
 * What gets saved where:
 *  logs/app.log      — every LOG level message (info, login events, OTP sent, etc.)
 *  logs/error.log    — only ERROR level (crashes, 5xx, unexpected failures)
 *  logs/combined.log — everything combined (all levels)
 *  Console           — colourful output during development
 *
 * Uses Winston under the hood via nest-winston.
 * Logs rotate daily to prevent huge files.
 */
@Module({
  imports: [
    WinstonModule.forRoot({
      transports: [
        // ── Console (terminal) ──────────────────────────────────────────────
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.colorize({ all: true }),
            winston.format.printf(({ timestamp, level, message, context, stack }) => {
              const ctx = context ? `[${String(context)}] ` : '';
              const trace = stack ? `\n${String(stack)}` : '';
              return `${String(timestamp)}  ${level}  ${ctx}${String(message)}${trace}`;
            }),
          ),
        }),

        // ── logs/app.log  (info + warn — daily events) ─────────────────────
        new winston.transports.File({
          filename: join(process.cwd(), 'logs', 'app.log'),
          level: 'info',
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf(({ timestamp, level, message, context }) => {
              const ctx = context ? `[${String(context)}] ` : '';
              return `${String(timestamp)}  ${level.toUpperCase().padEnd(7)}  ${ctx}${String(message)}`;
            }),
          ),
          maxsize: 10 * 1024 * 1024, // rotate after 10 MB
          maxFiles: 14,              // keep last 14 rotations
        }),

        // ── logs/error.log  (errors + stack traces only) ────────────────────
        new winston.transports.File({
          filename: join(process.cwd(), 'logs', 'error.log'),
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf(({ timestamp, level, message, context, stack }) => {
              const ctx = context ? `[${String(context)}] ` : '';
              const trace = stack ? `\nSTACK: ${String(stack)}` : '';
              return `${String(timestamp)}  ${level.toUpperCase().padEnd(7)}  ${ctx}${String(message)}${trace}`;
            }),
          ),
          maxsize: 10 * 1024 * 1024,
          maxFiles: 30,
        }),

        // ── logs/combined.log  (every level — full audit trail) ─────────────
        new winston.transports.File({
          filename: join(process.cwd(), 'logs', 'combined.log'),
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.json(),   // JSON format — easy to parse / search
          ),
          maxsize: 20 * 1024 * 1024,
          maxFiles: 7,
        }),
      ],
    }),
  ],
  providers: [
    // Automatically logs every HTTP request/response
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // Catches and logs every thrown exception
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class LoggerModule {}
