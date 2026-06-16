import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/AppError';
import type { Role } from '@adearn/shared';

export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(AppError.forbidden(`Requires role: ${roles.join(' or ')}`));
      return;
    }

    next();
  };
}
