# Design Document — User Management Dashboard

> **Project:** Start-Devops-Journey
> **Purpose:** A deliberately small product used as a vehicle for learning DevOps.
> **Status:** Design approved, implementation not started.
> **Last updated:** 2026-08-14

---

## 1. Why this document exists

The app is the excuse; the infrastructure is the lesson. This document pins down every
decision *before* implementation so that when something breaks during a rebuild, you can
tell the difference between "I mis-designed this" and "I mis-typed this."

Every infrastructure choice below carries a **Why** note. If you only skim one thing,
skim those.

---

## 2. Goals and non-goals

### Goals

| # | Goal |
|---|---|
| G1 | Replace MongoDB with self-hosted PostgreSQL, data surviving container recreation |
| G2 | Replace the `create-next-app` boilerplate with a real dashboard UI |
| G3 | Rewrite the API so it matches exactly what the UI needs — no more, no less |
| G4 | Make every Compose service report honest health |
| G5 | Practice migrations-as-code, backup discipline, and container networking |

### Non-goals

Explicitly out of scope, so they don't creep in mid-build:

- Authentication / login / sessions — users are *records*, not *accounts*
- Multi-tenancy, roles-as-permissions, audit logs
- Kubernetes, Helm, service mesh (a later project, once this one is boring)
- Horizontal scaling, read replicas, connection pooling beyond Prisma's default

---

## 3. System architecture

```mermaid
graph TB
    Browser["Browser<br/>localhost:3000"]

    subgraph docker["Docker network: app-network"]
        FE["frontend<br/>Next.js 15<br/>:3000"]
        BE["backend<br/>Express + Prisma<br/>:3001"]
        PG[("postgres<br/>16-alpine<br/>:5432")]
        AD["adminer<br/>:8080"]
        VOL[["volume: postgres_data"]]
    end

    Browser -->|"client fetch<br/>NEXT_PUBLIC_API_URL<br/>http://localhost:3001"| BE
    Browser --> FE
    FE -->|"server components<br/>INTERNAL_API_URL<br/>http://backend:3001"| BE
    BE -->|"DATABASE_URL<br/>postgres:5432"| PG
    AD --> PG
    PG -.->|"/var/lib/postgresql/data"| VOL
```

### The two-URL problem (read this twice)

The single most common Docker mistake in a Next.js stack. The frontend talks to the
backend from **two different places**, and they do not share a DNS namespace:

| Caller | Runs where | Resolves `backend` ? | Uses |
|---|---|---|---|
| Server Component / Route Handler | inside the `frontend` container | ✅ yes, via Docker DNS | `INTERNAL_API_URL=http://backend:3001` |
| Client Component (`"use client"`) | in the user's browser | ❌ no, it's outside Docker | `NEXT_PUBLIC_API_URL=http://localhost:3001` |

**Why two vars:** `NEXT_PUBLIC_*` values are inlined into the JS bundle at build time and
shipped to the browser. `INTERNAL_API_URL` is read at runtime, server-side only, and
never leaves the container. Using one variable for both means one of the two callers
always fails — usually with `ECONNREFUSED` or `getaddrinfo ENOTFOUND backend`.

---

## 4. Service topology

| Service | Image / build | Host port | Depends on | Healthcheck |
|---|---|---|---|---|
| `postgres` | `postgres:16-alpine` | `5432` | — | `pg_isready -U $POSTGRES_USER -d $POSTGRES_DB` |
| `backend` | `./backend` | `3001` | `postgres` (healthy) | `node healthcheck.js` → hits `/readyz`, exits 0/1 |
| `frontend` | `./frontend` | `3000` | `backend` (healthy) | `wget --spider -q http://localhost:3000` |
| `adminer` | `adminer:latest` | `8080` | `postgres` (healthy) | — (dev tool, not critical path) |

**Why `depends_on: condition: service_healthy`:** plain `depends_on` only waits for the
container to *start*, not to be *usable*. Postgres takes several seconds to initialize on
first run (creating the cluster, running init scripts). Without the health condition, the
backend connects to a socket that isn't listening yet, crashes, and restart-loops until
Postgres happens to be ready. It eventually works, which is exactly what makes it a
nasty bug — it looks fine locally and fails in CI.

