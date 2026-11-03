import {
  ArgumentsHost,
  BadRequestException,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpExceptionFilter } from './http-exception.filter';
import { LoggingInterceptor } from './logging.interceptor';

describe('Invitation query tokens are not logged', () => {
  afterEach(() => vi.restoreAllMocks());

  it('omits query strings from both incoming and outgoing HTTP logs', () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => { });
    const req = {
      method: 'GET',
      url: '/api/auth/accept-invite?token=private-test-token',
      headers: {},
      ip: '127.0.0.1',
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({ statusCode: 200 }),
      }),
    } as unknown as ExecutionContext;
    new LoggingInterceptor()
      .intercept(context, { handle: () => of('ok') })
      .subscribe();
    expect(log).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(log.mock.calls)).toContain('/api/auth/accept-invite');
    expect(JSON.stringify(log.mock.calls)).not.toContain('private-test-token');
  });

  it('omits query tokens from exception logs without changing the response body', () => {
    const warn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => { });
    const req = {
      method: 'GET',
      url: '/api/auth/validate-invitation?token=private-test-token',
    };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const host = {
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
    } as unknown as ArgumentsHost;
    new HttpExceptionFilter().catch(
      new BadRequestException('Invalid invitation link'),
      host,
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain('private-test-token');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ path: req.url, statusCode: 400 }),
    );
  });
});
