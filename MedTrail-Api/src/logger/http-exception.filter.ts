import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * HttpExceptionFilter — catches ALL exceptions (HTTP and unexpected).
 *
 * Logs:
 *   ✗ STATUS [METHOD] /path — message
 *     stack trace (only for 5xx / unexpected errors)
 *
 * Sends a clean JSON error body to the client.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody = isHttp
      ? (exception.getResponse() as object)
      : { message: 'Internal server error' };

    const message =
      typeof responseBody === 'object' && 'message' in responseBody
        ? (responseBody as { message: string | string[] }).message
        : responseBody;

    // Log at WARN for client errors (4xx) and ERROR for server errors (5xx)
    if (status >= 500) {
      this.logger.error(
        `✗ ${status} [${req.method}] ${req.url} — ${JSON.stringify(message)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `✗ ${status} [${req.method}] ${req.url} — ${JSON.stringify(message)}`,
      );
    }

    res.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: req.url,
      ...(typeof responseBody === 'object' ? responseBody : { message: responseBody }),
    });
  }
}