**Why `postgres:16-alpine` and not `latest`:** `latest` means your teammate's machine and
your machine can be on different major versions, and Postgres refuses to start on a data
directory written by a newer major version. Pin the major version. Always.

---

## 5. Data durability

This is the hard requirement of the whole project.

```yaml
volumes:
  postgres_data:          # named volume — managed by Docker, outlives containers

services:
  postgres:
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

### Named volume vs bind mount

| | Named volume | Bind mount (`./data:/var/lib/...`) |
|---|---|---|
| Performance on macOS/Windows | fast | slow (filesystem translation layer) |
| File ownership / permissions | Docker-managed, correct | frequent `permission denied` on Linux |
| Accidental `git add` of DB files | impossible | easy, and painful |
| Portability | Docker handles it | path-dependent |

**Decision: named volume.** Bind mounts are correct for *source code* (that's what
`./backend:/usr/app` is for — live reload), and wrong for *database internals*.

### The one command that destroys everything

```
docker compose down      ← safe, keeps volumes
docker compose down -v   ← DELETES postgres_data, unrecoverable
```

Never run `-v` on this project. If something is broken, the fix is a migration or a
`docker compose build --no-cache`, never a volume wipe. "Delete the volume and start
over" is how you learn nothing and lose data simultaneously.

### Backup discipline

| Script | Does |
|---|---|
| `scripts/backup.sh` | `pg_dump` → `./backups/<db>-YYYYMMDD-HHMMSS.sql` |
| `scripts/restore.sh` | restores a chosen dump file into the running container |

**Rule: run `backup.sh` before every migration.** Not because migrations usually fail —
because the one time it does fail, it fails at the worst moment. `./backups/` goes in
`.gitignore`.

### Verifying persistence (do this in Phase 2, not later)

1. Insert a row via Adminer
2. `docker compose down`
3. `docker compose up -d`
4. Row is still there → the volume works

If you skip this test you will not find out until you have data worth losing.

---

## 6. Data model

```prisma
enum Role {
  ADMIN
  DEVELOPER
  USER
}

enum Status {
  ACTIVE
  INACTIVE
}

model User {
  id        String   @id @default(uuid()) @db.Uuid
  name      String   @db.VarChar(120)
  email     String   @unique @db.VarChar(255)
  password  String                        // bcrypt hash, cost 10 — never plaintext
  role      Role     @default(USER)
  status    Status   @default(ACTIVE)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([role])
  @@index([status])
  @@index([createdAt])
  @@map("users")
}
```

### Notes on the schema

- **`uuid` over auto-increment `int`** — sequential IDs leak how many users you have and
  make records guessable in a URL. UUIDs cost a little index size and buy you that back.
- **Native Postgres `enum` via Prisma** — the database rejects `role = 'Manager'` even if
  a bug bypasses application validation. The old Mongoose `enum` was only enforced in
  Node; a stray `mongosh` write could insert anything.
- **Indexes on `role`, `status`, `createdAt`** — these are exactly the three columns the
  UI filters and sorts by. Indexes should follow the query patterns, not be sprinkled
  hopefully.
- **`@@map("users")`** — Prisma models are singular by convention, SQL tables plural.
  Keeps both idiomatic.
- **`password` is never returned by the API.** Not "filtered in the frontend" — excluded
  in the Prisma `select` clause, so it never leaves the process.

### Migration policy

- Schema changes ship as `prisma migrate dev` locally → committed SQL under
  `prisma/migrations/` → `prisma migrate deploy` at container start.
- **Never `prisma db push`** against a database with real data. It reconciles the schema
  by whatever means necessary, including dropping columns without telling you.
- Migrations are **forward-only**. Made a mistake? Write the next migration that fixes
  it. Don't edit a migration that has already run.

---

## 7. API contract

Base path `/api`. JSON in, JSON out. This contract is the agreement between the two
rewrites — build the backend to it, build the UI against it.

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/users` | Paginated, filtered, sorted list |
| `GET` | `/api/users/:id` | Single user |
| `POST` | `/api/users` | Create |
| `PATCH` | `/api/users/:id` | Partial update |
| `DELETE` | `/api/users/:id` | Delete |
| `GET` | `/api/users/stats` | Counts for the dashboard header |
| `GET` | `/healthz` | Liveness — process only |
| `GET` | `/readyz` | Readiness — runs `SELECT 1` |

