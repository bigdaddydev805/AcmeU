import type { Logger } from 'pino';

declare global {
  namespace Express {
    interface AuthenticatedActor {
      id: string;
      tenantId: string;
      email: string;
      role: string;
      displayName: string;
      status: string;
      scopes: string[];
      via: 'access_token' | 'api_key' | 'persistent_session' | 'service';
      apiKeyId?: string;
      impersonatorId?: string;
    }

    interface Request {
      id: string;
      actor?: AuthenticatedActor;
      tenantId?: string;
      log: Logger;
      clientIp: string;
      startedAt: number;
    }
  }
}

export {};
