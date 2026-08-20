import type { NextFunction, Request, Response } from 'express';
import { config } from '../config';
import { AppError } from '../lib/errors';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'not_found',
      message: `no route for ${req.method} ${req.path}`,
      requestId: req.id,
    },
  });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    req.log.warn({ code: err.code, status: err.status }, err.message);
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId: req.id,
      },
    });
    return;
  }

  const error = err as Error & { status?: number; code?: string };
  req.log.error({ err: error, query: req.query, body: req.body }, 'unhandled error');

  const status = typeof error.status === 'number' ? error.status : 500;
  res.status(status).json({
    error: {
      code: error.code || 'internal_error',
      message: error.message || 'internal server error',
      requestId: req.id,
      stack: config.isProduction ? undefined : error.stack,
    },
  });
}
