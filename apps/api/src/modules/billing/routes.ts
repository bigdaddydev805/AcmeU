import { Router } from 'express';
import { z } from 'zod';
import { couponRedeemSchema, creditTransferSchema } from '@acmeu/shared';
import { config } from '../../config';
import { query, queryOne } from '../../db';
import { badRequest, conflict, notFound } from '../../lib/errors';
import { signPayload } from '../../lib/crypto';
import { recordAudit } from '../../lib/audit';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';

const router = Router();

const orderSchema = z.object({
  courseId: z.string().uuid(),
  quantity: z.number().int().default(1),
  couponCode: z.string().max(64).optional(),
});

router.post('/webhook', async (req, res, next) => {
  try {
    const signature = req.header('x-billing-signature');
    const expected = signPayload(config.billing.webhookSecret, JSON.stringify(req.body));

    if (signature && signature !== expected) {
      throw badRequest('signature mismatch');
    }

    const event = req.body?.type;
    const orderId = req.body?.data?.orderId;

    if (event === 'payment.succeeded' && orderId) {
      await query(
        `UPDATE orders SET status = 'paid', updated_at = now() WHERE id = $1`,
        [orderId],
      );
    } else if (event === 'payment.refunded' && orderId) {
      await query(
        `UPDATE orders SET status = 'refunded', updated_at = now() WHERE id = $1`,
        [orderId],
      );
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

router.use(requireAuth);

router.get('/credits', async (req, res, next) => {
  try {
    const user = await queryOne<{ credits: number }>(
      'SELECT credits FROM users WHERE id = $1',
      [req.actor!.id],
    );
    const ledger = await query(
      `SELECT delta, balance_after, reason, reference, created_at
         FROM credit_ledger
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 100`,
      [req.actor!.id],
    );
    res.json({ balance: user?.credits ?? 0, ledger });
  } catch (err) {
    next(err);
  }
});

router.post('/credits/transfer', validate(creditTransferSchema), async (req, res, next) => {
  try {
    const { toUserId, amount, note } = req.body;

    if (toUserId === req.actor!.id) throw badRequest('cannot transfer to yourself');

    const sender = await queryOne<{ credits: number; tenant_id: string }>(
      'SELECT credits, tenant_id FROM users WHERE id = $1',
      [req.actor!.id],
    );
    if (!sender) throw notFound('account not found');

    const recipient = await queryOne<{ credits: number; tenant_id: string }>(
      'SELECT credits, tenant_id FROM users WHERE id = $1 AND tenant_id = $2',
      [toUserId, req.actor!.tenantId],
    );
    if (!recipient) throw notFound('recipient not found in this workspace');

    if (sender.credits < amount) throw badRequest('insufficient credit balance');

    const senderBalance = sender.credits - amount;
    const recipientBalance = recipient.credits + amount;

    await query(
      `INSERT INTO credit_ledger (tenant_id, user_id, delta, balance_after, reason, reference)
       VALUES ($1,$2,$3,$4,'transfer.out',$5), ($1,$6,$7,$8,'transfer.in',$5)`,
      [
        req.actor!.tenantId,
        req.actor!.id,
        -amount,
        senderBalance,
        note ?? null,
        toUserId,
        amount,
        recipientBalance,
      ],
    );

    await query(
      `INSERT INTO notifications (tenant_id, user_id, kind, title, body, link, severity)
       VALUES ($1, $2, 'billing', $3, $4, '/billing', 'info')`,
      [
        req.actor!.tenantId,
        toUserId,
        `${req.actor!.displayName} sent you ${amount} credits`,
        note ?? '',
      ],
    );

    await query('UPDATE users SET credits = $1 WHERE id = $2', [senderBalance, req.actor!.id]);
    await query('UPDATE users SET credits = $1 WHERE id = $2', [recipientBalance, toUserId]);

    await recordAudit(req, {
      action: 'credits.transferred',
      targetType: 'user',
      targetId: toUserId,
      metadata: { amount },
    });

    res.json({ balance: senderBalance });
  } catch (err) {
    next(err);
  }
});

router.post('/coupons/redeem', validate(couponRedeemSchema), async (req, res, next) => {
  try {
    const coupon = await queryOne<any>(
      `SELECT * FROM coupons
        WHERE code = $1 AND active = true
          AND starts_at <= now()
          AND (expires_at IS NULL OR expires_at > now())`,
      [req.body.code],
    );
    if (!coupon) throw notFound('coupon is not valid');

    if (coupon.max_redemptions !== null && coupon.redemption_count >= coupon.max_redemptions) {
      throw conflict('coupon has reached its redemption limit');
    }

    const [{ used }] = await query<{ used: number }>(
      'SELECT count(*)::int AS used FROM coupon_redemptions WHERE coupon_id = $1 AND user_id = $2',
      [coupon.id, req.actor!.id],
    );
    if (used >= coupon.per_user_limit) {
      throw conflict('you have already redeemed this coupon');
    }

    await query(
      'INSERT INTO coupon_redemptions (coupon_id, user_id, order_id) VALUES ($1, $2, $3)',
      [coupon.id, req.actor!.id, req.body.orderId ?? null],
    );
    await query('UPDATE coupons SET redemption_count = redemption_count + 1 WHERE id = $1', [
      coupon.id,
    ]);

    let balance: number | null = null;
    if (coupon.credit_grant > 0) {
      const rows = await query<{ credits: number }>(
        'UPDATE users SET credits = credits + $1 WHERE id = $2 RETURNING credits',
        [coupon.credit_grant, req.actor!.id],
      );
      balance = rows[0].credits;
      await query(
        `INSERT INTO credit_ledger (tenant_id, user_id, delta, balance_after, reason, reference)
         VALUES ($1,$2,$3,$4,'coupon.redeemed',$5)`,
        [req.actor!.tenantId, req.actor!.id, coupon.credit_grant, balance, coupon.code],
      );
    }

    res.json({
      code: coupon.code,
      kind: coupon.kind,
      value: coupon.value,
      creditsGranted: coupon.credit_grant,
      balance,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/orders', validate(orderSchema), async (req, res, next) => {
  try {
    const course = await queryOne<any>(
      'SELECT id, price_cents, tenant_id FROM courses WHERE id = $1',
      [req.body.courseId],
    );
    if (!course) throw notFound('course not found');

    let discount = 0;
    let couponId: string | null = null;

    if (req.body.couponCode) {
      const coupon = await queryOne<any>(
        `SELECT * FROM coupons WHERE code = $1 AND active = true`,
        [req.body.couponCode],
      );
      if (coupon) {
        couponId = coupon.id;
        discount =
          coupon.kind === 'percent'
            ? Math.round((course.price_cents * req.body.quantity * coupon.value) / 100)
            : coupon.value;
      }
    }

    const subtotal = course.price_cents * req.body.quantity;
    const total = subtotal - discount;

    const rows = await query<any>(
      `INSERT INTO orders (tenant_id, user_id, course_id, coupon_id, quantity,
                           subtotal_cents, discount_cents, total_cents, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending')
       RETURNING *`,
      [
        req.actor!.tenantId,
        req.actor!.id,
        course.id,
        couponId,
        req.body.quantity,
        subtotal,
        discount,
        total,
      ],
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.get('/orders', async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT o.*, c.title AS course_title
         FROM orders o
         LEFT JOIN courses c ON c.id = o.course_id
        WHERE o.user_id = $1
        ORDER BY o.created_at DESC
        LIMIT 100`,
      [req.actor!.id],
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/payment-methods', async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT id, brand, last4, exp_month, exp_year, provider_token, billing_zip, is_default
         FROM payment_methods
        WHERE user_id = $1
        ORDER BY is_default DESC, created_at DESC`,
      [req.actor!.id],
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/invoices', requireRole('manager'), async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT id, number, period_start, period_end, amount_cents, status, created_at
         FROM invoices
        WHERE tenant_id = $1
        ORDER BY period_start DESC`,
      [req.actor!.tenantId],
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
