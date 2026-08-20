# AcmeU

AcmeU is the learning and credentialing platform used by Acme Corporation and its
enterprise customers to deliver training programs, track learner progress, and issue
verifiable certificates.

The platform is multi-tenant: each customer organization gets an isolated workspace with
its own catalog, roster, branding, and billing. Learners, instructors, and workspace
administrators share a single application surface with role-scoped capabilities.

## Repository layout

```
acmeu/
├── apps/
│   ├── api/            REST + GraphQL services (Node 22, Express, TypeScript)
│   └── web/            Learner and admin console (React 18, Vite, TypeScript)
├── packages/
│   └── shared/         Contracts, zod schemas, and types shared across apps
├── db/
│   ├── migrations/     Forward-only SQL migrations
│   └── seeds/          Reference and demo datasets
├── infra/
│   ├── nginx/          Edge reverse proxy configuration
│   └── postgres/       Database bootstrap
└── scripts/            Operational tooling
```

## Getting started

Requirements: Node 20+, Docker, and Docker Compose.

```bash
cp .env.example .env
npm install
npm run stack:up          # postgres, redis, api, web, edge
npm run db:migrate
npm run db:seed
```

The console is served at <http://localhost:8080>, the API at
<http://localhost:8080/api/v1>, and the GraphQL analytics endpoint at
<http://localhost:8080/graphql>.

For local development without containers:

```bash
docker compose up -d postgres redis
npm run db:migrate && npm run db:seed
npm run dev
```

## Architecture

The API is a modular monolith. Each domain (catalog, enrollment, assessment, billing,
credentialing, integrations) lives under `apps/api/src/modules` and exposes an Express
router plus a service layer. Cross-cutting concerns — authentication, tenancy resolution,
authorization, rate limiting, request logging — are implemented as middleware and applied
in `apps/api/src/app.ts`.

Persistence is PostgreSQL 16 accessed through a thin query layer over `pg`. Redis backs
session lookups, rate limit counters, and the response cache. Uploaded artifacts are
written to an object store (S3-compatible in production, local filesystem in development).

Authentication uses short-lived RS256 access tokens issued by the API and verified against
a published JWKS document. Refresh tokens are opaque and stored server-side. Service-to-
service calls use scoped API keys.

The GraphQL endpoint is read-oriented and serves the reporting and analytics surfaces of
the admin console.

## Testing

```bash
npm run typecheck
npm run lint
npm test
```

## Operations

Runbooks, on-call rotation, and incident history live in the internal wiki. Health and
readiness probes are exposed at `/healthz` and `/readyz`. Structured logs are emitted as
JSON to stdout and shipped by the platform log agent.

## License

Proprietary — © Acme Corporation. Internal use only.