### `GET /api/users` query parameters

| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | int ≥ 1 | `1` | |
| `limit` | int 1–100 | `10` | capped server-side; a client asking for 1,000,000 gets 100 |
| `search` | string | — | case-insensitive match on `name` **or** `email` |
| `role` | `ADMIN` \| `DEVELOPER` \| `USER` | — | |
| `status` | `ACTIVE` \| `INACTIVE` | — | |
| `sortBy` | `name` \| `email` \| `role` \| `status` \| `createdAt` | `createdAt` | allowlist — never interpolate raw input into `ORDER BY` |
| `order` | `asc` \| `desc` | `desc` | |

### Response envelopes

List:

```json
{
  "data": [
    {
      "id": "3f2b...",
      "name": "Ada Lovelace",
      "email": "ada@example.com",
      "role": "ADMIN",
      "status": "ACTIVE",
      "createdAt": "2026-08-14T10:00:00.000Z",
      "updatedAt": "2026-08-14T10:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 25, "totalPages": 3 }
}
```

Single resource: the bare object. Stats:

```json
{
  "total": 25,
  "byRole":   { "ADMIN": 3, "DEVELOPER": 12, "USER": 10 },
  "byStatus": { "ACTIVE": 21, "INACTIVE": 4 }
}
```

Error — one shape, every failure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": [{ "field": "email", "message": "Invalid email address" }]
  }
}
```

### Status codes

| Code | When |
|---|---|
| `200` | successful read / update |
| `201` | created |
| `204` | deleted |
| `400` | validation failed (zod) |
| `404` | id not found |
| `409` | duplicate email — catch Prisma `P2002`, don't let it 500 |
| `500` | unhandled — logged server-side, generic message to client |

**Why a single error shape:** the frontend writes one error handler and one
field-error-mapping function. Ad-hoc error shapes mean the UI grows a special case per
endpoint, and eventually just shows "Something went wrong" for everything.

### Health endpoints — why two

| | `/healthz` (liveness) | `/readyz` (readiness) |
|---|---|---|
| Answers | "is the process alive?" | "can it actually serve traffic?" |
| Touches DB | no | yes, `SELECT 1` |
| Failure means | restart me | stop sending me traffic, but don't restart me |

Conflating them is a classic outage generator: if liveness checks the database, a brief
DB blip restarts every application container simultaneously — turning a 5-second
degradation into a full cold start. Kubernetes makes this distinction mandatory; learning
it in Compose now means it costs you nothing later.

---

## 8. Frontend design

### Routes

| Route | Rendering | Contents |
|---|---|---|
| `/` | Server Component shell + client table | Stats header, filter bar, users table |
| `/users/[id]` *(optional, phase 4b)* | Server Component | Detail view |

Single-page is fine. Resist adding routes the product doesn't need.

### Layout

```
┌────────────────────────────────────────────────────────────┐
│  User Management                          [+ Add User]     │  header
├────────────────────────────────────────────────────────────┤
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐               │
│  │ Total  │ │ Active │ │ Admins │ │  Devs  │               │  stat cards
│  │   25   │ │   21   │ │    3   │ │   12   │               │
│  └────────┘ └────────┘ └────────┘ └────────┘               │
├────────────────────────────────────────────────────────────┤
│  [🔍 Search name or email    ] [Role ▾] [Status ▾] [Clear] │  filter bar
├────────────────────────────────────────────────────────────┤
│  NAME ↕      EMAIL ↕        ROLE    STATUS   CREATED ↕   ⋯ │
│  Ada L.      ada@ex.com     ADMIN   ACTIVE   14 Aug     ⋯ │  table
│  Grace H.    grace@ex.com   DEV     ACTIVE   13 Aug     ⋯ │
│  …                                                         │
├────────────────────────────────────────────────────────────┤
│  Showing 1–10 of 25              ‹ 1 [2] 3 ›               │  pagination
└────────────────────────────────────────────────────────────┘
```

### Component inventory

| Component | Type | Responsibility |
|---|---|---|
| `StatCard` | server | one metric + label |
| `FilterBar` | client | search input (debounced 300 ms), role/status selects, clear |
| `UsersTable` | client | rows, sortable headers, row action menu |
| `RoleBadge` / `StatusBadge` | server | colored pill |
| `UserFormModal` | client | create + edit (same form, different mode) |
| `ConfirmDialog` | client | delete confirmation, names the user being deleted |
| `Pagination` | client | page controls |
| `TableSkeleton` | server | loading placeholder |
| `EmptyState` | server | no results — distinguishes "no users yet" from "no matches" |
| `ErrorState` | client | fetch failed + retry button |

**Why filters live in the URL** (`/?page=2&role=ADMIN&search=ada`): the state is
shareable, survives refresh, and the back button behaves. `useSearchParams` +
`router.replace` — no client state library needed for this.

### Design tokens

Tailwind v4 is already installed, so define these as CSS variables in `globals.css`
under `@theme inline`.

**Color — semantic, not literal.** Name things by role so dark mode is a variable swap,
not a rewrite.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--bg` | `#ffffff` | `#0a0a0a` | page |
| `--surface` | `#f8fafc` | `#171717` | cards, table header |
| `--border` | `#e2e8f0` | `#262626` | dividers, inputs |
| `--fg` | `#0f172a` | `#ededed` | primary text |
| `--fg-muted` | `#64748b` | `#a1a1aa` | labels, secondary text |
| `--accent` | `#2563eb` | `#3b82f6` | primary buttons, focus rings, links |
| `--danger` | `#dc2626` | `#ef4444` | delete, errors |

