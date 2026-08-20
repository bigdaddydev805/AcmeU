-- Catalog: programs, courses, modules, lessons, and enrollment.

CREATE TABLE programs (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    slug        text NOT NULL,
    title       text NOT NULL,
    summary     text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, slug)
);

CREATE TABLE courses (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    program_id     uuid REFERENCES programs(id) ON DELETE SET NULL,
    owner_id       uuid NOT NULL REFERENCES users(id),
    code           text NOT NULL,
    title          text NOT NULL,
    subtitle       text,
    description_md text NOT NULL DEFAULT '',
    level          text NOT NULL DEFAULT 'foundation',
    category       text NOT NULL DEFAULT 'general',
    tags           text[] NOT NULL DEFAULT '{}',
    visibility     text NOT NULL DEFAULT 'tenant',
    status         text NOT NULL DEFAULT 'draft',
    price_cents    integer NOT NULL DEFAULT 0,
    seat_limit     integer,
    seats_taken    integer NOT NULL DEFAULT 0,
    duration_mins  integer NOT NULL DEFAULT 0,
    hero_image_url text,
    rating_avg     numeric(3,2) NOT NULL DEFAULT 0,
    rating_count   integer NOT NULL DEFAULT 0,
    settings       jsonb NOT NULL DEFAULT '{}'::jsonb,
    published_at   timestamptz,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, code)
);

CREATE INDEX courses_tenant_status_idx ON courses (tenant_id, status);
CREATE INDEX courses_category_idx ON courses (category);
CREATE INDEX courses_title_trgm ON courses USING gin (title gin_trgm_ops);

CREATE TABLE course_modules (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id  uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title      text NOT NULL,
    position   integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX course_modules_course_idx ON course_modules (course_id, position);

CREATE TABLE lessons (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id   uuid NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
    course_id   uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title       text NOT NULL,
    kind        text NOT NULL DEFAULT 'reading',
    body_md     text NOT NULL DEFAULT '',
    media_url   text,
    duration_mins integer NOT NULL DEFAULT 5,
    position    integer NOT NULL DEFAULT 0,
    is_preview  boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX lessons_module_idx ON lessons (module_id, position);
CREATE INDEX lessons_course_idx ON lessons (course_id);

CREATE TABLE enrollments (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_id      uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role           text NOT NULL DEFAULT 'learner',
    status         text NOT NULL DEFAULT 'active',
    progress_pct   integer NOT NULL DEFAULT 0,
    last_lesson_id uuid REFERENCES lessons(id) ON DELETE SET NULL,
    enrolled_at    timestamptz NOT NULL DEFAULT now(),
    completed_at   timestamptz,
    UNIQUE (course_id, user_id)
);

CREATE INDEX enrollments_user_idx ON enrollments (user_id);
CREATE INDEX enrollments_course_idx ON enrollments (course_id);

CREATE TABLE lesson_progress (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    lesson_id    uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    state        text NOT NULL DEFAULT 'started',
    seconds_spent integer NOT NULL DEFAULT 0,
    updated_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (enrollment_id, lesson_id)
);

CREATE TABLE discussion_posts (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id   uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id   uuid REFERENCES lessons(id) ON DELETE CASCADE,
    author_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id   uuid REFERENCES discussion_posts(id) ON DELETE CASCADE,
    body_md     text NOT NULL,
    pinned      boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX discussion_posts_course_idx ON discussion_posts (course_id, created_at DESC);

CREATE TABLE course_reviews (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id  uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating     integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
    body       text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (course_id, user_id)
);
