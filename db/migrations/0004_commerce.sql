-- Commerce: credits, coupons, orders, invoices.

CREATE TABLE coupons (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      uuid REFERENCES tenants(id) ON DELETE CASCADE,
    code           citext NOT NULL UNIQUE,
    kind           text NOT NULL DEFAULT 'percent',
    value          integer NOT NULL DEFAULT 10,
    credit_grant   integer NOT NULL DEFAULT 0,
    max_redemptions integer,
    redemption_count integer NOT NULL DEFAULT 0,
    per_user_limit integer NOT NULL DEFAULT 1,
    starts_at      timestamptz NOT NULL DEFAULT now(),
    expires_at     timestamptz,
    active         boolean NOT NULL DEFAULT true,
    created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE coupon_redemptions (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id   uuid NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id    uuid,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX coupon_redemptions_coupon_idx ON coupon_redemptions (coupon_id);
CREATE INDEX coupon_redemptions_user_idx ON coupon_redemptions (user_id);

CREATE TABLE credit_ledger (
    id          bigserial PRIMARY KEY,
    tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    delta       integer NOT NULL,
    balance_after integer NOT NULL,
    reason      text NOT NULL,
    reference   text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX credit_ledger_user_idx ON credit_ledger (user_id, created_at DESC);

CREATE TABLE orders (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id     uuid REFERENCES courses(id) ON DELETE SET NULL,
    coupon_id     uuid REFERENCES coupons(id) ON DELETE SET NULL,
    quantity      integer NOT NULL DEFAULT 1,
    subtotal_cents integer NOT NULL DEFAULT 0,
    discount_cents integer NOT NULL DEFAULT 0,
    total_cents   integer NOT NULL DEFAULT 0,
    currency      text NOT NULL DEFAULT 'USD',
    status        text NOT NULL DEFAULT 'pending',
    provider_ref  text,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX orders_user_idx ON orders (user_id, created_at DESC);

CREATE TABLE payment_methods (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    brand        text NOT NULL,
    last4        text NOT NULL,
    exp_month    integer NOT NULL,
    exp_year     integer NOT NULL,
    provider_token text NOT NULL,
    billing_zip  text,
    is_default   boolean NOT NULL DEFAULT false,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payment_methods_user_idx ON payment_methods (user_id);

CREATE TABLE invoices (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    number      text NOT NULL UNIQUE,
    period_start date NOT NULL,
    period_end   date NOT NULL,
    amount_cents integer NOT NULL DEFAULT 0,
    status      text NOT NULL DEFAULT 'open',
    pdf_file_id uuid REFERENCES files(id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);
