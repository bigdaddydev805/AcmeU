-- Core tenancy, identity, and access primitives.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TABLE tenants (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            citext NOT NULL UNIQUE,
    name            text NOT NULL,
    plan            text NOT NULL DEFAULT 'starter',
    seats_purchased integer NOT NULL DEFAULT 25,
    branding        jsonb NOT NULL DEFAULT '{}'::jsonb,
    settings        jsonb NOT NULL DEFAULT '{}'::jsonb,
    status          text NOT NULL DEFAULT 'active',
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email             citext NOT NULL,
    password_hash     text,
    display_name      text NOT NULL,
    title             text,
    bio               text,
    avatar_url        text,
    role              text NOT NULL DEFAULT 'learner',
    status            text NOT NULL DEFAULT 'active',
    locale            text NOT NULL DEFAULT 'en-US',
    timezone          text NOT NULL DEFAULT 'UTC',
    credits           integer NOT NULL DEFAULT 0,
    mfa_enabled       boolean NOT NULL DEFAULT false,
    mfa_secret        text,
    mfa_backup_codes  jsonb NOT NULL DEFAULT '[]'::jsonb,
    preferences       jsonb NOT NULL DEFAULT '{}'::jsonb,
    profile_encrypted text,
    last_login_at     timestamptz,
    password_changed_at timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, email)
);

CREATE INDEX users_tenant_idx ON users (tenant_id);
CREATE INDEX users_email_idx ON users (email);
CREATE INDEX users_display_name_trgm ON users USING gin (display_name gin_trgm_ops);

CREATE TABLE refresh_tokens (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash   text NOT NULL,
    family_id    uuid NOT NULL DEFAULT gen_random_uuid(),
    user_agent   text,
    ip_address   inet,
    revoked_at   timestamptz,
    expires_at   timestamptz NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX refresh_tokens_user_idx ON refresh_tokens (user_id);
CREATE INDEX refresh_tokens_hash_idx ON refresh_tokens (token_hash);

CREATE TABLE password_resets (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      text NOT NULL,
    used_at    timestamptz,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX password_resets_token_idx ON password_resets (token);

CREATE TABLE api_keys (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label        text NOT NULL,
    key_prefix   text NOT NULL,
    key_hash     text NOT NULL,
    scopes       text[] NOT NULL DEFAULT ARRAY['catalog:read'],
    last_used_at timestamptz,
    expires_at   timestamptz,
    revoked_at   timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX api_keys_prefix_idx ON api_keys (key_prefix);
CREATE INDEX api_keys_tenant_idx ON api_keys (tenant_id);

CREATE TABLE audit_logs (
    id          bigserial PRIMARY KEY,
    tenant_id   uuid,
    actor_id    uuid,
    actor_label text,
    action      text NOT NULL,
    target_type text,
    target_id   text,
    metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
    ip_address  text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_tenant_created_idx ON audit_logs (tenant_id, created_at DESC);
CREATE INDEX audit_logs_action_idx ON audit_logs (action);
