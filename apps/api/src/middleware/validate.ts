import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { badRequest } from '../lib/errors';

type Source = 'body' | 'query' | 'params';

export function validate(schema: ZodTypeAny, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(badRequest('request payload failed validation', result.error.flatten()));
      return;
    }
    if (source === 'query') {
      Object.defineProperty(req, 'validatedQuery', { value: result.data, writable: true });
    } else {
      (req as any)[source] = result.data;
    }
    next();
  };
}

export function validated<T>(req: Request, source: Source = 'body'): T {
  if (source === 'query') {
    return ((req as any).validatedQuery ?? req.query) as T;
  }
  return req[source] as T;
}
