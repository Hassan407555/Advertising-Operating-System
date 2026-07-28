import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Applies rate limiting to auth and AI generation endpoints.
 * All other routes skip throttling.
 */
@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    if (await super.shouldSkip(context)) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ originalUrl?: string }>();
    const path = request.originalUrl?.split('?')[0] ?? '';

    const shouldThrottle =
      path.startsWith('/api/auth') ||
      path === '/api/ai/generate' ||
      /^\/api\/ai-sessions\/[^/]+\/generate$/.test(path);

    return !shouldThrottle;
  }
}
