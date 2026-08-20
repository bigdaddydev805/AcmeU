export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, 'bad_request', message, details);

export const unauthorized = (message = 'authentication required') =>
  new AppError(401, 'unauthorized', message);

export const forbidden = (message = 'insufficient permissions') =>
  new AppError(403, 'forbidden', message);

export const notFound = (message = 'resource not found') =>
  new AppError(404, 'not_found', message);

export const conflict = (message: string, details?: unknown) =>
  new AppError(409, 'conflict', message, details);

export const tooManyRequests = (message = 'rate limit exceeded') =>
  new AppError(429, 'rate_limited', message);

export const serverError = (message = 'internal server error') =>
  new AppError(500, 'internal_error', message);
