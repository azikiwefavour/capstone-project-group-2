import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';

/**
 * LoggingInterceptor — runs around every controller method.
 *
 * Logs:
 *   → Incoming:  [METHOD] /path  (IP)
 *   ← Outgoing:  [METHOD] /path  STATUS  Xms
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const { method, url, ip } = req;
    // Invitation tokens are carried in query parameters; never log the query string.
    const path = url.split('?')[0];
    const userAgent = req.headers['user-agent'] ?? '';
    const start = Date.now();

    this.logger.log(`→ ${method} ${path}  [${ip}]  ${userAgent}`);

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        this.logger.log(
          `← ${method} ${path}  ${res.statusCode}  ${duration}ms`,
        );
      }),
    );
  }
}
