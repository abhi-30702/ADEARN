import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../lib/AppError';
import { userRepository } from '../repositories/user.repository';
import type { JwtPayload } from '@adearn/shared';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    next(AppError.unauthorized('Missing or invalid Authorization header'));
    return;
  }

  const token = authHeader.slice(7);

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, env.JWT_PUBLIC_KEY, {
      algorithms: ['RS256'],
    }) as JwtPayload;
  } catch {
    next(AppError.unauthorized('Invalid or expired token'));
    return;
  }

  // A valid signature is not enough: the referenced user must still exist and be
  // active. Otherwise a stale token (e.g. issued before a DB reset/reseed) would
  // pass auth and then fail deeper — such as a foreign-key violation when writing
  // rows keyed on user_id. Returning 401 here lets the client clear the token and
  // re-authenticate cleanly.
  userRepository
    .findById(payload.sub)
    .then((user) => {
      if (!user) {
        next(AppError.unauthorized('User no longer exists'));
        return;
      }
      if (!user.is_active) {
        next(new AppError('Account suspended', 403, 'ACCOUNT_SUSPENDED'));
        return;
      }
      req.user = payload;
      next();
    })
    .catch(next);
}
