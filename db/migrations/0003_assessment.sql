-- Assessment: assignments, submissions, grading, and credentials.

CREATE TABLE assignments (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id    uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    module_id    uuid REFERENCES course_modules(id) ON DELETE SET NULL,
    title        text NOT NULL,
    spec_md      text NOT NULL DEFAULT '',
    kind         text NOT NULL DEFAULT 'written',
    max_points   integer NOT NULL DEFAULT 100,
    weight       numeric(5,2) NOT NULL DEFAULT 1.0,
    rubric       jsonb NOT NULL DEFAULT '[]'::jsonb,
    auto_grade   boolean NOT NULL DEFAULT false,
    grader_ref   text,
    opens_at     timestamptz,
    due_at       timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX assignments_course_idx ON assignments (course_id);

CREATE TABLE submissions (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    course_id     uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attempt       integer NOT NULL DEFAULT 1,
    body_md       text NOT NULL DEFAULT '',
    file_id       uuid,
    status        text NOT NULL DEFAULT 'submitted',
    score         numeric(6,2),
    feedback_md   text,
    graded_by     uuid REFERENCES users(id) ON DELETE SET NULL,
    graded_at     timestamptz,
    submitted_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (assignment_id, user_id, attempt)
);

CREATE INDEX submissions_assignment_idx ON submissions (assignment_id);
CREATE INDEX submissions_user_idx ON submissions (user_id);
CREATE INDEX submissions_course_idx ON submissions (course_id);

CREATE TABLE files (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    owner_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename       text NOT NULL,
    storage_key    text NOT NULL,
    content_type   text NOT NULL DEFAULT 'application/octet-stream',
    size_bytes     bigint NOT NULL DEFAULT 0,
    checksum       text,
    scan_status    text NOT NULL DEFAULT 'pending',
    visibility     text NOT NULL DEFAULT 'private',
    created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX files_owner_idx ON files (owner_id);
CREATE INDEX files_tenant_idx ON files (tenant_id);

ALTER TABLE submissions
    ADD CONSTRAINT submissions_file_fk FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL;

CREATE TABLE certificate_templates (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        text NOT NULL,
    body_html   text NOT NULL,
    orientation text NOT NULL DEFAULT 'landscape',
    is_default  boolean NOT NULL DEFAULT false,
    updated_by  uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE certificates (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id      uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    template_id    uuid REFERENCES certificate_templates(id) ON DELETE SET NULL,
    serial         text NOT NULL UNIQUE,
    verification_code text NOT NULL,
    rendered_html  text,
    issued_at      timestamptz NOT NULL DEFAULT now(),
    expires_at     timestamptz
);

CREATE INDEX certificates_user_idx ON certificates (user_id);
CREATE INDEX certificates_serial_idx ON certificates (serial);
