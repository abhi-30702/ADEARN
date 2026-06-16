import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '../lib/AppError';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const details: Record<string, string[]> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path.join('.');
        details[field] = details[field] ?? [];
        details[field].push(issue.message);
      });
      next(AppError.validation('Validation failed', details));
      return;
    }

    req[source] = result.data;
    next();
  };
}
