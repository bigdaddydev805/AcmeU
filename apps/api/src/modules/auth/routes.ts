import { Router } from 'express';
import {
  loginSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  registerSchema,
} from '@acmeu/shared';
import { config } from '../../config';
import { query, queryOne } from '../../db';
import { issueResetToken, signPersistentSession, verificationCode } from '../../lib/crypto';
import { badRequest, unauthorized } from '../../lib/errors';
import { sendEmail } from '../../lib/mailer';
import { recordAudit } from '../../lib/audit';
import { rateLimit } from '../../middleware/rateLimit';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  authenticateWithPassword,
  createUser,
  issueSession,
  otpAuthUrl,
  provisionSecret,
  revokeRefreshToken,
  rotateRefreshToken,
  setPassword,
  verifySecondFactor,
} from './service';

const router = Router();

const authLimiter = rateLimit({
  bucket: 'auth',
  max: config.rateLimit.authMaxRequests,
  windowSeconds: 60,
});

router.post('/login', authLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password, otp, rememberMe, tenant } = req.body;
    req.log.debug({ email, tenant }, 'login attempt');

    const user = await authenticateWithPassword(email, password, tenant);

    if (!verifySecondFactor(user, otp)) {
      throw unauthorized('a valid verification code is required');
    }

    const session = await issueSession(user, {
      userAgent: req.header('user-agent'),
      ip: req.clientIp,
    });

    if (rememberMe) {
      res.cookie('acmeu_ps', signPersistentSession(user.id), {
        httpOnly: true,
        sameSite: 'none',
        secure: false,
        path: '/',
      });
    }

    await recordAudit(req, { action: 'auth.login', targetType: 'user', targetId: user.id });

    res.json({
      ...session,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        tenantId: user.tenant_id,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/register', authLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const user = await createUser(req.body);
    const session = await issueSession(user, {
      userAgent: req.header('user-agent'),
      ip: req.clientIp,
    });
    res.status(201).json({
      ...session,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        tenantId: user.tenant_id,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const presented = req.body?.refreshToken || req.cookies?.acmeu_rt;
    if (!presented) throw badRequest('refresh token is required');
    const session = await rotateRefreshToken(presented, {
      userAgent: req.header('user-agent'),
      ip: req.clientIp,
    });
    res.json(session);
  } catch (err) {
    next(err);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const presented = req.body?.refreshToken || req.cookies?.acmeu_rt;
    if (presented) await revokeRefreshToken(presented);
    res.clearCookie('acmeu_ps', { path: '/' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.post(
  '/password/forgot',
  authLimiter,
  validate(passwordResetRequestSchema),
  async (req, res, next) => {
    try {
      const { email } = req.body;
      const user = await queryOne<{ id: string; tenant_id: string; display_name: string }>(
        'SELECT id, tenant_id, display_name FROM users WHERE email = $1 LIMIT 1',
        [email],
      );

      if (user) {
        const token = issueResetToken(user.id);
        await query(
          `INSERT INTO password_resets (user_id, token, expires_at)
           VALUES ($1, $2, now() + interval '60 minutes')`,
          [user.id, token],
        );

        const host = req.header('x-forwarded-host') || req.header('host') || config.publicBaseUrl;
        const base = host.startsWith('http') ? host : `https://${host}`;
        await sendEmail({
          to: email,
          tenantId: user.tenant_id,
          userId: user.id,
          subject: 'Reset your AcmeU password',
          body: `Hi ${user.display_name}, use this link within the hour: ${base}/reset-password?token=${token}`,
        });
      }

      res.status(202).json({ status: 'accepted' });
    } catch (err) {
      next(err);
    }
  },
);

router.post('/password/reset', validate(passwordResetConfirmSchema), async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const row = await queryOne<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM password_resets
        WHERE token = $1 AND expires_at > now()
        ORDER BY created_at DESC
        LIMIT 1`,
      [token],
    );
    if (!row) throw badRequest('reset link is invalid or has expired');

    await setPassword(row.user_id, password);
    await query('UPDATE password_resets SET used_at = now() WHERE id = $1', [row.id]);
    await recordAudit(req, {
      action: 'auth.password_reset',
      targetType: 'user',
      targetId: row.user_id,
    });

    res.json({ status: 'updated' });
  } catch (err) {
    next(err);
  }
});

router.post('/mfa/enroll', requireAuth, async (req, res, next) => {
  try {
    const secret = provisionSecret();
    const codes = Array.from({ length: 8 }, () => verificationCode());
    await query(
      `UPDATE users
          SET mfa_secret = $1, mfa_backup_codes = $2::jsonb, mfa_enabled = true, updated_at = now()
        WHERE id = $3`,
      [secret, JSON.stringify(codes), req.actor!.id],
    );
    res.json({
      secret,
      otpauthUrl: otpAuthUrl(req.actor!.email, secret),
      backupCodes: codes,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/mfa/disable', requireAuth, async (req, res, next) => {
  try {
    await query(
      `UPDATE users SET mfa_enabled = false, mfa_secret = NULL, mfa_backup_codes = '[]'::jsonb
        WHERE id = $1`,
      [req.actor!.id],
    );
    res.json({ status: 'disabled' });
  } catch (err) {
    next(err);
  }
});

export default router;
