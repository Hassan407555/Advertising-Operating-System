import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

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

    return !path.startsWith('/api/auth');
  }
}
