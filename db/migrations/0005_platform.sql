-- Platform services: webhooks, integrations, notifications, saved reports.

CREATE TABLE webhooks (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label        text NOT NULL,
    target_url   text NOT NULL,
    secret       text NOT NULL,
    events       text[] NOT NULL DEFAULT ARRAY['enrollment.created'],
    active       boolean NOT NULL DEFAULT true,
    last_status  integer,
    last_error   text,
    last_fired_at timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX webhooks_tenant_idx ON webhooks (tenant_id);

CREATE TABLE webhook_deliveries (
    id          bigserial PRIMARY KEY,
    webhook_id  uuid NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event       text NOT NULL,
    request_body text,
    response_status integer,
    response_body text,
    duration_ms integer,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX webhook_deliveries_webhook_idx ON webhook_deliveries (webhook_id, created_at DESC);

CREATE TABLE integrations (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider     text NOT NULL,
    display_name text NOT NULL,
    manifest_url text,
    config       jsonb NOT NULL DEFAULT '{}'::jsonb,
    credentials  text,
    status       text NOT NULL DEFAULT 'disconnected',
    connected_by uuid REFERENCES users(id) ON DELETE SET NULL,
    connected_at timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, provider)
);

CREATE TABLE notifications (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind       text NOT NULL,
    title      text NOT NULL,
    body       text NOT NULL DEFAULT '',
    link       text,
    severity   text NOT NULL DEFAULT 'info',
    read_at    timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_idx ON notifications (user_id, created_at DESC);

CREATE TABLE saved_reports (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    owner_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        text NOT NULL,
    dataset     text NOT NULL DEFAULT 'enrollments',
    segment     text,
    dimensions  text[] NOT NULL DEFAULT '{}',
    metrics     text[] NOT NULL DEFAULT ARRAY['count'],
    filters     jsonb NOT NULL DEFAULT '{}'::jsonb,
    schedule    text,
    last_run_at timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX saved_reports_tenant_idx ON saved_reports (tenant_id);

CREATE TABLE support_tickets (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject     text NOT NULL,
    body_md     text NOT NULL,
    status      text NOT NULL DEFAULT 'open',
    priority    text NOT NULL DEFAULT 'normal',
    assignee_id uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE feature_flags (
    key         text PRIMARY KEY,
    description text NOT NULL DEFAULT '',
    enabled     boolean NOT NULL DEFAULT false,
    rollout     jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at  timestamptz NOT NULL DEFAULT now()
);