**Badges** — role and status must be distinguishable *without relying on color alone*
(colorblind users, grayscale printing). Each badge carries its text label; color is
reinforcement, never the sole signal.

| Badge | Light bg / text |
|---|---|
| `ADMIN` | violet-100 / violet-700 |
| `DEVELOPER` | blue-100 / blue-700 |
| `USER` | slate-100 / slate-700 |
| `ACTIVE` | emerald-100 / emerald-700 |
| `INACTIVE` | slate-200 / slate-600 |

**Typography** — Geist Sans (already wired up in `layout.tsx`); Geist Mono for IDs,
emails, and timestamps.

| Element | Size / weight |
|---|---|
| Page title | `text-2xl font-semibold` |
| Stat value | `text-3xl font-bold tabular-nums` |
| Stat label | `text-sm text-[--fg-muted] uppercase tracking-wide` |
| Table header | `text-xs font-medium uppercase tracking-wider text-[--fg-muted]` |
| Table cell | `text-sm` |

`tabular-nums` on all numeric columns — otherwise digits shift width between renders and
the numbers visibly jitter as data updates.

**Spacing** — 4 px base scale (`2 / 3 / 4 / 6 / 8 / 12`). Cards `p-6`, table cells
`px-4 py-3`, section gaps `gap-6`.

### Required states

Every data view ships all five. Skipping these is what makes a UI feel like a prototype:

1. **Loading** — skeleton rows matching final layout, not a centered spinner (spinners
   cause layout shift when content arrives)
2. **Empty (no data)** — "No users yet" + Add User button
3. **Empty (no matches)** — "No users match these filters" + Clear filters button
4. **Error** — message + retry
5. **Success** — the table

### Accessibility floor

- All interactive elements reachable and operable by keyboard
- Modal traps focus, closes on `Esc`, returns focus to its trigger on close
- Sortable headers are `<button>` with `aria-sort`
- Form errors linked via `aria-describedby`, not just red text
- Visible focus ring on `--accent` — never `outline: none` without a replacement
- Text contrast ≥ 4.5:1 in both themes

---

## 9. Environment variables

Two layers, and they are different things. Confusing them is why the current
`docker-compose.yaml` can't start.

### Layer 1 — root `.env` (Compose interpolation)

Read by the Docker CLI to substitute `${...}` inside `docker-compose.yaml`. Not
automatically visible inside containers.

