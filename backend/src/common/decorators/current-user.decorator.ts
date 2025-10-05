import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

type AuthenticatedRequest = Request & { user?: Express.User };

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
