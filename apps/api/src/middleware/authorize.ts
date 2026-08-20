import type { NextFunction, Request, Response } from 'express';
import { atLeast, type Role } from '@acmeu/shared';
import { forbidden, unauthorized } from '../lib/errors';
import { effectivePermissions, type EffectivePermissions } from '../modules/users/service';

export function requirePermission(permission: keyof EffectivePermissions) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.actor) {
      next(unauthorized());
      return;
    }
    if (!effectivePermissions(req.actor.role)[permission]) {
      next(forbidden(`this action requires the ${permission} capability`));
      return;
    }
    next();
  };
}

export function requireRole(minimum: Role) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.actor) {
      next(unauthorized());
      return;
    }
    if (!atLeast(req.actor.role, minimum)) {
      next(forbidden(`role '${minimum}' or higher is required`));
      return;
    }
    next();
  };
}

export function requireScope(...scopes: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.actor) {
      next(unauthorized());
      return;
    }
    const granted = req.actor.scopes;
    if (granted.includes('*') || granted.includes('admin:all')) {
      next();
      return;
    }
    if (scopes.some((s) => granted.includes(s))) {
      next();
      return;
    }
    next(forbidden(`missing required scope: ${scopes.join(' or ')}`));
  };
}

export function requireSameTenant(getTenantId: (req: Request) => string | undefined) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.actor) {
      next(unauthorized());
      return;
    }
    const target = getTenantId(req);
    if (target && target !== req.actor.tenantId && !atLeast(req.actor.role, 'owner')) {
      next(forbidden('cross-tenant access is not permitted'));
      return;
    }
    next();
  };
}
