import {
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';

import { JwtPayload } from '../interfaces/jwt-payload.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): JwtPayload => {
    const request = context.switchToHttp().getRequest<{
      user: JwtPayload;
      headers: Record<string, string | string[] | undefined>;
      method: string;
      url: string;
    }>();

    console.log('============== CURRENT USER DECORATOR ==============');
    console.log('Request:', request.method, request.url);
    console.log('Authorization Header:', request.headers.authorization);
    console.log('Request User:', request.user);
    console.log('====================================================');

    return request.user;
  },
);