| Variable | Example |
|---|---|
| `NODE_VERSION` | `22-alpine` |
| `BACKEND_DOCKERFILE` | `Dockerfile.dev` |
| `BACKEND_ENV_FILE` | `./backend/.env.dev` |
| `BACKEND_PORT` | `3001` |
| `FRONTEND_DOCKERFILE` | `Dockerfile.dev` |
| `FRONTEND_ENV_FILE` | `./frontend/.env.local` |
| `FRONTEND_PORT` | `3000` |
| `POSTGRES_USER` | `devops` |
| `POSTGRES_PASSWORD` | `changeme_locally` |
| `POSTGRES_DB` | `devops_journey` |
| `POSTGRES_PORT` | `5432` |
| `ADMINER_PORT` | `8080` |

### Layer 2 — per-service env files (container runtime)

`backend/.env.dev`:

| Variable | Example |
|---|---|
| `NODE_ENV` | `development` |
| `PORT` | `3001` |
| `DATABASE_URL` | `postgresql://devops:changeme_locally@postgres:5432/devops_journey?schema=public` |
| `CORS_ORIGIN` | `http://localhost:3000` |

`frontend/.env.local`:

| Variable | Example |
|---|---|
| `INTERNAL_API_URL` | `http://backend:3001` |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` |

Note `DATABASE_URL` uses host **`postgres`** (the Compose service name), not
`localhost` — inside the backend container, `localhost` is the backend itself.

Every variable above is mirrored in a committed `.env.example` with placeholder values.
Real `.env*` files stay gitignored (already covered by the root `.gitignore`).

**Production would differ:** secrets come from a secret manager or Docker secrets, not a
file on disk; `POSTGRES_PASSWORD` is generated, not typed; `CORS_ORIGIN` is a real
domain. Local convenience ≠ production practice, and it's worth staying conscious of
which one you're writing.

---

## 10. Known defects in the current code

Carried forward so they get fixed rather than rediscovered:

| # | File | Defect |
|---|---|---|
| 1 | *(missing)* root `.env` | Absent entirely — Compose cannot interpolate any `${VAR}` |
| 2 | `backend/.env.example` vs `src/connect.js` | `MONGODB_*` vs `MONGO_DB_*` naming mismatch |
| 3 | `backend/Dockerfile.prod` | Runs `yarn build` → `node dist/main.js`; no build script, no `dist/` — image cannot work |
| 4 | `backend/healthcheck.js` | Starts a long-lived HTTP server instead of exiting 0/1; as a Compose healthcheck it hangs |
| 5 | `docker-compose.yaml:44` | Frontend healthcheck calls `curl`, absent from `node:alpine` |
| 6 | `backend/src/server.js:39` | `result.length === 0` on a `findOne()` result — always false |
| 7 | `backend/src/server.js:8` | Port hardcoded to `3001`, ignores `PORT` |
| 8 | `backend/src/models/User.js` | Passwords stored in plaintext |
| 9 | `backend/src/server.js` | No CORS — the browser cannot call the API |

---

## 11. Implementation phases

One commit per phase. Verify before advancing.

| Phase | Delivers | Done when |
|---|---|---|
| **1 — Foundation** | root `.env` + `.env.example`, naming fixes | `docker compose config` resolves with zero warnings |
| **2 — Postgres** | `postgres` + `adminer` services, named volume, `pg_isready` | Insert row → `down` → `up` → row survives |
| **3 — Backend** | Prisma schema + migration, full `/api/users`, zod, bcrypt, CORS, `/healthz` + `/readyz`, seed (~25 users) | Every endpoint in §7 returns the documented shape |
| **4 — Frontend** | Boilerplate deleted, dashboard built, all five states | UI works against the real API in both themes |
| **5 — Hardening** | Defects 3–5 fixed, standalone Next output, non-root users | Prod images build and run; all healthchecks report `healthy` |

**Later, once this is boring:** GitHub Actions CI (lint → build → run migrations against
a throwaway Postgres service) → Nginx reverse proxy in front of both apps → Kubernetes
manifests.

---

## 12. Open questions

- Should `DELETE` be a soft delete (`deletedAt` timestamp) instead of a hard delete?
  Soft delete is closer to real production practice and makes the backup story less
  scary — but it complicates every query with a `where deletedAt: null`. **Leaning
  hard delete** for now; the `INACTIVE` status already covers the common case.
- Is a `/users/[id]` detail route worth it, or does the edit modal cover everything?
  **Leaning no** until the model grows fields the table can't show.
